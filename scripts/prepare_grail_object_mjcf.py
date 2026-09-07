#!/usr/bin/env python3
"""Offline conversion of GRAIL USD objects to convex-decomposed MJCF assets."""
from __future__ import annotations

import argparse
import csv
import fcntl
import hashlib
import json
import os
import shutil
import sys
import xml.etree.ElementTree as ET
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import asdict
from pathlib import Path

import mujoco
import numpy as np
import trimesh
from scipy.spatial.transform import Rotation as R

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from humanoid_retarget_pipeline_hsi_hoi import (  # noqa: E402
    export_grail_usd_obj,
    load_grail_pickle,
    safe_name,
)
from obj2mjcf.cli import CoacdArgs, decompose_convex  # noqa: E402


ASSET_VERSION = 3


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-root", type=Path, default=ROOT / "sample_data/grail/stair_p1")
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--seq-key", action="append", default=None, help="Only convert this recon stem; repeatable.")
    parser.add_argument("--limit", type=int, default=0, help="Optional sequence limit; 0 converts all.")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--threshold", type=float, default=0.03)
    parser.add_argument("--max-convex-hull", type=int, default=32)
    parser.add_argument("--mcts-iterations", type=int, default=200)
    parser.add_argument("--resolution", type=int, default=2000)
    parser.add_argument("--progress-every", type=int, default=25)
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="CPU worker processes. CoACD is internally threaded, so 2-4 workers is usually appropriate.",
    )
    parser.add_argument("--no-validate", dest="validate", action="store_false", default=True)
    parser.add_argument("--fail-fast", action="store_true")
    args = parser.parse_args()
    args.data_root = args.data_root.resolve()
    args.output_dir = (args.output_dir or args.data_root / "object_mjcf").resolve()
    if args.workers < 1:
        parser.error("--workers must be at least 1")
    return args


def texture_for_sequence(data_root: Path, stem: str) -> Path | None:
    texture_dir = data_root / "object_usd" / "textures" / stem
    return next(
        (path for path in sorted(texture_dir.glob("*")) if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}),
        None,
    )


def geometry_digest(mesh: trimesh.Trimesh) -> str:
    vertices = np.asarray(mesh.vertices, dtype=np.float64).round(8)
    faces = np.asarray(mesh.faces, dtype=np.int64)
    digest = hashlib.sha256()
    digest.update(vertices.tobytes())
    digest.update(faces.tobytes())
    return digest.hexdigest()[:20]


def exact_convex_components(mesh: trimesh.Trimesh) -> list[trimesh.Trimesh] | None:
    processed = trimesh.Trimesh(vertices=mesh.vertices, faces=mesh.faces, process=True)
    components = list(processed.split(only_watertight=False))
    if components and all(component.is_watertight and component.is_convex for component in components):
        return components
    return None


def collision_part_index(path: Path) -> int:
    tail = path.stem.rsplit("_", 1)[-1]
    return int(tail) if tail.isdigit() else sys.maxsize


def sorted_collision_parts(directory: Path) -> list[Path]:
    return sorted(directory.glob("collision_*.obj"), key=collision_part_index)


def valid_collision_part(path: Path) -> bool:
    try:
        mesh = trimesh.load(path, force="mesh", process=False)
        vertices = np.asarray(mesh.vertices, dtype=np.float64).reshape(-1, 3)
        unique = np.unique(vertices.round(10), axis=0)
        return bool(len(unique) >= 4 and np.linalg.matrix_rank(unique - unique.mean(axis=0)) >= 3)
    except Exception:
        return False


def sanitize_collision_cache(cache_dir: Path) -> list[Path]:
    parts = sorted_collision_parts(cache_dir)
    valid_parts = []
    for part in parts:
        if valid_collision_part(part):
            valid_parts.append(part)
        else:
            print(f"[GRAILMJCF][WARN] dropping degenerate collision hull: {part}", flush=True)
            part.unlink()
    if not valid_parts:
        return []
    temporary = []
    for index, part in enumerate(valid_parts):
        target = cache_dir / f".collision_{index}.obj.tmp"
        part.replace(target)
        temporary.append(target)
    outputs = []
    for index, temporary_path in enumerate(temporary):
        target = cache_dir / f"collision_{index}.obj"
        temporary_path.replace(target)
        outputs.append(target)
    return outputs


def build_collision_cache(visual_obj: Path, cache_dir: Path, coacd_args: CoacdArgs) -> tuple[list[Path], str]:
    cache_dir.parent.mkdir(parents=True, exist_ok=True)
    lock_path = cache_dir.parent / f".{cache_dir.name}.lock"
    with lock_path.open("w", encoding="utf-8") as lock_handle:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX)
        cached_parts = sorted_collision_parts(cache_dir)
        method_path = cache_dir / "method.txt"
        if cached_parts and method_path.exists():
            cached_parts = sanitize_collision_cache(cache_dir)
            if cached_parts:
                return cached_parts, method_path.read_text(encoding="utf-8").strip()

        cache_dir.mkdir(parents=True, exist_ok=True)
        for partial in cache_dir.glob("*.obj"):
            partial.unlink()
        mesh = trimesh.load(visual_obj, force="mesh", process=True)
        if not isinstance(mesh, trimesh.Trimesh):
            raise TypeError(f"Expected one Trimesh from {visual_obj}, got {type(mesh)}")
        components = exact_convex_components(mesh)
        if components is not None:
            method = "exact_convex_components"
            for index, component in enumerate(components):
                component.export(cache_dir / f"collision_{index}.obj")
        else:
            method = "obj2mjcf_coacd"
            decompose_convex(visual_obj, cache_dir, coacd_args)
            generated = sorted(
                cache_dir.glob(f"{visual_obj.stem}_collision_*.obj"),
                key=collision_part_index,
            )
            for index, path in enumerate(generated):
                path.replace(cache_dir / f"collision_{index}.obj")
        parts = sanitize_collision_cache(cache_dir)
        if not parts:
            raise RuntimeError(f"Convex decomposition produced no collision parts: {visual_obj}")
        method_path.write_text(method + "\n", encoding="utf-8")
        return parts, method


def link_collision_parts(cached_parts: list[Path], sequence_dir: Path) -> list[Path]:
    for stale in sequence_dir.glob("grail_object_collision_*.obj"):
        stale.unlink()
    outputs = []
    for index, source in enumerate(cached_parts):
        target = sequence_dir / f"grail_object_collision_{index}.obj"
        if target.exists():
            target.unlink()
        try:
            os.link(source, target)
        except OSError:
            shutil.copy2(source, target)
        outputs.append(target)
    return outputs


def localize_texture(visual_obj: Path, texture_path: Path | None) -> str | None:
    if texture_path is None:
        return None
    local_texture = visual_obj.parent / f"texture{texture_path.suffix.lower()}"
    shutil.copy2(texture_path, local_texture)
    mtl_path = visual_obj.with_suffix(".mtl")
    lines = []
    for line in mtl_path.read_text(encoding="utf-8").splitlines():
        lines.append(f"map_Kd {local_texture.name}" if line.startswith("map_Kd ") else line)
    mtl_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return local_texture.name


def write_motion(prop_path: Path, obj_data: dict) -> int:
    positions = np.asarray(obj_data["obj_t"], dtype=np.float64).reshape(-1, 3)
    rotations = np.asarray(obj_data["obj_R"], dtype=np.float64).reshape(-1, 3, 3)
    quats = R.from_matrix(rotations).as_quat()
    with prop_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["px", "py", "pz", "qx", "qy", "qz", "qw"])
        for position, quat in zip(positions, quats):
            writer.writerow([*position.tolist(), *quat.tolist()])
    return len(positions)


def write_mjcf(xml_path: Path, collision_parts: list[Path]) -> None:
    root = ET.Element("mujoco", {"model": "grail_object"})
    asset = ET.SubElement(root, "asset")
    ET.SubElement(asset, "mesh", {"name": "grail_object_visual_mesh", "file": "grail_object.obj"})
    for index, part in enumerate(collision_parts):
        ET.SubElement(asset, "mesh", {"name": f"grail_object_collision_{index}_mesh", "file": part.name})
    worldbody = ET.SubElement(root, "worldbody")
    body = ET.SubElement(worldbody, "body", {"name": "grail_object"})
    ET.SubElement(body, "freejoint", {"name": "grail_object_freejoint"})
    ET.SubElement(body, "geom", {
        "name": "grail_object_visual", "type": "mesh", "mesh": "grail_object_visual_mesh",
        "group": "2", "contype": "0", "conaffinity": "0", "rgba": "1 1 1 1",
    })
    for index, _part in enumerate(collision_parts):
        ET.SubElement(body, "geom", {
            "name": f"grail_object_collision_{index}", "type": "mesh",
            "mesh": f"grail_object_collision_{index}_mesh", "group": "3",
            "contype": "1", "conaffinity": "1", "rgba": "0.25 0.45 0.8 0.15",
        })
    xml_path.write_text(ET.tostring(root, encoding="unicode") + "\n", encoding="utf-8")


def validate_mjcf(xml_path: Path, expected_parts: int) -> None:
    model = mujoco.MjModel.from_xml_path(str(xml_path))
    collision_geoms = sum(int(model.geom_group[index]) == 3 for index in range(model.ngeom))
    if collision_geoms != expected_parts:
        raise ValueError(f"MJCF collision geom mismatch: expected={expected_parts}, compiled={collision_geoms}: {xml_path}")


def _convert_sequence_unlocked(recon_path: Path, args, coacd_args: CoacdArgs) -> dict:
    stem = recon_path.stem
    sequence_dir = args.output_dir / safe_name(stem)
    metadata_path = sequence_dir / "metadata.json"
    if metadata_path.exists() and not args.overwrite:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        collision_count = int(metadata.get("collision_parts", 0))
        required = [
            sequence_dir / "grail_object.xml",
            sequence_dir / "grail_object.obj",
            sequence_dir / "prop_grail_object.csv",
            *[sequence_dir / f"grail_object_collision_{index}.obj" for index in range(collision_count)],
        ]
        if int(metadata.get("asset_version", 0)) == ASSET_VERSION and collision_count > 0 and all(path.exists() for path in required):
            return {**metadata, "status": "reused"}

    sequence_dir.mkdir(parents=True, exist_ok=True)
    payload = load_grail_pickle(recon_path)
    obj_data = payload.get("obj_data", {})
    object_scale = np.asarray(obj_data.get("obj_scale", np.ones(3)), dtype=np.float64).reshape(-1)
    if object_scale.size == 1:
        object_scale = np.repeat(object_scale, 3)
    object_scale = object_scale[:3]
    usd_path = args.data_root / "object_usd" / f"{stem}.usd"
    visual_obj = sequence_dir / "grail_object.obj"
    texture_path = texture_for_sequence(args.data_root, stem)
    export_grail_usd_obj(usd_path, visual_obj, texture_path, object_scale)
    texture_name = localize_texture(visual_obj, texture_path)

    mesh = trimesh.load(visual_obj, force="mesh", process=True)
    digest = geometry_digest(mesh)
    cache_dir = args.output_dir / "_collision_cache" / digest
    cached_parts, method = build_collision_cache(visual_obj, cache_dir, coacd_args)
    collision_parts = link_collision_parts(cached_parts, sequence_dir)
    xml_path = sequence_dir / "grail_object.xml"
    write_mjcf(xml_path, collision_parts)
    frame_count = write_motion(sequence_dir / "prop_grail_object.csv", obj_data)
    if args.validate:
        validate_mjcf(xml_path, len(collision_parts))

    metadata = {
        "asset_version": ASSET_VERSION,
        "sequence_key": stem,
        "source_usd": str(usd_path),
        "geometry_digest": digest,
        "decomposition_method": method,
        "collision_parts": len(collision_parts),
        "frames": frame_count,
        "texture": texture_name,
        "coacd_args": asdict(coacd_args),
        "status": "converted",
    }
    metadata_path.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return metadata


def convert_sequence(recon_path: Path, args, coacd_args: CoacdArgs) -> dict:
    args.output_dir.mkdir(parents=True, exist_ok=True)
    lock_path = args.output_dir / f".{safe_name(recon_path.stem)}.sequence.lock"
    with lock_path.open("w", encoding="utf-8") as lock_handle:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX)
        return _convert_sequence_unlocked(recon_path, args, coacd_args)


def convert_sequence_task(recon_path: Path, args, coacd_args: CoacdArgs) -> tuple[str, dict]:
    return recon_path.stem, convert_sequence(recon_path, args, coacd_args)


def main():
    args = parse_args()
    recon_paths = sorted((args.data_root / "recon").glob("*.pkl"))
    if args.seq_key:
        requested = set(args.seq_key)
        recon_paths = [path for path in recon_paths if path.stem in requested]
        missing = requested - {path.stem for path in recon_paths}
        if missing:
            raise FileNotFoundError(f"GRAIL recon sequences not found: {sorted(missing)}")
    if args.limit > 0:
        recon_paths = recon_paths[: args.limit]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    coacd_args = CoacdArgs(
        threshold=args.threshold,
        max_convex_hull=args.max_convex_hull,
        mcts_iterations=args.mcts_iterations,
        resolution=args.resolution,
    )
    manifest_path = args.output_dir / "manifest.json"
    previous = {}
    if manifest_path.exists():
        try:
            previous = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            previous = {}
    manifest = dict(previous.get("sequences", {}))
    failures = {
        str(item.get("sequence_key")): item
        for item in previous.get("failures", [])
        if isinstance(item, dict) and item.get("sequence_key")
    }
    def record_success(index: int, sequence_key: str, metadata: dict) -> None:
        manifest[sequence_key] = safe_name(sequence_key)
        failures.pop(sequence_key, None)
        if index == 1 or index % max(1, args.progress_every) == 0 or index == len(recon_paths):
            print(
                f"[GRAILMJCF] {index}/{len(recon_paths)} {metadata['status']} {sequence_key} "
                f"method={metadata['decomposition_method']} parts={metadata['collision_parts']}",
                flush=True,
            )

    def record_failure(sequence_key: str, exc: Exception) -> None:
        failures[sequence_key] = {"sequence_key": sequence_key, "error": str(exc)}
        print(f"[GRAILMJCF][ERROR] {sequence_key}: {exc}", file=sys.stderr, flush=True)

    if args.workers == 1:
        for index, recon_path in enumerate(recon_paths, start=1):
            try:
                sequence_key, metadata = convert_sequence_task(recon_path, args, coacd_args)
                record_success(index, sequence_key, metadata)
            except Exception as exc:
                record_failure(recon_path.stem, exc)
                if args.fail_fast:
                    raise
    else:
        completed = 0
        with ProcessPoolExecutor(max_workers=args.workers) as executor:
            future_to_path = {
                executor.submit(convert_sequence_task, recon_path, args, coacd_args): recon_path
                for recon_path in recon_paths
            }
            for future in as_completed(future_to_path):
                recon_path = future_to_path[future]
                completed += 1
                try:
                    sequence_key, metadata = future.result()
                    record_success(completed, sequence_key, metadata)
                except Exception as exc:
                    record_failure(recon_path.stem, exc)
                    if args.fail_fast:
                        for pending in future_to_path:
                            pending.cancel()
                        raise
    manifest_path.write_text(
        json.dumps({"asset_version": ASSET_VERSION, "sequences": manifest, "failures": list(failures.values())}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"[GRAILMJCF] complete indexed={len(manifest)} failed={len(failures)} output={args.output_dir}")
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

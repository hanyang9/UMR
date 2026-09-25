#!/usr/bin/env python3
"""Convex-decompose one HiPHI object and write its same-name MJCF beside the OBJ."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import xml.etree.ElementTree as ET
from dataclasses import asdict
from pathlib import Path

import mujoco
from obj2mjcf.cli import CoacdArgs

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from hiphi_layout import resolve_hiphi_objects  # noqa: E402
from prepare_grail_object_mjcf import build_collision_cache  # noqa: E402


ASSET_VERSION = 2
Y_UP_TO_Z_UP_QUAT = "0.707106781 0.707106781 0 0"


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data",
        type=Path,
        required=True,
        help="One converted HiPHI sequence directory containing metadata.json.",
    )
    parser.add_argument(
        "--object-id",
        type=str,
        default=None,
        help="Object id or mesh id from metadata.json. Optional when the sequence has one object.",
    )
    parser.add_argument("--threshold", type=float, default=0.03)
    parser.add_argument("--max-convex-hull", type=int, default=32)
    parser.add_argument("--mcts-iterations", type=int, default=200)
    parser.add_argument("--resolution", type=int, default=2000)
    parser.add_argument("--mesh-scale", type=float, default=0.01, help="HiPHI OBJ unit scale; default converts cm to m.")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--no-validate", dest="validate", action="store_false", default=True)
    args = parser.parse_args()
    args.data = args.data.resolve()
    if args.mesh_scale <= 0.0:
        parser.error("--mesh-scale must be positive")
    return args


def select_object(sequence_dir: Path, object_id: str | None) -> dict[str, str]:
    objects = resolve_hiphi_objects(sequence_dir)
    if not objects:
        raise ValueError(f"HiPHI sequence has no object entries: {sequence_dir}")
    if object_id is None:
        if len(objects) != 1:
            names = ", ".join(f"{item['name']} (mesh={item['mesh_id']})" for item in objects)
            raise ValueError(f"Sequence has multiple objects; pass --object-id. Available: {names}")
        return objects[0]
    matches = [item for item in objects if object_id in {item["name"], item["mesh_id"]}]
    if len(matches) != 1:
        names = ", ".join(f"{item['name']} (mesh={item['mesh_id']})" for item in objects)
        raise ValueError(f"Object {object_id!r} not found uniquely. Available: {names}")
    return matches[0]


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def collision_part_index(path: Path) -> int:
    tail = path.stem.rsplit("_", 1)[-1]
    return int(tail) if tail.isdigit() else sys.maxsize


def collision_parts(collision_dir: Path) -> list[Path]:
    return sorted(collision_dir.glob("collision_*.obj"), key=collision_part_index)


def safe_xml_name(value: str) -> str:
    cleaned = "".join(char.lower() if char.isalnum() else "_" for char in value).strip("_")
    return cleaned or "hiphi_object"


def write_mjcf(xml_path: Path, visual_obj: Path, parts: list[Path], mesh_scale: float) -> None:
    name = safe_xml_name(visual_obj.stem)
    root = ET.Element("mujoco", {"model": name})
    ET.SubElement(root, "compiler", {"angle": "radian", "autolimits": "true"})
    ET.SubElement(root, "option", {"timestep": "0.002", "gravity": "0 0 -9.81"})
    asset = ET.SubElement(root, "asset")
    ET.SubElement(asset, "material", {"name": "obj_visual", "rgba": "0.75 0.72 0.66 1"})
    scale = f"{mesh_scale:.12g} {mesh_scale:.12g} {mesh_scale:.12g}"
    ET.SubElement(
        asset,
        "mesh",
        {"name": f"{name}_visual_mesh", "file": visual_obj.name, "scale": scale},
    )
    for index, part in enumerate(parts):
        relative = part.relative_to(xml_path.parent).as_posix()
        ET.SubElement(
            asset,
            "mesh",
            {"name": f"{name}_collision_{index}_mesh", "file": relative, "scale": scale},
        )
    worldbody = ET.SubElement(root, "worldbody")
    body = ET.SubElement(worldbody, "body", {"name": name, "pos": "0 0 0"})
    ET.SubElement(body, "freejoint", {"name": f"{name}_freejoint"})
    ET.SubElement(
        body,
        "geom",
        {
            "name": f"{name}_visual",
            "type": "mesh",
            "mesh": f"{name}_visual_mesh",
            "material": "obj_visual",
            "group": "2",
            "contype": "0",
            "conaffinity": "0",
            "quat": Y_UP_TO_Z_UP_QUAT,
        },
    )
    for index, _part in enumerate(parts):
        ET.SubElement(
            body,
            "geom",
            {
                "name": f"{name}_collision_{index}",
                "type": "mesh",
                "mesh": f"{name}_collision_{index}_mesh",
                "group": "3",
                "contype": "1",
                "conaffinity": "1",
                "friction": "1 0.005 0.0001",
                "rgba": "0.25 0.45 0.8 0.15",
                "quat": Y_UP_TO_Z_UP_QUAT,
            },
        )
    ET.indent(root, space="  ")
    xml_path.write_text("<?xml version='1.0' encoding='utf-8'?>\n" + ET.tostring(root, encoding="unicode") + "\n", encoding="utf-8")


def validate_mjcf(xml_path: Path, expected_parts: int) -> None:
    model = mujoco.MjModel.from_xml_path(str(xml_path))
    collision_geoms = sum(int(model.geom_group[index]) == 3 for index in range(model.ngeom))
    if collision_geoms != expected_parts:
        raise ValueError(
            f"MJCF collision geom mismatch: expected={expected_parts}, compiled={collision_geoms}: {xml_path}"
        )


def main() -> None:
    args = parse_args()
    item = select_object(args.data, args.object_id)
    visual_obj = Path(item["obj"])
    xml_path = Path(item["xml"])
    if not visual_obj.is_file():
        raise FileNotFoundError(f"HiPHI object mesh not found: {visual_obj}")
    if xml_path.parent.name != "object_meshes":
        raise ValueError(f"Resolved object is not inside the shared object_meshes directory: {visual_obj}")

    collision_dir = xml_path.parent / "object_collision" / visual_obj.stem
    metadata_path = collision_dir / "metadata.json"
    coacd_args = CoacdArgs(
        threshold=args.threshold,
        max_convex_hull=args.max_convex_hull,
        mcts_iterations=args.mcts_iterations,
        resolution=args.resolution,
    )
    expected_metadata = {
        "asset_version": ASSET_VERSION,
        "source_obj": visual_obj.name,
        "source_sha256": file_sha256(visual_obj),
        "mesh_scale": float(args.mesh_scale),
        "coacd_args": asdict(coacd_args),
    }
    if metadata_path.is_file() and xml_path.is_file() and not args.overwrite:
        saved = json.loads(metadata_path.read_text(encoding="utf-8"))
        parts = collision_parts(collision_dir)
        if all(saved.get(key) == value for key, value in expected_metadata.items()) and parts:
            if args.validate:
                validate_mjcf(xml_path, len(parts))
            print(f"[HiPHIMJCF] reused object={item['name']} mesh={visual_obj} xml={xml_path} parts={len(parts)}")
            return

    if collision_dir.exists():
        shutil.rmtree(collision_dir)
    collision_dir.mkdir(parents=True, exist_ok=True)
    parts, method = build_collision_cache(visual_obj, collision_dir, coacd_args)
    write_mjcf(xml_path, visual_obj, parts, args.mesh_scale)
    if args.validate:
        validate_mjcf(xml_path, len(parts))
    metadata = {
        **expected_metadata,
        "object_id": item["name"],
        "mesh_id": item["mesh_id"],
        "xml": xml_path.name,
        "decomposition_method": method,
        "collision_parts": len(parts),
    }
    metadata_path.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(
        f"[HiPHIMJCF] converted object={item['name']} mesh={visual_obj} "
        f"method={method} parts={len(parts)} xml={xml_path}"
    )


if __name__ == "__main__":
    main()

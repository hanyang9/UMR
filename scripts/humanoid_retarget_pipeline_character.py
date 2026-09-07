#!/usr/bin/env python3
"""Run character-source point-cloud correspondence, retargeting, and visualization."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
for path in (ROOT, SCRIPTS):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import build_correspondence_ae_dataset as build  # noqa: E402
from humanoid_retarget_config import list_of_args, load_config, resolve_path, robot_config, section  # noqa: E402
from humanoid_retarget_pipeline import (  # noqa: E402
    bool_value,
    config_joint_values,
    mimic_qpos_for_build,
    retarget_result_has_final_qpos_only,
    run_command,
    safe_cache_component,
    train_correspondence,
    visualize_result,
)


PYTHON = sys.executable
CHARACTER_DEFAULT_CONFIG = ROOT / "humanoid_retarget_defaults_humanoid_character.json"


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument(
        "--stage",
        choices=["all", "build", "train", "retarget", "view"],
        default="all",
    )
    parser.add_argument("--force-build", action="store_true")
    parser.add_argument("--force-train", action="store_true")
    parser.add_argument("--force-retarget", action="store_true")
    parser.add_argument("--skip-view", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if key in {"extends", "_config_path", "_config_dir"}:
            continue
        current = merged.get(key)
        if isinstance(current, dict) and isinstance(value, dict):
            merged[key] = deep_merge(current, value)
        else:
            merged[key] = value
    return merged


def load_character_config(path: Path) -> dict[str, Any]:
    defaults = load_config(CHARACTER_DEFAULT_CONFIG, use_default_extends=False)
    override = load_config(path, use_default_extends=False)
    config = deep_merge(defaults, override)
    config["_source_config_path"] = str(Path(path).resolve())
    config["_config_path"] = str(Path(path).resolve())
    config["_config_dir"] = str(Path(path).resolve().parent)
    return config


def set_path(config: dict[str, Any], dotted: str, value: Path | None):
    if value is None:
        return
    parts = dotted.split(".")
    current = config
    for part in parts[:-1]:
        current = current.setdefault(part, {})
    current[parts[-1]] = str(value)


def resolve_project_path(value: str | Path | None, config: dict[str, Any], default: str | Path | None = None) -> Path | None:
    path = resolve_path(value, config, default)
    if path is None or path.exists():
        return path
    raw = default if value is None else value
    if raw is None:
        return path
    raw_path = Path(raw)
    if raw_path.is_absolute():
        return path
    candidate = (ROOT / raw_path).resolve()
    if candidate.exists():
        return candidate
    return path


def character_pair_name(config: dict[str, Any]) -> str:
    source = section(config, "source_character")
    corr = section(config, "correspondence")
    robot = robot_config(config)
    source_name = str(source.get("name", corr.get("source_name", "character")))
    pair_name = f"{source_name}_to_{robot['name']}"
    frame_name = str(corr.get("frame_name", "")).strip()
    if frame_name:
        pair_name = f"{pair_name}_{frame_name}"
    return pair_name


def character_dataset_out(config: dict[str, Any]) -> Path:
    corr = section(config, "correspondence")
    dataset = section(corr, "dataset")
    default = ROOT / f"data/correspondence_{character_pair_name(config)}.npz"
    return resolve_project_path(dataset.get("out"), config, default)


def character_train_out_dir(config: dict[str, Any]) -> Path:
    corr = section(config, "correspondence")
    train = section(corr, "train")
    default = ROOT / f"output/correspondence_{character_pair_name(config)}"
    return resolve_project_path(train.get("out_dir"), config, default)


def character_slots_out(config: dict[str, Any]) -> Path:
    corr = section(config, "correspondence")
    if corr.get("slots"):
        return resolve_project_path(corr.get("slots"), config)
    return character_train_out_dir(config) / "correspondence_slots_final.npz"


def character_retarget_out(config: dict[str, Any]) -> Path:
    retarget = section(config, "retarget")
    motion = section(config, "motion")
    robot = robot_config(config)
    sequence_name = str(motion.get("seq_key", "")).strip()
    if not sequence_name and motion.get("data"):
        sequence_name = Path(str(motion["data"])).stem
    if not sequence_name:
        sequence_name = f"sequence_{int(motion.get('seq_index', 0))}"
    sequence_name = safe_cache_component(sequence_name)
    robot_name = safe_cache_component(str(robot["name"]))
    default = ROOT / "output" / f"{robot_name}_retarget" / f"{sequence_name}_character_{robot_name}.npz"
    return resolve_project_path(retarget.get("out"), config, default)


def frame_matrix(value: Any | None) -> np.ndarray:
    matrix = np.eye(3, dtype=np.float32) if value is None else np.asarray(value, dtype=np.float32)
    if matrix.shape != (3, 3):
        raise ValueError(f"frame transform matrix must be 3x3, got {matrix.shape}")
    return matrix.astype(np.float32)


def transform_sample_frame(sample: dict[str, Any], matrix: np.ndarray) -> dict[str, Any]:
    matrix = frame_matrix(matrix)
    if np.allclose(matrix, np.eye(3, dtype=np.float32)):
        return sample
    sample = dict(sample)
    sample["points"] = np.asarray(sample["points"], dtype=np.float32) @ matrix.T
    sample["vertices"] = np.asarray(sample["vertices"], dtype=np.float32) @ matrix.T
    sample["root_offset"] = np.asarray(sample.get("root_offset", np.zeros(3)), dtype=np.float32) @ matrix.T
    return sample


def absolutize_paths(config: dict[str, Any]) -> dict[str, Any]:
    config = json.loads(json.dumps(config, default=str))
    robot = robot_config(config)
    source = section(config, "source_character")
    motion = section(config, "motion")
    corr = section(config, "correspondence")
    dataset = section(corr, "dataset")
    train = section(corr, "train")
    retarget = section(config, "retarget")

    set_path(config, "robot.xml", resolve_project_path(robot.get("xml"), config))
    set_path(config, "source_character.xml", resolve_project_path(source.get("xml"), config, robot.get("xml")))
    set_path(config, "motion.data", resolve_project_path(motion.get("data"), config))
    set_path(config, "correspondence.dataset.out", character_dataset_out(config))
    set_path(config, "correspondence.train.out_dir", character_train_out_dir(config))
    if corr.get("slots"):
        set_path(config, "correspondence.slots", resolve_project_path(corr.get("slots"), config))
    set_path(config, "retarget.out", character_retarget_out(config))
    return config


def write_runtime_config(config: dict[str, Any], runtime_dir: Path) -> Path:
    robot = robot_config(config)
    runtime_dir.mkdir(parents=True, exist_ok=True)
    path = runtime_dir / f"{robot['name']}_character_runtime_config.json"
    runtime = absolutize_paths(config)
    runtime["_config_path"] = str(path.resolve())
    runtime["_config_dir"] = str(path.resolve().parent)
    path.write_text(json.dumps(runtime, indent=2, sort_keys=True) + "\n")
    return path


def build_character_correspondence_dataset(config: dict[str, Any], force=False, dry_run=False) -> Path:
    out = character_dataset_out(config)
    if out.exists() and not force:
        print(f"[CharacterPipeline] reuse correspondence dataset: {out}")
        return out
    if dry_run:
        print(f"[CharacterPipeline] would build correspondence dataset: {out}")
        return out

    corr = section(config, "correspondence")
    dataset = section(corr, "dataset")
    source = section(config, "source_character")
    robot = robot_config(config)
    num_points = int(dataset.get("num_points", 4096))
    seed = int(dataset.get("seed", 0))
    oversample_ratio = int(dataset.get("surface_oversample_ratio", 8))
    curvature_weight = float(dataset.get("surface_curvature_weight", 0.0))
    curvature_power = float(dataset.get("surface_curvature_power", 1.0))
    exterior_surface = bool_value(dataset.get("exterior_surface"), True)
    exterior_occlusion_distance = float(dataset.get("exterior_occlusion_distance", 0.12))
    exterior_method = str(dataset.get("exterior_method", "first_hit"))
    exterior_ray_distance = float(dataset.get("exterior_ray_distance", 0.0))

    source_xml = resolve_project_path(source.get("xml"), config, robot.get("xml"))
    source_name = str(source.get("name", corr.get("source_name", "mimickit_humanoid_character")))
    source_center = str(source.get("point_cloud_center", robot["point_cloud_center"]))
    samples = [
        build.build_robot_sample(
            source_xml,
            source_name,
            num_points,
            seed + 1000,
            oversample_ratio,
            curvature_weight,
            curvature_power,
            to_smpl_frame=bool_value(source.get("to_smpl_frame"), True),
            pose=str(source.get("sample_pose", "tpose")),
            exterior_surface=exterior_surface,
            exterior_occlusion_distance=exterior_occlusion_distance,
            exterior_method=exterior_method,
            exterior_ray_distance=exterior_ray_distance,
            point_cloud_center_name=source_center,
            tpose_qpos=source.get("tpose_qpos", {}) or {},
            mimic_qpos=mimic_qpos_for_build(source),
            reset_key=source.get("reset_key"),
        )
    ]

    robot_xml = resolve_project_path(robot.get("xml"), config)
    robot_name = str(robot.get("slot_name", robot["name"]))
    robot_center = str(robot["point_cloud_center"])
    sample_robot_center = str(robot.get("sample_point_cloud_center", robot_center))
    correspondence_to_robot = frame_matrix(
        robot.get("frame_transform", {}).get("smpl_to_robot_root_matrix", np.eye(3))
    )
    robot_to_correspondence = np.linalg.inv(correspondence_to_robot).astype(np.float32)
    robot_sample = build.build_robot_sample(
        robot_xml,
        robot_name,
        num_points,
        seed + 9000,
        oversample_ratio,
        curvature_weight,
        curvature_power,
        to_smpl_frame=bool_value(robot.get("to_smpl_frame"), True),
        pose=str(robot.get("sample_pose", "tpose")),
        exterior_surface=exterior_surface,
        exterior_occlusion_distance=exterior_occlusion_distance,
        exterior_method=exterior_method,
        exterior_ray_distance=exterior_ray_distance,
        point_cloud_center_name=sample_robot_center,
        tpose_qpos=config_joint_values(config, "tpose_qpos"),
        mimic_qpos=mimic_qpos_for_build(robot),
        reset_key=robot.get("reset_key"),
    )
    robot_sample = transform_sample_frame(robot_sample, robot_to_correspondence)
    if not np.allclose(robot_to_correspondence, np.eye(3, dtype=np.float32)):
        print(
            "[CharacterPipeline] applied robot_root_to_correspondence_matrix="
            f"{robot_to_correspondence.round(6).tolist()} to {robot_name} point cloud"
        )
    samples.append(robot_sample)

    names = np.asarray([sample["name"] for sample in samples])
    points = np.stack([sample["points"] for sample in samples], axis=0).astype(np.float32)
    root_offsets = np.stack([sample["root_offset"] for sample in samples], axis=0).astype(np.float32)
    center_modes = np.asarray([sample["center_mode"] for sample in samples])
    save_data = {
        "names": names,
        "points": points,
        "root_offsets": root_offsets,
        "center_modes": center_modes,
        "num_points": np.asarray(num_points, dtype=np.int32),
        "seed": np.asarray(seed, dtype=np.int32),
        "surface_oversample_ratio": np.asarray(oversample_ratio, dtype=np.int32),
        "surface_curvature_weight": np.asarray(curvature_weight, dtype=np.float32),
        "surface_curvature_power": np.asarray(curvature_power, dtype=np.float32),
        "robot_exterior_surface": np.asarray(exterior_surface),
        "robot_exterior_occlusion_distance": np.asarray(exterior_occlusion_distance, dtype=np.float32),
        "robot_exterior_method": np.asarray(exterior_method),
        "robot_exterior_ray_distance": np.asarray(exterior_ray_distance, dtype=np.float32),
        "correspondence_frame_name": np.asarray(str(corr.get("frame_name", ""))),
        "source_character_name": np.asarray(source_name),
        "source_character_xml": np.asarray(str(source_xml)),
        "source_character_point_cloud_center": np.asarray(source_center),
        "source_character_to_smpl_frame": np.asarray([bool_value(source.get("to_smpl_frame"), True)]),
        "custom_robot_name": np.asarray(robot_name),
        "custom_robot_xml": np.asarray(str(robot_xml)),
        "custom_robot_point_cloud_center": np.asarray(sample_robot_center),
        "custom_robot_retarget_point_cloud_center": np.asarray(robot_center),
        "custom_robot_to_smpl_frame": np.asarray([bool_value(robot.get("to_smpl_frame"), True)]),
        "custom_robot_frame_transform": correspondence_to_robot.astype(np.float32),
        "custom_robot_root_to_correspondence_matrix": robot_to_correspondence.astype(np.float32),
    }
    for idx, sample in enumerate(samples):
        save_data[f"mesh_vertices_{idx}"] = sample["vertices"].astype(np.float32)
        save_data[f"mesh_faces_{idx}"] = sample["faces"].astype(np.int32)
        save_data[f"sample_face_ids_{idx}"] = sample["sample_face_ids"].astype(np.int32)
        save_data[f"betas_{idx}"] = np.zeros(0, dtype=np.float32)
    out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(out, **save_data)
    print(f"[CharacterPipeline] saved correspondence dataset: {out} names={names.tolist()} points={points.shape}")
    return out


def retarget_character_motion(config: dict[str, Any], runtime_config: Path, slots_path: Path, force=False, dry_run=False) -> Path:
    retarget = section(config, "retarget")
    motion = section(config, "motion")
    corr = section(config, "correspondence")
    robot = robot_config(config)
    out = character_retarget_out(config)
    if out.exists() and not force:
        try:
            with np.load(out, allow_pickle=True) as data:
                compatible = retarget_result_has_final_qpos_only(data)
        except (OSError, TypeError, ValueError):
            compatible = False
        if compatible:
            print(f"[CharacterPipeline] reuse retarget result: {out}")
            return out
        print(f"[CharacterPipeline] rebuild retarget result without legacy qpos fields: {out}")
    motion_args = {
        "data": resolve_project_path(motion.get("data"), config),
        "seq_index": motion.get("seq_index", 0),
        "start": motion.get("start", 0),
        "end": motion.get("end", -1),
        "stride": motion.get("stride", 1),
        "max_frames": motion.get("max_frames", 0),
    }
    if motion.get("seq_key"):
        motion_args["seq_key"] = motion["seq_key"]
    cmd = [
        PYTHON,
        str(SCRIPTS / "retarget_character_to_humanoid_surface_vector.py"),
        "--config",
        str(runtime_config),
        *list_of_args(motion_args),
        "--slots",
        str(slots_path),
        "--out",
        str(out),
    ]
    if corr.get("slots_field"):
        cmd.extend(["--slots-field", str(corr["slots_field"])])
    run_command(cmd, dry_run=dry_run)
    return out


def run_pipeline(args, runtime_dir: Path):
    config = absolutize_paths(load_character_config(args.config))
    runtime_config = write_runtime_config(config, runtime_dir)
    stages = ["build", "train", "retarget"]
    if args.stage != "all":
        stages = [args.stage]

    dataset_path = character_dataset_out(config)
    slots_path = character_slots_out(config)
    result_path = character_retarget_out(config)

    if "build" in stages:
        dataset_path = build_character_correspondence_dataset(config, force=args.force_build, dry_run=args.dry_run)
    if "train" in stages:
        if not dataset_path.exists() and not args.dry_run:
            dataset_path = build_character_correspondence_dataset(config, force=args.force_build, dry_run=args.dry_run)
        slots_path = train_correspondence(config, dataset_path, force=args.force_train, dry_run=args.dry_run)
    if "retarget" in stages:
        if not slots_path.exists() and not args.dry_run:
            if not dataset_path.exists():
                dataset_path = build_character_correspondence_dataset(config, force=args.force_build, dry_run=args.dry_run)
            slots_path = train_correspondence(config, dataset_path, force=args.force_train, dry_run=args.dry_run)
        result_path = retarget_character_motion(config, runtime_config, slots_path, force=args.force_retarget, dry_run=args.dry_run)
    if args.stage == "view":
        visualize_result(config, result_path, dry_run=args.dry_run)
    elif args.stage == "all" and not args.skip_view:
        visualize_result(config, result_path, dry_run=args.dry_run)


def main():
    args = parse_args()
    with tempfile.TemporaryDirectory(prefix="umr_character_config_", dir="/tmp") as runtime_dir:
        run_pipeline(args, Path(runtime_dir))


if __name__ == "__main__":
    main()

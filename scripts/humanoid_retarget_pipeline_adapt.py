#!/usr/bin/env python3
"""Run the AdaPT body+racket correspondence and retargeting example."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import humanoid_retarget_pipeline as base  # noqa: E402
from build_adapt_correspondence_dataset import build_adapt_correspondence_dataset  # noqa: E402
from export_adapt_correspondence_viewer import export_adapt_correspondence_viewer  # noqa: E402
from humanoid_retarget_config import load_config, resolve_path, section  # noqa: E402


DEFAULT_CONFIG = ROOT / "robot_configs/humanoid_retarget_unitree_g1_racket_example_adapt.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument(
        "--stage",
        choices=["all", "prepare", "build", "train", "retarget", "view", "correspondence-viewer"],
        default="all",
    )
    parser.add_argument("--force-prepare", action="store_true")
    parser.add_argument("--force-build", action="store_true")
    parser.add_argument("--force-train", action="store_true")
    parser.add_argument("--force-retarget", action="store_true")
    parser.add_argument("--skip-view", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def _required_path(config: dict[str, Any], value: Any, label: str) -> Path:
    path = resolve_path(value, config)
    if path is None or not path.exists():
        raise FileNotFoundError(
            f"AdaPT {label} not found: {path}. See sample_data/adapt/README.md for the expected layout."
        )
    return path


def _output_path(config: dict[str, Any], value: Any, label: str) -> Path:
    path = resolve_path(value, config)
    if path is None:
        raise ValueError(f"AdaPT config requires {label}")
    return path


def _scalar(data, key: str, default: Any) -> Any:
    if key not in data:
        return default
    value = np.asarray(data[key])
    return value.item() if value.shape == () else value


def prepare_adapt_inputs(config: dict[str, Any], force: bool = False, dry_run: bool = False) -> tuple[Path, Path]:
    adapt = section(config, "adapt")
    raw_motion_path = _required_path(config, adapt.get("source_motion_npz"), "source motion")
    raw_racket_path = _required_path(config, adapt.get("racket_trajectory_npz"), "racket trajectory")
    motion_out = _output_path(config, adapt.get("prepared_motion_npz"), "adapt.prepared_motion_npz")
    racket_out = _output_path(config, adapt.get("prepared_racket_trajectory_npz"), "adapt.prepared_racket_trajectory_npz")
    stride = int(adapt.get("downsample_stride", 4))
    target_fps = float(adapt.get("target_fps", 30.0))
    if stride <= 0:
        raise ValueError("adapt.downsample_stride must be positive")
    if motion_out.exists() and racket_out.exists() and not force:
        print(f"[AdaPT] reuse prepared 30 FPS inputs: {motion_out}, {racket_out}")
        return motion_out, racket_out
    if dry_run:
        print(f"[AdaPT] would prepare inputs: {raw_motion_path}, {raw_racket_path}")
        return motion_out, racket_out

    with np.load(raw_motion_path, allow_pickle=True) as motion:
        poses = np.asarray(motion["poses"], dtype=np.float32)
        trans = np.asarray(motion["trans"], dtype=np.float32)
        if len(poses) != len(trans):
            raise ValueError(f"Source body frame mismatch: poses={len(poses)}, trans={len(trans)}")
        frame_ids = np.arange(0, len(poses), stride, dtype=np.int64)
        motion_payload = {
            "poses": poses[frame_ids],
            "trans": trans[frame_ids],
            "betas": np.asarray(motion.get("betas", np.zeros(10)), dtype=np.float32),
            "gender": np.asarray(_scalar(motion, "gender", "neutral")),
            "mocap_framerate": np.asarray(target_fps, dtype=np.float32),
            "mocap_frame_rate": np.asarray(target_fps, dtype=np.float32),
            "output_up": np.asarray(str(adapt.get("source_output_up", "y"))),
            "source_frame_ids": frame_ids.astype(np.int32),
        }

    with np.load(raw_racket_path, allow_pickle=True) as racket:
        transforms = np.asarray(racket["mesh_world_transforms"], dtype=np.float32)
        if len(transforms) != len(poses):
            raise ValueError(
                f"Body/racket frame mismatch before downsampling: body={len(poses)}, racket={len(transforms)}"
            )
        old_offset = int(_scalar(racket, "frame_offset", 0))
        if old_offset % stride:
            raise ValueError(f"Racket frame_offset={old_offset} is not divisible by stride={stride}")
        racket_payload = {key: np.asarray(racket[key]) for key in racket.files if key != "mesh_world_transforms"}
        racket_payload.update(
            {
                "mesh_world_transforms": transforms[frame_ids],
                "fps": np.asarray(target_fps, dtype=np.float32),
                "frame_offset": np.asarray(old_offset // stride, dtype=np.int64),
                "coordinate_up": np.asarray(str(adapt.get("source_output_up", "y"))),
                "source_frame_ids": frame_ids.astype(np.int32),
            }
        )

    motion_out.parent.mkdir(parents=True, exist_ok=True)
    racket_out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(motion_out, **motion_payload)
    np.savez_compressed(racket_out, **racket_payload)
    print(
        f"[AdaPT] prepared synchronized inputs: {len(poses)} -> {len(frame_ids)} frames "
        f"(stride={stride}, fps={target_fps:g})"
    )
    return motion_out, racket_out


def run(config: dict[str, Any], args: argparse.Namespace) -> None:
    if args.stage in {"all", "prepare", "build", "train", "retarget"}:
        prepare_adapt_inputs(config, force=args.force_prepare, dry_run=args.dry_run)
    if args.stage == "prepare":
        return

    dataset_path = base.dataset_out(config)
    slots_path = base.slots_out(config)
    result_path = base.retarget_out(config)
    if args.stage in {"all", "build"}:
        dataset_path = build_adapt_correspondence_dataset(config, force=args.force_build, dry_run=args.dry_run)
    if args.stage in {"all", "train"}:
        if not args.dry_run:
            dataset_path = build_adapt_correspondence_dataset(config, force=args.force_build)
        slots_path = base.train_correspondence(
            config, dataset_path, force=args.force_train, dry_run=args.dry_run
        )
    if args.stage in {"all", "retarget"}:
        if not args.dry_run and not base.correspondence_slots_compatible(slots_path, config):
            dataset_path = build_adapt_correspondence_dataset(config, force=args.force_build)
            slots_path = base.train_correspondence(config, dataset_path, force=args.force_train)
        result_path = base.retarget_motion(
            config, slots_path, force=args.force_retarget, dry_run=args.dry_run
        )
    if args.stage in {"all", "correspondence-viewer"} and not args.dry_run:
        export_adapt_correspondence_viewer(config, dataset_path, slots_path)
    if args.stage == "view":
        base.visualize_result(config, result_path, dry_run=args.dry_run)
    elif args.stage == "all" and not args.skip_view:
        base.visualize_result(config, result_path, dry_run=args.dry_run)


def main() -> None:
    args = parse_args()
    run(load_config(args.config), args)


if __name__ == "__main__":
    main()

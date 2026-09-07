#!/usr/bin/env python3
"""Run correspondence training and HSI/HOI retargeting for NR FBX + BVH data."""
from __future__ import annotations

import argparse
import copy
import json
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import nr_source  # noqa: E402
import smpl_surface_retarget_common as common  # noqa: E402
from humanoid_retarget_config import load_config, resolve_path, robot_config, section  # noqa: E402
from humanoid_retarget_pipeline import (  # noqa: E402
    RETARGET_VISUALIZATION_FIELDS,
    build_correspondence_dataset,
    correspondence_slots_compatible,
    dataset_out,
    retarget_motion,
    retarget_out,
    retarget_result_has_final_qpos_only,
    slots_out,
    train_correspondence,
    visualize_result,
)
from humanoid_retarget_pipeline_hsi_hoi import clean_config, deep_merge, safe_name  # noqa: E402


DEFAULTS_CONFIG = ROOT / "humanoid_retarget_defaults_nr.json"
DEFAULT_ROBOT_CONFIG = ROOT / "robot_configs" / "humanoid_retarget_unitree_g1_example.json"
NR_CORRESPONDENCE_VERSION = 3


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_ROBOT_CONFIG, help="Robot config.")
    parser.add_argument("--defaults", type=Path, default=DEFAULTS_CONFIG, help="NR data and solver defaults.")
    parser.add_argument("--stage", choices=["all", "build", "train", "retarget", "view", "prepare"], default="all")
    parser.add_argument("--data", type=Path, default=None, help="NR root containing one FBX and motion_actor_retarget_205_with_ids.")
    parser.add_argument("--seq-key", type=str, default=None, help="BVH filename stem (the .bvh suffix is optional).")
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--start", type=int, default=None)
    parser.add_argument("--end", type=int, default=None)
    parser.add_argument("--stride", type=int, default=None)
    parser.add_argument("--max-frames", type=int, default=None)
    parser.add_argument("--force-build", action="store_true")
    parser.add_argument("--force-train", action="store_true")
    parser.add_argument("--force-retarget", action="store_true")
    parser.add_argument("--skip-view", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def load_nr_config(path: Path, defaults_path: Path = DEFAULTS_CONFIG) -> dict[str, Any]:
    defaults = load_config(Path(defaults_path), use_default_extends=False)
    user = load_config(Path(path), use_default_extends=False)
    merged = deep_merge(clean_config(defaults), clean_config(user))
    user_robot = section(user, "robot")
    if user_robot.get("xml"):
        merged.setdefault("robot", {})["xml"] = str(resolve_path(user_robot["xml"], user))
    merged["_config_path"] = str(Path(user["_config_path"]).resolve())
    merged["_config_dir"] = str(Path(user["_config_dir"]).resolve())
    return merged


def resolve_nr_sequence(config: dict[str, Any], data_override: Path | None, seq_override: str | None):
    motion = section(config, "motion")
    root = Path(data_override).resolve() if data_override is not None else resolve_path(motion.get("data"), config)
    if root is None or not nr_source.is_nr_root(root):
        raise ValueError(f"Not an NR FBX/BVH root: {root}")
    motions, _source_format = common.load_motion_collection(root)
    seq_key = str(seq_override or motion.get("seq_key", "")).removesuffix(".bvh")
    if not seq_key:
        seq_key = next(iter(motions))
    if seq_key not in motions:
        sample = ", ".join(list(motions)[:12])
        raise KeyError(f"NR sequence {seq_key!r} not found. First keys: {sample}")
    return root, seq_key, motions[seq_key]


def make_runtime_config(base: dict[str, Any], root: Path, seq_key: str, sequence, runtime_dir: Path, args):
    config = copy.deepcopy(clean_config(base))
    config.pop("nr", None)
    config.pop("hsi_hoi", None)
    config.setdefault("motion", {}).update({"data": str(root), "seq_key": seq_key, "seq_index": 0})
    for key in ("start", "end", "stride", "max_frames"):
        value = getattr(args, key)
        if value is not None:
            config["motion"][key] = value

    template_name = f"nr_{safe_name(root.name)}"
    config.setdefault("smpl_template", {}).update(
        {"source": "motion", "type": "nr_fbx", "use_betas": False, "use_gender": False, "name": template_name, "betas": None}
    )
    robot_name = safe_name(robot_config(config)["name"])
    corr = config.setdefault("correspondence", {})
    corr["smpl_name"] = "auto"
    cache_tag = safe_name(str(corr.get("cache_tag", "")).strip())
    cache_suffix = f"_{cache_tag}" if cache_tag else ""
    corr.setdefault("dataset", {})["out"] = (
        f"data/correspondence_{robot_name}_{template_name}_nr_v{NR_CORRESPONDENCE_VERSION}{cache_suffix}.npz"
    )
    corr.setdefault("train", {}).update(
        {
            "template_name": template_name,
            "out_dir": (
                f"output/correspondence_{robot_name}_{template_name}_nr_v"
                f"{NR_CORRESPONDENCE_VERSION}{cache_suffix}"
            ),
            "fixed_template": False,
        }
    )
    solver = config.setdefault("solver", {})
    solver.setdefault("body_segment", {})["module"] = "retarget_body_segment_surface_hoi_hsi"
    for key in tuple(solver):
        if key.startswith("object_") or key.startswith("robot_object_") or key == "retarget_object_size":
            solver.pop(key)
    config.setdefault("retarget", {})
    config["retarget"]["out"] = str(
        Path(args.out).resolve()
        if args.out is not None
        else ROOT / "output" / f"{robot_name}_retarget" / f"{safe_name(seq_key)}_nr_{robot_name}.npz"
    )

    runtime_path = runtime_dir / f"{safe_name(seq_key)}_runtime_config.json"
    config["_config_path"] = str(runtime_path)
    config["_config_dir"] = str(runtime_path.parent)
    if not args.dry_run:
        runtime_path.parent.mkdir(parents=True, exist_ok=True)
        runtime_path.write_text(json.dumps(clean_config(config), indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return config, runtime_path


def nr_result_compatible(result_path: Path) -> bool:
    if not result_path.exists():
        return False
    try:
        with np.load(result_path, allow_pickle=True) as data:
            return retarget_result_has_final_qpos_only(data)
    except (OSError, ValueError, TypeError):
        return False


def patch_nr_result(
    result_path: Path,
    root: Path,
    seq_key: str,
    dry_run: bool,
):
    if dry_run:
        print(f"[NRPipeline] would patch NR metadata: {result_path}")
        return
    with np.load(result_path, allow_pickle=True) as data:
        payload = {key: data[key] for key in data.files if key in RETARGET_VISUALIZATION_FIELDS}
    payload.update(
        {
            "source_data": np.asarray(str(root)),
            "source_sequence_key": np.asarray(seq_key),
            "source_format": np.asarray(nr_source.NR_SOURCE_FORMAT),
        }
    )
    for key in (
        "source_object_dir",
        "noitom_output_up",
        "noitom_convert_y_up",
        "noitom_ground_align",
        "noitom_floor_y",
        "noitom_ground_offset",
    ):
        payload.pop(key, None)
    np.savez_compressed(result_path, **payload)
    print(f"[NRPipeline] patched NR metadata: {result_path}")


def run_pipeline(args, runtime_dir: Path):
    base = load_nr_config(args.config, args.defaults)
    root, seq_key, sequence = resolve_nr_sequence(base, args.data, args.seq_key)
    config, runtime_path = make_runtime_config(base, root, seq_key, sequence, runtime_dir, args)
    print(f"[NRPipeline] source={root} seq={seq_key} frames={sequence['num_frames']} runtime_config={runtime_path}")
    if args.stage == "prepare":
        return

    stages = ["build", "train", "retarget"] if args.stage == "all" else [args.stage]
    dataset_path = dataset_out(config)
    slots_path = slots_out(config)
    result_path = retarget_out(config)
    if "build" in stages:
        dataset_path = build_correspondence_dataset(config, force=args.force_build, dry_run=args.dry_run)
    if "train" in stages:
        if not dataset_path.exists() and not args.dry_run:
            dataset_path = build_correspondence_dataset(config, force=args.force_build, dry_run=False)
        slots_path = train_correspondence(config, dataset_path, force=args.force_train, dry_run=args.dry_run)
    if "retarget" in stages:
        if (not slots_path.exists() or not correspondence_slots_compatible(slots_path, config)) and not args.dry_run:
            if not dataset_path.exists():
                dataset_path = build_correspondence_dataset(config, force=args.force_build, dry_run=False)
            slots_path = train_correspondence(config, dataset_path, force=args.force_train, dry_run=False)
        force_retarget = bool(args.force_retarget)
        if result_path.exists() and not force_retarget and not nr_result_compatible(result_path):
            print(
                f"[NRPipeline] stale or non-minimal retarget result; rebuilding: "
                f"{result_path}"
            )
            force_retarget = True
        result_path = retarget_motion(config, slots_path, force=force_retarget, dry_run=args.dry_run)
        patch_nr_result(
            result_path,
            root,
            seq_key,
            args.dry_run,
        )
    if args.stage == "view":
        patch_nr_result(result_path, root, seq_key, args.dry_run)
        visualize_result(config, result_path, dry_run=args.dry_run)
    elif args.stage == "all" and not args.skip_view:
        visualize_result(config, result_path, dry_run=args.dry_run)


def main():
    args = parse_args()
    with tempfile.TemporaryDirectory(prefix="umr_nr_config_", dir="/tmp") as runtime_dir:
        run_pipeline(args, Path(runtime_dir))


if __name__ == "__main__":
    main()

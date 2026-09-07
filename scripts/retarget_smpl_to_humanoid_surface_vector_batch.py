#!/usr/bin/env python3
"""Config-driven surface-vector retargeter for MuJoCo humanoid robots."""
from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import mujoco
import numpy as np

try:
    from tqdm import tqdm
except ImportError:
    def tqdm(iterable, **_kwargs):
        return iterable

ROOT = Path(__file__).resolve().parents[1]
ASSETS_ROOT = ROOT / "assets"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import smpl_surface_retarget_common as common  # noqa: E402
from humanoid_retarget_config import load_config, resolve_path, robot_config, section  # noqa: E402
from mujoco_geom_surface import geom_local_mesh, surface_geom_ids  # noqa: E402
from mujoco_point_cloud_center import point_cloud_center_frame  # noqa: E402


BODY_SEGMENT_MODULE_DEFAULT = "retarget_body_segment_surface"
BODY_SEGMENT_MODULES = {
    BODY_SEGMENT_MODULE_DEFAULT,
    "retarget_body_segment_surface_hoi_hsi",
}
BODY_SEGMENT_EXPORTS = (
    "SMPLX_PART_IDS",
    "body_segment_schema",
    "bind_source_slots_with_normals",
    "body_segment_slot_groups",
    "compute_source_clearance_self_contact_maps",
    "compute_source_self_contact_map_groups",
    "configure_body_segment_surface",
    "compute_source_self_contact_maps",
    "compute_tpose_surface_normal_offsets",
    "normalize_vectors",
    "pack_self_contact_map_weights",
    "pack_self_contact_maps",
    "parse_body_topk_config",
    "sample_segment_slots",
    "segment_cost_values",
    "segment_sample_counts",
    "surface_slot_costs_from_segments",
    "transport_tpose_robot_normals",
)


def load_body_segment_module(config):
    body_segment = section(section(config, "solver"), "body_segment")
    module_name = str(body_segment.get("module", BODY_SEGMENT_MODULE_DEFAULT))
    if module_name not in BODY_SEGMENT_MODULES:
        allowed = ", ".join(sorted(BODY_SEGMENT_MODULES))
        raise ValueError(f"Unsupported body-segment module {module_name!r}; expected one of: {allowed}")
    module = importlib.import_module(module_name)
    missing = [name for name in BODY_SEGMENT_EXPORTS if not hasattr(module, name)]
    if missing:
        raise ImportError(f"Body-segment module {module_name!r} is missing exports: {missing}")
    globals().update({name: getattr(module, name) for name in BODY_SEGMENT_EXPORTS})
    return module_name


load_body_segment_module({})


DEFAULT_DATA = ROOT / "sample_data/smpl_motion_sample.pkl"
DEFAULT_SLOTS = ROOT / "output/correspondence_template_residual_ae_reference_tuned/correspondence_slots_final.npz"
PROGRESS_PREFIX = "__HUMANOID_BATCH_PROGRESS__"
SMPL_TO_ROBOT_ROOT_MATRIX = np.asarray(
    [
        [0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
    ],
    dtype=np.float32,
)


def batch_progress_enabled() -> bool:
    return os.environ.get("HUMANOID_BATCH_PROGRESS", "").strip() == "1"


def emit_batch_progress(done: int, total: int) -> None:
    if batch_progress_enabled():
        print(f"{PROGRESS_PREFIX} {int(done)} {int(total)}", flush=True)


def none_default(parser, *names, default=None, **kwargs):
    parser.add_argument(*names, default=default, **kwargs)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description=(
            "Full-body surface-vector retargeting from compressed SMPL/SMPL-X motion data "
            "to a config-defined MuJoCo humanoid."
        )
    )
    parser.add_argument("--config", type=Path, required=True)
    none_default(parser, "--data", type=Path)
    none_default(parser, "--seq-key", type=str)
    parser.add_argument("--seq-index", type=int, default=0)
    none_default(parser, "--smplx-model-dir", type=Path)
    none_default(parser, "--smplx-device", choices=("auto", "cpu", "cuda"))
    none_default(parser, "--smplx-batch-size", type=int)
    none_default(parser, "--smplx-batch-size-max", type=int)
    none_default(parser, "--smplx-batch-size-safety-factor", type=float)
    none_default(parser, "--robot-xml", type=Path)
    none_default(parser, "--slots", type=Path)
    parser.add_argument("--slots-field", type=str, default=None)
    parser.add_argument("--smpl-name", type=str, default=None)
    parser.add_argument("--robot-name", type=str, default=None)
    none_default(parser, "--out", type=Path)
    parser.add_argument("--start", type=int, default=None)
    parser.add_argument("--end", type=int, default=None)
    parser.add_argument("--stride", type=int, default=None)
    parser.add_argument("--max-frames", type=int, default=None)
    parser.add_argument("--robot-height", type=float, default=None)
    parser.add_argument("--human-height", type=float, default=None)
    parser.add_argument("--mat-height", type=float, default=None)
    parser.add_argument(
        "--source-ground-align",
        choices=("global_foot_joint", "none"),
        default=None,
    )
    parser.add_argument(
        "--surface-normal-cost-mode",
        "--surface-normal-mode",
        choices=("tpose_offset", "direct"),
        default=None,
    )
    parser.add_argument("--zero-source-finger-pose", action="store_true", default=None)
    parser.add_argument("--no-zero-source-finger-pose", dest="zero_source_finger_pose", action="store_false")
    parser.add_argument("--ground-contact-map-cost", type=float, default=None)
    parser.add_argument("--ground-contact-anchor-cost", type=float, default=None)
    parser.add_argument("--ground-contact-map-threshold", type=float, default=None)
    parser.add_argument("--ground-contact-map-snap-threshold", type=float, default=None)
    parser.add_argument("--ground-contact-map-max-points", type=int, default=None)
    parser.add_argument("--ground-penetration-hard-constraint", action="store_true", default=None)
    parser.add_argument("--no-ground-penetration-hard-constraint", dest="ground_penetration_hard_constraint", action="store_false")
    parser.add_argument(
        "--ground-penetration-hard-constraint-mode",
        choices=("surface_slots", "surface_slots_all", "mujoco_collision"),
        default=None,
    )
    parser.add_argument("--ground-penetration-margin", type=float, default=None)
    parser.add_argument("--ground-penetration-hard-slack", action="store_true", default=None)
    parser.add_argument("--no-ground-penetration-hard-slack", dest="ground_penetration_hard_slack", action="store_false")
    parser.add_argument("--ground-penetration-hard-slack-cost", type=float, default=None)
    parser.add_argument("--ground-penetration-threshold", type=float, default=None)
    parser.add_argument("--ground-penetration-max-points", type=int, default=None)
    parser.add_argument("--self-contact-map-cost", type=float, default=None)
    parser.add_argument("--self-contact-map-mode", default=None)
    parser.add_argument("--self-contact-map-threshold", type=float, default=None)
    parser.add_argument("--self-contact-map-max-pairs", type=int, default=None)
    parser.add_argument("--self-contact-map-body-topk", "--self-contact-map-body-slot-caps", dest="self_contact_map_body_topk", default=None)
    parser.add_argument("--joint-map-cost", type=float, default=None)
    parser.add_argument("--smooth-cost", type=float, default=None)
    parser.add_argument("--temporal-smooth-cost", type=float, default=None)
    parser.add_argument("--trajectory-filter-mode", choices=("off", "lqr"), default=None)
    parser.add_argument("--trajectory-filter-data-cost", type=float, default=None)
    parser.add_argument("--trajectory-filter-velocity-cost", type=float, default=None)
    parser.add_argument("--trajectory-filter-acceleration-cost", type=float, default=None)
    parser.add_argument("--trajectory-filter-jerk-cost", type=float, default=None)
    parser.add_argument("--trajectory-filter-root-translation", action="store_true", default=None)
    parser.add_argument("--no-trajectory-filter-root-translation", dest="trajectory_filter_root_translation", action="store_false")
    parser.add_argument("--trajectory-filter-anchor-start-frames", type=int, default=None)
    parser.add_argument("--trajectory-filter-anchor-end-frames", type=int, default=None)
    parser.add_argument(
        "--trajectory-warm-start-mode",
        choices=("sequential", "bidirectional"),
        default=None,
    )
    parser.add_argument("--trajectory-warm-start-bidirectional-continuity-cost", type=float, default=None)
    parser.add_argument("--trajectory-warm-start-bidirectional-switch-cost", type=float, default=None)
    parser.add_argument("--damping", type=float, default=None)
    parser.add_argument("--collision-threshold", type=float, default=None)
    parser.add_argument("--robot-self-penetration-cost", type=float, default=None)
    parser.add_argument("--robot-self-penetration-hard-constraint", action="store_true", default=None)
    parser.add_argument("--no-robot-self-penetration-hard-constraint", dest="robot_self_penetration_hard_constraint", action="store_false")
    parser.add_argument("--robot-self-penetration-margin", type=float, default=None)
    parser.add_argument("--robot-self-penetration-hard-slack", action="store_true", default=None)
    parser.add_argument("--no-robot-self-penetration-hard-slack", dest="robot_self_penetration_hard_slack", action="store_false")
    parser.add_argument("--robot-self-penetration-hard-slack-cost", type=float, default=None)
    parser.add_argument("--robot-self-penetration-tolerance", type=float, default=None)
    parser.add_argument("--iters", type=int, default=None)
    parser.add_argument("--pose-init-iters", type=int, default=None)
    parser.add_argument("--step-limit-mode", choices=("box", "l2", "box_l2"), default=None)
    parser.add_argument("--max-dq", type=float, default=None)
    parser.add_argument("--global-step-size", type=float, default=None)
    parser.add_argument("--root-step-limit-mode", choices=("off", "box", "l2", "box_l2"), default=None)
    parser.add_argument("--root-max-translation-dq", type=float, default=None)
    parser.add_argument("--root-max-rotation-dq", type=float, default=None)
    parser.add_argument("--root-global-translation-step-size", type=float, default=None)
    parser.add_argument("--root-global-rotation-step-size", type=float, default=None)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--bind-nearest-vertex-k", type=int, default=None)
    parser.add_argument("--project-robot-slots", action="store_true", default=None)
    parser.add_argument("--no-project-robot-slots", dest="project_robot_slots", action="store_false")
    parser.add_argument("--force-no-floating-root", action="store_true")
    parser.add_argument(
        "--stream-chunk-frames",
        type=int,
        default=None,
        help="Batch-only memory mode: generate SMPL-X/source slots for this many frames at a time. 0 disables streaming.",
    )
    parser.add_argument(
        "--source-feature-cache",
        type=Path,
        default=None,
        help="Precomputed source slots/joints/contact features produced by a persistent GPU feeder.",
    )
    parser.add_argument(
        "--prepare-source-cache-only",
        action="store_true",
        help="Generate --source-feature-cache and exit before constructing the MuJoCo solver.",
    )
    return fill_args_from_config(parser.parse_args(argv))


def cfg_get(config: dict[str, Any], dotted: str, default: Any = None) -> Any:
    value: Any = config
    for key in dotted.split("."):
        if not isinstance(value, dict) or key not in value:
            return default
        value = value[key]
    return value


def set_default(args, name: str, value: Any):
    if getattr(args, name) is None:
        setattr(args, name, value)


def bool_config(value, default=False):
    if value is None:
        return bool(default)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() not in {"0", "false", "no", "off", ""}
    return bool(value)


def smpl_template_betas_hash(betas):
    if betas is None:
        return None
    values = common.coerce_smpl_betas(betas, 10)
    return hashlib.sha1(values.tobytes()).hexdigest()[:10]


def smpl_template_default_name(model_type, gender, betas):
    if str(model_type).lower() == "soma":
        return "soma"
    base = f"{str(model_type)}_{str(gender).lower()}"
    betas_hash = smpl_template_betas_hash(betas)
    return base if betas_hash is None else f"{base}_betas_{betas_hash}"


def smpl_template_config(config, sequence=None, seq_key="", default_gender="neutral"):
    template = dict(config.get("smpl_template", {}) or {})
    source = str(template.get("source", "motion"))
    use_betas = bool_config(template.get("use_betas"), True)
    use_gender = bool_config(template.get("use_gender"), True)
    model_type = str(template.get("type", "smplx"))
    gender = str(template.get("gender", default_gender)).lower()
    betas = None
    if use_betas and source == "motion" and sequence is not None:
        if str(sequence.get("source_format", "")).startswith("soma"):
            model_type = "soma"
            betas = None
        else:
            betas = common.coerce_smpl_betas(sequence.get("beta", sequence.get("betas", np.zeros(10))), 10)
            if betas is not None and np.allclose(betas, 0.0):
                betas = None
            if use_gender:
                gender = str(sequence.get("gender", gender)).lower()
    elif use_betas and source in {"manual", "config"} and template.get("betas", template.get("beta")) is not None:
        betas = common.coerce_smpl_betas(template.get("betas", template.get("beta")), 10)

    configured_name = template.get("name")
    if str(configured_name) == "auto" or not configured_name:
        configured_name = None
    if configured_name is None and str(model_type).lower() == "soma":
        sequence_for_name = sequence if (use_betas and source == "motion") else None
        name = common.soma_source.soma_template_name_for_sequence(sequence_for_name, fallback="soma")
    elif betas is None:
        name = str(configured_name or smpl_template_default_name(model_type, gender, None))
    else:
        name = str(configured_name or smpl_template_default_name(model_type, gender, betas))
    return {
        "name": name,
        "type": model_type,
        "gender": gender,
        "betas": betas,
        "source": source,
        "soma_usd_path": template.get("soma_usd_path", config.get("soma_usd_path", "sample_data/soma/soma_base_skel_minimal.usd")),
    }


def fill_args_from_config(args):
    config = load_config(args.config)
    args.config_data = config
    args.body_segment_module = load_body_segment_module(config)
    body_segment_info = configure_body_segment_surface(config)
    args.body_segment_schema = body_segment_info["schema"]
    print(
        f"[HumanoidRetarget] body_segment_module={args.body_segment_module} "
        f"schema={args.body_segment_schema} "
        f"segments={len(body_segment_info['part_ids'])}"
    )
    robot = robot_config(config)
    motion = section(config, "motion")
    corr = section(config, "correspondence")
    retarget = section(config, "retarget")
    solver = section(config, "solver")

    set_default(args, "data", resolve_path(motion.get("data"), config, DEFAULT_DATA))
    set_default(args, "seq_key", motion.get("seq_key", "0-cmu_13_18_poses"))
    set_default(args, "smplx_model_dir", resolve_path(config.get("smplx_model_dir"), config, "smpl"))
    set_default(args, "smplx_device", retarget.get("smplx_device", "cuda"))
    set_default(args, "smplx_batch_size", retarget.get("smplx_batch_size", 0))
    set_default(args, "smplx_batch_size_max", retarget.get("smplx_batch_size_max", 10000))
    set_default(args, "smplx_batch_size_safety_factor", retarget.get("smplx_batch_size_safety_factor", 0.8))
    set_default(args, "robot_xml", resolve_path(robot.get("xml"), config))
    set_default(args, "slots", resolve_path(corr.get("slots"), config, DEFAULT_SLOTS))
    set_default(args, "slots_field", corr.get("slots_field", "reconstructed_slots"))
    set_default(args, "smpl_name", corr.get("smpl_name", "auto"))
    set_default(args, "robot_name", robot.get("slot_name", robot.get("name")))
    set_default(args, "out", resolve_path(retarget.get("out"), config, ROOT / f"output/{robot['name']}_retarget/smpl_motion_{robot['name']}.npz"))
    set_default(args, "start", motion.get("start", 0))
    set_default(args, "end", motion.get("end", -1))
    set_default(args, "stride", motion.get("stride", 1))
    set_default(args, "max_frames", motion.get("max_frames", 0))
    set_default(args, "robot_height", robot.get("height", 0.0))
    set_default(args, "human_height", retarget.get("human_height", 0.0))
    set_default(args, "mat_height", retarget.get("mat_height", 0.0))
    set_default(args, "source_ground_align", retarget.get("source_ground_align", "global_foot_joint"))
    set_default(args, "zero_source_finger_pose", retarget.get("zero_source_finger_pose", True))
    set_default(args, "surface_normal_cost_mode", solver.get("surface_normal_cost_mode", "tpose_offset"))
    set_default(args, "ground_contact_map_cost", solver.get("ground_contact_map_cost", 0.0))
    set_default(args, "ground_contact_anchor_cost", solver.get("ground_contact_anchor_cost", 0.0))
    set_default(args, "ground_contact_map_threshold", solver.get("ground_contact_map_threshold", 0.10))
    set_default(args, "ground_contact_map_snap_threshold", solver.get("ground_contact_map_snap_threshold", 0.005))
    set_default(args, "ground_contact_map_max_points", solver.get("ground_contact_map_max_points", 64))
    set_default(args, "ground_penetration_hard_constraint", solver.get("ground_penetration_hard_constraint", False))
    set_default(args, "ground_penetration_hard_constraint_mode", solver.get("ground_penetration_hard_constraint_mode", "surface_slots"))
    set_default(args, "ground_penetration_margin", solver.get("ground_penetration_margin", 0.0))
    set_default(args, "ground_penetration_hard_slack", solver.get("ground_penetration_hard_slack", False))
    set_default(args, "ground_penetration_hard_slack_cost", solver.get("ground_penetration_hard_slack_cost", 0.0))
    set_default(args, "ground_penetration_threshold", solver.get("ground_penetration_threshold", 0.01))
    set_default(args, "ground_penetration_max_points", solver.get("ground_penetration_max_points", 0))
    set_default(args, "self_contact_map_cost", solver.get("self_contact_map_cost", 10.0))
    set_default(args, "self_contact_map_mode", solver.get("self_contact_map_mode", "threshold_global_topk"))
    set_default(args, "self_contact_map_threshold", solver.get("self_contact_map_threshold", 0.10))
    set_default(args, "self_contact_map_max_pairs", solver.get("self_contact_map_max_pairs", 256))
    set_default(
        args,
        "self_contact_map_body_topk",
        solver.get("self_contact_map_body_topk", solver.get("self_contact_map_body_slot_caps", {})),
    )
    set_default(args, "joint_map_cost", solver.get("joint_map_cost", 0.0))
    set_default(args, "smooth_cost", solver.get("smooth_cost", 0.2))
    set_default(args, "temporal_smooth_cost", solver.get("temporal_smooth_cost", 0.1))
    set_default(args, "trajectory_filter_mode", solver.get("trajectory_filter_mode", "off"))
    set_default(args, "trajectory_filter_data_cost", solver.get("trajectory_filter_data_cost", 1.0))
    set_default(args, "trajectory_filter_velocity_cost", solver.get("trajectory_filter_velocity_cost", 0.0))
    set_default(args, "trajectory_filter_acceleration_cost", solver.get("trajectory_filter_acceleration_cost", 1.0))
    set_default(args, "trajectory_filter_jerk_cost", solver.get("trajectory_filter_jerk_cost", 0.0))
    set_default(args, "trajectory_filter_root_translation", solver.get("trajectory_filter_root_translation", False))
    set_default(args, "trajectory_filter_anchor_start_frames", solver.get("trajectory_filter_anchor_start_frames", 1))
    set_default(args, "trajectory_filter_anchor_end_frames", solver.get("trajectory_filter_anchor_end_frames", 1))
    # Batch retargeting favors robustness to occasional singularities: solve
    # both temporal directions and let the downstream DP select a smooth path.
    set_default(args, "trajectory_warm_start_mode", "bidirectional")
    set_default(
        args,
        "trajectory_warm_start_bidirectional_continuity_cost",
        solver.get("trajectory_warm_start_bidirectional_continuity_cost", 0.01),
    )
    set_default(
        args,
        "trajectory_warm_start_bidirectional_switch_cost",
        solver.get("trajectory_warm_start_bidirectional_switch_cost", 0.01),
    )
    set_default(args, "damping", solver.get("damping", 1e-4))
    set_default(args, "collision_threshold", solver.get("collision_threshold", 0.1))
    set_default(args, "robot_self_penetration_cost", solver.get("robot_self_penetration_cost", 0.0))
    set_default(args, "robot_self_penetration_hard_constraint", solver.get("robot_self_penetration_hard_constraint", False))
    set_default(args, "robot_self_penetration_margin", solver.get("robot_self_penetration_margin", 0.0))
    set_default(args, "robot_self_penetration_hard_slack", solver.get("robot_self_penetration_hard_slack", False))
    set_default(args, "robot_self_penetration_hard_slack_cost", solver.get("robot_self_penetration_hard_slack_cost", 0.0))
    set_default(args, "robot_self_penetration_tolerance", solver.get("robot_self_penetration_tolerance", 0.01))
    set_default(args, "iters", solver.get("iters", 8))
    set_default(args, "pose_init_iters", solver.get("pose_init_iters", -1))
    set_default(args, "step_limit_mode", solver.get("step_limit_mode", "box"))
    set_default(args, "max_dq", solver.get("max_dq", 0.15))
    set_default(args, "global_step_size", solver.get("global_step_size", 0.2))
    set_default(args, "root_step_limit_mode", solver.get("root_step_limit_mode", "off"))
    set_default(args, "root_max_translation_dq", solver.get("root_max_translation_dq", 0.3))
    set_default(args, "root_max_rotation_dq", solver.get("root_max_rotation_dq", 0.5))
    set_default(args, "root_global_translation_step_size", solver.get("root_global_translation_step_size", 0.3))
    set_default(args, "root_global_rotation_step_size", solver.get("root_global_rotation_step_size", 0.5))
    set_default(args, "seed", solver.get("seed", 0))
    set_default(args, "batch_size", solver.get("batch_size", 32))
    set_default(args, "bind_nearest_vertex_k", solver.get("bind_nearest_vertex_k", 24))
    set_default(args, "project_robot_slots", solver.get("project_robot_slots", True))
    set_default(args, "stream_chunk_frames", retarget.get("stream_chunk_frames", 0))
    return args


def parse_number(value):
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"inf", "+inf", "infinity", "+infinity"}:
            return np.inf
        if lowered in {"-inf", "-infinity"}:
            return -np.inf
    return float(value)


def robot_height_from_slots(points, axis: int = 1) -> tuple[float, str]:
    points = np.asarray(points, dtype=np.float32)
    if points.ndim != 2 or points.shape[1] != 3 or len(points) == 0:
        raise ValueError(f"Robot height points must have shape (N, 3), got {points.shape}")
    extents = points.max(axis=0) - points.min(axis=0)
    height = float(extents[int(axis)])
    if np.isfinite(height) and height > 1e-8:
        return height, "y_extent"
    fallback_axis = int(np.argmax(extents))
    fallback_height = float(extents[fallback_axis])
    if not np.isfinite(fallback_height) or fallback_height <= 1e-8:
        raise ValueError(f"Could not infer robot height from slot extents {extents.tolist()}")
    return fallback_height, f"axis_{fallback_axis}_extent"


def resolve_robot_height(args, robot_slots, robot_slot_name):
    configured = float(args.robot_height)
    if configured > 0.0:
        return configured
    height_points = np.asarray(robot_slots, dtype=np.float32)
    height_field = str(args.slots_field)
    if str(args.slots_field) != "target_points":
        try:
            height_points, _center_mode, _name = common.load_slot_data(args.slots, robot_slot_name, "target_points")
            height_field = "target_points"
        except Exception as exc:
            print(
                f"[HumanoidRetarget][WARN] target_points unavailable for robot height; "
                f"using {args.slots_field}: {exc}"
            )
    height, height_mode = robot_height_from_slots(height_points, axis=1)
    args.robot_height = float(height)
    print(
        f"[HumanoidRetarget] inferred robot_height={height:.5f} "
        f"from slots sample={robot_slot_name} field={height_field} mode={height_mode}"
    )
    return float(height)


def config_joint_values(config: dict[str, Any], key: str) -> dict[str, float]:
    robot = robot_config(config)
    values = robot.get(key, {})
    if values is None:
        return {}
    if not isinstance(values, dict):
        raise ValueError(f"robot.{key} must be an object mapping joint name to value.")
    return {str(name): parse_number(value) for name, value in values.items()}


def soma_template_prefers_tpose(template_cfg: dict[str, Any] | None) -> bool:
    if template_cfg is None:
        return False
    if str(template_cfg.get("type", "")).lower() != "soma":
        return False
    name = str(template_cfg.get("name", ""))
    return name.startswith("soma_A")


def robot_sample_pose_for_source(
    config: dict[str, Any],
    source_model_type: str | None,
    template_cfg: dict[str, Any] | None = None,
) -> str:
    robot = robot_config(config)
    if str(source_model_type or "").lower() == "soma":
        return "tpose"
    return str(robot.get("sample_pose", "tpose"))


def robot_sample_qpos_for_pose(config: dict[str, Any], pose: str) -> dict[str, float]:
    robot = robot_config(config)
    pose = str(pose)
    pose_key = f"{pose}_qpos"
    if robot.get(pose_key) is not None:
        return config_joint_values(config, pose_key)
    if pose not in {"default", "none", "raw", "off"}:
        return config_joint_values(config, "tpose_qpos")
    return {}


def config_joint_limits(config: dict[str, Any]) -> dict[str, tuple[float, float]]:
    robot = robot_config(config)
    values = robot.get("joint_limits", {})
    if values is None:
        return {}
    if not isinstance(values, dict):
        raise ValueError("robot.joint_limits must be an object mapping joint name to [lower, upper].")
    limits = {}
    for name, pair in values.items():
        if not isinstance(pair, (list, tuple)) or len(pair) != 2:
            raise ValueError(f"joint limit for {name!r} must be [lower, upper].")
        limits[str(name)] = (parse_number(pair[0]), parse_number(pair[1]))
    return limits


def config_dof_max_dq_box(config: dict[str, Any]) -> dict[str, float]:
    robot = robot_config(config)
    values = robot.get("dof_max_dq_box", {})
    if values is None:
        return {}
    if not isinstance(values, dict):
        raise ValueError("robot.dof_max_dq_box must be an object mapping joint name to max dq.")
    limits = {}
    for name, value in values.items():
        max_dq = abs(float(parse_number(value)))
        if not np.isfinite(max_dq) or max_dq <= 0.0:
            raise ValueError(f"robot.dof_max_dq_box[{name!r}] must be a positive finite number.")
        limits[str(name)] = max_dq
    return limits


def apply_joint_qpos(model, data, values: dict[str, float], required=False):
    missing = []
    for joint_name, value in values.items():
        joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, joint_name)
        if joint_id < 0:
            missing.append(joint_name)
            continue
        data.qpos[model.jnt_qposadr[joint_id]] = float(value)
    if missing and required:
        preview = ", ".join(missing[:8])
        raise ValueError(f"Configured joints not found: {preview}")
    if missing:
        preview = ", ".join(missing[:8])
        print(f"[HumanoidRetarget][WARN] skipped {len(missing)} missing configured joints: {preview}")


def apply_mimic_qpos(model, data, mimic: dict[str, Any]):
    for joint_name, spec in mimic.items():
        if isinstance(spec, dict):
            source_name = spec.get("source")
            multiplier = float(spec.get("multiplier", 1.0))
        elif isinstance(spec, (list, tuple)) and len(spec) == 2:
            source_name = spec[0]
            multiplier = float(spec[1])
        else:
            continue
        if not source_name:
            continue
        joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, joint_name)
        source_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, str(source_name))
        if joint_id < 0 or source_id < 0:
            continue
        data.qpos[model.jnt_qposadr[joint_id]] = multiplier * data.qpos[model.jnt_qposadr[source_id]]


def smpl_frame_to_robot_root(points, matrix=None):
    points = np.asarray(points, dtype=np.float32)
    transform = SMPL_TO_ROBOT_ROOT_MATRIX if matrix is None else np.asarray(matrix, dtype=np.float32)
    if transform.shape != (3, 3):
        raise ValueError(f"frame transform must be 3x3, got {transform.shape}")
    return points @ transform.T


def visual_geom_ids(model, policy="auto"):
    return surface_geom_ids(model, policy).astype(np.int32)


def collect_root_mesh(model, data, geom_ids, point_cloud_center_name):
    center_pos, center_rot, center_label = point_cloud_center_frame(model, data, point_cloud_center_name)
    vertices_all = []
    faces_all = []
    face_geom_ids = []
    offset = 0
    for geom_id in geom_ids:
        local_v, local_f = geom_local_mesh(model, int(geom_id))
        local_v = np.asarray(local_v, dtype=np.float64)
        local_f = np.asarray(local_f, dtype=np.int32)
        geom_rot = data.geom_xmat[int(geom_id)].reshape(3, 3)
        geom_pos = data.geom_xpos[int(geom_id)]
        world_v = local_v @ geom_rot.T + geom_pos
        root_v = (world_v - center_pos) @ center_rot
        vertices_all.append(root_v.astype(np.float32))
        faces_all.append(local_f + offset)
        face_geom_ids.append(np.full(len(local_f), int(geom_id), dtype=np.int32))
        offset += len(local_v)
    if not vertices_all:
        raise RuntimeError("No mesh vertices found for robot slot binding.")
    return (
        np.concatenate(vertices_all),
        np.concatenate(faces_all),
        np.concatenate(face_geom_ids),
        center_pos,
        center_rot,
        center_label,
    )


def bind_robot_slots(
    model,
    args,
    robot_slot_points_smpl,
    nearest_vertex_k=24,
    project_to_surface=True,
    source_model_type=None,
    template_cfg=None,
):
    config = args.config_data
    robot = robot_config(config)
    sample_pose = robot_sample_pose_for_source(config, source_model_type, template_cfg)
    sample_qpos = robot_sample_qpos_for_pose(config, sample_pose)
    ref_data = mujoco.MjData(model)
    mujoco.mj_resetData(model, ref_data)
    if sample_pose not in {"default", "none", "raw", "off"}:
        apply_joint_qpos(model, ref_data, sample_qpos, required=False)
        apply_mimic_qpos(model, ref_data, robot.get("mimic_qpos", {}) or {})
    mujoco.mj_forward(model, ref_data)
    print(
        f"[HumanoidRetarget] robot slot bind pose={sample_pose} "
        f"qpos_joints={len(sample_qpos)} source_model={source_model_type or 'unknown'}"
    )
    geom_ids = visual_geom_ids(model, robot.get("visual_geom_policy", "auto"))
    point_cloud_center = robot["point_cloud_center"]
    vertices, faces, face_geom_ids, center_pos, center_rot, center_label = collect_root_mesh(
        model,
        ref_data,
        geom_ids,
        point_cloud_center,
    )
    matrix = cfg_get(config, "robot.frame_transform.smpl_to_robot_root_matrix")
    points_root = smpl_frame_to_robot_root(robot_slot_points_smpl, matrix)
    binding = common.bind_points_to_mesh(points_root, vertices, faces, nearest_vertex_k=nearest_vertex_k)
    bound_geom_ids = face_geom_ids[binding["face_ids"]]
    points_root_bound = binding["closest_points"] if project_to_surface else points_root
    normals_world = binding["closest_normals"] @ center_rot.T
    points_world = points_root_bound @ center_rot.T + center_pos
    local_pos = np.empty_like(points_root_bound, dtype=np.float32)
    local_normals = np.empty_like(points_root_bound, dtype=np.float32)
    for geom_id in np.unique(bound_geom_ids):
        mask = bound_geom_ids == geom_id
        geom_rot = ref_data.geom_xmat[int(geom_id)].reshape(3, 3)
        geom_pos = ref_data.geom_xpos[int(geom_id)]
        local_pos[mask] = ((points_world[mask] - geom_pos) @ geom_rot).astype(np.float32)
        local_normals[mask] = (normals_world[mask] @ geom_rot).astype(np.float32)
    print(
        f"[HumanoidRetarget] bound robot slots: slots={len(robot_slot_points_smpl)}, "
        f"visual_geoms={len(geom_ids)}, point_cloud_center={center_label}"
    )
    return {
        "geom_ids": bound_geom_ids.astype(np.int32),
        "local_pos": local_pos.astype(np.float32),
        "local_normals": local_normals.astype(np.float32),
        "root_points": points_root_bound.astype(np.float32),
    }


def worldbody_child_is_robot(child):
    if child.tag == "body":
        return True
    if child.tag != "geom":
        return False
    name = (child.get("name") or "").lower()
    geom_type = (child.get("type") or "").lower()
    if "floor" in name or "ground" in name or geom_type == "plane":
        return False
    return bool(child.get("mesh"))


def model_has_freejoint(root):
    for body in root.iter("body"):
        if body.find("freejoint") is not None:
            return True
        if any((joint.get("type") or "").lower() == "free" for joint in body.findall("joint")):
            return True
    return False


def ensure_freejoint_body_inertials(root):
    attrs = {"pos": "0 0 0", "mass": "0.001", "diaginertia": "1e-6 1e-6 1e-6"}
    for body in root.iter("body"):
        has_freejoint = body.find("freejoint") is not None
        has_free_joint = any((joint.get("type") or "").lower() == "free" for joint in body.findall("joint"))
        if (has_freejoint or has_free_joint) and body.find("inertial") is None:
            body.insert(0, ET.Element("inertial", attrs))


def resolve_xml_asset_path(file_text: str, source_xml: Path, asset_base: Path | None) -> Path:
    file_path = Path(file_text)
    if file_path.is_absolute():
        parts = file_path.parts
        if "assets" in parts:
            asset_idx = len(parts) - 1 - list(reversed(parts)).index("assets")
            relative = Path(*parts[asset_idx + 1 :])
            candidate = ASSETS_ROOT / relative
            if candidate.exists():
                return candidate
        return file_path
    if file_path.parent == Path(".") and asset_base is not None:
        return asset_base / file_path
    return source_xml.parent / file_path


def absolutize_asset_paths(root, source_xml: Path):
    compiler = root.find("compiler")
    meshdir_text = compiler.get("meshdir") if compiler is not None else None
    texturedir_text = compiler.get("texturedir") if compiler is not None else None
    meshdir = Path(meshdir_text) if meshdir_text else None
    texturedir = Path(texturedir_text) if texturedir_text else None
    meshdir_base = None
    texturedir_base = None
    if meshdir is not None:
        meshdir_base = meshdir if meshdir.is_absolute() else source_xml.parent / meshdir
    if texturedir is not None:
        texturedir_base = texturedir if texturedir.is_absolute() else source_xml.parent / texturedir

    for mesh in root.findall("./asset/mesh"):
        file_text = mesh.get("file")
        if file_text:
            mesh.set("file", resolve_xml_asset_path(file_text, source_xml, meshdir_base).resolve().as_posix())
    for texture in root.findall("./asset/texture"):
        file_text = texture.get("file")
        if file_text:
            texture.set("file", resolve_xml_asset_path(file_text, source_xml, texturedir_base).resolve().as_posix())
    if compiler is not None:
        compiler.attrib.pop("meshdir", None)
        compiler.attrib.pop("texturedir", None)


def prepare_robot_xml(args) -> Path:
    source_xml = Path(args.robot_xml)
    if args.force_no_floating_root:
        return source_xml
    robot = robot_config(args.config_data)
    xml_policy = robot.get("xml_policy", {}) or {}
    if xml_policy.get("add_freejoint_root", True) is False:
        return source_xml

    output_xml = Path(args.out).with_suffix(".floating_mjcf.xml")
    tree = ET.parse(source_xml)
    root = tree.getroot()
    worldbody = root.find("worldbody")
    if worldbody is None:
        raise ValueError(f"MJCF missing worldbody: {source_xml}")
    if not model_has_freejoint(root):
        float_body_name = str(xml_policy.get("floating_root_body", f"{robot['name']}_float_root"))
        freejoint_name = str(xml_policy.get("floating_freejoint", f"{float_body_name}_freejoint"))
        float_root = ET.Element("body", {"name": float_body_name, "pos": "0 0 0"})
        ET.SubElement(float_root, "inertial", {"pos": "0 0 0", "mass": "0.001", "diaginertia": "1e-6 1e-6 1e-6"})
        ET.SubElement(float_root, "freejoint", {"name": freejoint_name})
        for child in list(worldbody):
            if worldbody_child_is_robot(child):
                worldbody.remove(child)
                float_root.append(child)
        worldbody.append(float_root)
    ensure_freejoint_body_inertials(root)
    absolutize_asset_paths(root, source_xml)
    output_xml.parent.mkdir(parents=True, exist_ok=True)
    tree.write(output_xml, encoding="unicode")
    return output_xml


def ground_contact_active_slots(target_distances, threshold, max_points, rank_distances=None, candidate_slot_ids=None):
    target_distances = np.asarray(target_distances, dtype=np.float64).reshape(-1)
    rank_distances = target_distances if rank_distances is None else np.asarray(rank_distances, dtype=np.float64).reshape(-1)
    if len(rank_distances) != len(target_distances):
        raise ValueError(
            f"Ground contact rank count mismatch: rank={len(rank_distances)}, target={len(target_distances)}"
        )
    if candidate_slot_ids is None:
        candidate = np.arange(len(target_distances), dtype=np.int32)
    else:
        candidate = np.asarray(candidate_slot_ids, dtype=np.int32).reshape(-1)
        candidate = candidate[(candidate >= 0) & (candidate < len(target_distances))]
    active = candidate[target_distances[candidate] <= float(threshold)].astype(np.int32)
    if active.size > 0 and int(max_points) > 0 and active.size > int(max_points):
        active = active[np.argsort(rank_distances[active])[: int(max_points)]]
    return active


def ground_contact_anchor_slots(target_distances, max_points, rank_distances=None, candidate_slot_ids=None):
    target_distances = np.asarray(target_distances, dtype=np.float64).reshape(-1)
    rank_distances = target_distances if rank_distances is None else np.asarray(rank_distances, dtype=np.float64).reshape(-1)
    if len(rank_distances) != len(target_distances):
        raise ValueError(
            f"Ground contact anchor rank count mismatch: rank={len(rank_distances)}, target={len(target_distances)}"
        )
    if candidate_slot_ids is None:
        candidate = np.arange(len(target_distances), dtype=np.int32)
    else:
        candidate = np.asarray(candidate_slot_ids, dtype=np.int32).reshape(-1)
        candidate = candidate[(candidate >= 0) & (candidate < len(target_distances))]
    active = candidate[np.isclose(target_distances[candidate], 0.0, atol=1e-8)].astype(np.int32)
    if active.size > 0 and int(max_points) > 0 and active.size > int(max_points):
        active = active[np.argsort(rank_distances[active])[: int(max_points)]]
    return active


def ground_penetration_constraint_slots(points, slot_ids, max_points, threshold, margin=0.0):
    slot_ids = np.asarray(slot_ids, dtype=np.int32).reshape(-1)
    if slot_ids.size == 0:
        return slot_ids, np.zeros(0, dtype=np.float64)
    values = np.asarray(points, dtype=np.float64)
    z = values.reshape(-1) if values.ndim == 1 else values[:, 2]
    if z.size != slot_ids.size:
        raise ValueError(f"Ground penetration z count {z.size} does not match slot count {slot_ids.size}")
    threshold = float(threshold)
    if threshold >= 0.0:
        active = z < (float(margin) + threshold)
        slot_ids = slot_ids[active]
        z = z[active]
    if slot_ids.size == 0:
        return slot_ids.astype(np.int32), z.astype(np.float64, copy=False)
    max_points = int(max_points)
    if max_points > 0 and slot_ids.size > max_points:
        chosen = np.argpartition(z, max_points - 1)[:max_points]
        chosen = chosen[np.lexsort((slot_ids[chosen], z[chosen]))]
        slot_ids = slot_ids[chosen]
        z = z[chosen]
    return slot_ids.astype(np.int32), z.astype(np.float64, copy=False)


SELF_CONTACT_MAP_MODES = ("threshold_global_topk", "source_clearance_body_pair_topk")


def parse_self_contact_map_modes(value):
    if value is None:
        return ["threshold_global_topk"]
    if isinstance(value, (list, tuple)):
        raw_modes = [str(item).strip() for item in value]
    else:
        text = str(value).strip()
        if text.startswith("["):
            raw_modes = [str(item).strip() for item in json.loads(text)]
        elif text in {"both", "all"}:
            raw_modes = list(SELF_CONTACT_MAP_MODES)
        else:
            raw_modes = [item.strip() for chunk in text.split("+") for item in chunk.split(",")]
    modes = []
    for mode in raw_modes:
        if not mode:
            continue
        if mode not in SELF_CONTACT_MAP_MODES:
            raise ValueError(
                f"Unknown --self-contact-map-mode {mode!r}; expected one or more of {SELF_CONTACT_MAP_MODES}"
            )
        if mode not in modes:
            modes.append(mode)
    if not modes:
        raise ValueError("--self-contact-map-mode resolved to no modes.")
    return modes


def merge_self_contact_maps(map_groups):
    if not map_groups:
        return None
    frame_count = len(map_groups[0])
    merged = []
    for frame_idx in range(frame_count):
        pair_data = {}
        for maps in map_groups:
            item = maps[frame_idx]
            pair_slot_ids = np.asarray(item["slot_pairs"], dtype=np.int32).reshape(-1, 2)
            distances = np.asarray(item["distances"], dtype=np.float32).reshape(-1)
            weights = np.asarray(
                item.get("weights", np.ones(len(distances), dtype=np.float32)),
                dtype=np.float32,
            ).reshape(-1)
            if len(pair_slot_ids) != len(distances) or len(weights) != len(distances):
                raise ValueError(
                    f"Self-contact merge count mismatch at frame {frame_idx}: "
                    f"pairs={len(pair_slot_ids)} distances={len(distances)} weights={len(weights)}"
                )
            for pair, distance, weight in zip(pair_slot_ids, distances, weights):
                key = tuple(sorted((int(pair[0]), int(pair[1]))))
                existing = pair_data.get(key)
                if existing is None or float(weight) > float(existing[1]):
                    pair_data[key] = (float(distance), float(weight))
        if pair_data:
            pair_ids = np.asarray(list(pair_data.keys()), dtype=np.int32)
            distances = np.asarray([item[0] for item in pair_data.values()], dtype=np.float32)
            weights = np.asarray([item[1] for item in pair_data.values()], dtype=np.float32)
        else:
            pair_ids = np.zeros((0, 2), dtype=np.int32)
            distances = np.zeros(0, dtype=np.float32)
            weights = np.zeros(0, dtype=np.float32)
        merged.append({"slot_pairs": pair_ids, "distances": distances, "weights": weights})
    return merged


def update_ground_contact_anchors(model, data, qpos, robot_template, active_slot_ids, anchor_state):
    active_slot_ids = np.asarray(active_slot_ids, dtype=np.int32).reshape(-1)
    active_set = {int(slot_id) for slot_id in active_slot_ids}
    for slot_id in list(anchor_state):
        if int(slot_id) not in active_set:
            del anchor_state[int(slot_id)]
    new_slot_ids = np.asarray(
        [int(slot_id) for slot_id in active_slot_ids if int(slot_id) not in anchor_state],
        dtype=np.int32,
    )
    if new_slot_ids.size == 0:
        return
    common.set_qpos(model, data, qpos)
    new_points = common.template_points_to_world(data, robot_template, new_slot_ids)
    for slot_id, point in zip(new_slot_ids, new_points):
        target = np.asarray([point[0], point[1], 0.0], dtype=np.float64)
        anchor_state[int(slot_id)] = target


def solve_frame_body_segment_qp(
    model,
    data,
    qpos_init,
    qpos_prev,
    qpos_prev2,
    source_slots,
    source_slot_normals,
    source_surface_normal_targets,
    selected_slot_ids,
    source_slot_part_ids,
    surface_point_slot_costs,
    surface_normal_slot_costs,
    source_self_contact_map,
    source_ground_contact_distances,
    source_ground_contact_weight_distances,
    robot_template,
    joint_qpos_addrs,
    joint_dof_addrs,
    args,
    iters=None,
    joint_limits_by_qpos=None,
    robot_self_penetration_cache=None,
    ground_penetration_collision_cache=None,
    ground_contact_anchor_state=None,
):
    qpos = qpos_init.copy()
    costs = []
    sqrt_smooth = np.sqrt(float(args.smooth_cost))
    sqrt_temporal_smooth = np.sqrt(float(args.temporal_smooth_cost))
    ground_contact_threshold = float(args.ground_contact_map_threshold)
    ground_contact_max_points = int(args.ground_contact_map_max_points)
    self_contact_cost = float(args.self_contact_map_cost)
    if ground_contact_anchor_state is None:
        ground_contact_anchor_state = {}

    target_distances_for_contact = None
    weight_distances_for_contact = None
    if source_ground_contact_distances is not None:
        target_distances_for_contact = np.asarray(source_ground_contact_distances, dtype=np.float64).reshape(-1)
        weight_distances_for_contact = (
            target_distances_for_contact
            if source_ground_contact_weight_distances is None
            else np.asarray(source_ground_contact_weight_distances, dtype=np.float64).reshape(-1)
        )
        if len(target_distances_for_contact) != len(robot_template["geom_ids"]):
            raise ValueError(
                f"Ground contact slot count mismatch: target={len(target_distances_for_contact)}, "
                f"robot={len(robot_template['geom_ids'])}"
            )
        if len(weight_distances_for_contact) != len(target_distances_for_contact):
            raise ValueError(
                f"Ground contact weight count mismatch: weights={len(weight_distances_for_contact)}, "
                f"target={len(target_distances_for_contact)}"
            )

    anchor_active = np.zeros(0, dtype=np.int32)
    if (
        float(args.ground_contact_anchor_cost) > 0.0
        and target_distances_for_contact is not None
    ):
        anchor_active = ground_contact_anchor_slots(
            target_distances_for_contact,
            ground_contact_max_points,
            rank_distances=weight_distances_for_contact,
            candidate_slot_ids=selected_slot_ids,
        )
    update_ground_contact_anchors(
        model,
        data,
        qpos,
        robot_template,
        anchor_active,
        ground_contact_anchor_state,
    )

    selected_slot_ids = np.asarray(selected_slot_ids, dtype=np.int32).reshape(-1)
    source_slots = np.asarray(source_slots, dtype=np.float64)

    pair_slot_ids = np.zeros((0, 2), dtype=np.int32)
    source_pair_distances = np.zeros(0, dtype=np.float64)
    source_pair_weights = np.zeros(0, dtype=np.float64)
    unique_pair_slots = np.zeros(0, dtype=np.int32)
    pair_i_unique = np.zeros(0, dtype=np.int32)
    pair_j_unique = np.zeros(0, dtype=np.int32)
    if self_contact_cost > 0.0 and source_self_contact_map is not None:
        pair_slot_ids = np.asarray(source_self_contact_map["slot_pairs"], dtype=np.int32).reshape(-1, 2)
        source_pair_distances = np.asarray(source_self_contact_map["distances"], dtype=np.float64).reshape(-1)
        source_pair_weights = np.asarray(
            source_self_contact_map.get("weights", np.ones(len(source_pair_distances), dtype=np.float32)),
            dtype=np.float64,
        ).reshape(-1)
        if len(pair_slot_ids) != len(source_pair_distances):
            raise ValueError(
                f"Self-contact pair count mismatch: pairs={len(pair_slot_ids)}, "
                f"distances={len(source_pair_distances)}"
            )
        if len(source_pair_weights) != len(source_pair_distances):
            raise ValueError(
                f"Self-contact weight count mismatch: weights={len(source_pair_weights)}, "
                f"distances={len(source_pair_distances)}"
            )
        if len(pair_slot_ids) > 0:
            unique_pair_slots = np.unique(pair_slot_ids.reshape(-1)).astype(np.int32)
            pair_i_unique = np.searchsorted(unique_pair_slots, pair_slot_ids[:, 0])
            pair_j_unique = np.searchsorted(unique_pair_slots, pair_slot_ids[:, 1])

    ground_active = np.zeros(0, dtype=np.int32)
    ground_target_z = np.zeros(0, dtype=np.float64)
    ground_row_costs = np.zeros(0, dtype=np.float64)
    if (
        float(args.ground_contact_map_cost) > 0.0
        and source_ground_contact_distances is not None
        and ground_contact_threshold >= 0.0
    ):
        ground_active = ground_contact_active_slots(
            target_distances_for_contact,
            ground_contact_threshold,
            ground_contact_max_points,
            rank_distances=weight_distances_for_contact,
            candidate_slot_ids=selected_slot_ids,
        )
        if ground_active.size > 0:
            ground_target_z = target_distances_for_contact[ground_active]
            ground_strength = np.clip(
                (ground_contact_threshold - weight_distances_for_contact[ground_active])
                / max(ground_contact_threshold, 1e-8),
                0.05,
                1.0,
            )
            ground_row_costs = float(args.ground_contact_map_cost) * ground_strength

    anchor_row_costs = np.zeros(0, dtype=np.float64)
    if (
        float(args.ground_contact_anchor_cost) > 0.0
        and target_distances_for_contact is not None
        and anchor_active.size > 0
    ):
        anchor_strength = np.clip(
            (ground_contact_threshold - weight_distances_for_contact[anchor_active])
            / max(ground_contact_threshold, 1e-8),
            0.05,
            1.0,
        )
        anchor_row_costs = float(args.ground_contact_anchor_cost) * anchor_strength

    smooth_jac = None
    if len(joint_dof_addrs) > 0:
        smooth_jac = np.zeros((len(joint_dof_addrs), model.nv), dtype=np.float64)
        smooth_jac[np.arange(len(joint_dof_addrs)), joint_dof_addrs] = 1.0

    frame_iters = int(args.iters) if iters is None else int(iters)
    for _iter in range(max(1, frame_iters)):
        common.set_qpos(model, data, qpos)
        rows = []
        residuals = []
        slot_cache = common.TemplateSlotKinematicsCache(model, data, robot_template)

        point_costs = np.asarray(surface_point_slot_costs, dtype=np.float64).reshape(-1)
        robot_points = slot_cache.points(selected_slot_ids)
        for local_row, slot_id in enumerate(selected_slot_ids):
            slot_id = int(slot_id)
            point_cost = float(point_costs[slot_id]) if slot_id < len(point_costs) else 0.0
            if point_cost <= 0.0:
                continue
            point = robot_points[local_row]
            residual = point - source_slots[slot_id]
            jac = slot_cache.point_jacobian(slot_id)
            sqrt_point = np.sqrt(point_cost)
            rows.append(sqrt_point * jac)
            residuals.append(sqrt_point * residual)

        if source_slot_normals is not None and surface_normal_slot_costs is not None:
            source_normals = np.asarray(source_slot_normals, dtype=np.float64)
            normal_targets = (
                source_normals
                if source_surface_normal_targets is None
                else np.asarray(source_surface_normal_targets, dtype=np.float64)
            )
            if len(normal_targets) != len(source_normals):
                raise ValueError(
                    f"Surface normal target slot count mismatch: targets={len(normal_targets)} "
                    f"source_normals={len(source_normals)}"
                )
            normal_costs = np.asarray(surface_normal_slot_costs, dtype=np.float64).reshape(-1)
            robot_normals = slot_cache.normals(selected_slot_ids)
            for local_row, slot_id in enumerate(selected_slot_ids):
                slot_id = int(slot_id)
                normal_cost = float(normal_costs[slot_id]) if slot_id < len(normal_costs) else 0.0
                if normal_cost <= 0.0:
                    continue
                robot_normal = robot_normals[local_row]
                normal_target = normal_targets[slot_id]
                normal_target = normal_target / max(float(np.linalg.norm(normal_target)), 1e-12)
                jac = slot_cache.normal_jacobian(slot_id)
                sqrt_normal = np.sqrt(normal_cost)
                rows.append(sqrt_normal * jac)
                residuals.append(sqrt_normal * (robot_normal - normal_target))

        if self_contact_cost > 0.0 and len(pair_slot_ids) > 0:
            unique_points = slot_cache.points(unique_pair_slots)
            point_i = unique_points[pair_i_unique]
            point_j = unique_points[pair_j_unique]
            delta = point_i - point_j
            robot_distances = np.linalg.norm(delta, axis=1)
            pair_scales = np.sqrt(self_contact_cost) * np.sqrt(np.maximum(source_pair_weights, 0.0))
            active_pairs = (pair_scales > 0.0) & (robot_distances < source_pair_distances)
            if np.any(active_pairs):
                directions = np.empty_like(delta)
                nonzero = robot_distances > 1e-12
                directions[nonzero] = delta[nonzero] / robot_distances[nonzero, None]
                if np.any(~nonzero):
                    source_delta = source_slots[pair_slot_ids[~nonzero, 0]] - source_slots[pair_slot_ids[~nonzero, 1]]
                    source_norm = np.maximum(np.linalg.norm(source_delta, axis=1), 1e-12)
                    directions[~nonzero] = source_delta / source_norm[:, None]
                active_pair_slot_ids = pair_slot_ids[active_pairs]
                active_dirs = directions[active_pairs]
                active_scales = pair_scales[active_pairs]
                active_residuals = active_scales * (robot_distances[active_pairs] - source_pair_distances[active_pairs])
                active_slots = np.unique(active_pair_slot_ids.reshape(-1)).astype(np.int32)
                jac_by_slot = {int(slot_id): slot_cache.point_jacobian(int(slot_id)) for slot_id in active_slots}
                jac_i = np.stack([jac_by_slot[int(slot_id)] for slot_id in active_pair_slot_ids[:, 0]], axis=0)
                jac_j = np.stack([jac_by_slot[int(slot_id)] for slot_id in active_pair_slot_ids[:, 1]], axis=0)
                jac_rows = np.einsum("pi,pij->pj", active_dirs, jac_i - jac_j)
                rows.append(active_scales[:, None] * jac_rows)
                residuals.append(active_residuals)

        if (
            float(args.ground_contact_map_cost) > 0.0
            and source_ground_contact_distances is not None
            and ground_contact_threshold >= 0.0
        ):
            if ground_active.size > 0:
                ground_points = slot_cache.points(ground_active)
                errors = ground_points[:, 2] - ground_target_z
                for row, (point, slot_id) in enumerate(zip(ground_points, ground_active)):
                    jac = slot_cache.point_jacobian(int(slot_id))
                    rows.append(ground_row_costs[row] * jac[2:3])
                    residuals.append(np.asarray([ground_row_costs[row] * errors[row]], dtype=np.float64))

        if (
            float(args.ground_contact_anchor_cost) > 0.0
            and target_distances_for_contact is not None
            and anchor_active.size > 0
        ):
            anchor_points = slot_cache.points(anchor_active)
            for row, (point, slot_id) in enumerate(zip(anchor_points, anchor_active)):
                target = ground_contact_anchor_state.get(int(slot_id))
                if target is None:
                    continue
                jac = slot_cache.point_jacobian(int(slot_id))
                rows.append(anchor_row_costs[row] * jac)
                residuals.append(anchor_row_costs[row] * (point - target))

        if qpos_prev is not None and float(args.smooth_cost) > 0.0 and smooth_jac is not None:
            rows.append(sqrt_smooth * smooth_jac)
            residuals.append(sqrt_smooth * (qpos[joint_qpos_addrs] - qpos_prev[joint_qpos_addrs]))

        if qpos_prev is not None and qpos_prev2 is not None and float(args.temporal_smooth_cost) > 0.0 and smooth_jac is not None:
            rows.append(sqrt_temporal_smooth * smooth_jac)
            current_dq = qpos[joint_qpos_addrs] - qpos_prev[joint_qpos_addrs]
            previous_dq = qpos_prev[joint_qpos_addrs] - qpos_prev2[joint_qpos_addrs]
            residuals.append(sqrt_temporal_smooth * (current_dq - previous_dq))

        robot_self_cost = float(args.robot_self_penetration_cost)
        robot_self_hard = bool(args.robot_self_penetration_hard_constraint)
        jacobians_self = []
        distances_self = []
        if robot_self_cost > 0.0 or robot_self_hard:
            robot_self_threshold = max(
                float(args.collision_threshold),
                float(args.robot_self_penetration_tolerance) if robot_self_cost > 0.0 else 0.0,
                float(args.robot_self_penetration_margin) if robot_self_hard else 0.0,
            )
            jacobians_self, distances_self = common.compute_robot_self_penetration_rows(
                model,
                data,
                robot_self_penetration_cache,
                robot_self_threshold,
            )
        if robot_self_cost > 0.0:
            tolerance = float(args.robot_self_penetration_tolerance)
            sqrt_self = np.sqrt(robot_self_cost)
            for jac, phi in zip(jacobians_self, distances_self):
                if (tolerance - float(phi)) <= 0.0:
                    continue
                rows.append(sqrt_self * np.asarray(jac, dtype=np.float64).reshape(1, model.nv))
                residuals.append(np.asarray([sqrt_self * (float(phi) - tolerance)], dtype=np.float64))

        J = np.concatenate(rows, axis=0)
        r = np.concatenate(residuals, axis=0)
        use_step_box, use_step_l2 = common.step_limit_flags(args.step_limit_mode, label="step_limit_mode")
        use_root_step_box, use_root_step_l2 = common.step_limit_flags(
            args.root_step_limit_mode,
            allow_off=True,
            label="root_step_limit_mode",
        )
        local_dof_ids = common.local_pose_qvel_dof_ids(model)
        root_translation_dof_ids, root_rotation_dof_ids = common.root_qvel_dof_groups(model)
        step_lower, step_upper = common.qvel_step_bounds(
            model,
            qpos,
            args.max_dq,
            joint_limits_by_qpos=joint_limits_by_qpos,
            use_step_box=use_step_box,
            limited_dof_ids=local_dof_ids,
            dof_max_dq_box=getattr(args, "dof_max_dq_box_by_dof", None),
        )
        if use_root_step_box:
            common.apply_qvel_box_limit(
                step_lower,
                step_upper,
                root_translation_dof_ids,
                args.root_max_translation_dq,
            )
            common.apply_qvel_box_limit(
                step_lower,
                step_upper,
                root_rotation_dof_ids,
                args.root_max_rotation_dq,
            )
        l2_step_limits = []
        if use_step_l2:
            l2_step_limits.append((local_dof_ids, args.global_step_size, "global_step_size(local_pose)"))
        if use_root_step_l2:
            l2_step_limits.append(
                (
                    root_translation_dof_ids,
                    args.root_global_translation_step_size,
                    "root_global_translation_step_size",
                )
            )
            l2_step_limits.append(
                (
                    root_rotation_dof_ids,
                    args.root_global_rotation_step_size,
                    "root_global_rotation_step_size",
                )
            )
        ineq_rows = []
        ineq_bounds = []
        ineq_soft_costs = []
        ground_mode = str(args.ground_penetration_hard_constraint_mode)
        if bool(args.ground_penetration_hard_constraint) and ground_mode in {"surface_slots", "surface_slots_all"}:
            if ground_mode == "surface_slots_all":
                candidate_slot_ids = np.arange(len(robot_template["geom_ids"]), dtype=np.int32)
            else:
                candidate_slot_ids = np.asarray(selected_slot_ids, dtype=np.int32)
            candidate_z = common.template_points_world_z(data, robot_template, candidate_slot_ids)
            constraint_slot_ids, constraint_z = ground_penetration_constraint_slots(
                candidate_z,
                candidate_slot_ids,
                args.ground_penetration_max_points,
                args.ground_penetration_threshold,
                margin=args.ground_penetration_margin,
            )
            if constraint_slot_ids.size > 0:
                floor_z = float(args.ground_penetration_margin)
                ground_slack_cost = (
                    float(args.ground_penetration_hard_slack_cost)
                    if bool(args.ground_penetration_hard_slack)
                    else 0.0
                )
                for point_z, slot_id in zip(constraint_z, constraint_slot_ids):
                    jac = slot_cache.point_jacobian(int(slot_id))
                    ineq_rows.append(-jac[2])
                    ineq_bounds.append(float(point_z) - floor_z)
                    ineq_soft_costs.append(ground_slack_cost)
        elif bool(args.ground_penetration_hard_constraint) and ground_mode == "mujoco_collision":
            ground_slack_cost = (
                float(args.ground_penetration_hard_slack_cost)
                if bool(args.ground_penetration_hard_slack)
                else 0.0
            )
            jacobians_ground, distances_ground = common.compute_ground_penetration_collision_rows(
                model,
                data,
                ground_penetration_collision_cache,
                margin=float(args.ground_penetration_margin),
                threshold=float(args.ground_penetration_threshold),
                max_pairs=int(args.ground_penetration_max_points),
            )
            for jac, phi in zip(jacobians_ground, distances_ground):
                ineq_rows.append(-np.asarray(jac, dtype=np.float64).reshape(model.nv))
                ineq_bounds.append(float(phi) - float(args.ground_penetration_margin))
                ineq_soft_costs.append(ground_slack_cost)
        if bool(args.robot_self_penetration_hard_constraint):
            margin = float(args.robot_self_penetration_margin)
            slack_cost = (
                float(args.robot_self_penetration_hard_slack_cost)
                if bool(args.robot_self_penetration_hard_slack)
                else 0.0
            )
            for jac, phi in zip(jacobians_self, distances_self):
                ineq_rows.append(-np.asarray(jac, dtype=np.float64).reshape(model.nv))
                ineq_bounds.append(float(phi) - margin)
                ineq_soft_costs.append(slack_cost)
        ineq_A = np.asarray(ineq_rows, dtype=np.float64) if ineq_rows else None
        ineq_b = np.asarray(ineq_bounds, dtype=np.float64) if ineq_bounds else None
        ineq_soft_costs_array = np.asarray(ineq_soft_costs, dtype=np.float64) if ineq_rows else None
        dq = common.solve_clarabel_qp_step(
            J,
            r,
            args.damping,
            step_lower,
            step_upper,
            ineq_A=ineq_A,
            ineq_b=ineq_b,
            ineq_soft_costs=ineq_soft_costs_array,
            l2_step_limits=l2_step_limits,
        )
        mujoco.mj_integratePos(model, qpos, dq, 1.0)
        qpos = common.clamp_joint_ranges(model, qpos, joint_limits_by_qpos=joint_limits_by_qpos)
        costs.append(float(np.mean(r * r)))
    common.set_qpos(model, data, qpos)
    return qpos, costs[-1] if costs else 0.0


def estimate_ground_z_stream(sequence, frame_ids, args, source_joint_names=None, soma_usd_path=None, source_model_type="smplx"):
    if str(args.source_ground_align) == "none":
        return 0.0
    if str(args.source_ground_align) != "global_foot_joint":
        raise ValueError(f"Unsupported source_ground_align={args.source_ground_align!r}")
    min_toe_z = np.inf
    chunk_size = max(1, int(args.stream_chunk_frames or args.batch_size or 1))
    if source_joint_names is None:
        toe_ids = [common.SMPLX_JOINT_IDS["L_Foot"], common.SMPLX_JOINT_IDS["R_Foot"]]
    else:
        import soma_source

        toe_ids = [
            soma_source.soma_joint_index(source_joint_names, "LeftToeBase", "LeftFoot"),
            soma_source.soma_joint_index(source_joint_names, "RightToeBase", "RightFoot"),
        ]
    for start in range(0, len(frame_ids), chunk_size):
        chunk_ids = frame_ids[start : start + chunk_size]
        _vertices, joints, _faces = common.source_motion_vertices_joints(
            sequence,
            chunk_ids,
            args.smplx_model_dir,
            batch_size=min(int(args.batch_size), len(chunk_ids)),
            soma_usd_path=soma_usd_path,
            zero_source_finger_pose=bool(args.zero_source_finger_pose),
            smplx_device=args.smplx_device,
            smplx_batch_size=args.smplx_batch_size,
            smplx_batch_size_max=args.smplx_batch_size_max,
            smplx_batch_size_safety_factor=args.smplx_batch_size_safety_factor,
        )
        joints = common.source_points_to_retarget_frame(
            joints,
            source_model_type,
            sequence.get("output_up", "z"),
        )
        min_toe_z = min(min_toe_z, float(joints[:, toe_ids, 2].min()))
    ground_z = float(min_toe_z)
    if ground_z >= float(args.mat_height):
        ground_z -= float(args.mat_height)
    return ground_z


def source_slots_and_normals_for_vertices(vertices_scaled, template_faces, source_binding):
    vertices_scaled = np.asarray(vertices_scaled, dtype=np.float32)
    out = np.empty((len(vertices_scaled), len(source_binding["face_ids"]), 3), dtype=np.float32)
    normals = np.empty_like(out, dtype=np.float32)
    bound_faces = np.asarray(template_faces, dtype=np.int32)[np.asarray(source_binding["face_ids"], dtype=np.int32)]
    for frame_idx, vertices in enumerate(vertices_scaled):
        out[frame_idx] = common.dynamic_surface_template_to_world(vertices, template_faces, source_binding)
        triangles = vertices[bound_faces]
        normals[frame_idx] = normalize_vectors(
            np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
        ).astype(np.float32)
    return out, normals


SOURCE_FEATURE_CACHE_VERSION = 1


def source_face_rotations_for_vertices(
    vertices_scaled,
    template_vertices,
    template_faces,
    source_binding,
    slot_ids=None,
):
    face_ids = np.asarray(source_binding["face_ids"], dtype=np.int32)
    if slot_ids is not None:
        face_ids = face_ids[np.asarray(slot_ids, dtype=np.int32)]
    bound_faces = np.asarray(template_faces, dtype=np.int32)[face_ids]

    def frames(vertices):
        triangles = np.asarray(vertices, dtype=np.float64)[bound_faces]
        e1 = normalize_vectors(triangles[:, 1] - triangles[:, 0])
        normals = normalize_vectors(np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0]))
        e2 = normalize_vectors(np.cross(normals, e1))
        return np.stack([e1, e2, normals], axis=-1)

    template_basis = frames(template_vertices)
    template_basis_t = np.swapaxes(template_basis, 1, 2)
    rotations = np.empty((len(vertices_scaled), len(face_ids), 3, 3), dtype=np.float32)
    for frame_idx, vertices in enumerate(vertices_scaled):
        rotations[frame_idx] = (frames(vertices) @ template_basis_t).astype(np.float32)
    return rotations


def source_cache_self_contact_maps(cache, frame_indices):
    counts = cache["self_contact_counts"]
    pairs = cache["self_contact_pair_ids"]
    distances = cache["self_contact_distances"]
    weights = cache["self_contact_weights"]
    maps = []
    for frame_idx in np.asarray(frame_indices, dtype=np.int32):
        count = int(counts[int(frame_idx)])
        maps.append(
            {
                "slot_pairs": pairs[int(frame_idx), :count].astype(np.int32, copy=False),
                "distances": distances[int(frame_idx), :count].astype(np.float32, copy=False),
                "weights": weights[int(frame_idx), :count].astype(np.float32, copy=False),
            }
        )
    return maps


def save_source_feature_cache(
    cache_path,
    *,
    args,
    sequence,
    seq_key,
    frame_ids,
    template_cfg,
    faces,
    source_joint_names,
    source_model_type,
    soma_usd_path,
    smpl_scale,
    template_vertices_centered,
    source_binding,
    source_slot_part_ids,
    selected_slot_ids,
):
    chunk_size = max(1, min(int(args.stream_chunk_frames or len(frame_ids)), 10800))
    slot_chunks = []
    normal_chunks = []
    rotation_chunks = []
    joint_chunks = []
    min_toe_z = np.inf
    if source_joint_names is None:
        toe_ids = [common.SMPLX_JOINT_IDS["L_Foot"], common.SMPLX_JOINT_IDS["R_Foot"]]
    else:
        import soma_source

        toe_ids = [
            soma_source.soma_joint_index(source_joint_names, "LeftToeBase", "LeftFoot"),
            soma_source.soma_joint_index(source_joint_names, "RightToeBase", "RightFoot"),
        ]

    for start in range(0, len(frame_ids), chunk_size):
        end = min(start + chunk_size, len(frame_ids))
        chunk_ids = frame_ids[start:end]
        vertices_world, joints_world, _faces = common.source_motion_vertices_joints(
            sequence,
            chunk_ids,
            args.smplx_model_dir,
            batch_size=min(int(args.batch_size), len(chunk_ids)),
            soma_usd_path=soma_usd_path,
            zero_source_finger_pose=bool(args.zero_source_finger_pose),
            smplx_device=args.smplx_device,
            smplx_batch_size=args.smplx_batch_size,
            smplx_batch_size_max=min(int(args.smplx_batch_size_max), 10800),
            smplx_batch_size_safety_factor=args.smplx_batch_size_safety_factor,
        )
        source_up = sequence.get("output_up", "z")
        vertices_world = common.source_points_to_retarget_frame(vertices_world, source_model_type, source_up)
        joints_world = common.source_points_to_retarget_frame(joints_world, source_model_type, source_up)
        if str(args.source_ground_align) != "none":
            min_toe_z = min(min_toe_z, float(joints_world[:, toe_ids, 2].min()))
        vertices_scaled = vertices_world * float(smpl_scale)
        joints_scaled = joints_world * float(smpl_scale)
        source_slots, source_slot_normals = source_slots_and_normals_for_vertices(
            vertices_scaled,
            faces,
            source_binding,
        )
        slot_chunks.append(source_slots.astype(np.float32))
        normal_chunks.append(source_slot_normals.astype(np.float32))
        joint_chunks.append(joints_scaled.astype(np.float32))
        if str(args.surface_normal_cost_mode) == "tpose_offset":
            rotation_chunks.append(
                source_face_rotations_for_vertices(
                    vertices_scaled,
                    template_vertices_centered,
                    faces,
                    source_binding,
                    selected_slot_ids,
                )
            )
        print(
            f"[SourceFeatureFeeder] frames={end}/{len(frame_ids)} chunk={end - start} "
            f"device={args.smplx_device}",
            flush=True,
        )

    ground_z = 0.0 if str(args.source_ground_align) == "none" else float(min_toe_z)
    if ground_z >= float(args.mat_height):
        ground_z -= float(args.mat_height)
    source_slots = np.concatenate(slot_chunks, axis=0)
    source_slot_normals = np.concatenate(normal_chunks, axis=0)
    joints_scaled = np.concatenate(joint_chunks, axis=0)
    ground_shift_scaled = float(ground_z) * float(smpl_scale)
    source_slots[:, :, 2] -= ground_shift_scaled
    joints_scaled[:, :, 2] -= ground_shift_scaled
    source_face_rotations = (
        np.concatenate(rotation_chunks, axis=0)
        if rotation_chunks
        else np.zeros((len(frame_ids), 0, 3, 3), dtype=np.float32)
    )

    if float(args.ground_contact_map_cost) > 0.0 or float(args.ground_contact_anchor_cost) > 0.0:
        ground, raw_ground, ground_weights = common.compute_source_slot_ground_contact(
            source_slots,
            snap_threshold=float(args.ground_contact_map_snap_threshold),
        )
    else:
        ground = np.zeros((0, 0), dtype=np.float32)
        raw_ground = np.zeros((0, 0), dtype=np.float32)
        ground_weights = np.zeros((0, 0), dtype=np.float32)

    if float(args.self_contact_map_cost) > 0.0:
        modes = parse_self_contact_map_modes(args.self_contact_map_mode)
        body_topk = parse_body_topk_config(args.self_contact_map_body_topk)
        maps_by_mode = compute_source_self_contact_map_groups(
            source_slots,
            selected_slot_ids,
            source_slot_part_ids,
            modes=modes,
            threshold=float(args.self_contact_map_threshold),
            max_pairs=int(args.self_contact_map_max_pairs),
            body_topk=body_topk,
            log_prefix="SourceFeatureFeeder",
        )
        source_self_maps = merge_self_contact_maps([maps_by_mode[mode] for mode in modes])
        pair_ids, pair_distances, pair_counts = pack_self_contact_maps(source_self_maps)
        pair_weights = pack_self_contact_map_weights(source_self_maps)
    else:
        pair_ids = np.full((len(frame_ids), 0, 2), -1, dtype=np.int32)
        pair_distances = np.zeros((len(frame_ids), 0), dtype=np.float32)
        pair_weights = np.zeros((len(frame_ids), 0), dtype=np.float32)
        pair_counts = np.zeros(len(frame_ids), dtype=np.int32)

    cache_path = Path(cache_path)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = cache_path.with_name(f".{cache_path.name}.tmp.{os.getpid()}")
    with temporary.open("wb") as handle:
        np.savez(
            handle,
            version=np.asarray([SOURCE_FEATURE_CACHE_VERSION], dtype=np.int32),
            source_data=np.asarray(str(Path(args.data).resolve())),
            source_sequence_key=np.asarray(str(seq_key)),
            template_name=np.asarray(str(template_cfg["name"])),
            slots_path=np.asarray(str(Path(args.slots).resolve())),
            frame_ids=np.asarray(frame_ids, dtype=np.int32),
            smpl_scale=np.asarray([float(smpl_scale)], dtype=np.float32),
            ground_z=np.asarray([float(ground_z)], dtype=np.float32),
            source_slots=source_slots.astype(np.float32),
            source_slot_normals=source_slot_normals.astype(np.float32),
            source_face_rotations=source_face_rotations.astype(np.float32),
            joints_scaled=joints_scaled.astype(np.float32),
            source_slot_part_ids=np.asarray(source_slot_part_ids, dtype=np.int32),
            selected_slot_ids=np.asarray(selected_slot_ids, dtype=np.int32),
            ground=ground.astype(np.float32),
            raw_ground=raw_ground.astype(np.float32),
            ground_weights=ground_weights.astype(np.float32),
            self_contact_pair_ids=pair_ids.astype(np.int32),
            self_contact_distances=pair_distances.astype(np.float32),
            self_contact_weights=pair_weights.astype(np.float32),
            self_contact_counts=pair_counts.astype(np.int32),
        )
    os.replace(temporary, cache_path)
    print(
        f"[SourceFeatureFeeder] saved {cache_path} frames={len(frame_ids)} "
        f"slots={source_slots.shape[1]} ground_z={ground_z:.6f}",
        flush=True,
    )


def load_source_feature_cache(cache_path, *, args, seq_key, frame_ids, template_cfg, smpl_scale, source_slot_part_ids, selected_slot_ids):
    path = Path(cache_path)
    if not path.exists():
        raise FileNotFoundError(f"Source feature cache not found: {path}")
    with np.load(path, allow_pickle=False) as payload:
        cache = {key: np.asarray(payload[key]) for key in payload.files}
    if int(cache["version"].reshape(-1)[0]) != SOURCE_FEATURE_CACHE_VERSION:
        raise ValueError(f"Unsupported source feature cache version in {path}")
    checks = (
        (str(cache["source_data"].reshape(-1)[0]) == str(Path(args.data).resolve()), "source_data"),
        (str(cache["source_sequence_key"].reshape(-1)[0]) == str(seq_key), "sequence"),
        (str(cache["template_name"].reshape(-1)[0]) == str(template_cfg["name"]), "template"),
        (str(cache["slots_path"].reshape(-1)[0]) == str(Path(args.slots).resolve()), "slots"),
        (np.array_equal(cache["frame_ids"], np.asarray(frame_ids, dtype=np.int32)), "frame_ids"),
        (np.isclose(float(cache["smpl_scale"].reshape(-1)[0]), float(smpl_scale), rtol=1e-5), "smpl_scale"),
        (np.array_equal(cache["source_slot_part_ids"], np.asarray(source_slot_part_ids, dtype=np.int32)), "slot_parts"),
        (np.array_equal(cache["selected_slot_ids"], np.asarray(selected_slot_ids, dtype=np.int32)), "selected_slots"),
    )
    failed = [label for ok, label in checks if not ok]
    if failed:
        raise ValueError(f"Incompatible source feature cache {path}: {failed}")
    print(f"[HumanoidRetarget] loaded source feature cache={path} frames={len(frame_ids)}")
    return cache


def main(argv=None):
    args = parse_args(argv)
    if not Path(args.data).exists():
        available = sorted(
            str(path.relative_to(ROOT))
            for pattern in ("*.pkl", "*.npz", "*/*.npz")
            for path in (ROOT / "sample_data").glob(pattern)
        )
        suffix = f" Available sample_data motion files: {available}" if available else ""
        raise FileNotFoundError(f"Motion data not found: {args.data}.{suffix}")
    data, source_format = common.load_motion_collection(args.data)
    seq_key, sequence = common.select_sequence(data, args.seq_key, args.seq_index)
    total_frames = common.sequence_frame_count(sequence)
    frame_ids = common.slice_frames(total_frames, args.start, args.end, args.stride, args.max_frames)
    fps = float(sequence.get("fps", 30)) / max(1, int(args.stride))
    source_format = str(sequence.get("source_format", source_format))
    print(
        f"[HumanoidRetarget] source={args.data} format={source_format} "
        f"seq={seq_key} frames={len(frame_ids)} fps={fps:.3f}"
    )

    gender = str(sequence.get("gender", "neutral")).lower()
    template_cfg = smpl_template_config(args.config_data, sequence, seq_key, gender)
    soma_usd_path = resolve_path(template_cfg.get("soma_usd_path"), args.config_data, "sample_data/soma/soma_base_skel_minimal.usd")
    template_vertices, template_joints, faces, source_joint_names, source_model_type = common.source_template_vertices_joints_faces(
        sequence,
        template_cfg,
        args.smplx_model_dir,
        soma_usd_path=soma_usd_path,
    )
    human_height = (
        float(args.human_height)
        if float(args.human_height) > 0.0
        else float(template_vertices[:, 1].max() - template_vertices[:, 1].min())
    )

    smpl_slot_name = args.smpl_name
    if smpl_slot_name == "auto":
        smpl_slot_name = str(template_cfg["name"])
    smpl_slots, center_mode, smpl_slot_name = common.load_slot_data(args.slots, smpl_slot_name, args.slots_field)
    robot_slots, _robot_center, robot_slot_name = common.load_slot_data(args.slots, args.robot_name, args.slots_field)
    robot_height = resolve_robot_height(args, robot_slots, robot_slot_name)
    smpl_scale = float(robot_height) / max(human_height, 1e-8)
    stream_chunk_frames = max(0, int(args.stream_chunk_frames or 0))
    chunk_size = stream_chunk_frames if stream_chunk_frames > 0 else len(frame_ids)
    template_vertices_centered, template_joints_centered, template_center = common.center_source_template(
        template_vertices,
        template_joints,
        center_mode,
        joint_names=source_joint_names,
        source_type=source_model_type,
    )
    print(
        f"[HumanoidRetarget] source slots={smpl_slot_name} center_mode={center_mode} "
        f"template_center={template_center.tolist()}"
    )
    if len(smpl_slots) != len(robot_slots):
        raise ValueError(f"SMPL slots={len(smpl_slots)} and robot slots={len(robot_slots)} differ.")
    _tpose_source_slots, _tpose_source_slot_normals, source_slot_part_ids, source_tpose_slot_normals, source_binding = bind_source_slots_with_normals(
        smpl_slots,
        template_vertices_centered,
        faces,
        template_vertices_centered[None, :, :],
        common.bind_points_to_mesh,
        common.dynamic_surface_template_to_world,
        nearest_vertex_k=args.bind_nearest_vertex_k,
        log_prefix="HumanoidRetarget",
        source_model_type=source_model_type,
        source_joint_names=source_joint_names,
        source_template_joints=template_joints_centered,
    )

    segment_groups = body_segment_slot_groups(source_slot_part_ids)
    print(
        f"[HumanoidRetarget] {source_model_type.upper()} {body_segment_schema()} body segment slots: "
        + ", ".join(f"{name}={len(ids)}" for name, ids in segment_groups.items())
    )
    segment_sample_cfg = segment_sample_counts()
    selected_slot_ids, selected_segment_groups = sample_segment_slots(
        segment_groups,
        segment_sample_cfg,
        args.seed,
        log_prefix="HumanoidRetarget",
    )
    if bool(args.ground_penetration_hard_constraint):
        ground_candidate_slots = len(robot_slots) if str(args.ground_penetration_hard_constraint_mode) == "surface_slots_all" else len(selected_slot_ids)
        print(
            f"[HumanoidRetarget][GroundPenetration] hard_constraint=true "
            f"mode={str(args.ground_penetration_hard_constraint_mode)} "
            f"margin={float(args.ground_penetration_margin):.4f} "
            f"slack={bool(args.ground_penetration_hard_slack)} "
            f"slack_cost={float(args.ground_penetration_hard_slack_cost):.4f} "
            f"threshold={float(args.ground_penetration_threshold):.4f} "
            f"max_points={int(args.ground_penetration_max_points)} "
            f"candidate_slots={ground_candidate_slots}"
        )
    if bool(args.robot_self_penetration_hard_constraint):
        print(
            f"[HumanoidRetarget][RobotSelfPenetration] hard_constraint=true "
            f"margin={float(args.robot_self_penetration_margin):.4f} "
            f"slack={bool(args.robot_self_penetration_hard_slack)} "
            f"slack_cost={float(args.robot_self_penetration_hard_slack_cost):.4f} "
            f"collision_threshold={float(args.collision_threshold):.4f}"
        )
    point_segment_costs = segment_cost_values("point_cost")
    normal_segment_costs = segment_cost_values("normal_cost")
    point_slot_costs = surface_slot_costs_from_segments(
        len(smpl_slots),
        source_slot_part_ids,
        "point_cost",
        "SurfacePoint",
        log_prefix="HumanoidRetarget",
    )
    normal_slot_costs = surface_slot_costs_from_segments(
        len(smpl_slots),
        source_slot_part_ids,
        "normal_cost",
        "SurfaceNormal",
        log_prefix="HumanoidRetarget",
    )

    source_feature_cache = None
    if args.source_feature_cache is not None:
        if bool(args.prepare_source_cache_only):
            save_source_feature_cache(
                args.source_feature_cache,
                args=args,
                sequence=sequence,
                seq_key=seq_key,
                frame_ids=frame_ids,
                template_cfg=template_cfg,
                faces=faces,
                source_joint_names=source_joint_names,
                source_model_type=source_model_type,
                soma_usd_path=soma_usd_path,
                smpl_scale=smpl_scale,
                template_vertices_centered=template_vertices_centered,
                source_binding=source_binding,
                source_slot_part_ids=source_slot_part_ids,
                selected_slot_ids=selected_slot_ids,
            )
            return
        source_feature_cache = load_source_feature_cache(
            args.source_feature_cache,
            args=args,
            seq_key=seq_key,
            frame_ids=frame_ids,
            template_cfg=template_cfg,
            smpl_scale=smpl_scale,
            source_slot_part_ids=source_slot_part_ids,
            selected_slot_ids=selected_slot_ids,
        )
        ground_z = float(source_feature_cache["ground_z"].reshape(-1)[0])
    else:
        if bool(args.prepare_source_cache_only):
            raise ValueError("--prepare-source-cache-only requires --source-feature-cache")
        ground_z = estimate_ground_z_stream(
            sequence,
            frame_ids,
            args,
            source_joint_names=source_joint_names,
            soma_usd_path=soma_usd_path,
            source_model_type=source_model_type,
        )
    print(
        f"[HumanoidRetarget] human_height={human_height:.5f} robot_height={float(args.robot_height):.5f} "
        f"smpl_scale={smpl_scale:.6f} ground_z={ground_z:.5f} "
        f"source_ground_align={args.source_ground_align} "
        f"stream_chunk_frames={stream_chunk_frames} "
        f"source_template={template_cfg['name']}"
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    source_robot_xml = Path(args.robot_xml)
    robot_xml = prepare_robot_xml(args)
    model = mujoco.MjModel.from_xml_path(str(robot_xml))
    data_mj = mujoco.MjData(model)
    robot_self_penetration_cache = common.build_robot_self_penetration_cache(model, args)
    ground_penetration_collision_cache = common.build_ground_penetration_collision_cache(model, args)
    configured_limits = config_joint_limits(args.config_data)
    joint_limits_by_qpos, configured_limit_matches = common.build_scalar_joint_limits(model, configured_limits)
    print(
        f"[HumanoidRetarget][JointLimit] configured={len(configured_limits)} "
        f"matched_same_name={len(configured_limit_matches)} scalar_joints={len(joint_limits_by_qpos)}"
    )
    configured_dof_max_dq_box = config_dof_max_dq_box(args.config_data)
    dof_max_dq_box_by_dof, configured_dof_max_dq_matches = common.build_dof_max_dq_box(
        model,
        configured_dof_max_dq_box,
    )
    args.dof_max_dq_box_by_dof = dof_max_dq_box_by_dof
    print(
        f"[HumanoidRetarget][StepLimit] dof_max_dq_box configured={len(configured_dof_max_dq_box)} "
        f"matched_same_name={len(configured_dof_max_dq_matches)}"
    )
    robot_template = bind_robot_slots(
        model,
        args,
        robot_slots,
        nearest_vertex_k=args.bind_nearest_vertex_k,
        project_to_surface=bool(args.project_robot_slots),
        source_model_type=source_model_type,
        template_cfg=template_cfg,
    )
    robot = robot_config(args.config_data)
    robot_sample_pose = robot_sample_pose_for_source(args.config_data, source_model_type, template_cfg)
    robot_sample_qpos = robot_sample_qpos_for_pose(args.config_data, robot_sample_pose)

    def apply_config_sample_pose(_model, _data):
        if robot_sample_pose in {"default", "none", "raw", "off"}:
            return
        apply_joint_qpos(_model, _data, robot_sample_qpos, required=False)
        apply_mimic_qpos(_model, _data, robot.get("mimic_qpos", {}) or {})

    surface_normal_cost_mode = str(args.surface_normal_cost_mode)
    tpose_surface_normal_offsets = np.zeros((0, 3), dtype=np.float32)
    robot_tpose_normals_smpl = np.zeros((0, 3), dtype=np.float32)
    surface_normal_targets = None
    if surface_normal_cost_mode == "tpose_offset":
        tpose_surface_normal_offsets, robot_tpose_normals_smpl = compute_tpose_surface_normal_offsets(
            model,
            robot_template,
            source_tpose_slot_normals,
            apply_config_sample_pose,
            robot["point_cloud_center"],
            log_prefix="HumanoidRetarget",
        )
        surface_normal_target_mode = f"{robot_sample_pose}_robot_normal_transported_by_smpl_face"
    elif surface_normal_cost_mode == "direct":
        print("[HumanoidRetarget][SurfaceNormal] mode=direct: matching robot normals to current SMPLX slot normals.")
        surface_normal_target_mode = "direct_smplx_slot_normal"
    else:
        raise ValueError(f"Unknown --surface-normal-cost-mode {surface_normal_cost_mode!r}")
    joint_qpos_addrs, joint_dof_addrs, _joint_ranges, joint_names = common.scalar_qpos_joint_addrs(model)
    print(f"[HumanoidRetarget] scalar_joints={len(joint_names)} robot_xml={robot_xml}")

    mujoco.mj_resetData(model, data_mj)
    q_body_zero = data_mj.qpos.copy()
    q_body_zero[joint_qpos_addrs] = 0.0
    q_body_zero = common.clamp_joint_ranges(model, q_body_zero, joint_limits_by_qpos=joint_limits_by_qpos)
    trajectory_warm_start_mode = str(args.trajectory_warm_start_mode).strip().lower()
    if trajectory_warm_start_mode not in {"sequential", "bidirectional"}:
        raise ValueError(
            f"Unsupported trajectory_warm_start_mode={args.trajectory_warm_start_mode!r}; "
            "expected 'sequential' or 'bidirectional'."
        )

    ground_active_counts_all = []
    ground_anchor_counts_all = []

    use_batch_progress = batch_progress_enabled()
    progress_total = len(frame_ids) * (2 if trajectory_warm_start_mode == "bidirectional" else 1)
    progress_done = 0
    emit_batch_progress(0, progress_total)

    def initial_qpos_for_frame(joints_frame):
        q_init = q_body_zero.copy()
        q_init[:3] = common.source_root_joint_position(joints_frame, source_joint_names)
        q_init[3:7] = common.source_qpos_body_heading(joints_frame, source_joint_names)
        return q_init

    def iter_stream_chunks(reverse: bool):
        step = max(1, int(chunk_size))
        if not reverse:
            for chunk_start in range(0, len(frame_ids), step):
                chunk_end = min(chunk_start + step, len(frame_ids))
                yield list(range(chunk_start, chunk_end))
        else:
            for chunk_end in range(len(frame_ids), 0, -step):
                chunk_start = max(0, chunk_end - step)
                yield list(range(chunk_end - 1, chunk_start - 1, -1))

    def select_bidirectional_dp(forward_qpos, forward_frame_costs, backward_qpos, backward_frame_costs):
        frame_costs = np.stack(
            [np.asarray(forward_frame_costs, dtype=np.float64), np.asarray(backward_frame_costs, dtype=np.float64)],
            axis=1,
        )
        q_candidates = np.stack(
            [np.asarray(forward_qpos, dtype=np.float64), np.asarray(backward_qpos, dtype=np.float64)],
            axis=1,
        )
        continuity_cost = max(0.0, float(args.trajectory_warm_start_bidirectional_continuity_cost))
        switch_cost = max(0.0, float(args.trajectory_warm_start_bidirectional_switch_cost))
        n_frames = frame_costs.shape[0]
        dp = np.full((n_frames, 2), np.inf, dtype=np.float64)
        parent = np.zeros((n_frames, 2), dtype=np.int8)
        dp[0] = frame_costs[0]
        joint_addrs = np.asarray(joint_qpos_addrs, dtype=np.int32)
        for frame_idx in range(1, n_frames):
            for state in range(2):
                transition_scores = np.empty(2, dtype=np.float64)
                for prev_state in range(2):
                    dq = q_candidates[frame_idx, state, joint_addrs] - q_candidates[frame_idx - 1, prev_state, joint_addrs]
                    transition = continuity_cost * float(np.dot(dq, dq))
                    if state != prev_state:
                        transition += switch_cost
                    transition_scores[prev_state] = dp[frame_idx - 1, prev_state] + transition
                best_prev = int(np.argmin(transition_scores))
                parent[frame_idx, state] = best_prev
                dp[frame_idx, state] = frame_costs[frame_idx, state] + transition_scores[best_prev]
        states = np.zeros(n_frames, dtype=np.int8)
        states[-1] = int(np.argmin(dp[-1]))
        for frame_idx in range(n_frames - 1, 0, -1):
            states[frame_idx - 1] = parent[frame_idx, states[frame_idx]]
        return states.astype(bool), dp

    def solve_stream_sequence(reverse: bool, desc: str, collect_debug: bool, progress):
        nonlocal progress_done
        q_seq = np.empty((len(frame_ids), model.nq), dtype=np.float32)
        seq_costs = np.empty(len(frame_ids), dtype=np.float32)
        q_prev2 = None
        q_prev = None
        ground_contact_anchor_state = {}
        for chunk_indices in iter_stream_chunks(reverse):
            cache_indices = np.asarray(chunk_indices, dtype=np.int32)
            if source_feature_cache is not None:
                source_slots = source_feature_cache["source_slots"][cache_indices]
                source_slot_normals = source_feature_cache["source_slot_normals"][cache_indices]
                joints_scaled = source_feature_cache["joints_scaled"][cache_indices]
                if source_feature_cache["ground"].size > 0:
                    source_ground_contact_distances = source_feature_cache["ground"][cache_indices]
                    raw_source_ground_contact_distances = source_feature_cache["raw_ground"][cache_indices]
                    source_ground_contact_weight_distances = source_feature_cache["ground_weights"][cache_indices]
                else:
                    source_ground_contact_distances = None
                    raw_source_ground_contact_distances = None
                    source_ground_contact_weight_distances = None
                source_self_contact_maps = (
                    source_cache_self_contact_maps(source_feature_cache, cache_indices)
                    if float(args.self_contact_map_cost) > 0.0
                    else None
                )
                if surface_normal_cost_mode == "tpose_offset":
                    rotations = source_feature_cache["source_face_rotations"][cache_indices]
                    selected_normal_targets = normalize_vectors(
                        np.einsum(
                            "fsij,sj->fsi",
                            rotations,
                            normalize_vectors(robot_tpose_normals_smpl[selected_slot_ids]),
                        )
                    ).astype(np.float32)
                    surface_normal_targets = source_slot_normals.copy()
                    surface_normal_targets[:, selected_slot_ids] = selected_normal_targets
                else:
                    surface_normal_targets = None
            else:
                chunk_ids = frame_ids[cache_indices]
                vertices_world, joints_world, _faces = common.source_motion_vertices_joints(
                    sequence,
                    chunk_ids,
                    args.smplx_model_dir,
                    batch_size=min(int(args.batch_size), len(chunk_ids)),
                    soma_usd_path=soma_usd_path,
                    zero_source_finger_pose=bool(args.zero_source_finger_pose),
                    smplx_device=args.smplx_device,
                    smplx_batch_size=args.smplx_batch_size,
                    smplx_batch_size_max=args.smplx_batch_size_max,
                    smplx_batch_size_safety_factor=args.smplx_batch_size_safety_factor,
                )
                source_up = sequence.get("output_up", "z")
                vertices_world = common.source_points_to_retarget_frame(vertices_world, source_model_type, source_up)
                joints_world = common.source_points_to_retarget_frame(joints_world, source_model_type, source_up)
                vertices_world[:, :, 2] -= ground_z
                joints_world[:, :, 2] -= ground_z
                vertices_scaled = vertices_world * smpl_scale
                joints_scaled = joints_world * smpl_scale
                source_slots, source_slot_normals = source_slots_and_normals_for_vertices(
                    vertices_scaled,
                    faces,
                    source_binding,
                )

                source_ground_contact_distances = None
                raw_source_ground_contact_distances = None
                source_ground_contact_weight_distances = None
                if float(args.ground_contact_map_cost) > 0.0 or float(args.ground_contact_anchor_cost) > 0.0:
                    (
                        source_ground_contact_distances,
                        raw_source_ground_contact_distances,
                        source_ground_contact_weight_distances,
                    ) = common.compute_source_slot_ground_contact(
                        source_slots,
                        snap_threshold=float(args.ground_contact_map_snap_threshold),
                    )

                source_self_contact_maps = None
                if float(args.self_contact_map_cost) > 0.0:
                    self_contact_map_modes = parse_self_contact_map_modes(args.self_contact_map_mode)
                    self_contact_map_body_topk = parse_body_topk_config(args.self_contact_map_body_topk)
                    source_self_contact_maps_by_mode = compute_source_self_contact_map_groups(
                        source_slots,
                        selected_slot_ids,
                        source_slot_part_ids,
                        modes=self_contact_map_modes,
                        threshold=float(args.self_contact_map_threshold),
                        max_pairs=int(args.self_contact_map_max_pairs),
                        body_topk=self_contact_map_body_topk,
                        log_prefix="HumanoidRetarget",
                    )
                    source_self_contact_map_groups = [
                        source_self_contact_maps_by_mode[mode] for mode in self_contact_map_modes
                    ]
                    source_self_contact_maps = merge_self_contact_maps(source_self_contact_map_groups)
                    merged_counts = np.asarray([len(item["distances"]) for item in source_self_contact_maps], dtype=np.int32)
                    print(
                        f"[HumanoidRetarget][SelfContactMap] merged modes={self_contact_map_modes} "
                        f"pairs min={int(merged_counts.min(initial=0))}, mean={float(merged_counts.mean()):.2f}, "
                        f"max={int(merged_counts.max(initial=0))}"
                    )

                if surface_normal_cost_mode == "tpose_offset":
                    surface_normal_targets = transport_tpose_robot_normals(
                        robot_tpose_normals_smpl,
                        source_binding,
                        template_vertices_centered,
                        faces,
                        vertices_scaled,
                    )
                else:
                    surface_normal_targets = None

            if collect_debug and source_ground_contact_distances is not None:
                ground_active_counts_all.extend(
                    (
                        source_ground_contact_distances[:, selected_slot_ids] <= float(args.ground_contact_map_threshold)
                    ).sum(axis=1).astype(np.int32).tolist()
                )
                ground_anchor_counts_all.extend(
                    np.isclose(
                        source_ground_contact_distances[:, selected_slot_ids],
                        0.0,
                        atol=1e-8,
                    ).sum(axis=1).astype(np.int32).tolist()
                )

            for local_idx, out_idx in enumerate(chunk_indices):
                if q_prev is None:
                    q_init = initial_qpos_for_frame(joints_scaled[local_idx])
                else:
                    q_init = q_prev.copy()
                q_opt, cost = solve_frame_body_segment_qp(
                    model,
                    data_mj,
                    q_init,
                    q_prev,
                    q_prev2,
                    source_slots[local_idx],
                    source_slot_normals[local_idx],
                    None if surface_normal_targets is None else surface_normal_targets[local_idx],
                    selected_slot_ids,
                    source_slot_part_ids,
                    point_slot_costs,
                    normal_slot_costs,
                    None if source_self_contact_maps is None else source_self_contact_maps[local_idx],
                    None if source_ground_contact_distances is None else source_ground_contact_distances[local_idx],
                    None if source_ground_contact_weight_distances is None else source_ground_contact_weight_distances[local_idx],
                    robot_template,
                    joint_qpos_addrs,
                    joint_dof_addrs,
                    args,
                    iters=int(args.pose_init_iters) if q_prev is None and int(args.pose_init_iters) > 0 else int(args.iters),
                    joint_limits_by_qpos=joint_limits_by_qpos,
                    robot_self_penetration_cache=robot_self_penetration_cache,
                    ground_penetration_collision_cache=ground_penetration_collision_cache,
                    ground_contact_anchor_state=ground_contact_anchor_state,
                )
                q_seq[out_idx] = q_opt.astype(np.float32)
                seq_costs[out_idx] = float(cost)
                q_prev2 = q_prev
                q_prev = q_opt
                progress_done += 1
                progress.update(1)
                emit_batch_progress(progress_done, progress_total)
        return q_seq, seq_costs

    with tqdm(total=progress_total, desc="[HumanoidRetarget] retarget", disable=use_batch_progress) as progress:
        forward_qpos_seq, forward_costs = solve_stream_sequence(
            reverse=False,
            desc="[HumanoidRetarget] retarget forward",
            collect_debug=True,
            progress=progress,
        )
        backward_qpos_seq = np.zeros((0, 0), dtype=np.float32)
        backward_costs = np.zeros(0, dtype=np.float32)
        bidirectional_pick_backward_mask = np.zeros(len(frame_ids), dtype=bool)
        bidirectional_dp_scores = np.zeros((0, 0), dtype=np.float32)
        bidirectional_picked_backward_count = 0
        bidirectional_switch_count = 0
        if trajectory_warm_start_mode == "bidirectional":
            backward_qpos_seq, backward_costs = solve_stream_sequence(
                reverse=True,
                desc="[HumanoidRetarget] retarget backward",
                collect_debug=False,
                progress=progress,
            )
            bidirectional_pick_backward_mask, bidirectional_dp_scores = select_bidirectional_dp(
                forward_qpos_seq,
                forward_costs,
                backward_qpos_seq,
                backward_costs,
            )
            qpos_seq = forward_qpos_seq.copy()
            costs = forward_costs.copy()
            qpos_seq[bidirectional_pick_backward_mask] = backward_qpos_seq[bidirectional_pick_backward_mask]
            costs[bidirectional_pick_backward_mask] = backward_costs[bidirectional_pick_backward_mask]
            switch_count = int(np.count_nonzero(bidirectional_pick_backward_mask[1:] != bidirectional_pick_backward_mask[:-1]))
            bidirectional_picked_backward_count = int(bidirectional_pick_backward_mask.sum())
            bidirectional_switch_count = switch_count
            print(
                "[HumanoidRetarget][WarmStart] mode=bidirectional selection=dp "
                f"picked_backward={int(bidirectional_pick_backward_mask.sum())}/{len(frame_ids)} "
                f"switches={switch_count} "
                f"forward_mean={float(forward_costs.mean()):.6f} "
                f"backward_mean={float(backward_costs.mean()):.6f} "
                f"combined_mean={float(costs.mean()):.6f}"
            )
        else:
            qpos_seq = forward_qpos_seq
            costs = forward_costs

    unfiltered_qpos_seq = np.zeros((0, 0), dtype=np.float32)
    if str(args.trajectory_filter_mode).lower() == "lqr":
        unfiltered_qpos_seq = qpos_seq.copy()
        raw_summary = common.qpos_temporal_summary(unfiltered_qpos_seq, joint_qpos_addrs)
        qpos_seq = common.lqr_smooth_qpos_sequence(
            model,
            unfiltered_qpos_seq,
            joint_qpos_addrs,
            joint_limits_by_qpos=joint_limits_by_qpos,
            data_cost=float(args.trajectory_filter_data_cost),
            velocity_cost=float(args.trajectory_filter_velocity_cost),
            acceleration_cost=float(args.trajectory_filter_acceleration_cost),
            jerk_cost=float(args.trajectory_filter_jerk_cost),
            include_root_translation=bool(args.trajectory_filter_root_translation),
            anchor_start_frames=int(args.trajectory_filter_anchor_start_frames),
            anchor_end_frames=int(args.trajectory_filter_anchor_end_frames),
        ).astype(np.float32)
        filtered_summary = common.qpos_temporal_summary(qpos_seq, joint_qpos_addrs)
        print(
            "[HumanoidRetarget][TrajectoryFilter] mode=lqr "
            f"data={float(args.trajectory_filter_data_cost):.4g} "
            f"vel={float(args.trajectory_filter_velocity_cost):.4g} "
            f"acc={float(args.trajectory_filter_acceleration_cost):.4g} "
            f"jerk={float(args.trajectory_filter_jerk_cost):.4g} "
            f"root_translation={bool(args.trajectory_filter_root_translation)} "
            f"anchor_start={int(args.trajectory_filter_anchor_start_frames)} "
            f"anchor_end={int(args.trajectory_filter_anchor_end_frames)} "
            f"step_p95 {raw_summary['step_p95']:.6g}->{filtered_summary['step_p95']:.6g} "
            f"accel_p95 {raw_summary['accel_p95']:.6g}->{filtered_summary['accel_p95']:.6g} "
            f"jerk_p95 {raw_summary['jerk_p95']:.6g}->{filtered_summary['jerk_p95']:.6g}"
        )

    if ground_active_counts_all:
        ground_active_counts = np.asarray(ground_active_counts_all, dtype=np.int32)
        print(
            f"[HumanoidRetarget][GroundContactMap] active slots under threshold="
            f"{float(args.ground_contact_map_threshold):.4f}: "
            f"min={int(ground_active_counts.min())}, mean={float(ground_active_counts.mean()):.2f}, "
            f"max={int(ground_active_counts.max())}, active_frames="
            f"{int((ground_active_counts > 0).sum())}/{len(ground_active_counts)}, "
            f"selected_slots={len(selected_slot_ids)}, max_points={int(args.ground_contact_map_max_points)}"
        )
    if ground_anchor_counts_all:
        ground_anchor_counts = np.asarray(ground_anchor_counts_all, dtype=np.int32)
        print(
            f"[HumanoidRetarget][GroundContactAnchor] snapped-to-zero selected slots: "
            f"min={int(ground_anchor_counts.min())}, mean={float(ground_anchor_counts.mean()):.2f}, "
            f"max={int(ground_anchor_counts.max())}, active_frames="
            f"{int((ground_anchor_counts > 0).sum())}/{len(ground_anchor_counts)}, "
            f"cost={float(args.ground_contact_anchor_cost):.4f}"
        )

    output_payload = {
        "qpos": qpos_seq,
        "fps": np.asarray([fps], dtype=np.float32),
        "frame_ids": frame_ids.astype(np.int32),
        "robot_xml": np.asarray(str(robot_xml)),
        "robot_name": np.asarray(str(args.robot_name)),
        "robot_joint_names": np.asarray(joint_names, dtype=object),
        "source_data": np.asarray(str(args.data)),
        "source_sequence_key": np.asarray(seq_key),
        "source_format": np.asarray(source_format),
        "smpl_scale": np.asarray([smpl_scale], dtype=np.float32),
        "ground_z": np.asarray([ground_z], dtype=np.float32),
        "zero_source_finger_pose": np.asarray([bool(args.zero_source_finger_pose)]),
    }
    np.savez_compressed(args.out, **output_payload)
    print(
        f"[HumanoidRetarget] saved {args.out} qpos={qpos_seq.shape} "
        f"cost mean={float(costs.mean()):.6f} max={float(costs.max()):.6f}"
    )


if __name__ == "__main__":
    main()

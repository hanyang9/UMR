#!/usr/bin/env python3
"""Config-driven surface-vector retargeter for MuJoCo humanoid robots."""
from __future__ import annotations

import argparse
import csv
import hashlib
import importlib
import json
import os
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import mujoco
import numpy as np
import trimesh
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation as R

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
from surface_sampling import sample_first_hit_surface_points  # noqa: E402
from retarget_composite_racket import (  # noqa: E402
    bind_composite_racket_source,
    build_composite_racket_contact_source,
    transport_composite_racket_normals,
)


BODY_SEGMENT_MODULE_DEFAULT = "retarget_body_segment_surface"
BODY_SEGMENT_MODULES = {
    BODY_SEGMENT_MODULE_DEFAULT,
    "retarget_body_segment_surface_hoi_hsi",
    "retarget_body_segment_surface_racket",
    "retarget_body_segment_surface_adapt",
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


def emit_web_progress(done: int, total: int) -> None:
    if os.environ.get("HUMANOID_BATCH_PROGRESS", "").strip() == "1":
        print(f"{PROGRESS_PREFIX} {int(done)} {int(total)}", flush=True)


SMPL_TO_ROBOT_ROOT_MATRIX = np.asarray(
    [
        [0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
    ],
    dtype=np.float32,
)


def none_default(parser, *names, default=None, **kwargs):
    parser.add_argument(*names, default=default, **kwargs)


def parse_args():
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
    parser.add_argument("--object-contact-map-cost", type=float, default=None)
    parser.add_argument("--object-contact-map-threshold", type=float, default=None)
    parser.add_argument("--object-contact-map-snap-threshold", type=float, default=None)
    parser.add_argument("--object-contact-map-max-points", type=int, default=None)
    parser.add_argument("--object-contact-map-samples", type=int, default=None)
    parser.add_argument("--retarget-object-size", choices=("scaled", "original"), default=None)
    parser.add_argument("--robot-object-penetration-soft-cost", type=float, default=None)
    parser.add_argument(
        "--robot-object-hard-constraint",
        "--robot-object-penetration-hard-constraint",
        dest="robot_object_hard_constraint",
        action="store_true",
        default=None,
    )
    parser.add_argument(
        "--no-robot-object-hard-constraint",
        "--no-robot-object-penetration-hard-constraint",
        dest="robot_object_hard_constraint",
        action="store_false",
    )
    parser.add_argument("--robot-object-margin", type=float, default=None)
    parser.add_argument("--robot-object-hard-slack", action="store_true", default=None)
    parser.add_argument("--no-robot-object-hard-slack", dest="robot_object_hard_slack", action="store_false")
    parser.add_argument("--robot-object-hard-slack-cost", type=float, default=None)
    parser.add_argument("--robot-object-threshold", type=float, default=None)
    parser.add_argument("--robot-object-max-pairs", type=int, default=None)
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
    return fill_args_from_config(parser.parse_args())


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
    set_default(args, "object_contact_map_cost", solver.get("object_contact_map_cost", 0.0))
    set_default(args, "object_contact_map_threshold", solver.get("object_contact_map_threshold", 0.10))
    set_default(args, "object_contact_map_snap_threshold", solver.get("object_contact_map_snap_threshold", 0.005))
    set_default(args, "object_contact_map_max_points", solver.get("object_contact_map_max_points", 128))
    set_default(args, "object_contact_map_samples", solver.get("object_contact_map_samples", 1024))
    set_default(args, "retarget_object_size", solver.get("retarget_object_size", "scaled"))
    set_default(args, "robot_object_penetration_soft_cost", solver.get("robot_object_penetration_soft_cost", 0.0))
    set_default(args, "robot_object_hard_constraint", solver.get("robot_object_hard_constraint", False))
    set_default(args, "robot_object_margin", solver.get("robot_object_margin", 0.0))
    set_default(args, "robot_object_hard_slack", solver.get("robot_object_hard_slack", False))
    set_default(args, "robot_object_hard_slack_cost", solver.get("robot_object_hard_slack_cost", 0.0))
    set_default(args, "robot_object_threshold", solver.get("robot_object_threshold", solver.get("collision_threshold", 0.1)))
    set_default(args, "robot_object_max_pairs", solver.get("robot_object_max_pairs", 128))
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
    set_default(args, "trajectory_warm_start_mode", solver.get("trajectory_warm_start_mode", "sequential"))
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


def correspondence_pair_farthest_point_sampling(source_points, robot_points, num_samples, seed):
    source_points = np.asarray(source_points, dtype=np.float64)
    robot_points = np.asarray(robot_points, dtype=np.float64)
    if source_points.shape != robot_points.shape or source_points.ndim != 2 or source_points.shape[1] != 3:
        raise ValueError(
            f"Correspondence FPS expects matching (N, 3) arrays, got {source_points.shape} and {robot_points.shape}"
        )
    if len(source_points) <= int(num_samples):
        return np.arange(len(source_points), dtype=np.int32)

    def normalize_height(points):
        height = float(np.ptp(points[:, 1]))
        return points / max(height, 1e-8)

    pairs = np.concatenate([normalize_height(source_points), normalize_height(robot_points)], axis=1)
    rng = np.random.default_rng(int(seed))
    selected = np.empty(int(num_samples), dtype=np.int32)
    selected[0] = int(rng.integers(len(pairs)))
    delta = pairs - pairs[selected[0]]
    min_dist2 = np.einsum("ij,ij->i", delta, delta)
    for index in range(1, len(selected)):
        selected[index] = int(np.argmax(min_dist2))
        delta = pairs - pairs[selected[index]]
        min_dist2 = np.minimum(min_dist2, np.einsum("ij,ij->i", delta, delta))
    return np.sort(selected)


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

    output_xml = source_xml.parent / (
        Path(args.out).with_suffix(".floating_mjcf.xml").name
    )
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


def y_up_to_z_up_matrix(output_up: str, convert_y_up: bool) -> np.ndarray:
    if convert_y_up and str(output_up).lower() == "y":
        return np.asarray(
            [
                [1.0, 0.0, 0.0],
                [0.0, 0.0, -1.0],
                [0.0, 1.0, 0.0],
            ],
            dtype=np.float64,
        )
    return np.eye(3, dtype=np.float64)


def transform_object_points(points, output_up, convert_y_up, ground_align, floor_y, ground_offset):
    points = np.asarray(points, dtype=np.float32).copy()
    if convert_y_up and str(output_up).lower() == "y":
        points = points[..., [0, 2, 1]]
        points[..., 1] *= -1.0
        if ground_align:
            points[..., 2] -= float(floor_y)
    elif ground_align:
        points[..., 2] -= float(floor_y)
    points[..., 2] += float(ground_offset)
    return points


def make_mjcf_mesh_paths_absolute(root: ET.Element, xml_path: Path) -> None:
    xml_dir = Path(xml_path).resolve().parent
    mesh_base = xml_dir
    compiler = root.find("compiler")
    if compiler is not None and compiler.get("meshdir"):
        meshdir = Path(compiler.get("meshdir"))
        if not meshdir.is_absolute():
            meshdir = (xml_dir / meshdir).resolve()
        mesh_base = meshdir
        compiler.set("meshdir", str(mesh_base))
    for asset in root.findall("asset"):
        for mesh in asset.findall("mesh"):
            mesh_file = mesh.get("file", "")
            if mesh_file and not Path(mesh_file).is_absolute():
                mesh.set("file", str((mesh_base / mesh_file).resolve()))


def scale_mjcf_mesh_assets(root: ET.Element, mesh_scale: float) -> None:
    mesh_scale = float(mesh_scale)
    if abs(mesh_scale - 1.0) < 1e-12:
        return
    for asset in root.findall("asset"):
        for mesh in asset.findall("mesh"):
            existing = np.fromstring(mesh.get("scale", "1 1 1"), sep=" ", dtype=np.float64)
            if existing.size != 3:
                existing = np.ones(3, dtype=np.float64)
            scaled = existing * mesh_scale
            mesh.set("scale", f"{scaled[0]:.12g} {scaled[1]:.12g} {scaled[2]:.12g}")


def sample_surface_points(vertices: np.ndarray, faces: np.ndarray, count: int, seed: int) -> np.ndarray:
    return sample_first_hit_surface_points(vertices, faces, count, seed)


def object_points_from_mjcf(xml_path: Path, sample_count: int, seed: int, mesh_scale: float) -> np.ndarray:
    root = ET.parse(xml_path).getroot()
    make_mjcf_mesh_paths_absolute(root, xml_path)
    scale_mjcf_mesh_assets(root, mesh_scale)
    with tempfile.NamedTemporaryFile("w", suffix=".xml", prefix="hsi_object_", delete=False) as tmp:
        tmp.write(ET.tostring(root, encoding="unicode"))
        tmp_path = Path(tmp.name)
    try:
        model = mujoco.MjModel.from_xml_path(str(tmp_path))
    finally:
        tmp_path.unlink(missing_ok=True)
    data = mujoco.MjData(model)
    mujoco.mj_resetData(model, data)
    mujoco.mj_forward(model, data)

    mesh_geom_ids = [
        geom_id
        for geom_id in range(model.ngeom)
        if int(model.geom_type[geom_id]) == int(mujoco.mjtGeom.mjGEOM_MESH)
    ]
    visual_geom_ids = [
        geom_id
        for geom_id in mesh_geom_ids
        if int(model.geom_group[geom_id]) == 2
        or (int(model.geom_contype[geom_id]) == 0 and int(model.geom_conaffinity[geom_id]) == 0)
    ]
    selected_geom_ids = visual_geom_ids or mesh_geom_ids

    vertices_all = []
    faces_all = []
    offset = 0
    for geom_id in selected_geom_ids:
        mesh_id = int(model.geom_dataid[geom_id])
        if mesh_id < 0:
            continue
        vadr = int(model.mesh_vertadr[mesh_id])
        vnum = int(model.mesh_vertnum[mesh_id])
        fadr = int(model.mesh_faceadr[mesh_id])
        fnum = int(model.mesh_facenum[mesh_id])
        local_v = np.asarray(model.mesh_vert[vadr : vadr + vnum], dtype=np.float64)
        local_f = np.asarray(model.mesh_face[fadr : fadr + fnum], dtype=np.int32)
        rot = data.geom_xmat[geom_id].reshape(3, 3)
        pos = data.geom_xpos[geom_id]
        world_v = local_v @ rot.T + pos
        vertices_all.append(world_v)
        faces_all.append(local_f + offset)
        offset += len(local_v)
    if not vertices_all:
        raise ValueError(f"Object XML has no mesh geoms for contact map: {xml_path}")
    vertices = np.concatenate(vertices_all, axis=0)
    faces = np.concatenate(faces_all, axis=0) if faces_all else np.zeros((0, 3), dtype=np.int32)
    return sample_surface_points(vertices, faces, sample_count, seed)


def object_points_from_obj(
    obj_path: Path,
    output_up: str,
    convert_y_up: bool,
    sample_count: int,
    seed: int,
    object_scale: float,
    mesh_scale: float,
) -> np.ndarray:
    mesh = trimesh.load_mesh(obj_path, process=False)
    vertices = np.asarray(mesh.vertices, dtype=np.float32)
    faces = np.asarray(mesh.faces, dtype=np.int32)
    basis = y_up_to_z_up_matrix(output_up, convert_y_up).astype(np.float32)
    vertices = (vertices @ basis.T) * float(object_scale) * float(mesh_scale)
    return sample_surface_points(vertices, faces, sample_count, seed)


def resolve_object_contact_source_dir(args) -> Path | None:
    hsi = section(args.config_data, "hsi_hoi")
    source_dir = hsi.get("source_sequence_dir")
    if source_dir:
        path = resolve_path(source_dir, args.config_data)
        if path is not None and Path(path).is_dir():
            return Path(path)
    data_path = Path(args.data)
    if data_path.is_dir():
        return data_path
    return None


def resolve_prop_trajectory(object_path: Path) -> Path:
    prop = object_path.parent / f"prop_{object_path.stem}.csv"
    if prop.exists():
        return prop
    matches = sorted(object_path.parent.glob("prop_*.csv"))
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise FileNotFoundError(f"No prop_*.csv found next to {object_path}")
    names = ", ".join(path.name for path in matches[:8])
    raise ValueError(f"Multiple prop_*.csv files found next to {object_path}: {names}")


def read_prop_motion(
    prop_csv: Path,
    frame_ids,
    output_up: str,
    convert_y_up: bool,
    ground_align: bool,
    floor_y: float,
    ground_offset: float,
    smpl_scale: float,
):
    with Path(prop_csv).open("r", newline="", errors="replace") as f:
        rows = list(csv.DictReader(f))
    required = {"px", "py", "pz", "qx", "qy", "qz", "qw"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError(f"Object trajectory CSV missing columns {sorted(required)}: {prop_csv}")
    positions = np.asarray([[float(row["px"]), float(row["py"]), float(row["pz"])] for row in rows], dtype=np.float32)
    quats_xyzw = np.asarray(
        [[float(row["qx"]), float(row["qy"]), float(row["qz"]), float(row["qw"])] for row in rows],
        dtype=np.float64,
    )
    frame_ids = np.asarray(frame_ids, dtype=np.int32)
    clipped = np.clip(frame_ids, 0, len(positions) - 1)
    positions = transform_object_points(
        positions[clipped],
        output_up,
        convert_y_up,
        ground_align,
        floor_y,
        ground_offset,
    )
    positions = positions * float(smpl_scale)
    basis = y_up_to_z_up_matrix(output_up, convert_y_up)
    rot_mats = R.from_quat(quats_xyzw[clipped]).as_matrix()
    rot_mats = basis[None, :, :] @ rot_mats @ basis.T[None, :, :]
    converted_xyzw = R.from_matrix(rot_mats).as_quat()
    quats_wxyz = np.concatenate([converted_xyzw[:, 3:4], converted_xyzw[:, :3]], axis=1).astype(np.float32)
    quats_wxyz /= np.maximum(np.linalg.norm(quats_wxyz, axis=1, keepdims=True), 1e-12)
    return {
        "path": Path(prop_csv),
        "positions": positions.astype(np.float32),
        "rot_mats": rot_mats.astype(np.float32),
        "quats_wxyz": quats_wxyz,
        "num_rows": len(rows),
    }


def load_object_contact_source(args, frame_ids, source_slots, smpl_scale, ground_z):
    needs_object_contact = float(args.object_contact_map_cost) > 0.0
    needs_robot_object = (
        bool(getattr(args, "robot_object_hard_constraint", False))
        or float(getattr(args, "robot_object_penetration_soft_cost", 0.0)) > 0.0
    )
    if not needs_object_contact and not needs_robot_object:
        return None
    source_dir = resolve_object_contact_source_dir(args)
    if source_dir is None:
        print("[HumanoidRetarget][ObjectSource][WARN] no source object directory; disabling object contact/robot-object constraints.")
        args.object_contact_map_cost = 0.0
        args.robot_object_hard_constraint = False
        args.robot_object_penetration_soft_cost = 0.0
        return None
    stems = sorted({path.stem for path in source_dir.glob("*.xml")} | {path.stem for path in source_dir.glob("*.obj")})
    candidates = []
    for stem in stems:
        source = source_dir / f"{stem}.xml" if (source_dir / f"{stem}.xml").exists() else source_dir / f"{stem}.obj"
        try:
            prop = resolve_prop_trajectory(source)
        except FileNotFoundError:
            continue
        candidates.append((stem, source, prop))
    if not candidates:
        print(f"[HumanoidRetarget][ObjectSource][WARN] no object XML/OBJ with prop_*.csv found in {source_dir}; disabling.")
        args.object_contact_map_cost = 0.0
        args.robot_object_hard_constraint = False
        args.robot_object_penetration_soft_cost = 0.0
        return None
    if len(candidates) > 1:
        print(f"[HumanoidRetarget][ObjectContactMap][WARN] multiple objects found; using first: {candidates[0][0]}")
    object_name, object_path, prop_path = candidates[0]

    hsi = section(args.config_data, "hsi_hoi")
    object_cfg = section(hsi, "object")
    output_up = str(object_cfg.get("output_up", hsi.get("output_up", "z")))
    convert_y_up = bool_config(object_cfg.get("convert_y_up"), True)
    ground_align = bool_config(object_cfg.get("ground_align"), False)
    floor_y = float(object_cfg.get("floor_y", 0.0))
    ground_offset = float(object_cfg.get("ground_offset", 0.0))
    object_scale = float(object_cfg.get("object_scale", 0.01))

    source_mesh_scale = float(smpl_scale)
    retarget_object_size = str(args.retarget_object_size).lower()
    if retarget_object_size not in {"scaled", "original"}:
        raise ValueError(f"retarget_object_size must be 'scaled' or 'original', got {args.retarget_object_size!r}")
    retarget_mesh_scale = 1.0 if retarget_object_size == "original" else float(smpl_scale)
    sample_count = int(args.object_contact_map_samples)
    seed = int(args.seed)
    if object_path.suffix.lower() == ".xml":
        source_points_local = object_points_from_mjcf(object_path, sample_count, seed, source_mesh_scale)
        retarget_points_local = (
            source_points_local
            if abs(retarget_mesh_scale - source_mesh_scale) < 1e-12
            else object_points_from_mjcf(object_path, sample_count, seed, retarget_mesh_scale)
        )
    else:
        source_points_local = object_points_from_obj(
            object_path,
            output_up,
            convert_y_up,
            sample_count,
            seed,
            object_scale,
            source_mesh_scale,
        )
        retarget_points_local = (
            source_points_local
            if abs(retarget_mesh_scale - source_mesh_scale) < 1e-12
            else object_points_from_obj(object_path, output_up, convert_y_up, sample_count, seed, object_scale, retarget_mesh_scale)
        )

    object_motion = read_prop_motion(
        prop_path,
        frame_ids,
        output_up,
        convert_y_up,
        ground_align,
        floor_y,
        ground_offset,
        smpl_scale,
    )
    source_points_world = np.empty((len(frame_ids), len(source_points_local), 3), dtype=np.float32)
    retarget_points_world = np.empty((len(frame_ids), len(retarget_points_local), 3), dtype=np.float32)
    distances = np.empty((len(frame_ids), source_slots.shape[1]), dtype=np.float32)
    object_ids = np.empty((len(frame_ids), source_slots.shape[1]), dtype=np.int32)
    pair_vectors = np.empty((len(frame_ids), source_slots.shape[1], 3), dtype=np.float32)
    snap_threshold = float(args.object_contact_map_snap_threshold)
    snapped_count = 0
    for frame_idx in range(len(frame_ids)):
        rot = np.asarray(object_motion["rot_mats"][frame_idx], dtype=np.float32)
        pos = np.asarray(object_motion["positions"][frame_idx], dtype=np.float32)
        source_obj_world = source_points_local @ rot.T + pos[None, :]
        retarget_obj_world = retarget_points_local @ rot.T + pos[None, :]
        source_points_world[frame_idx] = source_obj_world.astype(np.float32)
        retarget_points_world[frame_idx] = retarget_obj_world.astype(np.float32)
        dist, ids = cKDTree(source_obj_world).query(np.asarray(source_slots[frame_idx], dtype=np.float32), k=1)
        ids = np.asarray(ids, dtype=np.int32)
        vectors = np.asarray(source_slots[frame_idx], dtype=np.float32) - source_obj_world[ids]
        if snap_threshold > 0.0:
            snap_mask = dist < snap_threshold
            snapped_count += int(snap_mask.sum())
            vectors[snap_mask] = 0.0
            dist = np.asarray(dist, dtype=np.float32)
            dist[snap_mask] = 0.0
        distances[frame_idx] = np.asarray(dist, dtype=np.float32)
        object_ids[frame_idx] = ids
        pair_vectors[frame_idx] = vectors.astype(np.float32)

    active_counts = (distances <= float(args.object_contact_map_threshold)).sum(axis=1)
    print(
        f"[HumanoidRetarget][ObjectContactMap] object={object_name} source={object_path} "
        f"source_object_points={len(source_points_local)}, retarget_object_points={len(retarget_points_local)}, "
        f"slots={source_slots.shape[1]}, frames={len(frame_ids)}, "
        f"surface_method=first_hit, "
        f"source_mesh_scale={source_mesh_scale:.6f}, retarget_mesh_scale={retarget_mesh_scale:.6f}, "
        f"retarget_object_size={retarget_object_size}, "
        f"min={float(distances.min()):.4f}, p5={float(np.percentile(distances, 5)):.4f}, "
        f"p50={float(np.percentile(distances, 50)):.4f}, max={float(distances.max()):.4f}, "
        f"snap<{snap_threshold:.4f}m={snapped_count}/{distances.size}, "
        f"active min/mean/max={int(active_counts.min())}/{float(active_counts.mean()):.2f}/{int(active_counts.max())}, "
        f"max_points={int(args.object_contact_map_max_points)}"
    )
    return {
        "name": object_name,
        "path": object_path,
        "prop_path": prop_path,
        "source_mesh_scale": source_mesh_scale,
        "retarget_mesh_scale": retarget_mesh_scale,
        "retarget_object_size": retarget_object_size,
        "source_points_local": source_points_local.astype(np.float32),
        "source_points_world": source_points_world.astype(np.float32),
        "retarget_points_local": retarget_points_local.astype(np.float32),
        "retarget_points_world": retarget_points_world.astype(np.float32),
        "distances": distances,
        "object_ids": object_ids,
        "pair_vectors": pair_vectors,
        "motion_positions": object_motion["positions"].astype(np.float32),
        "motion_quats_wxyz": object_motion["quats_wxyz"].astype(np.float32),
    }


def robot_object_collision_geom_ids(model) -> np.ndarray:
    labels = common.geom_collision_labels(model)
    geom_ids = []
    for geom_id in range(model.ngeom):
        body_id = int(model.geom_bodyid[geom_id])
        body_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, body_id) or ""
        label = labels[geom_id]
        if body_name == "world" or "floor" in label or "ground" in label:
            continue
        if int(model.geom_type[geom_id]) == int(mujoco.mjtGeom.mjGEOM_PLANE):
            continue
        if int(model.geom_contype[geom_id]) == 0 and int(model.geom_conaffinity[geom_id]) == 0:
            continue
        geom_ids.append(int(geom_id))
    return np.asarray(geom_ids, dtype=np.int32)


def append_object_mjcf_to_robot_root(robot_root: ET.Element, object_xml_path: Path, object_mesh_scale: float) -> None:
    object_xml_path = Path(object_xml_path).resolve()
    object_root = ET.parse(object_xml_path).getroot()
    make_mjcf_mesh_paths_absolute(object_root, object_xml_path)
    scale_mjcf_mesh_assets(object_root, object_mesh_scale)

    robot_asset = robot_root.find("asset")
    if robot_asset is None:
        robot_asset = ET.SubElement(robot_root, "asset")
    for object_asset in object_root.findall("asset"):
        for child in list(object_asset):
            robot_asset.append(child)

    robot_worldbody = robot_root.find("worldbody")
    if robot_worldbody is None:
        robot_worldbody = ET.SubElement(robot_root, "worldbody")
    for object_worldbody in object_root.findall("worldbody"):
        for body in list(object_worldbody):
            if body.find("./freejoint") is None and body.find("./joint[@type='free']") is None:
                joint_name = f"{body.get('name', 'object')}_freejoint"
                body.insert(0, ET.Element("freejoint", {"name": joint_name}))
            robot_worldbody.append(body)


def build_robot_object_penetration_cache(robot_xml: Path, object_source, main_model, args):
    needs_robot_object = (
        bool(getattr(args, "robot_object_hard_constraint", False))
        or float(getattr(args, "robot_object_penetration_soft_cost", 0.0)) > 0.0
    )
    if not needs_robot_object:
        return None
    if object_source is None:
        print("[HumanoidRetarget][RobotObjectPenetration][WARN] no object source; disabling robot-object penetration terms.")
        args.robot_object_hard_constraint = False
        args.robot_object_penetration_soft_cost = 0.0
        return None
    object_xml = Path(object_source["path"])
    if object_xml.suffix.lower() != ".xml":
        print(
            f"[HumanoidRetarget][RobotObjectPenetration][WARN] object path is not XML: {object_xml}; "
            "disabling robot-object penetration terms."
        )
        args.robot_object_hard_constraint = False
        args.robot_object_penetration_soft_cost = 0.0
        return None

    robot_root = ET.parse(robot_xml).getroot()
    make_mjcf_mesh_paths_absolute(robot_root, robot_xml)
    append_object_mjcf_to_robot_root(
        robot_root,
        object_xml,
        object_mesh_scale=float(object_source.get("retarget_mesh_scale", 1.0)),
    )
    # Keep the temporary MJCF beside the selected robot XML so relative MJCF
    # includes (for example ``assets.xml``) retain their original base path.
    with tempfile.NamedTemporaryFile(
        "w",
        suffix=".xml",
        prefix="hsi_robot_object_penetration_",
        dir=str(robot_xml.parent),
        delete=False,
    ) as tmp:
        tmp.write(ET.tostring(robot_root, encoding="unicode"))
        tmp_path = Path(tmp.name)
    try:
        penetration_model = mujoco.MjModel.from_xml_path(str(tmp_path))
    finally:
        tmp_path.unlink(missing_ok=True)

    free_qpos_addrs = []
    for joint_id in range(penetration_model.njnt):
        if int(penetration_model.jnt_type[joint_id]) != int(mujoco.mjtJoint.mjJNT_FREE):
            continue
        qadr = int(penetration_model.jnt_qposadr[joint_id])
        if qadr >= int(main_model.nq):
            free_qpos_addrs.append(qadr)
    if not free_qpos_addrs:
        print(
            f"[HumanoidRetarget][RobotObjectPenetration][WARN] no appended object freejoint found in {object_xml}; "
            "disabling robot-object penetration terms."
        )
        args.robot_object_hard_constraint = False
        args.robot_object_penetration_soft_cost = 0.0
        return None

    robot_geom_ids = robot_object_collision_geom_ids(main_model)
    robot_geom_ids = robot_geom_ids[robot_geom_ids < penetration_model.ngeom].astype(np.int32)
    object_geom_ids = np.arange(int(main_model.ngeom), int(penetration_model.ngeom), dtype=np.int32)
    object_geom_ids = object_geom_ids[
        [
            int(penetration_model.geom_type[int(geom_id)]) != int(mujoco.mjtGeom.mjGEOM_PLANE)
            and (
                int(penetration_model.geom_group[int(geom_id)]) == 3
                or int(penetration_model.geom_contype[int(geom_id)]) != 0
                or int(penetration_model.geom_conaffinity[int(geom_id)]) != 0
            )
            for geom_id in object_geom_ids
        ]
    ]
    if robot_geom_ids.size == 0 or object_geom_ids.size == 0:
        print(
            f"[HumanoidRetarget][RobotObjectPenetration][WARN] robot_geoms={robot_geom_ids.size}, "
            f"object_geoms={object_geom_ids.size}; disabling robot-object penetration terms."
        )
        args.robot_object_hard_constraint = False
        args.robot_object_penetration_soft_cost = 0.0
        return None

    print(
        f"[HumanoidRetarget][RobotObjectPenetration] hard_constraint={bool(args.robot_object_hard_constraint)} "
        f"soft_cost={float(args.robot_object_penetration_soft_cost):.4f} "
        f"margin={float(args.robot_object_margin):.4f} "
        f"threshold={float(args.robot_object_threshold):.4f} "
        f"slack={bool(args.robot_object_hard_slack)} "
        f"slack_cost={float(args.robot_object_hard_slack_cost):.4f} "
        f"robot_geoms={robot_geom_ids.size} object_geoms={object_geom_ids.size} "
        f"max_pairs={int(args.robot_object_max_pairs)}"
    )
    return {
        "model": penetration_model,
        "data": mujoco.MjData(penetration_model),
        "robot_nq": int(main_model.nq),
        "robot_nv": int(main_model.nv),
        "object_qadr": int(free_qpos_addrs[0]),
        "robot_geom_ids": robot_geom_ids,
        "object_geom_ids": object_geom_ids.astype(np.int32),
        "labels": common.geom_collision_labels(penetration_model),
    }


def compute_robot_object_penetration_rows(qpos, object_pose_wxyz, cache, margin, threshold, max_pairs):
    if cache is None:
        return [], []
    penetration_model = cache["model"]
    penetration_data = cache["data"]
    robot_nq = int(cache["robot_nq"])
    robot_nv = int(cache["robot_nv"])
    object_qadr = int(cache["object_qadr"])
    object_pose_wxyz = np.asarray(object_pose_wxyz, dtype=np.float64).reshape(7)

    mujoco.mj_resetData(penetration_model, penetration_data)
    penetration_data.qpos[:robot_nq] = np.asarray(qpos, dtype=np.float64)[:robot_nq]
    penetration_data.qpos[object_qadr : object_qadr + 7] = object_pose_wxyz
    mujoco.mj_forward(penetration_model, penetration_data)

    activation_distance = max(float(threshold), float(margin), 0.0)
    robot_geoms = np.asarray(cache["robot_geom_ids"], dtype=np.int32)
    object_geoms = np.asarray(cache["object_geom_ids"], dtype=np.int32)
    robot_geom_set = set(int(geom_id) for geom_id in robot_geoms)
    object_geom_set = set(int(geom_id) for geom_id in object_geoms)
    candidates = set()

    saved_contype = penetration_model.geom_contype.copy()
    saved_conaffinity = penetration_model.geom_conaffinity.copy()
    saved_margin = penetration_model.geom_margin.copy()
    try:
        penetration_model.geom_contype[robot_geoms] = 1
        penetration_model.geom_conaffinity[robot_geoms] = 1
        penetration_model.geom_contype[object_geoms] = 1
        penetration_model.geom_conaffinity[object_geoms] = 1
        penetration_model.geom_margin[:] = np.maximum(saved_margin, activation_distance)
        mujoco.mj_collision(penetration_model, penetration_data)
        for contact_id in range(penetration_data.ncon):
            contact = penetration_data.contact[contact_id]
            geom1 = int(contact.geom1)
            geom2 = int(contact.geom2)
            if geom1 < 0 or geom2 < 0:
                continue
            if geom1 in robot_geom_set and geom2 in object_geom_set:
                candidates.add((geom1, geom2))
            elif geom2 in robot_geom_set and geom1 in object_geom_set:
                candidates.add((geom2, geom1))
    finally:
        penetration_model.geom_contype[:] = saved_contype
        penetration_model.geom_conaffinity[:] = saved_conaffinity
        penetration_model.geom_margin[:] = saved_margin

    jacobians = []
    distances = []
    fromto = np.zeros(6, dtype=np.float64)
    labels = cache["labels"]
    for geom_robot, geom_object in sorted(candidates):
        fromto[:] = 0.0
        try:
            dist = mujoco.mj_geomDistance(
                penetration_model,
                penetration_data,
                int(geom_robot),
                int(geom_object),
                activation_distance,
                fromto,
            )
        except Exception:
            continue
        if dist > activation_distance:
            continue
        jac = common.collision_relative_jacobian(
            penetration_model,
            penetration_data,
            int(geom_robot),
            int(geom_object),
            labels,
            fromto,
            dist,
        )
        jacobians.append(np.asarray(jac, dtype=np.float64).reshape(-1)[:robot_nv])
        distances.append(float(dist))

    if jacobians and int(max_pairs) > 0 and len(jacobians) > int(max_pairs):
        order = np.argsort(np.asarray(distances, dtype=np.float64))[: int(max_pairs)]
        jacobians = [jacobians[int(idx)] for idx in order]
        distances = [distances[int(idx)] for idx in order]
    return jacobians, distances


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
    object_contact_frame,
    robot_template,
    joint_qpos_addrs,
    joint_dof_addrs,
    args,
    iters=None,
    joint_limits_by_qpos=None,
    robot_self_penetration_cache=None,
    ground_penetration_collision_cache=None,
    robot_object_penetration_cache=None,
    ground_contact_anchor_state=None,
):
    qpos = qpos_init.copy()
    costs = []
    sqrt_smooth = np.sqrt(float(args.smooth_cost))
    sqrt_temporal_smooth = np.sqrt(float(args.temporal_smooth_cost))
    ground_contact_threshold = float(args.ground_contact_map_threshold)
    ground_contact_max_points = int(args.ground_contact_map_max_points)
    self_contact_cost = float(args.self_contact_map_cost)
    object_contact_threshold = float(args.object_contact_map_threshold)
    object_contact_max_points = int(args.object_contact_map_max_points)
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

        if (
            float(args.object_contact_map_cost) > 0.0
            and object_contact_frame is not None
            and object_contact_threshold >= 0.0
        ):
            target_distances = np.asarray(object_contact_frame["distances"], dtype=np.float64).reshape(-1)
            object_ids = np.asarray(object_contact_frame["object_ids"], dtype=np.int32).reshape(-1)
            target_vectors = np.asarray(object_contact_frame["pair_vectors"], dtype=np.float64).reshape(-1, 3)
            object_mode = str(object_contact_frame.get("mode", "world_points"))
            object_points = np.asarray(object_contact_frame["object_points"], dtype=np.float64).reshape(-1, 3)
            if len(target_distances) != len(robot_template["geom_ids"]):
                raise ValueError(
                    f"Object contact slot count mismatch: target={len(target_distances)}, "
                    f"robot={len(robot_template['geom_ids'])}"
                )
            active = np.where(target_distances <= object_contact_threshold)[0].astype(np.int32)
            if active.size > 0 and (len(object_points) > 0 or object_mode == "robot_slot_object"):
                if object_contact_max_points > 0 and active.size > object_contact_max_points:
                    active = active[np.argsort(target_distances[active])[:object_contact_max_points]]
                paired_ids = object_ids[active]
                object_count = len(robot_template["geom_ids"]) if object_mode == "robot_slot_object" else len(object_points)
                valid = (paired_ids >= 0) & (paired_ids < object_count)
                active = active[valid]
                paired_ids = paired_ids[valid]
                if active.size > 0:
                    robot_points = slot_cache.points(active)
                    if object_mode == "robot_slot_object":
                        current_vectors = robot_points - slot_cache.points(paired_ids)
                    else:
                        current_vectors = robot_points - object_points[paired_ids]
                    strength = np.clip(
                        (object_contact_threshold - target_distances[active])
                        / max(object_contact_threshold, 1e-8),
                        0.5,
                        1.0,
                    )
                    row_costs = float(args.object_contact_map_cost) * strength
                    for row, slot_id in enumerate(active):
                        jac = slot_cache.point_jacobian(int(slot_id))
                        if object_mode == "robot_slot_object":
                            jac = jac - slot_cache.point_jacobian(int(paired_ids[row]))
                        rows.append(row_costs[row] * jac)
                        residuals.append(row_costs[row] * (current_vectors[row] - target_vectors[int(slot_id)]))

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

        robot_object_soft_cost = float(args.robot_object_penetration_soft_cost)
        robot_object_hard = bool(args.robot_object_hard_constraint)
        jacobians_object = []
        distances_object = []
        if (
            (robot_object_soft_cost > 0.0 or robot_object_hard)
            and object_contact_frame is not None
            and robot_object_penetration_cache is not None
        ):
            object_pose = np.concatenate(
                [
                    np.asarray(object_contact_frame["object_position"], dtype=np.float64).reshape(3),
                    np.asarray(object_contact_frame["object_quat_wxyz"], dtype=np.float64).reshape(4),
                ]
            )
            robot_object_margin = float(args.robot_object_margin)
            jacobians_object, distances_object = compute_robot_object_penetration_rows(
                qpos,
                object_pose,
                robot_object_penetration_cache,
                margin=robot_object_margin,
                threshold=float(args.robot_object_threshold),
                max_pairs=int(args.robot_object_max_pairs),
            )
            if robot_object_soft_cost > 0.0:
                sqrt_object = np.sqrt(robot_object_soft_cost)
                for jac, phi in zip(jacobians_object, distances_object):
                    if (robot_object_margin - float(phi)) <= 0.0:
                        continue
                    rows.append(sqrt_object * np.asarray(jac, dtype=np.float64).reshape(1, model.nv))
                    residuals.append(np.asarray([sqrt_object * (float(phi) - robot_object_margin)], dtype=np.float64))

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
        if (
            bool(args.robot_object_hard_constraint)
            and object_contact_frame is not None
            and robot_object_penetration_cache is not None
        ):
            object_slack_cost = (
                float(args.robot_object_hard_slack_cost)
                if bool(args.robot_object_hard_slack)
                else 0.0
            )
            for jac, phi in zip(jacobians_object, distances_object):
                ineq_rows.append(-np.asarray(jac, dtype=np.float64).reshape(model.nv))
                ineq_bounds.append(float(phi) - float(args.robot_object_margin))
                ineq_soft_costs.append(object_slack_cost)
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


def main():
    args = parse_args()
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
    source_up = str(sequence.get("output_up", "z"))
    is_uniform_source = source_model_type not in {"smplx", "soma"}
    vertices_world = None
    joints_world = None
    ground_z = 0.0
    if not is_uniform_source:
        vertices_world, joints_world, _faces = common.source_motion_vertices_joints(
            sequence,
            frame_ids,
            args.smplx_model_dir,
            batch_size=args.batch_size,
            soma_usd_path=soma_usd_path,
            zero_source_finger_pose=bool(args.zero_source_finger_pose),
            smplx_device=args.smplx_device,
            smplx_batch_size=args.smplx_batch_size,
            smplx_batch_size_max=args.smplx_batch_size_max,
            smplx_batch_size_safety_factor=args.smplx_batch_size_safety_factor,
        )
        vertices_world = common.source_points_to_retarget_frame(vertices_world, source_model_type, source_up)
        joints_world = common.source_points_to_retarget_frame(joints_world, source_model_type, source_up)
        vertices_world, joints_world, ground_z = common.preprocess_source_ground_for_retarget(
            vertices_world,
            joints_world,
            args.mat_height,
            args.source_ground_align,
            joint_names=source_joint_names,
        )
    human_height = (
        float(args.human_height)
        if float(args.human_height) > 0.0
        else float(template_vertices[:, 1].max() - template_vertices[:, 1].min())
    )
    if float(args.human_height) <= 0.0 and str(sequence.get("human_scale_mode", "off")).lower() in {"local", "world"}:
        human_height *= float(sequence.get("human_scale", 1.0))

    smpl_slot_name = args.smpl_name
    if smpl_slot_name == "auto":
        smpl_slot_name = str(template_cfg["name"])
    smpl_slots, center_mode, smpl_slot_name = common.load_slot_data(args.slots, smpl_slot_name, args.slots_field)
    robot_slots, _robot_center, robot_slot_name = common.load_slot_data(args.slots, args.robot_name, args.slots_field)
    full_robot_slots = robot_slots
    robot_height = resolve_robot_height(args, robot_slots, robot_slot_name)
    smpl_scale = float(robot_height) / max(human_height, 1e-8)
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
    uniform_original_slot_ids = None
    uniform_slot_pool_count = len(smpl_slots)
    body_segment_cfg = section(section(args.config_data, "solver"), "body_segment")
    composite_racket_cfg = section(body_segment_cfg, "composite_racket")
    composite_racket_enabled = bool(composite_racket_cfg.get("enabled", False))
    composite_racket_state = None
    if composite_racket_enabled and is_uniform_source:
        raise ValueError("Composite racket source currently requires an SMPL-X or SOMA body source")
    if is_uniform_source:
        segment_sample_cfg = segment_sample_counts()
        body_segment_cfg = section(section(args.config_data, "solver"), "body_segment")
        configured_total = sum(int(value) for value in segment_sample_cfg.values())
        uniform_count = min(
            len(smpl_slots),
            max(1, int(body_segment_cfg.get("uniform_sample_slots", configured_total))),
        )
        uniform_original_slot_ids = correspondence_pair_farthest_point_sampling(
            smpl_slots,
            robot_slots,
            uniform_count,
            args.seed,
        )
        smpl_slots = smpl_slots[uniform_original_slot_ids]
        robot_slots = robot_slots[uniform_original_slot_ids]
        print(
            f"[HumanoidRetarget][UniformSurface] preselected {len(smpl_slots)}/{uniform_slot_pool_count} "
            "correspondence slots with joint source/robot FPS before dynamic FBX skinning"
        )
    if is_uniform_source:
        source_binding = common.bind_points_to_mesh(
            smpl_slots,
            template_vertices_centered,
            faces,
            nearest_vertex_k=args.bind_nearest_vertex_k,
        )
        binding_error_mean = float(np.mean(source_binding["errors"]))
        binding_error_p95 = float(np.percentile(source_binding["errors"], 95))
        source_slots, source_slot_normals, joints_world = common.nr_source.skin_surface_binding(
            sequence,
            frame_ids,
            faces,
            source_binding,
        )
        source_slots = common.source_points_to_retarget_frame(source_slots, source_model_type, source_up)
        source_slot_normals = common.source_points_to_retarget_frame(source_slot_normals, source_model_type, source_up)
        source_slot_normals /= np.maximum(np.linalg.norm(source_slot_normals, axis=2, keepdims=True), 1e-12)
        joints_world = common.source_points_to_retarget_frame(joints_world, source_model_type, source_up)
        source_slots, joints_world, ground_z = common.preprocess_source_ground_for_retarget(
            source_slots,
            joints_world,
            args.mat_height,
            args.source_ground_align,
            joint_names=source_joint_names,
        )
        source_slots = source_slots * smpl_scale
        joints_scaled = joints_world * smpl_scale
        vertices_scaled = None
        source_slot_part_ids = np.zeros(len(smpl_slots), dtype=np.int32)
        source_tpose_slot_normals = np.asarray(source_binding["closest_normals"], dtype=np.float32)
        source_tpose_slot_normals /= np.maximum(
            np.linalg.norm(source_tpose_slot_normals, axis=1, keepdims=True),
            1e-12,
        )
        source_binding = {
            "face_ids": np.asarray(source_binding["face_ids"], dtype=np.int32),
            "bary": np.asarray(source_binding["bary"], dtype=np.float32),
        }
        print(
            f"[HumanoidRetarget] bound uniform NR FBX slots: slots={len(smpl_slots)} "
            f"error_mean={binding_error_mean:.5f} error_p95={binding_error_p95:.5f}"
        )
    else:
        vertices_scaled = vertices_world * smpl_scale
        joints_scaled = joints_world * smpl_scale
        source_slots, source_slot_normals, source_slot_part_ids, source_tpose_slot_normals, source_binding = bind_source_slots_with_normals(
            smpl_slots,
            template_vertices_centered,
            faces,
            vertices_scaled,
            common.bind_points_to_mesh,
            common.dynamic_surface_template_to_world,
            nearest_vertex_k=args.bind_nearest_vertex_k,
            log_prefix="HumanoidRetarget",
            source_model_type=source_model_type,
            source_joint_names=source_joint_names,
            source_template_joints=template_joints_centered,
        )
        if composite_racket_enabled:
            source_tpose_path = resolve_path(composite_racket_cfg.get("source_tpose_npz"), args.config_data)
            tpose_path = resolve_path(composite_racket_cfg.get("tpose_npz"), args.config_data)
            trajectory_path = resolve_path(composite_racket_cfg.get("trajectory_npz"), args.config_data)
            if source_tpose_path is None or tpose_path is None or trajectory_path is None:
                raise ValueError(
                    "solver.body_segment.composite_racket requires source_tpose_npz, "
                    "tpose_npz, and trajectory_npz"
                )
            source_slots, source_slot_normals, source_slot_part_ids, source_tpose_slot_normals, composite_racket_state = bind_composite_racket_source(
                slot_points=smpl_slots,
                body_template_vertices=template_vertices_centered,
                body_template_faces=faces,
                body_source_slots=source_slots,
                body_source_normals=source_slot_normals,
                body_slot_part_ids=source_slot_part_ids,
                body_tpose_normals=source_tpose_slot_normals,
                body_binding=source_binding,
                template_center=template_center,
                frame_ids=frame_ids,
                source_up=source_up,
                ground_z=ground_z,
                source_scale=smpl_scale,
                source_tpose_path=source_tpose_path,
                tpose_path=tpose_path,
                trajectory_path=trajectory_path,
                bind_points_to_mesh=common.bind_points_to_mesh,
                nearest_vertex_k=args.bind_nearest_vertex_k,
                racket_part_id=SMPLX_PART_IDS["racket"],
                log_prefix="HumanoidRetarget",
            )
    print(
        f"[HumanoidRetarget] human_height={human_height:.5f} robot_height={float(args.robot_height):.5f} "
        f"smpl_scale={smpl_scale:.6f} ground_z={ground_z:.5f} "
        f"source_ground_align={args.source_ground_align} source_template={template_cfg['name']}"
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

    segment_sample_cfg = segment_sample_counts()
    if is_uniform_source:
        configured_total = sum(int(value) for value in segment_sample_cfg.values())
        selected_slot_ids = np.arange(len(smpl_slots), dtype=np.int32)
        selected_segment_groups = {
            name: np.zeros(0, dtype=np.int32)
            for name in SMPLX_PART_IDS
        }
        selected_segment_groups["torso"] = selected_slot_ids
        print(
            f"[HumanoidRetarget] {source_model_type.upper()} has no semantic body segmentation; "
            f"uniformly sampled {len(selected_slot_ids)}/{uniform_slot_pool_count} slots "
            f"(body-segment configured total={configured_total})"
        )
    else:
        segment_groups = body_segment_slot_groups(source_slot_part_ids)
        print(
            f"[HumanoidRetarget] {source_model_type.upper()} {body_segment_schema()} body segment slots: "
            + ", ".join(f"{name}={len(ids)}" for name, ids in segment_groups.items())
        )
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
    if bool(args.robot_object_hard_constraint) or float(args.robot_object_penetration_soft_cost) > 0.0:
        print(
            f"[HumanoidRetarget][RobotObjectPenetration] hard_constraint={bool(args.robot_object_hard_constraint)} "
            f"soft_cost={float(args.robot_object_penetration_soft_cost):.4f} "
            f"margin={float(args.robot_object_margin):.4f} "
            f"threshold={float(args.robot_object_threshold):.4f} "
            f"slack={bool(args.robot_object_hard_slack)} "
            f"slack_cost={float(args.robot_object_hard_slack_cost):.4f} "
            f"max_pairs={int(args.robot_object_max_pairs)}"
        )
    if source_ground_contact_distances is not None:
        selected_for_ground = selected_slot_ids[(selected_slot_ids >= 0) & (selected_slot_ids < source_ground_contact_distances.shape[1])]
        ground_active_counts = (
            source_ground_contact_distances[:, selected_for_ground] <= float(args.ground_contact_map_threshold)
        ).sum(axis=1)
        ground_anchor_counts = np.isclose(
            source_ground_contact_distances[:, selected_for_ground],
            0.0,
            atol=1e-8,
        ).sum(axis=1)
        print(
            f"[HumanoidRetarget][GroundContactMap] active selected slots under threshold="
            f"{float(args.ground_contact_map_threshold):.4f}: "
            f"min={int(ground_active_counts.min())}, mean={float(ground_active_counts.mean()):.2f}, "
            f"max={int(ground_active_counts.max())}, active_frames="
            f"{int((ground_active_counts > 0).sum())}/{len(ground_active_counts)}, "
            f"selected_slots={len(selected_for_ground)}, max_points={int(args.ground_contact_map_max_points)}"
        )
        print(
            f"[HumanoidRetarget][GroundContactAnchor] snapped-to-zero selected slots: "
            f"min={int(ground_anchor_counts.min())}, mean={float(ground_anchor_counts.mean()):.2f}, "
            f"max={int(ground_anchor_counts.max())}, active_frames="
            f"{int((ground_anchor_counts > 0).sum())}/{len(ground_anchor_counts)}, "
            f"cost={float(args.ground_contact_anchor_cost):.4f}"
        )
    point_segment_costs = segment_cost_values("point_cost")
    normal_segment_costs = segment_cost_values("normal_cost")
    if is_uniform_source:
        configured_total = max(1, sum(int(value) for value in segment_sample_cfg.values()))
        body_segment_cfg = section(section(args.config_data, "solver"), "body_segment")
        weighted_point_cost = sum(
            float(point_segment_costs[name]) * int(segment_sample_cfg[name]) for name in SMPLX_PART_IDS
        ) / configured_total
        weighted_normal_cost = sum(
            float(normal_segment_costs[name]) * int(segment_sample_cfg[name]) for name in SMPLX_PART_IDS
        ) / configured_total
        uniform_point_cost = float(body_segment_cfg.get("uniform_point_cost", weighted_point_cost))
        uniform_normal_cost = float(body_segment_cfg.get("uniform_normal_cost", weighted_normal_cost))
        point_slot_costs = np.full(len(smpl_slots), uniform_point_cost, dtype=np.float64)
        normal_slot_costs = np.full(len(smpl_slots), uniform_normal_cost, dtype=np.float64)
        print(
            f"[HumanoidRetarget][UniformSurface] point_cost={uniform_point_cost:.4f} "
            f"normal_cost={uniform_normal_cost:.4f} selected={len(selected_slot_ids)}"
        )
        if float(args.self_contact_map_cost) > 0.0:
            print(
                "[HumanoidRetarget][WARN] source has no semantic body segmentation; "
                "disabling semantic self-contact map."
            )
            args.self_contact_map_cost = 0.0
    else:
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
    source_self_contact_maps = None
    packed_self_contact_pair_ids = np.full((0, 0, 2), -1, dtype=np.int32)
    packed_self_contact_distances = np.zeros((0, 0), dtype=np.float32)
    packed_self_contact_weights = np.zeros((0, 0), dtype=np.float32)
    source_self_contact_counts = np.zeros(0, dtype=np.int32)
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
        (
            packed_self_contact_pair_ids,
            packed_self_contact_distances,
            source_self_contact_counts,
        ) = pack_self_contact_maps(source_self_contact_maps)
        packed_self_contact_weights = pack_self_contact_map_weights(source_self_contact_maps)

    object_contact_target = str(
        section(section(args.config_data, "solver"), "body_segment").get(
            "object_contact_target", "world_object"
        )
    )
    use_composite_racket_contact = object_contact_target == "composite_racket_slots"
    if use_composite_racket_contact and composite_racket_state is None:
        raise ValueError("composite_racket_slots object contact requires composite_racket source binding")
    object_contact_source = None if use_composite_racket_contact else load_object_contact_source(
        args,
        frame_ids,
        source_slots,
        smpl_scale,
        ground_z,
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    source_robot_xml = Path(args.robot_xml)
    robot_xml = prepare_robot_xml(args)
    model = mujoco.MjModel.from_xml_path(str(robot_xml))
    data_mj = mujoco.MjData(model)
    robot_self_penetration_cache = common.build_robot_self_penetration_cache(model, args)
    ground_penetration_collision_cache = common.build_ground_penetration_collision_cache(model, args)
    robot_object_penetration_cache = build_robot_object_penetration_cache(
        robot_xml,
        object_contact_source,
        model,
        args,
    )
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
    if use_composite_racket_contact:
        candidate_racket_ids = np.asarray(composite_racket_state["racket_slot_ids"], dtype=np.int32)
        candidate_geom_ids = np.asarray(robot_template["geom_ids"], dtype=np.int32)[candidate_racket_ids]
        dominant_geom_id = int(np.bincount(candidate_geom_ids).argmax())
        target_racket_slot_ids = candidate_racket_ids[candidate_geom_ids == dominant_geom_id]
        print(
            f"[HumanoidRetarget][CompositeRacketContactMap] target racket geom={dominant_geom_id} "
            f"matched_slots={len(target_racket_slot_ids)}/{len(candidate_racket_ids)}"
        )
        object_contact_source = build_composite_racket_contact_source(
            source_slots=source_slots,
            racket_slot_ids=target_racket_slot_ids,
            state=composite_racket_state,
            threshold=float(args.object_contact_map_threshold),
            snap_threshold=float(args.object_contact_map_snap_threshold),
            max_points=int(args.object_contact_map_max_points),
            log_prefix="HumanoidRetarget",
        )
    robot_template_all = robot_template
    if is_uniform_source and len(full_robot_slots) != len(robot_slots):
        robot_template_all = bind_robot_slots(
            model,
            args,
            full_robot_slots,
            nearest_vertex_k=args.bind_nearest_vertex_k,
            project_to_surface=bool(args.project_robot_slots),
            source_model_type=source_model_type,
            template_cfg=template_cfg,
        )
        print(
            f"[HumanoidRetarget][UniformSurface] retained full robot slot binding for visualization: "
            f"{len(full_robot_slots)} slots"
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
        if is_uniform_source:
            if source_model_type != "nr_fbx":
                raise ValueError(
                    f"surface_normal_cost_mode='tpose_offset' is not implemented for source type {source_model_type!r}"
                )
            surface_normal_targets = common.nr_source.transport_surface_vectors(
                sequence,
                frame_ids,
                template_vertices_centered,
                faces,
                source_binding,
                robot_tpose_normals_smpl,
            )
            surface_normal_targets = common.source_points_to_retarget_frame(
                surface_normal_targets,
                source_model_type,
                source_up,
            )
            surface_normal_targets /= np.maximum(
                np.linalg.norm(surface_normal_targets, axis=2, keepdims=True),
                1e-12,
            )
            surface_normal_target_mode = f"{robot_sample_pose}_robot_normal_transported_by_nr_fbx_face"
            print(
                "[HumanoidRetarget][SurfaceNormal] mode=tpose_offset: "
                "transported robot T-pose normals through NR FBX bound-face deformation."
            )
        else:
            surface_normal_targets = transport_tpose_robot_normals(
                robot_tpose_normals_smpl,
                source_binding,
                template_vertices_centered,
                faces,
                vertices_scaled,
            )
            surface_normal_target_mode = f"{robot_sample_pose}_robot_normal_transported_by_smpl_face"
            if composite_racket_state is not None:
                surface_normal_targets = transport_composite_racket_normals(
                    surface_normal_targets,
                    robot_tpose_normals_smpl,
                    composite_racket_state,
                )
                surface_normal_target_mode += "+rigid_racket"
                print(
                    "[HumanoidRetarget][SurfaceNormal] transported racket normals through "
                    "the tracked rigid racket pose."
                )
    elif surface_normal_cost_mode == "direct":
        print("[HumanoidRetarget][SurfaceNormal] mode=direct: matching robot normals to current source slot normals.")
        surface_normal_target_mode = "direct_source_slot_normal"
    else:
        raise ValueError(f"Unknown --surface-normal-cost-mode {surface_normal_cost_mode!r}")
    saved_surface_normal_targets = (
        source_slot_normals if surface_normal_targets is None else surface_normal_targets
    )
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

    def initial_qpos_for_frame(out_idx: int):
        q_init = q_body_zero.copy()
        q_init[:3] = common.source_root_joint_position(joints_scaled[out_idx], source_joint_names)
        q_init[3:7] = common.source_qpos_body_heading(joints_scaled[out_idx], source_joint_names)
        return q_init

    progress_done = 0
    progress_total = len(frame_ids) * (2 if trajectory_warm_start_mode == "bidirectional" else 1)

    def solve_sequence(order, desc: str):
        nonlocal progress_done
        q_seq = np.empty((len(frame_ids), model.nq), dtype=np.float32)
        seq_costs = np.empty(len(frame_ids), dtype=np.float32)
        q_prev2 = None
        q_prev = None
        ground_contact_anchor_state = {}
        for out_idx in tqdm(order, desc=desc):
            q_init = initial_qpos_for_frame(out_idx) if q_prev is None else q_prev.copy()
            object_contact_frame = None
            if object_contact_source is not None:
                object_contact_frame = {
                    "mode": object_contact_source.get("mode", "world_points"),
                    "distances": object_contact_source["distances"][out_idx],
                    "object_ids": object_contact_source["object_ids"][out_idx],
                    "pair_vectors": object_contact_source["pair_vectors"][out_idx],
                    "object_points": object_contact_source["retarget_points_world"][out_idx],
                    "object_position": object_contact_source["motion_positions"][out_idx],
                    "object_quat_wxyz": object_contact_source["motion_quats_wxyz"][out_idx],
                }
            q_opt, cost = solve_frame_body_segment_qp(
                model,
                data_mj,
                q_init,
                q_prev,
                q_prev2,
                source_slots[out_idx],
                source_slot_normals[out_idx],
                None if surface_normal_targets is None else surface_normal_targets[out_idx],
                selected_slot_ids,
                source_slot_part_ids,
                point_slot_costs,
                normal_slot_costs,
                None if source_self_contact_maps is None else source_self_contact_maps[out_idx],
                None if source_ground_contact_distances is None else source_ground_contact_distances[out_idx],
                None if source_ground_contact_weight_distances is None else source_ground_contact_weight_distances[out_idx],
                object_contact_frame,
                robot_template,
                joint_qpos_addrs,
                joint_dof_addrs,
                args,
                iters=int(args.pose_init_iters) if q_prev is None and int(args.pose_init_iters) > 0 else int(args.iters),
                joint_limits_by_qpos=joint_limits_by_qpos,
                robot_self_penetration_cache=robot_self_penetration_cache,
                ground_penetration_collision_cache=ground_penetration_collision_cache,
                robot_object_penetration_cache=robot_object_penetration_cache,
                ground_contact_anchor_state=ground_contact_anchor_state,
            )
            q_seq[out_idx] = q_opt.astype(np.float32)
            seq_costs[out_idx] = float(cost)
            q_prev2 = q_prev
            q_prev = q_opt
            progress_done += 1
            emit_web_progress(progress_done, progress_total)
        return q_seq, seq_costs

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

    forward_qpos_seq, forward_costs = solve_sequence(
        range(len(frame_ids)),
        "[HumanoidRetarget] retarget forward",
    )
    backward_qpos_seq = np.zeros((0, 0), dtype=np.float32)
    backward_costs = np.zeros(0, dtype=np.float32)
    bidirectional_pick_backward_mask = np.zeros(len(frame_ids), dtype=bool)
    bidirectional_dp_scores = np.zeros((0, 0), dtype=np.float32)
    if trajectory_warm_start_mode == "bidirectional":
        backward_qpos_seq, backward_costs = solve_sequence(
            range(len(frame_ids) - 1, -1, -1),
            "[HumanoidRetarget] retarget backward",
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

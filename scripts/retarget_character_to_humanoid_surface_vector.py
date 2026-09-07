#!/usr/bin/env python3
"""Surface-vector retargeting from a MimicKit character motion source."""
from __future__ import annotations

import argparse
import json
import os
import sys
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
SCRIPTS = ROOT / "scripts"
for path in (ROOT, SCRIPTS):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import character_surface_retarget_common as character_common  # noqa: E402
import smpl_surface_retarget_common as common  # noqa: E402
import retarget_smpl_to_humanoid_surface_vector as base  # noqa: E402
from humanoid_retarget_config import load_config, resolve_path, robot_config, section  # noqa: E402
from retarget_body_segment_surface_character import (  # noqa: E402
    CHARACTER_SEGMENT_IDS,
    character_body_segment_schema,
    character_body_segment_slot_groups,
    character_segment_cost_values,
    character_segment_sample_counts,
    character_surface_slot_costs_from_segments,
    compute_character_source_self_contact_maps,
    configure_character_body_segment_surface,
    pack_self_contact_maps,
    sample_character_segment_slots,
)
from retarget_body_segment_surface import robot_template_normals_in_tpose_root  # noqa: E402

PROGRESS_PREFIX = "__HUMANOID_BATCH_PROGRESS__"


def batch_progress_enabled() -> bool:
    return os.environ.get("HUMANOID_BATCH_PROGRESS", "").strip() == "1"


def emit_batch_progress(done: int, total: int) -> None:
    if batch_progress_enabled():
        print(f"{PROGRESS_PREFIX} {int(done)} {int(total)}", flush=True)


def none_default(parser, *names, default=None, **kwargs):
    parser.add_argument(*names, default=default, **kwargs)


def set_default(args, name: str, value: Any):
    if getattr(args, name, None) is None:
        setattr(args, name, value)


def bool_value(value, default=False) -> bool:
    if value is None:
        return bool(default)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() not in {"0", "false", "no", "off", ""}
    return bool(value)


def uniform_surface_sample_config(config: dict[str, Any]) -> dict[str, Any]:
    solver = section(config, "solver")
    value = solver.get("uniform_surface_sample", {}) or {}
    if not isinstance(value, dict):
        raise ValueError("solver.uniform_surface_sample must be an object.")
    return value


def sample_uniform_surface_slots(num_slots: int, count: int, seed: int) -> np.ndarray:
    num_slots = int(num_slots)
    count = min(max(0, int(count)), num_slots)
    if count <= 0:
        return np.zeros(0, dtype=np.int32)
    rng = np.random.default_rng(int(seed))
    return np.sort(rng.choice(np.arange(num_slots, dtype=np.int32), size=count, replace=False)).astype(np.int32)


def concat_slot_groups(selected_segment_groups: dict[str, np.ndarray], names: tuple[str, ...]) -> np.ndarray:
    groups = [
        np.asarray(selected_segment_groups.get(name, np.zeros(0, dtype=np.int32)), dtype=np.int32).reshape(-1)
        for name in names
    ]
    if not groups:
        return np.zeros(0, dtype=np.int32)
    nonempty = [group for group in groups if len(group)]
    if not nonempty:
        return np.zeros(0, dtype=np.int32)
    return np.concatenate(nonempty).astype(np.int32)


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    none_default(parser, "--data", type=Path)
    none_default(parser, "--seq-key", type=str)
    parser.add_argument("--seq-index", type=int, default=0)
    none_default(parser, "--source-xml", type=Path)
    parser.add_argument("--source-name", type=str, default=None)
    none_default(parser, "--robot-xml", type=Path)
    none_default(parser, "--slots", type=Path)
    parser.add_argument("--slots-field", type=str, default=None)
    parser.add_argument("--robot-name", type=str, default=None)
    none_default(parser, "--out", type=Path)
    parser.add_argument("--start", type=int, default=None)
    parser.add_argument("--end", type=int, default=None)
    parser.add_argument("--stride", type=int, default=None)
    parser.add_argument("--max-frames", type=int, default=None)
    parser.add_argument("--robot-height", type=float, default=None)
    parser.add_argument("--source-height", type=float, default=None)
    parser.add_argument("--source-height-axis", choices=("auto", "max", "x", "y", "z"), default=None)
    parser.add_argument("--robot-height-axis", choices=("auto", "max", "x", "y", "z"), default=None)
    parser.add_argument("--mat-height", type=float, default=None)
    parser.add_argument("--source-ground-align", choices=("ground_min", "none"), default=None)
    parser.add_argument("--ground-contact-map-cost", type=float, default=None)
    parser.add_argument("--ground-contact-anchor-cost", type=float, default=None)
    parser.add_argument("--ground-contact-map-threshold", type=float, default=None)
    parser.add_argument("--ground-contact-map-snap-threshold", type=float, default=None)
    parser.add_argument("--ground-contact-map-max-points", type=int, default=None)
    parser.add_argument("--self-contact-map-cost", type=float, default=None)
    parser.add_argument("--self-contact-map-threshold", type=float, default=None)
    parser.add_argument("--self-contact-map-max-pairs", type=int, default=None)
    parser.add_argument("--joint-map-cost", type=float, default=None)
    parser.add_argument("--surface-normal-cost-mode", choices=("tpose_offset", "direct"), default=None)
    parser.add_argument("--smooth-cost", type=float, default=None)
    parser.add_argument("--temporal-smooth-cost", type=float, default=None)
    parser.add_argument("--damping", type=float, default=None)
    parser.add_argument("--collision-threshold", type=float, default=None)
    parser.add_argument("--robot-self-penetration-cost", type=float, default=None)
    parser.add_argument("--robot-self-penetration-tolerance", type=float, default=None)
    parser.add_argument("--iters", type=int, default=None)
    parser.add_argument("--pose-init-iters", type=int, default=None)
    parser.add_argument("--max-dq", type=float, default=None)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--stream-chunk-frames", type=int, default=None)
    parser.add_argument("--bind-nearest-vertex-k", type=int, default=None)
    parser.add_argument("--project-robot-slots", action="store_true", default=None)
    parser.add_argument("--no-project-robot-slots", dest="project_robot_slots", action="store_false")
    parser.add_argument("--force-no-floating-root", action="store_true")
    return fill_args_from_config(parser.parse_args())


def fill_args_from_config(args):
    config = load_config(args.config)
    args.config_data = config
    body_segment_info = configure_character_body_segment_surface(config)
    print(
        f"[CharacterRetarget] character_body_segment_schema={body_segment_info['schema']} "
        f"segments={len(body_segment_info['part_ids'])}"
    )
    robot = robot_config(config)
    source = section(config, "source_character")
    motion = section(config, "motion")
    corr = section(config, "correspondence")
    retarget = section(config, "retarget")
    solver = section(config, "solver")

    set_default(args, "data", resolve_path(motion.get("data"), config))
    set_default(args, "seq_key", motion.get("seq_key", ""))
    set_default(args, "source_xml", resolve_path(source.get("xml"), config, robot.get("xml")))
    set_default(args, "source_name", source.get("name", "mimickit_humanoid_character"))
    set_default(args, "robot_xml", resolve_path(robot.get("xml"), config))
    set_default(args, "slots", resolve_path(corr.get("slots"), config))
    set_default(args, "slots_field", corr.get("slots_field", "reconstructed_slots"))
    set_default(args, "robot_name", robot.get("slot_name", robot.get("name")))
    set_default(args, "out", resolve_path(retarget.get("out"), config, ROOT / f"output/{robot['name']}_character_retarget/motion_{robot['name']}.npz"))
    set_default(args, "start", motion.get("start", 0))
    set_default(args, "end", motion.get("end", -1))
    set_default(args, "stride", motion.get("stride", 1))
    set_default(args, "max_frames", motion.get("max_frames", 0))
    set_default(args, "robot_height", robot.get("height", 0.0))
    set_default(args, "source_height", source.get("height", 0.0))
    default_source_height_axis = "y" if bool_value(source.get("to_smpl_frame"), True) else "z"
    default_robot_height_axis = "y" if bool_value(robot.get("to_smpl_frame"), True) else "z"
    set_default(args, "source_height_axis", retarget.get("source_height_axis", default_source_height_axis))
    set_default(args, "robot_height_axis", retarget.get("robot_height_axis", default_robot_height_axis))
    set_default(args, "mat_height", retarget.get("mat_height", 0.0))
    set_default(args, "source_ground_align", retarget.get("source_ground_align", "ground_min"))
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
    set_default(args, "self_contact_map_threshold", solver.get("self_contact_map_threshold", 0.10))
    set_default(args, "self_contact_map_max_pairs", solver.get("self_contact_map_max_pairs", 256))
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
    set_default(args, "surface_normal_cost_mode", solver.get("surface_normal_cost_mode", "tpose_offset"))
    set_default(args, "smooth_cost", solver.get("smooth_cost", 0.2))
    set_default(args, "temporal_smooth_cost", solver.get("temporal_smooth_cost", 0.1))
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
    set_default(args, "max_dq", solver.get("max_dq", 0.15))
    set_default(args, "step_limit_mode", solver.get("step_limit_mode", "box"))
    set_default(args, "global_step_size", solver.get("global_step_size", 0.2))
    set_default(args, "root_step_limit_mode", solver.get("root_step_limit_mode", "off"))
    set_default(args, "root_max_translation_dq", solver.get("root_max_translation_dq", 0.3))
    set_default(args, "root_max_rotation_dq", solver.get("root_max_rotation_dq", 0.5))
    set_default(args, "root_global_translation_step_size", solver.get("root_global_translation_step_size", 0.3))
    set_default(args, "root_global_rotation_step_size", solver.get("root_global_rotation_step_size", 0.5))
    set_default(args, "seed", solver.get("seed", 0))
    set_default(args, "batch_size", solver.get("batch_size", 32))
    set_default(args, "stream_chunk_frames", retarget.get("stream_chunk_frames", 0))
    set_default(args, "bind_nearest_vertex_k", solver.get("bind_nearest_vertex_k", 24))
    set_default(args, "project_robot_slots", solver.get("project_robot_slots", True))
    return args


HEIGHT_AXIS_INDEX = {
    "x": 0,
    "y": 1,
    "z": 2,
}


def height_from_points(points, axis="auto") -> tuple[float, str]:
    points = np.asarray(points, dtype=np.float32)
    if points.ndim != 2 or points.shape[1] != 3 or len(points) == 0:
        raise ValueError(f"Height points must have shape (N, 3), got {points.shape}")
    extents = points.max(axis=0) - points.min(axis=0)
    axis = str(axis or "auto").lower()
    if axis in HEIGHT_AXIS_INDEX:
        idx = HEIGHT_AXIS_INDEX[axis]
        height = float(extents[idx])
        if np.isfinite(height) and height > 1e-8:
            return height, f"{axis}_extent"
        raise ValueError(f"Could not infer {axis}-axis height from extents {extents.tolist()}")
    if axis == "max":
        idx = int(np.argmax(extents))
        height = float(extents[idx])
        if np.isfinite(height) and height > 1e-8:
            return height, f"axis_{idx}_max_extent"
        raise ValueError(f"Could not infer max-axis height from extents {extents.tolist()}")
    if axis != "auto":
        raise ValueError(f"Unsupported height axis {axis!r}; expected auto, max, x, y, or z.")

    height = float(extents[1] if extents[1] > 0.6 * extents.max() else extents.max())
    if np.isfinite(height) and height > 1e-8:
        return height, "auto_y_or_max_extent"
    idx = int(np.argmax(extents))
    fallback = float(extents[idx])
    if not np.isfinite(fallback) or fallback <= 1e-8:
        raise ValueError(f"Could not infer auto height from extents {extents.tolist()}")
    return fallback, f"axis_{idx}_fallback_extent"


def source_height_from_points(points, axis="auto") -> tuple[float, str]:
    return height_from_points(points, axis=axis)


def resolve_character_robot_height(args, robot_slots, robot_slot_name) -> tuple[float, str, str]:
    configured = float(args.robot_height)
    if configured > 0.0:
        return configured, "configured", str(args.slots_field)

    height_points = np.asarray(robot_slots, dtype=np.float32)
    height_field = str(args.slots_field)
    if str(args.slots_field) != "target_points":
        try:
            height_points, _center_mode, _name = common.load_slot_data(args.slots, robot_slot_name, "target_points")
            height_field = "target_points"
        except Exception as exc:
            print(
                f"[CharacterRetarget][WARN] target_points unavailable for robot height; "
                f"using {args.slots_field}: {exc}"
            )
    height, height_mode = height_from_points(height_points, axis=args.robot_height_axis)
    args.robot_height = float(height)
    print(
        f"[CharacterRetarget] inferred robot_height={height:.5f} "
        f"from slots sample={robot_slot_name} field={height_field} mode={height_mode}"
    )
    return float(height), height_mode, height_field


def ground_align_source(points, joints, mat_height, mode):
    mode = str(mode)
    if mode in {"none", "raw", "off", "false", "0"}:
        return points, joints, 0.0
    if mode != "ground_min":
        raise ValueError(f"Unsupported source_ground_align={mode!r}")
    z_shift = float(points[:, :, 2].min())
    if z_shift >= float(mat_height):
        z_shift -= float(mat_height)
    points = points.copy()
    joints = joints.copy()
    points[:, :, 2] -= z_shift
    joints[:, :, 2] -= z_shift
    return points, joints, z_shift


def compute_character_tpose_surface_normal_offsets(
    model,
    robot_template,
    source_tpose_slot_normals,
    apply_tpose_fn,
    point_cloud_center_name,
    source_to_smpl_frame: bool,
    log_prefix="CharacterRetarget",
):
    robot_normals_root = robot_template_normals_in_tpose_root(
        model,
        robot_template,
        apply_tpose_fn,
        point_cloud_center_name,
    )
    robot_tpose_normals = character_common.native_to_retarget_frame(
        robot_normals_root,
        to_smpl_frame=source_to_smpl_frame,
    )
    robot_tpose_normals = character_common.normalize_vectors(robot_tpose_normals)
    source_tpose_slot_normals = character_common.normalize_vectors(source_tpose_slot_normals)
    if len(robot_tpose_normals) != len(source_tpose_slot_normals):
        raise ValueError(
            f"Character surface normal offset slot mismatch: "
            f"robot={len(robot_tpose_normals)} source={len(source_tpose_slot_normals)}"
        )
    offsets = robot_tpose_normals - source_tpose_slot_normals
    magnitudes = np.linalg.norm(offsets, axis=1)
    print(
        f"[{log_prefix}][SurfaceNormal] character tpose normal offset magnitude: "
        f"mean={float(magnitudes.mean()):.5f}, p95={float(np.percentile(magnitudes, 95)):.5f}, "
        f"max={float(magnitudes.max()):.5f}"
    )
    return offsets.astype(np.float32), robot_tpose_normals.astype(np.float32)


def slice_transforms(transforms: dict[str, Any], start: int, end: int) -> dict[str, Any]:
    return {
        "body_names": list(transforms["body_names"]),
        "body_pos": np.asarray(transforms["body_pos"], dtype=np.float32)[start:end],
        "body_rot_xyzw": np.asarray(transforms["body_rot_xyzw"], dtype=np.float32)[start:end],
    }


def estimate_ground_z_stream(
    source_binding,
    transforms,
    mat_height: float,
    source_ground_align: str,
    to_smpl_frame: bool,
    chunk_size: int,
) -> float:
    mode = str(source_ground_align)
    if mode in {"none", "raw", "off", "false", "0"}:
        return 0.0
    if mode != "ground_min":
        raise ValueError(f"Unsupported source_ground_align={mode!r}")

    min_z = np.inf
    total = len(np.asarray(transforms["body_pos"]))
    for start in range(0, total, max(1, int(chunk_size))):
        chunk = slice_transforms(transforms, start, min(total, start + max(1, int(chunk_size))))
        source_slots, _source_normals = character_common.character_slots_to_world(
            source_binding,
            chunk,
            to_smpl_frame=to_smpl_frame,
        )
        min_z = min(min_z, float(source_slots[:, :, 2].min()))
    if not np.isfinite(min_z):
        return 0.0
    if min_z >= float(mat_height):
        min_z -= float(mat_height)
    return float(min_z)


def main():
    args = parse_args()
    if args.data is None or not Path(args.data).exists():
        raise FileNotFoundError(f"Character motion data not found: {args.data}")

    collection, source_format = character_common.load_mimickit_motion_collection(args.data)
    seq_key, sequence = character_common.select_sequence(collection, args.seq_key, args.seq_index)
    total_frames = len(np.asarray(sequence["frames"]))
    frame_ids = character_common.slice_frames(total_frames, args.start, args.end, args.stride, args.max_frames)
    fps = float(sequence.get("fps", 30.0)) / max(1, int(args.stride))
    source_format = str(sequence.get("source_format", source_format))
    print(
        f"[CharacterRetarget] source={args.data} format={source_format} "
        f"seq={seq_key} frames={len(frame_ids)} fps={fps:.3f}"
    )

    source = section(args.config_data, "source_character")
    source_to_smpl_frame = bool_value(source.get("to_smpl_frame"), True)
    source_frame_name = "smpl" if source_to_smpl_frame else "mujoco"
    source_center = str(source.get("point_cloud_center", robot_config(args.config_data)["point_cloud_center"]))
    source_template = character_common.build_character_surface_template(
        args.source_xml,
        source_center,
        visual_geom_policy=source.get("visual_geom_policy", "auto"),
        to_smpl_frame=source_to_smpl_frame,
    )
    transforms = character_common.motion_body_transforms(sequence, frame_ids, args.source_xml)
    source_joints_all = character_common.character_joints_smpl(transforms, to_smpl_frame=source_to_smpl_frame)

    source_slot_name = str(args.source_name)
    source_slots_tpose, source_center_mode, source_slot_name = common.load_slot_data(
        args.slots, source_slot_name, args.slots_field
    )
    robot_slots, _robot_center, robot_slot_name = common.load_slot_data(args.slots, args.robot_name, args.slots_field)
    if len(source_slots_tpose) != len(robot_slots):
        raise ValueError(f"Source slots={len(source_slots_tpose)} and robot slots={len(robot_slots)} differ.")

    source_binding = character_common.bind_character_slots(
        source_slots_tpose,
        source_template,
        nearest_vertex_k=args.bind_nearest_vertex_k,
        to_smpl_frame=source_to_smpl_frame,
    )
    stream_chunk_frames = max(0, int(args.stream_chunk_frames or 0))
    chunk_size = stream_chunk_frames if stream_chunk_frames > 0 else len(frame_ids)
    ground_z = estimate_ground_z_stream(
        source_binding,
        transforms,
        float(args.mat_height),
        str(args.source_ground_align),
        source_to_smpl_frame,
        max(1, chunk_size),
    )

    if float(args.source_height) > 0.0:
        human_height = float(args.source_height)
        source_height_mode = "configured"
    else:
        human_height, source_height_mode = source_height_from_points(
            source_template["vertices_smpl"],
            axis=args.source_height_axis,
        )
    robot_height, robot_height_mode, robot_height_field = resolve_character_robot_height(
        args,
        robot_slots,
        robot_slot_name,
    )
    source_scale = float(robot_height) / max(human_height, 1e-8)
    source_joints_all = source_joints_all.copy()
    source_joints_all[:, :, 2] -= ground_z
    source_joints_all *= source_scale
    print(
        f"[CharacterRetarget] source_height={human_height:.5f} robot_height={float(args.robot_height):.5f} "
        f"source_scale={source_scale:.6f} ground_z={ground_z:.5f} source_slots={source_slot_name} "
        f"center_mode={source_center_mode} source_frame={source_frame_name} "
        f"source_height_mode={source_height_mode} robot_height_mode={robot_height_mode} "
        f"stream_chunk_frames={stream_chunk_frames}"
    )

    source_slot_part_ids = np.asarray(source_binding["part_ids"], dtype=np.int32)
    uniform_cfg = uniform_surface_sample_config(args.config_data)
    use_uniform_surface_sample = bool_value(uniform_cfg.get("enabled"), False)
    if use_uniform_surface_sample:
        uniform_count = int(uniform_cfg.get("num_slots", 256))
        uniform_point_cost = float(uniform_cfg.get("point_cost", 1.0))
        uniform_normal_cost = float(uniform_cfg.get("normal_cost", 0.0))
        selected_slot_ids = sample_uniform_surface_slots(len(source_slots_tpose), uniform_count, args.seed)
        selected_segment_groups = {
            name: np.zeros(0, dtype=np.int32)
            for name in CHARACTER_SEGMENT_IDS
        }
        point_segment_costs = {
            name: uniform_point_cost
            for name in CHARACTER_SEGMENT_IDS
        }
        normal_segment_costs = {
            name: uniform_normal_cost
            for name in CHARACTER_SEGMENT_IDS
        }
        segment_sample_cfg = {
            name: 0
            for name in CHARACTER_SEGMENT_IDS
        }
        point_slot_costs = np.zeros(len(source_slots_tpose), dtype=np.float64)
        normal_slot_costs = np.zeros(len(source_slots_tpose), dtype=np.float64)
        point_slot_costs[selected_slot_ids] = uniform_point_cost
        normal_slot_costs[selected_slot_ids] = uniform_normal_cost
        if bool_value(uniform_cfg.get("disable_self_contact"), True):
            args.self_contact_map_cost = 0.0
        print(
            f"[CharacterRetarget][UniformSurface] selected_slots={len(selected_slot_ids)}/"
            f"{len(source_slots_tpose)} point_cost={uniform_point_cost:.4f} "
            f"normal_cost={uniform_normal_cost:.4f} "
            f"self_contact_map_cost={float(args.self_contact_map_cost):.4f}"
        )
    else:
        segment_groups = character_body_segment_slot_groups(source_slot_part_ids)
        print(
            f"[CharacterRetarget] character {character_body_segment_schema()} body segment slots: "
            + ", ".join(f"{name}={len(ids)}" for name, ids in segment_groups.items())
        )
        segment_sample_cfg = character_segment_sample_counts()
        selected_slot_ids, selected_segment_groups = sample_character_segment_slots(
            segment_groups,
            segment_sample_cfg,
            args.seed,
            log_prefix="CharacterRetarget",
        )
        point_segment_costs = character_segment_cost_values("point_cost")
        normal_segment_costs = character_segment_cost_values("normal_cost")
        point_slot_costs = character_surface_slot_costs_from_segments(
            len(source_slots_tpose),
            source_slot_part_ids,
            "point_cost",
            "SurfacePoint",
            log_prefix="CharacterRetarget",
        )
        normal_slot_costs = character_surface_slot_costs_from_segments(
            len(source_slots_tpose),
            source_slot_part_ids,
            "normal_cost",
            "SurfaceNormal",
            log_prefix="CharacterRetarget",
        )

    object_contact_source = None
    needs_object_contact = (
        float(args.object_contact_map_cost) > 0.0
        or bool(args.robot_object_hard_constraint)
        or float(args.robot_object_penetration_soft_cost) > 0.0
    )
    if needs_object_contact:
        object_source_slot_chunks = []
        for chunk_start in range(0, len(frame_ids), max(1, chunk_size)):
            chunk_end = min(len(frame_ids), chunk_start + max(1, chunk_size))
            chunk_transforms = slice_transforms(transforms, chunk_start, chunk_end)
            object_source_slots, _ = character_common.character_slots_to_world(
                source_binding,
                chunk_transforms,
                to_smpl_frame=source_to_smpl_frame,
            )
            object_source_slots = object_source_slots.copy()
            object_source_slots[:, :, 2] -= ground_z
            object_source_slots *= source_scale
            object_source_slot_chunks.append(object_source_slots.astype(np.float32))
        object_contact_source = base.load_object_contact_source(
            args,
            frame_ids,
            np.concatenate(object_source_slot_chunks, axis=0),
            source_scale,
            ground_z,
        )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    source_robot_xml = Path(args.robot_xml)
    robot_xml = base.prepare_robot_xml(args)
    model = mujoco.MjModel.from_xml_path(str(robot_xml))
    data_mj = mujoco.MjData(model)
    robot_self_penetration_cache = common.build_robot_self_penetration_cache(model, args)
    ground_penetration_collision_cache = common.build_ground_penetration_collision_cache(model, args)
    robot_object_penetration_cache = base.build_robot_object_penetration_cache(
        robot_xml,
        object_contact_source,
        model,
        args,
    )
    configured_limits = base.config_joint_limits(args.config_data)
    joint_limits_by_qpos, configured_limit_matches = common.build_scalar_joint_limits(model, configured_limits)
    print(
        f"[CharacterRetarget][JointLimit] configured={len(configured_limits)} "
        f"matched_same_name={len(configured_limit_matches)} scalar_joints={len(joint_limits_by_qpos)}"
    )
    robot_template = base.bind_robot_slots(
        model,
        args,
        robot_slots,
        nearest_vertex_k=args.bind_nearest_vertex_k,
        project_to_surface=bool(args.project_robot_slots),
    )
    robot = robot_config(args.config_data)

    def apply_config_tpose(_model, _data):
        base.apply_joint_qpos(
            _model,
            _data,
            base.config_joint_values(args.config_data, "tpose_qpos"),
            required=False,
        )
        base.apply_mimic_qpos(_model, _data, robot.get("mimic_qpos", {}) or {})

    surface_normal_cost_mode = str(args.surface_normal_cost_mode)
    tpose_surface_normal_offsets = np.zeros((0, 3), dtype=np.float32)
    robot_tpose_normals = np.zeros((0, 3), dtype=np.float32)
    if surface_normal_cost_mode == "tpose_offset":
        tpose_surface_normal_offsets, robot_tpose_normals = compute_character_tpose_surface_normal_offsets(
            model,
            robot_template,
            source_binding["tpose_normals_smpl"],
            apply_config_tpose,
            robot["point_cloud_center"],
            source_to_smpl_frame=source_to_smpl_frame,
            log_prefix="CharacterRetarget",
        )
        surface_normal_target_mode = "tpose_robot_normal_transported_by_character_body"
    elif surface_normal_cost_mode == "direct":
        print("[CharacterRetarget][SurfaceNormal] mode=direct: matching robot normals to current character slot normals.")
        surface_normal_target_mode = "direct_character_slot_normal"
    else:
        raise ValueError(f"Unknown --surface-normal-cost-mode {surface_normal_cost_mode!r}")

    joint_qpos_addrs, joint_dof_addrs, _joint_ranges, joint_names = common.scalar_qpos_joint_addrs(model)
    configured_dof_max_dq_box = base.config_dof_max_dq_box(args.config_data)
    args.dof_max_dq_box_by_dof, _configured_dof_max_dq_matches = common.build_dof_max_dq_box(
        model,
        configured_dof_max_dq_box,
    )
    print(f"[CharacterRetarget] scalar_joints={len(joint_names)} robot_xml={robot_xml}")

    mujoco.mj_resetData(model, data_mj)
    q_body_zero = data_mj.qpos.copy()
    q_body_zero[joint_qpos_addrs] = 0.0
    q_body_zero = common.clamp_joint_ranges(model, q_body_zero, joint_limits_by_qpos=joint_limits_by_qpos)
    qpos_seq = np.empty((len(frame_ids), model.nq), dtype=np.float32)
    costs = np.empty(len(frame_ids), dtype=np.float32)
    q_prev2 = None
    q_prev = None
    ground_contact_anchor_state = {}
    body_names = list(transforms["body_names"])

    use_batch_progress = batch_progress_enabled()
    emit_batch_progress(0, len(frame_ids))
    with tqdm(total=len(frame_ids), desc="[CharacterRetarget] retarget", disable=use_batch_progress) as progress:
        for chunk_start in range(0, len(frame_ids), max(1, chunk_size)):
            chunk_end = min(len(frame_ids), chunk_start + max(1, chunk_size))
            chunk_transforms = slice_transforms(transforms, chunk_start, chunk_end)
            source_slots, source_slot_normals = character_common.character_slots_to_world(
                source_binding,
                chunk_transforms,
                to_smpl_frame=source_to_smpl_frame,
            )
            source_slots = source_slots.copy()
            source_slots[:, :, 2] -= ground_z
            source_slots *= source_scale
            source_joints = source_joints_all[chunk_start:chunk_end]

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
                source_self_contact_maps = compute_character_source_self_contact_maps(
                    source_slots,
                    selected_slot_ids,
                    source_slot_part_ids,
                    threshold=float(args.self_contact_map_threshold),
                    max_pairs=int(args.self_contact_map_max_pairs),
                    log_prefix="CharacterRetarget",
                )

            if surface_normal_cost_mode == "tpose_offset":
                surface_normal_targets = character_common.character_tpose_normals_to_world_targets(
                    robot_tpose_normals,
                    source_binding,
                    chunk_transforms,
                    to_smpl_frame=source_to_smpl_frame,
                )
            else:
                surface_normal_targets = None

            for local_idx in range(chunk_end - chunk_start):
                out_idx = chunk_start + local_idx
                if q_prev is None:
                    q_init = q_body_zero.copy()
                    heading, pelvis = character_common.character_root_heading_wxyz(source_joints[local_idx], body_names)
                    q_init[:3] = pelvis
                    q_init[3:7] = heading
                else:
                    q_init = q_prev.copy()
                object_contact_frame = None
                if object_contact_source is not None:
                    object_contact_frame = {
                        "distances": object_contact_source["distances"][out_idx],
                        "object_ids": object_contact_source["object_ids"][out_idx],
                        "pair_vectors": object_contact_source["pair_vectors"][out_idx],
                        "object_points": object_contact_source["retarget_points_world"][out_idx],
                        "object_position": object_contact_source["motion_positions"][out_idx],
                        "object_quat_wxyz": object_contact_source["motion_quats_wxyz"][out_idx],
                    }
                q_opt, cost = base.solve_frame_body_segment_qp(
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
                qpos_seq[out_idx] = q_opt.astype(np.float32)
                costs[out_idx] = float(cost)
                q_prev2 = q_prev
                q_prev = q_opt
                progress.update(1)
                emit_batch_progress(out_idx + 1, len(frame_ids))

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
        "smpl_scale": np.asarray([source_scale], dtype=np.float32),
        "ground_z": np.asarray([ground_z], dtype=np.float32),
    }
    np.savez_compressed(args.out, **output_payload)
    print(
        f"[CharacterRetarget] saved {args.out} qpos={qpos_seq.shape} "
        f"cost mean={float(costs.mean()):.6f} max={float(costs.max()):.6f}"
    )


if __name__ == "__main__":
    main()

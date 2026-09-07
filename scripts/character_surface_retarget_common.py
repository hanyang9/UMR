#!/usr/bin/env python3
"""MimicKit character motion and surface helpers for character-source retargeting."""
from __future__ import annotations

import pickle
import sys
from pathlib import Path
from typing import Any

import mujoco
import numpy as np
import torch
import yaml

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from mimickit_compat import mjcf_char_model, torch_util  # noqa: E402
from mujoco_geom_surface import geom_local_mesh, surface_geom_ids  # noqa: E402
from mujoco_point_cloud_center import (  # noqa: E402
    bbox_ratio_center_frame,
    bbox_ratio_from_center_spec,
    point_cloud_center_frame,
)
from retarget_body_segment_surface_character import character_segment_id, normalize_vectors  # noqa: E402


def native_to_smpl_frame(points: np.ndarray) -> np.ndarray:
    points = np.asarray(points, dtype=np.float32)
    converted = np.empty_like(points)
    converted[..., 0] = points[..., 1]
    converted[..., 1] = points[..., 2]
    converted[..., 2] = points[..., 0]
    return converted


def smpl_to_native_frame(points: np.ndarray) -> np.ndarray:
    points = np.asarray(points, dtype=np.float32)
    converted = np.empty_like(points)
    converted[..., 0] = points[..., 2]
    converted[..., 1] = points[..., 0]
    converted[..., 2] = points[..., 1]
    return converted


def native_to_retarget_frame(points: np.ndarray, to_smpl_frame: bool = True) -> np.ndarray:
    if to_smpl_frame:
        return native_to_smpl_frame(points)
    return np.asarray(points, dtype=np.float32).copy()


def resolve_repo_path(path: str | Path, base: Path | None = None) -> Path:
    path = Path(path)
    if path.is_absolute():
        return path.resolve()
    if base is not None:
        candidate = (base / path).resolve()
        if candidate.exists():
            return candidate
    candidate = (ROOT / path).resolve()
    if candidate.exists():
        return candidate
    return (ROOT / path).resolve()


def path_relative_to_or_none(path: Path, root: Path) -> Path | None:
    try:
        return path.relative_to(root)
    except ValueError:
        return None


def load_mimickit_motion_file(path: str | Path) -> dict[str, Any]:
    path = resolve_repo_path(path)
    with path.open("rb") as stream:
        payload = pickle.load(stream)
    frames = np.asarray(payload["frames"], dtype=np.float32)
    return {
        "frames": frames,
        "fps": float(payload["fps"]),
        "loop_mode": int(payload.get("loop_mode", 0)),
        "source_format": "mimickit_motion_pkl",
        "source_file": str(path),
    }


def motion_files_from_dataset_yaml(path: str | Path) -> list[Path]:
    path = resolve_repo_path(path)
    with path.open("r") as stream:
        payload = yaml.safe_load(stream)
    motions = payload.get("motions", [])
    out = []
    for entry in motions:
        if isinstance(entry, dict) and entry.get("file"):
            out.append(resolve_repo_path(entry["file"], path.parent))
    return out


def motion_file_from_view_motion_env(path: str | Path) -> Path:
    path = resolve_repo_path(path)
    with path.open("r") as stream:
        payload = yaml.safe_load(stream)
    if "motion_file" not in payload:
        raise KeyError(f"{path} does not contain motion_file.")
    return resolve_repo_path(payload["motion_file"], path.parent)


def load_mimickit_motion_collection(path: str | Path):
    path = resolve_repo_path(path)
    if path.suffix.lower() in {".yaml", ".yml"}:
        with path.open("r") as stream:
            payload = yaml.safe_load(stream)
        if isinstance(payload, dict) and payload.get("env_name") == "view_motion":
            return load_mimickit_motion_collection(motion_file_from_view_motion_env(path))
        if isinstance(payload, dict) and "motions" in payload:
            motions = {}
            for file in motion_files_from_dataset_yaml(path):
                sequence = load_mimickit_motion_file(file)
                relative = path_relative_to_or_none(file, RMP_ROOT)
                rel_key = str(relative) if relative is not None else str(file)
                motions[file.stem] = sequence
                motions[rel_key] = sequence
            return motions, "mimickit_dataset_yaml"
    if path.suffix.lower() == ".pkl":
        sequence = load_mimickit_motion_file(path)
        return {path.stem: sequence}, "mimickit_motion_pkl"
    raise ValueError(f"Unsupported MimicKit motion source: {path}")


def select_sequence(data: dict[str, Any], seq_key: str | None, seq_index: int):
    keys = list(data.keys())
    if seq_key:
        if seq_key not in data:
            sample = ", ".join(keys[:8])
            raise KeyError(f"Sequence key {seq_key!r} not found. First keys: {sample}")
        return seq_key, data[seq_key]
    seq_index = int(seq_index)
    if seq_index < 0 or seq_index >= len(keys):
        raise IndexError(f"seq_index={seq_index} outside [0, {len(keys)})")
    return keys[seq_index], data[keys[seq_index]]


def slice_frames(num_frames: int, start: int, end: int, stride: int, max_frames: int):
    end = int(num_frames) if int(end) < 0 else min(int(end), int(num_frames))
    ids = np.arange(int(start), end, max(1, int(stride)), dtype=np.int32)
    if int(max_frames) > 0:
        ids = ids[: int(max_frames)]
    if len(ids) == 0:
        raise ValueError("No frames selected.")
    return ids


def load_mimickit_char_model(char_file: str | Path, device="cpu"):
    model = mjcf_char_model.MJCFCharModel(torch.device(device))
    model.load(str(resolve_repo_path(char_file)))
    return model


def motion_body_transforms(sequence: dict[str, Any], frame_ids: np.ndarray, char_file: str | Path):
    frames = np.asarray(sequence["frames"], dtype=np.float32)[np.asarray(frame_ids, dtype=np.int32)]
    char = load_mimickit_char_model(char_file, device="cpu")
    root_pos = torch.from_numpy(frames[:, 0:3]).float()
    root_rot = torch_util.exp_map_to_quat(torch.from_numpy(frames[:, 3:6]).float())
    dof = torch.from_numpy(frames[:, 6:]).float()
    joint_rot = char.dof_to_rot(dof)
    body_pos, body_rot = char.forward_kinematics(root_pos, root_rot, joint_rot)
    return {
        "body_names": list(char.get_body_names()),
        "body_pos": body_pos.detach().cpu().numpy().astype(np.float32),
        "body_rot_xyzw": body_rot.detach().cpu().numpy().astype(np.float32),
    }


def quat_xyzw_to_matrix(quat: np.ndarray) -> np.ndarray:
    quat_t = torch.from_numpy(np.asarray(quat, dtype=np.float32))
    return torch_util.quat_to_matrix(quat_t).detach().cpu().numpy().astype(np.float32)


def build_character_surface_template(
    xml_path: str | Path,
    point_cloud_center: str,
    visual_geom_policy="auto",
    to_smpl_frame: bool = True,
):
    xml_path = resolve_repo_path(xml_path)
    model = mujoco.MjModel.from_xml_path(str(xml_path))
    data = mujoco.MjData(model)
    mujoco.mj_resetData(model, data)
    mujoco.mj_forward(model, data)
    geom_ids = surface_geom_ids(model, visual_geom_policy)
    bbox_ratio = bbox_ratio_from_center_spec(point_cloud_center)
    if bbox_ratio is None:
        center_pos, center_rot, center_label = point_cloud_center_frame(
            model, data, point_cloud_center, xml_path
        )
    else:
        world_vertices = []
        for geom_id in geom_ids:
            local_v, _local_f = geom_local_mesh(model, int(geom_id))
            geom_rot = data.geom_xmat[geom_id].reshape(3, 3)
            geom_pos = data.geom_xpos[geom_id]
            world_vertices.append(np.asarray(local_v, dtype=np.float32) @ geom_rot.T + geom_pos)
        center_pos, center_rot, center_label = bbox_ratio_center_frame(
            np.concatenate(world_vertices, axis=0), bbox_ratio
        )

    vertices_native = []
    vertices_body = []
    faces = []
    face_geom_ids = []
    face_body_ids = []
    face_body_names = []
    vertex_body_names = []
    face_part_ids = []
    face_body_to_native_rot = []
    offset = 0
    for geom_id in geom_ids:
        geom_id = int(geom_id)
        body_id = int(model.geom_bodyid[geom_id])
        body_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, body_id) or ""
        geom_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_GEOM, geom_id) or ""
        local_v, local_f = geom_local_mesh(model, geom_id)
        geom_rot = data.geom_xmat[geom_id].reshape(3, 3)
        geom_pos = data.geom_xpos[geom_id]
        world_v = np.asarray(local_v, dtype=np.float32) @ geom_rot.T + geom_pos
        center_v = (world_v - center_pos) @ center_rot
        body_rot = data.xmat[body_id].reshape(3, 3)
        body_pos = data.xpos[body_id]
        body_v = (world_v - body_pos) @ body_rot
        body_to_native_rot = body_rot.T @ center_rot

        vertices_native.append(center_v.astype(np.float32))
        vertices_body.append(body_v.astype(np.float32))
        faces.append(np.asarray(local_f, dtype=np.int32) + offset)
        face_count = len(local_f)
        faces_label = f"{body_name} {geom_name}"
        face_geom_ids.append(np.full(face_count, geom_id, dtype=np.int32))
        face_body_ids.append(np.full(face_count, body_id, dtype=np.int32))
        face_body_names.extend([body_name] * face_count)
        vertex_body_names.extend([body_name] * len(local_v))
        face_part_ids.append(np.full(face_count, character_segment_id(faces_label), dtype=np.int32))
        face_body_to_native_rot.append(np.repeat(body_to_native_rot[None, :, :], face_count, axis=0).astype(np.float32))
        offset += len(local_v)

    if not vertices_native:
        raise RuntimeError(f"No surface geoms found in {xml_path}")

    vertices_native = np.concatenate(vertices_native, axis=0).astype(np.float32)
    vertices_body = np.concatenate(vertices_body, axis=0).astype(np.float32)
    faces = np.concatenate(faces, axis=0).astype(np.int32)
    return {
        "xml": xml_path,
        "model": model,
        "center_label": center_label,
        "vertices_native": vertices_native,
        "vertices_smpl": native_to_retarget_frame(vertices_native, to_smpl_frame=to_smpl_frame),
        "vertices_body": vertices_body,
        "faces": faces,
        "face_geom_ids": np.concatenate(face_geom_ids).astype(np.int32),
        "face_body_ids": np.concatenate(face_body_ids).astype(np.int32),
        "face_body_names": np.asarray(face_body_names, dtype=object),
        "vertex_body_names": np.asarray(vertex_body_names, dtype=object),
        "face_part_ids": np.concatenate(face_part_ids).astype(np.int32),
        "face_body_to_native_rot": np.concatenate(face_body_to_native_rot).astype(np.float32),
    }


def character_mesh_vertices_to_world(template, transforms, to_smpl_frame: bool = True):
    """Skin a rigid-body character surface mesh with MimicKit body transforms."""
    body_pos = np.asarray(transforms["body_pos"], dtype=np.float32)
    body_rot = quat_xyzw_to_matrix(np.asarray(transforms["body_rot_xyzw"], dtype=np.float32))
    motion_name_to_id = {str(name): idx for idx, name in enumerate(transforms["body_names"])}
    vertex_body_names = np.asarray(template["vertex_body_names"], dtype=str)
    missing = sorted({str(name) for name in vertex_body_names if str(name) not in motion_name_to_id})
    if missing:
        raise ValueError(f"Character mesh body names missing from motion transforms: {missing[:8]}")
    vertex_body_ids = np.asarray([motion_name_to_id[str(name)] for name in vertex_body_names], dtype=np.int32)
    local_vertices = np.asarray(template["vertices_body"], dtype=np.float32)
    vertices = np.empty((len(body_pos), len(local_vertices), 3), dtype=np.float32)
    for body_id in np.unique(vertex_body_ids):
        mask = vertex_body_ids == int(body_id)
        vertices[:, mask, :] = np.einsum(
            "vj,fkj->fvk",
            local_vertices[mask],
            body_rot[:, int(body_id)],
        ) + body_pos[:, int(body_id), None, :]
    return native_to_retarget_frame(vertices, to_smpl_frame=to_smpl_frame).astype(np.float32)


def bind_character_slots(slot_points_smpl, template, nearest_vertex_k=24, to_smpl_frame: bool = True):
    import smpl_surface_retarget_common as common

    binding = common.bind_points_to_mesh(
        np.asarray(slot_points_smpl, dtype=np.float32),
        template["vertices_smpl"],
        template["faces"],
        nearest_vertex_k=nearest_vertex_k,
    )
    face_ids = binding["face_ids"].astype(np.int32)
    faces = template["faces"][face_ids]
    body_ids = template["face_body_ids"][face_ids].astype(np.int32)
    body_names = template["face_body_names"][face_ids].astype(str)
    part_ids = template["face_part_ids"][face_ids].astype(np.int32)
    body_to_native_rot = template["face_body_to_native_rot"][face_ids].astype(np.float32)
    triangles_body = template["vertices_body"][faces]
    bary = binding["bary"].astype(np.float32)
    local_pos = np.einsum("nij,ni->nj", triangles_body, bary).astype(np.float32)
    normals_body = normalize_vectors(
        np.cross(triangles_body[:, 1] - triangles_body[:, 0], triangles_body[:, 2] - triangles_body[:, 0])
    ).astype(np.float32)
    tpose_normals_native = normalize_vectors(np.einsum("ni,nij->nj", normals_body, body_to_native_rot)).astype(np.float32)
    print(
        f"[CharacterRetarget] bound character source slots: slots={len(slot_points_smpl)}, "
        f"error_mean={float(binding['errors'].mean()):.5f}, p95={float(np.percentile(binding['errors'], 95)):.5f}"
    )
    return {
        "face_ids": face_ids,
        "body_ids": body_ids,
        "body_names": body_names,
        "part_ids": part_ids,
        "local_pos": local_pos,
        "local_normals": normals_body,
        "tpose_body_to_native_rot": body_to_native_rot,
        "tpose_normals_smpl": native_to_retarget_frame(tpose_normals_native, to_smpl_frame=to_smpl_frame),
        "binding": binding,
    }


def character_slots_to_world(binding, transforms, to_smpl_frame: bool = True):
    body_pos = np.asarray(transforms["body_pos"], dtype=np.float32)
    body_rot = quat_xyzw_to_matrix(np.asarray(transforms["body_rot_xyzw"], dtype=np.float32))
    name_to_id = {str(name): idx for idx, name in enumerate(transforms["body_names"])}
    binding_names = np.asarray(binding["body_names"], dtype=str)
    missing = sorted({str(name) for name in binding_names if str(name) not in name_to_id})
    if missing:
        raise ValueError(f"Character binding body names missing from motion body transforms: {missing[:8]}")
    body_ids = np.asarray([name_to_id[str(name)] for name in binding_names], dtype=np.int32)
    local_pos = np.asarray(binding["local_pos"], dtype=np.float32)
    local_normals = np.asarray(binding["local_normals"], dtype=np.float32)
    points = np.empty((len(body_pos), len(local_pos), 3), dtype=np.float32)
    normals = np.empty_like(points)
    for frame_idx in range(len(body_pos)):
        for body_id in np.unique(body_ids):
            mask = body_ids == int(body_id)
            rot = body_rot[frame_idx, int(body_id)]
            pos = body_pos[frame_idx, int(body_id)]
            points[frame_idx, mask] = local_pos[mask] @ rot.T + pos
            normals[frame_idx, mask] = local_normals[mask] @ rot.T
    return (
        native_to_retarget_frame(points, to_smpl_frame=to_smpl_frame),
        normalize_vectors(native_to_retarget_frame(normals, to_smpl_frame=to_smpl_frame)).astype(np.float32),
    )


def retarget_to_native_frame(points: np.ndarray, to_smpl_frame: bool = True) -> np.ndarray:
    if to_smpl_frame:
        return smpl_to_native_frame(points)
    return np.asarray(points, dtype=np.float32).copy()


def character_tpose_normals_to_world_targets(robot_tpose_normals_retarget, binding, transforms, to_smpl_frame: bool = True):
    robot_tpose_normals_native = retarget_to_native_frame(
        np.asarray(robot_tpose_normals_retarget, dtype=np.float32),
        to_smpl_frame=to_smpl_frame,
    )
    body_to_native_rot = np.asarray(binding["tpose_body_to_native_rot"], dtype=np.float32)
    robot_tpose_normals_body = normalize_vectors(
        np.einsum("ni,nji->nj", robot_tpose_normals_native, body_to_native_rot)
    ).astype(np.float32)

    body_rot = quat_xyzw_to_matrix(np.asarray(transforms["body_rot_xyzw"], dtype=np.float32))
    name_to_id = {str(name): idx for idx, name in enumerate(transforms["body_names"])}
    binding_names = np.asarray(binding["body_names"], dtype=str)
    missing = sorted({str(name) for name in binding_names if str(name) not in name_to_id})
    if missing:
        raise ValueError(f"Character normal binding body names missing from motion body transforms: {missing[:8]}")
    body_ids = np.asarray([name_to_id[str(name)] for name in binding_names], dtype=np.int32)

    targets_native = np.empty((len(body_rot), len(robot_tpose_normals_body), 3), dtype=np.float32)
    for frame_idx in range(len(body_rot)):
        for body_id in np.unique(body_ids):
            mask = body_ids == int(body_id)
            rot = body_rot[frame_idx, int(body_id)]
            targets_native[frame_idx, mask] = robot_tpose_normals_body[mask] @ rot.T
    return normalize_vectors(native_to_retarget_frame(targets_native, to_smpl_frame=to_smpl_frame)).astype(np.float32)


def character_joints_smpl(transforms, to_smpl_frame: bool = True):
    return native_to_retarget_frame(np.asarray(transforms["body_pos"], dtype=np.float32), to_smpl_frame=to_smpl_frame)


def character_root_heading_wxyz(joints_smpl: np.ndarray, body_names: list[str]) -> np.ndarray:
    names = {name: idx for idx, name in enumerate(body_names)}
    pelvis = joints_smpl[names.get("pelvis", 0)]
    left = joints_smpl[names.get("left_thigh", 0)] - joints_smpl[names.get("right_thigh", 0)]
    up = np.asarray([0.0, 0.0, 1.0], dtype=np.float64)
    left = np.asarray(left, dtype=np.float64)
    left[2] = 0.0
    if np.linalg.norm(left) < 1e-6:
        left = np.asarray([0.0, 1.0, 0.0], dtype=np.float64)
    left = left / np.linalg.norm(left)
    forward = np.cross(left, up)
    if np.linalg.norm(forward) < 1e-6:
        forward = np.asarray([1.0, 0.0, 0.0], dtype=np.float64)
    forward = forward / np.linalg.norm(forward)
    left = np.cross(up, forward)
    rot = np.stack([forward, left, up], axis=1)
    from scipy.spatial.transform import Rotation as R

    quat_xyzw = R.from_matrix(rot).as_quat()
    return np.asarray([quat_xyzw[3], quat_xyzw[0], quat_xyzw[1], quat_xyzw[2]], dtype=np.float64), pelvis

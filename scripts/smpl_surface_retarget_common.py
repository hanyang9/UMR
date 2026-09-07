#!/usr/bin/env python3
from __future__ import annotations

import gc
import io
import os
import sys
import zlib
from collections import OrderedDict
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

import clarabel
import joblib
import mujoco
import numpy as np
import smplx
import torch
import trimesh
from scipy import sparse
from scipy.sparse import linalg as sparse_linalg
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation as R

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from view_smpl_mujoco import dynamic_surface_template_to_world, model_faces  # noqa: E402
import soma_source  # noqa: E402
import nr_source  # noqa: E402
from smplx_model_loader import build_smplx_model as load_smplx_model  # noqa: E402


SMPLX_JOINT_IDS = {
    "Pelvis": 0,
    "L_Hip": 1,
    "R_Hip": 2,
    "Spine1": 3,
    "L_Knee": 4,
    "R_Knee": 5,
    "Spine2": 6,
    "L_Ankle": 7,
    "R_Ankle": 8,
    "Spine3": 9,
    "L_Foot": 10,
    "R_Foot": 11,
    "Neck": 12,
    "L_Collar": 13,
    "R_Collar": 14,
    "Head": 15,
    "L_Shoulder": 16,
    "R_Shoulder": 17,
    "L_Elbow": 18,
    "R_Elbow": 19,
    "L_Wrist": 20,
    "R_Wrist": 21,
}


def load_compressed_motion_pickle(path: Path):
    raw = Path(path).read_bytes()
    try:
        return joblib.load(io.BytesIO(zlib.decompress(raw)))
    except zlib.error:
        return joblib.load(path)


def _np_scalar(data, key, default):
    if key not in data:
        return default
    value = np.asarray(data[key])
    return value.item() if value.shape == () else value


def load_smplx_npz_motion(path: Path):
    data = np.load(path, allow_pickle=True)
    if "poses" in data:
        poses = np.asarray(data["poses"], dtype=np.float32)
        pose_aa = poses.reshape(poses.shape[0], -1)
    elif "pose_aa" in data:
        pose_aa = np.asarray(data["pose_aa"], dtype=np.float32).reshape(len(data["pose_aa"]), -1)
    elif "root_orient" in data and "pose_body" in data:
        root_orient = np.asarray(data["root_orient"], dtype=np.float32).reshape(-1, 3)
        body_pose = np.asarray(data["pose_body"], dtype=np.float32).reshape(root_orient.shape[0], -1)
        pose_aa = np.concatenate([root_orient, body_pose], axis=1)
    else:
        raise KeyError(f"{path} does not contain poses, pose_aa, or root_orient/pose_body.")

    trans = np.asarray(data.get("trans", data.get("trans_orig", np.zeros((len(pose_aa), 3)))), dtype=np.float32)
    trans = trans.reshape(len(pose_aa), 3)
    betas = np.asarray(data.get("betas", data.get("beta", np.zeros(10))), dtype=np.float32).reshape(-1)
    gender = str(_np_scalar(data, "gender", "neutral")).lower()
    fps = float(
        _np_scalar(
            data,
            "mocap_frame_rate",
            _np_scalar(data, "mocap_framerate", _np_scalar(data, "fps", 30.0)),
        )
    )
    output_up = str(_np_scalar(data, "samp_output_up", _np_scalar(data, "output_up", "z"))).lower()
    return {
        "pose_aa": pose_aa,
        "trans_orig": trans,
        "beta": betas,
        "gender": gender,
        "fps": fps,
        "output_up": output_up,
        "human_scale": float(_np_scalar(data, "human_scale", 1.0)),
        "human_scale_mode": str(_np_scalar(data, "human_scale_mode", "off")),
        "source_format": "smplx_npz",
        "source_file": str(path),
    }


def is_flat_smplx_sequence_dir(path: Path) -> bool:
    """Return whether ``path`` is an extracted SMPL-X sequence directory."""
    path = Path(path)
    pose_path = path / "poses.npy"
    if not pose_path.exists():
        pose_path = path / "smpl_pose_axis_angle.npy"
    trans_path = path / "transl.npy"
    if not trans_path.exists():
        trans_path = path / "trans.npy"
    return bool(path.is_dir() and pose_path.exists() and trans_path.exists() and (path / "betas.npy").exists())


def load_flat_smplx_sequence(path: Path):
    """Load the extracted ``*.npy`` layout used by OmniContact/Ruofei data."""
    path = Path(path)
    pose_path = path / "poses.npy"
    if not pose_path.exists():
        pose_path = path / "smpl_pose_axis_angle.npy"
    trans_path = path / "transl.npy"
    if not trans_path.exists():
        trans_path = path / "trans.npy"

    raw_poses = np.load(pose_path, allow_pickle=True)
    poses = np.asarray(raw_poses, dtype=np.float32).reshape(len(raw_poses), -1)
    trans = np.asarray(np.load(trans_path, allow_pickle=True), dtype=np.float32).reshape(len(poses), 3)
    betas = np.asarray(np.load(path / "betas.npy", allow_pickle=True), dtype=np.float32).reshape(-1)
    gender_path = path / "gender.npy"
    model_type_path = path / "model_type.npy"
    fps_path = path / "mocap_framerate.npy"
    output_up_path = path / "output_up.npy"
    scale_path = path / "scale.npy"
    gender = str(np.asarray(np.load(gender_path, allow_pickle=True)).reshape(-1)[0]) if gender_path.exists() else "neutral"
    model_type = str(np.asarray(np.load(model_type_path, allow_pickle=True)).reshape(-1)[0]).lower() if model_type_path.exists() else "smplx"
    fps = float(np.asarray(np.load(fps_path, allow_pickle=True)).reshape(-1)[0]) if fps_path.exists() else 30.0
    output_up = str(np.asarray(np.load(output_up_path, allow_pickle=True)).reshape(-1)[0]).lower() if output_up_path.exists() else "z"
    human_scale = float(np.asarray(np.load(scale_path, allow_pickle=True)).reshape(-1)[0]) if scale_path.exists() else 1.0
    if model_type != "smplx":
        raise ValueError(f"Expected SMPL-X sequence, got model_type={model_type!r}: {path}")
    if poses.shape[0] != trans.shape[0]:
        raise ValueError(f"Frame count mismatch in {path}: poses={poses.shape}, trans={trans.shape}")
    return {
        "pose_aa": poses,
        "trans_orig": trans,
        "beta": betas,
        "gender": gender.lower(),
        "fps": fps,
        "output_up": output_up,
        "human_scale": human_scale,
        "human_scale_mode": "off",
        "source_format": "smplx_npy_sequence",
        "source_file": str(path),
    }


def load_motion_collection(path: Path):
    path = Path(path)
    if path.is_dir():
        if nr_source.is_nr_root(path):
            return nr_source.load_nr_motion_collection(path)
        if is_flat_smplx_sequence_dir(path):
            sequence = load_flat_smplx_sequence(path)
            return {path.name: sequence, path.stem: sequence}, "smplx_npy_sequence"
        files = sorted([*path.glob("*.npz"), *path.glob("*.bvh")])
        if not files:
            raise FileNotFoundError(f"No .npz or .bvh motion files found in {path}.")
        motions = {}
        for file in files:
            sequence = load_soma_bvh_motion(file) if file.suffix.lower() == ".bvh" else load_smplx_npz_motion(file)
            motions[file.stem] = sequence
            motions[file.name] = sequence
        return motions, "motion_dir"
    if path.suffix.lower() == ".npz":
        return {path.stem: load_smplx_npz_motion(path)}, "smplx_npz"
    if path.suffix.lower() == ".bvh":
        return {path.stem: load_soma_bvh_motion(path)}, "soma_bvh"
    return load_compressed_motion_pickle(path), "compressed_smpl_joblib"


def load_soma_bvh_motion(path: Path, soma_usd_path=None):
    return soma_source.load_soma_bvh_motion(path, soma_usd_path=soma_usd_path)


def select_sequence(data, seq_key, seq_index):
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


def slice_frames(num_frames, start, end, stride, max_frames):
    end = num_frames if int(end) < 0 else min(int(end), num_frames)
    ids = np.arange(int(start), end, max(1, int(stride)), dtype=np.int32)
    if int(max_frames) > 0:
        ids = ids[: int(max_frames)]
    if len(ids) == 0:
        raise ValueError("No frames selected.")
    return ids


def sequence_frame_count(sequence):
    if is_nr_sequence(sequence):
        return nr_source.sequence_frame_count(sequence)
    return soma_source.sequence_frame_count(sequence)


def is_soma_sequence(sequence) -> bool:
    return str(sequence.get("source_format", "")).startswith("soma")


def is_nr_sequence(sequence) -> bool:
    return str(sequence.get("source_format", "")).startswith("nr_fbx")


def source_model_type(sequence, template_cfg=None) -> str:
    if template_cfg is not None and str(template_cfg.get("type", "")).lower() == "nr_fbx":
        return "nr_fbx"
    if is_nr_sequence(sequence):
        return "nr_fbx"
    if template_cfg is not None and str(template_cfg.get("type", "")).lower() == "soma":
        return "soma"
    return "soma" if is_soma_sequence(sequence) else "smplx"


SOMA_TO_RETARGET_FRAME_MATRIX = np.asarray(
    [
        [0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
    ],
    dtype=np.float32,
)
Y_UP_TO_Z_UP_MATRIX = np.asarray(
    [
        [1.0, 0.0, 0.0],
        [0.0, 0.0, -1.0],
        [0.0, 1.0, 0.0],
    ],
    dtype=np.float32,
)


def source_points_to_retarget_frame(points, source_type="smplx", source_up="z"):
    points = np.asarray(points, dtype=np.float32)
    if str(source_type).lower() == "soma":
        return points @ SOMA_TO_RETARGET_FRAME_MATRIX.T
    if str(source_up).lower() == "y":
        return points @ Y_UP_TO_Z_UP_MATRIX.T
    return points


def resolve_torch_device(device="auto"):
    requested = str(device or "auto").lower()
    if requested.startswith("cuda:"):
        requested = "cuda"
    if requested == "auto":
        requested = "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        print("[SurfaceRetarget][SMPLX] CUDA unavailable; falling back to CPU.")
        requested = "cpu"
    if requested not in {"cpu", "cuda"}:
        raise ValueError(f"Unsupported SMPL-X device: {device!r}")
    if requested == "cuda":
        return torch.device("cuda", torch.cuda.current_device())
    return torch.device(requested)


def build_smplx_model(model_dir: Path, gender: str, batch_size: int, device="cpu"):
    model = load_smplx_model(model_dir, gender, batch_size)
    return model.to(resolve_torch_device(device))


def coerce_smpl_betas(betas, num_betas=10):
    if betas is None:
        return None
    betas = np.asarray(betas, dtype=np.float32).reshape(-1)[: int(num_betas)]
    betas = np.pad(betas, (0, max(0, int(num_betas) - len(betas))))[: int(num_betas)]
    return betas.astype(np.float32)


def zero_pose_vertices_and_joints(model, betas=None):
    betas = coerce_smpl_betas(betas, 10)
    kwargs = {}
    device = next(model.parameters()).device
    if betas is not None:
        kwargs["betas"] = torch.from_numpy(betas[None, :]).to(device)
    with torch.no_grad():
        out = model(return_verts=True, **kwargs)
    return (
        out.vertices[0].detach().cpu().numpy().astype(np.float32),
        out.joints[0].detach().cpu().numpy().astype(np.float32),
    )


def center_smplx_template(vertices, joints, center_mode):
    vertices = np.asarray(vertices, dtype=np.float32).copy()
    joints = np.asarray(joints, dtype=np.float32).copy()
    center_mode = str(center_mode)
    if center_mode == "spine1":
        center = joints[SMPLX_JOINT_IDS["Spine1"]]
    elif center_mode == "pelvis":
        center = joints[SMPLX_JOINT_IDS["Pelvis"]]
    elif center_mode == "model_origin":
        center = np.zeros(3, dtype=np.float32)
    elif center_mode.startswith("bbox_ratio_"):
        ratio = float(center_mode.rsplit("_", 1)[-1])
        bbox_min = vertices.min(axis=0)
        bbox_max = vertices.max(axis=0)
        center = 0.5 * (bbox_min + bbox_max)
        center[1] = bbox_min[1] + ratio * (bbox_max[1] - bbox_min[1])
    else:
        print(f"[SurfaceRetarget][WARN] unknown center_mode={center_mode!r}; using model origin.")
        center = np.zeros(3, dtype=np.float32)
    return vertices - center[None, :], joints - center[None, :], center


def center_source_template(vertices, joints, center_mode, joint_names=None, source_type="smplx"):
    source_type = str(source_type).lower()
    if source_type == "smplx":
        return center_smplx_template(vertices, joints, center_mode)
    vertices = np.asarray(vertices, dtype=np.float32).copy()
    joints = np.asarray(joints, dtype=np.float32).copy()
    center_mode = str(center_mode)
    if center_mode == "model_origin":
        center = np.zeros(3, dtype=np.float32)
    elif center_mode.startswith("bbox_ratio_"):
        ratio = float(center_mode.rsplit("_", 1)[-1])
        bbox_min = vertices.min(axis=0)
        bbox_max = vertices.max(axis=0)
        center = 0.5 * (bbox_min + bbox_max)
        center[1] = bbox_min[1] + ratio * (bbox_max[1] - bbox_min[1])
    elif center_mode in {"pelvis", "hips"}:
        center = joints[soma_source.soma_joint_index(joint_names or [], "Hips", "Root")]
    elif center_mode == "spine1":
        center = joints[soma_source.soma_joint_index(joint_names or [], "Spine1", "Hips")]
    else:
        print(f"[SurfaceRetarget][WARN] unknown source center_mode={center_mode!r}; using model origin.")
        center = np.zeros(3, dtype=np.float32)
    return vertices - center[None, :], joints - center[None, :], center.astype(np.float32)


_SMPLX_BATCH_PROBE_CACHE = {}
# These caches intentionally live at module scope. The batch pipeline keeps a
# small number of GPU feeder processes alive, so the expensive SMPL-X module and
# CUDA context can be reused across chunks and motions.
_SMPLX_MODEL_CACHE = OrderedDict()
_SMPLX_MODEL_CACHE_MAX = max(1, int(os.environ.get("UMR_SMPLX_MODEL_CACHE_MAX", "2")))
_SMPLX_RUNTIME_BATCH_LIMIT = {}


def _smplx_model_cache_key(model_dir, gender, batch_size, device):
    return (
        str(Path(model_dir).resolve()),
        str(gender).lower(),
        int(batch_size),
        str(resolve_torch_device(device)),
    )


def cached_smplx_model(model_dir, gender, batch_size, device="cpu"):
    key = _smplx_model_cache_key(model_dir, gender, batch_size, device)
    model = _SMPLX_MODEL_CACHE.pop(key, None)
    if model is None:
        model = build_smplx_model(model_dir, gender, int(batch_size), device=device)
        print(
            f"[SurfaceRetarget][SMPLXCache] build gender={str(gender).lower()} "
            f"batch_size={int(batch_size)} device={key[-1]}"
        )
    _SMPLX_MODEL_CACHE[key] = model
    while len(_SMPLX_MODEL_CACHE) > _SMPLX_MODEL_CACHE_MAX:
        _old_key, old_model = _SMPLX_MODEL_CACHE.popitem(last=False)
        del old_model
        clear_cuda_memory()
    return model


def drop_cached_smplx_model(model_dir, gender, batch_size, device="cpu"):
    key = _smplx_model_cache_key(model_dir, gender, batch_size, device)
    model = _SMPLX_MODEL_CACHE.pop(key, None)
    if model is not None:
        del model


def _is_cuda_oom(error):
    return isinstance(error, torch.cuda.OutOfMemoryError) or "out of memory" in str(error).lower()


def clear_cuda_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def _smplx_forward_trial(model_dir, gender, batch_size, device):
    batch_size = int(batch_size)
    model = build_smplx_model(model_dir, gender, batch_size, device=device)
    pose = torch.zeros((batch_size, 66), dtype=torch.float32, device=device)
    betas = torch.zeros((batch_size, 10), dtype=torch.float32, device=device)
    transl = torch.zeros((batch_size, 3), dtype=torch.float32, device=device)
    hand = torch.zeros((batch_size, 45), dtype=torch.float32, device=device)
    with torch.no_grad():
        out = model(
            global_orient=pose[:, :3],
            body_pose=pose[:, 3:66],
            betas=betas,
            transl=transl,
            left_hand_pose=hand,
            right_hand_pose=hand,
            return_verts=True,
        )
        _ = out.vertices.shape, out.joints.shape
    if device.type == "cuda":
        torch.cuda.synchronize(device)


def probe_smplx_batch_size(model_dir, gender="neutral", max_batch_size=10000, device="cuda"):
    """Find the largest forward batch that currently fits on the selected CUDA device."""
    device = resolve_torch_device(device)
    max_batch_size = max(1, min(10000, int(max_batch_size)))
    if device.type != "cuda":
        return {
            "device": str(device),
            "max_batch_size": max_batch_size,
            "tested_limit": max_batch_size,
            "limit_oom": False,
        }
    cache_key = (str(Path(model_dir).resolve()), str(gender).lower(), str(device), max_batch_size)
    if cache_key in _SMPLX_BATCH_PROBE_CACHE:
        return dict(_SMPLX_BATCH_PROBE_CACHE[cache_key])

    def cache_result(result):
        _SMPLX_BATCH_PROBE_CACHE[cache_key] = dict(result)
        return result

    def fits(count):
        clear_cuda_memory()
        try:
            _smplx_forward_trial(model_dir, gender, count, device)
            return True
        except RuntimeError as error:
            if not _is_cuda_oom(error):
                raise
            return False
        finally:
            clear_cuda_memory()

    if fits(max_batch_size):
        return cache_result({
            "device": str(device),
            "max_batch_size": max_batch_size,
            "tested_limit": max_batch_size,
            "limit_oom": False,
        })

    low = 0
    high = max_batch_size
    while low + 1 < high:
        candidate = (low + high) // 2
        if fits(candidate):
            low = candidate
        else:
            high = candidate
    if low == 0:
        raise RuntimeError("SMPL-X CUDA forward OOM even at batch_size=1.")
    return cache_result({
        "device": str(device),
        "max_batch_size": low,
        "tested_limit": max_batch_size,
        "limit_oom": True,
    })


def smplx_motion_vertices_joints(
    sequence,
    frame_ids,
    model_dir,
    batch_size=32,
    device="cpu",
    smplx_batch_size=None,
    smplx_batch_size_max=10000,
    smplx_batch_size_safety_factor=0.8,
):
    gender = str(sequence.get("gender", "neutral")).lower()
    pose_aa = np.asarray(sequence["pose_aa"], dtype=np.float32)[frame_ids]
    transl = np.asarray(sequence.get("trans_orig", np.zeros((len(pose_aa), 3))), dtype=np.float32)[frame_ids]
    betas = np.asarray(sequence.get("beta", np.zeros(10)), dtype=np.float32).reshape(-1)[:10]
    betas = np.pad(betas, (0, max(0, 10 - len(betas))))[:10]
    device = resolve_torch_device(device)
    runtime_key = (str(Path(model_dir).resolve()), gender, str(device))
    requested_batch_size = int(smplx_batch_size or 0)
    if requested_batch_size <= 0 and device.type == "cuda":
        configured_limit = max(1, min(10000, int(smplx_batch_size_max)))
        probe_limit = configured_limit if len(frame_ids) > int(batch_size) else min(len(frame_ids), configured_limit)
        probe = probe_smplx_batch_size(
            model_dir,
            gender=gender,
            max_batch_size=probe_limit,
            device=device,
        )
        if probe["limit_oom"]:
            safety = float(np.clip(smplx_batch_size_safety_factor, 0.05, 1.0))
            batch_size = max(1, int(probe["max_batch_size"] * safety))
        else:
            safety = 1.0
            batch_size = probe["max_batch_size"]
        print(
            f"[SurfaceRetarget][SMPLXCUDA] feasible_batch={probe['max_batch_size']} "
            f"safe_batch={batch_size} safety={safety:.2f} tested_limit={probe_limit} "
            f"limit_oom={probe['limit_oom']}"
        )
    elif requested_batch_size > 0:
        batch_size = min(requested_batch_size, max(1, int(smplx_batch_size_max)))
    if device.type == "cuda" and runtime_key in _SMPLX_RUNTIME_BATCH_LIMIT:
        batch_size = min(batch_size, int(_SMPLX_RUNTIME_BATCH_LIMIT[runtime_key]))
    batch_size = max(1, min(int(batch_size), len(frame_ids)))
    print(f"[SurfaceRetarget][SMPLX] device={device} batch_size={batch_size} frames={len(frame_ids)}")

    vertices = []
    joints = []
    faces = None
    def cached_model(count):
        return cached_smplx_model(model_dir, gender, int(count), device=device)

    start = 0
    active_batch_size = batch_size
    while start < len(frame_ids):
        end = min(start + active_batch_size, len(frame_ids))
        bs = end - start
        try:
            model = cached_model(bs)
            faces = np.asarray(model.faces, dtype=np.int32)
            pose = torch.from_numpy(pose_aa[start:end]).to(device)
            batch_betas = torch.from_numpy(np.repeat(betas[None, :], bs, axis=0).astype(np.float32)).to(device)
            batch_trans = torch.from_numpy(transl[start:end]).to(device)
            zeros_hand = torch.zeros((bs, 45), dtype=torch.float32, device=device)
            with torch.no_grad():
                out = model(
                    global_orient=pose[:, 0:3],
                    body_pose=pose[:, 3:66],
                    betas=batch_betas,
                    transl=batch_trans,
                    left_hand_pose=zeros_hand,
                    right_hand_pose=zeros_hand,
                    return_verts=True,
                )
        except RuntimeError as error:
            if device.type != "cuda" or not _is_cuda_oom(error) or active_batch_size <= 1:
                raise
            failed_batch_size = bs
            active_batch_size = max(1, active_batch_size // 2)
            drop_cached_smplx_model(model_dir, gender, failed_batch_size, device=device)
            previous_limit = int(_SMPLX_RUNTIME_BATCH_LIMIT.get(runtime_key, active_batch_size))
            _SMPLX_RUNTIME_BATCH_LIMIT[runtime_key] = min(previous_limit, active_batch_size)
            clear_cuda_memory()
            print(
                f"[SurfaceRetarget][SMPLXCUDA][WARN] OOM at batch_size={failed_batch_size}; "
                f"retrying with batch_size={active_batch_size}."
            )
            continue
        batch_vertices = out.vertices.detach().cpu().numpy().astype(np.float32)
        batch_joints = out.joints.detach().cpu().numpy().astype(np.float32)
        del out, pose, batch_betas, batch_trans, zeros_hand
        human_scale = float(sequence.get("human_scale", 1.0))
        human_scale_mode = str(sequence.get("human_scale_mode", "off")).lower()
        if human_scale_mode == "local" and not np.isclose(human_scale, 1.0):
            origin = transl[start:end, None, :]
            batch_vertices = (batch_vertices - origin) * human_scale + origin
            batch_joints = (batch_joints - origin) * human_scale + origin
        elif human_scale_mode == "world" and not np.isclose(human_scale, 1.0):
            batch_vertices *= human_scale
            batch_joints *= human_scale
        vertices.append(batch_vertices)
        joints.append(batch_joints)
        start = end
    return np.concatenate(vertices, axis=0), np.concatenate(joints, axis=0), faces


def source_motion_vertices_joints(
    sequence,
    frame_ids,
    model_dir,
    batch_size=32,
    soma_usd_path=None,
    zero_source_finger_pose=False,
    smplx_device="cpu",
    smplx_batch_size=None,
    smplx_batch_size_max=10000,
    smplx_batch_size_safety_factor=0.8,
):
    if is_nr_sequence(sequence):
        return nr_source.motion_vertices_joints(sequence, frame_ids)
    if is_soma_sequence(sequence):
        return soma_source.soma_motion_vertices_joints(
            sequence,
            frame_ids,
            soma_usd_path=soma_usd_path,
            batch_size=batch_size,
            zero_fingers=zero_source_finger_pose,
        )
    return smplx_motion_vertices_joints(
        sequence,
        frame_ids,
        model_dir,
        batch_size=batch_size,
        device=smplx_device,
        smplx_batch_size=smplx_batch_size,
        smplx_batch_size_max=smplx_batch_size_max,
        smplx_batch_size_safety_factor=smplx_batch_size_safety_factor,
    )


def source_template_vertices_joints_faces(sequence, template_cfg, smplx_model_dir, soma_usd_path=None):
    source_type = source_model_type(sequence, template_cfg)
    if source_type == "nr_fbx":
        vertices, joints, faces, joint_names = nr_source.template_vertices_joints_faces(sequence)
        return vertices, joints, faces, joint_names, source_type
    if source_type == "soma":
        use_sequence_template = False
        if sequence is not None and str(template_cfg.get("source", "motion")) == "motion":
            sequence_name = soma_source.soma_template_name_for_sequence(sequence, fallback="soma")
            use_sequence_template = bool(soma_source.is_boneseed_sequence(sequence)) and str(template_cfg.get("name", "")) == sequence_name
        sequence_for_template = sequence if use_sequence_template else None
        vertices, joints, faces, template = soma_source.soma_template_vertices_joints_faces(
            soma_usd_path
            or template_cfg.get("soma_usd_path")
            or (sequence.get("soma_usd_path") if sequence is not None else None),
            sequence=sequence_for_template,
        )
        return vertices, joints, faces, list(template["joint_short_names"]), source_type
    gender = str(template_cfg.get("gender", sequence.get("gender", "neutral"))).lower()
    model = build_smplx_model(smplx_model_dir, gender, 1)
    vertices, joints = zero_pose_vertices_and_joints(model, betas=template_cfg.get("betas"))
    return vertices, joints, np.asarray(model.faces, dtype=np.int32), None, "smplx"


def preprocess_smplx_ground_for_retarget(vertices, joints, mat_height, source_ground_align="global_foot_joint"):
    vertices = np.asarray(vertices, dtype=np.float32).copy()
    joints = np.asarray(joints, dtype=np.float32).copy()
    source_ground_align = str(source_ground_align)
    if source_ground_align in {"none", "raw", "off", "false", "0"}:
        return vertices, joints, 0.0
    if source_ground_align != "global_foot_joint":
        raise ValueError(f"Unsupported source_ground_align={source_ground_align!r}")
    toe_ids = [SMPLX_JOINT_IDS["L_Foot"], SMPLX_JOINT_IDS["R_Foot"]]
    z_shift = float(joints[:, toe_ids, 2].min())
    if z_shift >= float(mat_height):
        z_shift -= float(mat_height)
    vertices[:, :, 2] -= z_shift
    joints[:, :, 2] -= z_shift
    return vertices, joints, z_shift


def preprocess_source_ground_for_retarget(vertices, joints, mat_height, source_ground_align="global_foot_joint", joint_names=None):
    if joint_names is None:
        return preprocess_smplx_ground_for_retarget(vertices, joints, mat_height, source_ground_align)
    vertices = np.asarray(vertices, dtype=np.float32).copy()
    joints = np.asarray(joints, dtype=np.float32).copy()
    source_ground_align = str(source_ground_align)
    if source_ground_align in {"none", "raw", "off", "false", "0"}:
        return vertices, joints, 0.0
    if source_ground_align != "global_foot_joint":
        raise ValueError(f"Unsupported source_ground_align={source_ground_align!r}")
    toe_ids = [
        soma_source.soma_joint_index(joint_names, "LeftToeBase", "LeftFoot"),
        soma_source.soma_joint_index(joint_names, "RightToeBase", "RightFoot"),
    ]
    z_shift = float(joints[:, toe_ids, 2].min())
    if z_shift >= float(mat_height):
        z_shift -= float(mat_height)
    vertices[:, :, 2] -= z_shift
    joints[:, :, 2] -= z_shift
    return vertices, joints, z_shift


def load_slot_data(slots_path, name, field):
    data = np.load(slots_path, allow_pickle=True)
    names = data["names"].astype(str).tolist()
    if name == "auto":
        name = "smplx_neutral" if "smplx_neutral" in names else names[0]
    if name not in names:
        raise ValueError(f"Slot sample {name!r} not found in {names}")
    idx = names.index(name)
    center_modes = data["center_modes"].astype(str) if "center_modes" in data else np.asarray(["unknown"] * len(names))
    return data[field][idx].astype(np.float32), str(center_modes[idx]), name


def bind_points_to_mesh(points, vertices, faces, nearest_vertex_k=24):
    points = np.asarray(points, dtype=np.float32)
    vertices = np.asarray(vertices, dtype=np.float32)
    faces = np.asarray(faces, dtype=np.int32)

    vertex_to_faces = [[] for _ in range(len(vertices))]
    for face_id, face in enumerate(faces):
        for vertex_id in face:
            vertex_to_faces[int(vertex_id)].append(face_id)

    tree = cKDTree(vertices)
    k = min(int(nearest_vertex_k), len(vertices))
    _, nearest_vertices = tree.query(points, k=k)
    nearest_vertices = np.atleast_2d(nearest_vertices)
    if nearest_vertices.shape[0] != len(points):
        nearest_vertices = nearest_vertices.T

    face_ids = np.empty(len(points), dtype=np.int32)
    bary = np.empty((len(points), 3), dtype=np.float32)
    closest_points = np.empty_like(points, dtype=np.float32)
    closest_normals = np.empty_like(points, dtype=np.float32)
    errors = np.empty(len(points), dtype=np.float32)
    for point_id, point in enumerate(points):
        candidate_faces = set()
        for vertex_id in nearest_vertices[point_id]:
            candidate_faces.update(vertex_to_faces[int(vertex_id)])
        if not candidate_faces:
            candidate_faces.add(0)
        candidate_faces = np.fromiter(candidate_faces, dtype=np.int32)
        triangles = vertices[faces[candidate_faces]]
        query = np.repeat(point[None, :], len(triangles), axis=0)
        closest = trimesh.triangles.closest_point(triangles, query)
        dist2 = np.sum((closest - point[None, :]) ** 2, axis=1)
        best = int(np.argmin(dist2))
        face_id = int(candidate_faces[best])
        triangle = vertices[faces[face_id]]
        face_ids[point_id] = face_id
        closest_points[point_id] = closest[best]
        bary[point_id] = barycentric_coordinates(closest[best], triangle)
        normal = np.cross(triangle[1] - triangle[0], triangle[2] - triangle[0])
        closest_normals[point_id] = normal / max(float(np.linalg.norm(normal)), 1e-12)
        errors[point_id] = np.sqrt(dist2[best])
    return {
        "face_ids": face_ids,
        "bary": bary,
        "closest_points": closest_points,
        "closest_normals": closest_normals,
        "errors": errors,
    }


def barycentric_coordinates(point, triangle):
    a, b, c = triangle
    v0 = b - a
    v1 = c - a
    v2 = point - a
    d00 = float(np.dot(v0, v0))
    d01 = float(np.dot(v0, v1))
    d11 = float(np.dot(v1, v1))
    d20 = float(np.dot(v2, v0))
    d21 = float(np.dot(v2, v1))
    denom = d00 * d11 - d01 * d01
    if abs(denom) < 1e-12:
        return np.asarray([1.0, 0.0, 0.0], dtype=np.float32)
    vv = (d11 * d20 - d01 * d21) / denom
    ww = (d00 * d21 - d01 * d20) / denom
    uu = 1.0 - vv - ww
    out = np.clip(np.asarray([uu, vv, ww], dtype=np.float32), 0.0, 1.0)
    return out / max(float(out.sum()), 1e-12)


def template_points_to_world(data, template, point_ids):
    geom_ids = template["geom_ids"][point_ids]
    local_pos = template["local_pos"][point_ids]
    points = np.empty_like(local_pos, dtype=np.float64)
    for geom_id in np.unique(geom_ids):
        mask = geom_ids == geom_id
        rot = data.geom_xmat[int(geom_id)].reshape(3, 3)
        pos = data.geom_xpos[int(geom_id)]
        points[mask] = local_pos[mask] @ rot.T + pos
    return points


def template_points_world_z(data, template, point_ids):
    point_ids = np.asarray(point_ids, dtype=np.int32).reshape(-1)
    geom_ids = template["geom_ids"][point_ids]
    local_pos = template["local_pos"][point_ids]
    z = np.empty(point_ids.shape[0], dtype=np.float64)
    for geom_id in np.unique(geom_ids):
        mask = geom_ids == geom_id
        rot = data.geom_xmat[int(geom_id)].reshape(3, 3)
        pos_z = float(data.geom_xpos[int(geom_id), 2])
        z_axis = rot[2]
        z[mask] = local_pos[mask] @ z_axis + pos_z
    return z


class TemplateSlotKinematicsCache:
    """Per-linearization cache for template slot world kinematics."""

    def __init__(self, model, data, template):
        self.model = model
        self.data = data
        self.template = template
        self._points = {}
        self._point_z = {}
        self._normals = {}
        self._jacobians = {}
        self._normal_jacobians = {}

    def points(self, point_ids):
        point_ids = np.asarray(point_ids, dtype=np.int32).reshape(-1)
        missing = np.asarray(
            [int(slot_id) for slot_id in point_ids if int(slot_id) not in self._points],
            dtype=np.int32,
        )
        if missing.size > 0:
            points = template_points_to_world(self.data, self.template, missing)
            for slot_id, point in zip(missing, points):
                self._points[int(slot_id)] = np.asarray(point, dtype=np.float64)
                self._point_z[int(slot_id)] = float(point[2])
        return np.asarray([self._points[int(slot_id)] for slot_id in point_ids], dtype=np.float64)

    def point(self, slot_id):
        slot_id = int(slot_id)
        if slot_id not in self._points:
            self.points(np.asarray([slot_id], dtype=np.int32))
        return self._points[slot_id]

    def points_z(self, point_ids):
        point_ids = np.asarray(point_ids, dtype=np.int32).reshape(-1)
        missing = np.asarray(
            [
                int(slot_id)
                for slot_id in point_ids
                if int(slot_id) not in self._point_z and int(slot_id) not in self._points
            ],
            dtype=np.int32,
        )
        if missing.size > 0:
            values = template_points_world_z(self.data, self.template, missing)
            for slot_id, value in zip(missing, values):
                self._point_z[int(slot_id)] = float(value)
        return np.asarray(
            [
                float(self._points[int(slot_id)][2])
                if int(slot_id) in self._points
                else float(self._point_z[int(slot_id)])
                for slot_id in point_ids
            ],
            dtype=np.float64,
        )

    def point_z(self, slot_id):
        return float(self.points_z(np.asarray([int(slot_id)], dtype=np.int32))[0])

    def normals(self, point_ids):
        point_ids = np.asarray(point_ids, dtype=np.int32).reshape(-1)
        missing = np.asarray(
            [int(slot_id) for slot_id in point_ids if int(slot_id) not in self._normals],
            dtype=np.int32,
        )
        if missing.size > 0:
            geom_ids = self.template["geom_ids"][missing]
            local_normals = self.template["local_normals"][missing]
            normals = np.empty_like(local_normals, dtype=np.float64)
            for geom_id in np.unique(geom_ids):
                mask = geom_ids == geom_id
                rot = self.data.geom_xmat[int(geom_id)].reshape(3, 3)
                normals[mask] = local_normals[mask] @ rot.T
            norms = np.linalg.norm(normals, axis=1, keepdims=True)
            normals = normals / np.maximum(norms, 1e-12)
            for slot_id, normal in zip(missing, normals):
                self._normals[int(slot_id)] = np.asarray(normal, dtype=np.float64)
        return np.asarray([self._normals[int(slot_id)] for slot_id in point_ids], dtype=np.float64)

    def normal(self, slot_id):
        slot_id = int(slot_id)
        if slot_id not in self._normals:
            self.normals(np.asarray([slot_id], dtype=np.int32))
        return self._normals[slot_id]

    def point_rotation_jacobians(self, slot_id):
        slot_id = int(slot_id)
        if slot_id not in self._jacobians:
            point = self.point(slot_id)
            geom_id = int(self.template["geom_ids"][slot_id])
            body_id = int(self.model.geom_bodyid[geom_id])
            jacp = np.zeros((3, self.model.nv), dtype=np.float64)
            jacr = np.zeros((3, self.model.nv), dtype=np.float64)
            mujoco.mj_jac(self.model, self.data, jacp, jacr, np.asarray(point, dtype=np.float64), body_id)
            self._jacobians[slot_id] = (jacp, jacr)
        return self._jacobians[slot_id]

    def point_jacobian(self, slot_id):
        jacp, _jacr = self.point_rotation_jacobians(slot_id)
        return jacp

    def normal_jacobian(self, slot_id):
        slot_id = int(slot_id)
        if slot_id not in self._normal_jacobians:
            normal = self.normal(slot_id)
            _jacp, jacr = self.point_rotation_jacobians(slot_id)
            skew = np.array(
                [
                    [0.0, -normal[2], normal[1]],
                    [normal[2], 0.0, -normal[0]],
                    [-normal[1], normal[0], 0.0],
                ],
                dtype=np.float64,
            )
            self._normal_jacobians[slot_id] = -skew @ jacr
        return self._normal_jacobians[slot_id]


def compute_source_slot_ground_contact(source_slots, snap_threshold=0.005):
    raw_ground_contact = np.asarray(source_slots[:, :, 2], dtype=np.float32).copy()
    weight_distances = raw_ground_contact - raw_ground_contact.min(axis=1, keepdims=True)
    ground_contact = raw_ground_contact.copy()
    ground_contact = np.maximum(ground_contact, 0.0)
    snap_threshold = float(snap_threshold)
    snapped_count = 0
    if snap_threshold > 0.0:
        snap_mask = ground_contact < snap_threshold
        snapped_count = int(snap_mask.sum())
        ground_contact[snap_mask] = 0.0

    print(
        f"[SurfaceRetarget][GroundContactMap] slots={ground_contact.shape[1]}, "
        f"frames={ground_contact.shape[0]}, min={float(ground_contact.min()):.4f}, "
        f"p5={float(np.percentile(ground_contact, 5)):.4f}, p50={float(np.percentile(ground_contact, 50)):.4f}, "
        f"max={float(ground_contact.max()):.4f}, snap<{snap_threshold:.4f}m="
        f"{snapped_count}/{ground_contact.size}"
    )
    return ground_contact, raw_ground_contact, weight_distances


def qpos_body_heading(joints):
    up = np.asarray([0.0, 0.0, 1.0], dtype=np.float64)
    left = joints[SMPLX_JOINT_IDS["L_Hip"]] - joints[SMPLX_JOINT_IDS["R_Hip"]]
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
    quat_xyzw = R.from_matrix(rot).as_quat()
    return np.asarray([quat_xyzw[3], quat_xyzw[0], quat_xyzw[1], quat_xyzw[2]], dtype=np.float64)


def source_root_joint_position(joints, joint_names=None):
    if joint_names is None:
        return joints[SMPLX_JOINT_IDS["Pelvis"]]
    idx = soma_source.soma_joint_index(joint_names, "Hips", "Root")
    return joints[idx]


def source_qpos_body_heading(joints, joint_names=None):
    if joint_names is None:
        return qpos_body_heading(joints)
    left_id = soma_source.soma_joint_index(joint_names, "LeftLeg", "LeftShin")
    right_id = soma_source.soma_joint_index(joint_names, "RightLeg", "RightShin")
    up = np.asarray([0.0, 0.0, 1.0], dtype=np.float64)
    left = np.asarray(joints[left_id] - joints[right_id], dtype=np.float64)
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
    quat_xyzw = R.from_matrix(rot).as_quat()
    return np.asarray([quat_xyzw[3], quat_xyzw[0], quat_xyzw[1], quat_xyzw[2]], dtype=np.float64)


def set_qpos(model, data, qpos):
    data.qpos[:] = qpos
    mujoco.mj_forward(model, data)


def point_jacobian(model, data, geom_id, point):
    body_id = int(model.geom_bodyid[int(geom_id)])
    return body_point_jacobian(model, data, body_id, point)


def body_point_jacobian(model, data, body_id, point):
    jacp = np.zeros((3, model.nv), dtype=np.float64)
    jacr = np.zeros((3, model.nv), dtype=np.float64)
    mujoco.mj_jac(model, data, jacp, jacr, np.asarray(point, dtype=np.float64), int(body_id))
    return jacp


def geom_collision_labels(model):
    labels = []
    for geom_id in range(model.ngeom):
        geom_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_GEOM, geom_id) or ""
        body_id = int(model.geom_bodyid[geom_id])
        body_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, body_id) or ""
        labels.append(f"{geom_name} {body_name}".strip().lower())
    return labels


def is_adjacent_body_pair(model, body1, body2):
    body1 = int(body1)
    body2 = int(body2)
    if body1 == body2:
        return True
    parent = model.body_parentid
    return int(parent[body1]) == body2 or int(parent[body2]) == body1


def build_robot_self_penetration_cache(model, args):
    soft_enabled = float(getattr(args, "robot_self_penetration_cost", 0.0)) > 0.0
    hard_enabled = bool(getattr(args, "robot_self_penetration_hard_constraint", False))
    if not (soft_enabled or hard_enabled):
        return None
    labels = geom_collision_labels(model)
    robot_geoms = []
    for geom_id in range(model.ngeom):
        body_id = int(model.geom_bodyid[geom_id])
        body_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, body_id) or ""
        label = labels[geom_id]
        if body_name == "world" or "floor" in label or "ground" in label:
            continue
        if int(model.geom_contype[geom_id]) == 0 and int(model.geom_conaffinity[geom_id]) == 0:
            continue
        robot_geoms.append(int(geom_id))
    print(
        f"[SurfaceRetarget][RobotSelfPenetration] cost={float(args.robot_self_penetration_cost):.4f}, "
        f"hard_constraint={hard_enabled}, "
        f"margin={float(getattr(args, 'robot_self_penetration_margin', 0.0)):.4f}, "
        f"hard_slack={bool(getattr(args, 'robot_self_penetration_hard_slack', False))}, "
        f"slack_cost={float(getattr(args, 'robot_self_penetration_hard_slack_cost', 0.0)):.4f}, "
        f"tolerance={float(args.robot_self_penetration_tolerance):.4f}, "
        f"collision_threshold={float(args.collision_threshold):.4f}, geoms={len(robot_geoms)}"
    )
    return {
        "geom_ids": np.asarray(robot_geoms, dtype=np.int32),
        "labels": labels,
    }


def build_ground_penetration_collision_cache(model, args):
    hard_enabled = bool(getattr(args, "ground_penetration_hard_constraint", False))
    mode = str(getattr(args, "ground_penetration_hard_constraint_mode", "surface_slots"))
    if not hard_enabled or mode != "mujoco_collision":
        return None
    labels = geom_collision_labels(model)
    ground_geoms = []
    robot_geoms = []
    for geom_id in range(model.ngeom):
        body_id = int(model.geom_bodyid[geom_id])
        body_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, body_id) or ""
        label = labels[geom_id]
        geom_type = int(model.geom_type[geom_id])
        is_world_plane = body_name == "world" and geom_type == int(mujoco.mjtGeom.mjGEOM_PLANE)
        is_ground = body_name == "world" and ("floor" in label or "ground" in label or is_world_plane)
        if is_ground:
            ground_geoms.append(int(geom_id))
            continue
        if body_name == "world":
            continue
        if "floor" in label or "ground" in label:
            continue
        if int(model.geom_contype[geom_id]) == 0 and int(model.geom_conaffinity[geom_id]) == 0:
            continue
        robot_geoms.append(int(geom_id))
    print(
        f"[SurfaceRetarget][GroundPenetration] mode=mujoco_collision, "
        f"hard_constraint={hard_enabled}, "
        f"margin={float(getattr(args, 'ground_penetration_margin', 0.0)):.4f}, "
        f"threshold={float(getattr(args, 'ground_penetration_threshold', 0.0)):.4f}, "
        f"hard_slack={bool(getattr(args, 'ground_penetration_hard_slack', False))}, "
        f"slack_cost={float(getattr(args, 'ground_penetration_hard_slack_cost', 0.0)):.4f}, "
        f"robot_geoms={len(robot_geoms)}, ground_geoms={len(ground_geoms)}"
    )
    return {
        "geom_ids": np.asarray(robot_geoms, dtype=np.int32),
        "ground_geom_ids": np.asarray(ground_geoms, dtype=np.int32),
        "labels": labels,
    }


def collision_relative_jacobian(model, data, geom1_id, geom2_id, labels, fromto, dist):
    pos1 = np.asarray(fromto[:3], dtype=np.float64)
    pos2 = np.asarray(fromto[3:], dtype=np.float64)
    delta = pos1 - pos2
    delta_norm = np.linalg.norm(delta)
    label1 = labels[int(geom1_id)]
    label2 = labels[int(geom2_id)]
    if delta_norm > 1e-12:
        normal = (1.0 if float(dist) >= 0.0 else -1.0) * (delta / delta_norm)
    elif "ground" in label2 or "floor" in label2:
        normal = np.array([0.0, 0.0, 1.0], dtype=np.float64) * (1.0 if dist >= 0 else -1.0)
    elif "ground" in label1 or "floor" in label1:
        normal = np.array([0.0, 0.0, -1.0], dtype=np.float64) * (1.0 if dist >= 0 else -1.0)
    else:
        normal = np.zeros(3, dtype=np.float64)

    body1 = int(model.geom_bodyid[int(geom1_id)])
    body2 = int(model.geom_bodyid[int(geom2_id)])
    jac1 = body_point_jacobian(model, data, body1, pos1)
    jac2 = body_point_jacobian(model, data, body2, pos2)
    return normal @ (jac1 - jac2)


def compute_robot_self_penetration_rows(model, data, cache, collision_threshold):
    if cache is None:
        return [], []
    robot_geoms = np.asarray(cache["geom_ids"], dtype=np.int32)
    if robot_geoms.size == 0:
        return [], []

    threshold = float(collision_threshold)
    labels = cache["labels"]

    saved_margin = model.geom_margin.copy()
    candidates = set()
    try:
        model.geom_margin[:] = np.maximum(saved_margin, threshold)
        mujoco.mj_collision(model, data)
        robot_geom_set = set(int(g) for g in robot_geoms)
        for contact_id in range(data.ncon):
            contact = data.contact[contact_id]
            geom1 = int(contact.geom1)
            geom2 = int(contact.geom2)
            if geom1 < 0 or geom2 < 0:
                continue
            if geom1 in robot_geom_set and geom2 in robot_geom_set:
                candidates.add((min(geom1, geom2), max(geom1, geom2)))
    finally:
        model.geom_margin[:] = saved_margin

    jacobians = []
    distances = []
    fromto = np.zeros(6, dtype=np.float64)
    for geom1, geom2 in sorted(candidates):
        fromto[:] = 0.0
        dist = mujoco.mj_geomDistance(model, data, geom1, geom2, threshold, fromto)
        if dist <= threshold:
            jacobians.append(collision_relative_jacobian(model, data, geom1, geom2, labels, fromto, dist))
            distances.append(float(dist))
    return jacobians, distances


def ground_collision_activation_distance(margin, threshold):
    margin = float(margin)
    threshold = float(threshold)
    if threshold >= 0.0:
        return max(0.0, margin + threshold)
    return 1.0e6


def compute_ground_penetration_collision_rows(model, data, cache, margin, threshold, max_pairs=0):
    if cache is None:
        return [], []
    robot_geoms = np.asarray(cache["geom_ids"], dtype=np.int32)
    ground_geoms = np.asarray(cache["ground_geom_ids"], dtype=np.int32)
    if robot_geoms.size == 0 or ground_geoms.size == 0:
        return [], []

    activation_distance = ground_collision_activation_distance(margin, threshold)
    labels = cache["labels"]

    saved_margin = model.geom_margin.copy()
    candidates = set()
    try:
        model.geom_margin[:] = np.maximum(saved_margin, activation_distance)
        mujoco.mj_collision(model, data)
        robot_geom_set = set(int(g) for g in robot_geoms)
        ground_geom_set = set(int(g) for g in ground_geoms)
        for contact_id in range(data.ncon):
            contact = data.contact[contact_id]
            geom1 = int(contact.geom1)
            geom2 = int(contact.geom2)
            if geom1 < 0 or geom2 < 0:
                continue
            if geom1 in robot_geom_set and geom2 in ground_geom_set:
                candidates.add((geom1, geom2))
            elif geom2 in robot_geom_set and geom1 in ground_geom_set:
                candidates.add((geom2, geom1))
    finally:
        model.geom_margin[:] = saved_margin

    jacobians = []
    distances = []
    fromto = np.zeros(6, dtype=np.float64)
    for geom_robot, geom_ground in sorted(candidates):
        fromto[:] = 0.0
        dist = mujoco.mj_geomDistance(model, data, geom_robot, geom_ground, activation_distance, fromto)
        if dist <= activation_distance:
            jacobians.append(collision_relative_jacobian(model, data, geom_robot, geom_ground, labels, fromto, dist))
            distances.append(float(dist))

    if jacobians and int(max_pairs) > 0 and len(jacobians) > int(max_pairs):
        order = np.argsort(np.asarray(distances, dtype=np.float64))[: int(max_pairs)]
        jacobians = [jacobians[int(idx)] for idx in order]
        distances = [distances[int(idx)] for idx in order]
    return jacobians, distances


def scalar_qpos_joint_addrs(model):
    addrs = []
    vaddrs = []
    ranges = []
    names = []
    for joint_id in range(model.njnt):
        jtype = int(model.jnt_type[joint_id])
        if jtype not in (int(mujoco.mjtJoint.mjJNT_HINGE), int(mujoco.mjtJoint.mjJNT_SLIDE)):
            continue
        addrs.append(int(model.jnt_qposadr[joint_id]))
        vaddrs.append(int(model.jnt_dofadr[joint_id]))
        ranges.append(model.jnt_range[joint_id].copy() if int(model.jnt_limited[joint_id]) else np.asarray([-np.inf, np.inf]))
        names.append(mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_JOINT, joint_id) or f"joint_{joint_id}")
    return np.asarray(addrs, dtype=np.int32), np.asarray(vaddrs, dtype=np.int32), np.asarray(ranges), names


def build_scalar_joint_limits(model, configured_limits=None):
    configured_limits = {} if configured_limits is None else dict(configured_limits)
    by_qpos = {}
    matched = []
    skipped_no_overlap = []
    for joint_id in range(model.njnt):
        jtype = int(model.jnt_type[joint_id])
        if jtype not in (int(mujoco.mjtJoint.mjJNT_HINGE), int(mujoco.mjtJoint.mjJNT_SLIDE)):
            continue
        name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_JOINT, joint_id) or f"joint_{joint_id}"
        if int(model.jnt_limited[joint_id]):
            lower, upper = (float(v) for v in model.jnt_range[joint_id])
        else:
            lower, upper = -np.inf, np.inf
        source = "model"
        if name in configured_limits:
            cfg_lower, cfg_upper = configured_limits[name]
            new_lower = max(lower, float(cfg_lower))
            new_upper = min(upper, float(cfg_upper))
            if new_lower <= new_upper:
                lower, upper = new_lower, new_upper
                source = "model+config"
                matched.append(name)
            else:
                skipped_no_overlap.append((name, lower, upper, cfg_lower, cfg_upper))
        qadr = int(model.jnt_qposadr[joint_id])
        dadr = int(model.jnt_dofadr[joint_id])
        by_qpos[qadr] = {
            "joint_id": int(joint_id),
            "dof_id": int(dadr),
            "name": str(name),
            "lower": float(lower),
            "upper": float(upper),
            "source": source,
        }
    if skipped_no_overlap:
        preview = ", ".join(name for name, *_ in skipped_no_overlap[:8])
        print(
            f"[SurfaceRetarget][JointLimit][WARN] skipped {len(skipped_no_overlap)} configured limits "
            f"with no overlap against model XML: {preview}"
        )
    return by_qpos, matched


def clamp_joint_ranges(model, qpos, joint_limits_by_qpos=None):
    qpos = qpos.copy()
    for joint_id in range(model.njnt):
        jtype = int(model.jnt_type[joint_id])
        if jtype not in (int(mujoco.mjtJoint.mjJNT_HINGE), int(mujoco.mjtJoint.mjJNT_SLIDE)):
            continue
        adr = int(model.jnt_qposadr[joint_id])
        info = None if joint_limits_by_qpos is None else joint_limits_by_qpos.get(adr)
        if info is not None:
            lo, hi = float(info["lower"]), float(info["upper"])
            if np.isfinite(lo) or np.isfinite(hi):
                qpos[adr] = np.clip(qpos[adr], lo, hi)
        elif int(model.jnt_limited[joint_id]):
            lo, hi = model.jnt_range[joint_id]
            qpos[adr] = np.clip(qpos[adr], lo, hi)
    qpos[3:7] /= max(float(np.linalg.norm(qpos[3:7])), 1e-12)
    return qpos


def _finite_difference_matrix(length: int, order: int):
    length = int(length)
    order = int(order)
    if order <= 0:
        return sparse.eye(length, dtype=np.float64, format="csc")
    rows = length - order
    if rows <= 0:
        return sparse.csc_matrix((0, length), dtype=np.float64)
    if order == 1:
        coeffs = (-1.0, 1.0)
    elif order == 2:
        coeffs = (1.0, -2.0, 1.0)
    elif order == 3:
        coeffs = (-1.0, 3.0, -3.0, 1.0)
    else:
        raise ValueError(f"Unsupported finite-difference order {order}")
    diagonals = [np.full(rows, coeff, dtype=np.float64) for coeff in coeffs]
    return sparse.diags(diagonals, offsets=np.arange(order + 1), shape=(rows, length), format="csc")


def lqr_smooth_qpos_sequence(
    model,
    qpos_seq,
    qpos_columns,
    joint_limits_by_qpos=None,
    data_cost=1.0,
    velocity_cost=0.0,
    acceleration_cost=0.0,
    jerk_cost=0.0,
    include_root_translation=False,
    anchor_start_frames=0,
    anchor_end_frames=0,
):
    """LQR-style fixed-interval smoother for retargeted qpos trajectories."""
    qpos = np.asarray(qpos_seq, dtype=np.float64)
    if qpos.ndim != 2:
        raise ValueError(f"qpos_seq must be 2D, got {qpos.shape}")
    filtered = qpos.copy()
    frames = int(filtered.shape[0])
    if frames <= 1:
        return filtered

    data_cost = max(float(data_cost), 1e-12)
    velocity_cost = max(float(velocity_cost), 0.0)
    acceleration_cost = max(float(acceleration_cost), 0.0)
    jerk_cost = max(float(jerk_cost), 0.0)
    if velocity_cost <= 0.0 and acceleration_cost <= 0.0 and jerk_cost <= 0.0:
        return filtered

    columns = []
    if include_root_translation:
        columns.extend([0, 1, 2])
    columns.extend(int(col) for col in qpos_columns)
    columns = sorted({col for col in columns if 0 <= col < filtered.shape[1]})
    if not columns:
        return filtered

    system = data_cost * sparse.eye(frames, dtype=np.float64, format="csc")
    if velocity_cost > 0.0 and frames > 1:
        diff = _finite_difference_matrix(frames, 1)
        system = system + velocity_cost * (diff.T @ diff)
    if acceleration_cost > 0.0 and frames > 2:
        diff = _finite_difference_matrix(frames, 2)
        system = system + acceleration_cost * (diff.T @ diff)
    if jerk_cost > 0.0 and frames > 3:
        diff = _finite_difference_matrix(frames, 3)
        system = system + jerk_cost * (diff.T @ diff)

    rhs = data_cost * filtered[:, columns]
    anchor_start_frames = max(int(anchor_start_frames), 0)
    anchor_end_frames = max(int(anchor_end_frames), 0)
    fixed = []
    if anchor_start_frames > 0:
        fixed.extend(range(min(anchor_start_frames, frames)))
    if anchor_end_frames > 0:
        start = max(frames - anchor_end_frames, 0)
        fixed.extend(range(start, frames))
    fixed = np.asarray(sorted(set(fixed)), dtype=np.int32)
    if fixed.size:
        free_mask = np.ones(frames, dtype=bool)
        free_mask[fixed] = False
        free = np.flatnonzero(free_mask).astype(np.int32)
        filtered[fixed[:, None], columns] = qpos[fixed[:, None], columns]
        if free.size:
            system_csc = system.tocsc()
            rhs_free = rhs[free] - system_csc[free][:, fixed] @ qpos[fixed[:, None], columns]
            solved = sparse_linalg.spsolve(system_csc[free][:, free], rhs_free)
            solved = np.asarray(solved, dtype=np.float64)
            if solved.ndim == 1:
                solved = solved.reshape(free.size, 1)
            filtered[free[:, None], columns] = solved
    else:
        solved = sparse_linalg.spsolve(system.tocsc(), rhs)
        solved = np.asarray(solved, dtype=np.float64)
        if solved.ndim == 1:
            solved = solved.reshape(frames, 1)
        filtered[:, columns] = solved
    for frame_idx in range(frames):
        filtered[frame_idx] = clamp_joint_ranges(model, filtered[frame_idx], joint_limits_by_qpos=joint_limits_by_qpos)
    return filtered


def qpos_temporal_summary(qpos_seq, qpos_columns):
    qpos = np.asarray(qpos_seq, dtype=np.float64)
    columns = sorted({int(col) for col in qpos_columns if 0 <= int(col) < qpos.shape[1]})
    if qpos.ndim != 2 or qpos.shape[0] <= 1 or not columns:
        return {"step_p95": 0.0, "step_max": 0.0, "accel_p95": 0.0, "jerk_p95": 0.0}
    values = qpos[:, columns]
    step = np.abs(np.diff(values, axis=0))
    accel = np.abs(np.diff(values, n=2, axis=0)) if values.shape[0] > 2 else np.zeros((0, len(columns)))
    jerk = np.abs(np.diff(values, n=3, axis=0)) if values.shape[0] > 3 else np.zeros((0, len(columns)))

    def p95(arr):
        return float(np.percentile(arr, 95)) if arr.size else 0.0

    return {
        "step_p95": p95(step),
        "step_max": float(step.max()) if step.size else 0.0,
        "accel_p95": p95(accel),
        "jerk_p95": p95(jerk),
    }


def root_qvel_dof_groups(model):
    for joint_id in range(model.njnt):
        if int(model.jnt_type[joint_id]) == int(mujoco.mjtJoint.mjJNT_FREE):
            dof_start = int(model.jnt_dofadr[joint_id])
            return (
                np.arange(dof_start, dof_start + 3, dtype=np.int32),
                np.arange(dof_start + 3, dof_start + 6, dtype=np.int32),
            )
    empty = np.zeros(0, dtype=np.int32)
    return empty, empty


def local_pose_qvel_dof_ids(model):
    root_translation, root_rotation = root_qvel_dof_groups(model)
    root_dofs = np.concatenate([root_translation, root_rotation])
    if root_dofs.size == 0:
        return np.arange(model.nv, dtype=np.int32)
    mask = np.ones(model.nv, dtype=bool)
    mask[root_dofs] = False
    return np.flatnonzero(mask).astype(np.int32)


def step_limit_flags(mode, allow_off=False, label="step_limit_mode"):
    normalized = str(mode).lower()
    if normalized in {"off", "none", "unlimited"}:
        if allow_off:
            return False, False
        raise ValueError(f"Unsupported {label}={mode!r}")
    if normalized not in {"box", "l2", "box_l2"}:
        raise ValueError(f"Unsupported {label}={mode!r}")
    return normalized in {"box", "box_l2"}, normalized in {"l2", "box_l2"}


def apply_qvel_box_limit(lower, upper, dof_ids, max_dq):
    dof_ids = np.asarray(dof_ids, dtype=np.int32).reshape(-1)
    if dof_ids.size == 0:
        return
    max_dq = abs(float(max_dq))
    if not np.isfinite(max_dq):
        return
    lower[dof_ids] = np.maximum(lower[dof_ids], -max_dq)
    upper[dof_ids] = np.minimum(upper[dof_ids], max_dq)


def build_dof_max_dq_box(model, configured_limits=None):
    configured_limits = {} if configured_limits is None else dict(configured_limits)
    by_dof = {}
    matched = []
    missing = []
    skipped = []
    for name, max_dq in configured_limits.items():
        joint_name = str(name)
        joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, joint_name)
        if joint_id < 0:
            missing.append(joint_name)
            continue
        jtype = int(model.jnt_type[joint_id])
        if jtype not in (int(mujoco.mjtJoint.mjJNT_HINGE), int(mujoco.mjtJoint.mjJNT_SLIDE)):
            skipped.append(joint_name)
            continue
        max_dq = abs(float(max_dq))
        if not np.isfinite(max_dq) or max_dq <= 0.0:
            raise ValueError(f"robot.dof_max_dq_box[{joint_name!r}] must be a positive finite number, got {max_dq}")
        dof_id = int(model.jnt_dofadr[joint_id])
        by_dof[dof_id] = {
            "joint_id": int(joint_id),
            "dof_id": int(dof_id),
            "name": joint_name,
            "max_dq": float(max_dq),
        }
        matched.append(joint_name)
    if missing:
        preview = ", ".join(missing[:8])
        print(f"[SurfaceRetarget][StepLimit][WARN] skipped {len(missing)} missing dof_max_dq_box joints: {preview}")
    if skipped:
        preview = ", ".join(skipped[:8])
        print(f"[SurfaceRetarget][StepLimit][WARN] skipped {len(skipped)} non-scalar dof_max_dq_box joints: {preview}")
    return by_dof, matched


def apply_dof_max_dq_box(lower, upper, dof_max_dq_box):
    if not dof_max_dq_box:
        return
    for info in dof_max_dq_box.values():
        dof_id = int(info["dof_id"])
        max_dq = abs(float(info["max_dq"]))
        lower[dof_id] = -max_dq
        upper[dof_id] = max_dq


def qvel_step_bounds(
    model,
    qpos,
    max_dq,
    joint_limits_by_qpos=None,
    use_step_box=True,
    limited_dof_ids=None,
    dof_max_dq_box=None,
):
    max_dq = abs(float(max_dq))
    lower = np.full(model.nv, -np.inf, dtype=np.float64)
    upper = np.full(model.nv, np.inf, dtype=np.float64)
    if use_step_box:
        if limited_dof_ids is None:
            limited_dof_ids = np.arange(model.nv, dtype=np.int32)
        apply_qvel_box_limit(lower, upper, limited_dof_ids, max_dq)
    apply_dof_max_dq_box(lower, upper, dof_max_dq_box)
    if joint_limits_by_qpos is None:
        return lower, upper
    qpos = np.asarray(qpos, dtype=np.float64)
    for info in joint_limits_by_qpos.values():
        dadr = int(info["dof_id"])
        qadr = int(model.jnt_qposadr[int(info["joint_id"])])
        lo = float(info["lower"])
        hi = float(info["upper"])
        if not (np.isfinite(lo) or np.isfinite(hi)):
            continue
        joint_lower = lo - float(qpos[qadr]) if np.isfinite(lo) else -np.inf
        joint_upper = hi - float(qpos[qadr]) if np.isfinite(hi) else np.inf
        lower[dadr] = max(lower[dadr], joint_lower)
        upper[dadr] = min(upper[dadr], joint_upper)
        if lower[dadr] > upper[dadr]:
            # If the current qpos is already outside the limit by more than max_dq,
            # prioritize moving toward the feasible interval over the nominal step cap.
            if not use_step_box:
                center = 0.5 * (joint_lower + joint_upper)
                lower[dadr] = center
                upper[dadr] = center
            elif float(qpos[qadr]) < lo:
                lower[dadr] = upper[dadr] = min(joint_lower, max_dq)
            elif float(qpos[qadr]) > hi:
                lower[dadr] = upper[dadr] = max(joint_upper, -max_dq)
    return lower, upper


def solve_clarabel_qp_step(
    J,
    residual,
    damping,
    lower,
    upper,
    ineq_A=None,
    ineq_b=None,
    ineq_soft_cost=0.0,
    ineq_soft_costs=None,
    global_step_size=None,
    global_step_dof_ids=None,
    l2_step_limits=None,
):
    J = np.asarray(J, dtype=np.float64)
    residual = np.asarray(residual, dtype=np.float64).reshape(-1)
    lower = np.asarray(lower, dtype=np.float64).copy()
    upper = np.asarray(upper, dtype=np.float64).copy()
    if J.ndim != 2:
        raise ValueError(f"QP Jacobian must be 2D, got {J.shape}")
    if len(residual) != J.shape[0]:
        raise ValueError(f"QP residual length mismatch: residual={len(residual)} rows={J.shape[0]}")

    nvar = int(J.shape[1])
    if len(lower) != nvar or len(upper) != nvar:
        raise ValueError(f"QP bound length mismatch: nvar={nvar}, lower={len(lower)}, upper={len(upper)}")
    if ineq_A is None:
        ineq_A = np.zeros((0, nvar), dtype=np.float64)
    else:
        ineq_A = np.asarray(ineq_A, dtype=np.float64)
    if ineq_b is None:
        ineq_b = np.zeros(0, dtype=np.float64)
    else:
        ineq_b = np.asarray(ineq_b, dtype=np.float64).reshape(-1)
    if ineq_A.ndim != 2 or ineq_A.shape[1] != nvar:
        raise ValueError(f"QP inequality A must have shape (m, {nvar}), got {ineq_A.shape}")
    if len(ineq_b) != ineq_A.shape[0]:
        raise ValueError(f"QP inequality b length mismatch: A rows={ineq_A.shape[0]}, b={len(ineq_b)}")
    if ineq_soft_costs is None:
        if ineq_A.shape[0] > 0 and float(ineq_soft_cost) > 0.0:
            ineq_soft_costs = np.full(ineq_A.shape[0], float(ineq_soft_cost), dtype=np.float64)
        else:
            ineq_soft_costs = np.zeros(ineq_A.shape[0], dtype=np.float64)
    else:
        ineq_soft_costs = np.asarray(ineq_soft_costs, dtype=np.float64).reshape(-1)
        if len(ineq_soft_costs) != ineq_A.shape[0]:
            raise ValueError(
                f"QP inequality soft-cost length mismatch: A rows={ineq_A.shape[0]}, "
                f"soft_costs={len(ineq_soft_costs)}"
            )
        ineq_soft_costs = np.maximum(ineq_soft_costs, 0.0)

    finite_lower = np.isfinite(lower)
    finite_upper = np.isfinite(upper)
    tight = finite_lower & finite_upper & (upper <= lower)
    if np.any(tight):
        center = 0.5 * (lower[tight] + upper[tight])
        lower[tight] = center - 1e-12
        upper[tight] = center + 1e-12

    P = J.T @ J
    if float(damping) > 0.0:
        P += float(damping) * np.eye(nvar, dtype=np.float64)
    q = J.T @ residual
    soft_rows = ineq_soft_costs > 0.0
    nslack = int(np.count_nonzero(soft_rows))
    ntotal = nvar + nslack
    if nslack > 0:
        P_full = np.zeros((ntotal, ntotal), dtype=np.float64)
        P_full[:nvar, :nvar] = P
        P_full[nvar:, nvar:] = np.diag(ineq_soft_costs[soft_rows])
        P = P_full
        q = np.concatenate([q, np.zeros(nslack, dtype=np.float64)])

    use_global_step = global_step_size is not None and np.isfinite(float(global_step_size))
    if use_global_step:
        global_step_size = float(global_step_size)
        if global_step_size <= 0.0:
            raise ValueError(f"global_step_size must be positive for l2 step limit, got {global_step_size}")
    l2_groups = []
    if use_global_step:
        dof_ids = (
            np.arange(nvar, dtype=np.int32)
            if global_step_dof_ids is None
            else np.asarray(global_step_dof_ids, dtype=np.int32).reshape(-1)
        )
        if dof_ids.size > 0:
            l2_groups.append((dof_ids, global_step_size, "global_step_size"))
    for group_index, group in enumerate(l2_step_limits or []):
        if len(group) == 2:
            dof_ids, radius = group
            group_label = f"l2_step_limits[{group_index}]"
        else:
            dof_ids, radius, group_label = group
        radius = float(radius)
        if not np.isfinite(radius):
            continue
        if radius <= 0.0:
            raise ValueError(f"{group_label} must be positive for l2 step limit, got {radius}")
        dof_ids = np.asarray(dof_ids, dtype=np.int32).reshape(-1)
        if dof_ids.size > 0:
            l2_groups.append((dof_ids, radius, str(group_label)))

    # Clarabel solves 0.5 * x' P x + q' x subject to A x + s = b, s >= 0.
    # The box step limits are encoded as dq <= upper and -dq <= -lower.
    # If requested, soft inequalities use one nonnegative slack per row:
    # ineq_A * dq - slack <= ineq_b, slack >= 0.
    P_sparse = sparse.triu(sparse.csc_matrix(P), format="csc")
    eye_dq = sparse.eye(nvar, dtype=np.float64, format="csc")
    upper_mask = np.isfinite(upper)
    lower_mask = np.isfinite(lower)
    A_blocks = []
    b_blocks = []
    if np.any(upper_mask):
        upper_eye = eye_dq[upper_mask, :]
        if nslack > 0:
            upper_eye = sparse.hstack(
                [upper_eye, sparse.csc_matrix((int(np.count_nonzero(upper_mask)), nslack), dtype=np.float64)],
                format="csc",
            )
        A_blocks.append(upper_eye)
        b_blocks.append(upper[upper_mask])
    if np.any(lower_mask):
        lower_eye = -eye_dq[lower_mask, :]
        if nslack > 0:
            lower_eye = sparse.hstack(
                [lower_eye, sparse.csc_matrix((int(np.count_nonzero(lower_mask)), nslack), dtype=np.float64)],
                format="csc",
            )
        A_blocks.append(lower_eye)
        b_blocks.append(-lower[lower_mask])
    if nslack > 0:
        slack_eye = sparse.eye(nslack, dtype=np.float64, format="csc")
        A_blocks.append(
            sparse.hstack(
                [sparse.csc_matrix((nslack, nvar), dtype=np.float64), -slack_eye],
                format="csc",
            )
        )
        b_blocks.append(np.zeros(nslack, dtype=np.float64))
    if ineq_A.shape[0] > 0:
        ineq = sparse.csc_matrix(ineq_A)
        if nslack > 0:
            soft_selector = sparse.coo_matrix(
                (
                    -np.ones(nslack, dtype=np.float64),
                    (np.flatnonzero(soft_rows), np.arange(nslack)),
                ),
                shape=(ineq_A.shape[0], nslack),
            ).tocsc()
            A_blocks.append(
                sparse.hstack(
                    [ineq, soft_selector],
                    format="csc",
                )
            )
        else:
            A_blocks.append(ineq)
        b_blocks.append(ineq_b)
    linear_rows = sum(len(block) for block in b_blocks)
    cones = []
    if linear_rows > 0:
        cones.append(clarabel.NonnegativeConeT(linear_rows))
    for dof_ids, radius, _group_label in l2_groups:
        dof_ids = np.asarray(dof_ids, dtype=np.int32).reshape(-1)
        dof_ids = dof_ids[(dof_ids >= 0) & (dof_ids < nvar)]
        if dof_ids.size == 0:
            continue
        row_ids = np.arange(dof_ids.size, dtype=np.int32)
        selector = sparse.coo_matrix(
            (-np.ones(dof_ids.size, dtype=np.float64), (row_ids, dof_ids)),
            shape=(dof_ids.size, nvar),
        ).tocsc()
        if nslack > 0:
            selector = sparse.hstack(
                [selector, sparse.csc_matrix((dof_ids.size, nslack), dtype=np.float64)],
                format="csc",
            )
        zero_top = sparse.csc_matrix((1, ntotal), dtype=np.float64)
        A_blocks.append(sparse.vstack([zero_top, selector], format="csc"))
        b_blocks.append(np.concatenate([[radius], np.zeros(dof_ids.size, dtype=np.float64)]))
        cones.append(clarabel.SecondOrderConeT(int(dof_ids.size) + 1))
    if not A_blocks:
        A_blocks.append(sparse.csc_matrix((0, ntotal), dtype=np.float64))
        b_blocks.append(np.zeros(0, dtype=np.float64))
    A_sparse = sparse.vstack(A_blocks, format="csc")
    b = np.concatenate(b_blocks).astype(np.float64)
    settings = clarabel.DefaultSettings()
    settings.verbose = False
    solver = clarabel.DefaultSolver(P_sparse, q.astype(np.float64), A_sparse, b, cones, settings)
    result = solver.solve()
    status = str(result.status)
    if status not in ("Solved", "AlmostSolved"):
        raise RuntimeError(f"Clarabel QP failed with status={status}")
    dq = np.asarray(result.x[:nvar], dtype=np.float64)
    return np.clip(dq, lower, upper)

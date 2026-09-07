from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path

import numpy as np
from scipy.sparse import csc_matrix
from scipy.spatial.transform import Rotation as R


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOMA_USD = ROOT / "sample_data/soma/soma_base_skel_minimal.usd"
SIBLING_SOMA_USD = ROOT.parent.parent / "soma-retargeter/soma_retargeter/configs/soma/soma_base_skel_minimal.usd"
BONESEED_SAMPLE_ROOT = ROOT / "sample_data/bones-seed"
HOME_BONESEED_SAMPLE_ROOT = Path.home() / "boneseed_soma_proportional_samples"
SAMPLE_SOMA_ASSETS = ROOT / "sample_data/soma/soma_assets"
SOMA_X_ASSETS = ROOT.parent.parent / "SOMA-X/assets"
NUMBER_RE = re.compile(r"[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?")
ACTOR_ID_RE = re.compile(r"(A\d{3})")
_SOMA_LAYER_LOGGED = set()


def default_soma_usd_path() -> Path:
    if DEFAULT_SOMA_USD.exists():
        return DEFAULT_SOMA_USD
    return SIBLING_SOMA_USD


def default_soma_assets_path() -> Path:
    required = {
        "bind_shape",
        "bind_pose_world",
        "t_pose_world",
        "joint_names",
        "skinning_weights_data",
        "skinning_weights_indices",
        "skinning_weights_indptr",
        "skinning_weights_shape",
    }
    env_path = os.environ.get("UMR_SOMA_ASSETS_PATH")
    candidates = [
        Path(env_path) if env_path else None,
        SAMPLE_SOMA_ASSETS,
        SOMA_X_ASSETS,
        BONESEED_SAMPLE_ROOT / "soma_assets",
        HOME_BONESEED_SAMPLE_ROOT / "soma_assets",
    ]
    for candidate in candidates:
        if candidate is None:
            continue
        neutral = candidate / "SOMA_neutral.npz"
        if not neutral.exists():
            continue
        with np.load(neutral, allow_pickle=False) as data:
            if required.issubset(set(data.files)):
                return candidate
    raise FileNotFoundError(
        "Complete SOMA bind/T-pose assets not found. Expected SOMA_neutral.npz with bind_shape, "
        "bind_pose_world, t_pose_world, and skinning weights under sample_data/soma/soma_assets, "
        "the repository sample paths or UMR_SOMA_ASSETS_PATH."
    )


def soma_template_name_for_sequence(sequence: dict[str, object] | None, fallback: str = "soma") -> str:
    if sequence is not None:
        template_name = sequence.get("soma_template_name")
        if template_name:
            return str(template_name)
        actor_id = sequence.get("soma_actor_id")
        if actor_id:
            return f"soma_{actor_id}"
    return str(fallback)


def actor_id_from_label(label: str | Path | None) -> str | None:
    if label is None:
        return None
    match = ACTOR_ID_RE.search(str(label))
    return match.group(1) if match else None


def boneseed_motion_variant(path: str | Path | None) -> str | None:
    """Return the BoneSeed shape family selected by a motion path."""
    if path is None:
        return None
    names = {parent.name for parent in [Path(path), *Path(path).parents]}
    if "motions_uniform" in names:
        return "uniform"
    if "motions_proportional" in names:
        return "proportional"
    # Keep compatibility with the original sample bundle layout.
    if "motions" in names:
        return "proportional"
    return None


def _boneseed_shape_dir(root: Path, variant: str | None) -> Path:
    if variant == "uniform":
        return root / "shapes/soma_uniform_fit_mhr_params"
    return root / "shapes/soma_proportion_fit_mhr_params"


def _boneseed_roots_for_path(path: Path | None = None) -> list[Path]:
    roots: list[Path] = []
    if path is not None:
        path = Path(path)
        for parent in [path.parent, *path.parents]:
            if (parent / "shapes").exists() and (parent / "soma_assets").exists():
                roots.append(parent)
            if parent.name in {"motions", "motions_proportional", "motions_uniform", "bvh"}:
                candidate = parent.parent
                if (candidate / "shapes").exists() and (candidate / "soma_assets").exists():
                    roots.append(candidate)
        for candidate in (BONESEED_SAMPLE_ROOT, HOME_BONESEED_SAMPLE_ROOT):
            if not candidate.exists():
                continue
            try:
                path.resolve().relative_to(candidate.resolve())
            except ValueError:
                continue
            roots.append(candidate)
    else:
        roots.extend([BONESEED_SAMPLE_ROOT, HOME_BONESEED_SAMPLE_ROOT])
    deduped: list[Path] = []
    seen = set()
    for root in roots:
        key = str(root.resolve()) if root.exists() else str(root)
        if key not in seen:
            seen.add(key)
            deduped.append(root)
    return deduped


def find_boneseed_shape_params(actor_id: str | None, motion_path: Path | None = None) -> Path | None:
    variant = boneseed_motion_variant(motion_path)
    for root in _boneseed_roots_for_path(motion_path):
        shape_dir = _boneseed_shape_dir(root, variant)
        candidates = []
        if variant == "uniform":
            candidates.append(shape_dir / "soma_base_fit_mhr_params.npz")
        if actor_id:
            candidates.append(shape_dir / f"{actor_id}.npz")
        for path in candidates:
            if path.exists():
                return path
    return None


def find_boneseed_assets_path(motion_path: Path | None = None) -> Path | None:
    candidates: list[Path] = []
    env_path = os.environ.get("UMR_SOMA_ASSETS_PATH")
    if env_path:
        candidates.append(Path(env_path).expanduser())
    candidates.extend(root / "soma_assets" for root in _boneseed_roots_for_path(motion_path))
    for assets in candidates:
        if (assets / "SOMA_neutral.npz").exists():
            return assets.resolve()
    return None


def is_boneseed_sequence(sequence: dict[str, object]) -> bool:
    return bool(sequence.get("soma_shape_params_path"))


def _array_block(text: str, key: str) -> str:
    start = text.find(key)
    if start < 0:
        raise KeyError(f"SOMA USD field not found: {key}")
    equal = text.find("=", start)
    left = text.find("[", equal)
    depth = 0
    for idx in range(left, len(text)):
        if text[idx] == "[":
            depth += 1
        elif text[idx] == "]":
            depth -= 1
            if depth == 0:
                return text[left : idx + 1]
    raise ValueError(f"Unterminated SOMA USD array: {key}")


def _numbers(block: str, dtype=np.float32) -> np.ndarray:
    return np.asarray([match.group(0) for match in NUMBER_RE.finditer(block)], dtype=dtype)


def _tokens(block: str) -> list[str]:
    return re.findall(r'"([^"]+)"', block)


def _triangulate_faces(face_counts: np.ndarray, face_indices: np.ndarray) -> np.ndarray:
    faces: list[list[int]] = []
    cursor = 0
    for count in face_counts.astype(np.int32):
        poly = face_indices[cursor : cursor + int(count)].astype(np.int32)
        cursor += int(count)
        if len(poly) < 3:
            continue
        for offset in range(1, len(poly) - 1):
            faces.append([int(poly[0]), int(poly[offset]), int(poly[offset + 1])])
    return np.asarray(faces, dtype=np.int32)


def _usd_matrix_to_column_meters(raw: np.ndarray) -> np.ndarray:
    mats = raw.reshape(-1, 4, 4).astype(np.float64)
    mats = np.swapaxes(mats, 1, 2)
    mats[:, :3, 3] *= 0.01
    return mats


@lru_cache(maxsize=4)
def load_soma_usd_template(path: str | Path | None = None) -> dict[str, np.ndarray | list[str]]:
    path = Path(path) if path else default_soma_usd_path()
    text = path.read_text(errors="ignore")
    joint_names = _tokens(_array_block(text, "uniform token[] skel:joints"))
    points = _numbers(_array_block(text, "point3f[] points"), np.float32).reshape(-1, 3) * 0.01
    face_counts = _numbers(_array_block(text, "int[] faceVertexCounts"), np.int32)
    face_indices = _numbers(_array_block(text, "int[] faceVertexIndices"), np.int32)
    faces = _triangulate_faces(face_counts, face_indices)
    joint_indices = _numbers(_array_block(text, "int[] primvars:skel:jointIndices"), np.int32)
    joint_weights = _numbers(_array_block(text, "float[] primvars:skel:jointWeights"), np.float32)
    influences = int(len(joint_indices) // max(1, len(points)))
    joint_indices = joint_indices.reshape(len(points), influences)
    joint_weights = joint_weights.reshape(len(points), influences)
    weight_sum = joint_weights.sum(axis=1, keepdims=True)
    joint_weights = np.divide(
        joint_weights,
        np.maximum(weight_sum, 1e-8),
        out=np.zeros_like(joint_weights),
        where=weight_sum > 0.0,
    )
    bind_transforms = _usd_matrix_to_column_meters(
        _numbers(_array_block(text, "uniform matrix4d[] bindTransforms"), np.float64)
    )
    if len(bind_transforms) != len(joint_names):
        raise ValueError(f"SOMA bindTransforms={len(bind_transforms)} but joints={len(joint_names)} in {path}")
    return {
        "path": str(path),
        "joint_names": joint_names,
        "joint_short_names": [name.rsplit("/", 1)[-1] for name in joint_names],
        "points": points.astype(np.float32),
        "faces": faces,
        "joint_indices": joint_indices,
        "joint_weights": joint_weights.astype(np.float32),
        "bind_transforms": bind_transforms,
    }


def _soma_transform_meters(transforms: np.ndarray) -> np.ndarray:
    out = np.asarray(transforms, dtype=np.float64).copy()
    out[:, :3, 3] *= 0.01
    return out


def _dense_skinning_weights_from_soma_npz(data) -> np.ndarray:
    weights = np.asarray(
        csc_matrix(
            (
                data["skinning_weights_data"],
                data["skinning_weights_indices"],
                data["skinning_weights_indptr"],
            ),
            shape=data["skinning_weights_shape"],
        ).todense(),
        dtype=np.float64,
    )
    vertex_count = int(np.asarray(data["bind_shape"]).shape[0])
    joint_count = int(np.asarray(data["joint_names"]).shape[0])
    if weights.shape == (joint_count, vertex_count):
        weights = weights.T
    if weights.shape != (vertex_count, joint_count):
        raise ValueError(
            f"SOMA skinning weights must be (V,J)=({vertex_count},{joint_count}); got {weights.shape}"
        )
    return weights


def _pose_bind_shape(vertices: np.ndarray, weights: np.ndarray, bind_world: np.ndarray, target_world: np.ndarray) -> np.ndarray:
    bind_inv = np.linalg.inv(np.asarray(bind_world, dtype=np.float64))
    bone_transforms = np.asarray(target_world, dtype=np.float64) @ bind_inv
    out = np.zeros_like(vertices, dtype=np.float64)
    for joint_id in range(bone_transforms.shape[0]):
        joint_weights = weights[:, joint_id]
        active = joint_weights > 1e-12
        if not np.any(active):
            continue
        transform = bone_transforms[joint_id]
        posed = vertices[active] @ transform[:3, :3].T + transform[:3, 3]
        out[active] += posed * joint_weights[active, None]
    return out.astype(np.float32)


@lru_cache(maxsize=4)
def load_soma_bind_tpose_template(assets_path: str | Path | None = None, lod: str = "mid") -> dict[str, np.ndarray | list[str]]:
    assets = Path(assets_path) if assets_path else default_soma_assets_path()
    data = np.load(assets / "SOMA_neutral.npz", allow_pickle=False)
    lod = str(lod).lower()
    if lod not in {"mid", "low"}:
        raise ValueError(f"SOMA bind T-pose template lod must be 'mid' or 'low', got {lod!r}")
    bind_shape = np.asarray(data["bind_shape"], dtype=np.float64) * 0.01
    weights = _dense_skinning_weights_from_soma_npz(data)
    bind_world = _soma_transform_meters(data["bind_pose_world"])
    tpose_world = _soma_transform_meters(data["t_pose_world"])
    points = _pose_bind_shape(bind_shape, weights, bind_world, tpose_world)
    if lod == "low":
        low_ids = np.asarray(data["lod_mid_to_low"], dtype=np.int64)
        points_out = points[low_ids]
        faces = _faces_from_soma_rig_data(data, lod="low")
    else:
        points_out = points
        faces = _faces_from_soma_rig_data(data, lod="mid")
    joint_names = [str(name) for name in np.asarray(data["joint_names"])]
    return {
        "path": str(assets / "SOMA_neutral.npz"),
        "joint_names": joint_names,
        "joint_short_names": joint_names,
        "points": points_out.astype(np.float32),
        "faces": faces.astype(np.int32),
        "skinning_weights": (weights[low_ids] if lod == "low" else weights).astype(np.float32),
        "bind_transforms": tpose_world.astype(np.float32),
        "bind_shape": bind_shape.astype(np.float32),
        "bind_pose_world": bind_world.astype(np.float32),
        "t_pose_world": tpose_world.astype(np.float32),
        "pose": "tpose",
        "lod": lod,
    }


def _parse_bvh_hierarchy(lines: list[str]):
    joints: list[dict[str, object]] = []
    stack: list[int] = []
    ignore_end_site = False
    motion_line = -1
    for line_idx, line in enumerate(lines):
        token = line.split()
        if not token:
            continue
        tag = token[0]
        if tag in {"ROOT", "JOINT"}:
            name = token[1].split(":")[-1]
            parent = stack[-1] if stack else -1
            joints.append({"name": name, "parent": parent, "offset": np.zeros(3), "channels": []})
            stack.append(len(joints) - 1)
        elif line.strip() == "End Site":
            ignore_end_site = True
        elif tag == "OFFSET" and not ignore_end_site:
            joints[stack[-1]]["offset"] = np.asarray([float(v) for v in token[1:4]], dtype=np.float32) * 0.01
        elif tag == "CHANNELS":
            joints[stack[-1]]["channels"] = token[2:]
        elif tag == "}":
            if ignore_end_site:
                ignore_end_site = False
            else:
                stack.pop()
        elif tag == "MOTION":
            motion_line = line_idx
            break
    if motion_line < 0:
        raise ValueError("BVH MOTION section not found.")
    return joints, motion_line


def load_soma_bvh_motion(path: str | Path, soma_usd_path: str | Path | None = None) -> dict[str, object]:
    path = Path(path)
    lines = path.read_text(errors="ignore").splitlines()
    joints, motion_line = _parse_bvh_hierarchy(lines)
    frame_time = 1.0 / 30.0
    rows: list[list[float]] = []
    for line in lines[motion_line + 1 :]:
        token = line.split()
        if not token:
            continue
        if token[0] == "Frames:":
            continue
        if len(token) >= 3 and token[0] == "Frame" and token[1] == "Time:":
            frame_time = float(token[2])
            continue
        rows.append([float(v) for v in token])
    if not rows:
        raise ValueError(f"No BVH frame rows found in {path}")
    channel_offsets = []
    cursor = 0
    for joint in joints:
        channel_offsets.append(cursor)
        cursor += len(joint["channels"])
    motion_values = np.asarray(rows, dtype=np.float32)
    if motion_values.shape[1] != cursor:
        raise ValueError(f"BVH channel count mismatch in {path}: rows={motion_values.shape[1]} hierarchy={cursor}")
    sequence = {
        "source_format": "soma_bvh",
        "source_file": str(path),
        "soma_usd_path": str(soma_usd_path or default_soma_usd_path()),
        "joint_names": [str(joint["name"]) for joint in joints],
        "parents": np.asarray([int(joint["parent"]) for joint in joints], dtype=np.int32),
        "offsets": np.asarray([joint["offset"] for joint in joints], dtype=np.float32),
        "channels": [list(joint["channels"]) for joint in joints],
        "channel_offsets": np.asarray(channel_offsets, dtype=np.int32),
        "motion_values": motion_values,
        "num_frames": int(len(motion_values)),
        "fps": float(round(1.0 / frame_time, 6)),
        "gender": "neutral",
    }
    actor_id = actor_id_from_label(path.name)
    shape_variant = boneseed_motion_variant(path)
    shape_params_path = find_boneseed_shape_params(actor_id, path)
    assets_path = find_boneseed_assets_path(path) if shape_params_path is not None else None
    if shape_params_path is not None:
        # All uniform BoneSeed motions share the same fitted base body, whereas
        # proportional motions use an actor-specific fit.  Keeping the uniform
        # template name distinct prevents its correspondence cache from being
        # confused with (for example) the proportional ``soma_A021`` cache.
        if shape_variant == "uniform":
            template_name = "soma_uniform"
        else:
            template_name = f"soma_{actor_id}" if actor_id else "soma_proportional"
        sequence.update(
            {
                "source_format": f"soma_bvh_boneseed_{shape_variant or 'proportional'}",
                "soma_actor_id": actor_id or "",
                "soma_template_name": template_name,
                "soma_shape_params_path": str(shape_params_path),
                "soma_lod": "mid",
                "soma_shape_variant": shape_variant or "proportional",
            }
        )
        if assets_path is not None:
            sequence["soma_assets_path"] = str(assets_path)
    return sequence


def sequence_frame_count(sequence: dict[str, object]) -> int:
    if "num_frames" in sequence:
        return int(sequence["num_frames"])
    if "pose_aa" in sequence:
        return int(len(sequence["pose_aa"]))
    raise KeyError("Motion sequence does not contain num_frames or pose_aa.")


def _axis_rotation(axis: str, angle_degrees: float) -> np.ndarray:
    return R.from_euler(axis.lower(), float(angle_degrees), degrees=True).as_matrix()


def is_soma_finger_joint_name(name: str) -> bool:
    name = str(name)
    if name in {"LeftHand", "RightHand"}:
        return False
    return (
        name.startswith("LeftHand")
        or name.startswith("RightHand")
        or name.startswith("leftHand")
        or name.startswith("rightHand")
    )


def soma_bvh_global_transforms(sequence: dict[str, object], frame_ids, zero_fingers: bool = False) -> np.ndarray:
    frame_ids = np.asarray(frame_ids, dtype=np.int32)
    values = np.asarray(sequence["motion_values"], dtype=np.float32)[frame_ids]
    parents = np.asarray(sequence["parents"], dtype=np.int32)
    offsets = np.asarray(sequence["offsets"], dtype=np.float64)
    channels = sequence["channels"]
    channel_offsets = np.asarray(sequence["channel_offsets"], dtype=np.int32)
    transforms = np.zeros((len(frame_ids), len(parents), 4, 4), dtype=np.float64)
    transforms[..., 3, 3] = 1.0
    for joint_id, joint_channels in enumerate(channels):
        local = np.tile(np.eye(4, dtype=np.float64), (len(frame_ids), 1, 1))
        pos = np.repeat(offsets[joint_id][None, :], len(frame_ids), axis=0)
        rot = np.tile(np.eye(3, dtype=np.float64), (len(frame_ids), 1, 1))
        start = int(channel_offsets[joint_id])
        has_position = any("position" in str(ch).lower() for ch in joint_channels)
        zero_rotation = bool(zero_fingers) and is_soma_finger_joint_name(sequence["joint_names"][joint_id])
        if has_position:
            pos = np.zeros((len(frame_ids), 3), dtype=np.float64)
        for local_idx, channel in enumerate(joint_channels):
            value = values[:, start + local_idx].astype(np.float64)
            lowered = str(channel).lower()
            axis = lowered[0]
            if "position" in lowered:
                axis_idx = {"x": 0, "y": 1, "z": 2}[axis]
                pos[:, axis_idx] = value * 0.01
            elif "rotation" in lowered and not zero_rotation:
                for frame_idx, angle in enumerate(value):
                    rot[frame_idx] = rot[frame_idx] @ _axis_rotation(axis, angle)
        local[:, :3, :3] = rot
        local[:, :3, 3] = pos
        parent = int(parents[joint_id])
        transforms[:, joint_id] = local if parent < 0 else transforms[:, parent] @ local
    return transforms


def _bvh_to_usd_joint_indices(sequence: dict[str, object], template: dict[str, object]) -> np.ndarray:
    bvh_names = {str(name): idx for idx, name in enumerate(sequence["joint_names"])}
    indices = []
    for name in template["joint_short_names"]:
        if name not in bvh_names:
            raise KeyError(f"SOMA BVH joint {name!r} required by USD template was not found.")
        indices.append(bvh_names[name])
    return np.asarray(indices, dtype=np.int32)


def _faces_from_soma_rig_data(rig_data: dict, lod: str = "low") -> np.ndarray:
    lod = str(lod).lower()
    if lod == "low":
        keys = ("triangles_low", "faces_low", "triangles", "faces")
    else:
        keys = (f"triangles_{lod}", f"faces_{lod}", "triangles", "faces")
    for key in keys:
        if key in rig_data:
            arr = np.asarray(rig_data[key])
            if arr.ndim == 2 and arr.shape[1] == 3:
                return arr.astype(np.int32)
    counts = rig_data.get("face_vert_counts_low" if lod == "low" else "face_vert_counts")
    indices = rig_data.get("face_vert_indices_low" if lod == "low" else "face_vert_indices")
    if counts is None or indices is None:
        raise KeyError(f"Could not find SOMA {lod} faces in rig_data.")
    return _triangulate_faces(np.asarray(counts, dtype=np.int32), np.asarray(indices, dtype=np.int32))


def _prepare_soma_x_import():
    try:
        import warp as wp

        wp.config.kernel_cache_dir = os.environ.get("UMR_WARP_CACHE_DIR", "/tmp/warp-cache")
    except Exception:
        pass
    try:
        import torch
        from soma import SOMALayer
    except TypeError as exc:
        raise RuntimeError(
            "BONES-SEED actor-specific SOMA templates require py-soma-x under Python >=3.10. "
            "The current environment appears too old for the installed soma package."
        ) from exc
    except Exception as exc:
        raise RuntimeError(
            "BONES-SEED actor-specific SOMA templates require py-soma-x. "
            "Install it with `python -m pip install py-soma-x` in the active environment."
        ) from exc
    return torch, SOMALayer


@lru_cache(maxsize=2)
def _soma_x_layer(assets_path: str, lod: str = "low", device: str = "cpu"):
    torch, SOMALayer = _prepare_soma_x_import()
    del torch
    return SOMALayer(
        data_root=Path(assets_path),
        identity_model_type="mhr",
        device=str(device),
        mode="torch",
        lod=str(lod),
        enable_procedural_transforms=True,
        correctives_model_path=None,
    )


def _boneseed_shape_inputs(shape_params_path: str | Path):
    data = np.load(shape_params_path)
    identity = np.asarray(data["identity_params"], dtype=np.float32).reshape(1, -1)
    scale = np.asarray(data["scale_params"], dtype=np.float32).reshape(1, -1)
    kwargs: dict[str, np.ndarray] = {}
    if "pose_params" in data and data["pose_params"].size >= 136:
        pose_params = np.asarray(data["pose_params"], dtype=np.float32).reshape(1, -1)
        kwargs["bone_length_flexibles"] = pose_params[:, 130:136]
    return identity, scale, kwargs


def _preferred_soma_device(sequence: dict[str, object], torch) -> str:
    configured = sequence.get("soma_device", os.environ.get("UMR_SOMA_DEVICE"))
    if configured:
        return str(configured)
    return "cuda:0" if torch.cuda.is_available() else "cpu"


def _boneseed_layer_and_shape(sequence: dict[str, object]):
    torch, _SOMALayer = _prepare_soma_x_import()
    assets_path = str(sequence.get("soma_assets_path") or find_boneseed_assets_path())
    shape_params_path = sequence.get("soma_shape_params_path")
    if not assets_path or not Path(assets_path).exists():
        raise FileNotFoundError(
            "BONES-SEED SOMA assets not found. Set UMR_SOMA_ASSETS_PATH to the "
            "downloaded soma_assets directory containing SOMA_neutral.npz."
        )
    if not shape_params_path or not Path(shape_params_path).exists():
        actor = sequence.get("soma_actor_id")
        raise FileNotFoundError(f"BONES-SEED shape params not found for actor={actor!r}.")
    lod = str(sequence.get("soma_lod", "mid"))
    device = _preferred_soma_device(sequence, torch)
    try:
        layer = _soma_x_layer(assets_path, lod=lod, device=device)
    except Exception:
        if device == "cpu" or sequence.get("soma_device") or os.environ.get("UMR_SOMA_DEVICE"):
            raise
        print("[SOMA] cuda:0 unavailable for SOMA layer; falling back to cpu.")
        device = "cpu"
        layer = _soma_x_layer(assets_path, lod=lod, device=device)
    log_key = (str(assets_path), str(lod), str(device))
    if log_key not in _SOMA_LAYER_LOGGED:
        print(f"[SOMA] BoneSeed SOMA layer device={device} lod={lod}")
        _SOMA_LAYER_LOGGED.add(log_key)
    identity, scale, kwargs = _boneseed_shape_inputs(shape_params_path)
    return layer, identity, scale, kwargs, lod, device


def _soma_bvh_local_rotvecs_positions(
    sequence: dict[str, object],
    frame_ids,
    zero_fingers: bool = False,
) -> tuple[list[np.ndarray], list[np.ndarray | None]]:
    frame_ids = np.asarray(frame_ids, dtype=np.int32)
    values = np.asarray(sequence["motion_values"], dtype=np.float32)[frame_ids]
    channels = sequence["channels"]
    channel_offsets = np.asarray(sequence["channel_offsets"], dtype=np.int32)
    frames = len(frame_ids)
    local_rotvecs = [np.zeros((frames, 3), dtype=np.float32) for _ in channels]
    local_positions: list[np.ndarray | None] = [None for _ in channels]
    for joint_id, joint_channels in enumerate(channels):
        start = int(channel_offsets[joint_id])
        vals = values[:, start : start + len(joint_channels)]
        rot_cols = [(idx, str(channel)[0].lower()) for idx, channel in enumerate(joint_channels) if "rotation" in str(channel).lower()]
        pos_cols = [(idx, str(channel)[0].lower()) for idx, channel in enumerate(joint_channels) if "position" in str(channel).lower()]
        if pos_cols:
            axes = {axis: vals[:, idx] for idx, axis in pos_cols}
            pos = np.zeros((frames, 3), dtype=np.float32)
            pos[:, 0] = axes.get("x", 0.0)
            pos[:, 1] = axes.get("y", 0.0)
            pos[:, 2] = axes.get("z", 0.0)
            local_positions[joint_id] = pos * 0.01
        if rot_cols and not (bool(zero_fingers) and is_soma_finger_joint_name(sequence["joint_names"][joint_id])):
            order = "".join(axis.upper() for _, axis in rot_cols)
            euler = np.stack([vals[:, idx] for idx, _ in rot_cols], axis=1)
            local_rotvecs[joint_id] = R.from_euler(order, euler, degrees=True).as_rotvec().astype(np.float32)
    return local_rotvecs, local_positions


def _boneseed_bvh_to_soma_inputs(
    sequence: dict[str, object],
    frame_ids,
    public_joint_names,
    zero_fingers: bool = False,
) -> tuple[np.ndarray, np.ndarray]:
    public = [str(name) for name in public_joint_names]
    public_lookup = {name: idx for idx, name in enumerate(public)}
    local_rotvecs, local_positions = _soma_bvh_local_rotvecs_positions(
        sequence,
        frame_ids,
        zero_fingers=zero_fingers,
    )
    frames = len(np.asarray(frame_ids, dtype=np.int32))
    poses = np.zeros((frames, len(public) - 1, 3), dtype=np.float32)
    for joint_id, name in enumerate(sequence["joint_names"]):
        public_id = public_lookup.get(str(name))
        if public_id is not None and public_id > 0:
            poses[:, public_id - 1, :] = local_rotvecs[joint_id]
    transl = None
    for candidate in ("Hips", "Root"):
        if candidate in sequence["joint_names"]:
            joint_id = list(sequence["joint_names"]).index(candidate)
            pos = local_positions[joint_id]
            if pos is not None:
                transl = pos
                break
    if transl is None:
        transl = np.zeros((frames, 3), dtype=np.float32)
    return poses.astype(np.float32), transl.astype(np.float32)


def _boneseed_soma_forward(sequence: dict[str, object], poses_np, transl_np, absolute_pose: bool, batch_size: int = 16):
    torch, _SOMALayer = _prepare_soma_x_import()
    layer, identity_np, scale_np, kwargs_np, _lod, device = _boneseed_layer_and_shape(sequence)
    identity = torch.from_numpy(identity_np).to(device)
    scale = torch.from_numpy(scale_np).to(device)
    kwargs_t = {key: torch.from_numpy(value).to(device) for key, value in kwargs_np.items()}
    vertices = []
    transforms = []
    chunk_size = max(1, int(batch_size))
    with torch.no_grad():
        for start in range(0, poses_np.shape[0], chunk_size):
            end = min(start + chunk_size, poses_np.shape[0])
            n = end - start
            poses = torch.from_numpy(poses_np[start:end]).to(device)
            transl = torch.from_numpy(transl_np[start:end]).to(device)
            call_kwargs = {key: value.expand(n, -1) for key, value in kwargs_t.items()}
            out = layer(
                poses,
                identity.expand(n, -1),
                scale_params=scale.expand(n, -1),
                transl=transl,
                apply_correctives=False,
                absolute_pose=bool(absolute_pose),
                kwargs=call_kwargs if call_kwargs else None,
            )
            vertices.append(out["vertices"].detach().cpu().numpy().astype(np.float32))
            transforms.append(out["transforms"].detach().cpu().numpy().astype(np.float32))
    return np.concatenate(vertices, axis=0), np.concatenate(transforms, axis=0), layer


def boneseed_template_vertices_joints_faces(sequence: dict[str, object]):
    layer, _identity, _scale, _kwargs, lod, _device = _boneseed_layer_and_shape(sequence)
    poses = np.zeros((1, len(layer._public_joint_names) - 1, 3), dtype=np.float32)
    transl = np.zeros((1, 3), dtype=np.float32)
    vertices, transforms, layer = _boneseed_soma_forward(sequence, poses, transl, absolute_pose=False, batch_size=1)
    faces = _faces_from_soma_rig_data(layer.rig_data, lod=lod)
    template = {
        "path": str(sequence.get("soma_shape_params_path")),
        "joint_short_names": [str(name) for name in layer._public_joint_names],
        "faces": faces,
        "soma_actor_id": str(sequence.get("soma_actor_id", "")),
        "soma_lod": lod,
    }
    return vertices[0].astype(np.float32), transforms[0, :, :3, 3].astype(np.float32), faces, template


def soma_template_vertices_joints_faces(soma_usd_path: str | Path | None = None, sequence: dict[str, object] | None = None):
    if sequence is not None and is_boneseed_sequence(sequence):
        return boneseed_template_vertices_joints_faces(sequence)
    del soma_usd_path
    template = load_soma_bind_tpose_template(lod="mid")
    joints = np.asarray(template["t_pose_world"], dtype=np.float64)[:, :3, 3].astype(np.float32)
    return template["points"].astype(np.float32), joints, template["faces"].astype(np.int32), template


def soma_motion_vertices_joints(
    sequence: dict[str, object],
    frame_ids,
    soma_usd_path: str | Path | None = None,
    batch_size=16,
    zero_fingers: bool = False,
):
    if is_boneseed_sequence(sequence):
        layer, _identity, _scale, _kwargs, lod, _device = _boneseed_layer_and_shape(sequence)
        poses, transl = _boneseed_bvh_to_soma_inputs(
            sequence,
            frame_ids,
            layer._public_joint_names,
            zero_fingers=zero_fingers,
        )
        vertices, transforms, layer = _boneseed_soma_forward(
            sequence,
            poses,
            transl,
            absolute_pose=True,
            batch_size=batch_size,
        )
        faces = _faces_from_soma_rig_data(layer.rig_data, lod=lod)
        return vertices, transforms[:, :, :3, 3].astype(np.float32), faces
    del soma_usd_path
    template = load_soma_bind_tpose_template(lod="mid")
    points = np.asarray(template["points"], dtype=np.float64)
    faces = np.asarray(template["faces"], dtype=np.int32)
    skinning_weights = np.asarray(template["skinning_weights"], dtype=np.float64)
    bind_inv = np.linalg.inv(np.asarray(template["bind_transforms"], dtype=np.float64))
    bvh_globals = soma_bvh_global_transforms(sequence, frame_ids, zero_fingers=zero_fingers)
    usd_joint_ids = _bvh_to_usd_joint_indices(sequence, template)
    globals_usd = bvh_globals[:, usd_joint_ids]
    skin_mats = globals_usd @ bind_inv[None, :, :, :]
    vertices_all = []
    chunk_size = max(1, int(batch_size))
    for start in range(0, len(frame_ids), chunk_size):
        mats = skin_mats[start : start + chunk_size]
        out = np.zeros((len(mats), len(points), 3), dtype=np.float64)
        for joint_id in range(skinning_weights.shape[1]):
            weights = skinning_weights[:, joint_id]
            active = weights > 0.0
            if not np.any(active):
                continue
            active_points = points[active]
            active_mats = mats[:, joint_id]
            transformed = (
                np.einsum("bij,nj->bni", active_mats[:, :3, :3], active_points)
                + active_mats[:, None, :3, 3]
            )
            out[:, active] += transformed * weights[active][None, :, None]
        vertices_all.append(out.astype(np.float32))
    joints = globals_usd[:, :, :3, 3].astype(np.float32)
    return np.concatenate(vertices_all, axis=0), joints, faces


def soma_joint_index(joint_names, *candidates: str, default: int = 0) -> int:
    names = [str(name).rsplit("/", 1)[-1] for name in joint_names]
    lookup = {name: idx for idx, name in enumerate(names)}
    for candidate in candidates:
        if candidate in lookup:
            return int(lookup[candidate])
    return int(default)

from __future__ import annotations

import json
import os
import pickle
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

import mujoco
import numpy as np
from scipy.spatial import cKDTree
import trimesh

from mujoco_point_cloud_center import point_cloud_center_rotation
from source_self_contact import (
    compute_source_self_contact_map_groups as _compute_source_self_contact_map_groups,
)


ROOT = Path(__file__).resolve().parents[1]
SEGFIT_SRC_CANDIDATES = (
    ROOT / "segfit" / "src",
    ROOT.parent / "segfit" / "src",
)
MODEL_TRANSFER_ZIP_ENV = "MODEL_TRANSFER_ZIP"
MODEL_TRANSFER_ZIP_CANDIDATES = (
    ROOT / "model_transfer.zip",
    ROOT / "assets" / "model_transfer.zip",
    ROOT.parent / "model_transfer.zip",
)
SMPL_VERTEX_COUNT = 6890
SMPLX_VERTEX_COUNT = 10475

BODY_SEGMENT_17_CONFIG_CANDIDATES = (
    ROOT / "visualizations" / "smplx_55_to_17_body_segments.json",
    ROOT.parent / "visualizations" / "smplx_55_to_17_body_segments.json",
)
SMPLX_55_SEGMENTATION_CANDIDATES = (
    ROOT / "smplx_parts_segm.pkl",
    ROOT / "assets" / "smplx_parts_segm.pkl",
    ROOT.parent / "visualizations" / "smplx_parts_segm.pkl",
)
SOMA_ASSETS_ENV = "UMR_SOMA_ASSETS_PATH"
SOMA_SMPLX_ASSETS_ENV = "UMR_SOMA_SMPLX_ASSETS_PATH"
SOMA_ASSET_ROOT_CANDIDATES = (
    ROOT / "sample_data/soma/soma_assets",
    ROOT / "sample_data/bones-seed/soma_assets",
    ROOT.parent.parent / "SOMA-X/assets",
)

BODY_SEGMENT_PART_IDS_17 = {
    "rightHand": 1,
    "rightUpLeg": 2,
    "leftArm": 3,
    "head": 4,
    "leftLeg": 5,
    "leftFoot": 6,
    "torso": 7,
    "rightFoot": 8,
    "rightArm": 9,
    "leftHand": 10,
    "rightLeg": 11,
    "leftForeArm": 12,
    "rightForeArm": 13,
    "leftUpLeg": 14,
    "hips": 15,
    "leftShoulder": 16,
    "rightShoulder": 17,
}
BODY_SEGMENT_PART_IDS_19 = {
    **BODY_SEGMENT_PART_IDS_17,
    "leftUpperArm": 18,
    "rightUpperArm": 19,
}
BODY_SEGMENT_SCHEMA_17 = "smplx_55_to_17_body_segments"
BODY_SEGMENT_SCHEMA_19 = "smplx_55_to_19_upper_arm_v1"
BODY_SEGMENT_SCHEMA = BODY_SEGMENT_SCHEMA_19
BODY_SEGMENT_PART_IDS = dict(BODY_SEGMENT_PART_IDS_19)
SMPLX_PART_IDS = BODY_SEGMENT_PART_IDS
BODY_SEGMENT_PART_NAMES = {part_id: name for name, part_id in BODY_SEGMENT_PART_IDS.items()}
DEFAULT_UPPER_ARM_RATIO_START = 0.0
DEFAULT_UPPER_ARM_RATIO_END = 0.30
UPPER_ARM_SPLIT_CONFIG = {
    "leftArm": {
        "target": "leftUpperArm",
        "ratio_start": DEFAULT_UPPER_ARM_RATIO_START,
        "ratio_end": DEFAULT_UPPER_ARM_RATIO_END,
    },
    "rightArm": {
        "target": "rightUpperArm",
        "ratio_start": DEFAULT_UPPER_ARM_RATIO_START,
        "ratio_end": DEFAULT_UPPER_ARM_RATIO_END,
    },
}
SMPLX_55_TO_17_SEGM_ID_TO_CLASS_ID = np.asarray(
    [
        15,
        14,
        2,
        7,
        5,
        11,
        7,
        6,
        8,
        7,
        6,
        8,
        4,
        16,
        17,
        4,
        3,
        9,
        12,
        13,
        10,
        1,
        4,
        4,
        4,
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        10,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
    ],
    dtype=np.int32,
)

# Segment-level surface sampling and costs. These values intentionally live here
# as shared retarget tuning instead of being repeated in every robot config.

BODY_SEGMENT_SURFACE_COST_CONFIG_17 = {
    "rightHand": {"sample_slots": 15, "point_cost": 10.0, "normal_cost": 1.0},
    "rightUpLeg": {"sample_slots": 25, "point_cost": 10.0, "normal_cost": 5.0},
    "leftArm": {"sample_slots": 15, "point_cost": 10.0, "normal_cost": 0.0},
    "head": {"sample_slots": 20, "point_cost": 1.0, "normal_cost": 1.0},
    "leftLeg": {"sample_slots": 20, "point_cost": 10.0, "normal_cost": 5.0},
    "leftFoot": {"sample_slots": 30, "point_cost": 10.0, "normal_cost": 1.0},
    "torso": {"sample_slots": 50, "point_cost": 20.0, "normal_cost": 5.0},
    "rightFoot": {"sample_slots": 30, "point_cost": 10.0, "normal_cost": 1.0},
    "rightArm": {"sample_slots": 15, "point_cost": 10.0, "normal_cost": 0.0},
    "leftHand": {"sample_slots": 15, "point_cost": 10.0, "normal_cost": 1.0},
    "rightLeg": {"sample_slots": 20, "point_cost": 10.0, "normal_cost": 5.0},
    "leftForeArm": {"sample_slots": 8, "point_cost": 10.0, "normal_cost": 0.0},
    "rightForeArm": {"sample_slots": 8, "point_cost": 10.0, "normal_cost": 0.0},
    "leftUpLeg": {"sample_slots": 25, "point_cost": 10.0, "normal_cost": 5.0},
    "hips": {"sample_slots": 40, "point_cost": 20.0, "normal_cost": 0.0},
    "leftShoulder": {"sample_slots": 30, "point_cost": 0.0, "normal_cost": 0.0},
    "rightShoulder": {"sample_slots": 30, "point_cost": 0.0, "normal_cost": 0.0},
}

BODY_SEGMENT_SURFACE_COST_CONFIG_19 = {
    **BODY_SEGMENT_SURFACE_COST_CONFIG_17,
    "leftUpperArm": {"sample_slots": 30, "point_cost": 0.0, "normal_cost": 0.0},
    "rightUpperArm": {"sample_slots": 30, "point_cost": 0.0, "normal_cost": 0.0},
}
BODY_SEGMENT_SURFACE_COST_CONFIG = dict(BODY_SEGMENT_SURFACE_COST_CONFIG_19)

SMPLX_ADJACENT_SEGMENT_PAIRS = {
    ("leftHand", "leftForeArm"),
    ("leftForeArm", "leftArm"),
    ("leftArm", "leftUpperArm"),
    ("leftUpperArm", "leftShoulder"),
    ("leftArm", "leftShoulder"),
    ("leftShoulder", "torso"),
    ("rightHand", "rightForeArm"),
    ("rightForeArm", "rightArm"),
    ("rightArm", "rightUpperArm"),
    ("rightUpperArm", "rightShoulder"),
    ("rightArm", "rightShoulder"),
    ("rightShoulder", "torso"),
    ("head", "torso"),
    ("torso", "hips"),
    ("hips", "leftUpLeg"),
    ("leftUpLeg", "leftLeg"),
    ("leftLeg", "leftFoot"),
    ("hips", "rightUpLeg"),
    ("rightUpLeg", "rightLeg"),
    ("rightLeg", "rightFoot"),
}


def body_segment_schema():
    return str(BODY_SEGMENT_SCHEMA)


def body_segment_part_ids():
    return dict(SMPLX_PART_IDS)


def body_segment_part_names():
    return dict(BODY_SEGMENT_PART_NAMES)


def _deep_get(mapping, dotted, default=None):
    value = mapping
    for key in dotted.split("."):
        if not isinstance(value, dict) or key not in value:
            return default
        value = value[key]
    return value


def _coerce_cost_config(config):
    out = {}
    for name, values in config.items():
        out[str(name)] = {
            "sample_slots": int(values.get("sample_slots", 0)),
            "point_cost": float(values.get("point_cost", 0.0)),
            "normal_cost": float(values.get("normal_cost", 0.0)),
        }
    return out


def configure_body_segment_surface(config=None, schema=None, upper_arm_split=None, cost_config=None):
    """Configure the shared retarget body segment variant.

    The default is the 19-class variant. Robot configs may override this under
    solver.body_segment without changing the robot-specific config shape.
    """
    global BODY_SEGMENT_SCHEMA
    global UPPER_ARM_SPLIT_CONFIG
    global BODY_SEGMENT_SURFACE_COST_CONFIG

    body_segment_cfg = _deep_get(config or {}, "solver.body_segment", {}) or {}
    selected_schema = str(schema or body_segment_cfg.get("schema", BODY_SEGMENT_SCHEMA_19))
    if selected_schema in ("17", BODY_SEGMENT_SCHEMA_17):
        BODY_SEGMENT_SCHEMA = BODY_SEGMENT_SCHEMA_17
        selected_part_ids = BODY_SEGMENT_PART_IDS_17
        BODY_SEGMENT_SURFACE_COST_CONFIG = dict(BODY_SEGMENT_SURFACE_COST_CONFIG_17)
    elif selected_schema in ("19", BODY_SEGMENT_SCHEMA_19):
        BODY_SEGMENT_SCHEMA = BODY_SEGMENT_SCHEMA_19
        selected_part_ids = BODY_SEGMENT_PART_IDS_19
        BODY_SEGMENT_SURFACE_COST_CONFIG = dict(BODY_SEGMENT_SURFACE_COST_CONFIG_19)
    else:
        raise ValueError(f"Unknown body segment schema: {selected_schema!r}")

    BODY_SEGMENT_PART_IDS.clear()
    BODY_SEGMENT_PART_IDS.update(selected_part_ids)
    BODY_SEGMENT_PART_NAMES.clear()
    BODY_SEGMENT_PART_NAMES.update({part_id: name for name, part_id in BODY_SEGMENT_PART_IDS.items()})

    split_cfg = upper_arm_split if upper_arm_split is not None else body_segment_cfg.get("upper_arm_split")
    if split_cfg is not None:
        if "ratio_start" in split_cfg or "ratio_end" in split_cfg:
            ratio_start = float(split_cfg.get("ratio_start", DEFAULT_UPPER_ARM_RATIO_START))
            ratio_end = float(split_cfg.get("ratio_end", DEFAULT_UPPER_ARM_RATIO_END))
            UPPER_ARM_SPLIT_CONFIG = {
                "leftArm": {"target": "leftUpperArm", "ratio_start": ratio_start, "ratio_end": ratio_end},
                "rightArm": {"target": "rightUpperArm", "ratio_start": ratio_start, "ratio_end": ratio_end},
            }
        else:
            UPPER_ARM_SPLIT_CONFIG = {
                str(name): {
                    "target": str(values.get("target", "")),
                    "ratio_start": float(values.get("ratio_start", DEFAULT_UPPER_ARM_RATIO_START)),
                    "ratio_end": float(values.get("ratio_end", DEFAULT_UPPER_ARM_RATIO_END)),
                }
                for name, values in split_cfg.items()
            }

    override_cost = cost_config if cost_config is not None else body_segment_cfg.get("cost_config")
    if override_cost is not None:
        BODY_SEGMENT_SURFACE_COST_CONFIG.update(_coerce_cost_config(override_cost))

    _validate_segment_config()
    return {
        "schema": BODY_SEGMENT_SCHEMA,
        "part_ids": body_segment_part_ids(),
        "cost_config": dict(BODY_SEGMENT_SURFACE_COST_CONFIG),
        "upper_arm_split": dict(UPPER_ARM_SPLIT_CONFIG),
    }


def normalize_vectors(vectors):
    vectors = np.asarray(vectors, dtype=np.float64)
    return vectors / np.maximum(np.linalg.norm(vectors, axis=-1, keepdims=True), 1e-12)


def smpl_frame_to_robot_root(points):
    points = np.asarray(points, dtype=np.float32)
    out = np.empty_like(points)
    out[..., 0] = points[..., 2]
    out[..., 1] = points[..., 0]
    out[..., 2] = points[..., 1]
    return out


def robot_root_to_smpl_frame(points):
    points = np.asarray(points, dtype=np.float32)
    out = np.empty_like(points)
    out[..., 0] = points[..., 1]
    out[..., 1] = points[..., 2]
    out[..., 2] = points[..., 0]
    return out


def load_segfit_smplx_parts():
    for candidate in SEGFIT_SRC_CANDIDATES:
        if candidate.exists():
            if str(candidate) not in sys.path:
                sys.path.insert(0, str(candidate))
            from body_part_idcs import PART_NAMES, SMPLX_2_BODY_PARTS

            return np.asarray(SMPLX_2_BODY_PARTS, dtype=np.int32), dict(PART_NAMES)
    candidates = ", ".join(str(path) for path in SEGFIT_SRC_CANDIDATES)
    raise FileNotFoundError(f"Could not find segfit body_part_idcs.py under: {candidates}")


@lru_cache(maxsize=1)
def load_smplx_55_to_17_config():
    for candidate in BODY_SEGMENT_17_CONFIG_CANDIDATES:
        if not candidate.exists():
            continue
        data = json.loads(candidate.read_text())
        class_names = {int(key): str(value) for key, value in data["class_names"].items()}
        segm_id_to_class_id = data["segm_id_to_class_id"]
        max_segm_id = max(int(key) for key in segm_id_to_class_id)
        segm_map = np.zeros(max_segm_id + 1, dtype=np.int32)
        for key, value in segm_id_to_class_id.items():
            segm_map[int(key)] = int(value)
        source_segmentation = Path(data["source_segmentation"]).expanduser()
        return class_names, segm_map, source_segmentation, candidate
    return BODY_SEGMENT_PART_NAMES, SMPLX_55_TO_17_SEGM_ID_TO_CLASS_ID, None, None


def resolve_smplx_55_segmentation_path(source_segmentation=None):
    candidates = []
    if source_segmentation is not None:
        candidates.append(Path(source_segmentation).expanduser())
    candidates.extend(SMPLX_55_SEGMENTATION_CANDIDATES)
    for candidate in candidates:
        if candidate.exists():
            return candidate
    preview = ", ".join(str(path) for path in candidates)
    raise FileNotFoundError(f"Could not find SMPL-X 55-class face segmentation pkl. Tried: {preview}")


@lru_cache(maxsize=1)
def load_smplx17_face_parts():
    part_names, segm_map, source_segmentation, config_path = load_smplx_55_to_17_config()
    segmentation_path = resolve_smplx_55_segmentation_path(source_segmentation)
    with segmentation_path.open("rb") as handle:
        data = pickle.load(handle, encoding="latin1")
    if not isinstance(data, dict) or "segm" not in data:
        raise ValueError(f"SMPL-X segmentation pkl must contain key 'segm': {segmentation_path}")
    segm_ids = np.asarray(data["segm"], dtype=np.int32).reshape(-1)
    if segm_ids.size == 0:
        raise ValueError(f"SMPL-X segmentation has no face labels: {segmentation_path}")
    if int(segm_ids.max()) >= len(segm_map):
        raise ValueError(
            f"SMPL-X segmentation id {int(segm_ids.max())} is outside 55-to-17 map length {len(segm_map)}."
        )
    face_part_ids = segm_map[segm_ids].astype(np.int32)
    return face_part_ids, dict(part_names), segmentation_path, config_path


def vertex_part_ids_from_face_part_ids(faces, face_part_ids, vertex_count=None):
    faces = np.asarray(faces, dtype=np.int32)
    face_part_ids = np.asarray(face_part_ids, dtype=np.int32).reshape(-1)
    if len(face_part_ids) != len(faces):
        raise ValueError(f"face_part_ids length {len(face_part_ids)} does not match faces={len(faces)}")
    if vertex_count is None:
        vertex_count = int(np.max(faces)) + 1
    max_part_id = int(face_part_ids.max()) if face_part_ids.size else 0
    counts = np.zeros((int(vertex_count), max_part_id + 1), dtype=np.int32)
    for face, part_id in zip(faces, face_part_ids):
        part_id = int(part_id)
        if part_id <= 0:
            continue
        counts[face, part_id] += 1
    vertex_part_ids = counts.argmax(axis=1).astype(np.int32)
    vertex_part_ids[counts.max(axis=1) == 0] = 0
    return vertex_part_ids


@lru_cache(maxsize=1)
def smplx_vertex_part_ids_from_17_segments():
    face_part_ids, part_names, _segmentation_path, _config_path = load_smplx17_face_parts()
    if len(face_part_ids) != 20908:
        raise ValueError(f"Expected SMPL-X 55-class segmentation faces=20908, got {len(face_part_ids)}.")
    # SMPL-X face order is stable for the model files used by this pipeline.
    import smplx as _smplx

    model_path = ROOT / "smpl"
    direct_file = model_path / "SMPLX_NEUTRAL.pkl"
    model = _smplx.SMPLX(
        str(direct_file if direct_file.is_file() else model_path),
        gender="neutral",
        use_pca=False,
        flat_hand_mean=True,
        num_betas=10,
        ext="pkl",
        batch_size=1,
    )
    faces = np.asarray(model.faces, dtype=np.int32)
    if len(faces) != len(face_part_ids):
        raise ValueError(f"SMPL-X model faces={len(faces)} does not match segmentation faces={len(face_part_ids)}.")
    return vertex_part_ids_from_face_part_ids(faces, face_part_ids, SMPLX_VERTEX_COUNT), part_names


def model_transfer_zip_candidates():
    env_path = os.environ.get(MODEL_TRANSFER_ZIP_ENV)
    if env_path:
        yield Path(env_path).expanduser()
    yield from MODEL_TRANSFER_ZIP_CANDIDATES


def resolve_model_transfer_zip(path=None):
    if path is not None:
        candidate = Path(path).expanduser()
        if candidate.exists():
            return candidate
        raise FileNotFoundError(f"MODEL_TRANSFER_ZIP does not exist: {candidate}")
    for candidate in model_transfer_zip_candidates():
        if candidate.exists():
            return candidate
    candidates = ", ".join(str(path) for path in model_transfer_zip_candidates())
    raise FileNotFoundError(
        "Could not find model_transfer.zip for SMPLX-to-SMPL segment transfer. "
        f"Set {MODEL_TRANSFER_ZIP_ENV} or place it at one of: {candidates}"
    )


@lru_cache(maxsize=8)
def _load_transfer_matrix(zip_path, member_name):
    with zipfile.ZipFile(zip_path) as archive:
        with archive.open(member_name) as handle:
            data = pickle.load(handle, encoding="latin1")
    if not isinstance(data, dict) or "mtx" not in data:
        raise ValueError(f"{member_name} in {zip_path} does not contain a transfer matrix under key 'mtx'.")
    return data["mtx"].tocsr()


def load_smplx_to_smpl_transfer_matrix(model_transfer_zip=None):
    zip_path = resolve_model_transfer_zip(model_transfer_zip)
    return _load_transfer_matrix(str(zip_path), "smplx2smpl_deftrafo_setup.pkl"), zip_path


def transfer_categorical_vertex_labels(transfer_matrix, source_labels, source_vertex_count):
    matrix = transfer_matrix.tocsr()
    source_labels = np.asarray(source_labels, dtype=np.int32).reshape(-1)
    out = np.zeros(matrix.shape[0], dtype=np.int32)
    for row in range(matrix.shape[0]):
        start, end = matrix.indptr[row], matrix.indptr[row + 1]
        cols = matrix.indices[start:end]
        weights = matrix.data[start:end]
        valid = cols < int(source_vertex_count)
        if not np.any(valid):
            continue
        cols = cols[valid]
        weights = weights[valid]
        labels = source_labels[cols]
        valid = labels != 0
        if not np.any(valid):
            continue
        labels = labels[valid]
        weights = weights[valid]
        scores = np.bincount(labels, weights=np.maximum(weights, 0.0))
        if scores.size > 0 and float(scores.max()) > 0.0:
            out[row] = int(np.argmax(scores))
        else:
            out[row] = int(labels[int(np.argmax(np.abs(weights)))])
    return out


def smpl_vertex_part_ids_from_smplx(model_transfer_zip=None, log_prefix="Retarget"):
    smplx_vertex_part_ids, part_names = smplx_vertex_part_ids_from_17_segments()
    transfer_matrix, zip_path = load_smplx_to_smpl_transfer_matrix(model_transfer_zip)
    if transfer_matrix.shape[0] != SMPL_VERTEX_COUNT:
        raise ValueError(f"Expected SMPL transfer target rows={SMPL_VERTEX_COUNT}, got {transfer_matrix.shape[0]}.")
    smpl_vertex_part_ids = transfer_categorical_vertex_labels(
        transfer_matrix,
        smplx_vertex_part_ids,
        source_vertex_count=len(smplx_vertex_part_ids),
    )
    counts = {
        part_names.get(int(part_id), str(int(part_id))): int((smpl_vertex_part_ids == part_id).sum())
        for part_id in sorted(np.unique(smpl_vertex_part_ids))
        if int(part_id) != 0
    }
    print(f"[{log_prefix}] transferred SMPL-X 17 body segment labels to SMPL vertices using {zip_path}: {counts}")
    return smpl_vertex_part_ids, part_names


def _candidate_soma_asset_roots():
    env_path = os.environ.get(SOMA_ASSETS_ENV)
    if env_path:
        yield Path(env_path).expanduser()
    yield from SOMA_ASSET_ROOT_CANDIDATES


def _candidate_soma_smplx_asset_dirs(path=None):
    if path is not None:
        raw = Path(path).expanduser()
        yield raw if raw.name == "SMPLX" else raw / "SMPLX"
        return
    env_path = os.environ.get(SOMA_SMPLX_ASSETS_ENV)
    if env_path:
        raw = Path(env_path).expanduser()
        yield raw if raw.name == "SMPLX" else raw / "SMPLX"
    for root in _candidate_soma_asset_roots():
        yield Path(root) / "SMPLX"


def resolve_soma_smplx_assets_dir(path=None):
    candidates = []
    for candidate in _candidate_soma_smplx_asset_dirs(path):
        candidates.append(candidate)
        if (candidate / "base_body.obj").exists() and (candidate / "SOMA_wrap.obj").exists():
            return candidate
    preview = ", ".join(str(candidate) for candidate in candidates)
    raise FileNotFoundError(
        "Could not find SOMA-X SMPLX correspondence assets. Expected base_body.obj and "
        f"SOMA_wrap.obj under one of: {preview}. Set {SOMA_SMPLX_ASSETS_ENV} if needed."
    )


def resolve_soma_neutral_npz():
    candidates = []
    for root in _candidate_soma_asset_roots():
        candidate = Path(root) / "SOMA_neutral.npz"
        candidates.append(candidate)
        if candidate.exists():
            return candidate
    preview = ", ".join(str(candidate) for candidate in candidates)
    raise FileNotFoundError(f"Could not find SOMA_neutral.npz under: {preview}")


@lru_cache(maxsize=8)
def _load_obj_vertices_faces(path_str):
    mesh = trimesh.load(Path(path_str), maintain_order=True, process=False)
    return (
        np.asarray(mesh.vertices, dtype=np.float32),
        np.asarray(mesh.faces, dtype=np.int32),
    )


def barycentric_coordinates(point, triangle):
    a, b, c = np.asarray(triangle, dtype=np.float32)
    point = np.asarray(point, dtype=np.float32)
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


def _bind_points_to_mesh_faces(points, vertices, faces, nearest_vertex_k=24):
    points = np.asarray(points, dtype=np.float32)
    vertices = np.asarray(vertices, dtype=np.float32)
    faces = np.asarray(faces, dtype=np.int32)

    vertex_to_faces = [[] for _ in range(len(vertices))]
    for face_id, face in enumerate(faces):
        for vertex_id in face:
            vertex_to_faces[int(vertex_id)].append(face_id)

    tree = cKDTree(vertices)
    k = min(max(1, int(nearest_vertex_k)), len(vertices))
    _dist, nearest_vertices = tree.query(points, k=k)
    nearest_vertices = np.atleast_2d(nearest_vertices)
    if nearest_vertices.shape[0] != len(points):
        nearest_vertices = nearest_vertices.T

    face_ids = np.empty(len(points), dtype=np.int32)
    bary = np.empty((len(points), 3), dtype=np.float32)
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
        face_ids[point_id] = face_id
        bary[point_id] = barycentric_coordinates(closest[best], vertices[faces[face_id]])
        errors[point_id] = np.sqrt(float(dist2[best]))
    return {"face_ids": face_ids, "bary": bary, "errors": errors}


@lru_cache(maxsize=4)
def smplx_soma_mid_vertex_part_ids(soma_smplx_assets_dir=None):
    assets_dir = resolve_soma_smplx_assets_dir(soma_smplx_assets_dir)
    base_vertices, base_faces = _load_obj_vertices_faces(str(assets_dir / "base_body.obj"))
    wrap_vertices, wrap_faces = _load_obj_vertices_faces(str(assets_dir / "SOMA_wrap.obj"))
    smplx17_face_part_ids, part_names, _segmentation_path, _config_path = load_smplx17_face_parts()
    if len(base_faces) != len(smplx17_face_part_ids):
        raise ValueError(
            f"SMPLX base_body faces={len(base_faces)} do not match SMPL-X segmentation "
            f"faces={len(smplx17_face_part_ids)}."
        )
    binding = _bind_points_to_mesh_faces(wrap_vertices, base_vertices, base_faces, nearest_vertex_k=32)
    vertex_part_ids = smplx17_face_part_ids[binding["face_ids"]].astype(np.int32)
    return vertex_part_ids, wrap_faces, part_names, str(assets_dir), binding["errors"]


@lru_cache(maxsize=2)
def soma_mid_to_low_indices():
    neutral_path = resolve_soma_neutral_npz()
    with np.load(neutral_path, allow_pickle=False) as data:
        if "lod_mid_to_low" not in data:
            raise KeyError(f"{neutral_path} does not contain lod_mid_to_low.")
        return np.asarray(data["lod_mid_to_low"], dtype=np.int64)


def soma_template_vertex_part_ids_from_smplx(template_vertex_count):
    mid_vertex_part_ids, _wrap_faces, part_names, assets_dir, errors = smplx_soma_mid_vertex_part_ids()
    template_vertex_count = int(template_vertex_count)
    if template_vertex_count == len(mid_vertex_part_ids):
        return mid_vertex_part_ids, part_names, f"smplx_soma_mid:{assets_dir}", errors
    low_ids = soma_mid_to_low_indices()
    if template_vertex_count == len(low_ids):
        return (
            mid_vertex_part_ids[low_ids].astype(np.int32),
            part_names,
            f"smplx_soma_mid_to_low:{assets_dir}",
            errors,
        )
    raise ValueError(
        "SOMA-SMPLX body segment transfer requires SOMA mid topology "
        f"({len(mid_vertex_part_ids)} verts) or low topology ({len(low_ids)} verts); "
        f"got template vertices={template_vertex_count}."
    )


def template_vertex_part_ids_from_smplx_segments(template_faces, model_transfer_zip=None, log_prefix="Retarget"):
    smplx_vertex_part_ids, part_names = smplx_vertex_part_ids_from_17_segments()
    template_vertex_count = int(np.max(template_faces)) + 1
    if template_vertex_count == SMPLX_VERTEX_COUNT:
        return smplx_vertex_part_ids, part_names, "smplx_17_vertex"
    if template_vertex_count <= SMPL_VERTEX_COUNT:
        smpl_vertex_part_ids, part_names = smpl_vertex_part_ids_from_smplx(
            model_transfer_zip,
            log_prefix=log_prefix,
        )
        return smpl_vertex_part_ids, part_names, "smpl_17_vertex"
    if template_vertex_count <= len(smplx_vertex_part_ids):
        return smplx_vertex_part_ids, part_names, "smplx_17_subset"
    raise ValueError(
        f"Template faces reference {template_vertex_count} vertices, which is not compatible with "
        f"SMPL ({SMPL_VERTEX_COUNT}) or SMPLX ({SMPLX_VERTEX_COUNT}) body segment labels."
    )


def majority_face_part_ids(faces, vertex_part_ids):
    face_parts = np.asarray(vertex_part_ids, dtype=np.int32)[np.asarray(faces, dtype=np.int32)]
    out = np.zeros(len(face_parts), dtype=np.int32)
    for face_idx, labels in enumerate(face_parts):
        labels = labels[labels != 0]
        if labels.size == 0:
            continue
        counts = np.bincount(labels)
        out[face_idx] = int(np.argmax(counts))
    return out


def slot_points_from_binding(template_vertices, template_faces, face_ids, bary=None):
    template_vertices = np.asarray(template_vertices, dtype=np.float32)
    template_faces = np.asarray(template_faces, dtype=np.int32)
    face_ids = np.asarray(face_ids, dtype=np.int32)
    triangles = template_vertices[template_faces[face_ids]]
    if bary is None:
        return triangles.mean(axis=1).astype(np.float32)
    bary = np.asarray(bary, dtype=np.float32)
    return np.einsum("nij,ni->nj", triangles, bary).astype(np.float32)


def relabel_upper_arm_slots(slot_part_ids, slot_points, log_prefix="Retarget"):
    slot_part_ids = np.asarray(slot_part_ids, dtype=np.int32).copy()
    if BODY_SEGMENT_SCHEMA != BODY_SEGMENT_SCHEMA_19:
        return slot_part_ids
    if slot_points is None:
        print(f"[{log_prefix}][WARN] upper-arm split skipped: no t-pose slot points supplied.")
        return slot_part_ids
    slot_points = np.asarray(slot_points, dtype=np.float32)
    if len(slot_points) != len(slot_part_ids):
        raise ValueError(f"slot_points length {len(slot_points)} does not match slot_part_ids={len(slot_part_ids)}")

    split_counts = {}
    for source_name, split in UPPER_ARM_SPLIT_CONFIG.items():
        target_name = str(split.get("target", ""))
        source_id = int(BODY_SEGMENT_PART_IDS_17[source_name])
        target_id = int(SMPLX_PART_IDS.get(target_name, 0))
        if target_id <= 0:
            continue
        candidates = np.flatnonzero(slot_part_ids == source_id)
        if candidates.size == 0:
            split_counts[target_name] = 0
            continue
        lateral = np.abs(slot_points[candidates, 0])
        lo = float(lateral.min())
        hi = float(lateral.max())
        if hi <= lo + 1e-8:
            ratio = np.zeros_like(lateral, dtype=np.float32)
        else:
            ratio = (lateral - lo) / (hi - lo)
        ratio_start = float(split.get("ratio_start", 0.0))
        ratio_end = float(split.get("ratio_end", DEFAULT_UPPER_ARM_RATIO_END))
        selected = candidates[(ratio >= ratio_start) & (ratio <= ratio_end)]
        slot_part_ids[selected] = target_id
        split_counts[target_name] = int(selected.size)
        split_counts[source_name] = int((slot_part_ids == source_id).sum())
    preview = ", ".join(f"{name}={count}" for name, count in split_counts.items())
    print(
        f"[{log_prefix}] {BODY_SEGMENT_SCHEMA} upper-arm split "
        f"ratio={UPPER_ARM_SPLIT_CONFIG}; {preview}"
    )
    return slot_part_ids


def smplx_slot_part_ids_from_binding(
    template_faces,
    face_ids,
    log_prefix="Retarget",
    model_transfer_zip=None,
    template_vertices=None,
    bary=None,
    slot_points=None,
):
    template_faces = np.asarray(template_faces, dtype=np.int32)
    face_ids = np.asarray(face_ids, dtype=np.int32)
    template_vertex_count = int(np.max(template_faces)) + 1
    smplx17_face_part_ids, part_names, segmentation_path, config_path = load_smplx17_face_parts()
    part_names = {**part_names, **body_segment_part_names()}
    if template_vertex_count == SMPLX_VERTEX_COUNT and len(template_faces) == len(smplx17_face_part_ids):
        face_part_ids = smplx17_face_part_ids
        topology = "smplx_55_to_17_face"
    else:
        vertex_part_ids, part_names, topology = template_vertex_part_ids_from_smplx_segments(
            template_faces,
            model_transfer_zip=model_transfer_zip,
            log_prefix=log_prefix,
        )
        if len(vertex_part_ids) <= int(np.max(template_faces)):
            raise ValueError(
                f"17-class body segment map for {topology} has {len(vertex_part_ids)} vertices, "
                f"but template faces reference vertex {int(np.max(template_faces))}."
            )
        face_part_ids = majority_face_part_ids(template_faces, vertex_part_ids)
    slot_part_ids = face_part_ids[np.asarray(face_ids, dtype=np.int32)].astype(np.int32)
    split_slot_points = slot_points
    if split_slot_points is None and template_vertices is not None:
        split_slot_points = slot_points_from_binding(template_vertices, template_faces, face_ids, bary=bary)
    slot_part_ids = relabel_upper_arm_slots(slot_part_ids, split_slot_points, log_prefix=log_prefix)
    counts = {
        part_names.get(int(part_id), str(int(part_id))): int((slot_part_ids == part_id).sum())
        for part_id in sorted(np.unique(slot_part_ids))
        if int(part_id) != 0
    }
    source = str(config_path) if config_path is not None else "embedded_55_to_17_map"
    print(
        f"[{log_prefix}] {topology.upper()} slot part labels from {BODY_SEGMENT_SCHEMA}: "
        f"{counts}; map={source}; segm={segmentation_path}"
    )
    return slot_part_ids


def soma_slot_part_ids_from_smplx_correspondence(
    template_faces,
    face_ids,
    template_vertex_count,
    slot_points=None,
    log_prefix="Retarget",
):
    template_faces = np.asarray(template_faces, dtype=np.int32)
    face_ids = np.asarray(face_ids, dtype=np.int32)
    vertex_part_ids, part_names, topology, errors = soma_template_vertex_part_ids_from_smplx(
        int(template_vertex_count)
    )
    if len(vertex_part_ids) <= int(np.max(template_faces)):
        raise ValueError(
            f"SOMA-SMPLX body segment labels have {len(vertex_part_ids)} vertices, "
            f"but template faces reference vertex {int(np.max(template_faces))}."
        )
    face_part_ids = majority_face_part_ids(template_faces, vertex_part_ids)
    if len(face_part_ids) <= int(np.max(face_ids)):
        raise ValueError(
            f"SOMA-SMPLX face segment labels have {len(face_part_ids)} faces, "
            f"but slot binding references face {int(np.max(face_ids))}."
        )
    slot_part_ids = face_part_ids[face_ids].astype(np.int32)
    slot_part_ids = relabel_upper_arm_slots(slot_part_ids, slot_points, log_prefix=log_prefix)
    counts = {
        part_names.get(int(part_id), BODY_SEGMENT_PART_NAMES.get(int(part_id), str(int(part_id)))): int(
            (slot_part_ids == part_id).sum()
        )
        for part_id in sorted(np.unique(slot_part_ids))
        if int(part_id) != 0
    }
    print(
        f"[{log_prefix}] SOMA slot part labels from SMPLX-SOMA correspondence using "
        f"{BODY_SEGMENT_SCHEMA}: {counts}; topology={topology}; "
        f"wrap_bind_error_mean={float(np.mean(errors)):.6f}, "
        f"p95={float(np.percentile(errors, 95)):.6f}"
    )
    return slot_part_ids


def body_segment_slot_groups(slot_part_ids):
    slot_part_ids = np.asarray(slot_part_ids, dtype=np.int32).reshape(-1)
    return {
        name: np.flatnonzero(slot_part_ids == int(part_id)).astype(np.int32)
        for name, part_id in SMPLX_PART_IDS.items()
    }


def _validate_segment_config():
    unknown = sorted(set(BODY_SEGMENT_SURFACE_COST_CONFIG) - set(SMPLX_PART_IDS))
    if unknown:
        raise KeyError(f"Unknown BODY_SEGMENT_SURFACE_COST_CONFIG segment names: {unknown}")


def segment_sample_counts():
    _validate_segment_config()
    return {
        name: int(BODY_SEGMENT_SURFACE_COST_CONFIG.get(name, {}).get("sample_slots", 0))
        for name in SMPLX_PART_IDS
    }


def segment_cost_values(cost_name):
    _validate_segment_config()
    return {
        name: float(BODY_SEGMENT_SURFACE_COST_CONFIG.get(name, {}).get(cost_name, 0.0))
        for name in SMPLX_PART_IDS
    }


def sample_segment_slots(segment_groups, sample_counts, seed, log_prefix="Retarget"):
    rng = np.random.default_rng(int(seed))
    sampled = {}
    selected = []
    for name in SMPLX_PART_IDS:
        candidates = np.asarray(segment_groups.get(name, []), dtype=np.int32).reshape(-1)
        count = int(sample_counts.get(name, 0))
        if candidates.size == 0 or count <= 0:
            slot_ids = np.zeros(0, dtype=np.int32)
        elif count >= len(candidates):
            slot_ids = np.sort(candidates).astype(np.int32)
        else:
            slot_ids = np.sort(rng.choice(candidates, size=count, replace=False)).astype(np.int32)
        sampled[name] = slot_ids
        selected.append(slot_ids)
    selected = np.unique(np.concatenate(selected)).astype(np.int32) if selected else np.zeros(0, dtype=np.int32)
    preview = ", ".join(f"{name}={len(sampled[name])}/{sample_counts[name]}" for name in SMPLX_PART_IDS)
    print(f"[{log_prefix}] selected segment slots: total={len(selected)}, {preview}")
    return selected, sampled


def surface_slot_costs_from_segments(num_slots, slot_part_ids, cost_name, label, log_prefix="Retarget"):
    costs = np.zeros(int(num_slots), dtype=np.float64)
    slot_part_ids = np.asarray(slot_part_ids, dtype=np.int32).reshape(-1)
    if len(slot_part_ids) != int(num_slots):
        raise ValueError(f"slot_part_ids length {len(slot_part_ids)} does not match num_slots={num_slots}")
    values = segment_cost_values(cost_name)
    for name, slot_ids in body_segment_slot_groups(slot_part_ids).items():
        costs[slot_ids] = values[name]
    active = np.flatnonzero(costs > 0.0)
    config_preview = ", ".join(f"{name}={values[name]:.4f}" for name in SMPLX_PART_IDS)
    print(
        f"[{log_prefix}][{label}] segment costs {config_preview}; "
        f"active_slots={len(active)}/{num_slots}"
    )
    return costs


def parse_body_topk_config(value):
    """Parse per-body top-k counts for source-clearance self-contact maps."""
    if value is None:
        return {}
    if isinstance(value, dict):
        raw = value
    elif isinstance(value, str):
        text = value.strip()
        if not text or text.lower() in ("none", "null", "{}"):
            return {}
        if text.startswith("{"):
            raw = json.loads(text)
            if not isinstance(raw, dict):
                raise ValueError("self_contact_map_body_topk JSON must be an object")
        else:
            raw = {}
            for item in text.split(","):
                item = item.strip()
                if not item:
                    continue
                if "=" in item:
                    key, cap = item.split("=", 1)
                elif ":" in item:
                    key, cap = item.split(":", 1)
                else:
                    raise ValueError(f"Invalid body top-k item {item!r}; use body=count")
                raw[key.strip()] = cap.strip()
    else:
        raise TypeError(f"Unsupported body top-k config type: {type(value).__name__}")

    topk = {}
    for name, count in raw.items():
        count_value = int(count)
        if count_value < 0:
            raise ValueError(f"Body top-k for {name!r} must be >= 0, got {count_value}")
        topk[str(name)] = count_value
    return topk


parse_body_slot_caps = parse_body_topk_config


def non_adjacent_segment_pair_mask(slot_part_ids, slot_ids):
    slot_ids = np.asarray(slot_ids, dtype=np.int32).reshape(-1)
    part_ids = np.asarray(slot_part_ids, dtype=np.int32).reshape(-1)
    id_to_name = {int(part_id): name for name, part_id in SMPLX_PART_IDS.items()}
    adjacent = {frozenset((a, b)) for a, b in SMPLX_ADJACENT_SEGMENT_PAIRS}
    pair_mask = np.zeros((len(slot_ids), len(slot_ids)), dtype=bool)
    for row, slot_i in enumerate(slot_ids):
        name_i = id_to_name.get(int(part_ids[int(slot_i)]), "")
        for col in range(row + 1, len(slot_ids)):
            slot_j = int(slot_ids[col])
            name_j = id_to_name.get(int(part_ids[slot_j]), "")
            if not name_i or not name_j or name_i == name_j:
                continue
            if frozenset((name_i, name_j)) in adjacent:
                continue
            pair_mask[row, col] = True
    return pair_mask


def compute_source_self_contact_map_groups(
    source_slots,
    selected_slot_ids,
    source_slot_part_ids,
    modes,
    threshold=0.10,
    max_pairs=256,
    body_topk=None,
    log_prefix="Retarget",
):
    return _compute_source_self_contact_map_groups(
        source_slots,
        selected_slot_ids,
        source_slot_part_ids,
        part_name_to_id=SMPLX_PART_IDS,
        non_adjacent_pair_mask=non_adjacent_segment_pair_mask,
        modes=modes,
        threshold=threshold,
        max_pairs=max_pairs,
        body_topk=body_topk,
        log_prefix=log_prefix,
    )


def compute_source_self_contact_maps(
    source_slots,
    selected_slot_ids,
    source_slot_part_ids,
    threshold=0.10,
    max_pairs=256,
    log_prefix="Retarget",
):
    selected_slot_ids = np.asarray(selected_slot_ids, dtype=np.int32).reshape(-1)
    if selected_slot_ids.size < 2:
        empty = {"slot_pairs": np.zeros((0, 2), dtype=np.int32), "distances": np.zeros(0, dtype=np.float32)}
        return [empty for _ in range(len(source_slots))]

    threshold = float(threshold)
    max_pairs = int(max_pairs)
    valid_pair_mask = non_adjacent_segment_pair_mask(source_slot_part_ids, selected_slot_ids)
    upper_i, upper_j = np.where(valid_pair_mask)
    pair_slot_ids = np.stack([selected_slot_ids[upper_i], selected_slot_ids[upper_j]], axis=1).astype(np.int32)
    maps = []
    counts = []
    for frame_points in np.asarray(source_slots, dtype=np.float32):
        points = frame_points[selected_slot_ids]
        deltas = points[upper_i] - points[upper_j]
        distances = np.linalg.norm(deltas, axis=1).astype(np.float32)
        active = np.flatnonzero(distances <= threshold)
        if active.size > 0:
            active = active[np.argsort(distances[active])]
            if max_pairs > 0 and active.size > max_pairs:
                active = active[:max_pairs]
        maps.append({"slot_pairs": pair_slot_ids[active].astype(np.int32), "distances": distances[active].astype(np.float32)})
        counts.append(int(active.size))

    counts_arr = np.asarray(counts, dtype=np.int32)
    count_min = int(counts_arr.min()) if counts_arr.size else 0
    count_max = int(counts_arr.max()) if counts_arr.size else 0
    count_mean = float(counts_arr.mean()) if counts_arr.size else 0.0
    print(
        f"[{log_prefix}][SelfContactMap] selected_slots={len(selected_slot_ids)}, "
        f"candidate_pairs={len(pair_slot_ids)}, threshold={threshold:.4f}, "
        f"active_pairs min={count_min}, mean={count_mean:.2f}, max={count_max}, max_pairs={max_pairs}"
    )
    return maps


def compute_source_clearance_self_contact_maps(
    source_slots,
    selected_slot_ids,
    source_slot_part_ids,
    body_topk=None,
    log_prefix="Retarget",
):
    selected_slot_ids = np.asarray(selected_slot_ids, dtype=np.int32).reshape(-1)
    if selected_slot_ids.size < 2:
        empty = {
            "slot_pairs": np.zeros((0, 2), dtype=np.int32),
            "distances": np.zeros(0, dtype=np.float32),
            "weights": np.zeros(0, dtype=np.float32),
        }
        return [empty for _ in range(len(source_slots))]

    source_slot_part_ids = np.asarray(source_slot_part_ids, dtype=np.int32).reshape(-1)
    valid_pair_mask = non_adjacent_segment_pair_mask(source_slot_part_ids, selected_slot_ids)
    upper_i, upper_j = np.where(valid_pair_mask)
    if upper_i.size == 0:
        empty = {
            "slot_pairs": np.zeros((0, 2), dtype=np.int32),
            "distances": np.zeros(0, dtype=np.float32),
            "weights": np.zeros(0, dtype=np.float32),
        }
        return [empty for _ in range(len(source_slots))]

    pair_slot_ids = np.stack([selected_slot_ids[upper_i], selected_slot_ids[upper_j]], axis=1).astype(np.int32)
    pair_part_ids = np.stack(
        [source_slot_part_ids[pair_slot_ids[:, 0]], source_slot_part_ids[pair_slot_ids[:, 1]]],
        axis=1,
    )
    pair_body_ids = np.sort(pair_part_ids, axis=1)
    unique_body_pairs = np.unique(pair_body_ids, axis=0)
    body_pair_groups = []
    for body_pair in unique_body_pairs:
        body_pair_groups.append(
            (
                body_pair.astype(np.int32),
                np.flatnonzero(np.all(pair_body_ids == body_pair, axis=1)).astype(np.int32),
            )
        )

    body_topk = parse_body_topk_config(body_topk)
    default_body_topk = body_topk.get("default", body_topk.get("*", 1))
    body_topk_by_part_id = {}
    unknown_topk_names = []
    for name, count in body_topk.items():
        if name in ("default", "*"):
            continue
        part_id = SMPLX_PART_IDS.get(str(name))
        if part_id is None:
            unknown_topk_names.append(str(name))
            continue
        body_topk_by_part_id[int(part_id)] = int(count)
    if unknown_topk_names:
        print(
            f"[{log_prefix}][SelfContactMap][WARN] ignoring unknown body top-k entries: "
            f"{', '.join(sorted(unknown_topk_names))}"
        )

    def keep_count_for_body_pair(body_pair):
        part_i, part_j = int(body_pair[0]), int(body_pair[1])
        keep_i = body_topk_by_part_id.get(part_i, default_body_topk)
        keep_j = body_topk_by_part_id.get(part_j, default_body_topk)
        return max(int(keep_i), int(keep_j))

    maps = []
    counts = []
    for frame_points in np.asarray(source_slots, dtype=np.float32):
        points = frame_points[selected_slot_ids]
        deltas = points[upper_i] - points[upper_j]
        distances = np.linalg.norm(deltas, axis=1).astype(np.float32)
        active_chunks = []
        for body_pair, group in body_pair_groups:
            if group.size == 0:
                continue
            keep_per_group = keep_count_for_body_pair(body_pair)
            if keep_per_group <= 0:
                continue
            order = np.argsort(distances[group])
            active_chunks.append(group[order[:keep_per_group]])
        active = np.concatenate(active_chunks).astype(np.int32) if active_chunks else np.zeros(0, dtype=np.int32)
        active_distances = distances[active].astype(np.float32)
        weights = np.ones(len(active_distances), dtype=np.float32)
        if len(active_distances) > 1:
            rank_order = np.argsort(active_distances)
            rank_weights = np.linspace(1.0, 0.1, len(active_distances), dtype=np.float32)
            weights[rank_order] = rank_weights
        maps.append(
            {
                "slot_pairs": pair_slot_ids[active].astype(np.int32),
                "distances": active_distances,
                "weights": weights,
            }
        )
        counts.append(int(active.size))

    counts_arr = np.asarray(counts, dtype=np.int32)
    count_min = int(counts_arr.min()) if counts_arr.size else 0
    count_max = int(counts_arr.max()) if counts_arr.size else 0
    count_mean = float(counts_arr.mean()) if counts_arr.size else 0.0
    print(
        f"[{log_prefix}][SelfContactMap] mode=source_clearance_body_pair_topk, "
        f"selected_slots={len(selected_slot_ids)}, candidate_pairs={len(pair_slot_ids)}, "
        f"body_pairs={len(body_pair_groups)}, "
        f"active_pairs min={count_min}, mean={count_mean:.2f}, max={count_max}, "
        f"body_topk={json.dumps(body_topk, sort_keys=True)}, default_body_topk={int(default_body_topk)}, "
        "rank_weight_range=[1.0000, 0.1000]"
    )
    return maps


def pack_self_contact_maps(self_contact_maps):
    counts = np.asarray([len(item["distances"]) for item in self_contact_maps], dtype=np.int32)
    max_count = int(counts.max(initial=0))
    pair_ids = np.full((len(self_contact_maps), max_count, 2), -1, dtype=np.int32)
    distances = np.zeros((len(self_contact_maps), max_count), dtype=np.float32)
    for frame_idx, item in enumerate(self_contact_maps):
        count = int(counts[frame_idx])
        if count <= 0:
            continue
        pair_ids[frame_idx, :count] = item["slot_pairs"]
        distances[frame_idx, :count] = item["distances"]
    return pair_ids, distances, counts


def pack_self_contact_map_weights(self_contact_maps):
    counts = np.asarray([len(item["distances"]) for item in self_contact_maps], dtype=np.int32)
    max_count = int(counts.max(initial=0))
    weights = np.zeros((len(self_contact_maps), max_count), dtype=np.float32)
    for frame_idx, item in enumerate(self_contact_maps):
        count = int(counts[frame_idx])
        if count <= 0:
            continue
        item_weights = np.asarray(item.get("weights", np.ones(count, dtype=np.float32)), dtype=np.float32).reshape(-1)
        if len(item_weights) != count:
            raise ValueError(f"Self-contact weight count mismatch: weights={len(item_weights)}, pairs={count}")
        weights[frame_idx, :count] = item_weights
    return weights


def bind_source_slots_with_normals(
    slot_points,
    template_vertices,
    template_faces,
    motion_vertices,
    bind_points_to_mesh,
    dynamic_surface_template_to_world,
    nearest_vertex_k=24,
    log_prefix="Retarget",
    source_model_type="smplx",
    source_joint_names=None,
    source_template_joints=None,
):
    binding = bind_points_to_mesh(slot_points, template_vertices, template_faces, nearest_vertex_k=nearest_vertex_k)
    out = np.empty((len(motion_vertices), len(slot_points), 3), dtype=np.float32)
    normals = np.empty_like(out, dtype=np.float32)
    surface_binding = {"face_ids": binding["face_ids"], "bary": binding["bary"]}
    bound_faces = np.asarray(template_faces, dtype=np.int32)[binding["face_ids"]]
    for frame_idx in range(len(motion_vertices)):
        out[frame_idx] = dynamic_surface_template_to_world(motion_vertices[frame_idx], template_faces, surface_binding)
        triangles = motion_vertices[frame_idx][bound_faces]
        normals[frame_idx] = normalize_vectors(
            np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
        ).astype(np.float32)
    label = "SOMA" if str(source_model_type).lower() == "soma" else "SMPL"
    print(
        f"[{log_prefix}] bound {label} slots: slots={len(slot_points)}, "
        f"error_mean={float(binding['errors'].mean()):.5f}, p95={float(np.percentile(binding['errors'], 95)):.5f}"
    )
    if str(source_model_type).lower() == "soma":
        slot_part_ids = soma_slot_part_ids_from_smplx_correspondence(
            template_faces,
            binding["face_ids"],
            len(template_vertices),
            slot_points=binding["closest_points"],
            log_prefix=log_prefix,
        )
    else:
        slot_part_ids = smplx_slot_part_ids_from_binding(
            template_faces,
            binding["face_ids"],
            log_prefix=log_prefix,
            template_vertices=template_vertices,
            bary=binding["bary"],
            slot_points=binding["closest_points"],
        )
    return out, normals, slot_part_ids, binding["closest_normals"].astype(np.float32), surface_binding


def template_normals_to_world(data, template, point_ids):
    geom_ids = template["geom_ids"][point_ids]
    local_normals = template["local_normals"][point_ids]
    normals = np.empty_like(local_normals, dtype=np.float64)
    for geom_id in np.unique(geom_ids):
        mask = geom_ids == geom_id
        rot = data.geom_xmat[int(geom_id)].reshape(3, 3)
        normals[mask] = local_normals[mask] @ rot.T
    return normalize_vectors(normals)


def robot_template_normals_in_tpose_root(model, robot_template, apply_tpose_fn, point_cloud_center_name):
    ref_data = mujoco.MjData(model)
    mujoco.mj_resetData(model, ref_data)
    if apply_tpose_fn is not None:
        apply_tpose_fn(model, ref_data)
    mujoco.mj_forward(model, ref_data)
    point_ids = np.arange(len(robot_template["geom_ids"]), dtype=np.int32)
    normals_world = template_normals_to_world(ref_data, robot_template, point_ids)
    center_rot, center_label = point_cloud_center_rotation(model, ref_data, point_cloud_center_name)
    if center_label != str(point_cloud_center_name):
        print(f"[BodySegmentSurface] point cloud center {point_cloud_center_name!r} resolved as {center_label}")
    return normalize_vectors(normals_world @ center_rot).astype(np.float32)


def triangle_frames(vertices, faces):
    triangles = np.asarray(vertices, dtype=np.float64)[np.asarray(faces, dtype=np.int32)]
    e1 = normalize_vectors(triangles[:, 1] - triangles[:, 0])
    normals = normalize_vectors(np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0]))
    e2 = normalize_vectors(np.cross(normals, e1))
    return np.stack([e1, e2, normals], axis=-1)


def transport_tpose_robot_normals(
    robot_tpose_normals_smpl,
    source_binding,
    template_vertices,
    template_faces,
    motion_vertices,
):
    face_ids = np.asarray(source_binding["face_ids"], dtype=np.int32)
    slot_faces = np.asarray(template_faces, dtype=np.int32)[face_ids]
    template_basis = triangle_frames(template_vertices, slot_faces)
    robot_tpose_normals_smpl = normalize_vectors(robot_tpose_normals_smpl)
    targets = np.empty((len(motion_vertices), len(face_ids), 3), dtype=np.float32)
    for frame_idx, vertices in enumerate(motion_vertices):
        frame_basis = triangle_frames(vertices, slot_faces)
        rotations = frame_basis @ np.swapaxes(template_basis, 1, 2)
        targets[frame_idx] = normalize_vectors(np.einsum("nij,nj->ni", rotations, robot_tpose_normals_smpl)).astype(np.float32)
    return targets


def compute_tpose_surface_normal_offsets(
    model,
    robot_template,
    source_template_normals,
    apply_tpose_fn,
    point_cloud_center_name,
    log_prefix="Retarget",
):
    robot_normals_root = normalize_vectors(
        robot_template_normals_in_tpose_root(model, robot_template, apply_tpose_fn, point_cloud_center_name)
    )
    source_normals_root = normalize_vectors(smpl_frame_to_robot_root(source_template_normals))
    if len(robot_normals_root) != len(source_normals_root):
        raise ValueError(
            f"Surface normal offset slot mismatch: robot={len(robot_normals_root)} source={len(source_normals_root)}"
        )
    offsets = robot_normals_root - source_normals_root
    magnitudes = np.linalg.norm(offsets, axis=1)
    print(
        f"[{log_prefix}][SurfaceNormal] reference-pose normal offset magnitude: "
        f"mean={float(magnitudes.mean()):.5f}, p95={float(np.percentile(magnitudes, 95)):.5f}, "
        f"max={float(magnitudes.max()):.5f}"
    )
    return offsets.astype(np.float32), robot_root_to_smpl_frame(robot_normals_root).astype(np.float32)


def normal_jacobian(model, data, geom_id, point, normal_world):
    body_id = int(model.geom_bodyid[int(geom_id)])
    jacp = np.zeros((3, model.nv), dtype=np.float64)
    jacr = np.zeros((3, model.nv), dtype=np.float64)
    mujoco.mj_jac(model, data, jacp, jacr, np.asarray(point, dtype=np.float64), body_id)
    n = np.asarray(normal_world, dtype=np.float64).reshape(3)
    skew = np.array(
        [[0.0, -n[2], n[1]], [n[2], 0.0, -n[0]], [-n[1], n[0], 0.0]],
        dtype=np.float64,
    )
    return -skew @ jacr

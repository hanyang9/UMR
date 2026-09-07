"""Build uniformly sampled SMPL/SMPL-X and robot T-pose point clouds.

The generated `.npz` stores both sampled points and source template meshes; the
retargeter uses the points, and the binded visualizer uses the meshes to project
learned slots back onto real surfaces.
"""
from __future__ import annotations

import argparse
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

import mujoco
import numpy as np
import smplx
import torch
import trimesh

import soma_source
import nr_source
from smplx_model_loader import build_smplx_model
from mujoco_geom_surface import geom_local_mesh, surface_geom_ids
from mujoco_point_cloud_center import (
    bbox_ratio_center_frame,
    bbox_ratio_from_center_spec,
    point_cloud_center_frame,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ELEMENTS_ROOT = PROJECT_ROOT
REPO_ASSETS_ROOT = PROJECT_ROOT / "assets"
SIBLING_ASSETS_ROOT = ELEMENTS_ROOT / "assets"
ABSOLUTE_ASSETS_RE = re.compile(r"/[^\"'<>\s]*/assets/")


def asset_path(relative_path):
    relative = Path(relative_path)
    for root in (REPO_ASSETS_ROOT, SIBLING_ASSETS_ROOT):
        candidate = root / relative
        if candidate.exists():
            return candidate
    return REPO_ASSETS_ROOT / relative


def elements_path(relative_path):
    relative = Path(relative_path)
    candidate = ELEMENTS_ROOT / relative
    if candidate.exists():
        return candidate
    return candidate


def load_mujoco_model(xml_path):
    xml_path = Path(xml_path)
    text = xml_path.read_text()
    rewritten = ABSOLUTE_ASSETS_RE.sub(SIBLING_ASSETS_ROOT.as_posix() + "/", text)
    if rewritten != text:
        return mujoco.MjModel.from_xml_string(rewritten)
    return mujoco.MjModel.from_xml_path(str(xml_path))


DEFAULT_SMPL_DIR = Path("./smpl")
DEFAULT_SMPLX_DIR = Path("./smpl")
DEFAULT_SMPLH_DIR = Path("./smplh")
DEFAULT_G1_XML = asset_path("unitree_description/mjcf/g1.xml")
DEFAULT_G1_BRAINCO_HAND_XML = asset_path(
    "unitree_ros/robots/g1_with_brainco_hand/g1_29dof_mode_15_brainco_hand_tuned.xml"
)
DEFAULT_PIPLUSPRO_XML = asset_path("PiPlusPro/xml/PiPlusPro_S_12L10A2G2H1W_ZedMini.xml")
DEFAULT_BBOX_CENTER_RATIO = 0.598916
SMPL_CENTER_JOINT_IDS = {
    "pelvis": 0,
    "spine1": 3,
}
ROBOT_SAMPLE_NAMES = {
    "unitree_g1",
    "unitree_g1_brainco_hand",
    "pipluspro",
}


@dataclass(frozen=True)
class SupportedRobotSampleSpec:
    name: str
    xml_path: Path
    root_body_name: str
    tpose_qpos: dict
    reset_key: str | None = None


def parse_args():
    parser = argparse.ArgumentParser(description="Build T-pose/root-frame point clouds for correspondence AE training.")
    parser.add_argument("--smpl-dir", type=Path, default=DEFAULT_SMPL_DIR)
    parser.add_argument("--smplx-dir", type=Path, default=DEFAULT_SMPLX_DIR)
    parser.add_argument("--smplh-dir", type=Path, default=DEFAULT_SMPLH_DIR)
    parser.add_argument("--g1-xml", type=Path, default=DEFAULT_G1_XML)
    parser.add_argument(
        "--include-original-g1",
        action="store_true",
        default=False,
        help="Also build the original Unitree G1 template. Default keeps only the BrainCo-hand G1 robot template.",
    )
    parser.add_argument(
        "--g1-brainco-hand-xml",
        "--g1-brainco-hand-urdf",
        type=Path,
        dest="g1_brainco_hand_xml",
        default=DEFAULT_G1_BRAINCO_HAND_XML,
        help="Path to the Unitree G1 MJCF/URDF with BrainCo dexterous hands.",
    )
    parser.add_argument(
        "--include-g1-brainco-hand",
        action="store_true",
        default=True,
        help="Build the Unitree G1 template using the BrainCo dexterous hand model.",
    )
    parser.add_argument(
        "--no-g1-brainco-hand",
        dest="include_g1_brainco_hand",
        action="store_false",
        help="Skip the BrainCo-hand G1 template.",
    )
    parser.add_argument(
        "--pipluspro-xml",
        type=Path,
        default=DEFAULT_PIPLUSPRO_XML,
        help="Path to the PiPlusPro MuJoCo XML.",
    )
    parser.add_argument(
        "--include-pipluspro",
        action="store_true",
        default=True,
        help="Build the PiPlusPro robot template.",
    )
    parser.add_argument(
        "--no-pipluspro",
        dest="include_pipluspro",
        action="store_false",
        help="Skip the PiPlusPro robot template.",
    )
    parser.add_argument(
        "--pipluspro-root-body",
        type=str,
        default="base_link",
        help="Root body used to express PiPlusPro visual meshes in a local frame.",
    )
    parser.add_argument(
        "--pipluspro-pose",
        choices=["tpose", "default"],
        default="tpose",
        help="PiPlusPro pose used before surface sampling.",
    )
    parser.add_argument(
        "--include-supported-robots",
        action="store_true",
        default=True,
        help=(
            "Build additional supported robot templates: "
            f"{', '.join(SUPPORTED_ROBOT_SAMPLE_NAMES)}."
        ),
    )
    parser.add_argument(
        "--no-supported-robots",
        dest="include_supported_robots",
        action="store_false",
        help="Skip additional supported robot templates.",
    )
    parser.add_argument(
        "--supported-robot-names",
        nargs="+",
        choices=SUPPORTED_ROBOT_SAMPLE_NAMES,
        default=list(SUPPORTED_ROBOT_SAMPLE_NAMES),
        help="Subset of additional supported robots to sample. G1 and PiPlusPro are handled by their own flags.",
    )
    parser.add_argument(
        "--supported-robot-pose",
        choices=["tpose", "default"],
        default="tpose",
        help="Pose used for additional supported robots before surface sampling.",
    )
    parser.add_argument("--out", type=Path, default=Path("data/correspondence_ae_tpose_4096.npz"))
    parser.add_argument("--num-points", type=int, default=4096)
    parser.add_argument("--surface-oversample-ratio", type=int, default=8)
    parser.add_argument("--surface-curvature-weight", type=float, default=0.0)
    parser.add_argument("--surface-curvature-power", type=float, default=1.0)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument(
        "--smpl-center",
        choices=["spine1", "pelvis", "model_origin", "bbox_ratio"],
        default="spine1",
        help="SMPL/SMPL-X/SMPL-H zero-pose center used before sampling.",
    )
    parser.add_argument(
        "--bbox-center-ratio",
        type=float,
        default=DEFAULT_BBOX_CENTER_RATIO,
        help=(
            "Vertical bbox ratio used by --smpl-center bbox_ratio. "
            "The default matches the current G1 pelvis/waist vertical bbox ratio."
        ),
    )
    parser.add_argument(
        "--g1-to-smpl-frame",
        action="store_true",
        default=True,
        help="Convert G1 MuJoCo root frame to SMPL-style frame: x=lateral, y=up, z=forward.",
    )
    parser.add_argument(
        "--no-g1-to-smpl-frame",
        dest="g1_to_smpl_frame",
        action="store_false",
        help="Keep G1 in its native MuJoCo root frame.",
    )
    parser.add_argument(
        "--g1-pose",
        choices=["tpose", "default"],
        default="tpose",
        help="G1 pose used before surface sampling. tpose aligns arms with SMPL-style T-pose.",
    )
    parser.add_argument(
        "--robot-exterior-surface",
        dest="robot_exterior_surface",
        action="store_true",
        default=True,
        help="Filter robot samples to exterior-visible visual surfaces.",
    )
    parser.add_argument(
        "--no-robot-exterior-surface",
        dest="robot_exterior_surface",
        action="store_false",
        help="Use all robot visual mesh surfaces, including covered/internal surfaces.",
    )
    parser.add_argument(
        "--robot-exterior-occlusion-distance",
        dest="robot_exterior_occlusion_distance",
        type=float,
        default=0.12,
        help="Ray distance used to reject robot surface points covered by another visual mesh surface.",
    )
    parser.add_argument(
        "--robot-exterior-method",
        dest="robot_exterior_method",
        choices=["first_hit", "normal_occlusion"],
        default="first_hit",
        help=(
            "Robot exterior filter. first_hit keeps only samples whose own triangle is externally "
            "visible from multiple outside view directions; normal_occlusion is the older local occlusion test."
        ),
    )
    parser.add_argument(
        "--robot-exterior-ray-distance",
        dest="robot_exterior_ray_distance",
        type=float,
        default=0.0,
        help="Outside ray start distance for first_hit. 0 uses twice the robot mesh bbox diagonal.",
    )
    return parser.parse_args()


def sample_points_on_triangles(triangles, rng):
    r1 = np.sqrt(rng.random(len(triangles)))
    r2 = rng.random(len(triangles))
    w0 = 1.0 - r1
    w1 = r1 * (1.0 - r2)
    w2 = r1 * r2
    return (
        w0[:, None] * triangles[:, 0]
        + w1[:, None] * triangles[:, 1]
        + w2[:, None] * triangles[:, 2]
    )


def farthest_point_sampling(points, num_samples, seed=0):
    if len(points) <= num_samples:
        return np.arange(len(points), dtype=np.int32)

    rng = np.random.default_rng(seed)
    selected = np.empty(num_samples, dtype=np.int32)
    selected[0] = int(rng.integers(len(points)))

    diff = points - points[selected[0]]
    min_dist2 = np.einsum("ij,ij->i", diff, diff)

    for i in range(1, num_samples):
        next_idx = int(np.argmax(min_dist2))
        selected[i] = next_idx
        diff = points - points[next_idx]
        dist2 = np.einsum("ij,ij->i", diff, diff)
        min_dist2 = np.minimum(min_dist2, dist2)

    return selected


def face_curvature_scores(faces, normals):
    scores = np.zeros(len(faces), dtype=np.float64)
    counts = np.zeros(len(faces), dtype=np.int32)
    edge_to_face = {}

    for face_id, face in enumerate(faces):
        edges = ((face[0], face[1]), (face[1], face[2]), (face[2], face[0]))
        for a, b in edges:
            edge = (int(a), int(b)) if a < b else (int(b), int(a))
            other = edge_to_face.get(edge)
            if other is None:
                edge_to_face[edge] = face_id
                continue
            normal_delta = 1.0 - float(np.clip(np.dot(normals[face_id], normals[other]), -1.0, 1.0))
            scores[face_id] += normal_delta
            scores[other] += normal_delta
            counts[face_id] += 1
            counts[other] += 1

    scores = scores / np.maximum(counts, 1)
    scale = np.percentile(scores[scores > 0.0], 95) if np.any(scores > 0.0) else 0.0
    if scale > 1e-12:
        scores = np.clip(scores / scale, 0.0, 1.0)
    return scores


def make_ray_intersector(mesh, require_embree=False, context="ray intersection"):
    try:
        from trimesh.ray.ray_pyembree import RayMeshIntersector

        return RayMeshIntersector(mesh)
    except Exception as exc:
        if require_embree:
            raise RuntimeError(
                f"{context} requires trimesh's Embree backend, but ray_pyembree is unavailable. "
                "Install embreex in this Python environment, or use an environment where "
                "`from trimesh.ray.ray_pyembree import RayMeshIntersector` succeeds. "
                "Without Embree, trimesh falls back to the pure triangle intersector, which is "
                "too slow and memory-hungry for robot first_hit surface sampling."
            ) from exc
        return trimesh.ray.ray_triangle.RayMeshIntersector(mesh)


def sample_surface(
    vertices,
    faces,
    num_points,
    seed,
    oversample_ratio=8,
    curvature_weight=0.0,
    curvature_power=1.0,
    exterior_only=False,
    exterior_occlusion_distance=0.12,
    exterior_ray_offset=1e-4,
    exterior_method="normal_occlusion",
    exterior_ray_distance=0.0,
):
    vertices = np.asarray(vertices, dtype=np.float64)
    faces = np.asarray(faces, dtype=np.int32)
    triangles = vertices[faces]
    face_normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    normal_lengths = np.linalg.norm(face_normals, axis=1)
    areas = 0.5 * normal_lengths
    valid = areas > 1e-12
    if not np.any(valid):
        raise ValueError("No valid mesh triangles found for surface sampling.")

    valid_face_ids = np.flatnonzero(valid).astype(np.int32)
    triangles = triangles[valid]
    areas = areas[valid]
    normals = face_normals[valid] / normal_lengths[valid, None]
    if curvature_weight > 0.0:
        curvature = face_curvature_scores(faces[valid], normals)
        curvature = np.power(curvature, max(float(curvature_power), 1e-6))
        areas = areas * (1.0 + float(curvature_weight) * curvature)

    rng = np.random.default_rng(seed)
    candidate_multiplier = 12 if exterior_only and exterior_method == "first_hit" else (4 if exterior_only else 1)
    num_candidates = max(int(num_points) * int(oversample_ratio) * candidate_multiplier, int(num_points))
    picked = rng.choice(
        len(areas),
        size=num_candidates,
        replace=True,
        p=areas / areas.sum(),
    )
    candidate_points = sample_points_on_triangles(triangles[picked], rng)
    candidate_normals = normals[picked]
    candidate_face_ids = valid_face_ids[picked]
    if exterior_only:
        keep_exterior = exterior_surface_mask(
            vertices,
            faces,
            candidate_points,
            candidate_normals,
            candidate_face_ids,
            ray_offset=exterior_ray_offset,
            max_distance=exterior_occlusion_distance,
            method=exterior_method,
            ray_distance=exterior_ray_distance,
        )
        kept_count = int(keep_exterior.sum())
        if kept_count >= num_points:
            candidate_points = candidate_points[keep_exterior]
            candidate_face_ids = candidate_face_ids[keep_exterior]
        else:
            raise RuntimeError(
                f"Exterior filter kept {kept_count}/{num_candidates} candidates, less than requested "
                f"{num_points}. Increase --surface-oversample-ratio, lower strictness, or use "
                f"--robot-exterior-method normal_occlusion. Refusing to fall back to internal surfaces."
            )
    keep = farthest_point_sampling(candidate_points, num_points, seed=seed)
    points = candidate_points[keep]
    face_ids = candidate_face_ids[keep]
    return points.astype(np.float32), face_ids.astype(np.int32)


def exterior_surface_mask(
    vertices,
    faces,
    points,
    normals,
    face_ids=None,
    ray_offset=1e-4,
    max_distance=0.12,
    method="normal_occlusion",
    ray_distance=0.0,
    chunk_size=4096,
):
    if method == "first_hit":
        return exterior_first_hit_mask(
            vertices,
            faces,
            points,
            normals,
            face_ids,
            ray_offset=ray_offset,
            ray_distance=ray_distance,
            chunk_size=chunk_size,
        )
    if method != "normal_occlusion":
        raise ValueError(f"Unknown exterior surface method: {method}")

    points = np.asarray(points, dtype=np.float64)
    normals = np.asarray(normals, dtype=np.float64)
    normal_lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    directions = normals / np.maximum(normal_lengths, 1e-12)
    mesh = trimesh.Trimesh(
        vertices=np.asarray(vertices, dtype=np.float64),
        faces=np.asarray(faces, dtype=np.int64),
        process=False,
    )
    intersector = make_ray_intersector(mesh)
    visible = np.zeros(len(points), dtype=bool)
    for sign in (1.0, -1.0):
        signed_directions = directions * sign
        side_visible = np.ones(len(points), dtype=bool)
        for start in range(0, len(points), chunk_size):
            end = min(start + chunk_size, len(points))
            origins = points[start:end] + signed_directions[start:end] * float(ray_offset)
            locations, ray_ids, _ = intersector.intersects_location(
                origins,
                signed_directions[start:end],
                multiple_hits=True,
            )
            if len(ray_ids) == 0:
                continue
            hit_vec = locations - origins[ray_ids]
            hit_dist = np.einsum("ij,ij->i", hit_vec, signed_directions[start:end][ray_ids])
            occluded_rays = np.unique(ray_ids[(hit_dist > 0.0) & (hit_dist <= float(max_distance))])
            side_visible[start + occluded_rays] = False
        visible |= side_visible
    return visible


def exterior_first_hit_directions():
    directions = []
    for x in (-1.0, 0.0, 1.0):
        for y in (-1.0, 0.0, 1.0):
            for z in (-1.0, 0.0, 1.0):
                if x == 0.0 and y == 0.0 and z == 0.0:
                    continue
                direction = np.asarray([x, y, z], dtype=np.float64)
                direction /= np.linalg.norm(direction)
                directions.append(direction)
    return np.stack(directions, axis=0)


def exterior_first_hit_mask(
    vertices,
    faces,
    points,
    normals,
    face_ids,
    ray_offset=1e-4,
    ray_distance=0.0,
    chunk_size=4096,
):
    if face_ids is None:
        raise ValueError("first_hit exterior filtering requires sample face ids.")

    vertices = np.asarray(vertices, dtype=np.float64)
    face_ids = np.asarray(face_ids, dtype=np.int64)

    bbox_diag = float(np.linalg.norm(vertices.max(axis=0) - vertices.min(axis=0)))
    outside_distance = float(ray_distance) if ray_distance and ray_distance > 0.0 else max(2.0 * bbox_diag, 1.0)

    mesh = trimesh.Trimesh(
        vertices=vertices,
        faces=np.asarray(faces, dtype=np.int64),
        process=False,
    )
    intersector = make_ray_intersector(
        mesh,
        require_embree=True,
        context="first_hit robot exterior surface filtering",
    )

    unique_face_ids, inverse = np.unique(face_ids, return_inverse=True)
    face_centers = vertices[np.asarray(faces, dtype=np.int64)[unique_face_ids]].mean(axis=1)
    face_visible_counts = np.zeros(len(unique_face_ids), dtype=np.int32)

    for view_direction in exterior_first_hit_directions():
        for start in range(0, len(unique_face_ids), chunk_size):
            end = min(start + chunk_size, len(unique_face_ids))
            origins = face_centers[start:end] + view_direction[None, :] * outside_distance
            ray_directions = np.repeat((-view_direction)[None, :], end - start, axis=0)
            first_hit_face_ids = intersector.intersects_first(
                origins + ray_directions * float(ray_offset),
                ray_directions,
            )
            face_visible_counts[start:end] += first_hit_face_ids == unique_face_ids[start:end]

    # A single ray can leak through openings in double-shell robot meshes. Requiring at least
    # two outside views removes most nested inner-shell faces while keeping externally visible parts.
    face_visible = face_visible_counts >= 2
    return face_visible[inverse]


def as_root_frame(points):
    return np.asarray(points, dtype=np.float32).copy()


def is_robot_sample_name(name):
    return str(name) in ROBOT_SAMPLE_NAMES


def g1_mujoco_to_smpl_frame(points):
    points = np.asarray(points, dtype=np.float32)
    converted = np.empty_like(points)
    # MuJoCo robot root +Y and SMPL/SMPL-X +X are both the body's left side.
    converted[:, 0] = points[:, 1]
    converted[:, 1] = points[:, 2]
    converted[:, 2] = points[:, 0]
    return converted


def coerce_betas(betas, num_betas=10):
    if betas is None:
        return None
    betas = np.asarray(betas, dtype=np.float32).reshape(-1)[: int(num_betas)]
    betas = np.pad(betas, (0, max(0, int(num_betas) - len(betas))))[: int(num_betas)]
    return betas.astype(np.float32)


def load_smpl_template(model_dir, model_type, gender, betas=None):
    betas = coerce_betas(betas, 10)
    if model_type == "smpl":
        direct_file = model_dir / f"SMPL_{gender.upper()}.pkl"
        model_path = direct_file if direct_file.is_file() else model_dir
        model = smplx.SMPL(
            str(model_path),
            gender=gender,
            num_betas=10,
            ext="pkl",
            batch_size=1,
        )
    elif model_type == "smplx":
        model = build_smplx_model(model_dir, gender, 1)
    elif model_type == "smplh":
        direct_file = model_dir / gender / "model.npz"
        if direct_file.is_file():
            temp_ctx = tempfile.TemporaryDirectory(prefix="smplh_compat_")
            compat_dir = Path(temp_ctx.name)
            source_data = np.load(direct_file, allow_pickle=True)
            data = {key: source_data[key] for key in source_data.files}
            data.setdefault("hands_componentsl", np.zeros((45, 45), dtype=np.float32))
            data.setdefault("hands_componentsr", np.zeros((45, 45), dtype=np.float32))
            data.setdefault("hands_meanl", np.zeros(45, dtype=np.float32))
            data.setdefault("hands_meanr", np.zeros(45, dtype=np.float32))
            np.savez(compat_dir / f"SMPLH_{gender.upper()}.npz", **data)
            model_path = compat_dir
        else:
            temp_ctx = None
            model_path = model_dir
        model = smplx.SMPLH(
            str(model_path),
            gender=gender,
            use_pca=False,
            flat_hand_mean=True,
            num_betas=10,
            ext="npz",
            batch_size=1,
        )
        if temp_ctx is not None:
            model._temp_ctx = temp_ctx
    else:
        raise ValueError(f"Unsupported SMPL model type: {model_type}")
    model_kwargs = {}
    if betas is not None:
        model_kwargs["betas"] = torch.from_numpy(betas[None, :])
    with torch.no_grad():
        output = model(return_verts=True, **model_kwargs)
    vertices = output.vertices[0].detach().cpu().numpy().astype(np.float32)
    joints = output.joints[0].detach().cpu().numpy().astype(np.float32)
    faces = np.asarray(model.faces, dtype=np.int32)
    return vertices, joints, faces


def bbox_ratio_center(vertices, ratio):
    vertices = np.asarray(vertices, dtype=np.float32)
    bbox_min = vertices.min(axis=0)
    bbox_max = vertices.max(axis=0)
    center = 0.5 * (bbox_min + bbox_max)
    center[1] = bbox_min[1] + float(ratio) * (bbox_max[1] - bbox_min[1])
    return center.astype(np.float32)


def bbox_ratio_center_mode_name(ratio):
    return f"bbox_ratio_{float(ratio):.6f}"


def smpl_center_offset(vertices, joints, center_mode, bbox_center_ratio):
    if center_mode == "model_origin":
        return np.zeros(3, dtype=np.float32), -1, center_mode
    if center_mode == "bbox_ratio":
        return (
            bbox_ratio_center(vertices, bbox_center_ratio),
            -2,
            bbox_ratio_center_mode_name(bbox_center_ratio),
        )
    joint_id = SMPL_CENTER_JOINT_IDS[center_mode]
    return joints[joint_id].astype(np.float32), joint_id, center_mode


def build_smpl_samples(
    model_dir,
    model_type,
    num_points,
    seed,
    oversample_ratio,
    curvature_weight,
    curvature_power,
    center_mode,
    bbox_center_ratio,
    genders=("neutral", "male", "female"),
    betas=None,
    name=None,
):
    betas = coerce_betas(betas, 10)
    samples = []
    for offset, gender in enumerate(genders):
        try:
            vertices, joints, faces = load_smpl_template(model_dir, model_type, gender, betas=betas)
        except Exception as exc:
            print(f"[Dataset] Skip {model_type}_{gender}: {exc}")
            continue
        center, joint_id, saved_center_mode = smpl_center_offset(vertices, joints, center_mode, bbox_center_ratio)
        vertices = vertices - center[None, :]
        points, face_ids = sample_surface(
            vertices,
            faces,
            num_points,
            seed + 100 * offset,
            oversample_ratio,
            curvature_weight,
            curvature_power,
        )
        sample_name = str(name) if name and len(genders) == 1 else f"{model_type}_{gender}"
        if name and len(genders) != 1:
            sample_name = f"{name}_{gender}"
        samples.append(
            {
                "name": sample_name,
                "points": as_root_frame(points),
                "vertices": as_root_frame(vertices),
                "faces": faces,
                "sample_face_ids": face_ids,
                "root_offset": center.astype(np.float32),
                "center_mode": saved_center_mode,
                "betas": np.zeros(0, dtype=np.float32) if betas is None else betas.astype(np.float32),
            }
        )
        if joint_id == -2:
            joint_msg = f"bbox_ratio={bbox_center_ratio:.6f}"
        elif joint_id < 0:
            joint_msg = "model_origin"
        else:
            joint_msg = f"joint_id={joint_id}"
        print(
            f"[Dataset] Added {sample_name}: verts={len(vertices)} faces={len(faces)} "
            f"center={saved_center_mode} {joint_msg} offset={center.tolist()}"
        )
    return samples


def build_soma_samples(
    soma_usd_path,
    num_points,
    seed,
    oversample_ratio,
    curvature_weight,
    curvature_power,
    center_mode,
    bbox_center_ratio,
    name="soma",
    soma_sequence=None,
):
    if soma_sequence is not None:
        vertices, joints, faces, template = soma_source.soma_template_vertices_joints_faces(
            soma_usd_path or soma_sequence.get("soma_usd_path"),
            sequence=soma_sequence,
        )
    else:
        vertices, joints, faces, template = soma_source.soma_template_vertices_joints_faces(soma_usd_path)
    center_mode = str(center_mode)
    joint_id = -1
    saved_center_mode = center_mode
    if center_mode == "model_origin":
        center = np.zeros(3, dtype=np.float32)
    elif center_mode == "bbox_ratio":
        center = bbox_ratio_center(vertices, bbox_center_ratio)
        joint_id = -2
        saved_center_mode = bbox_ratio_center_mode_name(bbox_center_ratio)
    else:
        center = np.zeros(3, dtype=np.float32)
    if str(center_mode) in {"spine1", "hips", "pelvis"}:
        joint_names = list(template["joint_short_names"])
        center_name = "Spine1" if str(center_mode) == "spine1" else "Hips"
        joint_id = soma_source.soma_joint_index(joint_names, center_name, "Hips")
        center = joints[joint_id].astype(np.float32)
        saved_center_mode = str(center_mode)
    vertices = vertices - center[None, :]
    points, face_ids = sample_surface(
        vertices,
        faces,
        num_points,
        seed,
        oversample_ratio,
        curvature_weight,
        curvature_power,
    )
    joint_msg = f"joint_id={joint_id}" if int(joint_id) >= 0 else saved_center_mode
    print(
        f"[Dataset] Added {name}: verts={len(vertices)} faces={len(faces)} "
        f"center={saved_center_mode} {joint_msg} offset={center.tolist()} usd={soma_usd_path}"
    )
    return [
        {
            "name": str(name),
            "points": as_root_frame(points),
            "vertices": as_root_frame(vertices),
            "faces": faces,
            "sample_face_ids": face_ids,
            "root_offset": center.astype(np.float32),
            "center_mode": saved_center_mode,
            "betas": np.zeros(0, dtype=np.float32),
        }
    ]


def build_nr_fbx_samples(
    sequence,
    num_points,
    seed,
    oversample_ratio,
    curvature_weight,
    curvature_power,
    center_mode,
    bbox_center_ratio,
    name="nr_fbx",
):
    vertices, joints, faces, joint_names = nr_source.template_vertices_joints_faces(sequence)
    center_mode = str(center_mode)
    if center_mode == "model_origin":
        center = np.zeros(3, dtype=np.float32)
        saved_center_mode = center_mode
    elif center_mode == "bbox_ratio":
        center = bbox_ratio_center(vertices, bbox_center_ratio)
        saved_center_mode = bbox_ratio_center_mode_name(bbox_center_ratio)
    else:
        target = "Spine1" if center_mode == "spine1" else "Hips"
        candidates = [index for index, joint_name in enumerate(joint_names) if str(joint_name) == target]
        if not candidates:
            raise ValueError(f"NR FBX has no {target!r} joint for center_mode={center_mode!r}")
        center = np.asarray(joints[candidates[0]], dtype=np.float32)
        saved_center_mode = center_mode
    centered = np.asarray(vertices, dtype=np.float32) - center[None, :]
    faces = np.asarray(faces, dtype=np.int32)
    raw_vertex_count = len(centered)
    centered, inverse = np.unique(centered, axis=0, return_inverse=True)
    faces = inverse[faces].astype(np.int32)
    nondegenerate = (
        (faces[:, 0] != faces[:, 1])
        & (faces[:, 1] != faces[:, 2])
        & (faces[:, 2] != faces[:, 0])
    )
    faces = faces[nondegenerate]
    if len(faces) == 0:
        raise ValueError("NR FBX mesh has no nondegenerate faces after welding duplicate vertices")
    points, face_ids = sample_surface(
        centered,
        faces,
        num_points,
        seed,
        oversample_ratio,
        curvature_weight,
        curvature_power,
    )
    print(
        f"[Dataset] Added {name}: NR FBX welded_verts={len(centered)}/{raw_vertex_count} "
        f"faces={len(faces)} "
        f"center={saved_center_mode} offset={center.tolist()} source={sequence['nr_fbx_path']}"
    )
    return [
        {
            "name": str(name),
            "points": as_root_frame(points),
            "vertices": as_root_frame(centered),
            "faces": np.asarray(faces, dtype=np.int32),
            "sample_face_ids": np.asarray(face_ids, dtype=np.int32),
            "root_offset": center.astype(np.float32),
            "center_mode": saved_center_mode,
            "betas": np.zeros(0, dtype=np.float32),
        }
    ]


G1_TPOSE_QPOS = {
    "left_shoulder_pitch_joint": 0.0,
    "left_shoulder_roll_joint": np.deg2rad(90.0),
    "left_shoulder_yaw_joint": 0.0,
    "left_elbow_joint": np.deg2rad(90.0),
    "left_wrist_roll_joint": 0.0,
    "left_wrist_pitch_joint": 0.0,
    "left_wrist_yaw_joint": 0.0,
    "right_shoulder_pitch_joint": 0.0,
    "right_shoulder_roll_joint": np.deg2rad(-90.0),
    "right_shoulder_yaw_joint": 0.0,
    "right_elbow_joint": np.deg2rad(90.0),
    "right_wrist_roll_joint": 0.0,
    "right_wrist_pitch_joint": 0.0,
    "right_wrist_yaw_joint": 0.0,
}


G1_BRAINCO_HAND_TPOSE_QPOS = {
    "left_thumb_proximal_joint": 0.6,
    "right_thumb_proximal_joint": 0.6,
}


G1_BRAINCO_HAND_MIMIC_QPOS = {
    "left_thumb_distal_joint": ("left_thumb_proximal_joint", 0.0),
    "left_index_distal_joint": ("left_index_proximal_joint", 1.155),
    "left_middle_distal_joint": ("left_middle_proximal_joint", 1.155),
    "left_ring_distal_joint": ("left_ring_proximal_joint", 1.155),
    "left_pinky_distal_joint": ("left_pinky_proximal_joint", 1.155),
    "right_thumb_distal_joint": ("right_thumb_proximal_joint", 0.0),
    "right_index_distal_joint": ("right_index_proximal_joint", 1.155),
    "right_middle_distal_joint": ("right_middle_proximal_joint", 1.155),
    "right_ring_distal_joint": ("right_ring_proximal_joint", 1.155),
    "right_pinky_distal_joint": ("right_pinky_proximal_joint", 1.155),
}


H2_TPOSE_QPOS = {
    "left_shoulder_pitch_joint": 0.0,
    "left_shoulder_roll_joint": np.deg2rad(90.0),
    "left_shoulder_yaw_joint": 0.0,
    "left_elbow_joint": np.deg2rad(90.0),
    "left_wrist_roll_joint": 0.0,
    "left_wrist_pitch_joint": 0.0,
    "left_wrist_yaw_joint": 0.0,
    "right_shoulder_pitch_joint": 0.0,
    "right_shoulder_roll_joint": np.deg2rad(-90.0),
    "right_shoulder_yaw_joint": 0.0,
    "right_elbow_joint": np.deg2rad(90.0),
    "right_wrist_roll_joint": 0.0,
    "right_wrist_pitch_joint": 0.0,
    "right_wrist_yaw_joint": 0.0,
}


T800_TPOSE_QPOS = {
    "J00_HIP_PITCH_L": 0.0,
    "J01_HIP_ROLL_L": 0.0,
    "J02_HIP_YAW_L": 0.0,
    "J03_KNEE_PITCH_L": 0.0,
    "J04_ANKLE_PITCH_L": 0.0,
    "J05_ANKLE_ROLL_L": 0.0,
    "J06_HIP_PITCH_R": 0.0,
    "J07_HIP_ROLL_R": 0.0,
    "J08_HIP_YAW_R": 0.0,
    "J09_KNEE_PITCH_R": 0.0,
    "J10_ANKLE_PITCH_R": 0.0,
    "J11_ANKLE_ROLL_R": 0.0,
    "J12_TORSO_YAW": 0.0,
    "J13_SHOULDER_PITCH_L": 0.0,
    "J14_SHOULDER_ROLL_L": np.deg2rad(90.0),
    "J15_SHOULDER_YAW_L": 0.0,
    "J16_ELBOW_PITCH_L": 0.0,
    "J17_ELBOW_YAW_L": 0.0,
    "J18_SHOULDER_PITCH_R": 0.0,
    "J19_SHOULDER_ROLL_R": np.deg2rad(-90.0),
    "J20_SHOULDER_YAW_R": 0.0,
    "J21_ELBOW_PITCH_R": 0.0,
    "J22_ELBOW_YAW_R": 0.0,
    "J23_HEAD_PITCH": 0.0,
    "J24_HEAD_YAW": 0.0,
}


A2_TPOSE_QPOS = {
    "idx03_left_hip_pitch": 0.0,
    "idx04_left_tarsus": 0.0,
    "idx05_left_toe_pitch": 0.0,
    "idx09_right_hip_pitch": 0.0,
    "idx10_right_tarsus": 0.0,
    "idx11_right_toe_pitch": 0.0,
    "idx13_left_arm_joint1": 0.0,
    "idx14_left_arm_joint2": 0.0,
    "idx15_left_arm_joint3": np.deg2rad(90.0),
    "idx16_left_arm_joint4": 0.0,
    "idx17_left_arm_joint5": 0.0,
    "idx20_right_arm_joint1": 0.0,
    "idx21_right_arm_joint2": 0.0,
    "idx22_right_arm_joint3": np.deg2rad(90.0),
    "idx23_right_arm_joint4": 0.0,
    "idx24_right_arm_joint5": 0.0,
}


N1_TPOSE_QPOS = {
    "left_hip_pitch_joint": 0.0,
    "left_hip_roll_joint": 0.0,
    "left_hip_yaw_joint": 0.0,
    "left_knee_pitch_joint": 0.0,
    "left_ankle_roll_joint": 0.0,
    "left_ankle_pitch_joint": 0.0,
    "right_hip_pitch_joint": 0.0,
    "right_hip_roll_joint": 0.0,
    "right_hip_yaw_joint": 0.0,
    "right_knee_pitch_joint": 0.0,
    "right_ankle_roll_joint": 0.0,
    "right_ankle_pitch_joint": 0.0,
    "waist_yaw_joint": 0.0,
    "left_shoulder_pitch_joint": 0.0,
    "left_shoulder_roll_joint": np.deg2rad(90.0),
    "left_shoulder_yaw_joint": 0.0,
    "left_elbow_pitch_joint": np.deg2rad(90.0),
    "left_wrist_yaw_joint": 0.0,
    "right_shoulder_pitch_joint": 0.0,
    "right_shoulder_roll_joint": np.deg2rad(-90.0),
    "right_shoulder_yaw_joint": 0.0,
    "right_elbow_pitch_joint": np.deg2rad(90.0),
    "right_wrist_yaw_joint": 0.0,
}


K1_TPOSE_QPOS = {
    "AAHead_yaw": 0.0,
    "Head_pitch": 0.0,
    "ALeft_Shoulder_Pitch": 0.0,
    "Left_Shoulder_Roll": 0.0,
    "Left_Elbow_Pitch": 0.0,
    "Left_Elbow_Yaw": 0.0,
    "ARight_Shoulder_Pitch": 0.0,
    "Right_Shoulder_Roll": 0.0,
    "Right_Elbow_Pitch": 0.0,
    "Right_Elbow_Yaw": 0.0,
    "Left_Hip_Pitch": 0.0,
    "Left_Hip_Roll": 0.0,
    "Left_Hip_Yaw": 0.0,
    "Left_Knee_Pitch": 0.0,
    "Left_Ankle_Pitch": 0.0,
    "Left_Ankle_Roll": 0.0,
    "Right_Hip_Pitch": 0.0,
    "Right_Hip_Roll": 0.0,
    "Right_Hip_Yaw": 0.0,
    "Right_Knee_Pitch": 0.0,
    "Right_Ankle_Pitch": 0.0,
    "Right_Ankle_Roll": 0.0,
}


PIPLUSPRO_TPOSE_QPOS = {
    "r_hip_pitch_joint": 0.0,
    "r_hip_roll_joint": 0.0,
    "r_thigh_joint": 0.0,
    "r_calf_joint": 0.0,
    "r_ankle_pitch_joint": 0.0,
    "r_ankle_roll_joint": 0.0,
    "l_hip_pitch_joint": 0.0,
    "l_hip_roll_joint": 0.0,
    "l_thigh_joint": 0.0,
    "l_calf_joint": 0.0,
    "l_ankle_pitch_joint": 0.0,
    "l_ankle_roll_joint": 0.0,
    "r_shoulder_pitch_joint": 0.0,
    "r_shoulder_roll_joint": np.deg2rad(-90.0),
    "r_upper_arm_joint": 0.0,
    "r_elbow_joint": 0.0,
    "r_wrist_joint": 0.0,
    "l_shoulder_pitch_joint": 0.0,
    "l_shoulder_roll_joint": np.deg2rad(90.0),
    "l_upper_arm_joint": 0.0,
    "l_elbow_joint": 0.0,
    "l_wrist_joint": 0.0,
}


PND_ADAM_LITE_TPOSE_QPOS = {
    "hipPitch_Left": 0.0,
    "hipRoll_Left": 0.0,
    "hipYaw_Left": 0.0,
    "kneePitch_Left": 0.0,
    "anklePitch_Left": 0.0,
    "ankleRoll_Left": 0.0,
    "hipPitch_Right": 0.0,
    "hipRoll_Right": 0.0,
    "hipYaw_Right": 0.0,
    "kneePitch_Right": 0.0,
    "anklePitch_Right": 0.0,
    "ankleRoll_Right": 0.0,
    "waistRoll": 0.0,
    "waistPitch": 0.0,
    "waistYaw": 0.0,
    "shoulderPitch_Left": 0.0,
    "shoulderRoll_Left": np.deg2rad(90.0),
    "shoulderYaw_Left": 0.0,
    "elbow_Left": 0.0,
    "wristYaw_Left": 0.0,
    "shoulderPitch_Right": 0.0,
    "shoulderRoll_Right": np.deg2rad(-90.0),
    "shoulderYaw_Right": 0.0,
    "elbow_Right": 0.0,
    "wristYaw_Right": 0.0,
}


SUPPORTED_ROBOT_SAMPLE_SPECS = {
    "unitree_h2": SupportedRobotSampleSpec(
        name="unitree_h2",
        xml_path=asset_path("h2_description/H2_stl_mjcf.xml"),
        root_body_name="world",
        tpose_qpos=H2_TPOSE_QPOS,
    ),
    "engineai_t800": SupportedRobotSampleSpec(
        name="engineai_t800",
        xml_path=asset_path("t800/xml/serial_t800_tpose_mjcf.xml"),
        root_body_name="LINK_BASE",
        tpose_qpos=T800_TPOSE_QPOS,
    ),
    "agibot_a2": SupportedRobotSampleSpec(
        name="agibot_a2",
        xml_path=asset_path("agibot_a2/urdf/model_urdf_mjcf.xml"),
        root_body_name="a2_float_root",
        tpose_qpos=A2_TPOSE_QPOS,
    ),
    "fourier_n1": SupportedRobotSampleSpec(
        name="fourier_n1",
        xml_path=asset_path("fourier_n1/n1_tpose_mjcf.xml"),
        root_body_name="base_link",
        tpose_qpos=N1_TPOSE_QPOS,
    ),
    "booster_k1": SupportedRobotSampleSpec(
        name="booster_k1",
        xml_path=asset_path("booster_k1/K1_serial_tpose_mjcf.xml"),
        root_body_name="Trunk",
        tpose_qpos=K1_TPOSE_QPOS,
    ),
    "pnd_adam_lite": SupportedRobotSampleSpec(
        name="pnd_adam_lite",
        xml_path=SIBLING_ASSETS_ROOT / "pnd_adam_lite/adam_lite_tpose_mjcf.xml",
        root_body_name="pelvis",
        tpose_qpos=PND_ADAM_LITE_TPOSE_QPOS,
    ),
}
SUPPORTED_ROBOT_SAMPLE_NAMES = tuple(SUPPORTED_ROBOT_SAMPLE_SPECS)
ROBOT_SAMPLE_NAMES.update(SUPPORTED_ROBOT_SAMPLE_NAMES)


def set_joint_qpos_if_present(model, data, joint_name, value, required=False):
    joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, joint_name)
    if joint_id < 0:
        if required:
            raise ValueError(f"Robot joint not found: {joint_name}")
        return False
    data.qpos[model.jnt_qposadr[joint_id]] = value
    return True


def apply_joint_qpos(model, data, joint_qpos, required=False):
    for joint_name, value in joint_qpos.items():
        set_joint_qpos_if_present(model, data, joint_name, value, required=required)


def apply_mimic_qpos(model, data, mimic_qpos):
    for joint_name, (source_joint_name, multiplier) in mimic_qpos.items():
        source_joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, source_joint_name)
        joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, joint_name)
        if source_joint_id < 0 or joint_id < 0:
            continue
        source_value = data.qpos[model.jnt_qposadr[source_joint_id]]
        data.qpos[model.jnt_qposadr[joint_id]] = multiplier * source_value


def apply_g1_tpose(model, data):
    apply_joint_qpos(model, data, G1_TPOSE_QPOS, required=False)
    apply_joint_qpos(model, data, G1_BRAINCO_HAND_TPOSE_QPOS, required=False)
    apply_mimic_qpos(model, data, G1_BRAINCO_HAND_MIMIC_QPOS)


def visual_mesh_geom_ids(model):
    return surface_geom_ids(model).astype(np.int32)


def robot_visual_mesh_in_root_frame(
    xml_path,
    point_cloud_center_name,
    to_smpl_frame=True,
    pose="tpose",
    tpose_qpos=None,
    mimic_qpos=None,
    reset_key=None,
):
    model = load_mujoco_model(xml_path)
    data = mujoco.MjData(model)
    if reset_key:
        key_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_KEY, reset_key)
        if key_id < 0:
            raise ValueError(f"Keyframe {reset_key!r} not found in {xml_path}")
        mujoco.mj_resetDataKeyframe(model, data, key_id)
    else:
        mujoco.mj_resetData(model, data)
    if str(pose) not in {"default", "none", "raw", "off"}:
        apply_joint_qpos(model, data, tpose_qpos or {}, required=False)
        apply_mimic_qpos(model, data, mimic_qpos or {})
    mujoco.mj_forward(model, data)

    world_vertices_by_geom = []
    local_faces_by_geom = []
    for geom_id in visual_mesh_geom_ids(model):
        local_vertices, local_faces = geom_local_mesh(model, int(geom_id))
        geom_rot = data.geom_xmat[geom_id].reshape(3, 3)
        geom_pos = data.geom_xpos[geom_id]
        world_vertices_by_geom.append(local_vertices @ geom_rot.T + geom_pos)
        local_faces_by_geom.append(local_faces)

    if not world_vertices_by_geom:
        raise RuntimeError(f"No mesh or primitive surface geoms found in {xml_path}")

    bbox_ratio = bbox_ratio_from_center_spec(point_cloud_center_name)
    if bbox_ratio is None:
        center_pos, center_rot, center_label = point_cloud_center_frame(
            model, data, point_cloud_center_name, xml_path
        )
    else:
        center_pos, center_rot, center_label = bbox_ratio_center_frame(
            np.concatenate(world_vertices_by_geom, axis=0), bbox_ratio
        )
    if center_label != str(point_cloud_center_name):
        print(f"[Dataset] point cloud center {point_cloud_center_name!r} resolved as {center_label}")

    all_vertices = []
    all_faces = []
    vertex_offset = 0
    for world_vertices, local_faces in zip(world_vertices_by_geom, local_faces_by_geom):
        root_vertices = (world_vertices - center_pos) @ center_rot
        all_vertices.append(root_vertices.astype(np.float32))
        all_faces.append(local_faces + vertex_offset)
        vertex_offset += len(world_vertices)

    vertices = np.concatenate(all_vertices, axis=0).astype(np.float32)
    faces = np.concatenate(all_faces, axis=0).astype(np.int32)
    if to_smpl_frame:
        vertices = g1_mujoco_to_smpl_frame(vertices)
    return vertices, faces


def g1_visual_mesh_in_root_frame(xml_path, to_smpl_frame=True, pose="tpose"):
    return robot_visual_mesh_in_root_frame(
        xml_path,
        "pelvis",
        to_smpl_frame=to_smpl_frame,
        pose=pose,
        tpose_qpos={**G1_TPOSE_QPOS, **G1_BRAINCO_HAND_TPOSE_QPOS},
        mimic_qpos=G1_BRAINCO_HAND_MIMIC_QPOS,
    )


def build_robot_sample(
    xml_path,
    name,
    num_points,
    seed,
    oversample_ratio,
    curvature_weight,
    curvature_power,
    to_smpl_frame=True,
    pose="tpose",
    exterior_surface=True,
    exterior_occlusion_distance=0.12,
    exterior_method="first_hit",
    exterior_ray_distance=0.0,
    point_cloud_center_name="pelvis",
    tpose_qpos=None,
    mimic_qpos=None,
    reset_key=None,
    root_body_name=None,
):
    if root_body_name is not None:
        point_cloud_center_name = root_body_name
    vertices, faces = robot_visual_mesh_in_root_frame(
        xml_path,
        point_cloud_center_name,
        to_smpl_frame=to_smpl_frame,
        pose=pose,
        tpose_qpos=tpose_qpos,
        mimic_qpos=mimic_qpos,
        reset_key=reset_key,
    )
    points, face_ids = sample_surface(
        vertices,
        faces,
        num_points,
        seed,
        oversample_ratio,
        curvature_weight,
        curvature_power,
        exterior_only=exterior_surface,
        exterior_occlusion_distance=exterior_occlusion_distance,
        exterior_method=exterior_method,
        exterior_ray_distance=exterior_ray_distance,
    )
    print(
        f"[Dataset] Added {name}: verts={len(vertices)} faces={len(faces)} "
        f"exterior_surface={exterior_surface} exterior_method={exterior_method}"
    )
    return {
        "name": name,
        "points": as_root_frame(points),
        "vertices": as_root_frame(vertices),
        "faces": faces,
        "sample_face_ids": face_ids,
        "root_offset": np.zeros(3, dtype=np.float32),
        "center_mode": point_cloud_center_name,
    }


def build_g1_sample(
    xml_path,
    name,
    num_points,
    seed,
    oversample_ratio,
    curvature_weight,
    curvature_power,
    to_smpl_frame=True,
    pose="tpose",
    exterior_surface=True,
    exterior_occlusion_distance=0.12,
    exterior_method="first_hit",
    exterior_ray_distance=0.0,
):
    return build_robot_sample(
        xml_path,
        name,
        num_points,
        seed,
        oversample_ratio,
        curvature_weight,
        curvature_power,
        to_smpl_frame=to_smpl_frame,
        pose=pose,
        exterior_surface=exterior_surface,
        exterior_occlusion_distance=exterior_occlusion_distance,
        exterior_method=exterior_method,
        exterior_ray_distance=exterior_ray_distance,
        root_body_name="pelvis",
        tpose_qpos={**G1_TPOSE_QPOS, **G1_BRAINCO_HAND_TPOSE_QPOS},
        mimic_qpos=G1_BRAINCO_HAND_MIMIC_QPOS,
    )


def main():
    args = parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)

    samples = []
    samples.extend(
        build_smpl_samples(
            args.smpl_dir,
            "smpl",
            args.num_points,
            args.seed + 500,
            args.surface_oversample_ratio,
            args.surface_curvature_weight,
            args.surface_curvature_power,
            args.smpl_center,
            args.bbox_center_ratio,
            genders=("neutral",),
        )
    )
    samples.extend(
        build_smpl_samples(
            args.smplx_dir,
            "smplx",
            args.num_points,
            args.seed + 1000,
            args.surface_oversample_ratio,
            args.surface_curvature_weight,
            args.surface_curvature_power,
            args.smpl_center,
            args.bbox_center_ratio,
        )
    )
    samples.extend(
        build_smpl_samples(
            args.smplh_dir,
            "smplh",
            args.num_points,
            args.seed + 2000,
            args.surface_oversample_ratio,
            args.surface_curvature_weight,
            args.surface_curvature_power,
            args.smpl_center,
            args.bbox_center_ratio,
        )
    )
    if args.include_original_g1:
        samples.append(
            build_g1_sample(
                args.g1_xml,
                "unitree_g1",
                args.num_points,
                args.seed + 3000,
                args.surface_oversample_ratio,
                args.surface_curvature_weight,
                args.surface_curvature_power,
                args.g1_to_smpl_frame,
                args.g1_pose,
                args.robot_exterior_surface,
                args.robot_exterior_occlusion_distance,
                args.robot_exterior_method,
                args.robot_exterior_ray_distance,
            )
        )
    if args.include_g1_brainco_hand:
        samples.append(
            build_g1_sample(
                args.g1_brainco_hand_xml,
                "unitree_g1_brainco_hand",
                args.num_points,
                args.seed + 4000,
                args.surface_oversample_ratio,
                args.surface_curvature_weight,
                args.surface_curvature_power,
                args.g1_to_smpl_frame,
                args.g1_pose,
                args.robot_exterior_surface,
                args.robot_exterior_occlusion_distance,
                args.robot_exterior_method,
                args.robot_exterior_ray_distance,
            )
        )
    if args.include_pipluspro:
        samples.append(
            build_robot_sample(
                args.pipluspro_xml,
                "pipluspro",
                args.num_points,
                args.seed + 5000,
                args.surface_oversample_ratio,
                args.surface_curvature_weight,
                args.surface_curvature_power,
                args.g1_to_smpl_frame,
                args.pipluspro_pose,
                args.robot_exterior_surface,
                args.robot_exterior_occlusion_distance,
                args.robot_exterior_method,
                args.robot_exterior_ray_distance,
                root_body_name=args.pipluspro_root_body,
                tpose_qpos=PIPLUSPRO_TPOSE_QPOS,
                mimic_qpos=None,
            )
        )
    if args.include_supported_robots:
        for offset, robot_name in enumerate(args.supported_robot_names):
            spec = SUPPORTED_ROBOT_SAMPLE_SPECS[robot_name]
            samples.append(
                build_robot_sample(
                    spec.xml_path,
                    spec.name,
                    args.num_points,
                    args.seed + 6000 + 100 * offset,
                    args.surface_oversample_ratio,
                    args.surface_curvature_weight,
                    args.surface_curvature_power,
                    args.g1_to_smpl_frame,
                    args.supported_robot_pose,
                    args.robot_exterior_surface,
                    args.robot_exterior_occlusion_distance,
                    args.robot_exterior_method,
                    args.robot_exterior_ray_distance,
                    root_body_name=spec.root_body_name,
                    tpose_qpos=spec.tpose_qpos,
                    mimic_qpos=None,
                    reset_key=spec.reset_key,
                )
            )
    if not samples:
        raise RuntimeError("No samples were built.")

    names = np.asarray([s["name"] for s in samples])
    points = np.stack([s["points"] for s in samples], axis=0).astype(np.float32)
    root_offsets = np.stack([s["root_offset"] for s in samples], axis=0).astype(np.float32)
    center_modes = np.asarray([s["center_mode"] for s in samples])
    save_data = {
        "names": names,
        "points": points,
        "root_offsets": root_offsets,
        "center_modes": center_modes,
        "num_points": np.asarray(args.num_points, dtype=np.int32),
        "seed": np.asarray(args.seed, dtype=np.int32),
        "surface_oversample_ratio": np.asarray(args.surface_oversample_ratio, dtype=np.int32),
        "surface_curvature_weight": np.asarray(args.surface_curvature_weight, dtype=np.float32),
        "surface_curvature_power": np.asarray(args.surface_curvature_power, dtype=np.float32),
        "bbox_center_ratio": np.asarray(args.bbox_center_ratio, dtype=np.float32),
        "g1_pose": np.asarray(args.g1_pose),
        "g1_to_smpl_frame": np.asarray(args.g1_to_smpl_frame),
        "g1_xml": np.asarray(str(args.g1_xml)),
        "include_original_g1": np.asarray(args.include_original_g1),
        "g1_brainco_hand_xml": np.asarray(str(args.g1_brainco_hand_xml)),
        "include_g1_brainco_hand": np.asarray(args.include_g1_brainco_hand),
        "pipluspro_xml": np.asarray(str(args.pipluspro_xml)),
        "include_pipluspro": np.asarray(args.include_pipluspro),
        "pipluspro_root_body": np.asarray(args.pipluspro_root_body),
        "pipluspro_pose": np.asarray(args.pipluspro_pose),
        "include_supported_robots": np.asarray(args.include_supported_robots),
        "supported_robot_names": np.asarray(args.supported_robot_names),
        "supported_robot_xmls": np.asarray(
            [str(SUPPORTED_ROBOT_SAMPLE_SPECS[name].xml_path) for name in args.supported_robot_names]
        ),
        "supported_robot_root_bodies": np.asarray(
            [SUPPORTED_ROBOT_SAMPLE_SPECS[name].root_body_name for name in args.supported_robot_names]
        ),
        "supported_robot_pose": np.asarray(args.supported_robot_pose),
        "robot_exterior_surface": np.asarray(args.robot_exterior_surface),
        "robot_exterior_occlusion_distance": np.asarray(args.robot_exterior_occlusion_distance, dtype=np.float32),
        "robot_exterior_method": np.asarray(args.robot_exterior_method),
        "robot_exterior_ray_distance": np.asarray(args.robot_exterior_ray_distance, dtype=np.float32),
    }
    for idx, sample in enumerate(samples):
        save_data[f"mesh_vertices_{idx}"] = sample["vertices"].astype(np.float32)
        save_data[f"mesh_faces_{idx}"] = sample["faces"].astype(np.int32)
        save_data[f"sample_face_ids_{idx}"] = sample["sample_face_ids"].astype(np.int32)
    np.savez_compressed(args.out, **save_data)
    print(f"[Dataset] Saved {len(samples)} templates to {args.out} with points={points.shape}")


if __name__ == "__main__":
    main()

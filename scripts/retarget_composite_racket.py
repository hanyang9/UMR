"""Bind learned source racket slots to a rigid tracked racket mesh."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree


def _normalize(vectors):
    vectors = np.asarray(vectors, dtype=np.float64)
    return vectors / np.maximum(np.linalg.norm(vectors, axis=-1, keepdims=True), 1e-12)


def _triangle_frames(triangles):
    triangles = np.asarray(triangles, dtype=np.float64)
    e1 = _normalize(triangles[:, 1] - triangles[:, 0])
    normals = _normalize(np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0]))
    e2 = _normalize(np.cross(normals, e1))
    return np.stack([e1, e2, normals], axis=-1)


def _transform_points(points, transforms):
    points = np.asarray(points, dtype=np.float64)
    transforms = np.asarray(transforms, dtype=np.float64)
    return np.einsum("fij,nj->fni", transforms[:, :3, :3], points) + transforms[:, None, :3, 3]


def _to_retarget_frame(points, source_up):
    points = np.asarray(points, dtype=np.float64)
    if str(source_up).lower() != "y":
        return points
    out = np.empty_like(points)
    out[..., 0] = points[..., 0]
    out[..., 1] = -points[..., 2]
    out[..., 2] = points[..., 1]
    return out


def bind_composite_racket_source(
    *,
    slot_points,
    body_template_vertices,
    body_template_faces,
    body_source_slots,
    body_source_normals,
    body_slot_part_ids,
    body_tpose_normals,
    body_binding,
    template_center,
    frame_ids,
    source_up,
    ground_z,
    source_scale,
    source_tpose_path,
    tpose_path,
    trajectory_path,
    bind_points_to_mesh,
    nearest_vertex_k=24,
    racket_part_id=20,
    log_prefix="HumanoidRetarget",
):
    source_tpose_path = Path(source_tpose_path)
    tpose_path = Path(tpose_path)
    trajectory_path = Path(trajectory_path)
    with np.load(tpose_path, allow_pickle=True) as data:
        racket_vertices_world = np.asarray(data["vertices_world"], dtype=np.float32)
        racket_vertices_local = np.asarray(data["vertices_local_m"], dtype=np.float32)
        racket_faces = np.asarray(data["faces"], dtype=np.int32)
        racket_up = str(np.asarray(data.get("coordinate_up", source_up)).item())
    with np.load(source_tpose_path, allow_pickle=True) as data:
        source_tpose_joints = np.asarray(data["joints_world"], dtype=np.float32)
    with np.load(trajectory_path, allow_pickle=True) as data:
        transforms_all = np.asarray(data["mesh_world_transforms"], dtype=np.float32)
        frame_offset = int(np.asarray(data.get("frame_offset", 0)).item())
        trajectory_up = str(np.asarray(data.get("coordinate_up", source_up)).item())
    if racket_up.lower() != str(source_up).lower() or trajectory_up.lower() != str(source_up).lower():
        raise ValueError(
            f"Composite racket up-axis mismatch: source={source_up}, tpose={racket_up}, trajectory={trajectory_up}"
        )
    if len(racket_vertices_world) != len(racket_vertices_local):
        raise ValueError("Racket T-pose local/world vertex counts differ")

    runtime_template_center = np.asarray(template_center, dtype=np.float32).reshape(3)
    source_tpose_center = source_tpose_joints[3]
    racket_vertices_centered = racket_vertices_world - source_tpose_center
    body_face_count = len(body_template_faces)
    combined_vertices = np.concatenate([body_template_vertices, racket_vertices_centered], axis=0)
    combined_faces = np.concatenate(
        [
            np.asarray(body_template_faces, dtype=np.int32),
            racket_faces + len(body_template_vertices),
        ],
        axis=0,
    )
    combined_binding = bind_points_to_mesh(
        slot_points,
        combined_vertices,
        combined_faces,
        nearest_vertex_k=nearest_vertex_k,
    )
    racket_slot_ids = np.flatnonzero(np.asarray(combined_binding["face_ids"]) >= body_face_count).astype(np.int32)
    if len(racket_slot_ids) == 0:
        raise ValueError("No learned source slots were classified as racket surface")

    racket_binding = bind_points_to_mesh(
        np.asarray(slot_points)[racket_slot_ids],
        racket_vertices_centered,
        racket_faces,
        nearest_vertex_k=nearest_vertex_k,
    )
    racket_face_ids = np.asarray(racket_binding["face_ids"], dtype=np.int32)
    racket_bary = np.asarray(racket_binding["bary"], dtype=np.float32)
    local_triangles = racket_vertices_local[racket_faces[racket_face_ids]]
    local_slot_points = np.einsum("ni,nij->nj", racket_bary, local_triangles).astype(np.float32)

    frame_ids = np.asarray(frame_ids, dtype=np.int64)
    racket_frame_ids = np.clip(frame_ids - frame_offset, 0, len(transforms_all) - 1)
    transforms = transforms_all[racket_frame_ids]
    dynamic_points = _transform_points(local_slot_points, transforms)
    dynamic_points = _to_retarget_frame(dynamic_points, source_up)
    dynamic_points[..., 2] -= float(ground_z)
    dynamic_points *= float(source_scale)

    dynamic_triangles = _transform_points(local_triangles.reshape(-1, 3), transforms)
    dynamic_triangles = dynamic_triangles.reshape(len(transforms), len(racket_slot_ids), 3, 3)
    dynamic_triangles = _to_retarget_frame(dynamic_triangles, source_up)
    dynamic_normals = _normalize(
        np.cross(
            dynamic_triangles[:, :, 1] - dynamic_triangles[:, :, 0],
            dynamic_triangles[:, :, 2] - dynamic_triangles[:, :, 0],
        )
    ).astype(np.float32)

    source_slots = np.asarray(body_source_slots, dtype=np.float32).copy()
    source_normals = np.asarray(body_source_normals, dtype=np.float32).copy()
    slot_part_ids = np.asarray(body_slot_part_ids, dtype=np.int32).copy()
    tpose_normals = np.asarray(body_tpose_normals, dtype=np.float32).copy()
    source_slots[:, racket_slot_ids] = dynamic_points.astype(np.float32)
    source_normals[:, racket_slot_ids] = dynamic_normals
    slot_part_ids[racket_slot_ids] = int(racket_part_id)
    tpose_normals[racket_slot_ids] = _normalize(racket_binding["closest_normals"]).astype(np.float32)

    print(
        f"[{log_prefix}][CompositeRacket] classified racket_slots={len(racket_slot_ids)}/{len(slot_points)} "
        f"trajectory_frames={len(transforms_all)} selected_frames={len(frame_ids)} frame_offset={frame_offset} "
        f"source_tpose_center={source_tpose_center.tolist()} runtime_center={runtime_template_center.tolist()} "
        f"bind_error_mean={float(np.mean(racket_binding['errors'])):.6f} "
        f"p95={float(np.percentile(racket_binding['errors'], 95)):.6f}"
    )
    return source_slots, source_normals, slot_part_ids, tpose_normals, {
        "racket_slot_ids": racket_slot_ids,
        "racket_face_ids": racket_face_ids,
        "racket_bary": racket_bary,
        "racket_template_triangles": racket_vertices_world[racket_faces[racket_face_ids]],
        "racket_motion_triangles": dynamic_triangles.astype(np.float32),
        "body_binding": body_binding,
        "source_tpose_path": str(source_tpose_path),
        "tpose_path": str(tpose_path),
        "trajectory_path": str(trajectory_path),
        "trajectory_frame_ids": racket_frame_ids.astype(np.int32),
    }


def transport_composite_racket_normals(body_targets, robot_tpose_normals_source, state):
    targets = np.asarray(body_targets, dtype=np.float32).copy()
    racket_slot_ids = np.asarray(state["racket_slot_ids"], dtype=np.int32)
    template_basis = _triangle_frames(state["racket_template_triangles"])
    template_normals = _normalize(np.asarray(robot_tpose_normals_source)[racket_slot_ids])
    motion_triangles = np.asarray(state["racket_motion_triangles"], dtype=np.float32)
    for frame_idx in range(len(motion_triangles)):
        frame_basis = _triangle_frames(motion_triangles[frame_idx])
        rotations = frame_basis @ np.swapaxes(template_basis, 1, 2)
        targets[frame_idx, racket_slot_ids] = _normalize(
            np.einsum("nij,nj->ni", rotations, template_normals)
        ).astype(np.float32)
    return targets


def build_composite_racket_contact_source(
    *,
    source_slots,
    racket_slot_ids,
    state,
    threshold,
    snap_threshold,
    max_points,
    log_prefix="HumanoidRetarget",
):
    """Build body-to-racket contacts using paired learned racket slots."""
    source_slots = np.asarray(source_slots, dtype=np.float32)
    racket_slot_ids = np.asarray(racket_slot_ids, dtype=np.int32).reshape(-1)
    if len(racket_slot_ids) == 0:
        raise ValueError("Composite racket contact map has no target racket slots")
    frame_count, slot_count = source_slots.shape[:2]
    distances = np.full((frame_count, slot_count), np.inf, dtype=np.float32)
    object_ids = np.full((frame_count, slot_count), -1, dtype=np.int32)
    pair_vectors = np.zeros((frame_count, slot_count, 3), dtype=np.float32)
    source_points_world = source_slots[:, racket_slot_ids].copy()
    snapped_count = 0
    for frame_idx in range(frame_count):
        object_points = source_points_world[frame_idx]
        dist, local_ids = cKDTree(object_points).query(source_slots[frame_idx], k=1)
        local_ids = np.asarray(local_ids, dtype=np.int32)
        paired_slot_ids = racket_slot_ids[local_ids]
        vectors = source_slots[frame_idx] - object_points[local_ids]
        if float(snap_threshold) > 0.0:
            snapped = dist < float(snap_threshold)
            snapped_count += int(np.count_nonzero(snapped))
            dist = np.asarray(dist, dtype=np.float32)
            dist[snapped] = 0.0
            vectors[snapped] = 0.0
        distances[frame_idx] = np.asarray(dist, dtype=np.float32)
        object_ids[frame_idx] = paired_slot_ids
        pair_vectors[frame_idx] = vectors.astype(np.float32)

    # Racket slots describe the object itself; they must not consume contact rows.
    distances[:, np.asarray(state["racket_slot_ids"], dtype=np.int32)] = np.inf
    object_ids[:, np.asarray(state["racket_slot_ids"], dtype=np.int32)] = -1
    pair_vectors[:, np.asarray(state["racket_slot_ids"], dtype=np.int32)] = 0.0
    active_counts = np.count_nonzero(distances <= float(threshold), axis=1)
    finite = distances[np.isfinite(distances)]
    print(
        f"[{log_prefix}][CompositeRacketContactMap] source_racket_slots={len(racket_slot_ids)} "
        f"body_slots={slot_count - len(state['racket_slot_ids'])} frames={frame_count} "
        f"min={float(finite.min()):.4f} p5={float(np.percentile(finite, 5)):.4f} "
        f"p50={float(np.percentile(finite, 50)):.4f} max={float(finite.max()):.4f} "
        f"snap<{float(snap_threshold):.4f}m={snapped_count} "
        f"active min/mean/max={int(active_counts.min())}/{float(active_counts.mean()):.2f}/{int(active_counts.max())} "
        f"max_points={int(max_points)}"
    )
    return {
        "mode": "robot_slot_object",
        "name": "federer_racket_slots",
        "path": Path(state["tpose_path"]),
        "prop_path": Path(state["trajectory_path"]),
        "source_mesh_scale": 1.0,
        "retarget_mesh_scale": 1.0,
        "retarget_object_size": "correspondence_slots",
        "source_points_local": np.zeros((0, 3), dtype=np.float32),
        "source_points_world": source_points_world,
        "retarget_points_local": np.zeros((0, 3), dtype=np.float32),
        "retarget_points_world": np.zeros((frame_count, 0, 3), dtype=np.float32),
        "distances": distances,
        "object_ids": object_ids,
        "pair_vectors": pair_vectors,
        "motion_positions": np.zeros((frame_count, 3), dtype=np.float32),
        "motion_quats_wxyz": np.zeros((frame_count, 4), dtype=np.float32),
        "racket_slot_ids": racket_slot_ids,
    }

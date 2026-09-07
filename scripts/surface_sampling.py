#!/usr/bin/env python3
"""Shared exterior surface sampling helpers."""
from __future__ import annotations

import numpy as np
import trimesh


def _sample_points_on_triangles(triangles: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    r1 = np.sqrt(rng.random(len(triangles)))
    r2 = rng.random(len(triangles))
    return (
        (1.0 - r1)[:, None] * triangles[:, 0]
        + (r1 * (1.0 - r2))[:, None] * triangles[:, 1]
        + (r1 * r2)[:, None] * triangles[:, 2]
    )


def _farthest_point_indices(points: np.ndarray, count: int, seed: int) -> np.ndarray:
    if len(points) <= count:
        return np.arange(len(points), dtype=np.int32)

    rng = np.random.default_rng(int(seed))
    selected = np.empty(int(count), dtype=np.int32)
    selected[0] = int(rng.integers(len(points)))
    delta = points - points[selected[0]]
    min_dist2 = np.einsum("ij,ij->i", delta, delta)
    for index in range(1, int(count)):
        selected[index] = int(np.argmax(min_dist2))
        delta = points - points[selected[index]]
        dist2 = np.einsum("ij,ij->i", delta, delta)
        min_dist2 = np.minimum(min_dist2, dist2)
    return selected


def _first_hit_directions() -> np.ndarray:
    directions = []
    for x in (-1.0, 0.0, 1.0):
        for y in (-1.0, 0.0, 1.0):
            for z in (-1.0, 0.0, 1.0):
                if x == 0.0 and y == 0.0 and z == 0.0:
                    continue
                direction = np.asarray([x, y, z], dtype=np.float64)
                directions.append(direction / np.linalg.norm(direction))
    return np.stack(directions, axis=0)


def _embree_intersector(mesh: trimesh.Trimesh):
    try:
        from trimesh.ray.ray_pyembree import RayMeshIntersector

        return RayMeshIntersector(mesh)
    except Exception as exc:
        raise RuntimeError(
            "first_hit object surface sampling requires trimesh's Embree backend. "
            "Install embreex in the active Python environment."
        ) from exc


def _first_hit_mask(
    vertices: np.ndarray,
    faces: np.ndarray,
    candidate_face_ids: np.ndarray,
    ray_offset: float,
    ray_distance: float,
    min_visible_views: int,
    chunk_size: int,
) -> np.ndarray:
    bbox_diag = float(np.linalg.norm(vertices.max(axis=0) - vertices.min(axis=0)))
    outside_distance = float(ray_distance) if ray_distance > 0.0 else max(2.0 * bbox_diag, 1.0)
    intersector = _embree_intersector(trimesh.Trimesh(vertices=vertices, faces=faces, process=False))

    unique_face_ids, inverse = np.unique(candidate_face_ids.astype(np.int64), return_inverse=True)
    face_centers = vertices[faces[unique_face_ids]].mean(axis=1)
    visible_counts = np.zeros(len(unique_face_ids), dtype=np.int32)
    for view_direction in _first_hit_directions():
        for start in range(0, len(unique_face_ids), int(chunk_size)):
            end = min(start + int(chunk_size), len(unique_face_ids))
            ray_directions = np.repeat((-view_direction)[None, :], end - start, axis=0)
            origins = face_centers[start:end] + view_direction[None, :] * outside_distance
            first_faces = intersector.intersects_first(
                origins + ray_directions * float(ray_offset),
                ray_directions,
            )
            visible_counts[start:end] += first_faces == unique_face_ids[start:end]
    return (visible_counts >= int(min_visible_views))[inverse]


def sample_first_hit_surface_points(
    vertices: np.ndarray,
    faces: np.ndarray,
    count: int,
    seed: int,
    *,
    oversample_ratio: int = 8,
    candidate_multiplier: int = 12,
    ray_offset: float = 1e-4,
    ray_distance: float = 0.0,
    min_visible_views: int = 2,
    chunk_size: int = 4096,
) -> np.ndarray:
    """Area-sample externally visible triangles, then spread samples with FPS."""
    vertices = np.asarray(vertices, dtype=np.float64).reshape(-1, 3)
    faces = np.asarray(faces, dtype=np.int64).reshape(-1, 3)
    count = int(count)
    if len(vertices) == 0:
        return np.zeros((0, 3), dtype=np.float32)
    if count <= 0 or len(faces) == 0:
        return vertices.astype(np.float32)

    triangles = vertices[faces]
    areas = 0.5 * np.linalg.norm(
        np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0]),
        axis=1,
    )
    valid = areas > 1e-12
    if not np.any(valid):
        raise ValueError("Object mesh has no valid triangles for first_hit surface sampling.")

    valid_face_ids = np.flatnonzero(valid)
    valid_areas = areas[valid]
    candidate_count = max(count * int(oversample_ratio) * int(candidate_multiplier), count)
    rng = np.random.default_rng(int(seed))
    picked = rng.choice(
        len(valid_face_ids),
        size=candidate_count,
        replace=True,
        p=valid_areas / valid_areas.sum(),
    )
    candidate_face_ids = valid_face_ids[picked]
    candidate_points = _sample_points_on_triangles(triangles[candidate_face_ids], rng)
    exterior = _first_hit_mask(
        vertices,
        faces,
        candidate_face_ids,
        ray_offset=float(ray_offset),
        ray_distance=float(ray_distance),
        min_visible_views=int(min_visible_views),
        chunk_size=int(chunk_size),
    )
    exterior_points = candidate_points[exterior]
    if len(exterior_points) < count:
        raise RuntimeError(
            f"first_hit kept {len(exterior_points)}/{candidate_count} object candidates, "
            f"less than the requested {count}; refusing to sample hidden surfaces."
        )
    keep = _farthest_point_indices(exterior_points, count, seed)
    return exterior_points[keep].astype(np.float32)

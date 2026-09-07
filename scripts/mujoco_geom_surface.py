from __future__ import annotations

import mujoco
import numpy as np


def is_floor_like_geom(model, geom_id: int) -> bool:
    geom_id = int(geom_id)
    body_id = int(model.geom_bodyid[geom_id])
    body_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, body_id) or ""
    geom_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_GEOM, geom_id) or ""
    label = f"{body_name} {geom_name}".lower()
    return (
        body_name == "world"
        or "floor" in label
        or "ground" in label
        or int(model.geom_type[geom_id]) == int(mujoco.mjtGeom.mjGEOM_PLANE)
    )


def mesh_geom_ids(model, policy: str = "auto") -> np.ndarray:
    ids = np.where(model.geom_type == mujoco.mjtGeom.mjGEOM_MESH)[0].astype(np.int32)
    if ids.size == 0:
        return ids

    visual = ids[
        (model.geom_contype[ids] == 0)
        & (model.geom_conaffinity[ids] == 0)
        & (model.geom_group[ids] != 3)
    ].astype(np.int32)
    if policy == "visual":
        return visual if visual.size else ids
    if policy == "all_mesh":
        return ids

    def without_floor(values):
        return np.asarray([int(i) for i in values if not is_floor_like_geom(model, int(i))], dtype=np.int32)

    if policy == "mesh_no_floor":
        filtered = without_floor(ids)
        return filtered if filtered.size else ids
    filtered_visual = without_floor(visual)
    if filtered_visual.size:
        return filtered_visual
    filtered_mesh = without_floor(ids)
    return filtered_mesh if filtered_mesh.size else ids


def primitive_geom_ids(model) -> np.ndarray:
    supported = {
        int(mujoco.mjtGeom.mjGEOM_SPHERE),
        int(mujoco.mjtGeom.mjGEOM_CAPSULE),
        int(mujoco.mjtGeom.mjGEOM_ELLIPSOID),
        int(mujoco.mjtGeom.mjGEOM_CYLINDER),
        int(mujoco.mjtGeom.mjGEOM_BOX),
    }
    ids = []
    for geom_id in range(model.ngeom):
        if int(model.geom_type[geom_id]) not in supported:
            continue
        if is_floor_like_geom(model, geom_id):
            continue
        ids.append(int(geom_id))
    return np.asarray(ids, dtype=np.int32)


def surface_geom_ids(model, policy: str = "auto") -> np.ndarray:
    mesh_ids = mesh_geom_ids(model, policy)
    if mesh_ids.size > 0:
        return mesh_ids
    return primitive_geom_ids(model)


def _ring_vertices(radius: float, z: float, segments: int) -> np.ndarray:
    angles = np.linspace(0.0, 2.0 * np.pi, int(segments), endpoint=False)
    return np.stack(
        [
            float(radius) * np.cos(angles),
            float(radius) * np.sin(angles),
            np.full_like(angles, float(z)),
        ],
        axis=1,
    )


def _connect_rings(ring_count: int, segments: int) -> np.ndarray:
    faces = []
    for row in range(int(ring_count) - 1):
        base = row * int(segments)
        nxt = (row + 1) * int(segments)
        for col in range(int(segments)):
            j = (col + 1) % int(segments)
            faces.append([base + col, nxt + col, nxt + j])
            faces.append([base + col, nxt + j, base + j])
    return np.asarray(faces, dtype=np.int32)


def sphere_mesh(radius: float, segments: int = 24, rings: int = 12, scale=(1.0, 1.0, 1.0)):
    vertices = []
    for row in range(int(rings) + 1):
        theta = -0.5 * np.pi + np.pi * row / int(rings)
        vertices.append(_ring_vertices(float(radius) * np.cos(theta), float(radius) * np.sin(theta), int(segments)))
    vertices = np.concatenate(vertices, axis=0)
    vertices *= np.asarray(scale, dtype=np.float64).reshape(1, 3)
    return vertices.astype(np.float32), _connect_rings(int(rings) + 1, int(segments))


def capsule_mesh(radius: float, half_length: float, segments: int = 24, hemi_rings: int = 8):
    radius = float(radius)
    half_length = float(half_length)
    rings = []
    for row in range(int(hemi_rings) + 1):
        theta = -0.5 * np.pi + 0.5 * np.pi * row / int(hemi_rings)
        rings.append(_ring_vertices(radius * np.cos(theta), -half_length + radius * np.sin(theta), int(segments)))
    rings.append(_ring_vertices(radius, half_length, int(segments)))
    for row in range(1, int(hemi_rings) + 1):
        theta = 0.5 * np.pi * row / int(hemi_rings)
        rings.append(_ring_vertices(radius * np.cos(theta), half_length + radius * np.sin(theta), int(segments)))
    vertices = np.concatenate(rings, axis=0)
    return vertices.astype(np.float32), _connect_rings(len(rings), int(segments))


def cylinder_mesh(radius: float, half_length: float, segments: int = 24):
    bottom = _ring_vertices(radius, -float(half_length), int(segments))
    top = _ring_vertices(radius, float(half_length), int(segments))
    vertices = np.concatenate([bottom, top, [[0.0, 0.0, -float(half_length)]], [[0.0, 0.0, float(half_length)]]], axis=0)
    faces = _connect_rings(2, int(segments)).tolist()
    bottom_center = 2 * int(segments)
    top_center = bottom_center + 1
    for col in range(int(segments)):
        j = (col + 1) % int(segments)
        faces.append([bottom_center, j, col])
        faces.append([top_center, int(segments) + col, int(segments) + j])
    return vertices.astype(np.float32), np.asarray(faces, dtype=np.int32)


def box_mesh(size) -> tuple[np.ndarray, np.ndarray]:
    sx, sy, sz = np.asarray(size, dtype=np.float64).reshape(-1)[:3]
    vertices = np.asarray(
        [
            [-sx, -sy, -sz],
            [sx, -sy, -sz],
            [sx, sy, -sz],
            [-sx, sy, -sz],
            [-sx, -sy, sz],
            [sx, -sy, sz],
            [sx, sy, sz],
            [-sx, sy, sz],
        ],
        dtype=np.float32,
    )
    faces = np.asarray(
        [
            [0, 2, 1],
            [0, 3, 2],
            [4, 5, 6],
            [4, 6, 7],
            [0, 1, 5],
            [0, 5, 4],
            [1, 2, 6],
            [1, 6, 5],
            [2, 3, 7],
            [2, 7, 6],
            [3, 0, 4],
            [3, 4, 7],
        ],
        dtype=np.int32,
    )
    return vertices, faces


def geom_local_mesh(model, geom_id: int) -> tuple[np.ndarray, np.ndarray]:
    geom_id = int(geom_id)
    geom_type = int(model.geom_type[geom_id])
    if geom_type == int(mujoco.mjtGeom.mjGEOM_MESH):
        mesh_id = int(model.geom_dataid[geom_id])
        if mesh_id < 0:
            raise ValueError(f"Mesh geom {geom_id} has no mesh data.")
        vadr = int(model.mesh_vertadr[mesh_id])
        vnum = int(model.mesh_vertnum[mesh_id])
        fadr = int(model.mesh_faceadr[mesh_id])
        fnum = int(model.mesh_facenum[mesh_id])
        return (
            np.asarray(model.mesh_vert[vadr : vadr + vnum], dtype=np.float32),
            np.asarray(model.mesh_face[fadr : fadr + fnum], dtype=np.int32),
        )

    size = np.asarray(model.geom_size[geom_id], dtype=np.float64)
    if geom_type == int(mujoco.mjtGeom.mjGEOM_SPHERE):
        return sphere_mesh(size[0])
    if geom_type == int(mujoco.mjtGeom.mjGEOM_ELLIPSOID):
        return sphere_mesh(1.0, scale=size[:3])
    if geom_type == int(mujoco.mjtGeom.mjGEOM_CAPSULE):
        return capsule_mesh(size[0], size[1])
    if geom_type == int(mujoco.mjtGeom.mjGEOM_CYLINDER):
        return cylinder_mesh(size[0], size[1])
    if geom_type == int(mujoco.mjtGeom.mjGEOM_BOX):
        return box_mesh(size[:3])
    raise ValueError(f"Unsupported geom type for surface sampling: {geom_type}")

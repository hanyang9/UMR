from __future__ import annotations

import json
import re
import subprocess
import tempfile
from functools import lru_cache
from pathlib import Path

import numpy as np
from scipy.spatial.transform import Rotation as R


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
NR_SOURCE_FORMAT = "nr_fbx_bvh"
NR_UNIT_SCALE = 0.01


def is_nr_root(path: Path) -> bool:
    path = Path(path)
    return bool(
        path.is_dir()
        and next(path.glob("*.fbx"), None) is not None
        and (path / "motion_actor_retarget_205_with_ids").is_dir()
    )


def nr_fbx_path(root: Path) -> Path:
    candidates = sorted(Path(root).glob("*.fbx"))
    if not candidates:
        raise FileNotFoundError(f"No FBX character found under {root}")
    return candidates[0]


def nr_motion_paths(root: Path) -> list[Path]:
    paths = sorted((Path(root) / "motion_actor_retarget_205_with_ids").glob("*.bvh"))
    if not paths:
        raise FileNotFoundError(f"No NR BVH motions found under {root}")
    return paths


def _bvh_metadata(path: Path) -> tuple[int, float]:
    frames = None
    frame_time = None
    with Path(path).open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            stripped = line.strip()
            if stripped.startswith("Frames:"):
                frames = int(stripped.split(":", 1)[1].strip())
            elif stripped.startswith("Frame Time:"):
                frame_time = float(stripped.split(":", 1)[1].strip())
                break
    if frames is None or frame_time is None:
        raise ValueError(f"BVH motion header is incomplete: {path}")
    return frames, frame_time


def load_nr_motion_collection(root: Path):
    root = Path(root).resolve()
    fbx = nr_fbx_path(root).resolve()
    motions = {}
    for path in nr_motion_paths(root):
        frames, frame_time = _bvh_metadata(path)
        sequence = {
            "source_format": NR_SOURCE_FORMAT,
            "source_file": str(path.resolve()),
            "nr_root": str(root),
            "nr_fbx_path": str(fbx),
            "nr_bvh_path": str(path.resolve()),
            "num_frames": int(frames),
            "frame_time": float(frame_time),
            "fps": float(1.0 / frame_time),
            "output_up": "y",
            "human_scale": 1.0,
            "human_scale_mode": "off",
        }
        motions[path.stem] = sequence
        motions[path.name] = sequence
    return motions, NR_SOURCE_FORMAT


def sequence_frame_count(sequence) -> int:
    return int(sequence["num_frames"])


def _export_fbx_json(fbx_path: Path, json_path: Path) -> None:
    command = [
        "node",
        "--no-warnings",
        "--experimental-loader",
        str(SCRIPTS / "nr_three_loader.mjs"),
        str(SCRIPTS / "export_nr_fbx_skin.mjs"),
        str(Path(fbx_path).resolve()),
        str(json_path),
    ]
    print(f"[NRSource] export FBX skin: {' '.join(command)}")
    subprocess.run(command, cwd=ROOT, check=True)


def _load_fbx_asset_uncached(fbx_path: Path):
    with tempfile.TemporaryDirectory(prefix="nr_fbx_", dir="/tmp") as tmp_dir:
        json_path = Path(tmp_dir) / "asset.json"
        _export_fbx_json(fbx_path, json_path)
        payload = json.loads(json_path.read_text(encoding="utf-8"))
    parent_world = np.asarray(
        [np.eye(4).reshape(-1) if value is None else value for value in payload["bone_parent_world"]],
        dtype=np.float32,
    ).reshape(-1, 4, 4)
    return {
        "mesh_name": np.asarray(payload["mesh_name"]),
        "positions": np.asarray(payload["positions"], dtype=np.float32).reshape(-1, 3),
        "faces": np.asarray(payload["faces"], dtype=np.int32).reshape(-1, 3),
        "skin_indices": np.asarray(payload["skin_indices"], dtype=np.int32).reshape(-1, 4),
        "skin_weights": np.asarray(payload["skin_weights"], dtype=np.float32).reshape(-1, 4),
        "bind_matrix": np.asarray(payload["bind_matrix"], dtype=np.float32).reshape(4, 4),
        "bind_matrix_inverse": np.asarray(payload["bind_matrix_inverse"], dtype=np.float32).reshape(4, 4),
        "mesh_matrix_world": np.asarray(payload["mesh_matrix_world"], dtype=np.float32).reshape(4, 4),
        "template_vertices_world": np.asarray(payload["template_vertices_world"], dtype=np.float32).reshape(-1, 3),
        "bone_names": np.asarray(payload["bone_names"], dtype=object),
        "bone_match_names": np.asarray(payload["bone_match_names"], dtype=object),
        "bone_parents": np.asarray(payload["bone_parents"], dtype=np.int32),
        "bone_parent_world": parent_world,
        "bone_rest_positions": np.asarray(payload["bone_rest_positions"], dtype=np.float32).reshape(-1, 3),
        "bone_rest_quaternions": np.asarray(payload["bone_rest_quaternions"], dtype=np.float32).reshape(-1, 4),
        "bone_rest_scales": np.asarray(payload["bone_rest_scales"], dtype=np.float32).reshape(-1, 3),
        "bone_inverse_matrices": np.asarray(payload["bone_inverse_matrices"], dtype=np.float32).reshape(-1, 4, 4),
        "bone_rest_world_matrices": np.asarray(payload["bone_rest_world_matrices"], dtype=np.float32).reshape(-1, 4, 4),
    }


@lru_cache(maxsize=4)
def _load_fbx_asset_cached(path_str: str):
    fbx_path = Path(path_str).resolve()
    return _load_fbx_asset_uncached(fbx_path)


def load_fbx_asset(fbx_path: Path):
    return _load_fbx_asset_cached(str(Path(fbx_path).resolve()))


def template_vertices_joints_faces(sequence):
    asset = load_fbx_asset(Path(sequence["nr_fbx_path"]))
    vertices = np.asarray(asset["template_vertices_world"], dtype=np.float32) * NR_UNIT_SCALE
    joints = np.asarray(asset["bone_rest_world_matrices"], dtype=np.float32)[:, :3, 3] * NR_UNIT_SCALE
    faces = np.asarray(asset["faces"], dtype=np.int32)
    names = np.asarray(asset["bone_match_names"], dtype=str).tolist()
    return vertices, joints, faces, names


@lru_cache(maxsize=4)
def _parse_bvh_cached(path_str: str):
    path = Path(path_str)
    lines = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
    nodes = []
    channel_cursor = 0
    motion_line = -1

    def next_nonempty(index):
        while index < len(lines) and not lines[index].strip():
            index += 1
        return index, lines[index].strip()

    def parse_node(index, first_line, parent):
        nonlocal channel_cursor
        tokens = first_line.split()
        is_end = tokens[0].upper() == "END"
        name = f"{nodes[parent]['name']}_End" if is_end and parent >= 0 else ("End" if is_end else tokens[1])
        node_id = len(nodes)
        node = {"name": name, "parent": parent, "offset": np.zeros(3), "channels": [], "channel_start": channel_cursor}
        nodes.append(node)
        index, line = next_nonempty(index)
        if line != "{":
            raise ValueError(f"Expected '{{' after {first_line!r} in {path}")
        index, line = next_nonempty(index + 1)
        offset_tokens = line.split()
        if not offset_tokens or offset_tokens[0].upper() != "OFFSET":
            raise ValueError(f"Expected OFFSET for {name!r} in {path}")
        node["offset"] = np.asarray(offset_tokens[1:4], dtype=np.float64)
        index += 1
        if not is_end:
            index, line = next_nonempty(index)
            channel_tokens = line.split()
            if channel_tokens[0].upper() != "CHANNELS":
                raise ValueError(f"Expected CHANNELS for {name!r} in {path}")
            count = int(channel_tokens[1])
            node["channels"] = channel_tokens[2 : 2 + count]
            node["channel_start"] = channel_cursor
            channel_cursor += count
            index += 1
        while True:
            index, line = next_nonempty(index)
            if line == "}":
                return index + 1
            index = parse_node(index + 1, line, node_id)

    index, line = next_nonempty(0)
    if line.upper() != "HIERARCHY":
        raise ValueError(f"BVH must start with HIERARCHY: {path}")
    index, root_line = next_nonempty(index + 1)
    index = parse_node(index + 1, root_line, -1)
    index, line = next_nonempty(index)
    if line.upper() != "MOTION":
        raise ValueError(f"Expected MOTION in {path}")
    motion_line = index
    frames = int(lines[motion_line + 1].split(":", 1)[1].strip())
    frame_time = float(lines[motion_line + 2].split(":", 1)[1].strip())
    values = np.loadtxt(path, dtype=np.float64, skiprows=motion_line + 3, max_rows=frames)
    values = np.atleast_2d(values)
    if values.shape != (frames, channel_cursor):
        raise ValueError(f"BVH values shape={values.shape}, expected={(frames, channel_cursor)}: {path}")
    return nodes, values, frame_time


def _parse_bvh(path: Path):
    return _parse_bvh_cached(str(Path(path).resolve()))


def _compose_matrix(position, quaternion, scale):
    rotation = R.from_quat(np.asarray(quaternion, dtype=np.float64)).as_matrix()
    matrix = np.eye(4, dtype=np.float64)
    matrix[:3, :3] = rotation * np.asarray(scale, dtype=np.float64)[None, :]
    matrix[:3, 3] = np.asarray(position, dtype=np.float64)
    return matrix


def _bvh_local_tracks(nodes, values, frame_ids):
    frame_values = np.asarray(values, dtype=np.float64)[np.asarray(frame_ids, dtype=np.int32)]
    tracks = {}
    for node in nodes:
        channels = node["channels"]
        if not channels:
            continue
        selected = frame_values[:, node["channel_start"] : node["channel_start"] + len(channels)]
        has_position_channels = any(channel.endswith("position") for channel in channels)
        positions = (
            np.zeros((len(frame_ids), 3), dtype=np.float64)
            if has_position_channels
            else np.repeat(np.asarray(node["offset"], dtype=np.float64)[None, :], len(frame_ids), axis=0)
        )
        rotation_axes = []
        rotation_values = []
        for column, channel in enumerate(channels):
            if channel.endswith("position"):
                axis = "XYZ".index(channel[0])
                positions[:, axis] = selected[:, column]
            elif channel.endswith("rotation"):
                rotation_axes.append(channel[0].upper())
                rotation_values.append(selected[:, column])
        if rotation_axes:
            angles = np.stack(rotation_values, axis=1)
            quaternions = R.from_euler("".join(rotation_axes), angles, degrees=True).as_quat()
        else:
            quaternions = np.repeat(np.asarray([[0.0, 0.0, 0.0, 1.0]]), len(frame_ids), axis=0)
        tracks[str(node["name"])] = (positions, quaternions)
    return tracks


def _bone_world_matrices(asset, sequence, frame_ids):
    nodes, values, _frame_time = _parse_bvh(Path(sequence["nr_bvh_path"]))
    tracks = _bvh_local_tracks(nodes, values, frame_ids)
    names = np.asarray(asset["bone_match_names"], dtype=str)
    parents = np.asarray(asset["bone_parents"], dtype=np.int32)
    rest_positions = np.asarray(asset["bone_rest_positions"], dtype=np.float64)
    rest_quaternions = np.asarray(asset["bone_rest_quaternions"], dtype=np.float64)
    rest_scales = np.asarray(asset["bone_rest_scales"], dtype=np.float64)
    parent_world = np.asarray(asset["bone_parent_world"], dtype=np.float64)
    frame_count = len(frame_ids)
    worlds = np.empty((frame_count, len(names), 4, 4), dtype=np.float64)
    for bone_id, name in enumerate(names):
        track = tracks.get(str(name))
        if track is None:
            positions = np.repeat(rest_positions[bone_id][None, :], frame_count, axis=0)
            quaternions = np.repeat(rest_quaternions[bone_id][None, :], frame_count, axis=0)
        else:
            positions, quaternions = track
            # NR motion BVHs contain position channels on every joint, but the
            # reference viewer only transfers rotations plus Hips translation.
            # Preserve FBX bind-pose bone lengths for every non-root bone.
            if int(parents[bone_id]) >= 0:
                positions = np.repeat(rest_positions[bone_id][None, :], frame_count, axis=0)
        for frame in range(frame_count):
            local = _compose_matrix(positions[frame], quaternions[frame], rest_scales[bone_id])
            parent = int(parents[bone_id])
            worlds[frame, bone_id] = (worlds[frame, parent] if parent >= 0 else parent_world[bone_id]) @ local
    return worlds


def _skin_vertex_ids(asset, bone_world, vertex_ids):
    vertex_ids = np.asarray(vertex_ids, dtype=np.int32).reshape(-1)
    positions = np.asarray(asset["positions"], dtype=np.float64)[vertex_ids]
    skin_indices = np.asarray(asset["skin_indices"], dtype=np.int32)[vertex_ids]
    skin_weights = np.asarray(asset["skin_weights"], dtype=np.float64)[vertex_ids]
    inverse = np.asarray(asset["bone_inverse_matrices"], dtype=np.float64)
    bind = np.asarray(asset["bind_matrix"], dtype=np.float64)
    bind_inv = np.asarray(asset["bind_matrix_inverse"], dtype=np.float64)
    mesh_world = np.asarray(asset["mesh_matrix_world"], dtype=np.float64)
    homogeneous = np.concatenate([positions, np.ones((len(positions), 1), dtype=np.float64)], axis=1)
    bound = np.einsum("ij,vj->vi", bind, homogeneous)
    local_by_influence = np.einsum("vkij,vj->vki", inverse[skin_indices], bound)
    transformed = np.einsum("fukij,ukj->fuki", bone_world[:, skin_indices], local_by_influence)
    weighted = np.einsum("fuki,uk->fui", transformed, skin_weights)
    local = np.einsum("ij,fuj->fui", bind_inv, weighted)
    world = np.einsum("ij,fuj->fui", mesh_world, local)
    return world[..., :3].astype(np.float32) * NR_UNIT_SCALE


def skin_surface_binding(sequence, frame_ids, template_faces, binding, chunk_size=256):
    asset = load_fbx_asset(Path(sequence["nr_fbx_path"]))
    frame_ids = np.asarray(frame_ids, dtype=np.int32).reshape(-1)
    face_ids = np.asarray(binding["face_ids"], dtype=np.int32)
    bary = np.asarray(binding["bary"], dtype=np.float32)
    slot_faces = np.asarray(template_faces, dtype=np.int32)[face_ids]
    unique_vertices, inverse = np.unique(slot_faces.reshape(-1), return_inverse=True)
    remapped_faces = inverse.reshape(-1, 3)
    frame_count = len(frame_ids)
    bone_count = len(np.asarray(asset["bone_match_names"]).reshape(-1))
    points = np.empty((frame_count, len(face_ids), 3), dtype=np.float32)
    normals = np.empty_like(points)
    joints = np.empty((frame_count, bone_count, 3), dtype=np.float32)
    chunk_size = max(1, int(chunk_size))
    for start in range(0, frame_count, chunk_size):
        end = min(start + chunk_size, frame_count)
        bone_world = _bone_world_matrices(asset, sequence, frame_ids[start:end])
        dynamic_unique = _skin_vertex_ids(asset, bone_world, unique_vertices)
        triangles = dynamic_unique[:, remapped_faces]
        points[start:end] = np.einsum("fsvi,sv->fsi", triangles, bary).astype(np.float32)
        chunk_normals = np.cross(
            triangles[:, :, 1] - triangles[:, :, 0],
            triangles[:, :, 2] - triangles[:, :, 0],
        )
        chunk_normals /= np.maximum(np.linalg.norm(chunk_normals, axis=2, keepdims=True), 1e-12)
        normals[start:end] = chunk_normals.astype(np.float32)
        joints[start:end] = bone_world[:, :, :3, 3].astype(np.float32) * NR_UNIT_SCALE
    return points, normals, joints


def skin_surface_binding_points(sequence, frame_ids, template_faces, binding, chunk_size=256):
    """Skin bound surface points without allocating normals or joint trajectories."""
    asset = load_fbx_asset(Path(sequence["nr_fbx_path"]))
    frame_ids = np.asarray(frame_ids, dtype=np.int32).reshape(-1)
    face_ids = np.asarray(binding["face_ids"], dtype=np.int32)
    bary = np.asarray(binding["bary"], dtype=np.float32)
    slot_faces = np.asarray(template_faces, dtype=np.int32)[face_ids]
    unique_vertices, inverse = np.unique(slot_faces.reshape(-1), return_inverse=True)
    remapped_faces = inverse.reshape(-1, 3)
    points = np.empty((len(frame_ids), len(face_ids), 3), dtype=np.float32)
    chunk_size = max(1, int(chunk_size))
    for start in range(0, len(frame_ids), chunk_size):
        end = min(start + chunk_size, len(frame_ids))
        bone_world = _bone_world_matrices(asset, sequence, frame_ids[start:end])
        dynamic_unique = _skin_vertex_ids(asset, bone_world, unique_vertices)
        triangles = dynamic_unique[:, remapped_faces]
        points[start:end] = np.einsum("fsvi,sv->fsi", triangles, bary).astype(np.float32)
    return points


def _triangle_frames(triangles):
    triangles = np.asarray(triangles, dtype=np.float64)
    edge = triangles[..., 1, :] - triangles[..., 0, :]
    edge /= np.maximum(np.linalg.norm(edge, axis=-1, keepdims=True), 1e-12)
    normal = np.cross(
        triangles[..., 1, :] - triangles[..., 0, :],
        triangles[..., 2, :] - triangles[..., 0, :],
    )
    normal /= np.maximum(np.linalg.norm(normal, axis=-1, keepdims=True), 1e-12)
    tangent = np.cross(normal, edge)
    tangent /= np.maximum(np.linalg.norm(tangent, axis=-1, keepdims=True), 1e-12)
    return np.stack([edge, tangent, normal], axis=-1)


def transport_surface_vectors(
    sequence,
    frame_ids,
    template_vertices,
    template_faces,
    binding,
    template_vectors,
    chunk_size=256,
):
    """Transport bound vectors through the FBX triangle deformation field."""
    asset = load_fbx_asset(Path(sequence["nr_fbx_path"]))
    frame_ids = np.asarray(frame_ids, dtype=np.int32).reshape(-1)
    face_ids = np.asarray(binding["face_ids"], dtype=np.int32).reshape(-1)
    slot_faces = np.asarray(template_faces, dtype=np.int32)[face_ids]
    unique_vertices, inverse = np.unique(slot_faces.reshape(-1), return_inverse=True)
    remapped_faces = inverse.reshape(-1, 3)

    template_triangles = np.asarray(template_vertices, dtype=np.float64)[slot_faces]
    template_basis = _triangle_frames(template_triangles)
    template_vectors = np.asarray(template_vectors, dtype=np.float64).reshape(len(face_ids), 3)
    template_vectors /= np.maximum(np.linalg.norm(template_vectors, axis=1, keepdims=True), 1e-12)

    transported = np.empty((len(frame_ids), len(face_ids), 3), dtype=np.float32)
    chunk_size = max(1, int(chunk_size))
    for start in range(0, len(frame_ids), chunk_size):
        end = min(start + chunk_size, len(frame_ids))
        bone_world = _bone_world_matrices(asset, sequence, frame_ids[start:end])
        dynamic_unique = _skin_vertex_ids(asset, bone_world, unique_vertices)
        frame_basis = _triangle_frames(dynamic_unique[:, remapped_faces])
        rotations = np.einsum("fsij,skj->fsik", frame_basis, template_basis)
        chunk_vectors = np.einsum("fsij,sj->fsi", rotations, template_vectors)
        chunk_vectors /= np.maximum(np.linalg.norm(chunk_vectors, axis=2, keepdims=True), 1e-12)
        transported[start:end] = chunk_vectors.astype(np.float32)
    return transported


def motion_vertices_joints(sequence, frame_ids):
    asset = load_fbx_asset(Path(sequence["nr_fbx_path"]))
    bone_world = _bone_world_matrices(asset, sequence, frame_ids)
    vertex_ids = np.arange(len(asset["positions"]), dtype=np.int32)
    vertices = _skin_vertex_ids(asset, bone_world, vertex_ids)
    joints = bone_world[:, :, :3, 3].astype(np.float32) * NR_UNIT_SCALE
    return vertices, joints, np.asarray(asset["faces"], dtype=np.int32)

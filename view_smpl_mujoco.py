import argparse
import os
import tempfile
import time
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")

import mujoco
import mujoco.viewer
import numpy as np
try:
    from matplotlib import cm
    from matplotlib import colors as mplcolors
except ImportError:
    class _FallbackNormalize:
        def __init__(self, vmin=0.0, vmax=1.0):
            self.vmin = float(vmin)
            self.vmax = float(vmax)

        def __call__(self, values):
            denom = max(self.vmax - self.vmin, 1e-8)
            return np.clip((np.asarray(values) - self.vmin) / denom, 0.0, 1.0)

    class _FallbackColors:
        Normalize = _FallbackNormalize

    class _FallbackColorMap:
        @staticmethod
        def jet(values):
            values = np.asarray(values, dtype=np.float32)
            rgba = np.zeros((*values.shape, 4), dtype=np.float32)
            rgba[..., 0] = values
            rgba[..., 2] = 1.0 - values
            rgba[..., 3] = 1.0
            return rgba

    cm = _FallbackColorMap()
    mplcolors = _FallbackColors()
from scipy.spatial.transform import Rotation as R
import torch


import joblib  # noqa: E402
import smplx  # noqa: E402
import trimesh  # noqa: E402

try:
    import human_body_prior.body_model.body_model as hbp_body_model  # noqa: E402

    if not getattr(hbp_body_model.lbs, "_body_model_dtype_compat", False):
        _hbp_lbs = hbp_body_model.lbs

        def _lbs_dtype_compat(*args, **kwargs):
            kwargs.pop("dtype", None)
            return _hbp_lbs(*args, **kwargs)

        _lbs_dtype_compat._body_model_dtype_compat = True
        hbp_body_model.lbs = _lbs_dtype_compat

    BodyModel = hbp_body_model.BodyModel
except Exception:
    BodyModel = None


DEFAULT_DATA_DIR = Path("data_hoi_orig")
DEFAULT_SMPLH_MODEL_DIR = Path("smplh")
DEFAULT_SMPLX_MODEL_DIRS = [
    Path(os.environ["SMPLX_MODEL_DIR"]).expanduser() if os.environ.get("SMPLX_MODEL_DIR") else None,
    Path("release_assets/data/smpl_all_models"),
    Path("release_assets/data/smpl_all_models/smplx"),
    Path("data/smpl_all_models"),
    Path("data/smpl_all_models/smplx"),
    Path("smpl"),
    Path("smplx"),
]
DEFAULT_SMPLX_MODEL_DIRS = [path for path in DEFAULT_SMPLX_MODEL_DIRS if path is not None]

CHARACTER_SURFACE_SAMPLE_COUNT = 2048
OBJECT_SURFACE_SAMPLE_COUNT = 1024
CONTACT_NORM_HIGH = 0.15
CONTACT_CHUNK_SIZE = 2048
CONTACT_POINT_ALPHA = 1.0
CHARACTER_CONTACT_POINT_SIZE = 0.006
OBJECT_CONTACT_POINT_SIZE = 0.015
GROUND_CONTACT_Z = 0.0
SMPL_TEMPLATE_CENTER_JOINT_IDS = {
    "pelvis": 0,
    "spine1": 3,
}
DEFAULT_BBOX_CENTER_RATIO = 0.598916


OBJECT_MESH_NAMES = {
    "largebox": "largebox_cleaned_simplified.obj",
    "plasticbox": "plasticbox_cleaned_simplified.obj",
    "suitcase": "suitcase_cleaned_simplified.obj",
    "trashcan": "trashcan_cleaned_simplified.obj",
}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--smplh-model-dir", type=Path, default=DEFAULT_SMPLH_MODEL_DIR)
    parser.add_argument("--seq-name", type=str, default=None)
    parser.add_argument("--seq-index", type=int, default=0)
    parser.add_argument("--fps", type=float, default=30.0)
    parser.add_argument("--object-alpha", type=float, default=0.55)
    parser.add_argument("--smpl-alpha", type=float, default=1.0)
    parser.add_argument("--paused", action="store_true", default=False)
    parser.add_argument("--target-frames", type=int, default=None)
    parser.add_argument("--smpl-point-stride", type=int, default=1)
    parser.add_argument("--smpl-point-size", type=float, default=CHARACTER_CONTACT_POINT_SIZE)
    parser.add_argument("--object-point-size", type=float, default=OBJECT_CONTACT_POINT_SIZE)
    parser.add_argument(
        "--correspondence-slots",
        type=Path,
        default=Path("output/correspondence_template_residual_ae/correspondence_slots_final.npz"),
    )
    parser.add_argument("--correspondence-field", type=str, default="reconstructed_slots")
    parser.add_argument("--correspondence-smpl-name", type=str, default="auto")
    return parser.parse_args()


def load_sequence(data_dir, seq_name=None, seq_index=0):
    data = joblib.load(data_dir / "train_diffusion_manip_seq_joints24.p")
    items = list(sorted(data.items()))
    if seq_name is None:
        return items[seq_index][1]
    for _, item in items:
        if item["seq_name"] == seq_name:
            return item
    available = ", ".join(item["seq_name"] for _, item in items)
    raise ValueError(f"Could not find seq_name={seq_name}. Available: {available}")


def object_name_from_seq(seq_name):
    parts = seq_name.split("_")
    if len(parts) < 3:
        raise ValueError(f"Unexpected seq_name: {seq_name}")
    return parts[1]


def write_obj(path, vertices, faces):
    with path.open("w") as f:
        for v in vertices:
            f.write(f"v {v[0]:.8f} {v[1]:.8f} {v[2]:.8f}\n")
        for face in faces:
            f.write(f"f {face[0] + 1} {face[1] + 1} {face[2] + 1}\n")


def build_visual_model(
    marker_count,
):
    memory_mb = max(512, int(np.ceil(marker_count * 0.05)))
    xml = f"""
<mujoco model="body_object_viewer">
  <compiler angle="radian"/>
  <size memory="{memory_mb}M"/>
  <option timestep="0.0166667"/>
  <visual>
    <global azimuth="120" elevation="-20"/>
  </visual>
  <asset>
    <texture name="grid" type="2d" builtin="checker" rgb1="0.25 0.25 0.25" rgb2="0.35 0.35 0.35" width="512" height="512"/>
    <material name="ground_mat" texture="grid" texrepeat="8 8" rgba="0.8 0.8 0.8 1"/>
  </asset>
  <worldbody>
    <light name="key" pos="0 -3 5" dir="0 1 -1" diffuse="0.9 0.9 0.9"/>
    <geom name="ground" type="plane" size="8 8 0.02" material="ground_mat"/>
    {point_marker_xml(marker_count)}
  </worldbody>
</mujoco>
"""
    return mujoco.MjModel.from_xml_string(xml)


def point_marker_xml(marker_count):
    return "\n    ".join(
        (
            f'<body name="point_marker_body_{idx}" mocap="true" pos="0 0 -100">'
            f'<geom name="point_marker_{idx}" type="sphere" size="0.001" '
            'rgba="1 0 0 0" contype="0" conaffinity="0" group="0"/>'
            '</body>'
        )
        for idx in range(marker_count)
    )


def object_pose_at(sequence, frame):
    trans = np.asarray(sequence["obj_trans"][frame]).reshape(3)
    rot = np.asarray(sequence["obj_rot"][frame]).reshape(3, 3)
    quat_xyzw = R.from_matrix(rot).as_quat()
    quat_wxyz = np.array([quat_xyzw[3], quat_xyzw[0], quat_xyzw[1], quat_xyzw[2]], dtype=np.float64)
    return trans.astype(np.float64), quat_wxyz


def load_object_mesh(data_dir, object_name):
    mesh_name = OBJECT_MESH_NAMES.get(object_name, f"{object_name}_cleaned_simplified.obj")
    object_mesh_path = (data_dir / "captured_objects" / mesh_name).resolve()
    if not object_mesh_path.exists():
        raise FileNotFoundError(f"Object mesh not found: {object_mesh_path}")
    mesh = trimesh.load_mesh(object_mesh_path, process=False)
    return np.asarray(mesh.vertices, dtype=np.float32), np.asarray(mesh.faces, dtype=np.int32)


def compute_object_vertices(sequence, data_dir, object_name):
    rest_vertices, faces = load_object_mesh(data_dir, object_name)
    obj_scale = np.asarray(sequence["obj_scale"], dtype=np.float32).reshape(-1)
    obj_rot = np.asarray(sequence["obj_rot"], dtype=np.float32).reshape(len(obj_scale), 3, 3)
    obj_trans = np.asarray(sequence["obj_trans"], dtype=np.float32).reshape(len(obj_scale), 3)
    vertices = obj_scale[:, None, None] * np.matmul(obj_rot, rest_vertices.T[None]).transpose(0, 2, 1)
    vertices = vertices + obj_trans[:, None, :]
    return vertices.astype(np.float32), faces


def _sample_points_on_triangles(triangles, rng):
    r1 = np.sqrt(rng.random(len(triangles)))
    r2 = rng.random(len(triangles))
    w0 = 1.0 - r1
    w1 = r1 * (1.0 - r2)
    w2 = r1 * r2
    points = (
        w0[:, None] * triangles[:, 0]
        + w1[:, None] * triangles[:, 1]
        + w2[:, None] * triangles[:, 2]
    )
    bary = np.stack([w0, w1, w2], axis=1)
    return points, bary


def _farthest_point_sampling(points, num_samples, seed=0):
    if len(points) <= num_samples:
        return np.arange(len(points), dtype=np.int32)

    rng = np.random.default_rng(seed)
    selected = np.empty(num_samples, dtype=np.int32)
    selected[0] = int(rng.integers(len(points)))

    diff = points - points[selected[0]]
    min_dist2 = np.einsum("ij,ij->i", diff, diff)
    for idx in range(1, num_samples):
        next_idx = int(np.argmax(min_dist2))
        selected[idx] = next_idx
        diff = points - points[next_idx]
        dist2 = np.einsum("ij,ij->i", diff, diff)
        min_dist2 = np.minimum(min_dist2, dist2)
    return selected


def build_dynamic_surface_sample_template(vertices0, faces, num_samples, seed=0, oversample_ratio=8):
    rng = np.random.default_rng(seed)
    tri = vertices0[faces]
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    areas = 0.5 * np.linalg.norm(face_normals, axis=1)
    valid_face_ids = np.nonzero(areas > 1e-12)[0]
    if valid_face_ids.size == 0:
        raise ValueError("No valid mesh triangles found for dynamic surface sampling.")

    valid_areas = areas[valid_face_ids]
    num_candidates = max(num_samples * oversample_ratio, num_samples)
    candidate_face_ids = rng.choice(
        valid_face_ids,
        size=num_candidates,
        replace=True,
        p=valid_areas / valid_areas.sum(),
    )
    candidate_points, candidate_bary = _sample_points_on_triangles(vertices0[faces[candidate_face_ids]], rng)
    keep = _farthest_point_sampling(candidate_points, num_samples=num_samples, seed=seed)
    return {
        "face_ids": candidate_face_ids[keep].astype(np.int32),
        "bary": candidate_bary[keep].astype(np.float32),
    }


def dynamic_surface_template_to_world(vertices, faces, template):
    tri = vertices[faces[template["face_ids"]]]
    bary = template["bary"]
    return (
        bary[:, 0:1] * tri[:, 0]
        + bary[:, 1:2] * tri[:, 1]
        + bary[:, 2:3] * tri[:, 2]
    ).astype(np.float32)


def dynamic_surface_template_normals_to_world(vertices, faces, template):
    tri = vertices[faces[template["face_ids"]]]
    normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    return (normals / np.maximum(lengths, 1e-12)).astype(np.float32)


def bimart_contact_colors(distances, norm_high, alpha):
    norm = mplcolors.Normalize(vmin=0, vmax=norm_high)
    rgba = cm.jet_r(norm(distances))
    rgb = np.clip(rgba[:, :3], 0.0, 1.0)
    alpha_channel = np.full((rgb.shape[0], 1), np.clip(alpha, 0.0, 1.0), dtype=np.float32)
    return np.concatenate([rgb, alpha_channel], axis=1)


def nearest_distances(query_points, reference_points, chunk_size):
    if query_points.shape[0] == 0 or reference_points.shape[0] == 0:
        return np.zeros(query_points.shape[0], dtype=np.float32)

    distances = np.empty(query_points.shape[0], dtype=np.float32)
    for start in range(0, query_points.shape[0], chunk_size):
        end = min(start + chunk_size, query_points.shape[0])
        diff = query_points[start:end, None, :] - reference_points[None, :, :]
        dist2 = np.sum(diff * diff, axis=-1)
        distances[start:end] = np.sqrt(np.min(dist2, axis=1)).astype(np.float32)
    return distances


def ground_distances(query_points, ground_z):
    return np.maximum(query_points[:, 2] - ground_z, 0.0).astype(np.float32)


def compute_contact_maps(human_points, object_points):
    human_distances = ground_distances(human_points, GROUND_CONTACT_Z)
    if object_points.shape[0] > 0:
        object_distances_for_human = nearest_distances(human_points, object_points, CONTACT_CHUNK_SIZE)
        human_distances = np.minimum(human_distances, object_distances_for_human)
    object_distances = nearest_distances(object_points, human_points, CONTACT_CHUNK_SIZE)
    return human_distances, object_distances


def update_point_markers(
    model,
    data,
    marker_body_ids,
    marker_geom_ids,
    human_points,
    human_distances,
    object_points,
    object_distances,
    human_point_size,
    object_point_size,
):
    points = np.concatenate([human_points, object_points], axis=0)
    distances = np.concatenate([human_distances, object_distances], axis=0)
    colors = bimart_contact_colors(distances, CONTACT_NORM_HIGH, CONTACT_POINT_ALPHA)
    sizes = np.concatenate(
        [
            np.full(human_points.shape[0], human_point_size, dtype=np.float32),
            np.full(object_points.shape[0], object_point_size, dtype=np.float32),
        ],
        axis=0,
    )

    count = min(len(marker_geom_ids), len(points))
    if count > 0:
        geom_ids = np.asarray(marker_geom_ids[:count], dtype=np.int32)
        body_ids = np.asarray(marker_body_ids[:count], dtype=np.int32)
        mocap_ids = model.body_mocapid[body_ids]
        data.mocap_pos[mocap_ids] = points[:count].astype(np.float64)
        data.mocap_quat[mocap_ids] = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float64)
        model.geom_size[geom_ids, 0] = sizes[:count]
        model.geom_rgba[geom_ids] = colors[:count].astype(np.float32)

    if count < len(marker_geom_ids):
        hidden_geom_ids = np.asarray(marker_geom_ids[count:], dtype=np.int32)
        hidden_body_ids = np.asarray(marker_body_ids[count:], dtype=np.int32)
        hidden_mocap_ids = model.body_mocapid[hidden_body_ids]
        data.mocap_pos[hidden_mocap_ids] = np.array([0.0, 0.0, -100.0], dtype=np.float64)
        data.mocap_quat[hidden_mocap_ids] = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float64)
        model.geom_rgba[hidden_geom_ids] = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)

    return count


def prepare_smplh_model_dir(model_dir, temp_dir):
    prepared_dir = temp_dir / "smplh_prepared"
    prepared_dir.mkdir(exist_ok=True)
    for gender in ["female", "male", "neutral"]:
        target = prepared_dir / f"SMPLH_{gender.upper()}.npz"
        source = model_dir / gender / "model.npz"
        if source.exists() and not target.exists():
            source_data = np.load(source, allow_pickle=True)
            data = {key: source_data[key] for key in source_data.files}
            data.setdefault("hands_componentsl", np.zeros((45, 45), dtype=np.float32))
            data.setdefault("hands_componentsr", np.zeros((45, 45), dtype=np.float32))
            data.setdefault("hands_meanl", np.zeros(45, dtype=np.float32))
            data.setdefault("hands_meanr", np.zeros(45, dtype=np.float32))
            np.savez(target, **data)
    return prepared_dir


def build_smplh_model(sequence, model_dir, temp_dir):
    gender = str(sequence["gender"])
    smplx_dirs = []
    for candidate in [model_dir, model_dir / "smplx", *DEFAULT_SMPLX_MODEL_DIRS]:
        if candidate not in smplx_dirs:
            smplx_dirs.append(candidate)
    for smplx_dir in smplx_dirs:
        pkl_file = smplx_dir / f"SMPLX_{gender.upper()}.pkl"
        npz_file = smplx_dir / f"SMPLX_{gender.upper()}.npz"
        if pkl_file.exists() or npz_file.exists():
            ext = "pkl" if pkl_file.exists() else "npz"
            model = smplx.SMPLX(
                str(smplx_dir),
                gender=gender,
                ext=ext,
                use_pca=False,
                batch_size=1,
                num_betas=16,
            )
            model._body_model_backend = "smplx_release"
            model._body_model_file = str(pkl_file if pkl_file.exists() else npz_file)
            return model

    if BodyModel is not None:
        candidates = [
            model_dir / gender / "model.npz",
            model_dir / f"SMPLH_{gender.upper()}.npz",
            model_dir / f"SMPLH_{gender.upper()}.pkl",
        ]
        for model_file in candidates:
            if model_file.exists():
                model = BodyModel(
                    bm_path=str(model_file),
                    model_type="smplh",
                    num_betas=16,
                    batch_size=1,
                )
                model._body_model_backend = "human_body_prior"
                model._body_model_file = str(model_file)
                return model

    pkl_file = model_dir / f"SMPLH_{gender.upper()}.pkl"
    npz_file = model_dir / f"SMPLH_{gender.upper()}.npz"
    nested_npz_file = model_dir / gender / "model.npz"
    if pkl_file.exists():
        load_dir = model_dir
        ext = "pkl"
    elif npz_file.exists():
        load_dir = model_dir
        ext = "npz"
    elif nested_npz_file.exists():
        load_dir = prepare_smplh_model_dir(model_dir, temp_dir)
        ext = "npz"
    else:
        raise FileNotFoundError(
            f"SMPL-H model file not found under: {model_dir}\n"
            "Please pass --smplh-model-dir to a directory containing "
            "SMPLH_FEMALE.pkl/npz, or female/model.npz, male/model.npz, neutral/model.npz."
        )
    model = smplx.SMPLH(
        str(load_dir),
        gender=gender,
        ext=ext,
        use_pca=False,
        batch_size=1,
        num_betas=16,
    )
    model._body_model_backend = "smplh_release"
    model._body_model_file = str(pkl_file if pkl_file.exists() else npz_file if npz_file.exists() else nested_npz_file)
    return model


def model_faces(smpl_model):
    faces = smpl_model.faces if hasattr(smpl_model, "faces") else smpl_model.f
    if torch.is_tensor(faces):
        faces = faces.detach().cpu().numpy()
    return np.asarray(faces, dtype=np.int32)


def smpl_joints_to_joints24(joints):
    return np.concatenate(
        [
            joints[:, :22, :],
            joints[:, 28:29, :],
            joints[:, 43:44, :],
        ],
        axis=1,
    )


def smpl_model_trans_from_sequence(sequence):
    return np.asarray(sequence["trans"], dtype=np.float32).reshape(-1, 3)


def resample_frames(values, target_count):
    if target_count is None or len(values) == target_count:
        return values
    source_t = np.arange(len(values), dtype=np.float32)
    target_t = np.linspace(0, len(values) - 1, target_count, dtype=np.float32)
    lo = np.floor(target_t).astype(np.int32)
    hi = np.minimum(lo + 1, len(values) - 1)
    weight_shape = (target_count,) + (1,) * (values.ndim - 1)
    weight = (target_t - lo).astype(np.float32).reshape(weight_shape)
    return values[lo] * (1.0 - weight) + values[hi] * weight


def zero_pose_template(smpl_model):
    with torch.no_grad():
        if getattr(smpl_model, "_body_model_backend", "") == "human_body_prior":
            out = smpl_model(
                betas=torch.zeros(1, 16),
                root_orient=torch.zeros(1, 3),
                pose_body=torch.zeros(1, 63),
                pose_hand=torch.zeros(1, 90),
                trans=torch.zeros(1, 3),
            )
            vertices = out.v.detach().cpu().numpy()[0].astype(np.float32)
            joints = out.Jtr.detach().cpu().numpy()[0].astype(np.float32)
            return vertices, joints
        if getattr(smpl_model, "_body_model_backend", "") == "smplx_release":
            out = smpl_model(
                betas=torch.zeros(1, 16),
                global_orient=torch.zeros(1, 3),
                body_pose=torch.zeros(1, 63),
                left_hand_pose=torch.zeros(1, 45),
                right_hand_pose=torch.zeros(1, 45),
                transl=torch.zeros(1, 3),
                expression=torch.zeros(1, 10),
                jaw_pose=torch.zeros(1, 3),
                leye_pose=torch.zeros(1, 3),
                reye_pose=torch.zeros(1, 3),
                return_verts=True,
            )
            vertices = out.vertices.detach().cpu().numpy()[0].astype(np.float32)
            joints = out.joints.detach().cpu().numpy()[0].astype(np.float32)
            return vertices, joints
        out = smpl_model(
            betas=torch.zeros(1, 16),
            global_orient=torch.zeros(1, 3),
            body_pose=torch.zeros(1, 63),
            transl=torch.zeros(1, 3),
            left_hand_pose=torch.zeros(1, 45),
            right_hand_pose=torch.zeros(1, 45),
            return_verts=True,
        )
        vertices = out.vertices.detach().cpu().numpy()[0].astype(np.float32)
        joints = out.joints.detach().cpu().numpy()[0].astype(np.float32)
        return vertices, joints


def zero_pose_template_vertices(smpl_model):
    vertices, _ = zero_pose_template(smpl_model)
    return vertices


def parse_bbox_ratio_center_mode(center_mode):
    mode = str(center_mode)
    if mode == "bbox_ratio":
        return DEFAULT_BBOX_CENTER_RATIO
    if mode.startswith("bbox_ratio_"):
        return float(mode[len("bbox_ratio_") :])
    if mode.startswith("bbox_ratio:"):
        return float(mode[len("bbox_ratio:") :])
    if mode.startswith("bbox_ratio="):
        return float(mode[len("bbox_ratio=") :])
    return None


def bbox_ratio_center(vertices, ratio):
    vertices = np.asarray(vertices, dtype=np.float32)
    bbox_min = vertices.min(axis=0)
    bbox_max = vertices.max(axis=0)
    center = 0.5 * (bbox_min + bbox_max)
    center[1] = bbox_min[1] + float(ratio) * (bbox_max[1] - bbox_min[1])
    return center.astype(np.float32)


def zero_pose_template_center(joints, center_mode, vertices=None):
    mode = str(center_mode)
    if mode in ("", "none", "model_origin", "waist"):
        return np.zeros(3, dtype=np.float32)
    bbox_ratio = parse_bbox_ratio_center_mode(mode)
    if bbox_ratio is not None:
        if vertices is None:
            raise ValueError(f"SMPL template center_mode={center_mode} requires vertices.")
        return bbox_ratio_center(vertices, bbox_ratio)
    if mode not in SMPL_TEMPLATE_CENTER_JOINT_IDS:
        raise ValueError(f"Unsupported SMPL template center_mode={center_mode}")
    joint_id = SMPL_TEMPLATE_CENTER_JOINT_IDS[mode]
    if joint_id >= len(joints):
        raise ValueError(f"SMPL template center joint {joint_id} is unavailable for center_mode={center_mode}")
    return joints[joint_id].astype(np.float32)


def zero_pose_template_vertices_for_center_mode(smpl_model, center_mode):
    vertices, joints = zero_pose_template(smpl_model)
    center = zero_pose_template_center(joints, center_mode, vertices)
    vertices = vertices - center[None, :]
    return vertices.astype(np.float32)


def nearest_vertex_indices(query_points, vertices, chunk_size=1024):
    query_points = np.asarray(query_points, dtype=np.float32)
    vertices = np.asarray(vertices, dtype=np.float32)
    indices = np.empty(query_points.shape[0], dtype=np.int32)
    for start in range(0, len(query_points), chunk_size):
        end = min(start + chunk_size, len(query_points))
        diff = query_points[start:end, None, :] - vertices[None, :, :]
        dist2 = np.sum(diff * diff, axis=-1)
        indices[start:end] = np.argmin(dist2, axis=1).astype(np.int32)
    return indices


def load_smpl_correspondence_vertex_indices(slots_path, field, smpl_name, sequence, smpl_model):
    if not slots_path.exists():
        print(f"[Viewer][WARN] Correspondence slot file not found: {slots_path}. Falling back to full SMPL vertices.")
        return None, None

    slot_data = np.load(slots_path, allow_pickle=True)
    names = slot_data["names"].astype(str).tolist()
    gender = str(sequence["gender"])
    resolved_name = f"smplx_{gender}" if smpl_name == "auto" else smpl_name
    if resolved_name not in names and smpl_name == "auto":
        resolved_name = "smplx_neutral"
    if resolved_name not in names:
        print(f"[Viewer][WARN] Correspondence SMPL name {resolved_name!r} not found in {names}. Falling back to full SMPL vertices.")
        return None, None
    if field not in slot_data:
        print(f"[Viewer][WARN] Correspondence field {field!r} not found in {slots_path}. Falling back to full SMPL vertices.")
        return None, None

    slot_points = slot_data[field][names.index(resolved_name)].astype(np.float32)
    center_modes = (
        slot_data["center_modes"].astype(str).tolist()
        if "center_modes" in slot_data
        else ["model_origin"] * len(names)
    )
    center_mode = center_modes[names.index(resolved_name)]
    template_vertices = zero_pose_template_vertices_for_center_mode(smpl_model, center_mode)
    vertex_indices = nearest_vertex_indices(slot_points, template_vertices)
    nearest_error = np.linalg.norm(slot_points - template_vertices[vertex_indices], axis=1)
    print(
        f"[Viewer] Using {len(slot_points)} {resolved_name} {field} points from {slots_path} "
        f"bound to SMPL-X vertices center_mode={center_mode}; "
        f"nearest template error mean={float(nearest_error.mean()):.5f}, "
        f"max={float(nearest_error.max()):.5f}"
    )
    return vertex_indices, resolved_name


def compute_smpl_vertices(sequence, smpl_model, chunk_size=32, return_joints24=False):
    root_orient = np.asarray(sequence["root_orient"], dtype=np.float32)
    pose_body = np.asarray(sequence["pose_body"], dtype=np.float32)
    trans = smpl_model_trans_from_sequence(sequence)
    betas = np.asarray(sequence["betas"], dtype=np.float32)
    if getattr(smpl_model, "_body_model_backend", "") in ("human_body_prior", "smplx_release"):
        num_model_betas = 16
    else:
        num_model_betas = int(smpl_model.shapedirs.shape[-1])
    betas = betas[:, :num_model_betas]

    chunks = []
    joint_chunks = []
    with torch.no_grad():
        for start in range(0, len(trans), chunk_size):
            end = min(start + chunk_size, len(trans))
            count = end - start
            chunk_betas = torch.from_numpy(np.repeat(betas, count, axis=0)).float()
            chunk_root_orient = torch.from_numpy(root_orient[start:end]).float()
            chunk_pose_body = torch.from_numpy(pose_body[start:end]).float()
            chunk_trans = torch.from_numpy(trans[start:end]).float()
            if getattr(smpl_model, "_body_model_backend", "") == "human_body_prior":
                out = smpl_model(
                    betas=chunk_betas,
                    root_orient=chunk_root_orient,
                    pose_body=chunk_pose_body,
                    pose_hand=torch.zeros(count, 90),
                    trans=chunk_trans,
                )
                chunks.append(out.v.detach().cpu().numpy())
                if return_joints24:
                    joint_chunks.append(smpl_joints_to_joints24(out.Jtr.detach().cpu().numpy()))
            elif getattr(smpl_model, "_body_model_backend", "") == "smplx_release":
                out = smpl_model(
                    betas=chunk_betas,
                    global_orient=chunk_root_orient,
                    body_pose=chunk_pose_body,
                    left_hand_pose=torch.zeros(count, 45),
                    right_hand_pose=torch.zeros(count, 45),
                    transl=chunk_trans,
                    expression=torch.zeros(count, 10),
                    jaw_pose=torch.zeros(count, 3),
                    leye_pose=torch.zeros(count, 3),
                    reye_pose=torch.zeros(count, 3),
                    return_verts=True,
                )
                chunks.append(out.vertices.detach().cpu().numpy())
                if return_joints24:
                    joint_chunks.append(smpl_joints_to_joints24(out.joints.detach().cpu().numpy()))
            else:
                out = smpl_model(
                    betas=chunk_betas,
                    global_orient=chunk_root_orient,
                    body_pose=chunk_pose_body,
                    transl=chunk_trans,
                    left_hand_pose=torch.zeros(count, 45),
                    right_hand_pose=torch.zeros(count, 45),
                    return_verts=True,
                )
                chunks.append(out.vertices.detach().cpu().numpy())
                if return_joints24:
                    joint_chunks.append(smpl_joints_to_joints24(out.joints.detach().cpu().numpy()))
    vertices = np.concatenate(chunks, axis=0)
    if return_joints24:
        return vertices, np.concatenate(joint_chunks, axis=0)
    return vertices


def mesh_world_to_local(model, mesh_id, vertices):
    quat = model.mesh_quat[mesh_id]
    rot = R.from_quat([quat[1], quat[2], quat[3], quat[0]]).as_matrix()
    return (vertices - model.mesh_pos[mesh_id]) @ rot


def compute_vertex_normals(vertices, faces):
    normals = np.zeros_like(vertices, dtype=np.float64)
    tri = vertices[faces]
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    lengths = np.linalg.norm(face_normals, axis=1, keepdims=True)
    face_normals = face_normals / np.maximum(lengths, 1e-12)
    for corner in range(3):
        np.add.at(normals, faces[:, corner], face_normals)
    normal_lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    return (normals / np.maximum(normal_lengths, 1e-12)).astype(np.float32)


def update_dynamic_mesh(model, mesh_id, vertices, faces):
    vert_adr = model.mesh_vertadr[mesh_id]
    vert_num = model.mesh_vertnum[mesh_id]
    model.mesh_vert[vert_adr : vert_adr + vert_num] = mesh_world_to_local(
        model,
        mesh_id,
        vertices,
    ).astype(np.float32)

    normal_adr = model.mesh_normaladr[mesh_id]
    normal_num = model.mesh_normalnum[mesh_id]
    if normal_num == vert_num:
        quat = model.mesh_quat[mesh_id]
        rot = R.from_quat([quat[1], quat[2], quat[3], quat[0]]).as_matrix()
        world_normals = compute_vertex_normals(vertices, faces)
        model.mesh_normal[normal_adr : normal_adr + normal_num] = (world_normals @ rot).astype(np.float32)


update_smpl_mesh = update_dynamic_mesh


def key_callback_factory(state):
    def key_callback(keycode):
        try:
            key = chr(keycode)
        except ValueError:
            return
        if key == " ":
            state["paused"] = not state["paused"]
        elif key in ("R", "r"):
            state["frame"] = 0
    return key_callback


def main():
    args = parse_args()
    sequence = load_sequence(args.data_dir, args.seq_name, args.seq_index)
    object_name = object_name_from_seq(sequence["seq_name"])

    temp_dir_obj = tempfile.TemporaryDirectory(prefix="smpl_mujoco_")
    temp_dir = Path(temp_dir_obj.name)

    smpl_model = build_smplh_model(sequence, args.smplh_model_dir, temp_dir)
    print(
        f"[Viewer] Body model backend={getattr(smpl_model, '_body_model_backend', 'unknown')}, "
        f"file={getattr(smpl_model, '_body_model_file', 'unknown')}"
    )
    if getattr(smpl_model, "_body_model_backend", "") != "smplx_release":
        print(
            "[Viewer][WARN] Release assets reconstruct humans with SMPL-X "
            "(SMPLX_MALE/FEMALE.npz). This viewer fell back to a non-SMPL-X model, "
            "so SMPL/object contact may show a systematic offset."
        )
    smpl_vertices, smpl_joints24 = compute_smpl_vertices(sequence, smpl_model, return_joints24=True)
    smpl_root_positions = smpl_joints24[:, 0, :]
    smpl_correspondence_vertex_indices, smpl_correspondence_name = load_smpl_correspondence_vertex_indices(
        args.correspondence_slots,
        args.correspondence_field,
        args.correspondence_smpl_name,
        sequence,
        smpl_model,
    )
    object_vertices, object_faces = compute_object_vertices(sequence, args.data_dir, object_name)
    if args.target_frames is not None:
        smpl_vertices = resample_frames(smpl_vertices, args.target_frames).astype(np.float32)
        smpl_root_positions = resample_frames(smpl_root_positions, args.target_frames).astype(np.float32)
        object_vertices = resample_frames(object_vertices, args.target_frames).astype(np.float32)
        print(f"[Viewer] Resampled original sequence to {args.target_frames} frames for synchronized playback.")
    object_surface_template = build_dynamic_surface_sample_template(
        object_vertices[0],
        object_faces,
        num_samples=OBJECT_SURFACE_SAMPLE_COUNT,
        seed=1,
    )

    if smpl_correspondence_vertex_indices is not None:
        num_human_points = len(smpl_correspondence_vertex_indices)
    else:
        num_human_points = len(smpl_vertices[0])
    marker_count = len(np.arange(num_human_points)[:: max(1, int(args.smpl_point_stride))]) + OBJECT_SURFACE_SAMPLE_COUNT + 1
    model = build_visual_model(
        marker_count,
    )
    data = mujoco.MjData(model)
    marker_geom_ids = [
        mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_GEOM, f"point_marker_{idx}")
        for idx in range(marker_count)
    ]
    marker_body_ids = [
        mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY, f"point_marker_body_{idx}")
        for idx in range(marker_count)
    ]
    marker_pairs = [
        (body_id, geom_id)
        for body_id, geom_id in zip(marker_body_ids, marker_geom_ids)
        if body_id >= 0 and geom_id >= 0
    ]
    marker_body_ids = [body_id for body_id, _ in marker_pairs]
    marker_geom_ids = [geom_id for _, geom_id in marker_pairs]

    print(f"[Viewer] seq_name={sequence['seq_name']}, object={object_name}, frames={len(sequence['trans'])}")
    if smpl_correspondence_vertex_indices is not None:
        print(f"[Viewer] Rendering reconstructed correspondence SMPL points ({smpl_correspondence_name}) and object contact map colors in MuJoCo.")
    else:
        print("[Viewer] Rendering full SMPL/object surface point clouds with contact map colors in MuJoCo.")
    print("[Viewer] Space: play/pause, R: reset")

    state = {"paused": args.paused, "frame": 0}
    viewer = mujoco.viewer.launch_passive(
        model,
        data,
        show_left_ui=False,
        show_right_ui=False,
        key_callback=key_callback_factory(state),
    )

    frame_dt = 1.0 / args.fps
    num_frames = min(len(smpl_vertices), len(sequence["obj_trans"]))
    reported_contact_map = False
    while viewer.is_running():
        frame = state["frame"] % num_frames
        if smpl_correspondence_vertex_indices is not None:
            human_points = smpl_vertices[frame][smpl_correspondence_vertex_indices]
        else:
            human_points = smpl_vertices[frame]
        human_points = human_points[:: max(1, int(args.smpl_point_stride))]
        object_points = dynamic_surface_template_to_world(
            object_vertices[frame],
            object_faces,
            object_surface_template,
        )

        human_distances, object_distances = compute_contact_maps(human_points, object_points)
        with viewer.lock():
            marker_drawn = update_point_markers(
                model,
                data,
                marker_body_ids,
                marker_geom_ids,
                human_points,
                human_distances,
                object_points,
                object_distances,
                float(args.smpl_point_size),
                float(args.object_point_size),
            )
            root_marker_idx = marker_drawn
            if root_marker_idx < len(marker_geom_ids):
                root_geom_id = marker_geom_ids[root_marker_idx]
                root_body_id = marker_body_ids[root_marker_idx]
                root_mocap_id = model.body_mocapid[root_body_id]
                data.mocap_pos[root_mocap_id] = smpl_root_positions[frame].astype(np.float64)
                data.mocap_quat[root_mocap_id] = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float64)
                model.geom_size[root_geom_id, 0] = float(args.smpl_point_size) * 3.0
                model.geom_rgba[root_geom_id] = np.array([1.0, 0.0, 1.0, 1.0], dtype=np.float32)
                marker_drawn += 1
            mujoco.mj_forward(model, data)

        viewer.sync()
        if not reported_contact_map:
            print(
                f"[Viewer] mujoco_points={marker_drawn}/{len(marker_geom_ids)}, "
                f"smpl_points={len(human_points)}, "
                f"object_points={len(object_points)}, "
                f"human-env min_dist={float(np.min(human_distances)):.4f}, "
                f"object-human min_dist={float(np.min(object_distances)):.4f}"
            )
            reported_contact_map = True
        if not state["paused"]:
            state["frame"] = (state["frame"] + 1) % num_frames
        time.sleep(frame_dt)

    viewer.close()


if __name__ == "__main__":
    main()

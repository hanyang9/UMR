"""Train the template-residual correspondence autoencoder.

The model learns a shared slot ordering from uniformly sampled template point
clouds. The final `correspondence_slots_final.npz` is the compact artifact used
by retargeting and correspondence visualization.
"""

import argparse
import os
import random
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset, Subset
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra


ROBOT_SAMPLE_NAMES = {
    "unitree_g1",
    "unitree_g1_brainco_hand",
    "pipluspro",
    "unitree_h2",
    "engineai_t800",
    "agibot_a2",
    "fourier_n1",
    "booster_k1",
}


def is_robot_sample_name(name):
    name = str(name)
    if name in ROBOT_SAMPLE_NAMES:
        return True
    body_prefixes = ("smpl", "smplx", "smplh")
    return not any(name == prefix or name.startswith(f"{prefix}_") for prefix in body_prefixes)


def _sample_height(points):
    points = np.asarray(points, dtype=np.float32)
    extents = points.max(axis=0) - points.min(axis=0)
    y_height = float(extents[1])
    max_extent = float(extents.max())
    if y_height < 0.6 * max_extent:
        return max_extent
    return y_height


def compute_normalization(points, mode="none", names=None, mesh_vertices=None, robot_height=None):
    points = np.asarray(points, dtype=np.float32)
    centers = np.zeros((points.shape[0], 1, 3), dtype=np.float32)
    scales = np.ones((points.shape[0], 1, 1), dtype=np.float32)
    if mode == "none":
        return points.copy(), centers, scales
    if mode == "mean_radius":
        scales = np.linalg.norm(points, axis=2, keepdims=True).mean(axis=1, keepdims=True)
        scales = np.maximum(scales, 1e-6).astype(np.float32)
        return (points / scales).astype(np.float32), centers, scales
    if mode != "per_sample_height":
        raise ValueError(f"Unsupported normalization mode: {mode}")

    if mesh_vertices is None:
        mesh_vertices = [None] * points.shape[0]
    if names is None:
        names = [f"sample_{idx}" for idx in range(points.shape[0])]

    for idx, name in enumerate(names):
        name = str(name)
        height_source = mesh_vertices[idx] if mesh_vertices[idx] is not None else points[idx]
        scale = _sample_height(height_source)
        if scale <= 1e-6:
            raise ValueError(f"Cannot compute height for {name}: {scale}")
        scales[idx, 0, 0] = float(scale)
    scales = np.maximum(scales, 1e-6).astype(np.float32)
    return (points / scales).astype(np.float32), centers, scales


def denormalize_points(points, centers, scales):
    return points * scales + centers


def sort_template_points(points, mode="y_z_x"):
    if mode == "none":
        return np.arange(points.shape[0], dtype=np.int32)
    axis_map = {"x": 0, "y": 1, "z": 2}
    axes = mode.split("_")
    if any(axis not in axis_map for axis in axes):
        raise ValueError(f"Unsupported template sort mode: {mode}")
    # np.lexsort uses the last key as primary, so reverse the requested priority.
    keys = tuple(points[:, axis_map[axis]] for axis in reversed(axes))
    return np.lexsort(keys).astype(np.int32)


class TemplatePointCloudDataset(Dataset):
    def __init__(
        self,
        npz_path,
        noise_std=0.002,
        dropout_ratio=0.0,
        jitter_rot=True,
        normalize="per_sample_height",
        robot_height=1.32,
    ):
        data = np.load(npz_path, allow_pickle=True)
        self.names = data["names"].astype(str).tolist()
        self.robot_name = (
            str(np.asarray(data["custom_robot_name"]).reshape(-1)[0])
            if "custom_robot_name" in data
            else ""
        )
        self.raw_points = data["points"].astype(np.float32)
        self.num_points = int(self.raw_points.shape[1])
        self.root_offsets = (
            data["root_offsets"].astype(np.float32)
            if "root_offsets" in data
            else np.zeros((len(self.names), 3), dtype=np.float32)
        )
        self.center_modes = (
            data["center_modes"].astype(str)
            if "center_modes" in data
            else np.asarray(["model_origin"] * len(self.names))
        )
        self.mesh_vertices = []
        self.mesh_faces = []
        self.sample_face_ids = []
        for idx in range(len(self.names)):
            vertices_key = f"mesh_vertices_{idx}"
            faces_key = f"mesh_faces_{idx}"
            sample_faces_key = f"sample_face_ids_{idx}"
            self.mesh_vertices.append(data[vertices_key].astype(np.float32) if vertices_key in data else None)
            self.mesh_faces.append(data[faces_key].astype(np.int32) if faces_key in data else None)
            self.sample_face_ids.append(data[sample_faces_key].astype(np.int32) if sample_faces_key in data else None)
        self.surface_oversample_ratio = int(np.asarray(data["surface_oversample_ratio"]).reshape(-1)[0]) if "surface_oversample_ratio" in data else 8
        self.surface_curvature_weight = float(np.asarray(data["surface_curvature_weight"]).reshape(-1)[0]) if "surface_curvature_weight" in data else 0.0
        self.surface_curvature_power = float(np.asarray(data["surface_curvature_power"]).reshape(-1)[0]) if "surface_curvature_power" in data else 1.0
        self.robot_exterior_surface = bool(np.asarray(data["robot_exterior_surface"]).reshape(-1)[0]) if "robot_exterior_surface" in data else True
        self.robot_exterior_occlusion_distance = float(np.asarray(data["robot_exterior_occlusion_distance"]).reshape(-1)[0]) if "robot_exterior_occlusion_distance" in data else 0.12
        self.robot_exterior_method = str(np.asarray(data["robot_exterior_method"]).reshape(-1)[0]) if "robot_exterior_method" in data else "first_hit"
        self.robot_exterior_ray_distance = float(np.asarray(data["robot_exterior_ray_distance"]).reshape(-1)[0]) if "robot_exterior_ray_distance" in data else 0.0
        self.points, self.norm_centers, self.norm_scales = compute_normalization(
            self.raw_points,
            normalize,
            names=self.names,
            mesh_vertices=self.mesh_vertices,
            robot_height=robot_height,
        )
        self.noise_std = float(noise_std)
        self.dropout_ratio = float(dropout_ratio)
        self.jitter_rot = bool(jitter_rot)
        self.normalize = str(normalize)
        self.robot_height = float(robot_height)

    def mesh_metadata(self, idx):
        return self.mesh_vertices[idx], self.mesh_faces[idx], self.sample_face_ids[idx]

    def recompute_normalization(self):
        self.points, self.norm_centers, self.norm_scales = compute_normalization(
            self.raw_points,
            self.normalize,
            names=self.names,
            mesh_vertices=self.mesh_vertices,
            robot_height=self.robot_height,
        )

    def resample_surface_points(
        self,
        seed,
        oversample_ratio=None,
        curvature_weight=None,
        curvature_power=None,
    ):
        from build_correspondence_ae_dataset import sample_surface

        oversample_ratio = self.surface_oversample_ratio if oversample_ratio is None else int(oversample_ratio)
        curvature_weight = self.surface_curvature_weight if curvature_weight is None else float(curvature_weight)
        curvature_power = self.surface_curvature_power if curvature_power is None else float(curvature_power)
        resampled_points = []
        resampled_face_ids = []
        for idx, name in enumerate(self.names):
            vertices = self.mesh_vertices[idx]
            faces = self.mesh_faces[idx]
            if vertices is None or faces is None:
                raise ValueError(
                    f"Cannot dynamically resample {name}: mesh metadata missing. "
                    "Rebuild data with scripts/build_correspondence_ae_dataset.py."
                )
            is_robot = is_robot_sample_name(name)
            points, face_ids = sample_surface(
                vertices,
                faces,
                self.num_points,
                int(seed) + idx * 1009,
                oversample_ratio=oversample_ratio,
                curvature_weight=curvature_weight,
                curvature_power=curvature_power,
                exterior_only=bool(is_robot and self.robot_exterior_surface),
                exterior_occlusion_distance=self.robot_exterior_occlusion_distance,
                exterior_method=self.robot_exterior_method,
                exterior_ray_distance=self.robot_exterior_ray_distance,
            )
            resampled_points.append(points.astype(np.float32))
            resampled_face_ids.append(face_ids.astype(np.int32))
        self.raw_points = np.stack(resampled_points, axis=0).astype(np.float32)
        self.sample_face_ids = resampled_face_ids
        self.recompute_normalization()

    def __len__(self):
        return len(self.points)

    def __getitem__(self, idx):
        target = self.points[idx].copy()
        source = target.copy()

        if self.jitter_rot:
            angle = random.uniform(-0.05, 0.05)
            c, s = np.cos(angle), np.sin(angle)
            rot = np.array([[c, -s, 0.0], [s, c, 0.0], [0.0, 0.0, 1.0]], dtype=np.float32)
            source = source @ rot.T

        if self.dropout_ratio > 0.0:
            keep = np.random.rand(len(source)) > self.dropout_ratio
            if keep.sum() < len(source):
                replace = np.random.choice(np.flatnonzero(keep), len(source) - keep.sum(), replace=True)
                source[~keep] = source[replace]

        if self.noise_std > 0.0:
            source = source + np.random.randn(*source.shape).astype(np.float32) * self.noise_std

        perm = np.random.permutation(len(source))
        return {
            "name": self.names[idx],
            "source": torch.from_numpy(source[perm]),
            "target": torch.from_numpy(target),
        }


class PointNetTemplateResidualAE(nn.Module):
    def __init__(self, template_points, latent_dim=1024, hidden_dim=512, zero_init_residual=True):
        super().__init__()
        template_points = torch.as_tensor(template_points, dtype=torch.float32)
        self.num_points = int(template_points.shape[0])
        self.register_buffer("template_points", template_points)
        self.encoder = nn.Sequential(
            nn.Conv1d(3, 64, 1),
            nn.BatchNorm1d(64),
            nn.ReLU(inplace=True),
            nn.Conv1d(64, 128, 1),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
            nn.Conv1d(128, 512, 1),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Conv1d(512, latent_dim, 1),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(inplace=True),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(inplace=True),
            nn.Linear(hidden_dim, self.num_points * 3),
        )
        if zero_init_residual:
            nn.init.zeros_(self.decoder[-1].weight)
            nn.init.zeros_(self.decoder[-1].bias)

    def forward(self, points):
        x = points.transpose(1, 2)
        latent = self.encoder(x).max(dim=-1).values
        residual = self.decoder(latent).reshape(points.shape[0], self.num_points, 3)
        recon = self.template_points.unsqueeze(0) + residual
        return recon, residual, latent


def chamfer_l2(pred, target):
    dist = torch.cdist(pred, target, p=2) ** 2
    return dist.min(dim=2).values.mean() + dist.min(dim=1).values.mean()


def point_repulsion_loss(points, k=8, radius=0.04):
    if points.shape[1] <= 1 or k <= 0 or radius <= 0.0:
        return points.new_tensor(0.0)
    k = min(int(k), points.shape[1] - 1)
    dist2 = torch.cdist(points, points, p=2) ** 2
    eye = torch.eye(points.shape[1], device=points.device, dtype=torch.bool).unsqueeze(0)
    dist2 = dist2.masked_fill(eye, float("inf"))
    knn_dist2 = torch.topk(dist2, k=k, dim=-1, largest=False).values
    return torch.exp(-knn_dist2 / (float(radius) ** 2)).mean()


def residual_regularization_loss(residual):
    return (residual ** 2).mean()


def build_template_knn_edges(template_points, k=8, chunk_size=512):
    if k <= 0 or template_points.shape[0] <= 1:
        return np.zeros((0, 2), dtype=np.int64)
    points = np.asarray(template_points, dtype=np.float32)
    num_points = points.shape[0]
    k = min(int(k), num_points - 1)
    edges = []
    for start in range(0, num_points, chunk_size):
        end = min(start + chunk_size, num_points)
        diff = points[start:end, None, :] - points[None, :, :]
        dist2 = np.sum(diff * diff, axis=-1)
        rows = np.arange(start, end)
        dist2[np.arange(end - start), rows] = np.inf
        nearest = np.argpartition(dist2, kth=k - 1, axis=1)[:, :k]
        src = np.repeat(rows[:, None], k, axis=1)
        edges.append(np.stack([src.reshape(-1), nearest.reshape(-1)], axis=1))
    return np.concatenate(edges, axis=0).astype(np.int64)


def build_template_geodesic_edges(
    template_points,
    mesh_vertices,
    mesh_faces,
    sample_face_ids,
    k=8,
    chunk_size=128,
):
    if k <= 0 or template_points.shape[0] <= 1:
        return np.zeros((0, 2), dtype=np.int64)
    if mesh_vertices is None or mesh_faces is None or sample_face_ids is None:
        raise ValueError(
            "Geodesic edge graph requires dataset mesh metadata. "
            "Rebuild the dataset with the updated build_correspondence_ae_dataset.py."
        )

    points = np.asarray(template_points, dtype=np.float32)
    vertices = np.asarray(mesh_vertices, dtype=np.float32)
    faces = np.asarray(mesh_faces, dtype=np.int32)
    sample_face_ids = np.asarray(sample_face_ids, dtype=np.int32)
    if len(points) != len(sample_face_ids):
        raise ValueError(
            f"sample_face_ids length {len(sample_face_ids)} does not match template points {len(points)}."
        )

    num_vertices = vertices.shape[0]
    num_points = points.shape[0]
    k = min(int(k), num_points - 1)

    face_edges = np.concatenate(
        [
            faces[:, [0, 1]],
            faces[:, [1, 2]],
            faces[:, [2, 0]],
        ],
        axis=0,
    )
    face_edges = np.sort(face_edges, axis=1)
    face_edges = np.unique(face_edges, axis=0)
    edge_weights = np.linalg.norm(vertices[face_edges[:, 0]] - vertices[face_edges[:, 1]], axis=1)

    sample_nodes = num_vertices + np.arange(num_points, dtype=np.int32)
    sample_faces = faces[sample_face_ids]
    sample_rows = np.repeat(sample_nodes[:, None], 3, axis=1).reshape(-1)
    sample_cols = sample_faces.reshape(-1)
    sample_weights = np.linalg.norm(
        np.repeat(points[:, None, :], 3, axis=1).reshape(-1, 3) - vertices[sample_cols],
        axis=1,
    )

    rows = np.concatenate([face_edges[:, 0], face_edges[:, 1], sample_rows, sample_cols])
    cols = np.concatenate([face_edges[:, 1], face_edges[:, 0], sample_cols, sample_rows])
    weights = np.concatenate([edge_weights, edge_weights, sample_weights, sample_weights])
    graph = coo_matrix(
        (weights.astype(np.float32), (rows.astype(np.int32), cols.astype(np.int32))),
        shape=(num_vertices + num_points, num_vertices + num_points),
    ).tocsr()

    edges = []
    for start in range(0, num_points, chunk_size):
        end = min(start + chunk_size, num_points)
        source_nodes = sample_nodes[start:end]
        dist = dijkstra(graph, directed=False, indices=source_nodes, min_only=False)
        sample_dist = np.asarray(dist[:, num_vertices : num_vertices + num_points], dtype=np.float32)
        sample_dist[np.arange(end - start), np.arange(start, end)] = np.inf
        nearest = np.argpartition(sample_dist, kth=k - 1, axis=1)[:, :k]
        src = np.repeat(np.arange(start, end, dtype=np.int64)[:, None], k, axis=1)
        edges.append(np.stack([src.reshape(-1), nearest.reshape(-1)], axis=1))
    return np.concatenate(edges, axis=0).astype(np.int64)


def residual_edge_smoothness_loss(residual, edge_index):
    if edge_index is None or edge_index.numel() == 0:
        return residual.new_tensor(0.0)
    src = edge_index[:, 0]
    dst = edge_index[:, 1]
    edge_residual = residual[:, src, :] - residual[:, dst, :]
    return (edge_residual ** 2).sum(dim=-1).mean()


def robot2smpl_only_mode(args):
    return bool(args.fixed_template) or int(args.batch_size) == 1


def training_indices_for_args(dataset, args):
    if not robot2smpl_only_mode(args):
        return list(range(len(dataset))), np.zeros(0, dtype=np.int32)
    if dataset.robot_name:
        train_indices = [idx for idx, name in enumerate(dataset.names) if str(name) == dataset.robot_name]
    else:
        train_indices = [idx for idx, name in enumerate(dataset.names) if is_robot_sample_name(name)]
    if not train_indices:
        raise ValueError(
            "fixed-template correspondence training requires robot sample names, but none "
            f"were found in {dataset.names}."
        )
    fixed_template_indices = [idx for idx in range(len(dataset)) if idx not in train_indices]
    return train_indices, np.asarray(fixed_template_indices, dtype=np.int32)


def parse_args():
    parser = argparse.ArgumentParser(description="Train a template-residual correspondence AE.")
    parser.add_argument("--data", type=Path, default=Path("data/correspondence_ae_tpose_4096.npz"))
    parser.add_argument("--out-dir", type=Path, default=Path("output/correspondence_template_residual_ae"))
    parser.add_argument("--template-name", type=str, default="smplx_neutral")
    parser.add_argument("--template-sort", choices=["none", "x_y_z", "y_z_x", "z_y_x"], default="y_z_x")
    parser.add_argument("--num-points", type=int, default=4096)
    parser.add_argument("--latent-dim", type=int, default=1024)
    parser.add_argument("--hidden-dim", type=int, default=512)
    parser.add_argument("--epochs", type=int, default=5000)
    parser.add_argument("--batch-size", type=int, default=7)
    parser.add_argument(
        "--fixed-template",
        action="store_true",
        help="Keep non-robot template samples fixed and train reconstruction only for robot samples.",
    )
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--lr-scheduler", choices=["none", "cosine"], default="cosine")
    parser.add_argument("--min-lr", type=float, default=1e-5)
    parser.add_argument("--chamfer-weight", type=float, default=1.0)
    parser.add_argument("--repulsion-weight", type=float, default=0.01)
    parser.add_argument("--repulsion-k", type=int, default=8)
    parser.add_argument("--repulsion-radius", type=float, default=0.04)
    parser.add_argument("--residual-weight", type=float, default=0.001)
    parser.add_argument("--edge-weight", type=float, default=0.01)
    parser.add_argument("--edge-graph", choices=["euclidean", "geodesic"], default="euclidean")
    parser.add_argument("--edge-k", type=int, default=8)
    parser.add_argument("--noise-std", type=float, default=0.002)
    parser.add_argument("--dropout-ratio", type=float, default=0.0)
    parser.add_argument("--normalize", choices=["none", "mean_radius", "per_sample_height"], default="per_sample_height")
    parser.add_argument(
        "--robot-height",
        type=float,
        default=1.32,
        help=(
            "Deprecated compatibility option. --normalize per_sample_height normalizes every sample by "
            "its own height and does not use a shared robot height."
        ),
    )
    parser.add_argument(
        "--resample-every",
        type=int,
        default=0,
        help="Dynamically resample every N epochs from saved mesh surfaces. 0 disables and uses the fixed npz points.",
    )
    parser.add_argument(
        "--resample-surface-oversample-ratio",
        type=int,
        default=0,
        help="Oversample ratio for dynamic surface resampling. 0 reuses the value saved in the dataset npz.",
    )
    parser.add_argument(
        "--resample-surface-curvature-weight",
        type=float,
        default=0.0,
        help="Curvature weight for dynamic surface resampling. 0 means uniform area sampling; negative reuses the dataset npz value.",
    )
    parser.add_argument(
        "--resample-surface-curvature-power",
        type=float,
        default=-1.0,
        help="Curvature power for dynamic surface resampling. Negative reuses the value saved in the dataset npz.",
    )
    parser.add_argument("--no-zero-init-residual", action="store_true")
    parser.add_argument("--log-every", type=int, default=100)
    parser.add_argument("--save-every", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--device", type=str, default="cuda")
    return parser.parse_args()


def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def resolve_device(device_arg):
    if device_arg != "auto":
        return torch.device(device_arg)
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def resample_kwargs_from_args(args):
    return {
        "oversample_ratio": None
        if int(args.resample_surface_oversample_ratio) <= 0
        else int(args.resample_surface_oversample_ratio),
        "curvature_weight": None
        if float(args.resample_surface_curvature_weight) < 0.0
        else float(args.resample_surface_curvature_weight),
        "curvature_power": None
        if float(args.resample_surface_curvature_power) < 0.0
        else float(args.resample_surface_curvature_power),
    }


def build_template_training_state(dataset, args, device):
    if args.template_name not in dataset.names:
        raise ValueError(f"Template {args.template_name!r} not found in {dataset.names}")
    template_idx = dataset.names.index(args.template_name)
    template_sort_index = sort_template_points(dataset.points[template_idx], args.template_sort)
    template_points = dataset.points[template_idx, template_sort_index]
    template_raw_sorted = dataset.raw_points[template_idx, template_sort_index]
    if args.edge_graph == "geodesic":
        mesh_vertices, mesh_faces, sample_face_ids = dataset.mesh_metadata(template_idx)
        sorted_sample_face_ids = None if sample_face_ids is None else sample_face_ids[template_sort_index]
        template_edge_index_np = build_template_geodesic_edges(
            template_raw_sorted,
            mesh_vertices,
            mesh_faces,
            sorted_sample_face_ids,
            args.edge_k,
        )
    else:
        template_edge_index_np = build_template_knn_edges(template_points, args.edge_k)
    template_edge_index = torch.from_numpy(template_edge_index_np).long().to(device)
    return template_sort_index, template_points, template_raw_sorted, template_edge_index_np, template_edge_index


def save_checkpoint(path, model, optimizer, scheduler, epoch, dataset, args, template_sort_index, template_edge_index):
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model": model.state_dict(),
            "optimizer": optimizer.state_dict(),
            "scheduler": None if scheduler is None else scheduler.state_dict(),
            "epoch": epoch,
            "names": dataset.names,
            "args": vars(args),
            "template_sort_index": template_sort_index,
            "template_edge_index": template_edge_index,
            "training_mode": "robot2smpl_only" if robot2smpl_only_mode(args) else "all_samples",
        },
        path,
    )


def export_correspondence(
    path,
    model,
    dataset,
    device,
    template_name,
    template_sort_index,
    template_raw_sorted,
    template_edge_index,
    template_edge_graph,
    fixed_template_indices=None,
    train_sample_indices=None,
):
    model.eval()
    with torch.no_grad():
        source = torch.from_numpy(dataset.points).to(device)
        recon, residual, latent = model(source)
    recon_normalized = recon.detach().cpu().numpy().astype(np.float32)
    residual_normalized = residual.detach().cpu().numpy().astype(np.float32)
    fixed_template_indices = np.asarray(
        [] if fixed_template_indices is None else fixed_template_indices,
        dtype=np.int32,
    ).reshape(-1)
    if fixed_template_indices.size:
        template_points_normalized = model.template_points.detach().cpu().numpy().astype(np.float32)
        valid_fixed = fixed_template_indices[
            (fixed_template_indices >= 0) & (fixed_template_indices < recon_normalized.shape[0])
        ]
        recon_normalized[valid_fixed] = template_points_normalized[None, :, :]
        residual_normalized[valid_fixed] = 0.0
        latent_np = latent.detach().cpu().numpy().astype(np.float32)
        latent_np[valid_fixed] = 0.0
    else:
        latent_np = latent.detach().cpu().numpy().astype(np.float32)
    reconstructed_slots = denormalize_points(
        recon_normalized,
        dataset.norm_centers,
        dataset.norm_scales,
    ).astype(np.float32)
    residual_slots = residual_normalized * dataset.norm_scales
    np.savez_compressed(
        path,
        names=np.asarray(dataset.names),
        target_points=dataset.raw_points.astype(np.float32),
        reconstructed_slots=reconstructed_slots,
        residual_slots=residual_slots.astype(np.float32),
        root_offsets=dataset.root_offsets.astype(np.float32),
        center_modes=dataset.center_modes.astype(str),
        normalized_target_points=dataset.points.astype(np.float32),
        normalized_reconstructed_slots=recon_normalized,
        normalized_residual_slots=residual_normalized,
        normalization_mode=np.asarray(dataset.normalize),
        normalization_centers=dataset.norm_centers[:, 0, :].astype(np.float32),
        normalization_scales=dataset.norm_scales[:, 0, 0].astype(np.float32),
        normalization_height_mode=np.asarray("per_sample_height"),
        normalization_robot_height=np.asarray([np.nan], dtype=np.float32),
        template_name=np.asarray(template_name),
        template_points=template_raw_sorted.astype(np.float32),
        template_sort_index=template_sort_index.astype(np.int32),
        template_edge_index=template_edge_index.astype(np.int64),
        template_edge_graph=np.asarray(template_edge_graph),
        latents=latent_np,
        slot_index=np.arange(dataset.points.shape[1], dtype=np.int32),
        training_mode=np.asarray("robot2smpl_only" if fixed_template_indices.size else "all_samples"),
        train_sample_indices=np.asarray(
            np.arange(len(dataset)) if train_sample_indices is None else train_sample_indices,
            dtype=np.int32,
        ),
        fixed_template_indices=fixed_template_indices.astype(np.int32),
    )


def print_normalization_summary(dataset, args):
    if args.normalize == "none":
        return
    scale_text = ", ".join(
        f"{name}={scale:.4f}" for name, scale in zip(dataset.names, dataset.norm_scales[:, 0, 0])
    )
    print(f"[TrainResidual] normalization_scales {scale_text}")
    if args.normalize == "per_sample_height":
        height_text = ", ".join(
            f"{name}={scale:.6f}" for name, scale in zip(dataset.names, dataset.norm_scales[:, 0, 0])
        )
        print(f"[TrainResidual] per_sample_heights {height_text}")


def main():
    args = parse_args()
    set_seed(args.seed)
    device = resolve_device(args.device)
    args.out_dir.mkdir(parents=True, exist_ok=True)

    dataset = TemplatePointCloudDataset(
        args.data,
        args.noise_std,
        args.dropout_ratio,
        normalize=args.normalize,
        robot_height=args.robot_height,
    )
    if int(args.resample_every) > 0:
        dataset.resample_surface_points(int(args.seed), **resample_kwargs_from_args(args))
        print(
            f"[TrainResidual] dynamic surface resampling enabled: every={args.resample_every} epochs, "
            f"initial_seed={int(args.seed)}"
        )
    template_sort_index, template_points, template_raw_sorted, template_edge_index_np, template_edge_index = (
        build_template_training_state(dataset, args, device)
    )
    train_sample_indices, fixed_template_indices = training_indices_for_args(dataset, args)
    train_dataset = Subset(dataset, train_sample_indices)

    loader = DataLoader(train_dataset, batch_size=min(args.batch_size, len(train_dataset)), shuffle=True, drop_last=False)
    model = PointNetTemplateResidualAE(
        template_points,
        args.latent_dim,
        args.hidden_dim,
        zero_init_residual=not args.no_zero_init_residual,
    ).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = None
    if args.lr_scheduler == "cosine":
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=args.min_lr)

    print(f"[TrainResidual] data={args.data} samples={len(dataset)} names={dataset.names}")
    print(f"[TrainResidual] template={args.template_name} sort={args.template_sort}")
    print(f"[TrainResidual] device={device} num_points={args.num_points} out={args.out_dir}")
    print(f"[TrainResidual] normalize={args.normalize}")
    if robot2smpl_only_mode(args):
        train_names = [dataset.names[idx] for idx in train_sample_indices]
        fixed_names = [dataset.names[idx] for idx in fixed_template_indices]
        print(
            "[TrainResidual] training_mode=robot2smpl_only "
            f"train_samples={train_names} fixed_template_samples={fixed_names}"
        )
    else:
        print("[TrainResidual] training_mode=all_samples")
    print_normalization_summary(dataset, args)
    print(
        f"[TrainResidual] chamfer_weight={args.chamfer_weight} "
        f"repulsion_weight={args.repulsion_weight} "
        f"residual_weight={args.residual_weight} "
        f"edge_weight={args.edge_weight} "
        f"edge_graph={args.edge_graph} "
        f"repulsion_k={args.repulsion_k} repulsion_radius={args.repulsion_radius} "
        f"edge_k={args.edge_k} edge_count={len(template_edge_index_np)}"
    )

    for epoch in range(1, args.epochs + 1):
        if int(args.resample_every) > 0 and epoch > 1 and (epoch - 1) % int(args.resample_every) == 0:
            resample_seed = int(args.seed) + epoch - 1
            dataset.resample_surface_points(resample_seed, **resample_kwargs_from_args(args))
            (
                template_sort_index,
                template_points,
                template_raw_sorted,
                template_edge_index_np,
                template_edge_index,
            ) = build_template_training_state(dataset, args, device)
            with torch.no_grad():
                model.template_points.copy_(torch.from_numpy(template_points).to(device=device, dtype=torch.float32))
            print(
                f"[TrainResidual] resampled surface templates at epoch={epoch:05d} "
                f"seed={resample_seed} edge_count={len(template_edge_index_np)}"
            )
            train_sample_indices, fixed_template_indices = training_indices_for_args(dataset, args)
            train_dataset = Subset(dataset, train_sample_indices)
            loader = DataLoader(
                train_dataset,
                batch_size=min(args.batch_size, len(train_dataset)),
                shuffle=True,
                drop_last=False,
            )
        model.train()
        total = 0.0
        terms = {"chamfer": 0.0, "repulsion": 0.0, "residual": 0.0, "edge": 0.0}
        for batch in loader:
            source = batch["source"].to(device=device, dtype=torch.float32)
            target = batch["target"].to(device=device, dtype=torch.float32)

            recon, residual, _ = model(source)
            chamfer = chamfer_l2(recon, target)
            repulsion = point_repulsion_loss(recon, args.repulsion_k, args.repulsion_radius)
            residual_reg = residual_regularization_loss(residual)
            edge_smooth = residual_edge_smoothness_loss(residual, template_edge_index)
            weighted_chamfer = args.chamfer_weight * chamfer
            weighted_repulsion = args.repulsion_weight * repulsion
            weighted_residual = args.residual_weight * residual_reg
            weighted_edge = args.edge_weight * edge_smooth
            loss = weighted_chamfer + weighted_repulsion + weighted_residual + weighted_edge

            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            optimizer.step()

            total += float(loss.detach().cpu())
            terms["chamfer"] += float(weighted_chamfer.detach().cpu())
            terms["repulsion"] += float(weighted_repulsion.detach().cpu())
            terms["residual"] += float(weighted_residual.detach().cpu())
            terms["edge"] += float(weighted_edge.detach().cpu())

        if scheduler is not None:
            scheduler.step()

        if epoch == 1 or epoch % args.log_every == 0:
            denom = max(1, len(loader))
            current_lr = optimizer.param_groups[0]["lr"]
            print(
                f"[TrainResidual] epoch={epoch:05d} loss={total / denom:.6f} "
                f"chamfer={terms['chamfer'] / denom:.6f} "
                f"repulsion={terms['repulsion'] / denom:.6f} "
                f"residual={terms['residual'] / denom:.6f} "
                f"edge={terms['edge'] / denom:.6f} "
                f"lr={current_lr:.8f}"
            )

        if args.save_every > 0 and epoch % args.save_every == 0:
            save_checkpoint(
                args.out_dir / "checkpoint-latest.pt",
                model,
                optimizer,
                scheduler,
                epoch,
                dataset,
                args,
                template_sort_index,
                template_edge_index_np,
            )
            export_correspondence(
                args.out_dir / "correspondence_slots_latest.npz",
                model,
                dataset,
                device,
                args.template_name,
                template_sort_index,
                template_raw_sorted,
                template_edge_index_np,
                args.edge_graph,
                fixed_template_indices=fixed_template_indices,
                train_sample_indices=train_sample_indices,
            )

    save_checkpoint(
        args.out_dir / "checkpoint-final.pt",
        model,
        optimizer,
        scheduler,
        args.epochs,
        dataset,
        args,
        template_sort_index,
        template_edge_index_np,
    )
    export_correspondence(
        args.out_dir / "correspondence_slots_final.npz",
        model,
        dataset,
        device,
        args.template_name,
        template_sort_index,
        template_raw_sorted,
        template_edge_index_np,
        args.edge_graph,
        fixed_template_indices=fixed_template_indices,
        train_sample_indices=train_sample_indices,
    )
    print(f"[TrainResidual] Saved final checkpoint and correspondence slots to {args.out_dir}")


if __name__ == "__main__":
    main()

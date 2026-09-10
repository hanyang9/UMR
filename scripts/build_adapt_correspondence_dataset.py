#!/usr/bin/env python3
"""Build the SMPL-X+racket to robot+racket correspondence dataset for AdaPT."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

import mujoco
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import build_correspondence_ae_dataset as build  # noqa: E402
from humanoid_retarget_config import load_config, resolve_path, robot_config, section  # noqa: E402
from humanoid_retarget_pipeline import (  # noqa: E402
    bool_value,
    config_joint_values,
    dataset_out,
    effective_robot_sample_pose,
    effective_robot_sample_qpos,
    mimic_qpos_for_build,
)
from mujoco_geom_surface import geom_local_mesh  # noqa: E402


def _required_path(config: dict[str, Any], value: Any, label: str) -> Path:
    path = resolve_path(value, config)
    if path is None or not path.exists():
        raise FileNotFoundError(f"AdaPT {label} not found: {path}")
    return path


def _racket_face_ranges(xml_path: Path) -> tuple[list[tuple[int, int]], list[str]]:
    model = build.load_mujoco_model(xml_path)
    ranges: list[tuple[int, int]] = []
    labels: list[str] = []
    face_offset = 0
    for geom_id in build.visual_mesh_geom_ids(model):
        _vertices, faces = geom_local_mesh(model, int(geom_id))
        geom_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_GEOM, int(geom_id)) or ""
        mesh_id = int(model.geom_dataid[int(geom_id)])
        mesh_name = ""
        if mesh_id >= 0:
            mesh_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_MESH, mesh_id) or ""
        next_offset = face_offset + len(faces)
        if "racket" in geom_name.lower() or "racket" in mesh_name.lower():
            ranges.append((face_offset, next_offset))
            labels.append(f"geom={geom_name or geom_id},mesh={mesh_name or mesh_id}")
        face_offset = next_offset
    if not ranges:
        raise ValueError(f"No racket geom or mesh found in {xml_path}")
    return ranges, labels


def _source_sample(config: dict[str, Any], dataset: dict[str, Any], adapt: dict[str, Any]) -> tuple[dict, int, int]:
    source_path = _required_path(config, adapt.get("source_tpose_npz"), "source T-pose")
    racket_path = _required_path(config, adapt.get("racket_tpose_npz"), "racket T-pose")
    with np.load(source_path, allow_pickle=True) as source:
        body_vertices = np.asarray(source["vertices_world"], dtype=np.float32)
        body_faces = np.asarray(source["faces"], dtype=np.int32)
        spine1 = np.asarray(source["joints_world"][3], dtype=np.float32)
    with np.load(racket_path, allow_pickle=True) as racket:
        racket_vertices = np.asarray(racket["vertices_world"], dtype=np.float32)
        racket_faces = np.asarray(racket["faces"], dtype=np.int32)

    vertices = np.concatenate([body_vertices - spine1, racket_vertices - spine1], axis=0)
    racket_face_start = len(body_faces)
    faces = np.concatenate([body_faces, racket_faces + len(body_vertices)], axis=0).astype(np.int32)
    seed = int(dataset.get("seed", 0))
    points, face_ids = build.sample_surface(
        vertices,
        faces,
        int(dataset.get("num_points", 4096)),
        seed + 1000,
        oversample_ratio=int(dataset.get("surface_oversample_ratio", 8)),
        curvature_weight=float(dataset.get("surface_curvature_weight", 0.0)),
        curvature_power=float(dataset.get("surface_curvature_power", 1.0)),
        exterior_only=bool_value(dataset.get("exterior_surface"), True),
        exterior_occlusion_distance=float(dataset.get("exterior_occlusion_distance", 0.12)),
        exterior_method=str(dataset.get("exterior_method", "first_hit")),
        exterior_ray_distance=float(dataset.get("exterior_ray_distance", 0.0)),
    )
    racket_count = int(np.count_nonzero(face_ids >= racket_face_start))
    print(
        f"[AdaPTCorr] source points={len(points)} racket_points={racket_count} "
        f"spine1_world={spine1.tolist()}"
    )
    return {
        "name": str(adapt.get("source_slot_name", "smplx_racket_tpose")),
        "points": points.astype(np.float32),
        "vertices": vertices.astype(np.float32),
        "faces": faces,
        "sample_face_ids": face_ids.astype(np.int32),
        "root_offset": np.zeros(3, dtype=np.float32),
        "center_mode": "spine1",
        "betas": np.zeros(0, dtype=np.float32),
    }, racket_count, racket_face_start


def _robot_sample(config: dict[str, Any], dataset: dict[str, Any]) -> tuple[dict, int, list[tuple[int, int]]]:
    robot = robot_config(config)
    xml_path = _required_path(config, robot.get("xml"), "robot MJCF")
    pose = effective_robot_sample_pose(config)
    tpose_qpos = effective_robot_sample_qpos(config, pose)
    sample = build.build_robot_sample(
        xml_path,
        str(robot.get("slot_name", robot["name"])),
        int(dataset.get("num_points", 4096)),
        int(dataset.get("seed", 0)) + 9000,
        int(dataset.get("surface_oversample_ratio", 8)),
        float(dataset.get("surface_curvature_weight", 0.0)),
        float(dataset.get("surface_curvature_power", 1.0)),
        to_smpl_frame=bool_value(robot.get("to_smpl_frame"), True),
        pose=pose,
        exterior_surface=bool_value(dataset.get("exterior_surface"), True),
        exterior_occlusion_distance=float(dataset.get("exterior_occlusion_distance", 0.12)),
        exterior_method=str(dataset.get("exterior_method", "first_hit")),
        exterior_ray_distance=float(dataset.get("exterior_ray_distance", 0.0)),
        point_cloud_center_name=str(robot.get("sample_point_cloud_center", robot["point_cloud_center"])),
        tpose_qpos=tpose_qpos,
        mimic_qpos=mimic_qpos_for_build(robot),
        reset_key=robot.get("reset_key"),
    )
    ranges, labels = _racket_face_ranges(xml_path)
    if max(end for _begin, end in ranges) > len(sample["faces"]):
        raise ValueError("Racket face range exceeds the merged robot mesh")
    face_ids = np.asarray(sample["sample_face_ids"], dtype=np.int32)
    racket_mask = np.zeros(len(face_ids), dtype=bool)
    for begin, end in ranges:
        racket_mask |= (face_ids >= begin) & (face_ids < end)
    racket_count = int(np.count_nonzero(racket_mask))
    if racket_count == 0:
        raise ValueError(f"No robot samples landed on racket ranges {ranges}")
    print(
        f"[AdaPTCorr] target points={len(face_ids)} racket_points={racket_count} "
        f"racket_ranges={ranges} labels={labels}"
    )
    return sample, racket_count, ranges


def build_adapt_correspondence_dataset(config: dict[str, Any], force: bool = False, dry_run: bool = False) -> Path:
    out = dataset_out(config)
    if out.exists() and not force:
        print(f"[AdaPTCorr] reuse correspondence dataset: {out}")
        return out
    if dry_run:
        print(f"[AdaPTCorr] would build correspondence dataset: {out}")
        return out

    correspondence = section(config, "correspondence")
    dataset = section(correspondence, "dataset")
    adapt = section(config, "adapt")
    source, source_racket_count, source_racket_face_start = _source_sample(config, dataset, adapt)
    robot, robot_racket_count, robot_racket_face_ranges = _robot_sample(config, dataset)
    samples = [source, robot]
    robot_cfg = robot_config(config)
    robot_qpos = config_joint_values(config, "tpose_qpos")
    save_data = {
        "names": np.asarray([sample["name"] for sample in samples]),
        "points": np.stack([sample["points"] for sample in samples]).astype(np.float32),
        "root_offsets": np.stack([sample["root_offset"] for sample in samples]).astype(np.float32),
        "center_modes": np.asarray([sample["center_mode"] for sample in samples]),
        "num_points": np.asarray(int(dataset.get("num_points", 4096)), dtype=np.int32),
        "seed": np.asarray(int(dataset.get("seed", 0)), dtype=np.int32),
        "surface_oversample_ratio": np.asarray(int(dataset.get("surface_oversample_ratio", 8)), dtype=np.int32),
        "surface_curvature_weight": np.asarray(float(dataset.get("surface_curvature_weight", 0.0)), dtype=np.float32),
        "surface_curvature_power": np.asarray(float(dataset.get("surface_curvature_power", 1.0)), dtype=np.float32),
        "bbox_center_ratio": np.asarray(float(dataset.get("bbox_center_ratio", 0.45)), dtype=np.float32),
        "robot_exterior_surface": np.asarray(bool_value(dataset.get("exterior_surface"), True)),
        "robot_exterior_occlusion_distance": np.asarray(float(dataset.get("exterior_occlusion_distance", 0.12)), dtype=np.float32),
        "robot_exterior_method": np.asarray(str(dataset.get("exterior_method", "first_hit"))),
        "robot_exterior_ray_distance": np.asarray(float(dataset.get("exterior_ray_distance", 0.0)), dtype=np.float32),
        "custom_robot_name": np.asarray(str(robot_cfg.get("slot_name", robot_cfg["name"]))),
        "custom_robot_xml": np.asarray(str(resolve_path(robot_cfg["xml"], config))),
        "custom_robot_point_cloud_center": np.asarray(str(robot_cfg["point_cloud_center"])),
        "custom_robot_retarget_point_cloud_center": np.asarray(str(robot_cfg["point_cloud_center"])),
        "custom_robot_root_body": np.asarray(str(robot_cfg["point_cloud_center"])),
        "custom_robot_retarget_root_body": np.asarray(str(robot_cfg["point_cloud_center"])),
        "custom_robot_sample_pose": np.asarray("tpose"),
        "custom_robot_sample_qpos_names": np.asarray(list(robot_qpos), dtype=object),
        "custom_robot_sample_qpos_values": np.asarray(list(robot_qpos.values()), dtype=np.float32),
        "source_racket_sample_count": np.asarray(source_racket_count, dtype=np.int32),
        "robot_racket_sample_count": np.asarray(robot_racket_count, dtype=np.int32),
        "source_racket_face_start": np.asarray(source_racket_face_start, dtype=np.int32),
        "robot_racket_face_ranges": np.asarray(robot_racket_face_ranges, dtype=np.int32),
    }
    for index, sample in enumerate(samples):
        save_data[f"mesh_vertices_{index}"] = np.asarray(sample["vertices"], dtype=np.float32)
        save_data[f"mesh_faces_{index}"] = np.asarray(sample["faces"], dtype=np.int32)
        save_data[f"sample_face_ids_{index}"] = np.asarray(sample["sample_face_ids"], dtype=np.int32)
        save_data[f"betas_{index}"] = np.asarray(sample.get("betas", []), dtype=np.float32)
    out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(out, **save_data)
    print(f"[AdaPTCorr] saved {out} points={save_data['points'].shape}")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    build_adapt_correspondence_dataset(load_config(args.config), force=args.force)


if __name__ == "__main__":
    main()

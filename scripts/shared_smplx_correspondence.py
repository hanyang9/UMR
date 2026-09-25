"""Transfer a fixed SMPL-X correspondence template across SMPL-X betas."""
from __future__ import annotations

from pathlib import Path

import numpy as np

import smpl_surface_retarget_common as common
from humanoid_retarget_config import resolve_path, section


def _enabled(config) -> bool:
    value = section(config, "correspondence").get("reuse_across_smplx_betas", False)
    if isinstance(value, str):
        return value.strip().lower() not in {"", "0", "false", "no", "off"}
    return bool(value)


def transfer_slots(
    *,
    config,
    slots_path: Path,
    slots_field: str,
    slot_name: str,
    motion_template_vertices_centered: np.ndarray,
    motion_template_faces: np.ndarray,
    center_mode: str,
    source_model_type: str,
    smplx_model_dir: Path,
    nearest_vertex_k: int,
) -> np.ndarray | None:
    """Return slots transferred from the shared template, or None when disabled."""
    if not _enabled(config):
        return None
    if str(source_model_type).lower() != "smplx":
        raise ValueError("Shared beta-zero correspondence transfer currently supports SMPL-X motion only")

    corr = section(config, "correspondence")
    shared = section(corr, "shared_smplx_template")
    shared_name = str(shared.get("name", ""))
    if not shared_name or shared.get("betas") is None:
        raise ValueError("Shared SMPL-X correspondence requires shared_smplx_template.name and betas")
    if str(slot_name) != shared_name:
        raise ValueError(
            f"Shared SMPL-X template mismatch: slots name={slot_name!r}, template={shared_name!r}"
        )

    shared_slots, saved_center_mode, loaded_name = common.load_slot_data(
        slots_path,
        shared_name,
        slots_field,
    )
    if loaded_name != shared_name or str(saved_center_mode) != str(center_mode):
        raise ValueError(
            f"Shared SMPL-X slot metadata mismatch: name={loaded_name!r}, "
            f"center={saved_center_mode!r}, expected center={center_mode!r}"
        )

    model_dir = resolve_path(shared.get("model_dir"), config, smplx_model_dir)
    model = common.build_smplx_model(model_dir, str(shared.get("gender", "neutral")), 1)
    shared_vertices, shared_joints = common.zero_pose_vertices_and_joints(
        model,
        betas=shared.get("betas"),
    )
    shared_faces = np.asarray(model.faces, dtype=np.int32)
    motion_faces = np.asarray(motion_template_faces, dtype=np.int32)
    if shared_faces.shape != motion_faces.shape or not np.array_equal(shared_faces, motion_faces):
        raise ValueError("Shared SMPL-X template topology does not match the motion SMPL-X topology")
    shared_vertices_centered, _shared_joints, shared_center = common.center_smplx_template(
        shared_vertices,
        shared_joints,
        center_mode,
    )

    binding_path = resolve_path(shared.get("surface_binding"), config)
    binding = None
    if binding_path is not None and binding_path.exists():
        with np.load(binding_path, allow_pickle=True) as saved:
            saved_name = str(np.asarray(saved.get("template_name", "")).item())
            face_ids = np.asarray(saved["face_ids"], dtype=np.int32)
            bary = np.asarray(saved["bary"], dtype=np.float32)
        if saved_name == shared_name and len(face_ids) == len(shared_slots) and bary.shape == (len(shared_slots), 3):
            binding = {"face_ids": face_ids, "bary": bary}
            print(f"[HumanoidRetarget][SharedSMPLX] reuse surface binding: {binding_path}")

    if binding is None:
        computed = common.bind_points_to_mesh(
            shared_slots,
            shared_vertices_centered,
            shared_faces,
            nearest_vertex_k=nearest_vertex_k,
        )
        binding = {
            "face_ids": np.asarray(computed["face_ids"], dtype=np.int32),
            "bary": np.asarray(computed["bary"], dtype=np.float32),
        }
        if binding_path is not None:
            binding_path.parent.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(
                binding_path,
                template_name=np.asarray(shared_name),
                face_ids=binding["face_ids"],
                bary=binding["bary"],
                binding_errors=np.asarray(computed["errors"], dtype=np.float32),
                template_center=np.asarray(shared_center, dtype=np.float32),
            )
            print(f"[HumanoidRetarget][SharedSMPLX] saved surface binding: {binding_path}")

    transferred = common.dynamic_surface_template_to_world(
        np.asarray(motion_template_vertices_centered, dtype=np.float32),
        motion_faces,
        binding,
    ).astype(np.float32)
    print(
        f"[HumanoidRetarget][SharedSMPLX] transferred slots={len(transferred)} "
        f"template={shared_name} -> motion betas using fixed face+bary"
    )
    return transferred

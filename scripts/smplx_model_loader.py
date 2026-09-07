from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import smplx
import torch


OVERLAY_MANIFEST = "umr_smplx_overlay.json"
OVERLAY_FORMAT = "umr_smplx_overlay_v1"


def _resolve_from_manifest(manifest_path: Path, value: str) -> Path:
    path = Path(value).expanduser()
    return path.resolve() if path.is_absolute() else (manifest_path.parent / path).resolve()


def _load_obj_vertices(path: Path) -> np.ndarray:
    vertices = [
        [float(value) for value in line.split()[1:4]]
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.startswith("v ")
    ]
    if not vertices:
        raise ValueError(f"SMPL-X overlay OBJ contains no vertices: {path}")
    return np.asarray(vertices, dtype=np.float32)


def build_smplx_model(model_dir: Path, gender: str, batch_size: int):
    requested_dir = Path(model_dir).resolve()
    manifest_path = requested_dir / OVERLAY_MANIFEST
    manifest = None
    base_model = requested_dir
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("format") != OVERLAY_FORMAT:
            raise ValueError(
                f"Unsupported SMPL-X overlay format in {manifest_path}: "
                f"{manifest.get('format')!r}"
            )
        expected_gender = str(manifest.get("gender", "neutral")).lower()
        if str(gender).lower() != expected_gender:
            raise ValueError(
                f"SMPL-X overlay {manifest.get('variant')!r} requires gender "
                f"{expected_gender!r}, got {str(gender).lower()!r}"
            )
        base_model = _resolve_from_manifest(manifest_path, manifest["base_model_dir"])

    direct_file = (
        base_model
        if base_model.is_file()
        else base_model / f"SMPLX_{str(gender).upper()}.pkl"
    )
    model_path = direct_file if direct_file.is_file() else base_model
    model = smplx.SMPLX(
        str(model_path),
        gender=str(gender).lower(),
        use_pca=False,
        flat_hand_mean=True,
        num_betas=10,
        ext="pkl",
        batch_size=int(batch_size),
    )

    if manifest is not None:
        template_path = _resolve_from_manifest(manifest_path, manifest["template_obj"])
        parameters_path = _resolve_from_manifest(manifest_path, manifest["parameters_npz"])
        template = _load_obj_vertices(template_path)
        if template.shape != tuple(model.v_template.shape):
            raise ValueError(
                f"SMPL-X overlay template has shape {template.shape}, "
                f"expected {tuple(model.v_template.shape)}: {template_path}"
            )
        pose_scale_key = str(manifest.get("pose_scale_key", "scale"))
        with np.load(parameters_path) as parameters:
            pose_scale = float(np.asarray(parameters[pose_scale_key]).reshape(-1)[0])
        if not np.isfinite(pose_scale) or pose_scale <= 0.0:
            raise ValueError(
                f"Invalid SMPL-X overlay pose scale {pose_scale}: {parameters_path}"
            )
        with torch.no_grad():
            model.v_template.copy_(torch.from_numpy(template))
            model.shapedirs.zero_()
            if hasattr(model, "expr_dirs"):
                model.expr_dirs.zero_()
            model.posedirs.mul_(pose_scale)
        model._umr_model_variant = str(manifest.get("variant", "smplx_overlay"))
        print(
            f"[SMPLXModel] applied variant={model._umr_model_variant} "
            f"template={template_path} pose_scale={pose_scale:.9f}"
        )
    return model

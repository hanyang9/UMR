from __future__ import annotations

from pathlib import Path
from typing import Any

import mujoco
import numpy as np


def bbox_ratio_from_center_spec(center_spec: Any) -> float | None:
    text = str(center_spec)
    prefix = "bbox_ratio_"
    if not text.startswith(prefix):
        return None
    ratio = float(text[len(prefix) :])
    if not 0.0 <= ratio <= 1.0:
        raise ValueError(f"Bounding-box center ratio must be in [0, 1], got {ratio}.")
    return ratio


def bbox_ratio_center_frame(vertices: np.ndarray, ratio: float):
    vertices = np.asarray(vertices, dtype=np.float64).reshape(-1, 3)
    if len(vertices) == 0:
        raise ValueError("Cannot resolve a bounding-box center from zero vertices.")
    lower = vertices.min(axis=0)
    upper = vertices.max(axis=0)
    center = 0.5 * (lower + upper)
    center[2] = lower[2] + float(ratio) * (upper[2] - lower[2])
    return center, np.eye(3, dtype=np.float64), f"bbox_ratio_{float(ratio):.6f}"


def _center_spec_parts(spec: Any) -> tuple[str | None, str]:
    if isinstance(spec, dict):
        kind = spec.get("type") or spec.get("kind")
        name = spec.get("name")
        if not name:
            raise ValueError(f"Point cloud center dict requires name: {spec!r}")
        return (None if kind is None else str(kind).lower(), str(name))
    text = str(spec)
    if ":" in text:
        kind, name = text.split(":", 1)
        kind = kind.strip().lower()
        name = name.strip()
        if kind in {"body", "geom", "joint"} and name:
            return kind, name
    return None, text


def point_cloud_center_frame(model: mujoco.MjModel, data: mujoco.MjData, center_spec: Any, xml_path: Path | None = None):
    explicit_kind, name = _center_spec_parts(center_spec)
    if not name:
        raise ValueError("Point cloud center cannot be empty.")

    if explicit_kind in {None, "body"}:
        body_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY, name)
        if body_id >= 0:
            return data.xpos[body_id].copy(), data.xmat[body_id].reshape(3, 3).copy(), f"body:{name}"

    if explicit_kind in {None, "geom"}:
        geom_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_GEOM, name)
        if geom_id >= 0:
            return data.geom_xpos[geom_id].copy(), data.geom_xmat[geom_id].reshape(3, 3).copy(), f"geom:{name}"

    if explicit_kind in {None, "joint"}:
        joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, name)
        if joint_id >= 0:
            joint_type = int(model.jnt_type[joint_id])
            if joint_type == mujoco.mjtJoint.mjJNT_FREE:
                qpos_addr = int(model.jnt_qposadr[joint_id])
                pos = np.asarray(data.qpos[qpos_addr : qpos_addr + 3], dtype=np.float64).copy()
            else:
                pos = np.asarray(data.xanchor[joint_id], dtype=np.float64).copy()
            return pos, np.eye(3, dtype=np.float64), f"joint:{name}"

    suffix = f" in {xml_path}" if xml_path is not None else ""
    allowed = "body/geom/joint" if explicit_kind is None else explicit_kind
    raise ValueError(f"Point cloud center {center_spec!r} not found as {allowed}{suffix}.")


def point_cloud_center_rotation(model: mujoco.MjModel, data: mujoco.MjData, center_spec: Any):
    _pos, rot, label = point_cloud_center_frame(model, data, center_spec)
    return rot, label

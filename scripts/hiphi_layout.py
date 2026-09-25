#!/usr/bin/env python3
"""Resolve one converted HiPHI sequence against the official dataset layout."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_hiphi_metadata(sequence_dir: Path) -> dict[str, Any]:
    sequence_dir = Path(sequence_dir).resolve()
    metadata_path = sequence_dir / "metadata.json"
    if not metadata_path.is_file():
        raise FileNotFoundError(f"HiPHI metadata not found: {metadata_path}")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if str(metadata.get("dataset", "")).lower() != "hiphi":
        raise ValueError(f"metadata.json is not a HiPHI record: {metadata_path}")
    return metadata


def find_hiphi_dataset_root(sequence_dir: Path) -> Path:
    """Find the ancestor that owns the shared object_meshes directory."""
    sequence_dir = Path(sequence_dir).resolve()
    for candidate in (sequence_dir, *sequence_dir.parents):
        if (candidate / "object_meshes").is_dir():
            return candidate
    raise FileNotFoundError(
        f"Could not find HiPHI/object_meshes above sequence directory: {sequence_dir}"
    )


def resolve_hiphi_objects(sequence_dir: Path) -> list[dict[str, str]]:
    """Resolve metadata object paths without creating or copying any assets."""
    sequence_dir = Path(sequence_dir).resolve()
    metadata = load_hiphi_metadata(sequence_dir)
    records = metadata.get("objects", [])
    if not records:
        return []
    if not isinstance(records, list):
        raise ValueError(f"HiPHI metadata field 'objects' must be a list: {sequence_dir / 'metadata.json'}")

    dataset_root = find_hiphi_dataset_root(sequence_dir)
    objects: list[dict[str, str]] = []
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise ValueError(f"HiPHI object entry {index} must be an object: {sequence_dir / 'metadata.json'}")
        object_id = str(record.get("object_id") or record.get("mesh_id") or f"object_{index}")
        mesh_id = str(record.get("mesh_id") or object_id)
        mesh_value = str(record.get("mesh_path") or f"object_meshes/{mesh_id}.obj")
        trajectory_value = str(record.get("trajectory_path") or f"object_tracks/{object_id}.csv")
        mesh_path = Path(mesh_value)
        trajectory_path = Path(trajectory_value)
        if not mesh_path.is_absolute():
            mesh_path = dataset_root / mesh_path
        if not trajectory_path.is_absolute():
            trajectory_path = sequence_dir / trajectory_path
        mesh_path = mesh_path.resolve()
        trajectory_path = trajectory_path.resolve()
        objects.append(
            {
                "name": object_id,
                "mesh_id": mesh_id,
                "xml": str(mesh_path.with_suffix(".xml")),
                "obj": str(mesh_path),
                "prop": str(trajectory_path),
            }
        )
    return objects

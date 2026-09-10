#!/usr/bin/env python3
"""Export the learned AdaPT body+racket correspondence to the compact Three.js viewer."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import smpl_surface_retarget_common as common  # noqa: E402
from humanoid_retarget_config import load_config, resolve_path, section  # noqa: E402
from humanoid_retarget_pipeline import dataset_out, slots_out  # noqa: E402


TEMPLATE_DIR = ROOT / "static/adapt_correspondence_viewer"


def correspondence_colors(points: np.ndarray) -> np.ndarray:
    minimum = points.min(axis=0, keepdims=True)
    maximum = points.max(axis=0, keepdims=True)
    normalized = (points - minimum) / np.maximum(maximum - minimum, 1e-8)
    normalized = np.clip((normalized - 0.5) * np.asarray([2.5, 1.7, 2.0]) + 0.5, 0.0, 1.0)
    normalized = np.round(normalized * 5.0) / 5.0
    return np.clip(normalized * 255.0, 0.0, 255.0).astype(np.uint8)


def grounded_and_offset(points: np.ndarray, x_offset: float) -> np.ndarray:
    output = np.asarray(points, dtype=np.float32).copy()
    output[:, 1] -= float(output[:, 1].min())
    output[:, 0] += float(x_offset)
    return output


def write_binary(path: Path, values: np.ndarray) -> str:
    np.ascontiguousarray(values).tofile(path)
    return path.name


def _face_range_mask(face_ids: np.ndarray, ranges: np.ndarray) -> np.ndarray:
    mask = np.zeros(len(face_ids), dtype=bool)
    for begin, end in np.asarray(ranges, dtype=np.int32).reshape(-1, 2):
        mask |= (face_ids >= int(begin)) & (face_ids < int(end))
    return mask


def export_adapt_correspondence_viewer(
    config: dict[str, Any], dataset_path: Path | None = None, slots_path: Path | None = None
) -> Path:
    dataset_path = Path(dataset_path or dataset_out(config))
    slots_path = Path(slots_path or slots_out(config))
    output_dir = resolve_path(
        section(config, "adapt").get("correspondence_viewer_out"),
        config,
        ROOT / "output/adapt_correspondence_viewer",
    )
    if output_dir is None:
        raise ValueError("Could not resolve AdaPT correspondence viewer output")
    with np.load(dataset_path, allow_pickle=True) as dataset, np.load(slots_path, allow_pickle=True) as slots:
        target = np.asarray(slots["target_points"], dtype=np.float32)
        reconstructed = np.asarray(slots["reconstructed_slots"], dtype=np.float32)
        source_vertices = np.asarray(dataset["mesh_vertices_0"], dtype=np.float32)
        source_faces = np.asarray(dataset["mesh_faces_0"], dtype=np.int32)
        target_vertices = np.asarray(dataset["mesh_vertices_1"], dtype=np.float32)
        target_faces = np.asarray(dataset["mesh_faces_1"], dtype=np.int32)
        source_racket_samples = int(np.asarray(dataset["source_racket_sample_count"]).item())
        target_racket_samples = int(np.asarray(dataset["robot_racket_sample_count"]).item())
        source_racket_face_start = int(np.asarray(dataset["source_racket_face_start"]).item())
        target_racket_face_ranges = np.asarray(dataset["robot_racket_face_ranges"], dtype=np.int32)

    source_binding = common.bind_points_to_mesh(reconstructed[0], source_vertices, source_faces, nearest_vertex_k=24)
    target_binding = common.bind_points_to_mesh(reconstructed[1], target_vertices, target_faces, nearest_vertex_k=24)
    bound = np.stack([source_binding["closest_points"], target_binding["closest_points"]]).astype(np.float32)
    source_racket_mask = np.asarray(source_binding["face_ids"]) >= source_racket_face_start
    target_racket_mask = _face_range_mask(np.asarray(target_binding["face_ids"]), target_racket_face_ranges)
    matched_mask = source_racket_mask & target_racket_mask

    offsets = [-3.6, -1.2, 1.2, 3.6]
    clouds = [
        grounded_and_offset(target[0], offsets[0]),
        grounded_and_offset(bound[0], offsets[1]),
        grounded_and_offset(target[1], offsets[2]),
        grounded_and_offset(bound[1], offsets[3]),
    ]
    learned_colors = correspondence_colors(bound[0])
    source_input_color = np.tile(np.asarray([[93, 157, 205]], dtype=np.uint8), (len(target[0]), 1))
    robot_input_color = np.tile(np.asarray([[135, 148, 161]], dtype=np.uint8), (len(target[1]), 1))
    colors = [source_input_color, learned_colors, robot_input_color, learned_colors]
    dim = np.tile(np.asarray([[104, 112, 122]], dtype=np.uint8), (len(learned_colors), 1))
    red = np.asarray([232, 54, 64], dtype=np.uint8)
    amber = np.asarray([255, 170, 35], dtype=np.uint8)
    source_highlight = dim.copy()
    source_highlight[source_racket_mask] = red
    target_highlight = dim.copy()
    target_highlight[source_racket_mask] = red
    target_highlight[source_racket_mask & ~target_racket_mask] = amber
    highlights = [source_input_color, source_highlight, robot_input_color, target_highlight]

    output_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(TEMPLATE_DIR / "index.html", output_dir / "index.html")
    shutil.copy2(TEMPLATE_DIR / "app.js", output_dir / "app.js")
    specs = []
    for label, kind, points, color, highlight in zip(
        ["source_input", "source_learned", "g1_input", "g1_learned"],
        ["input", "learned", "input", "learned"],
        clouds,
        colors,
        highlights,
    ):
        specs.append(
            {
                "name": label,
                "kind": kind,
                "positions": write_binary(output_dir / f"{label}_positions.f32", points.astype(np.float32)),
                "colors": write_binary(output_dir / f"{label}_colors.u8", color.astype(np.uint8)),
                "highlight_colors": write_binary(output_dir / f"{label}_highlight_colors.u8", highlight.astype(np.uint8)),
            }
        )
    line_segments = np.empty((int(source_racket_mask.sum()) * 2, 3), dtype=np.float32)
    line_segments[0::2] = clouds[1][source_racket_mask]
    line_segments[1::2] = clouds[3][source_racket_mask]
    line_path = write_binary(output_dir / "racket_correspondence_lines.f32", line_segments)
    train = section(section(config, "correspondence"), "train")
    manifest = {
        "title": "AdaPT body+racket correspondence",
        "clouds": specs,
        "racket_lines": line_path,
        "device": str(train.get("device", "auto")),
        "epochs": int(train.get("epochs", 500)),
        "source_racket_samples": source_racket_samples,
        "target_racket_samples": target_racket_samples,
        "source_racket_slots": int(source_racket_mask.sum()),
        "target_racket_slots": int(target_racket_mask.sum()),
        "racket_slot_matches": int(matched_mask.sum()),
        "racket_mapping_rate": float(matched_mask.sum() / max(source_racket_mask.sum(), 1)),
        "source_bind_error_mean": float(np.mean(source_binding["errors"])),
        "target_bind_error_mean": float(np.mean(target_binding["errors"])),
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    np.savez_compressed(
        output_dir / "racket_correspondence_analysis.npz",
        source_racket_slot_mask=source_racket_mask,
        target_racket_slot_mask=target_racket_mask,
        matched_racket_slot_mask=matched_mask,
        source_binding_face_ids=source_binding["face_ids"],
        target_binding_face_ids=target_binding["face_ids"],
        source_binding_errors=source_binding["errors"],
        target_binding_errors=target_binding["errors"],
    )
    print(
        f"[AdaPTCorrVis] exported {output_dir}; source racket slots={int(source_racket_mask.sum())}, "
        f"mapped to robot racket={int(matched_mask.sum())} "
        f"({100.0 * manifest['racket_mapping_rate']:.1f}%)"
    )
    return output_dir


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--dataset", type=Path)
    parser.add_argument("--slots", type=Path)
    args = parser.parse_args()
    export_adapt_correspondence_viewer(load_config(args.config), args.dataset, args.slots)


if __name__ == "__main__":
    main()

from __future__ import annotations

import json

import numpy as np


SELF_CONTACT_MAP_MODES = (
    "threshold_global_topk",
    "source_clearance_body_pair_topk",
)


def compute_source_self_contact_map_groups(
    source_slots,
    selected_slot_ids,
    source_slot_part_ids,
    *,
    part_name_to_id,
    non_adjacent_pair_mask,
    modes=SELF_CONTACT_MAP_MODES,
    threshold=0.10,
    max_pairs=256,
    body_topk=None,
    log_prefix="Retarget",
):
    """Build multiple self-contact maps while sharing pairwise distances."""
    modes = tuple(dict.fromkeys(str(mode) for mode in modes))
    unknown_modes = [mode for mode in modes if mode not in SELF_CONTACT_MAP_MODES]
    if unknown_modes:
        raise ValueError(f"Unknown self-contact map modes: {unknown_modes}")

    source_slots = np.asarray(source_slots, dtype=np.float32)
    selected_slot_ids = np.asarray(selected_slot_ids, dtype=np.int32).reshape(-1)
    source_slot_part_ids = np.asarray(source_slot_part_ids, dtype=np.int32).reshape(-1)
    if selected_slot_ids.size < 2:
        return {
            mode: [_empty_map(weighted=mode == "source_clearance_body_pair_topk") for _ in source_slots]
            for mode in modes
        }

    valid_pair_mask = non_adjacent_pair_mask(source_slot_part_ids, selected_slot_ids)
    upper_i, upper_j = np.where(valid_pair_mask)
    pair_slot_ids = np.stack(
        [selected_slot_ids[upper_i], selected_slot_ids[upper_j]],
        axis=1,
    ).astype(np.int32)

    threshold = float(threshold)
    max_pairs = int(max_pairs)
    threshold_maps = []
    threshold_counts = []
    clearance_maps = []
    clearance_counts = []

    body_pair_groups = []
    parsed_body_topk = {}
    default_body_topk = 1
    body_topk_by_part_id = {}
    if "source_clearance_body_pair_topk" in modes and upper_i.size > 0:
        pair_part_ids = np.stack(
            [
                source_slot_part_ids[pair_slot_ids[:, 0]],
                source_slot_part_ids[pair_slot_ids[:, 1]],
            ],
            axis=1,
        )
        pair_body_ids = np.sort(pair_part_ids, axis=1)
        unique_body_pairs = np.unique(pair_body_ids, axis=0)
        body_pair_groups = [
            (
                body_pair.astype(np.int32),
                np.flatnonzero(np.all(pair_body_ids == body_pair, axis=1)).astype(np.int32),
            )
            for body_pair in unique_body_pairs
        ]
        parsed_body_topk = _parse_body_topk(body_topk)
        default_body_topk = parsed_body_topk.get("default", parsed_body_topk.get("*", 1))
        unknown_topk_names = []
        for name, count in parsed_body_topk.items():
            if name in ("default", "*"):
                continue
            part_id = part_name_to_id.get(str(name))
            if part_id is None:
                unknown_topk_names.append(str(name))
                continue
            body_topk_by_part_id[int(part_id)] = int(count)
        if unknown_topk_names:
            print(
                f"[{log_prefix}][SelfContactMap][WARN] ignoring unknown body top-k entries: "
                f"{', '.join(sorted(unknown_topk_names))}"
            )

    for frame_points in source_slots:
        points = frame_points[selected_slot_ids]
        distances = np.linalg.norm(points[upper_i] - points[upper_j], axis=1).astype(np.float32)

        if "threshold_global_topk" in modes:
            active = np.flatnonzero(distances <= threshold)
            if active.size > 0:
                active = active[np.argsort(distances[active])]
                if max_pairs > 0 and active.size > max_pairs:
                    active = active[:max_pairs]
            threshold_maps.append(
                {
                    "slot_pairs": pair_slot_ids[active].astype(np.int32),
                    "distances": distances[active].astype(np.float32),
                }
            )
            threshold_counts.append(int(active.size))

        if "source_clearance_body_pair_topk" in modes:
            active_chunks = []
            for body_pair, group in body_pair_groups:
                part_i, part_j = int(body_pair[0]), int(body_pair[1])
                keep_per_group = max(
                    int(body_topk_by_part_id.get(part_i, default_body_topk)),
                    int(body_topk_by_part_id.get(part_j, default_body_topk)),
                )
                if keep_per_group <= 0:
                    continue
                order = np.argsort(distances[group])
                active_chunks.append(group[order[:keep_per_group]])
            active = (
                np.concatenate(active_chunks).astype(np.int32)
                if active_chunks
                else np.zeros(0, dtype=np.int32)
            )
            active_distances = distances[active].astype(np.float32)
            weights = np.ones(len(active_distances), dtype=np.float32)
            if len(active_distances) > 1:
                rank_order = np.argsort(active_distances)
                weights[rank_order] = np.linspace(
                    1.0,
                    0.1,
                    len(active_distances),
                    dtype=np.float32,
                )
            clearance_maps.append(
                {
                    "slot_pairs": pair_slot_ids[active].astype(np.int32),
                    "distances": active_distances,
                    "weights": weights,
                }
            )
            clearance_counts.append(int(active.size))

    result = {}
    if "threshold_global_topk" in modes:
        counts = np.asarray(threshold_counts, dtype=np.int32)
        print(
            f"[{log_prefix}][SelfContactMap] selected_slots={len(selected_slot_ids)}, "
            f"candidate_pairs={len(pair_slot_ids)}, threshold={threshold:.4f}, "
            f"active_pairs min={int(counts.min()) if counts.size else 0}, "
            f"mean={float(counts.mean()) if counts.size else 0.0:.2f}, "
            f"max={int(counts.max()) if counts.size else 0}, max_pairs={max_pairs}"
        )
        result["threshold_global_topk"] = threshold_maps
    if "source_clearance_body_pair_topk" in modes:
        counts = np.asarray(clearance_counts, dtype=np.int32)
        print(
            f"[{log_prefix}][SelfContactMap] mode=source_clearance_body_pair_topk, "
            f"selected_slots={len(selected_slot_ids)}, candidate_pairs={len(pair_slot_ids)}, "
            f"body_pairs={len(body_pair_groups)}, "
            f"active_pairs min={int(counts.min()) if counts.size else 0}, "
            f"mean={float(counts.mean()) if counts.size else 0.0:.2f}, "
            f"max={int(counts.max()) if counts.size else 0}, "
            f"body_topk={json.dumps(parsed_body_topk, sort_keys=True)}, "
            f"default_body_topk={int(default_body_topk)}, "
            "rank_weight_range=[1.0000, 0.1000]"
        )
        result["source_clearance_body_pair_topk"] = clearance_maps
    return result


def _empty_map(*, weighted):
    result = {
        "slot_pairs": np.zeros((0, 2), dtype=np.int32),
        "distances": np.zeros(0, dtype=np.float32),
    }
    if weighted:
        result["weights"] = np.zeros(0, dtype=np.float32)
    return result


def _parse_body_topk(value):
    if value is None:
        return {}
    if isinstance(value, str):
        value = json.loads(value)
    if not isinstance(value, dict):
        raise ValueError("Body top-k must be a mapping or JSON object.")
    parsed = {}
    for name, count in value.items():
        count = int(count)
        if count < 0:
            raise ValueError(f"Body top-k for {name!r} must be >= 0, got {count}")
        parsed[str(name)] = count
    return parsed

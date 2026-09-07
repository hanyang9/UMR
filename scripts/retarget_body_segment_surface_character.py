from __future__ import annotations

import numpy as np


CHARACTER_BODY_SEGMENT_SCHEMA = "mimickit_humanoid_body_v1"
CHARACTER_SEGMENT_NAMES = (
    "pelvis",
    "torso",
    "head",
    "left_upper_arm",
    "left_lower_arm",
    "left_hand",
    "right_upper_arm",
    "right_lower_arm",
    "right_hand",
    "left_thigh",
    "left_shin",
    "left_foot",
    "right_thigh",
    "right_shin",
    "right_foot",
)
CHARACTER_SEGMENT_IDS = {
    name: idx + 1
    for idx, name in enumerate(CHARACTER_SEGMENT_NAMES)
}
CHARACTER_SEGMENT_NAMES_BY_ID = {
    part_id: name
    for name, part_id in CHARACTER_SEGMENT_IDS.items()
}

DEFAULT_CHARACTER_SURFACE_COST_CONFIG = {
    "pelvis": {"sample_slots": 24, "point_cost": 10.0, "normal_cost": 0.0},
    "torso": {"sample_slots": 42, "point_cost": 10.0, "normal_cost": 0.0},
    "head": {"sample_slots": 16, "point_cost": 10.0, "normal_cost": 0.0},
    "left_upper_arm": {"sample_slots": 12, "point_cost": 10.0, "normal_cost": 0.0},
    "left_lower_arm": {"sample_slots": 12, "point_cost": 10.0, "normal_cost": 0.0},
    "left_hand": {"sample_slots": 8, "point_cost": 10.0, "normal_cost": 0.0},
    "right_upper_arm": {"sample_slots": 12, "point_cost": 10.0, "normal_cost": 0.0},
    "right_lower_arm": {"sample_slots": 12, "point_cost": 10.0, "normal_cost": 0.0},
    "right_hand": {"sample_slots": 8, "point_cost": 10.0, "normal_cost": 0.0},
    "left_thigh": {"sample_slots": 20, "point_cost": 10.0, "normal_cost": 0.0},
    "left_shin": {"sample_slots": 15, "point_cost": 10.0, "normal_cost": 0.0},
    "left_foot": {"sample_slots": 20, "point_cost": 10.0, "normal_cost": 0.0},
    "right_thigh": {"sample_slots": 20, "point_cost": 10.0, "normal_cost": 0.0},
    "right_shin": {"sample_slots": 15, "point_cost": 10.0, "normal_cost": 0.0},
    "right_foot": {"sample_slots": 20, "point_cost": 10.0, "normal_cost": 0.0},
}

CHARACTER_ADJACENT_SEGMENT_PAIRS = {
    ("pelvis", "torso"),
    ("torso", "head"),
    ("torso", "left_upper_arm"),
    ("torso", "right_upper_arm"),
    ("left_upper_arm", "left_lower_arm"),
    ("left_lower_arm", "left_hand"),
    ("right_upper_arm", "right_lower_arm"),
    ("right_lower_arm", "right_hand"),
    ("pelvis", "left_thigh"),
    ("left_thigh", "left_shin"),
    ("left_shin", "left_foot"),
    ("pelvis", "right_thigh"),
    ("right_thigh", "right_shin"),
    ("right_shin", "right_foot"),
}

CHARACTER_SURFACE_COST_CONFIG = dict(DEFAULT_CHARACTER_SURFACE_COST_CONFIG)


def normalize_vectors(vectors):
    vectors = np.asarray(vectors, dtype=np.float64)
    return vectors / np.maximum(np.linalg.norm(vectors, axis=-1, keepdims=True), 1e-12)


def character_body_segment_schema():
    return CHARACTER_BODY_SEGMENT_SCHEMA


def character_body_segment_part_ids():
    return dict(CHARACTER_SEGMENT_IDS)


def _deep_get(mapping, dotted, default=None):
    value = mapping
    for key in dotted.split("."):
        if not isinstance(value, dict) or key not in value:
            return default
        value = value[key]
    return value


def _coerce_cost_config(config):
    out = {}
    for name, values in config.items():
        out[str(name)] = {
            "sample_slots": int(values.get("sample_slots", 0)),
            "point_cost": float(values.get("point_cost", 0.0)),
            "normal_cost": float(values.get("normal_cost", 0.0)),
        }
    return out


def configure_character_body_segment_surface(config=None, cost_config=None):
    global CHARACTER_SURFACE_COST_CONFIG

    segment_cfg = _deep_get(config or {}, "solver.character_body_segment", {}) or {}
    selected_schema = str(segment_cfg.get("schema", CHARACTER_BODY_SEGMENT_SCHEMA))
    if selected_schema != CHARACTER_BODY_SEGMENT_SCHEMA:
        raise ValueError(f"Unknown character body segment schema: {selected_schema!r}")

    CHARACTER_SURFACE_COST_CONFIG = dict(DEFAULT_CHARACTER_SURFACE_COST_CONFIG)
    override_cost = cost_config if cost_config is not None else segment_cfg.get("cost_config")
    if override_cost is not None:
        CHARACTER_SURFACE_COST_CONFIG.update(_coerce_cost_config(override_cost))
    _validate_character_segment_config()
    return {
        "schema": CHARACTER_BODY_SEGMENT_SCHEMA,
        "part_ids": character_body_segment_part_ids(),
        "cost_config": dict(CHARACTER_SURFACE_COST_CONFIG),
    }


def _validate_character_segment_config():
    unknown = sorted(set(CHARACTER_SURFACE_COST_CONFIG) - set(CHARACTER_SEGMENT_IDS))
    if unknown:
        raise KeyError(f"Unknown character segment names in cost_config: {unknown}")


def character_segment_id(label: str) -> int:
    label = str(label).lower()
    for name in CHARACTER_SEGMENT_NAMES:
        if name in label:
            return int(CHARACTER_SEGMENT_IDS[name])
    if "lower_arm" in label or "forearm" in label:
        side = "left" if "left" in label else "right" if "right" in label else ""
        if side:
            return int(CHARACTER_SEGMENT_IDS[f"{side}_lower_arm"])
    if "upper_arm" in label:
        side = "left" if "left" in label else "right" if "right" in label else ""
        if side:
            return int(CHARACTER_SEGMENT_IDS[f"{side}_upper_arm"])
    if "thigh" in label or "hip" in label:
        side = "left" if "left" in label else "right" if "right" in label else ""
        if side:
            return int(CHARACTER_SEGMENT_IDS[f"{side}_thigh"])
    if "shin" in label or "leg" in label:
        side = "left" if "left" in label else "right" if "right" in label else ""
        if side:
            return int(CHARACTER_SEGMENT_IDS[f"{side}_shin"])
    if "foot" in label:
        side = "left" if "left" in label else "right" if "right" in label else ""
        if side:
            return int(CHARACTER_SEGMENT_IDS[f"{side}_foot"])
    if "hand" in label:
        side = "left" if "left" in label else "right" if "right" in label else ""
        if side:
            return int(CHARACTER_SEGMENT_IDS[f"{side}_hand"])
    if "pelvis" in label or "waist" in label:
        return int(CHARACTER_SEGMENT_IDS["pelvis"])
    if "head" in label or "neck" in label:
        return int(CHARACTER_SEGMENT_IDS["head"])
    return int(CHARACTER_SEGMENT_IDS["torso"])


def character_body_segment_slot_groups(slot_part_ids):
    slot_part_ids = np.asarray(slot_part_ids, dtype=np.int32).reshape(-1)
    return {
        name: np.flatnonzero(slot_part_ids == int(part_id)).astype(np.int32)
        for name, part_id in CHARACTER_SEGMENT_IDS.items()
    }


def character_segment_sample_counts():
    _validate_character_segment_config()
    return {
        name: int(CHARACTER_SURFACE_COST_CONFIG.get(name, {}).get("sample_slots", 0))
        for name in CHARACTER_SEGMENT_IDS
    }


def character_segment_cost_values(cost_name):
    _validate_character_segment_config()
    return {
        name: float(CHARACTER_SURFACE_COST_CONFIG.get(name, {}).get(cost_name, 0.0))
        for name in CHARACTER_SEGMENT_IDS
    }


def sample_character_segment_slots(segment_groups, sample_counts, seed, log_prefix="CharacterRetarget"):
    rng = np.random.default_rng(int(seed))
    sampled = {}
    selected = []
    for name in CHARACTER_SEGMENT_IDS:
        candidates = np.asarray(segment_groups.get(name, []), dtype=np.int32).reshape(-1)
        count = int(sample_counts.get(name, 0))
        if candidates.size == 0 or count <= 0:
            slot_ids = np.zeros(0, dtype=np.int32)
        elif count >= len(candidates):
            slot_ids = np.sort(candidates).astype(np.int32)
        else:
            slot_ids = np.sort(rng.choice(candidates, size=count, replace=False)).astype(np.int32)
        sampled[name] = slot_ids
        selected.append(slot_ids)
    selected = np.unique(np.concatenate(selected)).astype(np.int32) if selected else np.zeros(0, dtype=np.int32)
    preview = ", ".join(f"{name}={len(sampled[name])}/{sample_counts[name]}" for name in CHARACTER_SEGMENT_IDS)
    print(f"[{log_prefix}][CharacterBodySegment] selected slots: total={len(selected)}, {preview}")
    return selected, sampled


def character_surface_slot_costs_from_segments(num_slots, slot_part_ids, cost_name, label, log_prefix="CharacterRetarget"):
    costs = np.zeros(int(num_slots), dtype=np.float64)
    slot_part_ids = np.asarray(slot_part_ids, dtype=np.int32).reshape(-1)
    if len(slot_part_ids) != int(num_slots):
        raise ValueError(f"slot_part_ids length {len(slot_part_ids)} does not match num_slots={num_slots}")
    values = character_segment_cost_values(cost_name)
    for name, slot_ids in character_body_segment_slot_groups(slot_part_ids).items():
        costs[slot_ids] = values[name]
    active = np.flatnonzero(costs > 0.0)
    config_preview = ", ".join(f"{name}={values[name]:.4f}" for name in CHARACTER_SEGMENT_IDS)
    print(
        f"[{log_prefix}][{label}] character segment costs {config_preview}; "
        f"active_slots={len(active)}/{num_slots}"
    )
    return costs


def non_adjacent_character_segment_pair_mask(slot_part_ids, slot_ids):
    slot_ids = np.asarray(slot_ids, dtype=np.int32).reshape(-1)
    part_ids = np.asarray(slot_part_ids, dtype=np.int32).reshape(-1)
    adjacent = {frozenset((a, b)) for a, b in CHARACTER_ADJACENT_SEGMENT_PAIRS}
    pair_mask = np.zeros((len(slot_ids), len(slot_ids)), dtype=bool)
    for row, slot_i in enumerate(slot_ids):
        name_i = CHARACTER_SEGMENT_NAMES_BY_ID.get(int(part_ids[int(slot_i)]), "")
        for col in range(row + 1, len(slot_ids)):
            slot_j = int(slot_ids[col])
            name_j = CHARACTER_SEGMENT_NAMES_BY_ID.get(int(part_ids[slot_j]), "")
            if not name_i or not name_j or name_i == name_j:
                continue
            if frozenset((name_i, name_j)) in adjacent:
                continue
            pair_mask[row, col] = True
    return pair_mask


def compute_character_source_self_contact_maps(
    source_slots,
    selected_slot_ids,
    source_slot_part_ids,
    threshold=0.10,
    max_pairs=256,
    log_prefix="CharacterRetarget",
):
    selected_slot_ids = np.asarray(selected_slot_ids, dtype=np.int32).reshape(-1)
    if selected_slot_ids.size < 2:
        empty = {"slot_pairs": np.zeros((0, 2), dtype=np.int32), "distances": np.zeros(0, dtype=np.float32)}
        return [empty for _ in range(len(source_slots))]

    threshold = float(threshold)
    max_pairs = int(max_pairs)
    valid_pair_mask = non_adjacent_character_segment_pair_mask(source_slot_part_ids, selected_slot_ids)
    upper_i, upper_j = np.where(valid_pair_mask)
    pair_slot_ids = np.stack([selected_slot_ids[upper_i], selected_slot_ids[upper_j]], axis=1).astype(np.int32)
    maps = []
    counts = []
    for frame_points in np.asarray(source_slots, dtype=np.float32):
        points = frame_points[selected_slot_ids]
        deltas = points[upper_i] - points[upper_j]
        distances = np.linalg.norm(deltas, axis=1).astype(np.float32)
        active = np.flatnonzero(distances <= threshold)
        if active.size > 0:
            active = active[np.argsort(distances[active])]
            if max_pairs > 0 and active.size > max_pairs:
                active = active[:max_pairs]
        maps.append({"slot_pairs": pair_slot_ids[active].astype(np.int32), "distances": distances[active].astype(np.float32)})
        counts.append(int(active.size))

    counts_arr = np.asarray(counts, dtype=np.int32)
    count_min = int(counts_arr.min()) if counts_arr.size else 0
    count_max = int(counts_arr.max()) if counts_arr.size else 0
    count_mean = float(counts_arr.mean()) if counts_arr.size else 0.0
    print(
        f"[{log_prefix}][CharacterSelfContactMap] selected_slots={len(selected_slot_ids)}, "
        f"candidate_pairs={len(pair_slot_ids)}, threshold={threshold:.4f}, "
        f"active_pairs min={count_min}, mean={count_mean:.2f}, max={count_max}, max_pairs={max_pairs}"
    )
    return maps


def pack_self_contact_maps(self_contact_maps):
    counts = np.asarray([len(item["distances"]) for item in self_contact_maps], dtype=np.int32)
    max_count = int(counts.max(initial=0))
    pair_ids = np.full((len(self_contact_maps), max_count, 2), -1, dtype=np.int32)
    distances = np.zeros((len(self_contact_maps), max_count), dtype=np.float32)
    for frame_idx, item in enumerate(self_contact_maps):
        count = int(counts[frame_idx])
        if count <= 0:
            continue
        pair_ids[frame_idx, :count] = item["slot_pairs"]
        distances[frame_idx, :count] = item["distances"]
    return pair_ids, distances, counts

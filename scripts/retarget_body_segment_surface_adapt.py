"""Standard 19-part body segmentation plus the AdaPT rigid-racket region."""

from __future__ import annotations

import retarget_body_segment_surface as _base


RACKET_PART_ID = 20
RACKET_COST = {"sample_slots": 50, "point_cost": 0.0, "normal_cost": 5.0}


def _install_racket_segment() -> None:
    _base.BODY_SEGMENT_PART_IDS["racket"] = RACKET_PART_ID
    _base.BODY_SEGMENT_PART_NAMES[RACKET_PART_ID] = "racket"
    _base.BODY_SEGMENT_SURFACE_COST_CONFIG["racket"] = dict(RACKET_COST)


def configure_body_segment_surface(config=None, schema=None, upper_arm_split=None, cost_config=None):
    info = _base.configure_body_segment_surface(
        config=config,
        schema=schema,
        upper_arm_split=upper_arm_split,
        cost_config=cost_config,
    )
    _install_racket_segment()
    info["schema"] = f"{info['schema']}+racket_v1"
    info["part_ids"] = dict(_base.SMPLX_PART_IDS)
    info["cost_config"] = dict(_base.BODY_SEGMENT_SURFACE_COST_CONFIG)
    return info


def body_segment_schema():
    return f"{_base.body_segment_schema()}+racket_v1"


_install_racket_segment()
SMPLX_PART_IDS = _base.SMPLX_PART_IDS

# These functions retain the base module's globals, extended above.
bind_source_slots_with_normals = _base.bind_source_slots_with_normals
body_segment_slot_groups = _base.body_segment_slot_groups
compute_source_clearance_self_contact_maps = _base.compute_source_clearance_self_contact_maps
compute_source_self_contact_map_groups = _base.compute_source_self_contact_map_groups
compute_source_self_contact_maps = _base.compute_source_self_contact_maps
compute_tpose_surface_normal_offsets = _base.compute_tpose_surface_normal_offsets
pack_self_contact_map_weights = _base.pack_self_contact_map_weights
pack_self_contact_maps = _base.pack_self_contact_maps
parse_body_topk_config = _base.parse_body_topk_config
sample_segment_slots = _base.sample_segment_slots
segment_cost_values = _base.segment_cost_values
segment_sample_counts = _base.segment_sample_counts
surface_slot_costs_from_segments = _base.surface_slot_costs_from_segments
transport_tpose_robot_normals = _base.transport_tpose_robot_normals

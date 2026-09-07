#!/usr/bin/env python3
"""Run build correspondence, train slots, retarget, and visualize from one robot config."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from humanoid_retarget_config import list_of_args, load_config, resolve_path, robot_config, section  # noqa: E402
import soma_source  # noqa: E402


PYTHON = sys.executable
RETARGET_VISUALIZATION_FIELDS = frozenset(
    {
        "qpos",
        "fps",
        "frame_ids",
        "robot_xml",
        "robot_name",
        "robot_joint_names",
        "source_data",
        "source_sequence_key",
        "source_format",
        "smpl_scale",
        "ground_z",
        "zero_source_finger_pose",
        "source_object_dir",
        "noitom_output_up",
        "noitom_convert_y_up",
        "noitom_ground_align",
        "noitom_floor_y",
        "noitom_ground_offset",
    }
)
REQUIRED_RETARGET_OUTPUT_FIELDS = frozenset(
    {"qpos", "fps", "frame_ids", "robot_xml", "source_data", "source_sequence_key", "source_format"}
)


def retarget_result_has_final_qpos_only(data) -> bool:
    fields = set(data.files if hasattr(data, "files") else data)
    if not REQUIRED_RETARGET_OUTPUT_FIELDS.issubset(fields) or not fields.issubset(RETARGET_VISUALIZATION_FIELDS):
        return False
    try:
        qpos = np.asarray(data["qpos"])
        frame_ids = np.asarray(data["frame_ids"]).reshape(-1)
        if qpos.ndim != 2 or qpos.shape[0] == 0 or len(frame_ids) != qpos.shape[0]:
            return False
        return True
    except (KeyError, TypeError, ValueError):
        return False


VIEW_FALSE_FLAGS = {
    "show_source_slots": "--no-show-source-slots",
    "show_source_object_points": "--no-show-source-object-points",
    "show_source_objects": "--no-show-source-objects",
    "show_robot_slots": "--no-show-robot-slots",
    "show_robot_object_points": "--no-show-robot-object-points",
    "show_robot_objects": "--no-show-robot-objects",
    "show_ground_contact_map": "--no-show-ground-contact-map",
    "show_contact_links": "--no-show-contact-links",
}
RETARGET_SOLVER_ARGS = (
    "ground_contact_anchor_cost",
    "ground_penetration_hard_constraint",
    "ground_penetration_hard_constraint_mode",
    "ground_penetration_margin",
    "ground_penetration_hard_slack",
    "ground_penetration_hard_slack_cost",
    "ground_penetration_threshold",
    "ground_penetration_max_points",
    "object_contact_map_cost",
    "object_contact_map_threshold",
    "object_contact_map_snap_threshold",
    "object_contact_map_max_points",
    "object_contact_map_samples",
    "retarget_object_size",
    "robot_object_penetration_soft_cost",
    "robot_object_hard_constraint",
    "robot_object_margin",
    "robot_object_hard_slack",
    "robot_object_hard_slack_cost",
    "robot_object_threshold",
    "robot_object_max_pairs",
    "robot_self_penetration_hard_constraint",
    "robot_self_penetration_margin",
    "robot_self_penetration_hard_slack",
    "robot_self_penetration_hard_slack_cost",
    "step_limit_mode",
    "max_dq",
    "global_step_size",
    "root_step_limit_mode",
    "root_max_translation_dq",
    "root_max_rotation_dq",
    "root_global_translation_step_size",
    "root_global_rotation_step_size",
    "trajectory_filter_mode",
    "trajectory_filter_data_cost",
    "trajectory_filter_velocity_cost",
    "trajectory_filter_acceleration_cost",
    "trajectory_filter_jerk_cost",
    "trajectory_filter_root_translation",
    "trajectory_filter_anchor_start_frames",
    "trajectory_filter_anchor_end_frames",
    "trajectory_warm_start_mode",
    "trajectory_warm_start_bidirectional_continuity_cost",
    "trajectory_warm_start_bidirectional_switch_cost",
)


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument(
        "--defaults",
        type=Path,
        default=None,
        help="Optional motion-source defaults merged before the target robot config.",
    )
    parser.add_argument(
        "--stage",
        choices=["all", "build", "train", "retarget", "view"],
        default="all",
        help="Stage to run. all runs build, train, retarget, then optional view.",
    )
    parser.add_argument("--force-build", action="store_true")
    parser.add_argument("--force-train", action="store_true")
    parser.add_argument("--force-retarget", action="store_true")
    parser.add_argument("--skip-view", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="Print commands/actions without running them.")
    return parser.parse_args()


def _clean_config(value):
    if isinstance(value, dict):
        return {str(key): _clean_config(item) for key, item in value.items() if not str(key).startswith("_")}
    if isinstance(value, list):
        return [_clean_config(item) for item in value]
    if isinstance(value, tuple):
        return [_clean_config(item) for item in value]
    if isinstance(value, Path):
        return str(value)
    return value


def _deep_merge_config(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if key in {"extends", "_config_path", "_config_dir"}:
            continue
        current = merged.get(key)
        if isinstance(current, dict) and isinstance(value, dict):
            merged[key] = _deep_merge_config(current, value)
        else:
            merged[key] = value
    return merged


_MISSING = object()


def _nested_config_value(config: dict[str, Any], keys: tuple[str, ...]):
    value: Any = config
    for key in keys:
        if not isinstance(value, dict) or key not in value:
            return _MISSING
        value = value[key]
    return value


def _set_nested_config_value(config: dict[str, Any], keys: tuple[str, ...], value: Any) -> None:
    target = config
    for key in keys[:-1]:
        target = target.setdefault(key, {})
    target[keys[-1]] = value


def _absolutize_merged_config_paths(
    merged: dict[str, Any],
    defaults: dict[str, Any],
    override: dict[str, Any],
) -> None:
    path_fields = (
        ("smplx_model_dir",),
        ("soma_usd_path",),
        ("smpl_template", "soma_usd_path"),
        ("motion", "data"),
        ("correspondence", "slots"),
        ("correspondence", "dataset", "out"),
        ("correspondence", "train", "out_dir"),
        ("retarget", "out"),
        ("robot", "xml"),
    )
    for keys in path_fields:
        raw = _nested_config_value(merged, keys)
        if raw is _MISSING or raw is None:
            continue
        owner = override if _nested_config_value(override, keys) is not _MISSING else defaults
        resolved = resolve_path(raw, owner)
        if resolved is not None:
            _set_nested_config_value(merged, keys, str(resolved))

    specs = _nested_config_value(merged, ("correspondence", "dataset", "smpl_models"))
    if isinstance(specs, list):
        owner = (
            override
            if _nested_config_value(override, ("correspondence", "dataset", "smpl_models")) is not _MISSING
            else defaults
        )
        for spec in specs:
            if isinstance(spec, dict) and spec.get("dir") is not None:
                resolved = resolve_path(spec["dir"], owner)
                if resolved is not None:
                    spec["dir"] = str(resolved)


def load_pipeline_config(config_path: Path, defaults_path: Path | None = None) -> dict[str, Any]:
    if defaults_path is None:
        return load_config(config_path)

    defaults = load_config(Path(defaults_path), use_default_extends=False)
    override = load_config(Path(config_path), use_default_extends=False)
    merged = _deep_merge_config(_clean_config(defaults), _clean_config(override))
    _absolutize_merged_config_paths(merged, defaults, override)
    merged["_source_config_path"] = str(Path(override["_config_path"]).resolve())
    merged["_defaults_config_path"] = str(Path(defaults["_config_path"]).resolve())
    merged["_config_path"] = str(Path(override["_config_path"]).resolve())
    merged["_config_dir"] = str(Path(override["_config_dir"]).resolve())
    return merged


def write_runtime_config(config: dict[str, Any], directory: Path) -> dict[str, Any]:
    runtime_path = Path(directory) / "humanoid_retarget_runtime_config.json"
    runtime_path.write_text(json.dumps(_clean_config(config), indent=2, sort_keys=True))
    config["_config_path"] = str(runtime_path)
    config["_config_dir"] = str(runtime_path.parent)
    return config


def bool_value(value, default=False):
    if value is None:
        return default
    return bool(value)


def mimic_qpos_for_build(robot: dict[str, Any]) -> dict[str, tuple[str, float]]:
    mimic = robot.get("mimic_qpos", {}) or {}
    converted = {}
    for joint_name, spec in mimic.items():
        if isinstance(spec, dict):
            source = spec.get("source")
            multiplier = spec.get("multiplier", 1.0)
            if source:
                converted[str(joint_name)] = (str(source), float(multiplier))
        elif isinstance(spec, (list, tuple)) and len(spec) == 2:
            converted[str(joint_name)] = (str(spec[0]), float(spec[1]))
    return converted


def parse_number(value):
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"inf", "+inf", "infinity", "+infinity"}:
            return np.inf
        if lowered in {"-inf", "-infinity"}:
            return -np.inf
    return float(value)


def config_dof_max_dq_box(config: dict[str, Any]) -> dict[str, float]:
    robot = robot_config(config)
    values = robot.get("dof_max_dq_box", {})
    if values is None:
        return {}
    if not isinstance(values, dict):
        raise ValueError("robot.dof_max_dq_box must be an object mapping joint name to max dq.")
    parsed = {}
    for name, value in values.items():
        max_dq = abs(float(parse_number(value)))
        if not np.isfinite(max_dq) or max_dq <= 0.0:
            raise ValueError(f"robot.dof_max_dq_box[{name!r}] must be a positive finite number.")
        parsed[str(name)] = max_dq
    return parsed


def config_joint_values(config: dict[str, Any], key: str) -> dict[str, float]:
    robot = robot_config(config)
    values = robot.get(key, {})
    if values is None:
        return {}
    if not isinstance(values, dict):
        raise ValueError(f"robot.{key} must be an object mapping joint name to value.")
    return {str(name): parse_number(value) for name, value in values.items()}


def run_command(cmd: list[str], dry_run=False):
    print("[HumanoidPipeline] " + " ".join(str(part) for part in cmd))
    if dry_run:
        return
    subprocess.run(cmd, cwd=ROOT, check=True)


def dataset_out(config: dict[str, Any]) -> Path:
    corr = section(config, "correspondence")
    dataset = section(corr, "dataset")
    robot = robot_config(config)
    return resolve_path(
        dataset.get("out"),
        config,
        ROOT / f"data/correspondence_{robot['name']}{correspondence_cache_suffix(config)}.npz",
    )


def train_out_dir(config: dict[str, Any]) -> Path:
    corr = section(config, "correspondence")
    train = section(corr, "train")
    robot = robot_config(config)
    return resolve_path(
        train.get("out_dir"),
        config,
        ROOT / f"output/correspondence_{robot['name']}{correspondence_cache_suffix(config)}",
    )


def slots_out(config: dict[str, Any]) -> Path:
    corr = section(config, "correspondence")
    if corr.get("slots"):
        return resolve_path(corr.get("slots"), config)
    return train_out_dir(config) / "correspondence_slots_final.npz"


def retarget_source_type(config: dict[str, Any], sequence) -> str:
    template_type = str(section(config, "smpl_template").get("type", "smplx")).lower()
    source_format = "" if sequence is None else str(sequence.get("source_format", "")).lower()
    if template_type == "soma" or source_format.startswith("soma"):
        return "soma"
    if template_type == "nr_fbx" or source_format.startswith("nr_fbx"):
        return "nr"
    return "smpl" if template_type == "smpl" else "smplx"


def retarget_sequence_name(config: dict[str, Any]) -> tuple[str, str]:
    motion = section(config, "motion")
    seq_key, sequence = _motion_sequence_for_template(config)
    if not seq_key:
        seq_key = str(motion.get("seq_key", "")).strip()
    if not seq_key and motion.get("data"):
        seq_key = Path(str(motion["data"])).stem
    if not seq_key:
        seq_key = f"sequence_{int(motion.get('seq_index', 0))}"
    return safe_cache_component(seq_key), retarget_source_type(config, sequence)


def retarget_out(config: dict[str, Any]) -> Path:
    retarget = section(config, "retarget")
    robot = robot_config(config)
    sequence_name, source_type = retarget_sequence_name(config)
    robot_name = safe_cache_component(str(robot["name"]))
    default = ROOT / "output" / f"{robot_name}_retarget" / f"{sequence_name}_{source_type}_{robot_name}.npz"
    return resolve_path(retarget.get("out"), config, default)


def expected_smpl_slot_name(config: dict[str, Any]) -> str:
    configured = str(section(config, "correspondence").get("smpl_name", "auto"))
    return str(smpl_template_config(config)["name"]) if configured == "auto" else configured


def expected_correspondence_training_mode(config: dict[str, Any]) -> str:
    train = section(section(config, "correspondence"), "train")
    fixed_template = bool_value(train.get("fixed_template"), False)
    return "robot2smpl_only" if fixed_template or int(train.get("batch_size", 16)) == 1 else "all_samples"


def correspondence_dataset_compatible(dataset_path: Path, config: dict[str, Any], quiet=False) -> bool:
    dataset_path = Path(dataset_path)
    if not dataset_path.exists():
        return False
    try:
        with np.load(dataset_path, allow_pickle=True) as data:
            names = [str(name) for name in np.asarray(data["names"]).reshape(-1).tolist()]
    except Exception as exc:
        if not quiet:
            print(f"[HumanoidPipeline][WARN] cannot read correspondence dataset {dataset_path}: {exc}")
        return False

    robot = robot_config(config)
    robot_names = {str(robot.get("slot_name", robot.get("name"))), str(robot.get("name"))}
    expected_smpl = expected_smpl_slot_name(config)
    missing = []
    if expected_smpl not in names:
        missing.append(f"SMPL template {expected_smpl!r}")
    if not any(name in names for name in robot_names):
        missing.append(f"robot sample one of {sorted(robot_names)!r}")
    if missing:
        if not quiet:
            print(
                f"[HumanoidPipeline][WARN] correspondence dataset mismatch: {dataset_path} "
                f"names={names}; missing {', '.join(missing)}"
            )
        return False
    return True


def correspondence_slots_compatible(slots_path: Path, config: dict[str, Any], quiet=False) -> bool:
    slots_path = Path(slots_path)
    if not slots_path.exists():
        return False
    try:
        slots = np.load(slots_path, allow_pickle=True)
        names = [str(name) for name in np.asarray(slots["names"]).reshape(-1).tolist()]
    except Exception as exc:
        if not quiet:
            print(f"[HumanoidPipeline][WARN] cannot read correspondence slots {slots_path}: {exc}")
        return False

    robot = robot_config(config)
    robot_names = {str(robot.get("slot_name", robot.get("name"))), str(robot.get("name"))}
    expected_smpl = expected_smpl_slot_name(config)
    missing = []
    if expected_smpl not in names:
        missing.append(f"SMPL template {expected_smpl!r}")
    if not any(name in names for name in robot_names):
        missing.append(f"robot sample one of {sorted(robot_names)!r}")
    if missing:
        if not quiet:
            print(
                f"[HumanoidPipeline][WARN] correspondence slots mismatch: {slots_path} "
                f"names={names}; missing {', '.join(missing)}"
            )
        return False
    expected_training_mode = expected_correspondence_training_mode(config)
    if "training_mode" in slots:
        saved_training_mode = str(np.asarray(slots["training_mode"]).reshape(-1)[0])
        if saved_training_mode != expected_training_mode:
            if not quiet:
                print(
                    f"[HumanoidPipeline][WARN] correspondence slots training mode mismatch: {slots_path} "
                    f"saved={saved_training_mode!r} expected={expected_training_mode!r}"
                )
            return False
    elif expected_training_mode == "robot2smpl_only":
        if not quiet:
            print(
                f"[HumanoidPipeline][WARN] correspondence slots missing training_mode: {slots_path}; "
                f"expected {expected_training_mode!r}"
            )
        return False
    return True


def retarget_result_compatible(result_path: Path, config: dict[str, Any], quiet=False) -> bool:
    result_path = Path(result_path)
    if not result_path.exists():
        return False

    motion = section(config, "motion")
    expected_source_path = resolve_path(motion.get("data"), config)
    expected_source = "" if expected_source_path is None else str(expected_source_path)
    expected_sequence_key, expected_sequence = _motion_sequence_for_template(config)
    expected_source_format = "" if expected_sequence is None else str(expected_sequence.get("source_format", ""))
    expected_robot = str(robot_config(config).get("name", ""))

    try:
        with np.load(result_path, allow_pickle=True) as data:
            if not retarget_result_has_final_qpos_only(data):
                raise ValueError("result contains non-visualization fields or has an invalid qpos")
            saved_source = str(np.asarray(data["source_data"]).item())
            saved_sequence_key = str(np.asarray(data["source_sequence_key"]).item())
            saved_source_format = str(np.asarray(data["source_format"]).item())
            saved_robot = str(np.asarray(data["robot_name"]).item()) if "robot_name" in data else ""
    except Exception as exc:
        if not quiet:
            print(f"[HumanoidPipeline][WARN] cannot reuse retarget result {result_path}: {exc}")
        return False

    source_matches = bool(saved_source) and bool(expected_source)
    if source_matches:
        source_matches = Path(saved_source).resolve() == Path(expected_source).resolve()
    compatible = (
        source_matches
        and saved_sequence_key == str(expected_sequence_key)
        and (not expected_source_format or saved_source_format == expected_source_format)
        and (not expected_robot or not saved_robot or saved_robot == expected_robot)
    )
    if not compatible and not quiet:
        print(
            f"[HumanoidPipeline][WARN] retarget result source/robot mismatch: {result_path} "
            f"saved_source={saved_source!r} expected_source={expected_source!r} "
            f"saved_sequence={saved_sequence_key!r} expected_sequence={expected_sequence_key!r} "
            f"saved_format={saved_source_format!r} expected_format={expected_source_format!r} "
            f"saved_robot={saved_robot!r} expected_robot={expected_robot!r}"
        )
    return compatible


def smpl_model_specs(config: dict[str, Any]):
    corr = section(config, "correspondence")
    dataset = section(corr, "dataset")
    specs = dataset.get("smpl_models")
    if specs is None:
        return [
            {
                "type": "smplx",
                "dir": config.get("smplx_model_dir", "smpl"),
                "genders": ["neutral"],
            }
        ]
    if not isinstance(specs, list):
        raise ValueError("correspondence.dataset.smpl_models must be a list.")
    return specs


def _as_betas(value: Any) -> np.ndarray:
    betas = np.asarray(value if value is not None else [], dtype=np.float32).reshape(-1)[:10]
    return np.pad(betas, (0, max(0, 10 - len(betas))))[:10].astype(np.float32)


def smpl_template_betas_hash(betas: np.ndarray | None) -> str | None:
    if betas is None:
        return None
    values = _as_betas(betas)
    return hashlib.sha1(values.tobytes()).hexdigest()[:10]


def smpl_template_default_name(model_type: str, gender: str, betas: np.ndarray | None) -> str:
    if str(model_type).lower() == "soma":
        return "soma"
    base = f"{str(model_type)}_{str(gender).lower()}"
    betas_hash = smpl_template_betas_hash(betas)
    return base if betas_hash is None else f"{base}_betas_{betas_hash}"


def safe_cache_component(value: str) -> str:
    text = str(value)
    return "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in text)


def soma_template_prefers_tpose(template_cfg: dict[str, Any] | None) -> bool:
    if template_cfg is None:
        return False
    if str(template_cfg.get("type", "")).lower() != "soma":
        return False
    name = str(template_cfg.get("name", ""))
    return name.startswith("soma_A")


def effective_robot_sample_pose(config: dict[str, Any], template_cfg: dict[str, Any] | None = None) -> str:
    robot = robot_config(config)
    if template_cfg is None:
        template_cfg = smpl_template_config(config)
    if str(template_cfg.get("type", "")).lower() == "soma":
        return "tpose"
    return str(robot.get("sample_pose", "tpose"))


def effective_robot_sample_qpos(config: dict[str, Any], sample_pose: str) -> dict[str, Any]:
    robot = robot_config(config)
    pose = str(sample_pose)
    pose_qpos = robot.get(f"{pose}_qpos")
    if pose_qpos is not None:
        return config_joint_values(config, f"{pose}_qpos")
    if pose not in {"default", "none", "raw", "off"}:
        return config_joint_values(config, "tpose_qpos")
    return {}


def correspondence_cache_suffix(config: dict[str, Any]) -> str:
    template_cfg = smpl_template_config(config)
    name = str(template_cfg["name"])
    pose = effective_robot_sample_pose(config, template_cfg)
    pose_suffix = "" if pose in {"", "tpose"} else "_" + safe_cache_component(pose)
    dataset = section(section(config, "correspondence"), "dataset")
    smpl_center = str(dataset.get("smpl_center", "spine1"))
    center_suffix = ""
    if smpl_center == "bbox_ratio":
        bbox_center_ratio = float(dataset.get("bbox_center_ratio", 0.45))
        center_suffix = "_bboxcenter_" + safe_cache_component(f"{bbox_center_ratio:.6f}")
    elif smpl_center != "spine1":
        center_suffix = "_smplcenter_" + safe_cache_component(smpl_center)
    if template_cfg["betas"] is None and name == "smplx_neutral" and not pose_suffix:
        return center_suffix
    return "_" + safe_cache_component(name) + pose_suffix + center_suffix


def _motion_sequence_for_template(config: dict[str, Any]):
    import smpl_surface_retarget_common as common

    motion = section(config, "motion")
    data_path = resolve_path(motion.get("data"), config)
    if data_path is None or not data_path.exists():
        return "", None
    data, _source_format = common.load_motion_collection(data_path)
    return common.select_sequence(data, motion.get("seq_key", ""), int(motion.get("seq_index", 0)))


def smpl_template_config(config: dict[str, Any]) -> dict[str, Any]:
    template = dict(config.get("smpl_template", {}) or {})
    source = str(template.get("source", "motion"))
    use_betas = bool_value(template.get("use_betas"), True)
    use_gender = bool_value(template.get("use_gender"), True)
    model_type = str(template.get("type", "smplx"))
    gender = str(template.get("gender", "neutral")).lower()
    betas = None
    seq_key = ""
    sequence = None

    if use_betas and source == "motion":
        seq_key, sequence = _motion_sequence_for_template(config)
        if sequence is not None:
            if str(sequence.get("source_format", "")).startswith("soma"):
                model_type = "soma"
                betas = None
            else:
                betas = _as_betas(sequence.get("beta", sequence.get("betas", np.zeros(10))))
                if np.allclose(betas, 0.0):
                    betas = None
                if use_gender:
                    gender = str(sequence.get("gender", gender)).lower()
    elif use_betas and source in {"manual", "config"} and template.get("betas", template.get("beta")) is not None:
        betas = _as_betas(template.get("betas", template.get("beta")))
    elif use_betas and "betas" in template:
        betas = _as_betas(template.get("betas"))

    configured_name = template.get("name")
    if str(configured_name) == "auto" or not configured_name:
        configured_name = None
    if configured_name is None and str(model_type).lower() == "soma":
        name = soma_source.soma_template_name_for_sequence(sequence, fallback="soma")
    elif betas is None:
        name = str(configured_name or smpl_template_default_name(model_type, gender, None))
    else:
        name = str(configured_name or smpl_template_default_name(model_type, gender, betas))

    return {
        "name": name,
        "type": model_type,
        "gender": gender,
        "betas": betas,
        "source": source,
        "soma_usd_path": template.get("soma_usd_path", config.get("soma_usd_path", "sample_data/soma/soma_base_skel_minimal.usd")),
    }


def use_soma_sequence_template(sequence, template_cfg: dict[str, Any]) -> bool:
    if sequence is None:
        return False
    if str(template_cfg.get("source", "motion")) != "motion":
        return False
    if not soma_source.is_boneseed_sequence(sequence):
        return False
    return str(template_cfg.get("name", "")) == soma_source.soma_template_name_for_sequence(sequence, fallback="soma")


def soma_shape_template_sequence(config: dict[str, Any], template_cfg: dict[str, Any]) -> dict[str, Any]:
    """Build the minimal SOMA descriptor needed by a shape-only template."""
    template = dict(config.get("smpl_template", {}) or {})
    shape_path = resolve_path(template.get("soma_shape_params_path"), config)
    if shape_path is None:
        raise ValueError("SOMA shape templates require smpl_template.soma_shape_params_path")
    if not shape_path.exists():
        raise FileNotFoundError(f"SOMA shape parameters not found: {shape_path}")

    variant = str(template.get("soma_shape_variant", "proportional")).lower()
    actor_id = str(template.get("soma_actor_id", ""))
    sequence: dict[str, Any] = {
        "source_format": f"soma_bvh_boneseed_{variant}",
        "soma_actor_id": actor_id,
        "soma_template_name": str(template_cfg["name"]),
        "soma_shape_params_path": str(shape_path),
        "soma_lod": str(template.get("soma_lod", "mid")),
        "soma_shape_variant": variant,
    }
    assets_value = template.get("soma_assets_path")
    if assets_value:
        sequence["soma_assets_path"] = str(resolve_path(assets_value, config))
    if template.get("soma_device"):
        sequence["soma_device"] = str(template["soma_device"])
    return sequence


def build_correspondence_dataset(config: dict[str, Any], force=False, dry_run=False) -> Path:
    import build_correspondence_ae_dataset as build

    out = dataset_out(config)
    if out.exists() and not force:
        if correspondence_dataset_compatible(out, config):
            print(f"[HumanoidPipeline] reuse correspondence dataset: {out}")
            return out
        print(f"[HumanoidPipeline] rebuild incompatible correspondence dataset: {out}")
    if dry_run:
        print(f"[HumanoidPipeline] would build correspondence dataset: {out}")
        return out

    corr = section(config, "correspondence")
    dataset = section(corr, "dataset")
    robot = robot_config(config)
    num_points = int(dataset.get("num_points", 4096))
    seed = int(dataset.get("seed", 0))
    oversample_ratio = int(dataset.get("surface_oversample_ratio", 8))
    curvature_weight = float(dataset.get("surface_curvature_weight", 0.0))
    curvature_power = float(dataset.get("surface_curvature_power", 1.0))
    exterior_surface = bool_value(dataset.get("exterior_surface"), True)
    exterior_occlusion_distance = float(dataset.get("exterior_occlusion_distance", 0.12))
    exterior_method = str(dataset.get("exterior_method", "first_hit"))
    exterior_ray_distance = float(dataset.get("exterior_ray_distance", 0.0))
    smpl_center = str(dataset.get("smpl_center", "spine1"))
    bbox_center_ratio = float(dataset.get("bbox_center_ratio", 0.45))

    samples = []
    template_cfg = smpl_template_config(config)
    template_sequence = None
    if template_cfg["type"] in {"soma", "nr_fbx"}:
        if template_cfg["type"] == "soma" and template_cfg["source"] == "shape":
            template_sequence = soma_shape_template_sequence(config, template_cfg)
        else:
            _template_seq_key, template_sequence = _motion_sequence_for_template(config)
            if template_cfg["type"] == "soma" and not use_soma_sequence_template(template_sequence, template_cfg):
                template_sequence = None
    specs = smpl_model_specs(config)
    if template_cfg["betas"] is not None:
        specs = [
            {
                "type": template_cfg["type"],
                "dir": config.get(f"{template_cfg['type']}_model_dir", config.get("smplx_model_dir", "smpl")),
                "genders": [template_cfg["gender"]],
                "betas": template_cfg["betas"].tolist(),
                "name": template_cfg["name"],
            }
        ]
    elif template_cfg["type"] == "soma":
        specs = [
            {
                "type": "soma",
                "dir": template_cfg["soma_usd_path"],
                "name": template_cfg["name"],
                "sequence": template_sequence,
            }
        ]
    elif template_cfg["type"] == "nr_fbx":
        if template_sequence is None:
            raise ValueError("NR FBX correspondence requires motion.data to point to an NR dataset root")
        samples.extend(
            build.build_nr_fbx_samples(
                template_sequence,
                num_points,
                seed + 1000,
                oversample_ratio,
                curvature_weight,
                curvature_power,
                smpl_center,
                bbox_center_ratio,
                name=template_cfg["name"],
            )
        )
        specs = []
    for offset, spec in enumerate(specs):
        model_type = str(spec.get("type", "smplx"))
        if model_type == "soma":
            soma_usd_path = resolve_path(spec.get("dir"), config, "sample_data/soma/soma_base_skel_minimal.usd")
            samples.extend(
                build.build_soma_samples(
                    soma_usd_path,
                    num_points,
                    seed + 1000 * (offset + 1),
                    oversample_ratio,
                    curvature_weight,
                    curvature_power,
                    smpl_center,
                    bbox_center_ratio,
                    name=spec.get("name", "soma"),
                    soma_sequence=spec.get("sequence"),
                )
            )
        else:
            model_dir = resolve_path(spec.get("dir"), config, config.get(f"{model_type}_model_dir", "smpl"))
            genders = tuple(str(g) for g in spec.get("genders", ["neutral"]))
            samples.extend(
                build.build_smpl_samples(
                    model_dir,
                    model_type,
                    num_points,
                    seed + 1000 * (offset + 1),
                    oversample_ratio,
                    curvature_weight,
                    curvature_power,
                    smpl_center,
                    bbox_center_ratio,
                    genders=genders,
                    betas=spec.get("betas"),
                    name=spec.get("name"),
                )
            )

    expected_human_name = expected_smpl_slot_name(config)
    built_human_names = {str(sample["name"]) for sample in samples}
    if expected_human_name not in built_human_names:
        raise RuntimeError(
            f"Required human template {expected_human_name!r} could not be built. "
            "Robot sampling was not started and no correspondence dataset was written. "
            "Check the configured SMPL/SMPL-X model path and template gender/betas."
        )

    robot_xml = resolve_path(robot.get("xml"), config)
    robot_name = str(robot.get("slot_name", robot["name"]))
    point_cloud_center = str(robot["point_cloud_center"])
    sample_point_cloud_center = str(robot.get("sample_point_cloud_center", point_cloud_center))
    robot_sample_pose = effective_robot_sample_pose(config, template_cfg)
    robot_sample_qpos = effective_robot_sample_qpos(config, robot_sample_pose)
    samples.append(
        build.build_robot_sample(
            robot_xml,
            robot_name,
            num_points,
            seed + 9000,
            oversample_ratio,
            curvature_weight,
            curvature_power,
            to_smpl_frame=bool_value(robot.get("to_smpl_frame"), True),
            pose=robot_sample_pose,
            exterior_surface=exterior_surface,
            exterior_occlusion_distance=exterior_occlusion_distance,
            exterior_method=exterior_method,
            exterior_ray_distance=exterior_ray_distance,
            point_cloud_center_name=sample_point_cloud_center,
            tpose_qpos=robot_sample_qpos,
            mimic_qpos=mimic_qpos_for_build(robot),
            reset_key=robot.get("reset_key"),
        )
    )
    if not samples:
        raise RuntimeError("No correspondence samples were built.")

    names = np.asarray([s["name"] for s in samples])
    points = np.stack([s["points"] for s in samples], axis=0).astype(np.float32)
    root_offsets = np.stack([s["root_offset"] for s in samples], axis=0).astype(np.float32)
    center_modes = np.asarray([s["center_mode"] for s in samples])
    save_data = {
        "names": names,
        "points": points,
        "root_offsets": root_offsets,
        "center_modes": center_modes,
        "num_points": np.asarray(num_points, dtype=np.int32),
        "seed": np.asarray(seed, dtype=np.int32),
        "surface_oversample_ratio": np.asarray(oversample_ratio, dtype=np.int32),
        "surface_curvature_weight": np.asarray(curvature_weight, dtype=np.float32),
        "surface_curvature_power": np.asarray(curvature_power, dtype=np.float32),
        "bbox_center_ratio": np.asarray(bbox_center_ratio, dtype=np.float32),
        "robot_exterior_surface": np.asarray(exterior_surface),
        "robot_exterior_occlusion_distance": np.asarray(exterior_occlusion_distance, dtype=np.float32),
        "robot_exterior_method": np.asarray(exterior_method),
        "robot_exterior_ray_distance": np.asarray(exterior_ray_distance, dtype=np.float32),
        "custom_robot_name": np.asarray(robot_name),
        "custom_robot_xml": np.asarray(str(robot_xml)),
        "custom_robot_point_cloud_center": np.asarray(sample_point_cloud_center),
        "custom_robot_retarget_point_cloud_center": np.asarray(point_cloud_center),
        "custom_robot_root_body": np.asarray(sample_point_cloud_center),
        "custom_robot_retarget_root_body": np.asarray(point_cloud_center),
        "custom_robot_sample_pose": np.asarray(robot_sample_pose),
        "custom_robot_sample_qpos_names": np.asarray(list(robot_sample_qpos.keys()), dtype=object),
        "custom_robot_sample_qpos_values": np.asarray([float(value) for value in robot_sample_qpos.values()], dtype=np.float32),
    }
    for idx, sample in enumerate(samples):
        save_data[f"mesh_vertices_{idx}"] = sample["vertices"].astype(np.float32)
        save_data[f"mesh_faces_{idx}"] = sample["faces"].astype(np.int32)
        save_data[f"sample_face_ids_{idx}"] = sample["sample_face_ids"].astype(np.int32)
        save_data[f"betas_{idx}"] = sample.get("betas", np.zeros(0, dtype=np.float32)).astype(np.float32)
    out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(out, **save_data)
    print(f"[HumanoidPipeline] saved correspondence dataset: {out} names={names.tolist()} points={points.shape}")
    return out


def train_correspondence(config: dict[str, Any], dataset_path: Path, force=False, dry_run=False) -> Path:
    out_dir = train_out_dir(config)
    final_slots = slots_out(config)
    if final_slots.exists() and not force:
        if correspondence_slots_compatible(final_slots, config):
            print(f"[HumanoidPipeline] reuse correspondence slots: {final_slots}")
            return final_slots
        print(f"[HumanoidPipeline] rebuild correspondence slots for template={expected_smpl_slot_name(config)!r}")
    if not dry_run and not correspondence_dataset_compatible(dataset_path, config):
        raise ValueError(
            f"Correspondence dataset is missing or incompatible: {dataset_path}. "
            "Build it for the configured human template and robot before training."
        )
    corr = section(config, "correspondence")
    train = section(corr, "train")
    template_name = train.get("template_name", "auto")
    if str(template_name) == "auto":
        template_name = smpl_template_config(config)["name"]
    train_args = {
        "data": dataset_path,
        "out_dir": out_dir,
        "template_name": template_name,
        "template_sort": train.get("template_sort", "y_z_x"),
        "num_points": section(corr, "dataset").get("num_points", 4096),
        "normalize": train.get("normalize", "per_sample_height"),
        "epochs": train.get("epochs", 1000),
        "batch_size": train.get("batch_size", 16),
        "fixed_template": bool_value(train.get("fixed_template"), False),
        "lr": train.get("lr", 1e-3),
        "lr_scheduler": train.get("lr_scheduler", "cosine"),
        "min_lr": train.get("min_lr", 1e-5),
        "chamfer_weight": train.get("chamfer_weight", 1.0),
        "repulsion_weight": train.get("repulsion_weight", 0.002),
        "repulsion_k": train.get("repulsion_k", 8),
        "repulsion_radius": train.get("repulsion_radius", 0.035),
        "residual_weight": train.get("residual_weight", 0.0),
        "edge_weight": train.get("edge_weight", 0.4),
        "edge_graph": train.get("edge_graph", "geodesic"),
        "edge_k": train.get("edge_k", 32),
        "noise_std": train.get("noise_std", 0.002),
        "dropout_ratio": train.get("dropout_ratio", 0.0),
        "resample_every": train.get("resample_every", 0),
        "log_every": train.get("log_every", 100),
        "save_every": train.get("save_every", 1000),
        "seed": train.get("seed", 0),
        "device": train.get("device", "auto"),
    }
    extra = train.get("extra_args", {})
    if isinstance(extra, dict):
        train_args.update(extra)
    cmd = [PYTHON, str(SCRIPTS / "train_correspondence_template_residual_ae.py"), *list_of_args(train_args)]
    run_command(cmd, dry_run=dry_run)
    return final_slots


def retarget_motion(config: dict[str, Any], slots_path: Path, force=False, dry_run=False) -> Path:
    out = retarget_out(config)
    if out.exists() and not force:
        if retarget_result_compatible(out, config):
            print(f"[HumanoidPipeline] reuse retarget result: {out}")
            return out
        print(f"[HumanoidPipeline] rebuild retarget result for template={expected_smpl_slot_name(config)!r}")
    if not dry_run and not correspondence_slots_compatible(slots_path, config):
        raise ValueError(
            f"Correspondence slots are missing or incompatible: {slots_path}. "
            "Build/train them for the configured human template and robot before retargeting."
        )
    corr = section(config, "correspondence")
    motion = section(config, "motion")
    solver = section(config, "solver")
    retarget = section(config, "retarget")
    motion_args = {
        "data": resolve_path(motion.get("data"), config, ROOT / "sample_data/smpl_motion_sample.pkl"),
        "seq_index": motion.get("seq_index", 0),
        "start": motion.get("start", 0),
        "end": motion.get("end", -1),
        "stride": motion.get("stride", 1),
        "max_frames": motion.get("max_frames", 0),
    }
    if motion.get("seq_key"):
        motion_args["seq_key"] = motion["seq_key"]
    retarget_args = {
        key: solver[key]
        for key in RETARGET_SOLVER_ARGS
        if key in solver
    }
    extra = retarget.get("extra_args", {})
    if isinstance(extra, dict):
        retarget_args.update(extra)
    print(
        "[HumanoidPipeline] retarget motion "
        f"seq_key={motion.get('seq_key')!r} seq_index={motion_args['seq_index']} "
        f"frames={motion_args['start']}:{motion_args['end']}:{motion_args['stride']} "
        f"max_frames={motion_args['max_frames']}"
    )
    cmd = [
        PYTHON,
        str(SCRIPTS / "retarget_smpl_to_humanoid_surface_vector.py"),
        "--config",
        str(Path(config["_config_path"])),
        *list_of_args(motion_args),
        *list_of_args(retarget_args),
        "--slots",
        str(slots_path),
        "--out",
        str(out),
    ]
    if corr.get("slots_field"):
        cmd.extend(["--slots-field", str(corr["slots_field"])])
    run_command(cmd, dry_run=dry_run)
    return out


def visualize_result(config: dict[str, Any], result_path: Path, dry_run=False):
    view = section(config, "view")
    if view.get("enabled", True) is False:
        print("[HumanoidPipeline] view disabled by config.")
        return
    view_args = {
        "result": result_path,
        "play": bool_value(view.get("play"), True),
        "rate_limit": bool_value(view.get("rate_limit"), True),
        "viewer_backend": "glfw-ui",
    }
    if view.get("dry_run"):
        view_args["dry_run"] = True
    for key, value in (view.get("extra_args", {}) or {}).items():
        view_args[key] = value
    cmd = [PYTHON, str(SCRIPTS / "visualize_robot_retarget_result.py"), *list_of_args(view_args)]
    for key, flag in VIEW_FALSE_FLAGS.items():
        if view_args.get(key) is False:
            cmd.append(flag)
    run_command(cmd, dry_run=dry_run)


def run_pipeline(config: dict[str, Any], args: argparse.Namespace) -> None:
    stages = ["build", "train", "retarget"]
    if args.stage != "all":
        stages = [args.stage]
    dataset_path = dataset_out(config)
    slots_path = slots_out(config)
    result_path = retarget_out(config)

    if "build" in stages:
        dataset_path = build_correspondence_dataset(config, force=args.force_build, dry_run=args.dry_run)
    if "train" in stages:
        if not args.dry_run:
            dataset_path = build_correspondence_dataset(config, force=args.force_build, dry_run=args.dry_run)
        slots_path = train_correspondence(config, dataset_path, force=args.force_train, dry_run=args.dry_run)
    if "retarget" in stages:
        if (not slots_path.exists() or not correspondence_slots_compatible(slots_path, config)) and not args.dry_run:
            dataset_path = build_correspondence_dataset(config, force=args.force_build, dry_run=args.dry_run)
            slots_path = train_correspondence(config, dataset_path, force=args.force_train, dry_run=args.dry_run)
        result_path = retarget_motion(config, slots_path, force=args.force_retarget, dry_run=args.dry_run)
    if args.stage == "view":
        visualize_result(config, result_path, dry_run=args.dry_run)
    elif args.stage == "all" and not args.skip_view:
        visualize_result(config, result_path, dry_run=args.dry_run)


def main():
    args = parse_args()
    config = load_pipeline_config(args.config, args.defaults)
    if args.defaults is None:
        run_pipeline(config, args)
        return

    with tempfile.TemporaryDirectory(prefix="umr_main_config_", dir="/tmp") as temp_dir:
        runtime_config = write_runtime_config(config, Path(temp_dir))
        run_pipeline(runtime_config, args)


if __name__ == "__main__":
    main()

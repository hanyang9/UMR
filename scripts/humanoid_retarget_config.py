from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "humanoid_retarget_defaults.json"
ROBOT_CONFIG_DIR = ROOT / "robot_configs"
LEGACY_ROBOT_CONFIG_DIR = ROOT / "configs"
LEGACY_DEFAULT_CONFIG_VALUES = {
    "humanoid_retarget_defaults.json",
    "configs/humanoid_retarget_defaults.json",
    "robot_configs/humanoid_retarget_defaults.json",
}


def _load_config_file(path: Path) -> dict[str, Any]:
    path = Path(path)
    text = path.read_text()
    suffix = path.suffix.lower()
    if suffix in {".yaml", ".yml"}:
        try:
            import yaml  # type: ignore
        except ImportError as exc:
            raise ImportError(
                f"{path} is YAML, but PyYAML is not installed. Use JSON config or install PyYAML."
            ) from exc
        data = yaml.safe_load(text)
    else:
        data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError(f"Config must be an object: {path}")
    return data


def _resolve_config_path(path: str | Path) -> Path:
    raw_path = Path(path)
    if raw_path.exists():
        return raw_path.resolve()
    if raw_path.is_absolute():
        try:
            relative = raw_path.relative_to(LEGACY_ROBOT_CONFIG_DIR)
        except ValueError:
            pass
        else:
            candidate = ROBOT_CONFIG_DIR / relative
            if candidate.exists():
                return candidate.resolve()
        return raw_path.resolve()
    parts = raw_path.parts
    if parts and parts[0] == "configs":
        candidate = ROBOT_CONFIG_DIR.joinpath(*parts[1:])
        if candidate.exists():
            return candidate.resolve()
    return raw_path.resolve()


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if key in {"extends", "_config_path", "_config_dir"}:
            continue
        current = merged.get(key)
        if isinstance(current, dict) and isinstance(value, dict):
            merged[key] = _deep_merge(current, value)
        else:
            merged[key] = value
    return merged


def _resolve_extend_path(value: str | Path, child_path: Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path.resolve()
    normalized = path.as_posix()
    if normalized in LEGACY_DEFAULT_CONFIG_VALUES and DEFAULT_CONFIG.exists():
        return DEFAULT_CONFIG.resolve()
    candidate = child_path.resolve().parent / path
    if candidate.exists() or str(value).startswith("."):
        return candidate.resolve()
    root_candidate = ROOT / path
    if not root_candidate.exists() and normalized in LEGACY_DEFAULT_CONFIG_VALUES:
        return DEFAULT_CONFIG.resolve()
    return root_candidate.resolve()


def load_config(path: Path, use_default_extends: bool = True) -> dict[str, Any]:
    path = _resolve_config_path(path)
    data = _load_config_file(path)
    extends = data.get("extends")
    if not extends and use_default_extends:
        if path != DEFAULT_CONFIG and DEFAULT_CONFIG.exists():
            extends = str(DEFAULT_CONFIG)
    if extends:
        extend_values = extends if isinstance(extends, list) else [extends]
        merged: dict[str, Any] = {}
        for extend_value in extend_values:
            if not isinstance(extend_value, (str, Path)):
                raise ValueError(f"Config extends entries must be paths: {path}")
            parent = load_config(_resolve_extend_path(extend_value, path), use_default_extends=False)
            merged = _deep_merge(merged, parent)
        data = _deep_merge(merged, data)
    data["_config_path"] = str(path)
    data["_config_dir"] = str(path.parent)
    return data


def config_dir(config: dict[str, Any]) -> Path:
    return Path(config.get("_config_dir", ROOT)).resolve()


def resolve_path(value: str | Path | None, config: dict[str, Any], default: str | Path | None = None) -> Path | None:
    raw = default if value is None else value
    if raw is None:
        return None
    path = Path(raw)
    if path.is_absolute():
        return path.resolve()
    base = config_dir(config)
    candidate = base / path
    if candidate.exists() or str(raw).startswith("."):
        return candidate.resolve()
    return (ROOT / path).resolve()


def section(config: dict[str, Any], name: str) -> dict[str, Any]:
    value = config.get(name, {})
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError(f"Config section {name!r} must be an object.")
    return value


def robot_config(config: dict[str, Any]) -> dict[str, Any]:
    robot = dict(section(config, "robot"))
    if not robot.get("name"):
        raise ValueError("Config requires robot.name.")
    if not robot.get("xml"):
        raise ValueError("Config requires robot.xml.")
    if not robot.get("point_cloud_center"):
        legacy_root = robot.get("root_body")
        if legacy_root:
            robot["point_cloud_center"] = legacy_root
        else:
            raise ValueError(
                "Config requires robot.point_cloud_center, such as body:pelvis, geom:pelvis_geom, or joint:root_joint."
            )
    if not robot.get("sample_point_cloud_center") and robot.get("sample_root_body"):
        robot["sample_point_cloud_center"] = robot["sample_root_body"]
    return robot


def list_of_args(values: dict[str, Any]) -> list[str]:
    args: list[str] = []
    for key, value in values.items():
        flag = "--" + key.replace("_", "-")
        if isinstance(value, bool):
            if value:
                args.append(flag)
            continue
        if value is None:
            continue
        if isinstance(value, (list, tuple)):
            args.append(flag)
            args.extend(str(item) for item in value)
            continue
        args.extend([flag, str(value)])
    return args

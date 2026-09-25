#!/usr/bin/env python3
"""Run one converted HiPHI SMPL-X sequence with shared beta-zero correspondence."""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT / "scripts" / "humanoid_retarget_pipeline_hsi_hoi.py"
DEFAULTS = ROOT / "humanoid_retarget_defaults_hiphi.json"
DEFAULT_CONFIG = ROOT / "robot_configs" / "humanoid_retarget_unitree_g1_example.json"


def main() -> None:
    has_defaults = any(arg == "--defaults" or arg.startswith("--defaults=") for arg in sys.argv[1:])
    has_config = any(arg == "--config" or arg.startswith("--config=") for arg in sys.argv[1:])
    injected = []
    if not has_config:
        injected.extend(["--config", str(DEFAULT_CONFIG)])
    if not has_defaults:
        injected.extend(["--defaults", str(DEFAULTS)])
    sys.argv[1:1] = injected
    runpy.run_path(str(PIPELINE), run_name="__main__")


if __name__ == "__main__":
    main()

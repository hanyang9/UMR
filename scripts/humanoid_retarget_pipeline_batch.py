#!/usr/bin/env python3
"""CPU-parallel retargeting for SMPL-X/SOMA files or flat SMPL-X sequence directories."""
from __future__ import annotations

import argparse
import atexit
import json
import multiprocessing
import os
import re
import subprocess
import sys
import tempfile
import threading
import zipfile
from concurrent.futures import FIRST_COMPLETED, ProcessPoolExecutor, ThreadPoolExecutor, as_completed, wait
from pathlib import Path
from queue import Queue
from typing import Any

import numpy as np

try:
    from tqdm import tqdm
except ImportError:
    tqdm = None

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import soma_source  # noqa: E402
from humanoid_retarget_config import load_config, resolve_path, robot_config, section  # noqa: E402
from humanoid_retarget_pipeline import (  # noqa: E402
    build_correspondence_dataset,
    correspondence_slots_compatible,
    dataset_out,
    retarget_result_compatible,
    smpl_template_config,
    slots_out,
    train_correspondence,
)


PYTHON = sys.executable
DEFAULT_BATCH_CONFIG = ROOT / "humanoid_retarget_defaults_batch.json"
PROGRESS_PREFIX = "__HUMANOID_BATCH_PROGRESS__"
_SOURCE_PREPROCESS_MODULE = None


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True, help="Robot config, e.g. robot_configs/humanoid_retarget_unitree_h2_example.json.")
    parser.add_argument("--batch-config", type=Path, default=DEFAULT_BATCH_CONFIG)
    parser.add_argument("--motion-folder", type=Path, default=None)
    parser.add_argument("--inventory-summary", type=Path, default=None, help="Reuse unique template examples from a correspondence_summary.json.")
    parser.add_argument("--motion-inventory", type=Path, default=None, help="Reuse all motion-to-template assignments from a correspondence_summary.json.")
    parser.add_argument("--pattern", action="append", default=None, help="Motion file glob. Can be passed more than once.")
    parser.add_argument("--recursive", action="store_true", default=None)
    parser.add_argument("--workers", type=int, default=None)
    parser.add_argument("--correspondence-workers", type=int, default=None)
    parser.add_argument("--retarget-cpu-threads", type=int, default=None, help="OpenMP/BLAS threads allowed per retarget worker.")
    parser.add_argument("--retarget-gpus", type=str, default=None, help="Comma-separated GPU ids, 'auto', or 'none' for retarget workers.")
    parser.add_argument("--correspondence-devices", type=str, default=None, help="Comma-separated CUDA device indices assigned round-robin to correspondence templates.")
    parser.add_argument("--output-root", type=Path, default=None)
    parser.add_argument("--temp-config-root", type=Path, default=None)
    parser.add_argument("--keep-temp-configs", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force-build", action="store_true")
    parser.add_argument("--force-train", action="store_true")
    parser.add_argument("--force-retarget", action="store_true")
    parser.add_argument("--no-skip-existing", action="store_true")
    parser.add_argument("--start", type=int, default=None)
    parser.add_argument("--end", type=int, default=None)
    parser.add_argument("--stride", type=int, default=None)
    parser.add_argument("--max-frames", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--correspondence-only",
        action="store_true",
        help="Discover unique motion templates and build/train correspondence slots without retargeting clips.",
    )
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text())
    if not isinstance(data, dict):
        raise ValueError(f"Batch config must be an object: {path}")
    return data


def clean_config(value):
    if isinstance(value, dict):
        return {str(k): clean_config(v) for k, v in value.items() if not str(k).startswith("_")}
    if isinstance(value, list):
        return [clean_config(v) for v in value]
    return value


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        current = merged.get(key)
        if isinstance(current, dict) and isinstance(value, dict):
            merged[key] = deep_merge(current, value)
        else:
            merged[key] = value
    return merged


def batch_path(raw: str | Path | None, default: str | Path, batch_config_path: Path) -> Path:
    path = Path(default if raw is None else raw)
    if path.is_absolute():
        return path.resolve()
    candidate = batch_config_path.resolve().parent / path
    if candidate.exists() or str(path).startswith("."):
        return candidate.resolve()
    return (ROOT / path).resolve()


def as_patterns(value) -> list[str]:
    if value is None:
        return ["*.npz", "*.bvh"]
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item) for item in value]
    raise ValueError("batch.patterns must be a string or list of strings.")


def is_flat_smplx_sequence_dir(path: Path) -> bool:
    return path.is_dir() and (
        (path / "smpl_pose_axis_angle.npy").exists() or (path / "pose_aa.npy").exists()
    ) and ((path / "transl.npy").exists() or (path / "trans.npy").exists())


def discover_motion_files(
    folder: Path,
    patterns: list[str],
    recursive: bool,
    include_flat_smplx_dirs: bool = False,
) -> list[Path]:
    files: list[Path] = []
    for pattern in patterns:
        iterator = folder.rglob(pattern) if recursive else folder.glob(pattern)
        files.extend(path for path in iterator if path.is_file())
    if include_flat_smplx_dirs:
        iterator = folder.rglob("*") if recursive else folder.iterdir()
        files.extend(path for path in iterator if is_flat_smplx_sequence_dir(path))
    return sorted(set(path.resolve() for path in files))


def sanitize_stem(path: Path, motion_folder: Path) -> str:
    try:
        rel = path.relative_to(motion_folder)
    except ValueError:
        rel = path.name
    stem = Path(rel).with_suffix("").as_posix()
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", stem.replace("/", "__"))


def absolutize_retarget_config(config: dict[str, Any]) -> dict[str, Any]:
    original = config
    config = clean_config(config)
    if config.get("smplx_model_dir") is not None:
        config["smplx_model_dir"] = str(resolve_path(config.get("smplx_model_dir"), original))
    robot = robot_config(config)
    original_robot = robot_config(original)
    robot["xml"] = str(resolve_path(original_robot.get("xml"), original))
    config["robot"] = robot
    return config


def make_clip_config(
    base_config: dict[str, Any],
    motion_file: Path,
    out_path: Path,
    motion_overrides: dict[str, Any],
    temp_config_path: Path,
    correspondence_smpl_name: str,
) -> dict[str, Any]:
    config = absolutize_retarget_config(base_config)
    config.setdefault("motion", {})
    config["motion"].update(motion_overrides)
    config["motion"]["data"] = str(motion_file)
    config["motion"]["seq_key"] = motion_file.stem
    config["motion"]["seq_index"] = 0
    config.setdefault("correspondence", {})
    config["correspondence"]["smpl_name"] = str(correspondence_smpl_name)
    config.setdefault("retarget", {})
    config["retarget"]["out"] = str(out_path)
    config["_config_path"] = str(temp_config_path)
    config["_config_dir"] = str(temp_config_path.parent)
    return config


def load_npz_array_prefix(path: Path, keys: tuple[str, ...], count: int) -> np.ndarray | None:
    """Read only the first values of an NPY member instead of inflating the whole array."""
    selected_key = None
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        for key in keys:
            if f"{key}.npy" in names:
                selected_key = key
                break
        if selected_key is None:
            return None
        with archive.open(f"{selected_key}.npy") as stream:
            version = np.lib.format.read_magic(stream)
            if version == (1, 0):
                shape, fortran_order, dtype = np.lib.format.read_array_header_1_0(stream)
            elif version in {(2, 0), (3, 0)}:
                shape, fortran_order, dtype = np.lib.format.read_array_header_2_0(stream)
            else:
                raise ValueError(f"Unsupported NPY header version {version} in {path}")
            total = int(np.prod(shape, dtype=np.int64))
            if not dtype.hasobject and not fortran_order:
                item_count = min(int(count), total)
                payload = stream.read(item_count * dtype.itemsize)
                if len(payload) == item_count * dtype.itemsize:
                    return np.frombuffer(payload, dtype=dtype, count=item_count).copy()

    # Rare object/Fortran arrays need NumPy's full loader for exact flattening semantics.
    with np.load(path, allow_pickle=True) as data:
        return np.asarray(data[selected_key]).reshape(-1)[:count].copy()


def template_config_for_motion(
    base_config: dict[str, Any],
    motion_file: Path,
    motion_overrides: dict[str, Any],
) -> dict[str, Any]:
    config = absolutize_retarget_config(base_config)
    config.setdefault("motion", {})
    config["motion"].update(motion_overrides)
    config["motion"]["data"] = str(motion_file)
    config["motion"]["seq_key"] = motion_file.stem
    config["motion"]["seq_index"] = 0
    # Template identity only depends on compact SMPL metadata. Avoid loading
    # and decompressing every full pose sequence while deduplicating a batch.
    template = dict(config.get("smpl_template", {}) or {})
    if motion_file.suffix.lower() == ".npz" and str(template.get("source", "motion")).lower() == "motion":
        raw_betas = load_npz_array_prefix(motion_file, ("betas", "beta"), 10)
        with np.load(motion_file, allow_pickle=True) as motion_data:
            raw_gender = motion_data["gender"] if "gender" in motion_data else template.get("gender", "neutral")
            raw_model_type = motion_data["model_type"] if "model_type" in motion_data else template.get("type", "smplx")
        if raw_betas is None:
            raw_betas = np.zeros(10, dtype=np.float32)
        betas = np.asarray(raw_betas, dtype=np.float32).reshape(-1)[:10]
        betas = np.pad(betas, (0, max(0, 10 - len(betas))))[:10].astype(np.float32)
        gender_array = np.asarray(raw_gender)
        model_type_array = np.asarray(raw_model_type)
        gender = str(gender_array.item() if gender_array.size == 1 else gender_array.reshape(-1)[0]).lower()
        model_type = str(model_type_array.item() if model_type_array.size == 1 else model_type_array.reshape(-1)[0]).lower()
        template["source"] = "manual"
        template["type"] = model_type
        if bool(template.get("use_gender", True)):
            template["gender"] = gender
        if bool(template.get("use_betas", True)) and not np.allclose(betas, 0.0):
            template["betas"] = betas.tolist()
        else:
            template["use_betas"] = False
            template.pop("betas", None)
            template.pop("beta", None)
        config["smpl_template"] = template
    return config


BONESEED_ACTOR_RE = re.compile(r"__(A\d+)(?:_M)?\.bvh$", re.IGNORECASE)


def boneseed_root_for_path(path: Path) -> Path | None:
    """Resolve the BONES-SEED root for the released motions_*/bvh layout."""
    path = Path(path).expanduser().resolve()
    if soma_source.boneseed_motion_variant(path) is None:
        return None
    start = path if path.is_dir() else path.parent
    for candidate in (start, *start.parents):
        if (candidate / "shapes").is_dir():
            return candidate
    return None


def fast_boneseed_template_name(motion_file: Path) -> str | None:
    if motion_file.suffix.lower() != ".bvh":
        return None
    variant = soma_source.boneseed_motion_variant(motion_file)
    if variant == "uniform":
        return "soma_uniform"
    if variant != "proportional":
        return None
    match = BONESEED_ACTOR_RE.search(motion_file.name)
    if match is None:
        raise ValueError(
            f"BONES-SEED proportional BVH filename has no '__Axxx' actor ID: {motion_file}"
        )
    return f"soma_{match.group(1).upper()}"


def template_name_for_motion(
    base_config: dict[str, Any],
    motion_file: Path,
    motion_overrides: dict[str, Any],
) -> str:
    fast_name = fast_boneseed_template_name(motion_file)
    if fast_name is not None:
        return fast_name
    template_config = template_config_for_motion(base_config, motion_file, motion_overrides)
    return str(smpl_template_config(template_config)["name"])


def soma_template_config_for_shape(
    base_config: dict[str, Any],
    *,
    template_name: str,
    actor_id: str,
    variant: str,
    shape_path: Path,
    assets_path: Path,
) -> dict[str, Any]:
    config = absolutize_retarget_config(base_config)
    template = dict(config.get("smpl_template", {}) or {})
    template.update(
        {
            "source": "shape",
            "type": "soma",
            "name": template_name,
            "soma_actor_id": actor_id,
            "soma_shape_params_path": str(shape_path.resolve()),
            "soma_assets_path": str(assets_path.resolve()),
            "soma_lod": template.get("soma_lod", "mid"),
            "soma_shape_variant": variant,
            "use_betas": False,
            "use_gender": False,
        }
    )
    config["smpl_template"] = template
    config.setdefault("correspondence", {})
    config["correspondence"].setdefault("train", {})
    config["correspondence"]["train"]["template_name"] = template_name
    config.setdefault("motion", {})
    config["motion"]["seq_key"] = actor_id or template_name
    config["motion"]["seq_index"] = 0
    return config


def boneseed_template_configs_from_shapes(
    base_config: dict[str, Any],
    motion_folder: Path,
    batch: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    """Pre-register all BONES-SEED body templates without opening any BVH."""
    if batch.get("boneseed_preload_templates", True) is False:
        return {}

    configured_root = batch.get("correspondence_shape_root")
    if configured_root:
        shape_root = Path(configured_root).expanduser()
        if not shape_root.is_absolute():
            shape_root = (ROOT / shape_root).resolve()
        variant = "uniform" if "uniform" in shape_root.name else "proportional"
        boneseed_root = shape_root.parent.parent
    else:
        variant = soma_source.boneseed_motion_variant(motion_folder)
        if variant is None:
            return {}
        boneseed_root = boneseed_root_for_path(motion_folder)
        if boneseed_root is None:
            raise FileNotFoundError(
                f"Could not find the BONES-SEED root containing shapes/ above {motion_folder}"
            )
        shape_dir = (
            "soma_uniform_fit_mhr_params"
            if variant == "uniform"
            else "soma_proportion_fit_mhr_params"
        )
        shape_root = boneseed_root / "shapes" / shape_dir

    assets_override = batch.get("correspondence_soma_assets") or os.environ.get("UMR_SOMA_ASSETS_PATH")
    assets_path = Path(assets_override).expanduser() if assets_override else boneseed_root / "soma_assets"
    if not assets_path.is_absolute():
        assets_path = (ROOT / assets_path).resolve()
    if not shape_root.is_dir():
        raise FileNotFoundError(f"BONES-SEED shape directory not found: {shape_root}")
    if not assets_path.is_dir():
        raise FileNotFoundError(
            f"BONES-SEED SOMA asset directory not found: {assets_path}. "
            "See sample_data/bones-seed/README.md."
        )

    configs: dict[str, dict[str, Any]] = {}
    if variant == "uniform":
        shape_paths = [shape_root / "soma_base_fit_mhr_params.npz"]
    else:
        shape_paths = sorted(shape_root.glob("A*.npz"))
    for shape_path in shape_paths:
        if not shape_path.is_file():
            continue
        actor_id = "" if variant == "uniform" else shape_path.stem.upper()
        template_name = "soma_uniform" if variant == "uniform" else f"soma_{actor_id}"
        configs[template_name] = soma_template_config_for_shape(
            base_config,
            template_name=template_name,
            actor_id=actor_id,
            variant=variant,
            shape_path=shape_path,
            assets_path=assets_path,
        )
    if not configs:
        expected = "soma_base_fit_mhr_params.npz" if variant == "uniform" else "A*.npz"
        raise FileNotFoundError(f"No BONES-SEED {variant} shape files ({expected}) found in {shape_root}")
    return configs


def shared_batch_overrides(batch_config: dict[str, Any]) -> dict[str, Any]:
    """Return optional normal pipeline config overrides from a batch config."""
    batch_only = {"batch", "motion"}
    return clean_config(
        {
            key: value
            for key, value in batch_config.items()
            if key not in batch_only and not str(key).startswith("_")
        }
    )


def resolve_correspondence_smpl_name(config: dict[str, Any], slots_path: Path | None = None) -> str:
    configured = str(section(config, "correspondence").get("smpl_name", "auto"))
    expected = str(smpl_template_config(config)["name"]) if configured == "auto" else configured
    if slots_path is None or not Path(slots_path).exists() or configured != "auto":
        return expected

    slots = np.load(slots_path, allow_pickle=True)
    if "names" not in slots:
        return expected
    names = [str(name) for name in np.asarray(slots["names"]).reshape(-1).tolist()]
    if expected in names:
        return expected
    print(
        f"[BatchRetarget][WARN] expected SMPL slots {expected!r} not found in {slots_path}; "
        "rebuild correspondence for this template instead of falling back to another SMPL sample."
    )
    return expected


def prepare_correspondence_template(
    template_name: str,
    template_config: dict[str, Any],
    *,
    force_build: bool,
    force_train: bool,
    dry_run: bool,
    print_lock: threading.Lock | None = None,
) -> tuple[str, Path, str]:
    dataset_path = dataset_out(template_config)
    slots_path = slots_out(template_config)
    needs_correspondence = (
        force_build
        or force_train
        or not slots_path.exists()
        or not correspondence_slots_compatible(slots_path, template_config)
    )

    def log(message: str) -> None:
        if print_lock is None:
            print(message)
            return
        with print_lock:
            print(message)

    if needs_correspondence:
        if dry_run:
            log(f"[BatchRetarget] would build/train correspondence slots[{template_name}]: {slots_path}")
        else:
            log(f"[BatchRetarget][corr] start template={template_name} slots={slots_path}")
            dataset_path = build_correspondence_dataset(
                template_config,
                force=force_build,
                dry_run=dry_run,
            )
            slots_path = train_correspondence(
                template_config,
                dataset_path,
                force=force_train,
                dry_run=dry_run,
            )
            log(f"[BatchRetarget][corr] done template={template_name} slots={slots_path}")
    else:
        log(f"[BatchRetarget][corr] reuse template={template_name} slots={slots_path}")
    smpl_name = resolve_correspondence_smpl_name(template_config, slots_path)
    return template_name, slots_path, smpl_name


def parse_gpu_ids(value: Any) -> list[str]:
    text = str(value or "auto").strip().lower()
    if text in {"", "none", "cpu", "off"}:
        return []
    if text == "auto":
        try:
            output = subprocess.check_output(
                ["nvidia-smi", "--query-gpu=index", "--format=csv,noheader,nounits"],
                text=True,
            )
        except (OSError, subprocess.SubprocessError):
            return []
        return [line.strip() for line in output.splitlines() if line.strip()]
    return [item.strip() for item in text.split(",") if item.strip()]


def retarget_worker_env(
    progress: bool = False,
    cpu_threads: int = 1,
    cuda_device: str | None = None,
) -> dict[str, str]:
    env = os.environ.copy()
    if cuda_device is None:
        env["CUDA_VISIBLE_DEVICES"] = ""
    else:
        env["CUDA_VISIBLE_DEVICES"] = str(cuda_device)
    thread_env_keys = (
        "OMP_NUM_THREADS",
        "OPENBLAS_NUM_THREADS",
        "MKL_NUM_THREADS",
        "NUMEXPR_NUM_THREADS",
        "VECLIB_MAXIMUM_THREADS",
        "BLIS_NUM_THREADS",
        "NUMBA_NUM_THREADS",
    )
    for key in thread_env_keys:
        env[key] = str(max(1, int(cpu_threads)))
    env.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
    if progress:
        env["HUMANOID_BATCH_PROGRESS"] = "1"
    return env


def initialize_source_preprocess_worker(cuda_device: str, cpu_threads: int = 1) -> None:
    global _SOURCE_PREPROCESS_MODULE
    os.environ["CUDA_VISIBLE_DEVICES"] = str(cuda_device)
    for key in (
        "OMP_NUM_THREADS",
        "OPENBLAS_NUM_THREADS",
        "MKL_NUM_THREADS",
        "NUMEXPR_NUM_THREADS",
        "VECLIB_MAXIMUM_THREADS",
        "BLIS_NUM_THREADS",
        "NUMBA_NUM_THREADS",
    ):
        os.environ[key] = str(max(1, int(cpu_threads)))
    os.environ.setdefault("UMR_SMPLX_MODEL_CACHE_MAX", "2")
    import retarget_smpl_to_humanoid_surface_vector_batch as source_preprocess_module

    _SOURCE_PREPROCESS_MODULE = source_preprocess_module
    print(f"[SourceFeatureFeeder] initialized physical_gpu={cuda_device}", flush=True)


def run_source_preprocess_task(argv: list[str], cache_path: str, motion: str) -> dict[str, str]:
    if _SOURCE_PREPROCESS_MODULE is None:
        raise RuntimeError("Source feature feeder was not initialized.")
    _SOURCE_PREPROCESS_MODULE.main(argv)
    return {"cache": str(cache_path), "motion": str(motion)}


def parse_progress_line(line: str) -> tuple[int, int] | None:
    text = line.strip()
    if not text.startswith(PROGRESS_PREFIX):
        return None
    parts = text.split()
    if len(parts) < 3:
        return None
    try:
        return int(parts[1]), int(parts[2])
    except ValueError:
        return None


def is_error_line(text: str) -> bool:
    return any(
        marker in text
        for marker in (
            "Traceback",
            "Error",
            "Exception",
            "FileNotFoundError",
            "ValueError",
            "RuntimeError",
            "FAILED",
        )
    )


def compact_child_line(line: str) -> str | None:
    text = line.strip()
    if not text:
        return None
    if "\r" in text:
        text = text.split("\r")[-1].strip()
    keep_markers = (
        "source=",
        "retarget:",
        "saved ",
        "Traceback",
        "Error",
        "Exception",
        "FileNotFoundError",
        "ValueError",
        "RuntimeError",
    )
    if any(marker in text for marker in keep_markers):
        return text
    return None


def bar_write(print_lock: threading.Lock, text: str) -> None:
    with print_lock:
        if tqdm is not None:
            tqdm.write(text)
        else:
            print(text)


def set_bar_state(progress_bar, total: int, done: int, description: str | None = None, postfix: str | None = None) -> None:
    if progress_bar is None:
        return
    if description:
        progress_bar.set_description_str(description)
    if postfix is not None:
        progress_bar.set_postfix_str(postfix)
    total = max(1, int(total))
    done = max(0, min(int(done), total))
    if progress_bar.total != total:
        progress_bar.reset(total=total)
    progress_bar.n = done
    progress_bar.refresh()


def run_one(task: dict[str, Any], print_lock: threading.Lock, progress_bar=None):
    worker = task["worker"]
    index = task["index"]
    total = task["total"]
    motion_file: Path = task["motion_file"]
    out_path: Path = task["out_path"]
    temp_config_path: Path = task["temp_config_path"]
    cmd: list[str] = task["cmd"]
    dry_run = bool(task["dry_run"])
    retarget_cpu_threads = int(task.get("retarget_cpu_threads", 1))
    retarget_cuda_device = task.get("retarget_cuda_device")
    compact = bool(task["compact_log"])
    tail_lines = int(task["tail_lines_on_error"])
    prefix = f"[BatchRetarget][W{worker:02d}][{index:04d}/{total:04d}]"
    bar_desc = f"W{worker:02d} {index:04d}/{total:04d}"

    set_bar_state(progress_bar, 1, 0, bar_desc, f"loading {motion_file.name}")
    if progress_bar is None:
        with print_lock:
            print(f"{prefix} loading {motion_file.name}")
    if dry_run:
        bar_write(print_lock, f"{prefix} dry-run " + " ".join(str(part) for part in cmd))
        set_bar_state(progress_bar, 1, 1, bar_desc, "dry-run")
        return {"status": "dry_run", "motion": str(motion_file), "out": str(out_path)}

    proc = subprocess.Popen(
        cmd,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=retarget_worker_env(
            progress=progress_bar is not None,
            cpu_threads=retarget_cpu_threads,
            cuda_device=retarget_cuda_device,
        ),
    )
    tail: list[str] = []
    assert proc.stdout is not None
    for raw_line in proc.stdout:
        progress = parse_progress_line(raw_line)
        if progress is not None:
            done, total_frames = progress
            set_bar_state(progress_bar, total_frames, done, bar_desc, motion_file.name)
            continue

        clean_line = raw_line.rstrip()
        tail.append(clean_line)
        if len(tail) > tail_lines:
            tail.pop(0)
        filtered = compact_child_line(raw_line) if compact else raw_line.rstrip()
        if filtered:
            if progress_bar is not None:
                if is_error_line(filtered):
                    bar_write(print_lock, f"{prefix} {filtered}")
                elif "source=" in filtered:
                    set_bar_state(progress_bar, progress_bar.total or 1, progress_bar.n, bar_desc, motion_file.name)
                elif "saved " in filtered:
                    set_bar_state(progress_bar, progress_bar.total or 1, progress_bar.n, bar_desc, "saving")
            else:
                with print_lock:
                    print(f"{prefix} {filtered}")
    code = proc.wait()
    if code != 0:
        progress_total = (progress_bar.total or 1) if progress_bar is not None else 1
        progress_done = progress_bar.n if progress_bar is not None else 0
        set_bar_state(progress_bar, progress_total, progress_done, bar_desc, "FAILED")
        bar_write(print_lock, f"{prefix} FAILED code={code} temp_config={temp_config_path}")
        if compact:
            for line in tail[-tail_lines:]:
                bar_write(print_lock, f"{prefix} tail> {line}")
        return {"status": "failed", "code": code, "motion": str(motion_file), "out": str(out_path)}
    progress_total = (progress_bar.total or 1) if progress_bar is not None else 1
    set_bar_state(progress_bar, progress_total, progress_total, bar_desc, "done")
    if progress_bar is None:
        with print_lock:
            print(f"{prefix} done {out_path}")
    source_feature_cache = task.get("source_feature_cache")
    if source_feature_cache:
        Path(source_feature_cache).unlink(missing_ok=True)
    return {"status": "ok", "motion": str(motion_file), "out": str(out_path)}


def worker_loop(
    worker_id: int,
    task_queue,
    results: list[dict[str, Any]],
    results_lock: threading.Lock,
    print_lock: threading.Lock,
    use_progress_bars: bool,
) -> None:
    progress_bar = None
    if use_progress_bars and tqdm is not None:
        progress_bar = tqdm(
            total=1,
            position=worker_id,
            leave=True,
            dynamic_ncols=True,
            desc=f"W{worker_id:02d}",
        )
    try:
        while True:
            task = task_queue.get()
            if task is None:
                task_queue.task_done()
                break
            task["worker"] = worker_id
            try:
                result = run_one(task, print_lock, progress_bar=progress_bar)
            except Exception as exc:
                result = {
                    "status": "failed",
                    "code": -1,
                    "motion": str(task.get("motion_file", "")),
                    "out": str(task.get("out_path", "")),
                    "error": repr(exc),
                }
                bar_write(print_lock, f"[BatchRetarget][W{worker_id:02d}] FAILED worker exception: {exc!r}")
            finally:
                task_queue.task_done()
            with results_lock:
                results.append(result)
    finally:
        if progress_bar is not None:
            progress_bar.close()


def main():
    args = parse_args()
    base_config = load_config(args.config)
    batch_config = load_json(args.batch_config)
    base_config = deep_merge(base_config, shared_batch_overrides(batch_config))
    batch = section(batch_config, "batch")
    batch_motion = section(batch_config, "motion")
    batch_retarget = section(batch_config, "retarget")

    motion_folder = batch_path(args.motion_folder, batch.get("motion_folder", "sample_data/lafan1_smplx"), args.batch_config)
    patterns = args.pattern or as_patterns(batch.get("patterns"))
    recursive = bool(args.recursive if args.recursive is not None else batch.get("recursive", False))
    workers = int(args.workers or batch.get("workers", max(1, min(4, os.cpu_count() or 1))))
    correspondence_workers = int(
        args.correspondence_workers
        if args.correspondence_workers is not None
        else batch.get("correspondence_workers", max(1, min(2, workers)))
    )
    retarget_cpu_threads = int(
        args.retarget_cpu_threads
        if args.retarget_cpu_threads is not None
        else batch.get("retarget_cpu_threads", 1)
    )
    retarget_gpus = parse_gpu_ids(
        args.retarget_gpus if args.retarget_gpus is not None else batch.get("retarget_gpus", "auto")
    )
    output_root = batch_path(args.output_root, batch.get("output_root", "output/batch_retarget"), args.batch_config)
    configured_temp_config_root = args.temp_config_root if args.temp_config_root is not None else batch.get("temp_config_root")
    keep_temp_configs = bool(args.keep_temp_configs or batch.get("keep_temp_configs", False) or configured_temp_config_root)
    temp_config_tmp = None
    if configured_temp_config_root is not None:
        temp_config_root = batch_path(configured_temp_config_root, configured_temp_config_root, args.batch_config)
    elif keep_temp_configs:
        temp_config_root = batch_path(None, "output/batch_retarget_configs", args.batch_config)
    else:
        temp_config_tmp = tempfile.TemporaryDirectory(prefix="humanoid_batch_configs_", dir="/tmp")
        atexit.register(temp_config_tmp.cleanup)
        temp_config_root = Path(temp_config_tmp.name)
    skip_existing = bool(batch.get("skip_existing", True)) and not args.no_skip_existing and not args.force_retarget
    compact_log = bool(batch.get("compact_log", True))
    tail_lines = int(batch.get("tail_lines_on_error", 80))

    if not motion_folder.exists():
        raise FileNotFoundError(f"Motion folder not found: {motion_folder}")
    if args.inventory_summary is not None and args.motion_inventory is not None:
        raise ValueError("--inventory-summary and --motion-inventory are mutually exclusive")
    motion_inventory_template_by_motion: dict[str, str] = {}
    motion_inventory_templates: dict[str, Any] = {}
    preloaded_template_configs: dict[str, dict[str, Any]] = {}
    if args.inventory_summary is None and args.motion_inventory is None:
        preloaded_template_configs = boneseed_template_configs_from_shapes(
            base_config,
            motion_folder,
            batch,
        )

    if args.inventory_summary is not None:
        inventory_path = args.inventory_summary.expanduser().resolve()
        inventory = json.loads(inventory_path.read_text())
        inventory_templates = inventory.get("templates", {})
        if not isinstance(inventory_templates, dict) or not inventory_templates:
            raise ValueError(f"Inventory has no templates: {inventory_path}")
        motions = [Path(item["example_motion"]).expanduser().resolve() for item in inventory_templates.values()]
        print(
            f"[BatchRetarget] inventory reuse templates={len(motions)} "
            f"source_motions={inventory.get('motion_count', 'unknown')} path={inventory_path}"
        )
    elif args.motion_inventory is not None:
        inventory_path = args.motion_inventory.expanduser().resolve()
        inventory = json.loads(inventory_path.read_text())
        motion_items = inventory.get("motion_templates", [])
        motion_inventory_templates = inventory.get("templates", {})
        if not isinstance(motion_items, list) or not motion_items:
            raise ValueError(f"Motion inventory has no motion_templates: {inventory_path}")
        if not isinstance(motion_inventory_templates, dict) or not motion_inventory_templates:
            raise ValueError(f"Motion inventory has no templates: {inventory_path}")
        motions = [Path(item["motion"]).expanduser().resolve() for item in motion_items]
        motion_inventory_template_by_motion = {
            str(Path(item["motion"]).expanduser().resolve()): str(item["template"]) for item in motion_items
        }
        print(f"[BatchRetarget] motion inventory reuse motions={len(motions)} templates={len(motion_inventory_templates)} path={inventory_path}")
    elif preloaded_template_configs:
        motions = []
        print(
            f"[BatchRetarget] correspondence_body_templates={len(preloaded_template_configs)} "
            "source=shapes; BVH discovery is deferred until correspondence is ready."
        )
    else:
        include_flat_smplx_dirs = bool(batch.get("include_flat_smplx_dirs", False))
        motions = discover_motion_files(
            motion_folder,
            patterns,
            recursive,
            include_flat_smplx_dirs=include_flat_smplx_dirs,
        )
    if args.limit and int(args.limit) > 0:
        motions = motions[: int(args.limit)]
    if not motions and not preloaded_template_configs:
        raise FileNotFoundError(f"No motion files found in {motion_folder} for patterns={patterns}")

    motion_overrides = dict(batch_motion)
    for key in ("start", "end", "stride", "max_frames"):
        value = getattr(args, key)
        if value is not None:
            motion_overrides[key] = value

    motion_inventory_configs: dict[str, dict[str, Any]] = {}
    for expected_name, item in motion_inventory_templates.items():
        example_motion = Path(item["example_motion"]).expanduser().resolve()
        template_config = template_config_for_motion(base_config, example_motion, motion_overrides)
        computed_name = str(smpl_template_config(template_config)["name"])
        if computed_name != expected_name:
            raise ValueError(f"Inventory template mismatch: expected={expected_name} computed={computed_name}")
        motion_inventory_configs[expected_name] = template_config

    robot = robot_config(base_config)
    robot_name = str(robot["name"])
    result_root = output_root / robot_name
    config_root = temp_config_root / robot_name
    result_root.mkdir(parents=True, exist_ok=True)
    config_root.mkdir(parents=True, exist_ok=True)

    print_lock = threading.Lock()
    clip_entries: list[dict[str, Any]] = []
    template_configs: dict[str, dict[str, Any]] = dict(preloaded_template_configs)
    for idx, motion_file in enumerate(motions, start=1):
        stem = sanitize_stem(motion_file, motion_folder)
        out_path = result_root / f"{stem}_{robot_name}.npz"
        temp_config_path = config_root / f"{stem}_{robot_name}.json"
        template_name = motion_inventory_template_by_motion.get(str(motion_file))
        template_config = (
            motion_inventory_configs.get(template_name) if template_name is not None else None
        )
        if skip_existing and out_path.exists():
            if template_config is None:
                template_config = template_config_for_motion(base_config, motion_file, motion_overrides)
            if template_name is None:
                template_name = template_name_for_motion(base_config, motion_file, motion_overrides)
            clip_config_for_skip = make_clip_config(
                base_config,
                motion_file,
                out_path,
                motion_overrides,
                temp_config_path,
                template_name,
            )
            if retarget_result_compatible(out_path, clip_config_for_skip, quiet=True):
                print(f"[BatchRetarget][skip][{idx:04d}/{len(motions):04d}] {out_path}")
                continue
            print(f"[BatchRetarget][rebuild][{idx:04d}/{len(motions):04d}] incompatible cached result: {out_path}")
        if template_config is None:
            template_config = template_config_for_motion(base_config, motion_file, motion_overrides)
        if template_name is None:
            template_name = template_name_for_motion(base_config, motion_file, motion_overrides)
        template_configs.setdefault(template_name, template_config)
        clip_entries.append(
            {
                "index": idx,
                "motion_file": motion_file,
                "stem": stem,
                "out_path": out_path,
                "temp_config_path": temp_config_path,
                "template_name": template_name,
            }
        )

    configured_correspondence_devices = (
        args.correspondence_devices
        if args.correspondence_devices is not None
        else batch.get("correspondence_devices")
    )
    correspondence_devices = (
        parse_gpu_ids(configured_correspondence_devices)
        if configured_correspondence_devices is not None
        else []
    )
    if correspondence_devices:
        for index, template_config in enumerate(template_configs.values()):
            correspondence_config = dict(template_config.get("correspondence", {}) or {})
            train_config = dict(correspondence_config.get("train", {}) or {})
            device = correspondence_devices[index % len(correspondence_devices)]
            train_config["device"] = device if device.startswith("cuda") else f"cuda:{device}"
            correspondence_config["train"] = train_config
            template_config["correspondence"] = correspondence_config
        print(f"[BatchRetarget] correspondence devices={correspondence_devices}")

    correspondence_build_device = str(batch.get("correspondence_build_device", "")).strip()
    previous_soma_device = os.environ.get("UMR_SOMA_DEVICE")
    if correspondence_build_device:
        os.environ["UMR_SOMA_DEVICE"] = correspondence_build_device

    slots_by_template: dict[str, Path] = {}
    smpl_name_by_template: dict[str, str] = {}
    if template_configs:
        active_correspondence_workers = max(1, min(int(correspondence_workers), len(template_configs)))
        print(
            f"[BatchRetarget] preparing correspondence_templates={len(template_configs)} "
            f"correspondence_workers={active_correspondence_workers}"
        )
        if active_correspondence_workers == 1:
            for template_name, template_config in template_configs.items():
                prepared_name, slots_path, smpl_name = prepare_correspondence_template(
                    template_name,
                    template_config,
                    force_build=args.force_build,
                    force_train=args.force_train,
                    dry_run=args.dry_run,
                    print_lock=print_lock,
                )
                slots_by_template[prepared_name] = slots_path
                smpl_name_by_template[prepared_name] = smpl_name
        else:
            with ThreadPoolExecutor(max_workers=active_correspondence_workers) as executor:
                futures = {
                    executor.submit(
                        prepare_correspondence_template,
                        template_name,
                        template_config,
                        force_build=args.force_build,
                        force_train=args.force_train,
                        dry_run=args.dry_run,
                        print_lock=print_lock,
                    ): template_name
                    for template_name, template_config in template_configs.items()
                }
                for future in as_completed(futures):
                    template_name = futures[future]
                    try:
                        prepared_name, slots_path, smpl_name = future.result()
                    except Exception as exc:
                        with print_lock:
                            print(f"[BatchRetarget][corr] FAILED template={template_name}: {exc}")
                        raise
                    slots_by_template[prepared_name] = slots_path
                    smpl_name_by_template[prepared_name] = smpl_name

    if previous_soma_device is None:
        os.environ.pop("UMR_SOMA_DEVICE", None)
    else:
        os.environ["UMR_SOMA_DEVICE"] = previous_soma_device

    if preloaded_template_configs and not clip_entries:
        include_flat_smplx_dirs = bool(batch.get("include_flat_smplx_dirs", False))
        print(
            f"[BatchRetarget] discovering BONES-SEED motions folder={motion_folder} "
            f"recursive={recursive} patterns={patterns}"
        )
        motions = discover_motion_files(
            motion_folder,
            patterns,
            recursive,
            include_flat_smplx_dirs=include_flat_smplx_dirs,
        )
        if args.limit and int(args.limit) > 0:
            motions = motions[: int(args.limit)]
        if not motions:
            raise FileNotFoundError(f"No motion files found in {motion_folder} for patterns={patterns}")
        for idx, motion_file in enumerate(motions, start=1):
            stem = sanitize_stem(motion_file, motion_folder)
            out_path = result_root / f"{stem}_{robot_name}.npz"
            temp_config_path = config_root / f"{stem}_{robot_name}.json"
            template_name = template_name_for_motion(base_config, motion_file, motion_overrides)
            if template_name not in slots_by_template:
                raise KeyError(
                    f"No correspondence was prepared for {template_name}; motion={motion_file}. "
                    "Check the matching BONES-SEED shape file under shapes/."
                )
            if skip_existing and out_path.exists():
                clip_config_for_skip = make_clip_config(
                    base_config,
                    motion_file,
                    out_path,
                    motion_overrides,
                    temp_config_path,
                    template_name,
                )
                if retarget_result_compatible(out_path, clip_config_for_skip, quiet=True):
                    print(f"[BatchRetarget][skip][{idx:04d}/{len(motions):04d}] {out_path}")
                    continue
                print(f"[BatchRetarget][rebuild][{idx:04d}/{len(motions):04d}] incompatible cached result: {out_path}")
            clip_entries.append(
                {
                    "index": idx,
                    "motion_file": motion_file,
                    "stem": stem,
                    "out_path": out_path,
                    "temp_config_path": temp_config_path,
                    "template_name": template_name,
                }
            )

    if args.correspondence_only:
        motion_templates = [
            {
                "motion": str(entry["motion_file"]),
                "template": str(entry["template_name"]),
            }
            for entry in clip_entries
        ]
        templates = {}
        for template_name, slots_path in sorted(slots_by_template.items()):
            matching = [item for item in motion_templates if item["template"] == template_name]
            templates[template_name] = {
                "motion_count": len(matching),
                "example_motion": matching[0]["motion"] if matching else None,
                "slots": str(slots_path),
                "smpl_name": str(smpl_name_by_template[template_name]),
            }
        summary = {
            "robot": robot_name,
            "motion_folder": str(motion_folder),
            "patterns": patterns,
            "motion_count": len(motions),
            "unique_template_count": len(templates),
            "templates": templates,
            "motion_templates": motion_templates,
        }
        summary_path = result_root / "correspondence_summary.json"
        summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True))
        print(
            f"[BatchRetarget] correspondence-only complete motions={len(motions)} "
            f"templates={len(templates)} summary={summary_path}"
        )
        return

    decoupled_source_preprocess = bool(batch_retarget.get("decoupled_source_preprocess", False))
    source_feature_workers_per_gpu = max(1, int(batch_retarget.get("source_feature_workers_per_gpu", 2)))
    source_feeder_devices = [
        gpu_id
        for gpu_id in retarget_gpus
        for _worker_index in range(source_feature_workers_per_gpu)
    ]
    if decoupled_source_preprocess and not retarget_gpus:
        raise ValueError("decoupled_source_preprocess=true requires at least one --retarget-gpus device")
    source_cache_tmp = None
    source_cache_root = None
    if decoupled_source_preprocess:
        configured_cache_root = batch_retarget.get("source_feature_cache_root")
        if configured_cache_root:
            source_cache_root = batch_path(None, configured_cache_root, args.batch_config)
            source_cache_root.mkdir(parents=True, exist_ok=True)
        else:
            source_cache_tmp = tempfile.TemporaryDirectory(prefix="umr_source_features_", dir="/tmp")
            atexit.register(source_cache_tmp.cleanup)
            source_cache_root = Path(source_cache_tmp.name)

    tasks = []
    for entry in clip_entries:
        idx = int(entry["index"])
        motion_file = Path(entry["motion_file"])
        stem = str(entry["stem"])
        out_path = Path(entry["out_path"])
        temp_config_path = Path(entry["temp_config_path"])
        template_name = str(entry["template_name"])
        slots_path = slots_by_template[template_name]
        correspondence_smpl_name = smpl_name_by_template[template_name]
        clip_config = make_clip_config(
            base_config,
            motion_file,
            out_path,
            motion_overrides,
            temp_config_path,
            correspondence_smpl_name,
        )
        temp_config_path.parent.mkdir(parents=True, exist_ok=True)
        temp_config_path.write_text(json.dumps(clean_config(clip_config), indent=2, sort_keys=True))
        cmd = [
            PYTHON,
            str(SCRIPTS / "retarget_smpl_to_humanoid_surface_vector_batch.py"),
            "--config",
            str(temp_config_path),
            "--data",
            str(motion_file),
            "--seq-key",
            motion_file.stem,
            "--seq-index",
            "0",
            "--start",
            str(motion_overrides.get("start", 0)),
            "--end",
            str(motion_overrides.get("end", -1)),
            "--stride",
            str(motion_overrides.get("stride", 1)),
            "--max-frames",
            str(motion_overrides.get("max_frames", 0)),
            "--slots",
            str(slots_path),
            "--out",
            str(out_path),
        ]
        if int(batch_retarget.get("stream_chunk_frames", 0)) > 0:
            cmd.extend(["--stream-chunk-frames", str(int(batch_retarget["stream_chunk_frames"]))])
        corr = section(base_config, "correspondence")
        if corr.get("slots_field"):
            cmd.extend(["--slots-field", str(corr["slots_field"])])
        source_feature_cache = None
        preprocess_argv = None
        if decoupled_source_preprocess:
            source_feature_cache = source_cache_root / f"{stem}_{robot_name}.source_features.npz"
            cmd.extend(["--source-feature-cache", str(source_feature_cache)])
            preprocess_argv = [
                *cmd[2:],
                "--prepare-source-cache-only",
                "--smplx-device",
                "cuda",
            ]
        retarget_cuda_device = (
            None
            if decoupled_source_preprocess
            else (retarget_gpus[(idx - 1) % len(retarget_gpus)] if retarget_gpus else None)
        )
        tasks.append(
            {
                "index": idx,
                "total": len(motions),
                "motion_file": motion_file,
                "out_path": out_path,
                "temp_config_path": temp_config_path,
                "cmd": cmd,
                "preprocess_argv": preprocess_argv,
                "source_feature_cache": source_feature_cache,
                "dry_run": args.dry_run,
                "retarget_cpu_threads": retarget_cpu_threads,
                "retarget_cuda_device": retarget_cuda_device,
                "compact_log": compact_log,
                "tail_lines_on_error": tail_lines,
            }
        )

    print(
        f"[BatchRetarget] robot={robot_name} motions={len(motions)} queued={len(tasks)} "
        f"workers={workers} retarget_cpu_threads={retarget_cpu_threads} "
        f"retarget_gpus={','.join(retarget_gpus) if retarget_gpus else 'cpu'} "
        f"decoupled_source_preprocess={decoupled_source_preprocess} folder={motion_folder}"
    )
    print(f"[BatchRetarget] correspondence_templates={len(slots_by_template)}")
    for template_name, template_slots_path in sorted(slots_by_template.items()):
        print(
            f"[BatchRetarget] correspondence_slots[{template_name}]="
            f"{template_slots_path} smpl_name={smpl_name_by_template[template_name]}"
        )
    print(f"[BatchRetarget] output_root={result_root}")
    temp_suffix = " (temporary; auto-cleanup)" if temp_config_tmp is not None else ""
    print(f"[BatchRetarget] temp_config_root={config_root}{temp_suffix}")

    results = []
    results_lock = threading.Lock()
    use_progress_bars = bool(batch.get("progress_bars", True)) and tqdm is not None and not args.dry_run
    if use_progress_bars:
        print("[BatchRetarget] progress_bars=true; normal worker logs are hidden until failure.")

    active_workers = max(1, min(int(workers), max(1, len(tasks))))
    task_queue = Queue(maxsize=max(active_workers, 1))
    threads = [
        threading.Thread(
            target=worker_loop,
            args=(worker_id, task_queue, results, results_lock, print_lock, use_progress_bars),
            daemon=False,
        )
        for worker_id in range(active_workers)
    ]
    for thread in threads:
        thread.start()
    if decoupled_source_preprocess and not args.dry_run:
        print(
            f"[BatchRetarget] source_feature_feeders={len(source_feeder_devices)} "
            f"workers_per_gpu={source_feature_workers_per_gpu} "
            f"cpu_retarget_workers={active_workers} cache_root={source_cache_root}"
        )
        mp_context = multiprocessing.get_context("spawn")
        executors = [
            ProcessPoolExecutor(
                max_workers=1,
                mp_context=mp_context,
                initializer=initialize_source_preprocess_worker,
                initargs=(gpu_id, 1),
            )
            for gpu_id in source_feeder_devices
        ]
        task_iter = iter(tasks)
        pending = {}

        def submit_next(executor_index):
            try:
                task = next(task_iter)
            except StopIteration:
                return False
            future = executors[executor_index].submit(
                run_source_preprocess_task,
                list(task["preprocess_argv"]),
                str(task["source_feature_cache"]),
                str(task["motion_file"]),
            )
            pending[future] = (executor_index, task)
            return True

        for executor_index in range(len(executors)):
            submit_next(executor_index)
        try:
            while pending:
                completed, _not_done = wait(tuple(pending), return_when=FIRST_COMPLETED)
                for future in completed:
                    executor_index, task = pending.pop(future)
                    try:
                        future.result()
                    except Exception as exc:
                        failure = {
                            "status": "failed",
                            "code": -2,
                            "stage": "source_feature_preprocess",
                            "motion": str(task["motion_file"]),
                            "out": str(task["out_path"]),
                            "error": repr(exc),
                        }
                        with results_lock:
                            results.append(failure)
                        with print_lock:
                            print(
                                f"[SourceFeatureFeeder][FAILED] gpu={source_feeder_devices[executor_index]} "
                                f"motion={task['motion_file']} error={exc!r}"
                            )
                    else:
                        task_queue.put(task)
                    submit_next(executor_index)
        finally:
            for executor in executors:
                executor.shutdown(wait=True, cancel_futures=True)
    else:
        for task in tasks:
            task_queue.put(task)
    for _ in threads:
        task_queue.put(None)
    task_queue.join()
    for thread in threads:
        thread.join()

    summary = {
        "robot": robot_name,
        "motion_folder": str(motion_folder),
        "patterns": patterns,
        "workers": workers,
        "retarget_cpu_threads": retarget_cpu_threads,
        "retarget_gpus": retarget_gpus,
        "decoupled_source_preprocess": decoupled_source_preprocess,
        "source_feature_feeders": len(source_feeder_devices) if decoupled_source_preprocess else 0,
        "source_feature_workers_per_gpu": source_feature_workers_per_gpu,
        "stream_chunk_frames": int(batch_retarget.get("stream_chunk_frames", 0)),
        "results": sorted(results, key=lambda item: item["motion"]),
    }
    summary_path = result_root / "batch_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True))
    ok = sum(1 for item in results if item["status"] in {"ok", "dry_run"})
    failed = sum(1 for item in results if item["status"] == "failed")
    print(f"[BatchRetarget] summary={summary_path} ok={ok} failed={failed}")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Batch-retarget converted HiPHI sequences with shared correspondence."""
from __future__ import annotations

import argparse
import atexit
import json
import re
import shlex
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from queue import Queue
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from hiphi_layout import load_hiphi_metadata, resolve_hiphi_objects  # noqa: E402
from humanoid_retarget_config import load_config, resolve_path, robot_config, section  # noqa: E402
from humanoid_retarget_pipeline import correspondence_slots_compatible, slots_out  # noqa: E402
from humanoid_retarget_pipeline_batch import (  # noqa: E402
    bar_write,
    batch_path,
    load_json,
    parse_gpu_ids,
    retarget_worker_env,
    set_bar_state,
    worker_loop,
)
from humanoid_retarget_pipeline_hsi_hoi import (  # noqa: E402
    hsi_result_compatible,
    load_hsi_hoi_config,
)
try:
    from tqdm import tqdm
except ImportError:
    tqdm = None


PYTHON = sys.executable
DEFAULT_CONFIG = ROOT / "robot_configs" / "humanoid_retarget_unitree_g1_example.json"
DEFAULT_DEFAULTS = ROOT / "humanoid_retarget_defaults_hiphi.json"
DEFAULT_BATCH_CONFIG = ROOT / "humanoid_retarget_defaults_batch_hiphi.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="Robot config with shared beta-zero correspondence.")
    parser.add_argument("--defaults", type=Path, default=DEFAULT_DEFAULTS, help="HiPHI source and solver defaults.")
    parser.add_argument("--batch-config", type=Path, default=DEFAULT_BATCH_CONFIG)
    parser.add_argument("--data-root", type=Path, default=None, help="HiPHI root containing data/ and object_meshes/.")
    parser.add_argument("--sequence", action="append", default=None, help="Only process this motion id; repeatable.")
    parser.add_argument("--output-root", type=Path, default=None)
    parser.add_argument("--workers", type=int, default=None, help="Parallel retarget jobs. Default is deliberately 1.")
    parser.add_argument("--object-workers", type=int, default=None, help="Parallel convex decompositions. Default is deliberately 1.")
    parser.add_argument("--object-cpu-threads", type=int, default=None, help="CPU thread limit per convex-decomposition child.")
    parser.add_argument("--retarget-cpu-threads", type=int, default=None, help="CPU thread limit per retarget child.")
    parser.add_argument("--retarget-gpus", type=str, default=None, help="Comma-separated GPU ids, auto, or none.")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--start", type=int, default=None)
    parser.add_argument("--end", type=int, default=None)
    parser.add_argument("--stride", type=int, default=None)
    parser.add_argument("--max-frames", type=int, default=None)
    parser.add_argument(
        "--stream-chunk-frames",
        type=int,
        default=None,
        help="Frames of source geometry/contact data retained per retarget worker.",
    )
    parser.add_argument("--force-object-preprocess", action="store_true")
    parser.add_argument("--force-build", action="store_true")
    parser.add_argument("--force-train", action="store_true")
    parser.add_argument("--force-retarget", action="store_true")
    parser.add_argument("--no-skip-existing", action="store_true")
    parser.add_argument("--object-only", action="store_true")
    parser.add_argument("--correspondence-only", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def resolve_repo_path(path: Path) -> Path:
    path = Path(path)
    return path.resolve() if path.is_absolute() else (ROOT / path).resolve()


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value)).strip("_") or "sequence"


def discover_sequences(data_root: Path, requested: list[str] | None, limit: int) -> list[Path]:
    search_root = data_root / "data" if (data_root / "data").is_dir() else data_root
    sequences = []
    for metadata_path in sorted(search_root.rglob("metadata.json")):
        sequence_dir = metadata_path.parent
        try:
            load_hiphi_metadata(sequence_dir)
        except (ValueError, FileNotFoundError, json.JSONDecodeError):
            continue
        if not (sequence_dir / "motion_actor_smplx.npz").is_file():
            raise FileNotFoundError(f"HiPHI SMPL-X motion not found: {sequence_dir / 'motion_actor_smplx.npz'}")
        sequences.append(sequence_dir.resolve())
    sequences = sorted(set(sequences))
    if requested:
        requested_set = {str(value) for value in requested}
        selected = [
            path
            for path in sequences
            if path.name in requested_set or path.relative_to(search_root.resolve()).as_posix() in requested_set
        ]
        matched = {
            value
            for value in requested_set
            if any(path.name == value or path.relative_to(search_root.resolve()).as_posix() == value for path in selected)
        }
        missing = sorted(requested_set - matched)
        if missing:
            raise FileNotFoundError(f"HiPHI motion ids not found under {search_root}: {missing}")
        sequences = selected
    if limit > 0:
        sequences = sequences[:limit]
    if not sequences:
        raise FileNotFoundError(f"No converted HiPHI sequences found under {search_root}")
    return sequences


def unique_objects(sequences: list[Path]) -> list[dict[str, Any]]:
    by_mesh: dict[str, dict[str, Any]] = {}
    for sequence_dir in sequences:
        for item in resolve_hiphi_objects(sequence_dir):
            key = str(Path(item["obj"]).resolve())
            record = by_mesh.setdefault(
                key,
                {
                    "item": item,
                    "sequence": sequence_dir,
                    "motion_ids": [],
                    "object_ids": [],
                },
            )
            record["motion_ids"].append(sequence_dir.name)
            if item["name"] not in record["object_ids"]:
                record["object_ids"].append(item["name"])
    return [by_mesh[key] for key in sorted(by_mesh)]


def object_command(record: dict[str, Any], settings: dict[str, Any], force: bool) -> list[str]:
    item = record["item"]
    command = [
        PYTHON,
        str(SCRIPTS / "prepare_hiphi_object_mjcf.py"),
        "--data",
        str(record["sequence"]),
        "--object-id",
        str(item["name"]),
        "--threshold",
        str(settings["threshold"]),
        "--max-convex-hull",
        str(settings["max_convex_hull"]),
        "--mcts-iterations",
        str(settings["mcts_iterations"]),
        "--resolution",
        str(settings["resolution"]),
        "--mesh-scale",
        str(settings["mesh_scale"]),
    ]
    if force:
        command.append("--overwrite")
    if not settings["validate"]:
        command.append("--no-validate")
    return command


def existing_object_asset(item: dict[str, str]) -> tuple[Path, list[Path]] | None:
    """Fast batch check: require only a non-empty MJCF and collision hull."""
    visual_obj = Path(item["obj"])
    xml_path = Path(item["xml"])
    collision_dir = xml_path.parent / "object_collision" / visual_obj.stem
    if not xml_path.is_file() or xml_path.stat().st_size == 0:
        return None
    parts = sorted(
        path
        for path in collision_dir.glob("collision_*.obj")
        if path.is_file() and path.stat().st_size > 0
    )
    return (xml_path, parts) if parts else None


def run_object_task(
    index: int,
    total: int,
    record: dict[str, Any],
    settings: dict[str, Any],
    *,
    force: bool,
    dry_run: bool,
    cpu_threads: int,
) -> dict[str, Any]:
    item = record["item"]
    prefix = f"[HiPHIBatch][object][{index:03d}/{total:03d}]"
    command = object_command(record, settings, force)
    if dry_run:
        return {
            "status": "dry_run",
            "object": item["name"],
            "mesh": item["obj"],
            "command": shlex.join(command),
        }
    completed = subprocess.run(
        command,
        cwd=ROOT,
        env=retarget_worker_env(cpu_threads=cpu_threads, cuda_device=None),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    output = completed.stdout.strip()
    if completed.returncode != 0:
        return {
            "status": "failed",
            "code": completed.returncode,
            "object": item["name"],
            "mesh": item["obj"],
            "error": output,
        }
    return {
        "status": "prepared",
        "object": item["name"],
        "mesh": item["obj"],
        "log": output.splitlines()[-1] if output else f"{prefix} prepared",
    }



def object_worker_loop(
    worker_id: int,
    task_queue: Queue,
    results: list[dict[str, Any]],
    results_lock: threading.Lock,
    print_lock: threading.Lock,
    use_progress_bars: bool,
    overall_bar=None,
) -> None:
    progress_bar = None
    if use_progress_bars and tqdm is not None:
        progress_bar = tqdm(
            total=1,
            position=worker_id,
            leave=True,
            dynamic_ncols=True,
            desc=f"Object W{worker_id:02d}",
        )
    try:
        while True:
            task = task_queue.get()
            if task is None:
                task_queue.task_done()
                break
            index = int(task["index"])
            total = int(task["total"])
            record = task["record"]
            item = record["item"]
            mesh_name = Path(item["obj"]).name
            prefix = f"[HiPHIBatch][object][W{worker_id:02d}][{index:03d}/{total:03d}]"
            bar_desc = f"Object W{worker_id:02d} {index:03d}/{total:03d}"
            set_bar_state(progress_bar, 1, 0, bar_desc, f"decomposing {mesh_name}")
            if progress_bar is None:
                with print_lock:
                    print(f"{prefix} decomposing {mesh_name}")
            try:
                result = run_object_task(
                    index,
                    total,
                    record,
                    task["settings"],
                    force=bool(task["force"]),
                    dry_run=bool(task["dry_run"]),
                    cpu_threads=int(task["cpu_threads"]),
                )
            except Exception as exc:
                result = {
                    "status": "failed",
                    "code": -1,
                    "object": item["name"],
                    "mesh": item["obj"],
                    "error": repr(exc),
                }

            status = str(result.get("status", "failed"))
            if status == "failed":
                set_bar_state(progress_bar, 1, 0, bar_desc, "FAILED")
                bar_write(print_lock, f"{prefix} FAILED code={result.get('code', -1)}")
                error = str(result.get("error", "")).strip()
                if error:
                    for line in error.splitlines()[-40:]:
                        bar_write(print_lock, f"{prefix} tail> {line}")
            else:
                postfix = "dry-run" if status == "dry_run" else "done"
                set_bar_state(progress_bar, 1, 1, bar_desc, postfix)
                if progress_bar is None:
                    message = result.get("log") or result.get("command") or postfix
                    with print_lock:
                        print(f"{prefix} {message}")

            with results_lock:
                results.append(result)
            if overall_bar is not None:
                with print_lock:
                    overall_bar.update(1)
            task_queue.task_done()
    finally:
        if progress_bar is not None:
            progress_bar.close()

def prepare_objects(
    records: list[dict[str, Any]],
    settings: dict[str, Any],
    *,
    workers: int,
    cpu_threads: int,
    force: bool,
    dry_run: bool,
    progress_bars: bool,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    pending: list[tuple[int, dict[str, Any]]] = []
    for index, record in enumerate(records, start=1):
        item = record["item"]
        reusable = None if force else existing_object_asset(item)
        if reusable is not None:
            xml_path, parts = reusable
            result = {
                "status": "reused",
                "object": item["name"],
                "mesh": item["obj"],
                "xml": str(xml_path),
                "collision_parts": len(parts),
            }
            results.append(result)
            print(
                f"[HiPHIBatch][object][{index:03d}/{len(records):03d}] "
                f"reuse mesh={Path(item['obj']).name} parts={len(parts)}"
            )
        else:
            pending.append((index, record))
    if not pending:
        return results

    active_workers = max(1, min(int(workers), len(pending)))
    print(
        f"[HiPHIBatch][object] missing_or_stale={len(pending)} workers={active_workers} "
        f"cpu_threads_per_worker={cpu_threads}"
    )
    if active_workers > 1:
        print(
            "[HiPHIBatch][object][WARN] concurrent convex decomposition increases peak memory; "
            "use --object-workers 1 if memory is limited."
        )
    use_progress_bars = bool(progress_bars and tqdm is not None and not dry_run)
    if use_progress_bars:
        print(
            "[HiPHIBatch][object] progress_bars=true; one activity bar per worker "
            "plus aggregate object completion."
        )
    print_lock = threading.Lock()
    results_lock = threading.Lock()
    overall_bar = None
    if use_progress_bars and tqdm is not None:
        overall_bar = tqdm(
            total=len(pending),
            position=active_workers,
            leave=True,
            dynamic_ncols=True,
            desc="Objects total",
        )
    task_queue: Queue = Queue(maxsize=active_workers)
    threads = [
        threading.Thread(
            target=object_worker_loop,
            args=(
                worker_id,
                task_queue,
                results,
                results_lock,
                print_lock,
                use_progress_bars,
                overall_bar,
            ),
            daemon=False,
        )
        for worker_id in range(active_workers)
    ]
    for thread in threads:
        thread.start()
    for index, record in pending:
        task_queue.put(
            {
                "index": index,
                "total": len(records),
                "record": record,
                "settings": settings,
                "force": force,
                "dry_run": dry_run,
                "cpu_threads": cpu_threads,
            }
        )
    for _thread in threads:
        task_queue.put(None)
    task_queue.join()
    for thread in threads:
        thread.join()
    if overall_bar is not None:
        overall_bar.close()
    return sorted(results, key=lambda item: (item["mesh"], item["object"]))


def ensure_shared_correspondence(
    config_path: Path,
    *,
    force_build: bool,
    force_train: bool,
    dry_run: bool,
) -> dict[str, Any]:
    config = load_config(config_path)
    slots_path = slots_out(config)
    reusable = (
        not force_build
        and not force_train
        and slots_path.is_file()
        and correspondence_slots_compatible(slots_path, config)
    )
    if reusable:
        print(f"[HiPHIBatch][corr] reuse slots={slots_path}")
        return {"status": "reused", "slots": str(slots_path)}
    command = [
        PYTHON,
        str(SCRIPTS / "humanoid_retarget_pipeline.py"),
        "--config",
        str(config_path),
        "--stage",
        "train",
        "--skip-view",
    ]
    if force_build:
        command.append("--force-build")
    if force_train:
        command.append("--force-train")
    if dry_run:
        print(f"[HiPHIBatch][corr] dry-run {shlex.join(command)}")
        return {"status": "dry_run", "slots": str(slots_path), "command": shlex.join(command)}
    print(f"[HiPHIBatch][corr] prepare shared beta-zero correspondence slots={slots_path}")
    completed = subprocess.run(command, cwd=ROOT)
    if completed.returncode != 0:
        raise RuntimeError(f"Shared correspondence preparation failed with exit code {completed.returncode}")
    if not slots_path.is_file() or not correspondence_slots_compatible(slots_path, config):
        raise RuntimeError(f"Shared correspondence was not produced or is incompatible: {slots_path}")
    return {"status": "prepared", "slots": str(slots_path)}


def write_summary(path: Path, payload: dict[str, Any], dry_run: bool) -> None:
    if dry_run:
        print(f"[HiPHIBatch] would write summary={path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"[HiPHIBatch] summary={path}")


def main() -> None:
    args = parse_args()
    args.config = resolve_repo_path(args.config)
    args.defaults = resolve_repo_path(args.defaults)
    args.batch_config = resolve_repo_path(args.batch_config)
    batch_config = load_json(args.batch_config)
    batch = section(batch_config, "batch")
    batch_retarget = section(batch_config, "retarget")
    object_settings = {
        "threshold": 0.03,
        "max_convex_hull": 32,
        "mcts_iterations": 200,
        "resolution": 2000,
        "mesh_scale": 0.01,
        "validate": True,
        **section(batch_config, "object_preprocess"),
    }
    data_root = batch_path(
        args.data_root,
        batch.get("data_root", "sample_data/hiphi"),
        args.batch_config,
    )
    output_root = batch_path(
        args.output_root,
        batch.get("output_root", "output/batch_retarget_hiphi"),
        args.batch_config,
    )
    workers = int(args.workers if args.workers is not None else batch.get("workers", 1))
    object_workers = int(
        args.object_workers if args.object_workers is not None else batch.get("object_workers", 1)
    )
    object_cpu_threads = int(
        args.object_cpu_threads
        if args.object_cpu_threads is not None
        else batch.get("object_cpu_threads", 1)
    )
    retarget_cpu_threads = int(
        args.retarget_cpu_threads
        if args.retarget_cpu_threads is not None
        else batch.get("retarget_cpu_threads", 1)
    )
    stream_chunk_frames = int(
        args.stream_chunk_frames
        if args.stream_chunk_frames is not None
        else batch_retarget.get("stream_chunk_frames", 300)
    )
    for name, value in (
        ("workers", workers),
        ("object_workers", object_workers),
        ("object_cpu_threads", object_cpu_threads),
        ("retarget_cpu_threads", retarget_cpu_threads),
    ):
        if value < 1:
            raise ValueError(f"{name} must be at least 1")
    if stream_chunk_frames < 1:
        raise ValueError("stream_chunk_frames must be at least 1 for HiPHI batch retargeting")
    retarget_gpus = parse_gpu_ids(
        args.retarget_gpus if args.retarget_gpus is not None else batch.get("retarget_gpus", "none")
    )
    skip_existing = bool(batch.get("skip_existing", True)) and not args.no_skip_existing
    compact_log = bool(batch.get("compact_log", True))
    progress_bars = bool(batch.get("progress_bars", True))
    tail_lines = int(batch.get("tail_lines_on_error", 80))

    sequences = discover_sequences(data_root, args.sequence, int(args.limit))
    config = load_config(args.config)
    robot_name = safe_name(robot_config(config)["name"])
    result_root = output_root / robot_name
    summary_path = result_root / "batch_summary.json"
    objects = unique_objects(sequences)
    print(
        f"[HiPHIBatch] data_root={data_root} sequences={len(sequences)} "
        f"unique_objects={len(objects)} robot={robot_name}"
    )
    print(
        f"[HiPHIBatch] memory-safe defaults object_workers={object_workers} "
        f"retarget_workers={workers}"
    )

    object_results = prepare_objects(
        objects,
        object_settings,
        workers=object_workers,
        cpu_threads=object_cpu_threads,
        force=args.force_object_preprocess,
        dry_run=args.dry_run,
        progress_bars=progress_bars,
    )
    object_failures = [item for item in object_results if item["status"] == "failed"]
    base_summary: dict[str, Any] = {
        "robot": robot_name,
        "data_root": str(data_root),
        "sequence_count": len(sequences),
        "sequences": [str(path) for path in sequences],
        "object_workers": object_workers,
        "retarget_workers": workers,
        "retarget_cpu_threads": retarget_cpu_threads,
        "retarget_gpus": retarget_gpus,
        "stream_chunk_frames": stream_chunk_frames,
        "objects": object_results,
    }
    if object_failures:
        base_summary["results"] = []
        write_summary(summary_path, base_summary, args.dry_run)
        raise SystemExit(1)
    if args.object_only:
        base_summary["results"] = []
        write_summary(summary_path, base_summary, args.dry_run)
        return

    compatibility_config = load_hsi_hoi_config(args.config, args.defaults)
    shared_config_value = section(compatibility_config, "correspondence").get("shared_config")
    if not shared_config_value:
        raise ValueError("HiPHI batch config requires correspondence.shared_config")
    shared_config_path = resolve_path(shared_config_value, compatibility_config)
    if shared_config_path is None or not shared_config_path.is_file():
        raise FileNotFoundError(
            f"HiPHI shared-correspondence config not found: {shared_config_path}"
        )
    correspondence = ensure_shared_correspondence(
        shared_config_path,
        force_build=args.force_build,
        force_train=args.force_train,
        dry_run=args.dry_run,
    )
    base_summary["correspondence"] = correspondence
    if args.correspondence_only:
        base_summary["results"] = []
        write_summary(summary_path, base_summary, args.dry_run)
        return

    compatibility_config.setdefault("motion", {})
    for key in ("start", "end", "stride", "max_frames"):
        value = getattr(args, key)
        if value is not None:
            compatibility_config["motion"][key] = value

    runtime_tmp = None
    if args.dry_run:
        runtime_root = Path("/tmp/umr_hiphi_batch_dry_run")
    else:
        runtime_tmp = tempfile.TemporaryDirectory(prefix="umr_hiphi_batch_", dir="/tmp")
        atexit.register(runtime_tmp.cleanup)
        runtime_root = Path(runtime_tmp.name)

    tasks: list[dict[str, Any]] = []
    results: list[dict[str, Any]] = []
    for index, sequence_dir in enumerate(sequences, start=1):
        out_path = result_root / f"{safe_name(sequence_dir.name)}_hsi_hoi_{robot_name}.npz"
        motion_npz = sequence_dir / "motion_actor_smplx.npz"
        if (
            skip_existing
            and hsi_result_compatible(
                out_path,
                compatibility_config,
                motion_npz,
                sequence_dir.name,
                sequence_dir,
            )
        ):
            print(f"[HiPHIBatch][skip][{index:04d}/{len(sequences):04d}] {out_path}")
            results.append(
                {
                    "status": "skipped",
                    "motion": str(sequence_dir),
                    "out": str(out_path),
                }
            )
            continue
        task_work_dir = runtime_root / f"{index:04d}_{safe_name(sequence_dir.name)}"
        runtime_config_path = (
            task_work_dir
            / "configs"
            / f"{safe_name(sequence_dir.name)}_runtime_config.json"
        )
        command = [
            PYTHON,
            str(SCRIPTS / "humanoid_retarget_pipeline_hiphi.py"),
            "--config",
            str(args.config),
            "--defaults",
            str(args.defaults),
            "--data",
            str(sequence_dir),
            "--stage",
            "all",
            "--out",
            str(out_path),
            "--stream-chunk-frames",
            str(stream_chunk_frames),
            "--work-dir",
            str(task_work_dir),
            "--skip-view",
        ]
        for key in ("start", "end", "stride", "max_frames"):
            value = getattr(args, key)
            if value is not None:
                command.extend(["--" + key.replace("_", "-"), str(value)])
        if args.force_retarget or not skip_existing:
            command.append("--force-retarget")
        tasks.append(
            {
                "index": index,
                "total": len(sequences),
                "motion_file": sequence_dir,
                "out_path": out_path,
                "temp_config_path": runtime_config_path,
                "cmd": command,
                "dry_run": args.dry_run,
                "retarget_cpu_threads": retarget_cpu_threads,
                "retarget_cuda_device": (
                    retarget_gpus[(index - 1) % len(retarget_gpus)] if retarget_gpus else None
                ),
                "compact_log": compact_log,
                "tail_lines_on_error": tail_lines,
            }
        )

    active_workers = max(1, min(workers, len(tasks)))
    print(
        f"[HiPHIBatch] retarget queued={len(tasks)} workers={active_workers} "
        f"cpu_threads_per_worker={retarget_cpu_threads} "
        f"stream_chunk_frames={stream_chunk_frames} "
        f"gpus={','.join(retarget_gpus) if retarget_gpus else 'cpu'} output={result_root}"
    )
    results_lock = threading.Lock()
    print_lock = threading.Lock()
    use_progress_bars = progress_bars and tqdm is not None and not args.dry_run
    task_queue: Queue = Queue(maxsize=active_workers)
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
    for task in tasks:
        task_queue.put(task)
    for _thread in threads:
        task_queue.put(None)
    task_queue.join()
    for thread in threads:
        thread.join()
    if runtime_tmp is not None:
        runtime_tmp.cleanup()
        atexit.unregister(runtime_tmp.cleanup)

    base_summary["results"] = sorted(results, key=lambda item: item["motion"])
    write_summary(summary_path, base_summary, args.dry_run)
    ok = sum(item["status"] in {"ok", "skipped", "dry_run"} for item in results)
    failed = sum(item["status"] == "failed" for item in results)
    print(f"[HiPHIBatch] complete ok={ok} failed={failed}")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

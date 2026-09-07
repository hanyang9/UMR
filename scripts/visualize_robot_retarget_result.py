#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import ctypes.util
import copy
import csv
import os
import queue
import re
import sys
import tempfile
import threading
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import mujoco
import mujoco.viewer
import numpy as np
from scipy.spatial.transform import Rotation as R

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
ELEMENTS_ROOT = ROOT
ASSETS_ROOT = ROOT / "assets"


DEFAULT_RESULT = ROOT / "output/pipluspro_retarget/smpl_motion_pipluspro.npz"
DEFAULT_PIPLUSPRO_XML = ASSETS_ROOT / "PiPlusPro/xml/PiPlusPro_S_12L10A2G2H1W_ZedMini.xml"
DEFAULT_H2_XML = ASSETS_ROOT / "h2_description/H2_stl_mjcf.xml"
VIS_PREFIX = "RetargetVis"
CAPTURE_WIDTH = 2560
CAPTURE_HEIGHT = 1440
CAPTURE_DIR = ROOT / "visualizations/viewer_captures"
ABS_ELEMENTS_PATH_RE = re.compile(r"/media/[^/]+/Elements(?:/[^\s\"'<>]+)?")
LEGACY_REPO_PREFIXES = (
    ("unidynsolver", "unified_mmotion_retargeting"),
    ("unidynsolver", "UMR"),
    ("unified_mmotion_retargeting",),
    ("UMR",),
)
ALL_RETARGET_RESULTS = (
    ("h2", ROOT / "output/h2_retarget/smpl_motion_h2.npz"),
    ("t800", ROOT / "output/t800_retarget/smpl_motion_t800.npz"),
    ("agibot_a2", ROOT / "output/agibot_a2_retarget/smpl_motion_agibot_a2.npz"),
    ("pnd_adam_lite", ROOT / "output/pnd_adam_lite_retarget/smpl_motion_pnd_adam_lite.npz"),
    ("g1", ROOT / "output/g1_retarget/smpl_motion_g1.npz"),
    ("fourier_n1", ROOT / "output/fourier_n1_retarget/smpl_motion_fourier_n1.npz"),
    ("booster_k1", ROOT / "output/booster_k1_retarget/smpl_motion_booster_k1.npz"),
    ("pipluspro", ROOT / "output/pipluspro_retarget/smpl_motion_pipluspro.npz"),
)


def parse_args():
    parser = argparse.ArgumentParser(description="Visualize a surface-vector retarget result in MuJoCo.")
    parser.add_argument("--all", action="store_true", help="Play all supported SMPL motion retarget results in one scene.")
    parser.add_argument("--all-spacing", type=float, default=1.4, help="Robot spacing for --all mode.")
    parser.add_argument("--all-show-smpl-points", action="store_true", default=False)
    parser.add_argument("--no-all-show-smpl-points", dest="all_show_smpl_points", action="store_false")
    parser.add_argument("--all-smpl-point-offset", type=float, nargs=3, default=(0.0, -2.2, 0.0))
    parser.add_argument("--all-smpl-point-radius", type=float, default=0.004)
    parser.add_argument("--all-smpl-point-alpha", type=float, default=0.9)
    parser.add_argument("--result", type=Path, default=DEFAULT_RESULT, help="Saved retarget .npz.")
    parser.add_argument("--robot-xml", type=Path, default=None, help="Override robot XML path.")
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=-1)
    parser.add_argument("--stride", type=int, default=1)
    parser.add_argument("--fps", type=float, default=0.0, help="0 uses result fps adjusted by --stride.")
    parser.add_argument(
        "--seek-hold-speed",
        type=float,
        default=4.0,
        help="Playback seconds advanced per real second while holding Q/E. Requires X11 key polling.",
    )
    parser.add_argument(
        "--rate-limit",
        dest="rate_limit",
        action="store_true",
        default=True,
        help="Play against wall-clock time using the result FPS (default).",
    )
    parser.add_argument(
        "--no-rate-limit",
        dest="rate_limit",
        action="store_false",
        help="Advance one frame per render loop iteration; intended only for debugging.",
    )
    parser.add_argument("--loop", action="store_true", default=True)
    parser.add_argument("--no-loop", dest="loop", action="store_false")
    parser.add_argument("--paused", action="store_true", default=True)
    parser.add_argument("--play", dest="paused", action="store_false")
    parser.add_argument("--dry-run", action="store_true", help="Load result/model and print summary without opening viewer.")
    parser.add_argument("--record-video", type=Path, default=None, help="Render selected frames to an mp4/video file.")
    parser.add_argument("--record-width", type=int, default=1280)
    parser.add_argument("--record-height", type=int, default=720)
    parser.add_argument("--record-fps", type=float, default=0.0, help="0 uses --fps/result fps after stride.")

    parser.add_argument("--show-source-slots", action="store_true", default=False)
    parser.add_argument("--no-show-source-slots", dest="show_source_slots", action="store_false")
    parser.add_argument(
        "--source-slot-mode",
        choices=["selected", "all"],
        default="all",
        help="selected draws the surface-vector slots used by optimization.",
    )
    parser.add_argument("--source-slot-stride", type=int, default=1)
    parser.add_argument("--source-slot-max", type=int, default=0, help="0 draws all slots after stride.")
    parser.add_argument("--source-slot-radius", type=float, default=0.004)
    parser.add_argument("--source-slot-alpha", type=float, default=0.9)
    parser.add_argument("--source-slot-offset", type=float, nargs=3, default=(-0.0, 0.0, 0.0))
    parser.add_argument("--show-source-object-points", action="store_true", default=False)
    parser.add_argument("--no-show-source-object-points", dest="show_source_object_points", action="store_false")

    parser.add_argument("--show-source-objects", action="store_true", default=True)
    parser.add_argument("--no-show-source-objects", dest="show_source_objects", action="store_false")
    parser.add_argument(
        "--source-object-offset",
        type=float,
        nargs=3,
        default=None,
        help="Offset for Noitom source objects. Defaults to --source-slot-offset.",
    )
    parser.add_argument("--source-object-scale", type=float, default=0.01, help="OBJ unit scale; Noitom OBJ files use centimeters.")
    parser.add_argument("--source-object-alpha", type=float, default=1.0)
    parser.add_argument("--show-robot-objects", action="store_true", default=True)
    parser.add_argument("--no-show-robot-objects", dest="show_robot_objects", action="store_false")
    parser.add_argument("--robot-object-offset", type=float, nargs=3, default=(0.0, 0.0, 0.0))

    parser.add_argument("--show-robot-slots", action="store_true", default=True)
    parser.add_argument("--no-show-robot-slots", dest="show_robot_slots", action="store_false")
    parser.add_argument(
        "--robot-slot-mode",
        choices=["selected", "all"],
        default="all",
        help="selected draws the surface-vector slots used by optimization.",
    )
    parser.add_argument("--robot-slot-stride", type=int, default=1)
    parser.add_argument("--robot-slot-max", type=int, default=0, help="0 draws all slots after stride.")
    parser.add_argument("--robot-slot-radius", type=float, default=0.004)
    parser.add_argument("--robot-slot-alpha", type=float, default=0.45)
    parser.add_argument("--show-robot-object-points", action="store_true", default=False)
    parser.add_argument("--no-show-robot-object-points", dest="show_robot_object_points", action="store_false")

    parser.add_argument("--show-ground-contact-map", action="store_true", default=True)
    parser.add_argument("--no-show-ground-contact-map", dest="show_ground_contact_map", action="store_false")
    parser.add_argument("--show-contact-links", action="store_true", default=False)
    parser.add_argument("--no-show-contact-links", dest="show_contact_links", action="store_false")
    parser.add_argument(
        "--ground-contact-map-threshold",
        type=float,
        default=0.075,
        help="Contact-map distance threshold in meters. Negative uses the threshold stored in the result.",
    )
    parser.add_argument(
        "--ground-contact-map-max-points",
        type=int,
        default=-1,
        help="Negative uses the max-points stored in the result. 0 draws all active slots.",
    )
    parser.add_argument("--ground-contact-map-radius", type=float, default=0.008)
    parser.add_argument("--ground-contact-map-alpha", type=float, default=1.0)

    parser.add_argument("--camera-distance", type=float, default=2.2)
    parser.add_argument("--camera-azimuth", type=float, default=-135.0)
    parser.add_argument("--camera-elevation", type=float, default=-18.0)
    parser.add_argument(
        "--camera-mode",
        choices=["root", "robot-smpl-midpoint", "fixed-robot-smpl-midpoint"],
        default="root",
        help="Camera target: robot root, per-frame robot/SMPL midpoint, or fixed sequence midpoint.",
    )
    parser.add_argument(
        "--lock-camera",
        action="store_true",
        default=True,
        help="Keep camera distance/azimuth/elevation fixed every frame for non-root camera modes.",
    )
    parser.add_argument("--no-lock-camera", dest="lock_camera", action="store_false")
    parser.add_argument(
        "--camera-smooth",
        type=float,
        default=0.85,
        help="Exponential smoothing for camera lookat. 0 disables smoothing; larger values are steadier.",
    )
    parser.add_argument("--follow-root", action="store_true", default=True)
    parser.add_argument("--no-follow-root", dest="follow_root", action="store_false")
    parser.add_argument(
        "--show-collision-geoms",
        action="store_true",
        default=False,
        help="Show non-visual robot collision geoms. By default they are hidden from rendering only.",
    )
    parser.add_argument(
        "--collision-geom-alpha",
        type=float,
        default=0.22,
        help="Alpha used for collision geoms when --show-collision-geoms is passed.",
    )
    parser.add_argument("--show-left-ui", action="store_true", default=False)
    parser.add_argument("--show-right-ui", action="store_true", default=False)
    parser.add_argument(
        "--viewer-backend",
        choices=("passive", "glfw-ui"),
        default="glfw-ui",
        help="glfw-ui uses the default custom GLFW viewer; passive uses mujoco.viewer.launch_passive.",
    )
    parser.add_argument("--ui-panel-width", type=int, default=320, help="Left-side panel width for --viewer-backend glfw-ui.")
    parser.add_argument("--ui-window-width", type=int, default=2400, help="Initial GLFW window width for --viewer-backend glfw-ui.")
    parser.add_argument("--ui-window-height", type=int, default=1500, help="Initial GLFW window height for --viewer-backend glfw-ui.")
    parser.add_argument(
        "--object-render-source",
        choices=("auto", "xml", "obj"),
        default="auto",
        help="Object mesh source for source/robot object rendering. auto uses XML when present, otherwise OBJ.",
    )
    parser.add_argument("--ghost-trail", action="store_true", default=False, help="Start the GLFW UI viewer with ghost trail rendering enabled.")
    parser.add_argument("--ghost-interval", type=float, default=1.0, help="Seconds between ghost trail samples, clamped to [0, 5].")
    return parser.parse_args()


class X11KeyPoller:
    def __init__(self, chars):
        self._x11 = None
        self._display = None
        self._keycodes = {}
        if sys.platform.startswith("linux"):
            lib_path = ctypes.util.find_library("X11")
            if lib_path and os.environ.get("DISPLAY"):
                try:
                    x11 = ctypes.cdll.LoadLibrary(lib_path)
                    x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
                    x11.XOpenDisplay.restype = ctypes.c_void_p
                    x11.XCloseDisplay.argtypes = [ctypes.c_void_p]
                    x11.XQueryKeymap.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
                    x11.XQueryKeymap.restype = ctypes.c_int
                    x11.XKeysymToKeycode.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
                    x11.XKeysymToKeycode.restype = ctypes.c_uint
                    display = x11.XOpenDisplay(None)
                    if display:
                        self._x11 = x11
                        self._display = display
                        for char in chars:
                            codes = set()
                            for variant in {str(char).lower(), str(char).upper()}:
                                code = int(x11.XKeysymToKeycode(display, ctypes.c_ulong(ord(variant))))
                                if code > 0:
                                    codes.add(code)
                            self._keycodes[str(char).lower()] = tuple(sorted(codes))
                except Exception:
                    self.close()

    @property
    def available(self) -> bool:
        return self._x11 is not None and self._display is not None and bool(self._keycodes)

    def is_pressed(self, char: str) -> bool:
        if not self.available:
            return False
        codes = self._keycodes.get(str(char).lower(), ())
        if not codes:
            return False
        keymap = ctypes.create_string_buffer(32)
        if int(self._x11.XQueryKeymap(self._display, keymap)) == 0:
            return False
        raw = keymap.raw
        return any(bool(raw[code >> 3] & (1 << (code & 7))) for code in codes)

    def close(self) -> None:
        if self._x11 is not None and self._display is not None:
            try:
                self._x11.XCloseDisplay(self._display)
            except Exception:
                pass
        self._x11 = None
        self._display = None
        self._keycodes = {}


class HeldSeekController:
    def __init__(self, fps: float, speed: float):
        self.poller = X11KeyPoller(("q", "e"))
        self.fps = max(float(fps), 1e-6)
        self.speed = max(float(speed), 0.0)
        self.last_time = time.time()
        self.accumulated_frames = 0.0

    @property
    def available(self) -> bool:
        return self.poller.available and self.speed > 0.0

    def update(self, frame_cursor: int, frame_count: int) -> tuple[int, bool]:
        now = time.time()
        if not self.available:
            self.last_time = now
            return frame_cursor, False
        direction = 0
        if self.poller.is_pressed("q"):
            direction -= 1
        if self.poller.is_pressed("e"):
            direction += 1
        if direction == 0:
            self.last_time = now
            self.accumulated_frames = 0.0
            return frame_cursor, False

        elapsed = min(max(now - self.last_time, 0.0), 0.25)
        self.last_time = now
        self.accumulated_frames += direction * self.fps * self.speed * elapsed
        steps = int(self.accumulated_frames)
        if steps == 0:
            return frame_cursor, True

        self.accumulated_frames -= steps
        frame_cursor = max(0, min(int(frame_count) - 1, int(frame_cursor) + steps))
        return frame_cursor, True

    def close(self) -> None:
        self.poller.close()


def scalar_string(value) -> str:
    arr = np.asarray(value)
    if arr.shape == ():
        return str(arr.item())
    if arr.size == 1:
        return str(arr.reshape(-1)[0])
    return str(value)


def infer_default_robot_xml(result_path: Path) -> Path:
    result_text = str(result_path).lower()
    if "h2_retarget" in result_text or result_path.stem.lower().endswith("_h2"):
        return DEFAULT_H2_XML
    return DEFAULT_PIPLUSPRO_XML


def strip_legacy_repo_prefix(suffix: str) -> Path | None:
    """Map an old Elements repository suffix into the current UMR root."""
    parts = Path(suffix).parts
    for prefix in LEGACY_REPO_PREFIXES:
        if parts[: len(prefix)] == prefix:
            remainder = parts[len(prefix) :]
            return Path(*remainder) if remainder else Path(".")
    if parts[:1] == ("unidynsolver",):
        remainder = parts[1:]
        return Path(*remainder) if remainder else Path(".")
    return None


def remap_legacy_path(path: Path) -> Path:
    text = str(path)
    match = ABS_ELEMENTS_PATH_RE.fullmatch(text)
    if not match:
        return path
    suffix = text[match.group(0).find("/Elements") + len("/Elements") :].lstrip("/")
    repo_suffix = strip_legacy_repo_prefix(suffix)
    if repo_suffix is not None:
        return repo_suffix
    return Path("..") / suffix


def resolve_robot_xml_path(path: Path) -> Path:
    remapped = remap_legacy_path(path)
    candidates = [path, remapped]
    if not path.is_absolute():
        candidates.extend([ROOT / path, ELEMENTS_ROOT / path])
    if remapped != path:
        candidates.extend([ROOT / remapped, ELEMENTS_ROOT / remapped])
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[-1]


def absolute_elements_path_to_target(path_text: str) -> Path:
    path = Path(path_text)
    try:
        return ROOT / path.resolve().relative_to(ROOT.resolve())
    except ValueError:
        pass
    elements_marker = "/Elements"
    suffix = path_text[path_text.find(elements_marker) + len(elements_marker) :].lstrip("/")
    suffix_parts = Path(suffix).parts
    if ROOT.name in suffix_parts:
        root_idx = suffix_parts.index(ROOT.name)
        return ROOT.joinpath(*suffix_parts[root_idx + 1 :])
    repo_suffix = strip_legacy_repo_prefix(suffix)
    if repo_suffix is not None:
        return ROOT / repo_suffix
    return ELEMENTS_ROOT / suffix


def relative_path_from_repo(path_text: str) -> str:
    target = absolute_elements_path_to_target(path_text)
    return Path(os.path.relpath(target, start=ROOT)).as_posix()


def resolve_relative_xml_path(path: Path, xml_path: Path) -> Path:
    # MJCF relative paths are rooted at the XML directory. Keep the repository
    # root only as a compatibility fallback for older generated files.
    candidates = [xml_path.parent / path, ROOT / path]
    return next((candidate for candidate in candidates if candidate.exists()), candidates[0])


def normalize_patched_asset_paths(xml_text: str, xml_path: Path) -> str:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return xml_text
    compiler = root.find("compiler")
    meshdir_text = compiler.get("meshdir") if compiler is not None else None
    texturedir_text = compiler.get("texturedir") if compiler is not None else None
    meshdir = Path(meshdir_text) if meshdir_text else None
    texturedir = Path(texturedir_text) if texturedir_text else None
    meshdir_base = None
    texturedir_base = None
    if meshdir is not None:
        meshdir_base = meshdir if meshdir.is_absolute() else resolve_relative_xml_path(meshdir, xml_path)
    if texturedir is not None:
        texturedir_base = texturedir if texturedir.is_absolute() else resolve_relative_xml_path(texturedir, xml_path)

    for mesh in root.findall("./asset/mesh"):
        file_text = mesh.get("file")
        if not file_text:
            continue
        file_path = Path(file_text)
        if file_path.is_absolute():
            target = file_path
        elif file_path.parent == Path(".") and meshdir_base is not None:
            target = meshdir_base / file_path
        else:
            target = resolve_relative_xml_path(file_path, xml_path)
        mesh.set("file", Path(os.path.relpath(target, start=ROOT)).as_posix())
    for texture in root.findall("./asset/texture"):
        file_text = texture.get("file")
        if not file_text:
            continue
        file_path = Path(file_text)
        if file_path.is_absolute():
            target = file_path
        elif file_path.parent == Path(".") and texturedir_base is not None:
            target = texturedir_base / file_path
        else:
            target = resolve_relative_xml_path(file_path, xml_path)
        texture.set("file", Path(os.path.relpath(target, start=ROOT)).as_posix())
    if compiler is not None:
        compiler.attrib.pop("meshdir", None)
        compiler.attrib.pop("texturedir", None)
    return ET.tostring(root, encoding="unicode")


def remove_named_children(parent: ET.Element, tag: str, names: set[str]) -> None:
    for child in list(parent):
        if child.tag == tag and child.get("name") in names:
            parent.remove(child)


def normalize_retarget_scene(xml_text: str) -> str:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return xml_text

    assets = root.findall("asset")
    worldbodies = root.findall("worldbody")
    if not worldbodies:
        return xml_text
    if not assets:
        asset = ET.Element("asset")
        first_worldbody_index = list(root).index(worldbodies[0])
        root.insert(first_worldbody_index, asset)
        assets = [asset]

    texture_names = {
        "skybox",
        "texplane",
        "groundplane",
        "h2_skybox",
        "h2_groundplane",
        "retarget_skybox",
        "retarget_groundplane",
    }
    material_names = {"matplane", "MatPlane", "groundplane", "h2_groundplane", "retarget_groundplane"}
    for asset in assets:
        remove_named_children(asset, "texture", texture_names)
        remove_named_children(asset, "material", material_names)

    for worldbody in worldbodies:
        for child in list(worldbody):
            if child.tag == "light":
                worldbody.remove(child)
            elif child.tag == "geom" and child.get("type") == "plane":
                worldbody.remove(child)

    asset = assets[0]
    asset.insert(
        0,
        ET.Element(
            "texture",
            {
                "type": "skybox",
                "builtin": "flat",
                "rgb1": "0 0 0",
                "rgb2": "0 0 0",
                "width": "512",
                "height": "3072",
            },
        ),
    )
    asset.insert(
        1,
        ET.Element(
            "texture",
            {
                "type": "2d",
                "name": "groundplane",
                "builtin": "checker",
                "mark": "edge",
                "rgb1": "0.2 0.3 0.4",
                "rgb2": "0.1 0.2 0.3",
                "markrgb": "0.8 0.8 0.8",
                "width": "300",
                "height": "300",
            },
        ),
    )
    asset.insert(
        2,
        ET.Element(
            "material",
            {
                "name": "groundplane",
                "texture": "groundplane",
                "texuniform": "true",
                "texrepeat": "5 5",
                "reflectance": "0.2",
            },
        ),
    )

    worldbody = worldbodies[0]
    worldbody.insert(
        0,
        ET.Element(
            "geom",
            {
                "name": "floor",
                "type": "plane",
                "pos": "0 0 0",
                "size": "0 0 0.05",
                "material": "groundplane",
                "contype": "15",
                "conaffinity": "15",
            },
        ),
    )
    worldbody.insert(
        1,
        ET.Element("light", {"pos": "1 0 3.5", "dir": "0 0 -1", "directional": "true"}),
    )
    return ET.tostring(root, encoding="unicode")


def y_up_to_z_up_matrix(output_up: str, convert_y_up: bool) -> np.ndarray:
    if convert_y_up and str(output_up).lower() == "y":
        return np.asarray(
            [
                [1.0, 0.0, 0.0],
                [0.0, 0.0, -1.0],
                [0.0, 1.0, 0.0],
            ],
            dtype=np.float64,
        )
    return np.eye(3, dtype=np.float64)


def transform_noitom_points(points, output_up, convert_y_up, ground_align, floor_y, ground_offset):
    points = np.asarray(points, dtype=np.float32).copy()
    if convert_y_up and str(output_up).lower() == "y":
        points = points[..., [0, 2, 1]]
        points[..., 1] *= -1.0
        if ground_align:
            points[..., 2] -= float(floor_y)
    elif ground_align:
        points[..., 2] -= float(floor_y)
    points[..., 2] += float(ground_offset)
    return points


def resolve_source_data_dir(result) -> Path | None:
    candidates = []
    for key in ("source_object_dir", "samp_sequence_dir", "source_data"):
        if key not in result:
            continue
        source = Path(scalar_string(result[key]))
        remapped = remap_legacy_path(source)
        candidates.extend([source, remapped])
        if not source.is_absolute():
            candidates.extend([ROOT / source, ELEMENTS_ROOT / source])
        if remapped != source and not remapped.is_absolute():
            candidates.extend([ROOT / remapped, ELEMENTS_ROOT / remapped])
    for candidate in candidates:
        if candidate.exists() and candidate.is_dir():
            return candidate
    return None


def resolve_source_data_path(result) -> Path | None:
    if "source_data" not in result:
        return None
    source = Path(scalar_string(result["source_data"]))
    remapped = remap_legacy_path(source)
    candidates = [source, remapped]
    if not source.is_absolute():
        candidates.extend([ROOT / source, ELEMENTS_ROOT / source])
    if remapped != source and not remapped.is_absolute():
        candidates.extend([ROOT / remapped, ELEMENTS_ROOT / remapped])
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def read_object_metadata(csv_path: Path) -> dict:
    if not csv_path.exists():
        return {}
    with csv_path.open("r", newline="", errors="replace") as f:
        rows = list(csv.DictReader(f))
    return rows[0] if rows else {}


def convert_noitom_obj_mesh(source_path: Path, target_path: Path, output_up: str, convert_y_up: bool, scale: float):
    lines = source_path.read_text(errors="replace").splitlines()
    vertex_ids = []
    normal_ids = []
    vertices = []
    normals = []
    basis = y_up_to_z_up_matrix(output_up, convert_y_up).astype(np.float32)
    for line_id, line in enumerate(lines):
        if line.startswith("v "):
            parts = line.split()
            vertex_ids.append(line_id)
            vertices.append([float(parts[1]), float(parts[2]), float(parts[3])])
        elif line.startswith("vn "):
            parts = line.split()
            normal_ids.append(line_id)
            normals.append([float(parts[1]), float(parts[2]), float(parts[3])])
    if not vertices:
        raise ValueError(f"OBJ has no vertices: {source_path}")

    vertices = (np.asarray(vertices, dtype=np.float32) @ basis.T) * float(scale)
    for line_id, vertex in zip(vertex_ids, vertices):
        lines[line_id] = f"v {vertex[0]:.8f} {vertex[1]:.8f} {vertex[2]:.8f}"

    if normals:
        normals = np.asarray(normals, dtype=np.float32) @ basis.T
        normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
        for line_id, normal in zip(normal_ids, normals):
            lines[line_id] = f"vn {normal[0]:.8f} {normal[1]:.8f} {normal[2]:.8f}"

    target_path.write_text("\n".join(lines) + "\n")
    return {
        "num_vertices": len(vertices),
        "bbox_min": vertices.min(axis=0),
        "bbox_max": vertices.max(axis=0),
        "metadata": read_object_metadata(source_path.with_suffix(".csv")),
        "source_type": "obj",
        "prefix": None,
        "obj_original_color": obj_original_color(source_path),
        "resource_visual_basis": basis.astype(np.float32).round(8).tolist(),
        "resource_visual_scale": float(scale),
        "resource_visual_binding": "noitom_obj_mesh",
    }


def object_xml_mesh_path(xml_path: Path, mesh_file: str, meshdir: str | None) -> Path:
    path = Path(mesh_file)
    if path.is_absolute():
        return path
    base = xml_path.parent
    if meshdir:
        base = base / meshdir
    candidate = base / path
    if candidate.exists():
        return candidate.resolve()
    fallback = xml_path.parent / path
    return fallback.resolve()


def obj_bbox(path: Path, scale=(1.0, 1.0, 1.0)):
    if not path.exists():
        return None
    vertices = []
    scale = np.asarray(scale, dtype=np.float32).reshape(3)
    for line in path.read_text(errors="replace").splitlines():
        if not line.startswith("v "):
            continue
        parts = line.split()
        if len(parts) >= 4:
            vertices.append([float(parts[1]), float(parts[2]), float(parts[3])])
    if not vertices:
        return None
    vertices = np.asarray(vertices, dtype=np.float32) * scale[None, :]
    return vertices.min(axis=0), vertices.max(axis=0), len(vertices)


def mtl_diffuse_colors(mtl_path: Path) -> dict[str, np.ndarray]:
    colors = {}
    if not mtl_path.exists():
        return colors
    current = None
    for line in mtl_path.read_text(errors="replace").splitlines():
        parts = line.strip().split()
        if not parts:
            continue
        key = parts[0].lower()
        if key == "newmtl" and len(parts) >= 2:
            current = parts[1]
        elif key == "kd" and current and len(parts) >= 4:
            try:
                colors[current] = np.asarray([float(parts[1]), float(parts[2]), float(parts[3])], dtype=np.float32)
            except ValueError:
                pass
    return colors


def obj_original_color(path: Path) -> np.ndarray | None:
    if not path.exists():
        return None
    vertex_colors = []
    mtllibs = []
    used_materials = []
    for line in path.read_text(errors="replace").splitlines():
        parts = line.strip().split()
        if not parts:
            continue
        key = parts[0].lower()
        if key == "v" and len(parts) >= 7:
            try:
                color = np.asarray([float(parts[4]), float(parts[5]), float(parts[6])], dtype=np.float32)
                if np.max(color) > 1.0:
                    color = color / 255.0
                vertex_colors.append(np.clip(color, 0.0, 1.0))
            except ValueError:
                pass
        elif key == "mtllib" and len(parts) >= 2:
            mtllibs.extend(parts[1:])
        elif key == "usemtl" and len(parts) >= 2:
            used_materials.append(parts[1])
    if vertex_colors:
        return np.mean(np.stack(vertex_colors, axis=0), axis=0).astype(np.float32)
    material_colors = {}
    for mtl_name in mtllibs:
        material_colors.update(mtl_diffuse_colors(path.parent / mtl_name))
    for name in used_materials:
        if name in material_colors:
            return np.asarray(material_colors[name], dtype=np.float32)
    if material_colors:
        return np.mean(np.stack(list(material_colors.values()), axis=0), axis=0).astype(np.float32)
    return None


def xml_object_fragments(xml_path: Path, object_id: int, role: str, alpha: float, mesh_scale_multiplier: float = 1.0):
    root = ET.parse(xml_path).getroot()
    compiler = root.find("compiler")
    meshdir = compiler.get("meshdir") if compiler is not None else None
    prefix = f"source_object_{object_id}_{role}_{xml_path.stem}_"
    ref_attrs = ("mesh", "material", "texture")
    name_maps = {attr: {} for attr in ref_attrs}
    asset_xml = []
    bbox_min = None
    bbox_max = None
    num_vertices = 0
    original_color = None
    resource_visual_scale = None

    asset = root.find("asset")
    if asset is not None:
        for child in list(asset):
            copied = copy.deepcopy(child)
            name = copied.get("name")
            if name:
                new_name = f"{prefix}{name}"
                if copied.tag in name_maps:
                    name_maps[copied.tag][name] = new_name
                copied.set("name", new_name)
            if copied.tag == "mesh" and copied.get("file"):
                mesh_path = object_xml_mesh_path(xml_path, copied.get("file"), meshdir)
                copied.set("file", str(mesh_path))
                if original_color is None:
                    original_color = obj_original_color(mesh_path)
                scale_text = copied.get("scale", "1 1 1")
                scale = [float(v) for v in scale_text.split()]
                if len(scale) == 1:
                    scale = scale * 3
                scale = [float(v) * float(mesh_scale_multiplier) for v in scale[:3]]
                copied.set("scale", " ".join(f"{v:.8g}" for v in scale))
                if resource_visual_scale is None:
                    resource_visual_scale = [float(v) for v in scale[:3]]
                bbox = obj_bbox(mesh_path, scale[:3])
                if bbox is not None:
                    mn, mx, count = bbox
                    bbox_min = mn if bbox_min is None else np.minimum(bbox_min, mn)
                    bbox_max = mx if bbox_max is None else np.maximum(bbox_max, mx)
                    num_vertices += int(count)
            asset_xml.append(ET.tostring(copied, encoding="unicode"))

    worldbody = root.find("worldbody")
    if worldbody is None:
        raise ValueError(f"Object XML has no worldbody: {xml_path}")
    body_children = []
    freejoint_name = None
    for body in list(worldbody):
        copied = copy.deepcopy(body)
        if copied.find("./freejoint") is None and copied.find("./joint[@type='free']") is None:
            insert_at = 1 if len(copied) > 0 and copied[0].tag == "inertial" else 0
            copied.insert(insert_at, ET.Element("freejoint", {"name": f"{copied.get('name', 'object')}_freejoint"}))
        for elem in copied.iter():
            name = elem.get("name")
            if name:
                elem.set("name", f"{prefix}{name}")
            for attr in ref_attrs:
                ref = elem.get(attr)
                if ref and ref in name_maps.get(attr, {}):
                    elem.set(attr, name_maps[attr][ref])
            if freejoint_name is None and elem.tag == "freejoint":
                freejoint_name = elem.get("name")
            if freejoint_name is None and elem.tag == "joint" and elem.get("type") == "free":
                freejoint_name = elem.get("name")
            if elem.tag == "geom":
                rgba = elem.get("rgba")
                if rgba:
                    parts = [float(v) for v in rgba.split()]
                    if len(parts) == 4:
                        parts[3] = min(parts[3], float(alpha))
                        elem.set("rgba", " ".join(f"{v:.6g}" for v in parts))
        body_children.append(ET.tostring(copied, encoding="unicode"))

    if bbox_min is None:
        bbox_min = np.zeros(3, dtype=np.float32)
        bbox_max = np.zeros(3, dtype=np.float32)
    info = {
        "num_vertices": int(num_vertices),
        "bbox_min": np.asarray(bbox_min, dtype=np.float32),
        "bbox_max": np.asarray(bbox_max, dtype=np.float32),
        "metadata": read_object_metadata(xml_path.with_suffix(".csv")),
        "source_type": "xml",
        "mesh_scale_multiplier": float(mesh_scale_multiplier),
        "prefix": prefix,
        "obj_original_color": None if original_color is None else np.asarray(original_color, dtype=np.float32),
        "resource_visual_basis": np.eye(3, dtype=np.float32).round(8).tolist(),
        "resource_visual_scale": resource_visual_scale if resource_visual_scale is not None else [float(mesh_scale_multiplier)] * 3,
        "resource_visual_binding": "mjcf_xml_mesh",
    }
    return "\n".join(asset_xml), "\n".join(body_children), freejoint_name, info


def load_noitom_prop_motion(prop_csv: Path, source_frame_ids, result, output_up, convert_y_up, ground_align, floor_y, ground_offset, smpl_scale, offset):
    with prop_csv.open("r", newline="", errors="replace") as f:
        rows = list(csv.DictReader(f))
    required = {"px", "py", "pz", "qx", "qy", "qz", "qw"}
    if not rows or not required.issubset(rows[0]):
        return None
    positions = np.asarray([[float(row["px"]), float(row["py"]), float(row["pz"])] for row in rows], dtype=np.float32)
    quats_xyzw = np.asarray(
        [[float(row["qx"]), float(row["qy"]), float(row["qz"]), float(row["qw"])] for row in rows],
        dtype=np.float64,
    )
    source_frame_ids = np.asarray(source_frame_ids, dtype=np.int32)
    clipped = np.clip(source_frame_ids, 0, len(positions) - 1)
    positions = transform_noitom_points(
        positions[clipped],
        output_up,
        convert_y_up,
        ground_align,
        floor_y,
        ground_offset,
    )
    positions = positions * float(smpl_scale) + np.asarray(offset, dtype=np.float32)[None, :]

    basis = y_up_to_z_up_matrix(output_up, convert_y_up)
    rot_mats = R.from_quat(quats_xyzw[clipped]).as_matrix()
    rot_mats = basis[None, :, :] @ rot_mats @ basis.T[None, :, :]
    converted_xyzw = R.from_matrix(rot_mats).as_quat()
    quats_wxyz = np.concatenate([converted_xyzw[:, 3:4], converted_xyzw[:, :3]], axis=1).astype(np.float32)
    quats_wxyz /= np.maximum(np.linalg.norm(quats_wxyz, axis=1, keepdims=True), 1e-12)
    return {
        "path": prop_csv,
        "positions": positions.astype(np.float32),
        "quats_wxyz": quats_wxyz,
        "num_rows": len(rows),
    }


def select_object_render_path(xml_path: Path, obj_path: Path, mode: str) -> tuple[Path | None, str]:
    mode = str(mode or "auto").lower()
    if mode == "obj":
        if obj_path.exists():
            return obj_path, "obj"
        if xml_path.exists():
            return xml_path, "xml_fallback_for_missing_obj"
        return None, "obj_missing"
    if mode == "xml":
        return (xml_path, "xml") if xml_path.exists() else (None, "xml_missing")
    if xml_path.exists():
        return xml_path, "xml"
    if obj_path.exists():
        return obj_path, "obj"
    return None, "missing"


def prepare_source_objects(args, result, playback_frame_ids: np.ndarray, temp_dir: str):
    show_source = bool(args.show_source_objects)
    show_robot = bool(args.show_robot_objects)
    if not show_source and not show_robot:
        return []
    source_format = scalar_string(result["source_format"]) if "source_format" in result else ""
    source_dir = resolve_source_data_dir(result)
    if source_dir is None:
        return []
    stems = sorted({path.stem for path in source_dir.glob("*.obj")} | {path.stem for path in source_dir.glob("*.xml")})
    if not stems:
        return []

    output_up = scalar_string(result["noitom_output_up"]) if "noitom_output_up" in result else "y"
    convert_y_up = bool(np.asarray(result["noitom_convert_y_up"]).reshape(-1)[0]) if "noitom_convert_y_up" in result else True
    ground_align = bool(np.asarray(result["noitom_ground_align"]).reshape(-1)[0]) if "noitom_ground_align" in result else True
    floor_y = float(np.asarray(result["noitom_floor_y"]).reshape(-1)[0]) if "noitom_floor_y" in result else 0.0
    ground_offset = float(np.asarray(result["noitom_ground_offset"]).reshape(-1)[0]) if "noitom_ground_offset" in result else 0.0
    smpl_scale = float(np.asarray(result["smpl_scale"]).reshape(-1)[0]) if "smpl_scale" in result else 1.0
    object_in_retarget_frame = bool(
        np.asarray(result["viewer_object_motion_in_retarget_frame"]).reshape(-1)[0]
    ) if "viewer_object_motion_in_retarget_frame" in result else False
    if object_in_retarget_frame:
        # Adapter-provided meshes and trajectories already include coordinate
        # conversion, ground alignment, and object scale. Keep them byte-for-
        # byte in the packaged retarget frame and index them at playback FPS.
        object_output_up = "z"
        object_convert_y_up = False
        object_ground_align = False
        object_floor_y = 0.0
        object_ground_offset = 0.0
        object_scale = 1.0
    else:
        object_output_up = output_up
        object_convert_y_up = convert_y_up
        object_ground_align = ground_align
        object_floor_y = floor_y
        object_ground_offset = ground_offset
        object_scale = smpl_scale
    source_offset = np.asarray(args.source_object_offset if args.source_object_offset is not None else args.source_slot_offset, dtype=np.float32)
    robot_offset = np.asarray(args.robot_object_offset, dtype=np.float32)
    source_frame_ids_all = (
        np.asarray(result["frame_ids"], dtype=np.int32)
        if "frame_ids" in result
        else np.arange(max(int(playback_frame_ids.max()) + 1, len(playback_frame_ids)), dtype=np.int32)
    )
    source_frame_ids = (
        np.asarray(playback_frame_ids, dtype=np.int32)
        if object_in_retarget_frame
        else source_frame_ids_all[playback_frame_ids]
    )

    objects = []
    for object_id, stem in enumerate(stems):
        xml_path = source_dir / f"{stem}.xml"
        obj_path = source_dir / f"{stem}.obj"
        source_path, render_source = select_object_render_path(xml_path, obj_path, getattr(args, "object_render_source", "auto"))
        if source_path is None:
            print(
                f"[{VIS_PREFIX}][Objects][WARN] skip {stem}: object_render_source="
                f"{getattr(args, 'object_render_source', 'auto')} requested {render_source}"
            )
            continue
        prop_path = source_dir / f"prop_{stem}.csv"
        if not prop_path.exists():
            continue
        source_motion = load_noitom_prop_motion(
            prop_path,
            source_frame_ids,
            result,
            object_output_up,
            object_convert_y_up,
            object_ground_align,
            object_floor_y,
            object_ground_offset,
            object_scale,
            source_offset,
        )
        robot_motion = load_noitom_prop_motion(
            prop_path,
            source_frame_ids,
            result,
            object_output_up,
            object_convert_y_up,
            object_ground_align,
            object_floor_y,
            object_ground_offset,
            object_scale,
            robot_offset,
        )
        if source_motion is None or robot_motion is None:
            continue
        base = {
            "name": stem,
            "source_path": source_path,
            "prop_path": prop_path,
            "render_source": render_source,
            "mocap_id": None,
            "dataset_kind": source_format.split("_", 1)[0] if source_format else "",
        }
        if show_source:
            role = "source"
            if source_path.suffix.lower() == ".xml":
                asset_xml, body_xml, freejoint_name, info = xml_object_fragments(
                    source_path,
                    object_id,
                    role,
                    args.source_object_alpha,
                    object_scale,
                )
                objects.append({
                    **base,
                    "role": role,
                    "motion": source_motion,
                    "asset_xml": asset_xml,
                    "body_xml": body_xml,
                    "freejoint_name": freejoint_name,
                    "info": info,
                })
            else:
                converted_path = Path(temp_dir) / f"retarget_object_{object_id}_{role}_{source_path.name}"
                info = convert_noitom_obj_mesh(
                    source_path,
                    converted_path,
                    object_output_up,
                    object_convert_y_up,
                    float(args.source_object_scale) * object_scale,
                )
                info["prefix"] = f"source_object_{object_id}_{role}_{stem}"
                objects.append({
                    **base,
                    "role": role,
                    "motion": source_motion,
                    "mesh_path": converted_path,
                    "freejoint_name": f"source_object_{object_id}_{role}_{stem}_freejoint",
                    "info": info,
                })
        if show_robot:
            role = "robot"
            if source_path.suffix.lower() == ".xml":
                asset_xml, body_xml, freejoint_name, info = xml_object_fragments(
                    source_path,
                    object_id,
                    role,
                    args.source_object_alpha,
                    object_scale,
                )
                objects.append({
                    **base,
                    "role": role,
                    "motion": robot_motion,
                    "asset_xml": asset_xml,
                    "body_xml": body_xml,
                    "freejoint_name": freejoint_name,
                    "info": info,
                })
            else:
                converted_path = Path(temp_dir) / f"retarget_object_{object_id}_{role}_{source_path.name}"
                info = convert_noitom_obj_mesh(
                    source_path,
                    converted_path,
                    object_output_up,
                    object_convert_y_up,
                    float(args.source_object_scale) * object_scale,
                )
                info["prefix"] = f"source_object_{object_id}_{role}_{stem}"
                objects.append({
                    **base,
                    "role": role,
                    "motion": robot_motion,
                    "mesh_path": converted_path,
                    "freejoint_name": f"source_object_{object_id}_{role}_{stem}_freejoint",
                    "info": info,
                })
    if objects:
        print(
            f"[{VIS_PREFIX}][Objects] source_format={source_format or '<unknown>'}, "
            f"source_dir={source_dir}, drawing {len(objects)} object instance(s), "
            f"motion_frame={'retarget' if object_in_retarget_frame else 'source'}"
        )
        for obj in objects:
            info = obj["info"]
            motion = obj["motion"]
            print(
                f"[{VIS_PREFIX}][Objects] role={obj['role']} {obj['name']} type={info.get('source_type', 'obj')} "
                f"render_source={obj.get('render_source', '<unknown>')} "
                f"source={obj['source_path']} verts={info['num_vertices']} "
                f"bbox_min={info['bbox_min'].round(4).tolist()} "
                f"bbox_max={info['bbox_max'].round(4).tolist()} "
                f"scale_mul={float(info.get('mesh_scale_multiplier', 1.0)):.6g} "
                f"prop={motion['path']} prop_rows={motion['num_rows']} metadata={info['metadata']}"
            )
    return objects


def add_source_objects_to_xml(xml_text: str, objects, alpha: float) -> str:
    if not objects:
        return xml_text
    root = ET.fromstring(xml_text)
    asset = root.find("asset")
    if asset is None:
        asset = ET.Element("asset")
        worldbody = root.find("worldbody")
        insert_at = list(root).index(worldbody) if worldbody is not None else 0
        root.insert(insert_at, asset)
    worldbody = root.find("worldbody")
    if worldbody is None:
        raise ValueError("Robot XML has no worldbody for source object insertion.")
    for object_id, obj in enumerate(objects):
        body_name = str((obj.get("info") or {}).get("prefix") or f"source_object_{object_id}_{obj['role']}_{obj['name']}")
        if obj.get("asset_xml"):
            for child in ET.fromstring(f"<asset>{obj['asset_xml']}</asset>"):
                asset.append(child)
        if obj.get("body_xml"):
            for child in ET.fromstring(f"<worldbody>{obj['body_xml']}</worldbody>"):
                worldbody.append(child)
        else:
            mesh_name = f"source_object_mesh_{object_id}"
            ET.SubElement(asset, "mesh", {"name": mesh_name, "file": Path(obj["mesh_path"]).as_posix()})
            body = ET.SubElement(worldbody, "body", {"name": body_name, "pos": "0 0 0"})
            ET.SubElement(body, "freejoint", {"name": obj["freejoint_name"]})
            ET.SubElement(
                body,
                "geom",
                {
                    "name": f"{body_name}_geom",
                    "type": "mesh",
                    "mesh": mesh_name,
                    "rgba": f"0.58 0.48 0.32 {float(alpha):.4f}",
                    "contype": "0",
                    "conaffinity": "0",
                },
            )
    return ET.tostring(root, encoding="unicode")


def patch_legacy_xml_paths(xml_path: Path, source_objects=None, source_object_alpha: float = 1.0) -> tuple[Path, str | None]:
    text = xml_path.read_text()
    source_objects = source_objects or []
    if "<include" in text and not source_objects and ABS_ELEMENTS_PATH_RE.search(text) is None:
        return xml_path, None
    patched = ABS_ELEMENTS_PATH_RE.sub(lambda match: relative_path_from_repo(match.group(0)), text)
    patched = normalize_patched_asset_paths(patched, xml_path)
    patched = normalize_retarget_scene(patched)
    patched = add_source_objects_to_xml(patched, source_objects, source_object_alpha)
    if patched == text:
        return xml_path, None

    tmp = tempfile.NamedTemporaryFile("w", suffix=".xml", prefix=".retargetvis_", dir=ROOT, delete=False)
    try:
        tmp.write(patched)
        tmp_path = tmp.name
    finally:
        tmp.close()
    return Path(tmp_path), tmp_path


def load_result(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Result file not found: {path}")
    result = np.load(path, allow_pickle=True)
    if "qpos" not in result:
        raise KeyError(f"No qpos field found in {path}. Available keys: {list(result.files)}")
    qpos = np.asarray(result["qpos"], dtype=np.float64)
    if qpos.ndim != 2:
        raise ValueError(f"qpos must be 2D, got shape {qpos.shape}")

    robot_xml = infer_default_robot_xml(path)
    if "robot_xml" in result:
        robot_xml = Path(scalar_string(result["robot_xml"]))
    fps = float(np.asarray(result["fps"]).reshape(-1)[0]) if "fps" in result else 30.0
    return result, qpos, robot_xml, fps


def remove_scene_children_for_merge(root: ET.Element) -> None:
    for parent_tag in ("worldbody",):
        parent = root.find(parent_tag)
        if parent is None:
            continue
        for child in list(parent):
            if child.tag == "light":
                parent.remove(child)
            elif child.tag == "geom" and child.get("type") == "plane":
                parent.remove(child)
    for tag in ("actuator", "sensor", "contact", "equality", "tendon", "keyframe"):
        elem = root.find(tag)
        if elem is not None:
            root.remove(elem)


def collect_named_values(root: ET.Element) -> set[str]:
    names = set()
    for elem in root.iter():
        name = elem.get("name")
        if name:
            names.add(name)
        class_name = elem.get("class")
        if elem.tag == "default" and class_name:
            names.add(class_name)
    return names


def prefix_mjcf_tree(root: ET.Element, prefix: str) -> ET.Element:
    known_names = collect_named_values(root)
    ref_attrs = {
        "mesh",
        "material",
        "texture",
        "class",
        "childclass",
        "joint",
        "joint1",
        "joint2",
        "body",
        "body1",
        "body2",
        "geom",
        "geom1",
        "geom2",
        "site",
        "site1",
        "site2",
        "tendon",
        "actuator",
    }
    for elem in root.iter():
        name = elem.get("name")
        if name:
            elem.set("name", f"{prefix}_{name}")
        if elem.tag == "default" and elem.get("class"):
            elem.set("class", f"{prefix}_{elem.get('class')}")
        for attr in ref_attrs:
            value = elem.get(attr)
            if value and value in known_names:
                elem.set(attr, f"{prefix}_{value}")
    return root


def robot_xml_to_prefixed_tree(xml_path: Path, prefix: str) -> ET.Element:
    text = xml_path.read_text()
    text = ABS_ELEMENTS_PATH_RE.sub(lambda match: relative_path_from_repo(match.group(0)), text)
    text = normalize_patched_asset_paths(text, xml_path)
    root = ET.fromstring(text)
    remove_scene_children_for_merge(root)
    return prefix_mjcf_tree(root, prefix)


def all_mode_scene_xml(robot_entries: list[dict], xml_path: Path) -> None:
    root = ET.Element("mujoco", {"model": "all_supported_retarget"})
    ET.SubElement(root, "compiler", {"angle": "radian"})
    ET.SubElement(root, "option", {"timestep": "0.002"})
    asset = ET.SubElement(root, "asset")
    ET.SubElement(
        asset,
        "texture",
        {
            "type": "skybox",
            "builtin": "flat",
            "rgb1": "0 0 0",
            "rgb2": "0 0 0",
            "width": "512",
            "height": "3072",
        },
    )
    ET.SubElement(
        asset,
        "texture",
        {
            "type": "2d",
            "name": "groundplane",
            "builtin": "checker",
            "mark": "edge",
            "rgb1": "0.2 0.3 0.4",
            "rgb2": "0.1 0.2 0.3",
            "markrgb": "0.8 0.8 0.8",
            "width": "300",
            "height": "300",
        },
    )
    ET.SubElement(
        asset,
        "material",
        {
            "name": "groundplane",
            "texture": "groundplane",
            "texuniform": "true",
            "texrepeat": "8 8",
            "reflectance": "0.2",
        },
    )
    worldbody = ET.SubElement(root, "worldbody")
    ET.SubElement(
        worldbody,
        "geom",
        {
            "name": "floor",
            "type": "plane",
            "pos": "0 0 0",
            "size": "0 0 0.05",
            "material": "groundplane",
            "contype": "0",
            "conaffinity": "0",
        },
    )
    ET.SubElement(worldbody, "light", {"pos": "1 0 3.5", "dir": "0 0 -1", "directional": "true"})

    for entry in robot_entries:
        subroot = robot_xml_to_prefixed_tree(entry["robot_xml"], entry["prefix"])
        for sub_asset in subroot.findall("asset"):
            for child in list(sub_asset):
                asset.append(child)
        for default in subroot.findall("default"):
            root.insert(list(root).index(worldbody), default)
        sub_worldbody = subroot.find("worldbody")
        if sub_worldbody is None:
            raise ValueError(f"Robot XML has no worldbody: {entry['robot_xml']}")
        for child in list(sub_worldbody):
            worldbody.append(child)

    if hasattr(ET, "indent"):
        ET.indent(root, space="  ")
    xml_path.write_text(ET.tostring(root, encoding="unicode"))


def load_all_results(args) -> tuple[list[dict], float]:
    entries = []
    fps_values = []
    for robot_name, result_path in ALL_RETARGET_RESULTS:
        if not result_path.exists():
            print(f"[{VIS_PREFIX}][All][WARN] missing {robot_name}: {result_path}")
            continue
        result, qpos, saved_robot_xml, saved_fps = load_result(result_path)
        robot_xml = resolve_robot_xml_path(saved_robot_xml)
        if not robot_xml.exists():
            print(f"[{VIS_PREFIX}][All][WARN] missing XML for {robot_name}: {robot_xml}")
            continue
        entries.append(
            {
                "name": robot_name,
                "prefix": re.sub(r"[^A-Za-z0-9_]", "_", robot_name),
                "result_path": result_path,
                "result": result,
                "qpos_all": qpos,
                "robot_xml": robot_xml,
                "fps": float(saved_fps),
            }
        )
        fps_values.append(float(saved_fps))
    if not entries:
        raise FileNotFoundError("No supported SMPL motion retarget results were found for --all mode.")
    return entries, (fps_values[0] if fps_values else 30.0)


def prepare_all_smpl_point_overlay(args, entries: list[dict], playback_frame_ids: np.ndarray):
    if not bool(args.all_show_smpl_points):
        return None
    source_entry = next((entry for entry in entries if "source_points" in entry["result"]), None)
    if source_entry is None:
        print(f"[{VIS_PREFIX}][All][SMPL] no source_points found; skipping SMPL point cloud.")
        return None
    result = source_entry["result"]
    all_points = np.asarray(result["source_points"], dtype=np.float32)
    if all_points.ndim != 3 or all_points.shape[-1] != 3:
        raise ValueError(f"source_points must have shape (T, N, 3), got {all_points.shape}")
    if int(playback_frame_ids.max()) >= all_points.shape[0]:
        raise ValueError(
            f"source_points has {all_points.shape[0]} frames, "
            f"but selected max frame is {int(playback_frame_ids.max())}"
        )
    smpl_scale = float(np.asarray(result["smpl_scale"]).reshape(-1)[0]) if "smpl_scale" in result else 1.0
    if abs(smpl_scale) < 1e-8:
        smpl_scale = 1.0
    slot_ids = np.arange(all_points.shape[1], dtype=np.int32)
    slot_ids = slot_ids[:: max(1, int(args.source_slot_stride))]
    if int(args.source_slot_max) > 0:
        slot_ids = slot_ids[: int(args.source_slot_max)]
    points = all_points[playback_frame_ids] / float(smpl_scale)
    colors = source_slot_colors(result, slot_ids, float(args.all_smpl_point_alpha))
    print(
        f"[{VIS_PREFIX}][All][SMPL] drawing original-size SMPL point cloud from "
        f"{source_entry['result_path']} slots={len(slot_ids)}/{all_points.shape[1]} "
        f"smpl_scale={smpl_scale:.6f} offset={list(args.all_smpl_point_offset)}"
    )
    return {
        "points": points,
        "slot_ids": slot_ids.astype(np.int32),
        "colors": colors,
        "radius": float(args.all_smpl_point_radius),
        "offset": np.asarray(args.all_smpl_point_offset, dtype=np.float64),
    }


def run_all_mode(args) -> None:
    entries, saved_fps = load_all_results(args)
    total_frames = min(len(entry["qpos_all"]) for entry in entries)
    start = max(0, int(args.start))
    end = total_frames if int(args.end) < 0 else min(total_frames, int(args.end))
    frame_ids = np.arange(start, end, max(1, int(args.stride)), dtype=np.int32)
    if frame_ids.size == 0:
        raise ValueError(f"No frames selected for --all: total={total_frames}, start={start}, end={end}, stride={args.stride}")

    spacing = float(args.all_spacing)
    center = 0.5 * (len(entries) - 1)
    for idx, entry in enumerate(entries):
        entry["offset"] = np.asarray([(idx - center) * spacing, 0.0, 0.0], dtype=np.float64)

    tmp = tempfile.NamedTemporaryFile("w", suffix=".xml", prefix=".retargetvis_all_", dir=ROOT, delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()
    try:
        all_mode_scene_xml(entries, tmp_path)
        model = mujoco.MjModel.from_xml_path(str(tmp_path))
    finally:
        tmp_path.unlink(missing_ok=True)
    normalize_loaded_model_scene(model)
    configure_collision_geom_rendering(args, model, "All")
    data = mujoco.MjData(model)

    qpos_slices = []
    cursor = 0
    for entry in entries:
        width = entry["qpos_all"].shape[1]
        qpos_slices.append(slice(cursor, cursor + width))
        cursor += width
    if cursor != model.nq:
        raise ValueError(f"Combined qpos width mismatch: results sum={cursor}, model.nq={model.nq}")
    for entry, qslice in zip(entries, qpos_slices):
        entry["playback_qpos"] = entry["qpos_all"][frame_ids]
        entry["qpos_slice"] = qslice
    smpl_point_overlay = prepare_all_smpl_point_overlay(args, entries, frame_ids)

    fps = float(args.fps) if float(args.fps) > 0.0 else float(saved_fps) / max(1, int(args.stride))
    dt = 1.0 / max(fps, 1e-6)
    print(f"[{VIS_PREFIX}][All] robots={len(entries)}, frames={len(frame_ids)}/{total_frames}, fps={fps:.3f}")
    for entry in entries:
        print(
            f"[{VIS_PREFIX}][All] {entry['name']}: result={entry['result_path']} "
            f"xml={entry['robot_xml']} qpos={entry['qpos_all'].shape[1]} offset={entry['offset'].round(3).tolist()}"
        )
    if args.dry_run:
        print(f"[{VIS_PREFIX}][All] dry run complete. model.nq={model.nq}, model.ngeom={model.ngeom}")
        return

    if args.record_video is not None:
        combined_qpos = np.empty((len(frame_ids), model.nq), dtype=np.float64)
        for frame_cursor in range(len(frame_ids)):
            for entry in entries:
                q = entry["playback_qpos"][frame_cursor].copy()
                q[:3] += entry["offset"]
                combined_qpos[frame_cursor, entry["qpos_slice"]] = q
        record_video(args, model, data, combined_qpos, fps, smpl_point_overlay, None, None, [])
        return

    paused = bool(args.paused)
    frame_cursor = 0
    one_second_frames = max(1, int(round(fps)))

    def set_frame(idx: int) -> None:
        for entry in entries:
            q = entry["playback_qpos"][idx].copy()
            q[:3] += entry["offset"]
            data.qpos[entry["qpos_slice"]] = q
        mujoco.mj_forward(model, data)

    def key_callback(keycode: int) -> None:
        nonlocal paused, frame_cursor
        if keycode == ord(" "):
            paused = not paused
            print(f"[{VIS_PREFIX}][All] {'Paused' if paused else 'Playing'}")
        elif keycode in (ord("R"), ord("r")):
            frame_cursor = 0
            print(f"[{VIS_PREFIX}][All] Reset")
        elif keycode in (ord("A"), ord("a")):
            frame_cursor = max(0, frame_cursor - 1)
        elif keycode in (ord("D"), ord("d")):
            frame_cursor = min(len(frame_ids) - 1, frame_cursor + 1)
        elif keycode in (ord("Q"), ord("q")):
            frame_cursor = max(0, frame_cursor - one_second_frames)
            print(f"[{VIS_PREFIX}][All] -1s -> frame {frame_cursor + 1}/{len(frame_ids)}")
        elif keycode in (ord("E"), ord("e")):
            frame_cursor = min(len(frame_ids) - 1, frame_cursor + one_second_frames)
            print(f"[{VIS_PREFIX}][All] +1s -> frame {frame_cursor + 1}/{len(frame_ids)}")

    set_frame(frame_cursor)
    held_seek = HeldSeekController(fps, args.seek_hold_speed)
    viewer = mujoco.viewer.launch_passive(
        model,
        data,
        show_left_ui=bool(args.show_left_ui),
        show_right_ui=bool(args.show_right_ui),
        key_callback=key_callback,
    )
    viewer.cam.distance = max(float(args.camera_distance), spacing * max(2.5, 0.7 * len(entries)))
    viewer.cam.azimuth = float(args.camera_azimuth)
    viewer.cam.elevation = float(args.camera_elevation)
    viewer.cam.lookat[:] = np.asarray([0.0, 0.0, 0.7], dtype=np.float64)
    ensure_user_scene_capacity(viewer, model, needed_overlay_geoms(smpl_point_overlay, None, None))

    hold_text = f", hold Q/E: +/-{float(args.seek_hold_speed):.1f}x" if held_seek.available else ""
    print(f"[{VIS_PREFIX}][All] Space: play/pause, R: reset, A/D: step, Q/E: jump 1s{hold_text}")
    last_frame_time = time.time()
    try:
        while viewer.is_running():
            frame_cursor, manual_seek = held_seek.update(frame_cursor, len(frame_ids))
            set_frame(frame_cursor)
            viewer.user_scn.ngeom = 0
            draw_source_slot_overlay(viewer.user_scn, smpl_point_overlay, frame_cursor)
            if bool(args.follow_root):
                viewer.cam.lookat[:] = np.asarray([0.0, 0.0, 0.7], dtype=np.float64)
            viewer.sync()

            if manual_seek:
                last_frame_time = time.time()
                time.sleep(0.001)
                continue
            if paused:
                last_frame_time = time.time()
                time.sleep(0.03)
                continue
            if bool(args.rate_limit):
                elapsed = time.time() - last_frame_time
                if elapsed < dt:
                    time.sleep(dt - elapsed)
                last_frame_time = time.time()
            else:
                time.sleep(0.001)

            frame_cursor += 1
            if frame_cursor >= len(frame_ids):
                if bool(args.loop):
                    frame_cursor = 0
                else:
                    frame_cursor = len(frame_ids) - 1
                    paused = True
    finally:
        held_seek.close()
        viewer.close()


def trim_qpos_to_model(qpos: np.ndarray, model: mujoco.MjModel, label: str) -> np.ndarray:
    if qpos.shape[1] < model.nq:
        raise ValueError(f"{label} width {qpos.shape[1]} is smaller than model.nq={model.nq}")
    if qpos.shape[1] > model.nq:
        print(f"[{VIS_PREFIX}][WARN] {label} width {qpos.shape[1]} > model.nq={model.nq}; trimming.")
        return qpos[:, : model.nq]
    return qpos


def expand_qpos_to_model(qpos: np.ndarray, model: mujoco.MjModel, label: str, source_objects=None) -> np.ndarray:
    if qpos.shape[1] == model.nq:
        return qpos
    if qpos.shape[1] > model.nq:
        print(f"[{VIS_PREFIX}][WARN] {label} width {qpos.shape[1]} > model.nq={model.nq}; trimming.")
        return qpos[:, : model.nq]
    if not source_objects:
        raise ValueError(f"{label} width {qpos.shape[1]} is smaller than model.nq={model.nq}")

    playback = np.repeat(np.asarray(model.qpos0, dtype=np.float64)[None, :], len(qpos), axis=0)
    playback[:, : qpos.shape[1]] = qpos
    object_qpos = sum(7 for obj in source_objects or [] if obj.get("qpos_addr") is not None)
    print(
        f"[{VIS_PREFIX}][Objects] expanded {label} width {qpos.shape[1]} -> model.nq={model.nq} "
        f"for object freejoints={object_qpos // 7}"
    )
    return playback


def normalize_loaded_model_scene(model: mujoco.MjModel) -> None:
    for geom_id in range(model.ngeom):
        if model.geom_type[geom_id] == mujoco.mjtGeom.mjGEOM_PLANE:
            model.geom_pos[geom_id, 2] = 0.0


def remap_robot_contact_geom_ids(
    result,
    saved_robot_xml: Path,
    loaded_model: mujoco.MjModel,
    field: str = "robot_contact_geom_ids",
) -> np.ndarray | None:
    if field not in result:
        return None
    saved_ids = np.asarray(result[field], dtype=np.int32).reshape(-1)
    if saved_ids.size == 0:
        return saved_ids

    try:
        saved_model = mujoco.MjModel.from_xml_path(str(saved_robot_xml))
    except Exception as exc:
        print(f"[{VIS_PREFIX}][RobotSlots][WARN] cannot load saved robot XML for geom remap: {exc}")
        return saved_ids

    loaded_by_name = {}
    for geom_id in range(loaded_model.ngeom):
        name = mujoco.mj_id2name(loaded_model, mujoco.mjtObj.mjOBJ_GEOM, geom_id)
        if name:
            loaded_by_name[str(name)] = int(geom_id)

    remapped = saved_ids.copy()
    changed = 0
    missing = []
    for saved_geom_id in np.unique(saved_ids):
        saved_geom_id = int(saved_geom_id)
        if saved_geom_id < 0 or saved_geom_id >= saved_model.ngeom:
            missing.append(f"id:{saved_geom_id}")
            continue
        name = mujoco.mj_id2name(saved_model, mujoco.mjtObj.mjOBJ_GEOM, saved_geom_id)
        if name and str(name) in loaded_by_name:
            loaded_geom_id = loaded_by_name[str(name)]
            if loaded_geom_id != saved_geom_id:
                remapped[saved_ids == saved_geom_id] = loaded_geom_id
                changed += 1
            continue
        if saved_geom_id >= loaded_model.ngeom:
            missing.append(str(name) if name else f"id:{saved_geom_id}")

    if changed > 0:
        print(
            f"[{VIS_PREFIX}][RobotSlots] remapped robot slot geom ids by name: "
            f"changed_geoms={changed}, saved_ngeom={saved_model.ngeom}, loaded_ngeom={loaded_model.ngeom}"
        )
    if missing:
        print(
            f"[{VIS_PREFIX}][RobotSlots][WARN] could not remap {len(missing)} saved geoms; "
            f"examples={missing[:5]}"
        )
    return remapped


def nonvisual_collision_geom_ids(model: mujoco.MjModel) -> np.ndarray:
    bodies_with_visual_geom = set()
    for geom_id in range(model.ngeom):
        if model.geom_type[geom_id] == mujoco.mjtGeom.mjGEOM_PLANE:
            continue
        if int(model.geom_group[geom_id]) == 1:
            bodies_with_visual_geom.add(int(model.geom_bodyid[geom_id]))
            continue
        if int(model.geom_contype[geom_id]) == 0 and int(model.geom_conaffinity[geom_id]) == 0:
            bodies_with_visual_geom.add(int(model.geom_bodyid[geom_id]))

    ids = []
    for geom_id in range(model.ngeom):
        if model.geom_type[geom_id] == mujoco.mjtGeom.mjGEOM_PLANE:
            continue
        if int(model.geom_group[geom_id]) == 1:
            continue
        if int(model.geom_contype[geom_id]) == 0 and int(model.geom_conaffinity[geom_id]) == 0:
            continue
        if int(model.geom_bodyid[geom_id]) not in bodies_with_visual_geom:
            continue
        ids.append(geom_id)
    return np.asarray(ids, dtype=np.int32)


def configure_collision_geom_rendering(args, model: mujoco.MjModel, label: str = "") -> None:
    geom_ids = nonvisual_collision_geom_ids(model)
    if geom_ids.size == 0:
        return
    if bool(args.show_collision_geoms):
        alpha = float(np.clip(float(args.collision_geom_alpha), 0.0, 1.0))
        model.geom_rgba[geom_ids, 3] = alpha
        state = f"shown alpha={alpha:.3f}"
    else:
        model.geom_rgba[geom_ids, 3] = 0.0
        state = "hidden"
    suffix = f"[{label}]" if label else ""
    print(f"[{VIS_PREFIX}]{suffix} collision geoms for rendering: {state}, count={len(geom_ids)}")


def selected_slot_ids(result, mode: str) -> np.ndarray:
    if mode == "selected" and "surface_vector_slot_ids" in result:
        return np.asarray(result["surface_vector_slot_ids"], dtype=np.int32).reshape(-1)
    if "source_points" not in result:
        return np.empty(0, dtype=np.int32)
    return np.arange(np.asarray(result["source_points"]).shape[1], dtype=np.int32)


def is_nr_result(result) -> bool:
    return str(scalar_string(result["source_format"]) if "source_format" in result else "").startswith("nr_fbx")


def reconstruct_nr_full_source_slots(result, playback_frame_ids: np.ndarray) -> np.ndarray:
    import nr_source  # noqa: WPS433
    import smpl_surface_retarget_common as common  # noqa: WPS433

    source_path = resolve_source_data_path(result)
    if source_path is None:
        raise ValueError("NR result does not contain a readable source_data path.")
    motions, _source_format = common.load_motion_collection(source_path)
    seq_key = scalar_string(result["source_sequence_key"]) if "source_sequence_key" in result else ""
    if seq_key not in motions:
        raise KeyError(f"NR source sequence {seq_key!r} not found under {source_path}")
    sequence = motions[seq_key]

    slots_path = Path(scalar_string(result["slots_path"]))
    slots_field = scalar_string(result["slots_field"]) if "slots_field" in result else "reconstructed_slots"
    slot_name = scalar_string(result["smpl_slot_name"]) if "smpl_slot_name" in result else "auto"
    full_slots, center_mode, _slot_name = common.load_slot_data(slots_path, slot_name, slots_field)
    template_vertices, template_joints, faces, joint_names = nr_source.template_vertices_joints_faces(sequence)
    template_vertices, _template_joints, _center = common.center_source_template(
        template_vertices,
        template_joints,
        center_mode,
        joint_names=joint_names,
        source_type="nr_fbx",
    )
    binding = common.bind_points_to_mesh(full_slots, template_vertices, faces)

    result_frame_ids = np.asarray(result.get("frame_ids", []), dtype=np.int32).reshape(-1)
    playback_frame_ids = np.asarray(playback_frame_ids, dtype=np.int32).reshape(-1)
    if result_frame_ids.size:
        source_frame_ids = result_frame_ids[playback_frame_ids]
    else:
        source_frame_ids = playback_frame_ids
    points = nr_source.skin_surface_binding_points(sequence, source_frame_ids, faces, binding)
    source_up = scalar_string(result["source_output_up"]) if "source_output_up" in result else "y"
    points = common.source_points_to_retarget_frame(points, "nr_fbx", source_up)
    ground_z = float(np.asarray(result.get("ground_z", [0.0]), dtype=np.float32).reshape(-1)[0])
    points[:, :, 2] -= ground_z
    smpl_scale = float(np.asarray(result.get("smpl_scale", [1.0]), dtype=np.float32).reshape(-1)[0])
    points *= smpl_scale
    print(
        f"[{VIS_PREFIX}][NRSlots] reconstructed full source slots: "
        f"frames={len(points)} slots={points.shape[1]}"
    )
    return points.astype(np.float32, copy=False)


def result_slot_ids(result, mode: str, slot_count: int) -> np.ndarray:
    if mode == "selected" and "surface_vector_slot_ids" in result:
        return np.asarray(result["surface_vector_slot_ids"], dtype=np.int32).reshape(-1)
    return np.arange(int(slot_count), dtype=np.int32)


def source_slot_colors(result, slot_ids: np.ndarray, alpha: float) -> np.ndarray:
    del result
    colors = np.empty((len(slot_ids), 4), dtype=np.float32)
    colors[:] = (0.10, 0.55, 1.0, float(alpha))
    return colors


def robot_slot_colors(result, slot_ids: np.ndarray, alpha: float) -> np.ndarray:
    rest = set(np.asarray(result.get("surface_vector_rest_slot_ids", []), dtype=np.int32).reshape(-1).tolist())
    hand = set(np.asarray(result.get("surface_vector_hand_slot_ids", []), dtype=np.int32).reshape(-1).tolist())
    foot = set(np.asarray(result.get("surface_vector_foot_slot_ids", []), dtype=np.int32).reshape(-1).tolist())
    colors = np.empty((len(slot_ids), 4), dtype=np.float32)
    for i, slot_id in enumerate(slot_ids.tolist()):
        if slot_id in hand:
            rgb = (1.0, 0.62, 0.18)
        elif slot_id in foot:
            rgb = (0.20, 1.0, 0.55)
        elif slot_id in rest:
            rgb = (0.22, 0.62, 1.0)
        else:
            rgb = (0.78, 0.78, 0.78)
        colors[i] = (*rgb, float(alpha))
    return colors


def ground_contact_colors(distances: np.ndarray, threshold: float, alpha: float) -> np.ndarray:
    distances = np.asarray(distances, dtype=np.float32).reshape(-1)
    threshold = max(float(threshold), 1e-8)
    t = np.clip(distances / threshold, 0.0, 1.0)[:, None]
    near = np.asarray([1.0, 0.04, 0.02], dtype=np.float32)
    far = np.asarray([1.0, 0.92, 0.05], dtype=np.float32)
    rgb = near[None, :] * (1.0 - t) + far[None, :] * t
    rgba = np.empty((len(distances), 4), dtype=np.float32)
    rgba[:, :3] = rgb
    rgba[:, 3] = float(alpha)
    return rgba


def prepare_source_slot_overlay(args, result, playback_frame_ids: np.ndarray):
    if not bool(args.show_source_slots):
        return None
    if "source_points" not in result:
        print(f"[{VIS_PREFIX}][Slots] result has no source_points; skipping source-slot overlay.")
        return None

    use_full_nr_slots = False
    all_points = (
        reconstruct_nr_full_source_slots(result, playback_frame_ids)
        if use_full_nr_slots
        else np.asarray(result["source_points"], dtype=np.float32)
    )
    if all_points.ndim != 3 or all_points.shape[-1] != 3:
        raise ValueError(f"source_points must have shape (T, N, 3), got {all_points.shape}")
    if not use_full_nr_slots and all_points.shape[0] == 0:
        print(f"[{VIS_PREFIX}][Slots] source points were not saved; skipping source-slot overlay.")
        return None
    if not use_full_nr_slots and int(playback_frame_ids.max()) >= all_points.shape[0]:
        raise ValueError(
            f"source_points has {all_points.shape[0]} frames, "
            f"but selected max frame is {int(playback_frame_ids.max())}"
        )

    slot_ids = (
        np.arange(all_points.shape[1], dtype=np.int32)
        if use_full_nr_slots
        else selected_slot_ids(result, str(args.source_slot_mode))
    )
    valid = (slot_ids >= 0) & (slot_ids < all_points.shape[1])
    slot_ids = slot_ids[valid]
    slot_ids = slot_ids[:: max(1, int(args.source_slot_stride))]
    if int(args.source_slot_max) > 0:
        slot_ids = slot_ids[: int(args.source_slot_max)]
    if slot_ids.size == 0:
        print(f"[{VIS_PREFIX}][Slots] no valid source slots selected; skipping source-slot overlay.")
        return None

    points = all_points if use_full_nr_slots else all_points[playback_frame_ids]
    colors = source_slot_colors(result, slot_ids, float(args.source_slot_alpha))
    print(
        f"[{VIS_PREFIX}][Slots] drawing {len(slot_ids)} {args.source_slot_mode} source slots "
        f"(stride={max(1, int(args.source_slot_stride))})"
    )
    return {
        "points": points,
        "slot_ids": slot_ids.astype(np.int32),
        "colors": colors,
        "radius": float(args.source_slot_radius),
        "offset": np.asarray(args.source_slot_offset, dtype=np.float64),
        "full_nr_slots": bool(use_full_nr_slots),
        "result_frame_ids": np.asarray(playback_frame_ids, dtype=np.int32),
    }


def prepare_robot_slot_overlay(
    args,
    result,
    robot_contact_geom_ids=None,
    robot_all_contact_geom_ids=None,
):
    if not bool(args.show_robot_slots):
        return None
    if "robot_contact_geom_ids" not in result or "robot_contact_local_pos" not in result:
        print(f"[{VIS_PREFIX}][RobotSlots] result has no robot slot binding; skipping robot-slot overlay.")
        return None
    use_all_binding = (
        str(args.robot_slot_mode) == "all"
        and "robot_all_contact_geom_ids" in result
        and "robot_all_contact_local_pos" in result
    )
    if use_all_binding:
        geom_ids = (
            np.asarray(result["robot_all_contact_geom_ids"], dtype=np.int32).reshape(-1)
            if robot_all_contact_geom_ids is None
            else np.asarray(robot_all_contact_geom_ids, dtype=np.int32).reshape(-1)
        )
        local_pos = np.asarray(result["robot_all_contact_local_pos"], dtype=np.float32)
    else:
        geom_ids = (
            np.asarray(result["robot_contact_geom_ids"], dtype=np.int32).reshape(-1)
            if robot_contact_geom_ids is None
            else np.asarray(robot_contact_geom_ids, dtype=np.int32).reshape(-1)
        )
        local_pos = np.asarray(result["robot_contact_local_pos"], dtype=np.float32)
    if local_pos.ndim != 2 or local_pos.shape[-1] != 3:
        raise ValueError(f"robot_contact_local_pos must have shape (N, 3), got {local_pos.shape}")
    if len(geom_ids) != len(local_pos):
        raise ValueError(f"robot slot binding mismatch: geom_ids={len(geom_ids)}, local_pos={len(local_pos)}")

    slot_ids = result_slot_ids(result, str(args.robot_slot_mode), len(local_pos))
    valid = (slot_ids >= 0) & (slot_ids < len(local_pos))
    slot_ids = slot_ids[valid]
    slot_ids = slot_ids[:: max(1, int(args.robot_slot_stride))]
    if int(args.robot_slot_max) > 0:
        slot_ids = slot_ids[: int(args.robot_slot_max)]
    if slot_ids.size == 0:
        print(f"[{VIS_PREFIX}][RobotSlots] no valid robot slots selected; skipping robot-slot overlay.")
        return None

    print(
        f"[{VIS_PREFIX}][RobotSlots] drawing {len(slot_ids)} {args.robot_slot_mode} robot surface slots "
        f"(stride={max(1, int(args.robot_slot_stride))})"
    )
    return {
        "geom_ids": geom_ids,
        "local_pos": local_pos,
        "slot_ids": slot_ids.astype(np.int32),
        "colors": robot_slot_colors(result, slot_ids, float(args.robot_slot_alpha)),
        "radius": float(args.robot_slot_radius),
    }


def prepare_ground_contact_overlay(args, result, playback_frame_ids: np.ndarray, robot_contact_geom_ids=None):
    if not bool(args.show_ground_contact_map):
        return None
    if "source_ground_contact_distances" not in result:
        print(f"[{VIS_PREFIX}][GroundContactMap] result has no source_ground_contact_distances; skipping.")
        return None
    if "robot_contact_geom_ids" not in result or "robot_contact_local_pos" not in result:
        print(f"[{VIS_PREFIX}][GroundContactMap] result has no robot slot binding; skipping.")
        return None

    distances = np.asarray(result["source_ground_contact_distances"], dtype=np.float32)
    if distances.ndim != 2:
        raise ValueError(f"source_ground_contact_distances must have shape (T, N), got {distances.shape}")
    if distances.size == 0:
        print(f"[{VIS_PREFIX}][GroundContactMap] empty source_ground_contact_distances; skipping.")
        return None
    if int(playback_frame_ids.max()) >= distances.shape[0]:
        raise ValueError(
            f"source_ground_contact_distances has {distances.shape[0]} frames, "
            f"but selected max frame is {int(playback_frame_ids.max())}"
        )

    geom_ids = (
        np.asarray(result["robot_contact_geom_ids"], dtype=np.int32).reshape(-1)
        if robot_contact_geom_ids is None
        else np.asarray(robot_contact_geom_ids, dtype=np.int32).reshape(-1)
    )
    local_pos = np.asarray(result["robot_contact_local_pos"], dtype=np.float32)
    if len(geom_ids) != distances.shape[1] or len(local_pos) != distances.shape[1]:
        raise ValueError(
            f"Ground-contact slot count mismatch: distances={distances.shape[1]}, "
            f"geom_ids={len(geom_ids)}, local_pos={len(local_pos)}"
        )
    slot_ids = result_slot_ids(result, "selected", distances.shape[1])
    valid = (slot_ids >= 0) & (slot_ids < distances.shape[1])
    slot_ids = slot_ids[valid]
    if slot_ids.size == 0:
        print(f"[{VIS_PREFIX}][GroundContactMap] no selected slots available; skipping.")
        return None

    rank_distances = (
        np.asarray(result["source_ground_contact_weight_distances"], dtype=np.float32)
        if "source_ground_contact_weight_distances" in result
        else distances
    )
    if rank_distances.shape != distances.shape:
        print(
            f"[{VIS_PREFIX}][GroundContactMap][WARN] source_ground_contact_weight_distances "
            f"shape {rank_distances.shape} does not match distances {distances.shape}; using distances for ranking."
        )
        rank_distances = distances

    if float(args.ground_contact_map_threshold) >= 0.0:
        threshold = float(args.ground_contact_map_threshold)
    elif "ground_contact_map_threshold" in result:
        threshold = float(np.asarray(result["ground_contact_map_threshold"]).reshape(-1)[0])
    else:
        threshold = 0.075

    if int(args.ground_contact_map_max_points) >= 0:
        max_points = int(args.ground_contact_map_max_points)
    elif "ground_contact_map_max_points" in result:
        max_points = int(np.asarray(result["ground_contact_map_max_points"]).reshape(-1)[0])
    else:
        max_points = 64

    selected_distances = distances[playback_frame_ids][:, slot_ids]
    selected_rank_distances = rank_distances[playback_frame_ids][:, slot_ids]
    active_counts = (selected_distances <= threshold).sum(axis=1)
    capacity = int(active_counts.max()) if max_points == 0 else min(int(active_counts.max()), max(0, max_points))
    print(
        f"[{VIS_PREFIX}][GroundContactMap] drawing active selected robot slots threshold={threshold:.4f}, "
        f"selected_slots={len(slot_ids)}, max_points={max_points}, active min/mean/max="
        f"{int(active_counts.min())}/{float(active_counts.mean()):.1f}/{int(active_counts.max())}"
    )
    return {
        "distances": selected_distances,
        "rank_distances": selected_rank_distances,
        "geom_ids": geom_ids[slot_ids],
        "local_pos": local_pos[slot_ids],
        "threshold": float(threshold),
        "max_points": int(max_points),
        "radius": float(args.ground_contact_map_radius),
        "alpha": float(args.ground_contact_map_alpha),
        "capacity": int(capacity),
    }


def template_points_to_world(data, geom_ids: np.ndarray, local_pos: np.ndarray, point_ids: np.ndarray) -> np.ndarray:
    point_ids = np.asarray(point_ids, dtype=np.int32).reshape(-1)
    out = np.empty((len(point_ids), 3), dtype=np.float64)
    if len(point_ids) == 0:
        return out
    point_geom_ids = np.asarray(geom_ids, dtype=np.int32)[point_ids]
    local = np.asarray(local_pos, dtype=np.float64)[point_ids]
    for geom_id in np.unique(point_geom_ids):
        mask = point_geom_ids == int(geom_id)
        rot = data.geom_xmat[int(geom_id)].reshape(3, 3)
        pos = data.geom_xpos[int(geom_id)]
        out[mask] = local[mask] @ rot.T + pos
    return out


def ensure_user_scene_capacity(viewer, model, needed: int) -> None:
    if viewer.user_scn.maxgeom >= needed:
        return
    try:
        viewer.user_scn = mujoco.MjvScene(model, maxgeom=int(needed))
        print(f"[{VIS_PREFIX}] increased user_scn maxgeom to {needed}")
    except Exception as exc:
        print(
            f"[{VIS_PREFIX}][WARN] cannot resize user_scn ({exc}); "
            f"will draw at most {viewer.user_scn.maxgeom} geoms."
        )


def add_scene_sphere(scene, pos, radius: float, rgba) -> bool:
    if scene.ngeom >= scene.maxgeom:
        return False
    geom = scene.geoms[scene.ngeom]
    mujoco.mjv_initGeom(
        geom,
        mujoco.mjtGeom.mjGEOM_SPHERE,
        np.array([radius, radius, radius], dtype=np.float64),
        np.asarray(pos, dtype=np.float64),
        np.eye(3, dtype=np.float64).reshape(9),
        np.asarray(rgba, dtype=np.float32),
    )
    geom.category = mujoco.mjtCatBit.mjCAT_DECOR
    scene.ngeom += 1
    return True


def draw_source_slot_overlay(scene, overlay, frame_cursor: int) -> None:
    if overlay is None:
        return
    points = overlay["points"][frame_cursor, overlay["slot_ids"]] + overlay["offset"]
    for point, rgba in zip(points, overlay["colors"]):
        if not add_scene_sphere(scene, point, overlay["radius"], rgba):
            print(f"[{VIS_PREFIX}][Slots][WARN] scene full at {scene.ngeom}/{scene.maxgeom}")
            return


def draw_robot_slot_overlay(scene, data, overlay) -> None:
    if overlay is None:
        return
    slot_ids = overlay["slot_ids"]
    points = template_points_to_world(data, overlay["geom_ids"], overlay["local_pos"], slot_ids)
    for point, rgba in zip(points, overlay["colors"]):
        if not add_scene_sphere(scene, point, overlay["radius"], rgba):
            print(
                f"[{VIS_PREFIX}][RobotSlots][WARN] scene full at "
                f"{scene.ngeom}/{scene.maxgeom}"
            )
            return


def draw_ground_contact_overlay(scene, data, overlay, frame_cursor: int) -> None:
    if overlay is None:
        return
    distances = np.asarray(overlay["distances"][frame_cursor], dtype=np.float32)
    rank_distances = np.asarray(overlay.get("rank_distances", overlay["distances"])[frame_cursor], dtype=np.float32)
    active = np.where(distances <= float(overlay["threshold"]))[0].astype(np.int32)
    if active.size == 0:
        return
    max_points = int(overlay["max_points"])
    if max_points > 0 and active.size > max_points:
        active = active[np.argsort(rank_distances[active])[:max_points]]
    points = template_points_to_world(data, overlay["geom_ids"], overlay["local_pos"], active)
    colors = ground_contact_colors(distances[active], float(overlay["threshold"]), float(overlay["alpha"]))
    for point, rgba in zip(points, colors):
        if not add_scene_sphere(scene, point, overlay["radius"], rgba):
            print(
                f"[{VIS_PREFIX}][GroundContactMap][WARN] scene full at "
                f"{scene.ngeom}/{scene.maxgeom}"
            )
            return


def bind_source_object_freejoints(model, source_objects) -> None:
    for obj in source_objects or []:
        joint_name = obj.get("freejoint_name")
        if not joint_name:
            obj["qpos_addr"] = None
            continue
        joint_id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, str(joint_name))
        if joint_id < 0:
            raise ValueError(f"Cannot find source object freejoint: {joint_name}")
        obj["qpos_addr"] = int(model.jnt_qposadr[joint_id])


def apply_source_object_motion(data, source_objects, frame_cursor: int) -> None:
    for obj in source_objects or []:
        qpos_addr = obj.get("qpos_addr")
        motion = obj.get("motion")
        if qpos_addr is None or motion is None:
            continue
        frame = min(int(frame_cursor), len(motion["positions"]) - 1)
        qpos_addr = int(qpos_addr)
        data.qpos[qpos_addr : qpos_addr + 3] = motion["positions"][frame]
        data.qpos[qpos_addr + 3 : qpos_addr + 7] = motion["quats_wxyz"][frame]


def needed_overlay_geoms(source_overlay, robot_overlay, ground_overlay) -> int:
    needed_geoms = 128
    if source_overlay is not None:
        needed_geoms += len(source_overlay["slot_ids"])
    if robot_overlay is not None:
        needed_geoms += len(robot_overlay["slot_ids"])
    if ground_overlay is not None:
        needed_geoms += int(ground_overlay["capacity"])
    return int(needed_geoms)


def copy_mjv_geom(dst, src, alpha: float) -> None:
    """Copy one MuJoCo visual geom into an existing scene geom slot."""
    scalar_attrs = (
        "type",
        "dataid",
        "objtype",
        "objid",
        "category",
        "matid",
        "segid",
        "texcoord",
        "emission",
        "specular",
        "shininess",
        "reflectance",
        "camdist",
        "modelrbound",
        "transparent",
    )
    for attr in scalar_attrs:
        try:
            setattr(dst, attr, getattr(src, attr))
        except Exception:
            pass
    for attr in ("size", "pos", "mat", "rgba"):
        try:
            getattr(dst, attr)[:] = getattr(src, attr)
        except Exception:
            pass
    try:
        dst.category = mujoco.mjtCatBit.mjCAT_DECOR
    except Exception:
        pass
    try:
        dst.rgba[3] = min(float(dst.rgba[3]), clamp_float(float(alpha), 0.0, 1.0))
    except Exception:
        pass
    try:
        dst.transparent = 1
    except Exception:
        pass
    try:
        dst.label = ""
    except Exception:
        pass


def should_skip_ghost_geom(geom) -> bool:
    try:
        if int(geom.type) == int(mujoco.mjtGeom.mjGEOM_PLANE):
            return True
    except Exception:
        pass
    return False


def ghost_interval_seconds(ui: dict) -> float:
    return clamp_float(float(ui.get("ghost_interval_seconds", 1.0)), 0.0, 5.0)


def ghost_interval_frames(ui: dict, fps: float) -> int:
    return max(1, int(round(ghost_interval_seconds(ui) * max(float(fps), 1e-6))))


def add_ghost_sample(ui: dict, playback_qpos, frame_cursor: int, fps: float) -> None:
    if not bool(ui.get("ghost_enabled", False)) or bool(ui.get("paused", True)):
        return
    frame_cursor = int(frame_cursor)
    interval = ghost_interval_frames(ui, fps)
    last_frame = ui.get("last_ghost_sample_frame")
    if last_frame is not None and abs(frame_cursor - int(last_frame)) < interval:
        return
    ghost_frames = ui.setdefault("ghost_frame_set", set())
    if frame_cursor in ghost_frames:
        ui["last_ghost_sample_frame"] = frame_cursor
        return
    ghosts = ui.setdefault("ghosts", [])
    ghosts.append({"frame": frame_cursor, "qpos": np.asarray(playback_qpos[frame_cursor]).copy()})
    ghost_frames.add(frame_cursor)
    ui["last_ghost_sample_frame"] = frame_cursor


def draw_ghost_trail(
    scene,
    model,
    ghost_data,
    ghost_scene,
    opt,
    pert,
    cam,
    source_objects,
    ghosts,
) -> None:
    if not ghosts:
        return
    ghost_count = max(1, len(ghosts))
    for ghost_i, ghost in enumerate(ghosts):
        frame = int(ghost["frame"])
        ghost_data.qpos[:] = ghost["qpos"]
        apply_source_object_motion(ghost_data, source_objects, frame)
        mujoco.mj_forward(model, ghost_data)
        mujoco.mjv_updateScene(model, ghost_data, opt, pert, cam, mujoco.mjtCatBit.mjCAT_ALL, ghost_scene)
        age_ratio = 1.0 if ghost_count <= 1 else ghost_i / max(1, ghost_count - 1)
        alpha = clamp_float(0.2 + 0.7 * age_ratio, 0.0, 1.0)
        for geom_i in range(int(ghost_scene.ngeom)):
            if int(scene.ngeom) >= int(scene.maxgeom):
                print(f"[{VIS_PREFIX}][WARN] scene full while drawing ghost trail at {scene.ngeom}/{scene.maxgeom}")
                return
            src = ghost_scene.geoms[geom_i]
            if should_skip_ghost_geom(src):
                continue
            copy_mjv_geom(scene.geoms[scene.ngeom], src, alpha)
            scene.ngeom += 1


def import_imageio():
    try:
        import imageio.v2 as imageio
    except Exception as exc:
        raise RuntimeError("Snapshot/recording requires imageio with an ffmpeg-capable backend.") from exc
    return imageio


def capture_path(prefix: str, suffix: str) -> Path:
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    millis = int((time.time() % 1.0) * 1000)
    return CAPTURE_DIR / f"{prefix}_{timestamp}_{millis:03d}{suffix}"


def render_capture_frame(context, scene, rgb) -> np.ndarray:
    viewport = mujoco.MjrRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT)
    try:
        mujoco.mjr_setBuffer(mujoco.mjtFramebuffer.mjFB_OFFSCREEN, context)
        mujoco.mjr_render(viewport, scene, context)
        mujoco.mjr_readPixels(rgb, None, viewport, context)
    finally:
        mujoco.mjr_setBuffer(mujoco.mjtFramebuffer.mjFB_WINDOW, context)
    return np.flipud(rgb).copy()


def write_snapshot_async(path: Path, image: np.ndarray) -> None:
    def worker() -> None:
        try:
            imageio = import_imageio()
            imageio.imwrite(str(path), image)
            print(f"[{VIS_PREFIX}] saved snapshot {path} ({CAPTURE_WIDTH}x{CAPTURE_HEIGHT})")
        except Exception as exc:
            print(f"[{VIS_PREFIX}][WARN] snapshot write failed: {exc}")

    thread = threading.Thread(target=worker, name="retargetvis-snapshot-writer", daemon=False)
    thread.start()


class AsyncVideoWriter:
    def __init__(self, path: Path, fps: float, max_queue: int = 6):
        self.path = Path(path)
        self.fps = max(float(fps), 1e-6)
        self.queue: queue.Queue[np.ndarray | None] = queue.Queue(maxsize=max(1, int(max_queue)))
        self.submitted = 0
        self.written = 0
        self.dropped = 0
        self._closed = False
        self._thread = threading.Thread(target=self._run, name="retargetvis-video-writer", daemon=False)
        self._thread.start()

    def _run(self) -> None:
        writer = None
        try:
            imageio = import_imageio()
            writer = imageio.get_writer(str(self.path), fps=self.fps, macro_block_size=1)
            while True:
                frame = self.queue.get()
                try:
                    if frame is None:
                        return
                    writer.append_data(frame)
                    self.written += 1
                finally:
                    self.queue.task_done()
        except Exception as exc:
            print(f"[{VIS_PREFIX}][WARN] recording writer failed: {exc}")
        finally:
            if writer is not None:
                try:
                    writer.close()
                except Exception as exc:
                    print(f"[{VIS_PREFIX}][WARN] closing recording writer failed: {exc}")
            print(
                f"[{VIS_PREFIX}] saved recording {self.path} "
                f"({self.written}/{self.submitted} frames written, dropped={self.dropped}, "
                f"{CAPTURE_WIDTH}x{CAPTURE_HEIGHT})"
            )

    def can_accept(self) -> bool:
        return not self._closed and not self.queue.full()

    def submit(self, frame: np.ndarray) -> bool:
        if self._closed:
            return False
        try:
            self.queue.put_nowait(frame)
            self.submitted += 1
            return True
        except queue.Full:
            self.dropped += 1
            return False

    def drop_frame(self) -> None:
        self.dropped += 1

    def close_async(self) -> None:
        if self._closed:
            return
        self._closed = True
        try:
            self.queue.put_nowait(None)
        except queue.Full:
            self.queue.get_nowait()
            self.queue.task_done()
            self.dropped += 1
            self.queue.put_nowait(None)


def make_camera(args, lookat, distance: float | None = None) -> mujoco.MjvCamera:
    cam = mujoco.MjvCamera()
    mujoco.mjv_defaultCamera(cam)
    cam.type = mujoco.mjtCamera.mjCAMERA_FREE
    cam.distance = float(args.camera_distance if distance is None else distance)
    cam.azimuth = float(args.camera_azimuth)
    cam.elevation = float(args.camera_elevation)
    cam.lookat[:] = np.asarray(lookat, dtype=np.float64)[:3]
    return cam


def source_ground_offset(args) -> np.ndarray:
    offset = np.asarray(args.source_slot_offset, dtype=np.float64).copy()
    offset[2] = 0.0
    return offset


def robot_smpl_midpoint(args, robot_center) -> np.ndarray:
    robot_center = np.asarray(robot_center, dtype=np.float64)[:3]
    midpoint = robot_center + 0.5 * source_ground_offset(args)
    midpoint[2] = 0.0
    return midpoint


def fixed_camera_lookat(args, playback_qpos, source_overlay) -> np.ndarray:
    if str(args.camera_mode) not in ("fixed-robot-smpl-midpoint", "robot-smpl-midpoint"):
        return np.asarray(playback_qpos[0, :3], dtype=np.float64)
    robot_center = np.asarray(playback_qpos[:, :3], dtype=np.float64).mean(axis=0)
    return robot_smpl_midpoint(args, robot_center)


def fixed_camera_distance(args, playback_qpos, source_overlay, fixed_lookat) -> float:
    base_distance = float(args.camera_distance)
    if str(args.camera_mode) not in ("fixed-robot-smpl-midpoint", "robot-smpl-midpoint"):
        return base_distance

    robot_pos = np.asarray(playback_qpos[:, :3], dtype=np.float64)
    source_pos = robot_pos + source_ground_offset(args)
    bounds_min = np.minimum(robot_pos.min(axis=0), source_pos.min(axis=0))
    bounds_max = np.maximum(robot_pos.max(axis=0), source_pos.max(axis=0))

    corners = np.asarray(
        [
            [bounds_min[0], bounds_min[1], bounds_min[2]],
            [bounds_min[0], bounds_min[1], bounds_max[2]],
            [bounds_min[0], bounds_max[1], bounds_min[2]],
            [bounds_min[0], bounds_max[1], bounds_max[2]],
            [bounds_max[0], bounds_min[1], bounds_min[2]],
            [bounds_max[0], bounds_min[1], bounds_max[2]],
            [bounds_max[0], bounds_max[1], bounds_min[2]],
            [bounds_max[0], bounds_max[1], bounds_max[2]],
        ],
        dtype=np.float64,
    )
    radius = float(np.linalg.norm(corners - np.asarray(fixed_lookat, dtype=np.float64), axis=1).max())
    return max(base_distance, radius * 2.2)


def camera_frame_lookat(args, data, source_overlay, frame_cursor: int, fixed_lookat) -> np.ndarray | None:
    camera_mode = str(args.camera_mode)
    if camera_mode == "fixed-robot-smpl-midpoint":
        return np.asarray(fixed_lookat, dtype=np.float64)
    if camera_mode == "robot-smpl-midpoint":
        return robot_smpl_midpoint(args, data.qpos[:3])
    if bool(args.follow_root):
        return np.asarray(data.qpos[:3], dtype=np.float64)
    return None


def apply_camera_pose(
    args,
    cam,
    data,
    source_overlay,
    frame_cursor: int,
    fixed_lookat,
    fixed_distance: float,
    camera_state=None,
    lock_camera: bool | None = None,
    update_lookat: bool = True,
) -> None:
    if not bool(update_lookat):
        return
    lookat = camera_frame_lookat(args, data, source_overlay, frame_cursor, fixed_lookat)
    if lookat is not None:
        smooth = float(np.clip(float(args.camera_smooth), 0.0, 0.999))
        if camera_state is not None and smooth > 0.0:
            if camera_state.get("lookat") is None or frame_cursor == 0:
                camera_state["lookat"] = np.asarray(lookat, dtype=np.float64).copy()
            else:
                camera_state["lookat"] = smooth * camera_state["lookat"] + (1.0 - smooth) * np.asarray(lookat, dtype=np.float64)
            cam.lookat[:] = camera_state["lookat"]
        else:
            cam.lookat[:] = lookat
    use_lock_camera = bool(args.lock_camera) if lock_camera is None else bool(lock_camera)
    if use_lock_camera and str(args.camera_mode) != "root":
        cam.distance = float(fixed_distance)
        cam.azimuth = float(args.camera_azimuth)
        cam.elevation = float(args.camera_elevation)


def record_video(args, model, data, playback_qpos, fps, source_overlay, robot_overlay, ground_overlay, source_objects) -> None:
    try:
        import imageio.v2 as imageio
    except Exception as exc:
        raise RuntimeError("Recording requires imageio with an ffmpeg-capable backend.") from exc

    record_path = Path(args.record_video)
    record_path.parent.mkdir(parents=True, exist_ok=True)
    width = int(args.record_width)
    height = int(args.record_height)
    if width <= 0 or height <= 0:
        raise ValueError(f"record dimensions must be positive, got {width}x{height}")
    video_fps = float(args.record_fps) if float(args.record_fps) > 0.0 else float(fps)
    video_fps = max(video_fps, 1e-6)

    try:
        model.vis.global_.offwidth = width
        model.vis.global_.offheight = height
        gl_context = mujoco.GLContext(width, height)
        gl_context.make_current()
        scene_maxgeom = max(
            model.ngeom + needed_overlay_geoms(source_overlay, robot_overlay, ground_overlay) + 256,
            1024,
        )
        scene = mujoco.MjvScene(model, maxgeom=int(scene_maxgeom))
        context = mujoco.MjrContext(model, mujoco.mjtFontScale.mjFONTSCALE_150)
    except Exception as exc:
        gl_backend = os.environ.get("MUJOCO_GL", "<unset>")
        raise RuntimeError(
            "Could not create a MuJoCo offscreen OpenGL context for recording. "
            f"Current MUJOCO_GL={gl_backend!r}. Run with a valid display/GL backend, "
            "or set MUJOCO_GL=egl/osmesa if that backend is installed correctly."
        ) from exc

    viewport = mujoco.MjrRect(0, 0, width, height)
    option = mujoco.MjvOption()
    fixed_lookat = fixed_camera_lookat(args, playback_qpos, source_overlay)
    fixed_distance = fixed_camera_distance(args, playback_qpos, source_overlay, fixed_lookat)
    cam = make_camera(args, fixed_lookat, fixed_distance)
    rgb = np.empty((height, width, 3), dtype=np.uint8)
    print(
        f"[{VIS_PREFIX}] recording {len(playback_qpos)} frames -> "
        f"{record_path} ({width}x{height}, fps={video_fps:.3f})"
    )

    camera_state = {"lookat": None}
    try:
        with imageio.get_writer(str(record_path), fps=video_fps, macro_block_size=1) as writer:
            for frame_cursor in range(len(playback_qpos)):
                data.qpos[:] = playback_qpos[frame_cursor]
                apply_source_object_motion(data, source_objects, frame_cursor)
                mujoco.mj_forward(model, data)
                apply_camera_pose(args, cam, data, source_overlay, frame_cursor, fixed_lookat, fixed_distance, camera_state)
                mujoco.mjv_updateScene(
                    model,
                    data,
                    option,
                    None,
                    cam,
                    mujoco.mjtCatBit.mjCAT_ALL,
                    scene,
                )
                draw_robot_slot_overlay(scene, data, robot_overlay)
                draw_ground_contact_overlay(scene, data, ground_overlay, frame_cursor)
                draw_source_slot_overlay(scene, source_overlay, frame_cursor)
                mujoco.mjr_render(viewport, scene, context)
                mujoco.mjr_readPixels(rgb, None, viewport, context)
                writer.append_data(np.flipud(rgb))
                if frame_cursor == 0 or (frame_cursor + 1) % 50 == 0 or frame_cursor == len(playback_qpos) - 1:
                    print(f"[{VIS_PREFIX}] recorded frame {frame_cursor + 1}/{len(playback_qpos)}")
    finally:
        if hasattr(context, "free"):
            context.free()
        if hasattr(gl_context, "free"):
            gl_context.free()
    print(f"[{VIS_PREFIX}] saved video {record_path}")


def clamp_float(value: float, lo: float, hi: float) -> float:
    return max(float(lo), min(float(hi), float(value)))


def clamp_int(value: int, lo: int, hi: int) -> int:
    return max(int(lo), min(int(hi), int(value)))


def framebuffer_mouse_pos(glfw, window) -> tuple[float, float]:
    cursor_x, cursor_y = glfw.get_cursor_pos(window)
    window_w, window_h = glfw.get_window_size(window)
    fb_w, fb_h = glfw.get_framebuffer_size(window)
    scale_x = fb_w / max(1, window_w)
    scale_y = fb_h / max(1, window_h)
    return float(cursor_x) * scale_x, float(cursor_y) * scale_y


def ui_rect_from_top(rect: tuple[float, float, float, float], fb_height: int) -> mujoco.MjrRect:
    x, y, w, h = rect
    return mujoco.MjrRect(
        int(round(x)),
        int(round(float(fb_height) - y - h)),
        max(1, int(round(w))),
        max(1, int(round(h))),
    )


def ui_rect_contains(rect: tuple[float, float, float, float], x: float, y: float) -> bool:
    rx, ry, rw, rh = rect
    return rx <= x <= rx + rw and ry <= y <= ry + rh


def ui_draw_rect(context, fb_height: int, rect: tuple[float, float, float, float], rgba) -> None:
    viewport = ui_rect_from_top(rect, fb_height)
    mujoco.mjr_rectangle(viewport, float(rgba[0]), float(rgba[1]), float(rgba[2]), float(rgba[3]))


def ui_draw_label(
    context,
    fb_width: int,
    fb_height: int,
    rect: tuple[float, float, float, float],
    text: str,
    bg_rgba=(0.0, 0.0, 0.0, 0.0),
    text_rgb=(0.9, 0.9, 0.86),
    font=None,
) -> None:
    viewport = ui_rect_from_top(rect, fb_height)
    if font is None:
        font = mujoco.mjtFont.mjFONT_NORMAL
    text = str(text)
    bg = tuple(float(v) for v in bg_rgba)
    if bg[3] <= 0.0:
        bg = (0.98, 0.98, 0.96, 1.0)
    mujoco.mjr_label(
        viewport,
        font,
        text,
        bg[0],
        bg[1],
        bg[2],
        bg[3],
        float(text_rgb[0]),
        float(text_rgb[1]),
        float(text_rgb[2]),
        context,
    )


def ui_slider_ratio_from_x(rect: tuple[float, float, float, float], x: float) -> float:
    return clamp_float((float(x) - float(rect[0])) / max(1.0, float(rect[2])), 0.0, 1.0)


def ui_set_frame_from_slider(ui: dict, frame_count: int, rect, x: float) -> None:
    if frame_count <= 1:
        ui["frame_cursor"] = 0
        return
    ratio = ui_slider_ratio_from_x(rect, x)
    ui["frame_cursor"] = clamp_int(int(round(ratio * (frame_count - 1))), 0, frame_count - 1)
    ui["manual_seek"] = True


def ui_set_ghost_interval_from_slider(ui: dict, rect, x: float) -> None:
    ratio = ui_slider_ratio_from_x(rect, x)
    ui["ghost_interval_seconds"] = 5.0 * ratio


def ui_pulse(ui: dict, name: str) -> None:
    ui.setdefault("pulse", {})[str(name)] = time.time()


def ui_pulse_active(ui: dict, name: str, duration: float = 0.18) -> bool:
    timestamp = ui.get("pulse", {}).get(str(name))
    return timestamp is not None and (time.time() - float(timestamp)) <= float(duration)


def ui_button_bg(ui: dict, name: str, normal=(0.88, 0.89, 0.90, 1.0), duration: float = 0.18):
    return (0.20, 0.48, 0.72, 1.0) if ui_pulse_active(ui, name, duration=duration) else normal


def ui_button_text(ui: dict, name: str, normal=(0.12, 0.13, 0.14), duration: float = 0.18):
    return (0.98, 0.99, 0.98) if ui_pulse_active(ui, name, duration=duration) else normal


def draw_glfw_ui_panel(
    args,
    context,
    fb_width: int,
    fb_height: int,
    ui: dict,
    frame_count: int,
    source_overlay,
    robot_overlay,
    ground_overlay,
) -> dict:
    panel_w = int(clamp_int(int(args.ui_panel_width), 240, max(240, fb_width // 2)))
    panel_x = 0
    pad = 16
    row_h = 32
    controls: dict[str, dict] = {}

    ui["panel_x"] = float(panel_x)
    ui["panel_w"] = float(panel_w)
    ui_draw_rect(context, fb_height, (panel_x, 0, panel_w, fb_height), (0.98, 0.98, 0.96, 1.0))
    ui_draw_rect(context, fb_height, (panel_w - 1, 0, 1, fb_height), (0.78, 0.80, 0.82, 1.0))

    x = panel_x + pad
    w = panel_w - 2 * pad
    y = 14
    frame_cursor = clamp_int(int(ui.get("frame_cursor", 0)), 0, max(0, frame_count - 1))
    ui["frame_cursor"] = frame_cursor
    paused = bool(ui.get("paused", True))

    ui_draw_label(context, fb_width, fb_height, (x, y, w, 32), "Retarget Controls", (0.90, 0.92, 0.94, 1.0), (0.10, 0.12, 0.14))
    y += 46

    play_rect = (x, y, (w - 8) * 0.55, 32)
    reset_rect = (x + play_rect[2] + 8, y, w - play_rect[2] - 8, 32)
    ui_draw_label(context, fb_width, fb_height, play_rect, "Play (Space)" if paused else "Pause (Space)", ui_button_bg(ui, "play"), ui_button_text(ui, "play"))
    ui_draw_label(context, fb_width, fb_height, reset_rect, "Reset (R)", ui_button_bg(ui, "reset"), ui_button_text(ui, "reset"))
    controls["play"] = {"rect": play_rect}
    controls["reset"] = {"rect": reset_rect}
    y += 42

    seek_back_rect = (x, y, (w - 8) * 0.5, 30)
    seek_forward_rect = (x + seek_back_rect[2] + 8, y, w - seek_back_rect[2] - 8, 30)
    ui_draw_label(context, fb_width, fb_height, seek_back_rect, "(Q) -1s", ui_button_bg(ui, "seek_back", (0.90, 0.91, 0.92, 1.0)), ui_button_text(ui, "seek_back"))
    ui_draw_label(context, fb_width, fb_height, seek_forward_rect, "(E) +1s", ui_button_bg(ui, "seek_forward", (0.90, 0.91, 0.92, 1.0)), ui_button_text(ui, "seek_forward"))
    controls["seek_back"] = {"rect": seek_back_rect}
    controls["seek_forward"] = {"rect": seek_forward_rect}
    y += 48

    ui_draw_label(context, fb_width, fb_height, (x, y, w, row_h), "Frame timeline", (0.90, 0.92, 0.94, 1.0), (0.10, 0.12, 0.14))
    y += row_h
    frame_label = f"Frame {frame_cursor + 1} / {max(1, frame_count)}"
    ui_draw_label(context, fb_width, fb_height, (x, y, w, row_h), frame_label, (0.90, 0.92, 0.94, 1.0), (0.16, 0.17, 0.18))
    y += row_h + 4
    slider_rect = (x, y + 8, w, 8)
    slider_hit = (x, y - 8, w, 32)
    frame_ratio = 0.0 if frame_count <= 1 else frame_cursor / max(1, frame_count - 1)
    fill_w = slider_rect[2] * frame_ratio
    handle_x = slider_rect[0] + fill_w
    ui_draw_rect(context, fb_height, slider_rect, (0.78, 0.81, 0.84, 1.0))
    ui_draw_rect(context, fb_height, (slider_rect[0], slider_rect[1], fill_w, slider_rect[3]), (0.20, 0.55, 0.78, 1.0))
    ui_draw_rect(context, fb_height, (handle_x - 4, slider_rect[1] - 5, 8, 18), (0.10, 0.12, 0.14, 1.0))
    controls["frame_slider"] = {"rect": slider_rect, "hit_rect": slider_hit}
    y += 50

    lock_camera = bool(ui.get("lock_camera", True))
    camera_rect = (x, y, w, 32)
    camera_bg = (0.20, 0.48, 0.72, 1.0) if lock_camera else (0.88, 0.89, 0.90, 1.0)
    camera_fg = (0.98, 0.99, 0.98) if lock_camera else (0.12, 0.13, 0.14)
    if ui_pulse_active(ui, "camera_lock"):
        camera_bg = (0.20, 0.48, 0.72, 1.0)
        camera_fg = (0.98, 0.99, 0.98)
    ui_draw_label(
        context,
        fb_width,
        fb_height,
        camera_rect,
        "Fixed camera (F): ON" if lock_camera else "Fixed camera (F): OFF",
        camera_bg,
        camera_fg,
    )
    controls["camera_lock"] = {"rect": camera_rect}
    y += 46

    ghost_enabled = bool(ui.get("ghost_enabled", False))
    ghost_rect = (x, y, w, 32)
    ghost_bg = (0.20, 0.48, 0.72, 1.0) if ghost_enabled else (0.88, 0.89, 0.90, 1.0)
    ghost_fg = (0.98, 0.99, 0.98) if ghost_enabled else (0.12, 0.13, 0.14)
    if ui_pulse_active(ui, "ghost_toggle"):
        ghost_bg = (0.20, 0.48, 0.72, 1.0)
        ghost_fg = (0.98, 0.99, 0.98)
    ui_draw_label(
        context,
        fb_width,
        fb_height,
        ghost_rect,
        "Ghost trail (G): ON" if ghost_enabled else "Ghost trail (G): OFF",
        ghost_bg,
        ghost_fg,
    )
    controls["ghost_toggle"] = {"rect": ghost_rect}
    y += 38

    ghost_clear_rect = (x, y, w, 32)
    ui_draw_label(
        context,
        fb_width,
        fb_height,
        ghost_clear_rect,
        "Clear ghosts (C)",
        ui_button_bg(ui, "ghost_clear", (0.90, 0.91, 0.92, 1.0)),
        ui_button_text(ui, "ghost_clear"),
    )
    controls["ghost_clear"] = {"rect": ghost_clear_rect}
    y += 38

    ghost_count = len(ui.get("ghosts", []))
    ghost_seconds = ghost_interval_seconds(ui)
    ghost_status = f"Ghost interval {ghost_seconds:.1f}s   Ghosts {ghost_count}"
    ui_draw_label(context, fb_width, fb_height, (x, y, w, row_h), ghost_status, (0.90, 0.92, 0.94, 1.0), (0.12, 0.13, 0.14))
    y += row_h + 4

    ghost_slider_rect = (x, y + 8, w, 8)
    ghost_slider_hit = (x, y - 8, w, 32)
    ghost_ratio = ghost_seconds / 5.0
    ghost_fill_w = ghost_slider_rect[2] * ghost_ratio
    ghost_handle_x = ghost_slider_rect[0] + ghost_fill_w
    ui_draw_rect(context, fb_height, ghost_slider_rect, (0.78, 0.81, 0.84, 1.0))
    ui_draw_rect(context, fb_height, (ghost_slider_rect[0], ghost_slider_rect[1], ghost_fill_w, ghost_slider_rect[3]), (0.20, 0.55, 0.78, 1.0))
    ui_draw_rect(context, fb_height, (ghost_handle_x - 4, ghost_slider_rect[1] - 5, 8, 18), (0.10, 0.12, 0.14, 1.0))
    controls["ghost_interval_slider"] = {"rect": ghost_slider_rect, "hit_rect": ghost_slider_hit}
    y += 50

    snapshot_rect = (x, y, w, 32)
    ui_draw_label(
        context,
        fb_width,
        fb_height,
        snapshot_rect,
        "Snapshot (Ctrl+P)",
        ui_button_bg(ui, "snapshot", (0.90, 0.91, 0.92, 1.0), duration=0.6),
        ui_button_text(ui, "snapshot", duration=0.6),
    )
    controls["snapshot"] = {"rect": snapshot_rect}
    y += 38

    record_rect = (x, y, w, 32)
    recording = bool(ui.get("recording", False))
    record_bg = (0.20, 0.48, 0.72, 1.0) if recording else ui_button_bg(ui, "record", (0.90, 0.91, 0.92, 1.0))
    record_fg = (0.98, 0.99, 0.98) if recording else ui_button_text(ui, "record")
    ui_draw_label(
        context,
        fb_width,
        fb_height,
        record_rect,
        "Stop recording (Ctrl+V)" if recording else "Record screen (Ctrl+V)",
        record_bg,
        record_fg,
    )
    controls["record"] = {"rect": record_rect}
    y += 46

    ui_draw_label(context, fb_width, fb_height, (x, y, w, row_h), "Overlays", (0.90, 0.92, 0.94, 1.0), (0.12, 0.13, 0.14))
    y += row_h + 6

    checkbox_specs = (
        ("source", "Source motion", "show_source_slots", source_overlay is not None),
    )
    for name, label, key, available in checkbox_specs:
        row_rect = (x, y, w, 28)
        box_rect = (x, y + 5, 18, 18)
        text_rect = (x + 26, y, w - 26, 28)
        active = bool(ui.get(key, False)) and bool(available)
        box_bg = (0.18, 0.50, 0.36, 1.0) if active else (0.90, 0.91, 0.92, 1.0)
        if not available:
            box_bg = (0.94, 0.94, 0.94, 1.0)
        text_rgb = (0.16, 0.17, 0.18) if available else (0.58, 0.58, 0.56)
        ui_draw_label(context, fb_width, fb_height, box_rect, "x" if active else "", box_bg, (0.98, 0.98, 0.94) if active else (0.16, 0.17, 0.18))
        ui_draw_label(context, fb_width, fb_height, text_rect, label, (0.90, 0.92, 0.94, 1.0), text_rgb)
        controls[name] = {"rect": row_rect, "key": key, "available": available}
        y += 34

    return controls


def run_glfw_ui_viewer(
    args,
    model,
    data,
    playback_qpos,
    fps: float,
    source_overlay,
    robot_overlay,
    ground_overlay,
    source_objects,
    fixed_lookat,
    fixed_distance: float,
) -> None:
    import glfw

    if not glfw.init():
        raise RuntimeError("Could not initialize GLFW for --viewer-backend glfw-ui.")
    window = glfw.create_window(
        max(640, int(args.ui_window_width)),
        max(480, int(args.ui_window_height)),
        "Retarget viewer",
        None,
        None,
    )
    if not window:
        glfw.terminate()
        raise RuntimeError("Could not create GLFW window for --viewer-backend glfw-ui.")

    glfw.make_context_current(window)
    glfw.swap_interval(1)

    frame_count = len(playback_qpos)
    model.vis.global_.offwidth = max(int(model.vis.global_.offwidth), CAPTURE_WIDTH)
    model.vis.global_.offheight = max(int(model.vis.global_.offheight), CAPTURE_HEIGHT)
    max_possible_ghosts = max(1, int(frame_count))
    ghost_scene_geoms = max(model.ngeom + 512, 2048)
    scene_maxgeom = max(
        model.ngeom * (max_possible_ghosts + 1)
        + needed_overlay_geoms(source_overlay, robot_overlay, ground_overlay)
        + 512,
        2048,
    )
    scene = mujoco.MjvScene(model, maxgeom=int(scene_maxgeom))
    ghost_data = mujoco.MjData(model)
    ghost_scene = mujoco.MjvScene(model, maxgeom=int(ghost_scene_geoms))
    context = mujoco.MjrContext(model, mujoco.mjtFontScale.mjFONTSCALE_150)
    opt = mujoco.MjvOption()
    pert = mujoco.MjvPerturb()
    ghost_pert = mujoco.MjvPerturb()
    cam = make_camera(args, fixed_lookat, fixed_distance)
    camera_state = {"lookat": None}
    mouse = {"left": False, "middle": False, "right": False, "last_x": 0.0, "last_y": 0.0}
    ui = {
        "paused": bool(args.paused),
        "frame_cursor": 0,
        "speed": 1.0,
        "speed_min": 0.1,
        "speed_max": 4.0,
        "show_source_slots": bool(args.show_source_slots) and source_overlay is not None,
        "show_robot_slots": bool(args.show_robot_slots) and robot_overlay is not None,
        "show_ground_contact_map": bool(args.show_ground_contact_map) and ground_overlay is not None,
        "drag": None,
        "panel_active": False,
        "manual_seek": False,
        "panel_x": 0.0,
        "panel_w": float(args.ui_panel_width),
        "pulse": {},
        "lock_camera": bool(args.lock_camera),
        "ghost_enabled": bool(args.ghost_trail),
        "ghost_interval_seconds": clamp_float(float(args.ghost_interval), 0.0, 5.0),
        "ghosts": [],
        "ghost_frame_set": set(),
        "last_ghost_sample_frame": None,
        "snapshot_requested": False,
        "record_toggle_requested": False,
        "recording": False,
        "record_writer": None,
        "record_path": None,
        "record_frame_count": 0,
    }
    capture_rgb = np.empty((CAPTURE_HEIGHT, CAPTURE_WIDTH, 3), dtype=np.uint8)
    controls: dict[str, dict] = {}
    one_second_frames = max(1, int(round(fps)))

    def set_frame(idx: int) -> None:
        data.qpos[:] = playback_qpos[idx]
        apply_source_object_motion(data, source_objects, idx)
        mujoco.mj_forward(model, data)

    def save_snapshot() -> None:
        try:
            path = capture_path("snapshot", ".png")
            write_snapshot_async(path, render_capture_frame(context, scene, capture_rgb))
            ui_pulse(ui, "snapshot")
            print(f"[{VIS_PREFIX}] queued snapshot {path} ({CAPTURE_WIDTH}x{CAPTURE_HEIGHT})")
        except Exception as exc:
            ui_pulse(ui, "snapshot")
            print(f"[{VIS_PREFIX}][WARN] snapshot failed: {exc}")

    def stop_recording() -> None:
        writer = ui.get("record_writer")
        if writer is None:
            ui["recording"] = False
            return
        try:
            writer.close_async()
            print(
                f"[{VIS_PREFIX}] finishing recording {ui.get('record_path')} "
                f"({int(ui.get('record_frame_count', 0))} frames queued, {CAPTURE_WIDTH}x{CAPTURE_HEIGHT})"
            )
        except Exception as exc:
            print(f"[{VIS_PREFIX}][WARN] stopping recording failed: {exc}")
        finally:
            ui["record_writer"] = None
            ui["recording"] = False
            ui["record_path"] = None
            ui["record_frame_count"] = 0

    def toggle_recording() -> None:
        ui_pulse(ui, "record")
        if bool(ui.get("recording", False)):
            stop_recording()
            return
        try:
            imageio = import_imageio()
            del imageio
            path = capture_path("recording", ".mp4")
            video_fps = float(args.record_fps) if float(args.record_fps) > 0.0 else 60.0
            writer = AsyncVideoWriter(path, fps=max(video_fps, 1e-6))
            ui["record_writer"] = writer
            ui["recording"] = True
            ui["record_path"] = path
            ui["record_frame_count"] = 0
            print(f"[{VIS_PREFIX}] started recording {path} ({CAPTURE_WIDTH}x{CAPTURE_HEIGHT}, fps={video_fps:.3f})")
        except Exception as exc:
            ui["record_writer"] = None
            ui["recording"] = False
            print(f"[{VIS_PREFIX}][WARN] recording failed to start: {exc}")

    def append_recording_frame() -> None:
        writer = ui.get("record_writer")
        if writer is None:
            return
        try:
            if writer.can_accept():
                if writer.submit(render_capture_frame(context, scene, capture_rgb)):
                    ui["record_frame_count"] = int(ui.get("record_frame_count", 0)) + 1
            else:
                writer.drop_frame()
        except Exception as exc:
            print(f"[{VIS_PREFIX}][WARN] recording frame failed: {exc}")
            stop_recording()

    def panel_contains(x: float, y: float) -> bool:
        del y
        return float(ui.get("panel_x", 0.0)) <= x <= float(ui.get("panel_x", 0.0)) + float(ui.get("panel_w", 0.0))

    def hit_control(x: float, y: float) -> tuple[str | None, dict | None]:
        for name, control in controls.items():
            rect = control.get("hit_rect", control.get("rect"))
            if rect is not None and ui_rect_contains(rect, x, y):
                return name, control
        return None, None

    def clear_ghosts() -> None:
        ui_pulse(ui, "ghost_clear")
        ui["ghosts"] = []
        ui["ghost_frame_set"] = set()
        ui["last_ghost_sample_frame"] = int(ui.get("frame_cursor", 0))

    def handle_control_press(name: str, control: dict, x: float) -> None:
        if name == "play":
            ui_pulse(ui, "play")
            ui["paused"] = not bool(ui.get("paused", True))
        elif name == "reset":
            ui_pulse(ui, "reset")
            ui["frame_cursor"] = 0
            ui["manual_seek"] = True
        elif name == "seek_back":
            ui_pulse(ui, "seek_back")
            ui["frame_cursor"] = clamp_int(int(ui["frame_cursor"]) - one_second_frames, 0, frame_count - 1)
            ui["manual_seek"] = True
        elif name == "seek_forward":
            ui_pulse(ui, "seek_forward")
            ui["frame_cursor"] = clamp_int(int(ui["frame_cursor"]) + one_second_frames, 0, frame_count - 1)
            ui["manual_seek"] = True
        elif name == "frame_slider":
            ui["drag"] = "frame_slider"
            ui_set_frame_from_slider(ui, frame_count, control["rect"], x)
        elif name == "camera_lock":
            ui_pulse(ui, "camera_lock")
            ui["lock_camera"] = not bool(ui.get("lock_camera", True))
        elif name == "ghost_toggle":
            ui_pulse(ui, "ghost_toggle")
            ui["ghost_enabled"] = not bool(ui.get("ghost_enabled", False))
        elif name == "ghost_clear":
            clear_ghosts()
        elif name == "ghost_interval_slider":
            ui["drag"] = "ghost_interval_slider"
            ui_set_ghost_interval_from_slider(ui, control["rect"], x)
        elif name == "snapshot":
            ui_pulse(ui, "snapshot")
            ui["snapshot_requested"] = True
        elif name == "record":
            ui_pulse(ui, "record")
            ui["record_toggle_requested"] = True
        elif name in {"source", "robot", "ground"} and bool(control.get("available", False)):
            key = str(control["key"])
            ui[key] = not bool(ui.get(key, False))

    def mouse_button_callback(window, button, action, mods):
        del mods
        x_fb, y_fb = framebuffer_mouse_pos(glfw, window)
        if button == glfw.MOUSE_BUTTON_LEFT:
            if action == glfw.PRESS:
                name, control = hit_control(x_fb, y_fb)
                if name is not None and control is not None:
                    ui["panel_active"] = True
                    handle_control_press(name, control, x_fb)
                    return
                if panel_contains(x_fb, y_fb):
                    ui["panel_active"] = True
                    return
                mouse["left"] = True
            elif action == glfw.RELEASE:
                ui["drag"] = None
                ui["panel_active"] = False
                mouse["left"] = False
        elif button == glfw.MOUSE_BUTTON_MIDDLE:
            mouse["middle"] = action == glfw.PRESS
        elif button == glfw.MOUSE_BUTTON_RIGHT:
            mouse["right"] = action == glfw.PRESS
        mouse["last_x"], mouse["last_y"] = glfw.get_cursor_pos(window)

    def cursor_pos_callback(window, xpos, ypos):
        x_fb, y_fb = framebuffer_mouse_pos(glfw, window)
        drag = ui.get("drag")
        if drag is not None:
            control = controls.get(str(drag))
            if control is not None:
                if drag == "frame_slider":
                    ui_set_frame_from_slider(ui, frame_count, control["rect"], x_fb)
                elif drag == "ghost_interval_slider":
                    ui_set_ghost_interval_from_slider(ui, control["rect"], x_fb)
            return
        if bool(ui.get("panel_active", False)) or panel_contains(x_fb, y_fb):
            return
        if not (mouse["left"] or mouse["middle"] or mouse["right"]):
            return
        _width, height = glfw.get_window_size(window)
        dx = float(xpos) - float(mouse["last_x"])
        dy = float(ypos) - float(mouse["last_y"])
        mouse["last_x"], mouse["last_y"] = float(xpos), float(ypos)
        shift = (
            glfw.get_key(window, glfw.KEY_LEFT_SHIFT) == glfw.PRESS
            or glfw.get_key(window, glfw.KEY_RIGHT_SHIFT) == glfw.PRESS
        )
        if mouse["right"]:
            action = mujoco.mjtMouse.mjMOUSE_MOVE_H if shift else mujoco.mjtMouse.mjMOUSE_MOVE_V
        elif mouse["left"]:
            action = mujoco.mjtMouse.mjMOUSE_ROTATE_H if shift else mujoco.mjtMouse.mjMOUSE_ROTATE_V
        else:
            action = mujoco.mjtMouse.mjMOUSE_ZOOM
        mujoco.mjv_moveCamera(model, action, dx / max(1, height), dy / max(1, height), scene, cam)

    def scroll_callback(window, xoffset, yoffset):
        del xoffset
        x_fb, y_fb = framebuffer_mouse_pos(glfw, window)
        if panel_contains(x_fb, y_fb):
            return
        mujoco.mjv_moveCamera(model, mujoco.mjtMouse.mjMOUSE_ZOOM, 0.0, -0.05 * float(yoffset), scene, cam)

    def key_callback(window, key, scancode, action, mods):
        del window, scancode
        if action not in (glfw.PRESS, glfw.REPEAT):
            return
        ctrl = bool(mods & glfw.MOD_CONTROL)
        if ctrl and key == glfw.KEY_P and action == glfw.PRESS:
            ui_pulse(ui, "snapshot")
            ui["snapshot_requested"] = True
            return
        if ctrl and key == glfw.KEY_V and action == glfw.PRESS:
            ui_pulse(ui, "record")
            ui["record_toggle_requested"] = True
            return
        if key == glfw.KEY_SPACE:
            ui_pulse(ui, "play")
            ui["paused"] = not bool(ui.get("paused", True))
        elif key == glfw.KEY_R:
            ui_pulse(ui, "reset")
            ui["frame_cursor"] = 0
            ui["manual_seek"] = True
        elif key == glfw.KEY_A:
            ui_pulse(ui, "step_back")
            ui["frame_cursor"] = clamp_int(int(ui["frame_cursor"]) - 1, 0, frame_count - 1)
            ui["manual_seek"] = True
        elif key == glfw.KEY_D:
            ui_pulse(ui, "step_forward")
            ui["frame_cursor"] = clamp_int(int(ui["frame_cursor"]) + 1, 0, frame_count - 1)
            ui["manual_seek"] = True
        elif key == glfw.KEY_Q:
            ui_pulse(ui, "seek_back")
            ui["frame_cursor"] = clamp_int(int(ui["frame_cursor"]) - one_second_frames, 0, frame_count - 1)
            ui["manual_seek"] = True
        elif key == glfw.KEY_E:
            ui_pulse(ui, "seek_forward")
            ui["frame_cursor"] = clamp_int(int(ui["frame_cursor"]) + one_second_frames, 0, frame_count - 1)
            ui["manual_seek"] = True
        elif key == glfw.KEY_G and action == glfw.PRESS:
            ui_pulse(ui, "ghost_toggle")
            ui["ghost_enabled"] = not bool(ui.get("ghost_enabled", False))
        elif key == glfw.KEY_C and action == glfw.PRESS:
            clear_ghosts()
        elif key == glfw.KEY_F and action == glfw.PRESS:
            ui_pulse(ui, "camera_lock")
            ui["lock_camera"] = not bool(ui.get("lock_camera", True))
        elif key == glfw.KEY_LEFT_BRACKET:
            ui["speed"] = clamp_float(float(ui["speed"]) / 1.25, ui["speed_min"], ui["speed_max"])
        elif key == glfw.KEY_RIGHT_BRACKET:
            ui["speed"] = clamp_float(float(ui["speed"]) * 1.25, ui["speed_min"], ui["speed_max"])

    glfw.set_mouse_button_callback(window, mouse_button_callback)
    glfw.set_cursor_pos_callback(window, cursor_pos_callback)
    glfw.set_scroll_callback(window, scroll_callback)
    glfw.set_key_callback(window, key_callback)

    print(
        f"[{VIS_PREFIX}] GLFW UI viewer: panel_width={int(args.ui_panel_width)}, "
        f"target_fps={float(fps):.3f} wall-clock playback; "
        f"ghost_interval={ghost_interval_seconds(ui):.1f}s; "
        f"drag frame slider; Space play/pause; G ghost trail; C clear ghosts; "
        f"A/D step; Q/E seek; [/] speed."
    )
    last_frame_time = time.time()
    playback_accum = 0.0
    hold_state = {"last": time.time(), "accum": 0.0}

    try:
        while not glfw.window_should_close(window):
            now = time.time()
            elapsed_wall = min(max(now - last_frame_time, 0.0), 0.25)
            last_frame_time = now
            frame_cursor = clamp_int(int(ui["frame_cursor"]), 0, frame_count - 1)
            direction = 0
            if glfw.get_key(window, glfw.KEY_Q) == glfw.PRESS:
                direction -= 1
                ui_pulse(ui, "seek_back")
            if glfw.get_key(window, glfw.KEY_E) == glfw.PRESS:
                direction += 1
                ui_pulse(ui, "seek_forward")
            manual_seek = bool(ui.pop("manual_seek", False))
            if direction != 0 and float(args.seek_hold_speed) > 0.0:
                elapsed = min(max(now - float(hold_state["last"]), 0.0), 0.25)
                hold_state["last"] = now
                hold_state["accum"] = float(hold_state["accum"]) + direction * fps * float(args.seek_hold_speed) * elapsed
                steps = int(float(hold_state["accum"]))
                if steps != 0:
                    hold_state["accum"] = float(hold_state["accum"]) - steps
                    frame_cursor = clamp_int(frame_cursor + steps, 0, frame_count - 1)
                    ui["frame_cursor"] = frame_cursor
                manual_seek = True
            else:
                hold_state["last"] = now
                hold_state["accum"] = 0.0

            if manual_seek:
                playback_accum = 0.0
                frame_cursor = clamp_int(int(ui["frame_cursor"]), 0, frame_count - 1)
            elif bool(ui.get("paused", True)):
                playback_accum = 0.0
            elif bool(args.rate_limit):
                playback_accum += elapsed_wall * max(fps, 1e-6) * max(0.1, float(ui.get("speed", 1.0)))
                steps = int(playback_accum)
                if steps > 0:
                    playback_accum -= steps
                    frame_cursor += steps
                    if frame_cursor >= frame_count:
                        if bool(args.loop):
                            frame_cursor %= max(1, frame_count)
                        else:
                            frame_cursor = frame_count - 1
                            ui["paused"] = True
                            playback_accum = 0.0
                    ui["frame_cursor"] = frame_cursor

            set_frame(frame_cursor)
            apply_camera_pose(
                args,
                cam,
                data,
                source_overlay,
                frame_cursor,
                fixed_lookat,
                fixed_distance,
                camera_state,
                lock_camera=bool(ui.get("lock_camera", True)),
                update_lookat=bool(ui.get("lock_camera", True)),
            )

            fb_width, fb_height = glfw.get_framebuffer_size(window)
            panel_w = int(clamp_int(int(args.ui_panel_width), 240, max(240, fb_width // 2)))
            scene_width = max(1, fb_width - panel_w)
            viewport = mujoco.MjrRect(panel_w, 0, scene_width, fb_height)
            mujoco.mjv_updateScene(model, data, opt, pert, cam, mujoco.mjtCatBit.mjCAT_ALL, scene)
            add_ghost_sample(ui, playback_qpos, frame_cursor, fps)
            if ui.get("ghosts"):
                draw_ghost_trail(
                    scene,
                    model,
                    ghost_data,
                    ghost_scene,
                    opt,
                    ghost_pert,
                    cam,
                    source_objects,
                    ui.get("ghosts", []),
                )
            if bool(ui.get("show_robot_slots", False)):
                draw_robot_slot_overlay(scene, data, robot_overlay)
            if bool(ui.get("show_ground_contact_map", False)):
                draw_ground_contact_overlay(scene, data, ground_overlay, frame_cursor)
            if bool(ui.get("show_source_slots", False)):
                draw_source_slot_overlay(scene, source_overlay, frame_cursor)

            if bool(ui.pop("record_toggle_requested", False)):
                toggle_recording()
            if bool(ui.pop("snapshot_requested", False)):
                save_snapshot()
            if bool(ui.get("recording", False)):
                append_recording_frame()

            mujoco.mjr_render(viewport, scene, context)
            controls = draw_glfw_ui_panel(
                args,
                context,
                fb_width,
                fb_height,
                ui,
                frame_count,
                source_overlay,
                robot_overlay,
                ground_overlay,
            )
            glfw.swap_buffers(window)
            glfw.poll_events()

            if bool(ui.get("paused", True)):
                time.sleep(0.015)
                continue
            if not bool(args.rate_limit):
                time.sleep(0.001)
                frame_cursor = int(ui["frame_cursor"]) + 1
                if frame_cursor >= frame_count:
                    if bool(args.loop):
                        frame_cursor = 0
                    else:
                        frame_cursor = frame_count - 1
                        ui["paused"] = True
                ui["frame_cursor"] = frame_cursor
    finally:
        stop_recording()
        if hasattr(context, "free"):
            context.free()
        if hasattr(ghost_scene, "free"):
            ghost_scene.free()
        if hasattr(scene, "free"):
            scene.free()
        glfw.destroy_window(window)
        glfw.terminate()


def main():
    args = parse_args()
    if bool(args.all):
        run_all_mode(args)
        return

    result, qpos_all, saved_robot_xml, saved_fps = load_result(args.result)
    robot_xml = resolve_robot_xml_path(args.robot_xml if args.robot_xml is not None else saved_robot_xml)
    if not robot_xml.exists():
        raise FileNotFoundError(f"Robot XML not found: {robot_xml}")

    start = max(0, int(args.start))
    end = len(qpos_all) if int(args.end) < 0 else min(len(qpos_all), int(args.end))
    frame_ids = np.arange(start, end, max(1, int(args.stride)), dtype=np.int32)
    if frame_ids.size == 0:
        raise ValueError(f"No frames selected: total={len(qpos_all)}, start={start}, end={end}, stride={args.stride}")

    object_tmp = tempfile.TemporaryDirectory()
    source_objects = prepare_source_objects(args, result, frame_ids, object_tmp.name)
    load_robot_xml, patched_robot_xml_tmp = patch_legacy_xml_paths(
        robot_xml,
        source_objects,
        float(args.source_object_alpha),
    )

    try:
        model = mujoco.MjModel.from_xml_path(str(load_robot_xml))
    finally:
        if patched_robot_xml_tmp is not None:
            Path(patched_robot_xml_tmp).unlink(missing_ok=True)
    normalize_loaded_model_scene(model)
    configure_collision_geom_rendering(args, model)
    data = mujoco.MjData(model)
    bind_source_object_freejoints(model, source_objects)
    playback_qpos = expand_qpos_to_model(qpos_all[frame_ids], model, "qpos", source_objects)
    fps = float(args.fps) if float(args.fps) > 0.0 else saved_fps / max(1, int(args.stride))
    dt = 1.0 / max(fps, 1e-6)
    robot_contact_geom_ids = remap_robot_contact_geom_ids(result, robot_xml, model)
    robot_all_contact_geom_ids = remap_robot_contact_geom_ids(
        result,
        robot_xml,
        model,
        field="robot_all_contact_geom_ids",
    )
    overlay_args = args
    if str(args.viewer_backend) == "glfw-ui":
        overlay_args = copy.copy(args)
        overlay_args.show_source_slots = False
        overlay_args.show_robot_slots = False
        overlay_args.show_ground_contact_map = False
    source_overlay = prepare_source_slot_overlay(overlay_args, result, frame_ids)
    robot_overlay = prepare_robot_slot_overlay(
        overlay_args,
        result,
        robot_contact_geom_ids,
        robot_all_contact_geom_ids,
    )
    ground_overlay = prepare_ground_contact_overlay(overlay_args, result, frame_ids, robot_contact_geom_ids)

    seq_key = scalar_string(result["source_sequence_key"]) if "source_sequence_key" in result else ""
    print(
        f"[{VIS_PREFIX}] result={args.result}, "
        f"frames={len(playback_qpos)}/{len(qpos_all)}, fps={fps:.3f}"
    )
    print(f"[{VIS_PREFIX}] xml={robot_xml}, model.nq={model.nq}, qpos_width={playback_qpos.shape[1]}")
    if seq_key:
        print(f"[{VIS_PREFIX}] seq={seq_key}")
    if args.dry_run:
        print(f"[{VIS_PREFIX}] dry run complete.")
        object_tmp.cleanup()
        return

    if args.record_video is not None:
        try:
            record_video(args, model, data, playback_qpos, fps, source_overlay, robot_overlay, ground_overlay, source_objects)
        finally:
            object_tmp.cleanup()
        return

    fixed_lookat = fixed_camera_lookat(args, playback_qpos, source_overlay)
    fixed_distance = fixed_camera_distance(args, playback_qpos, source_overlay, fixed_lookat)
    if str(args.viewer_backend) == "glfw-ui":
        try:
            run_glfw_ui_viewer(
                args,
                model,
                data,
                playback_qpos,
                fps,
                source_overlay,
                robot_overlay,
                ground_overlay,
                source_objects,
                fixed_lookat,
                fixed_distance,
            )
        finally:
            object_tmp.cleanup()
        return


    paused = bool(args.paused)
    lock_camera = bool(args.lock_camera)
    frame_cursor = 0
    one_second_frames = max(1, int(round(fps)))

    def set_frame(idx: int) -> None:
        data.qpos[:] = playback_qpos[idx]
        apply_source_object_motion(data, source_objects, idx)
        mujoco.mj_forward(model, data)

    def key_callback(keycode: int) -> None:
        nonlocal paused, frame_cursor, lock_camera
        if keycode == ord(" "):
            paused = not paused
            print(f"[{VIS_PREFIX}] {'Paused' if paused else 'Playing'}")
        elif keycode in (ord("F"), ord("f")):
            lock_camera = not lock_camera
            print(f"[{VIS_PREFIX}] Fixed camera: {'ON' if lock_camera else 'OFF'}")
        elif keycode in (ord("R"), ord("r")):
            frame_cursor = 0
            print(f"[{VIS_PREFIX}] Reset")
        elif keycode in (ord("A"), ord("a")):
            frame_cursor = max(0, frame_cursor - 1)
        elif keycode in (ord("D"), ord("d")):
            frame_cursor = min(len(playback_qpos) - 1, frame_cursor + 1)
        elif keycode in (ord("Q"), ord("q")):
            frame_cursor = max(0, frame_cursor - one_second_frames)
            print(f"[{VIS_PREFIX}] -1s -> frame {frame_cursor + 1}/{len(playback_qpos)}")
        elif keycode in (ord("E"), ord("e")):
            frame_cursor = min(len(playback_qpos) - 1, frame_cursor + one_second_frames)
            print(f"[{VIS_PREFIX}] +1s -> frame {frame_cursor + 1}/{len(playback_qpos)}")

    set_frame(frame_cursor)
    held_seek = HeldSeekController(fps, args.seek_hold_speed)
    viewer = mujoco.viewer.launch_passive(
        model,
        data,
        show_left_ui=bool(args.show_left_ui),
        show_right_ui=bool(args.show_right_ui),
        key_callback=key_callback,
    )
    viewer.cam.distance = float(fixed_distance)
    viewer.cam.azimuth = float(args.camera_azimuth)
    viewer.cam.elevation = float(args.camera_elevation)
    camera_state = {"lookat": None}
    apply_camera_pose(
        args,
        viewer.cam,
        data,
        source_overlay,
        frame_cursor,
        fixed_lookat,
        fixed_distance,
        camera_state,
        lock_camera=lock_camera,
        update_lookat=lock_camera,
    )
    print(
        f"[{VIS_PREFIX}] camera_mode={args.camera_mode}, "
        f"initial_lookat={viewer.cam.lookat[:].round(4).tolist()}, "
        f"distance={float(viewer.cam.distance):.4f}, lock={lock_camera}, "
        f"smooth={float(args.camera_smooth):.3f}"
    )
    ensure_user_scene_capacity(viewer, model, needed_overlay_geoms(source_overlay, robot_overlay, ground_overlay))

    hold_text = f", hold Q/E: +/-{float(args.seek_hold_speed):.1f}x" if held_seek.available else ""
    print(f"[{VIS_PREFIX}] Space: play/pause, F: fixed camera, R: reset, A/D: step, Q/E: jump 1s{hold_text}")
    last_frame_time = time.time()
    try:
        while viewer.is_running():
            frame_cursor, manual_seek = held_seek.update(frame_cursor, len(playback_qpos))
            set_frame(frame_cursor)
            viewer.user_scn.ngeom = 0
            draw_robot_slot_overlay(viewer.user_scn, data, robot_overlay)
            draw_ground_contact_overlay(viewer.user_scn, data, ground_overlay, frame_cursor)
            draw_source_slot_overlay(viewer.user_scn, source_overlay, frame_cursor)
            apply_camera_pose(
                args,
                viewer.cam,
                data,
                source_overlay,
                frame_cursor,
                fixed_lookat,
                fixed_distance,
                camera_state,
                lock_camera=lock_camera,
                update_lookat=lock_camera,
            )
            viewer.sync()

            if manual_seek:
                last_frame_time = time.time()
                time.sleep(0.001)
                continue
            if paused:
                last_frame_time = time.time()
                time.sleep(0.03)
                continue

            if bool(args.rate_limit):
                elapsed = time.time() - last_frame_time
                if elapsed < dt:
                    time.sleep(dt - elapsed)
                last_frame_time = time.time()
            else:
                time.sleep(0.001)

            frame_cursor += 1
            if frame_cursor >= len(playback_qpos):
                if bool(args.loop):
                    frame_cursor = 0
                else:
                    frame_cursor = len(playback_qpos) - 1
                    paused = True
    finally:
        held_seek.close()
        viewer.close()
        object_tmp.cleanup()


if __name__ == "__main__":
    main()

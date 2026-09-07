// Exact, CPU-only UMR pipeline orchestration for static browser deployment.

import { loadExactSourcePack, sourceForCenterRatio } from "./umr-exact-source-pack-v1.js?v=20260905-hoi-642-ground-hard-v2";
import { collectRobotVisualMesh } from "./umr-exact-robot-mesh-v1.js";
import { sampleFirstHitSurfacePointsWASM } from "./umr-exact-surface-wasm-v1.js?v=20260904-cpu-budget-v1";
import { trainExactCorrespondenceWASM } from "./umr-exact-correspondence-wasm-v1.js?v=20260905-studio-epoch60-memory-shadow-v2";
import { bindRobotSlotsToMesh } from "./umr-exact-robot-binding-v1.js?v=20260904-epoch100-v1";
import { buildCurrentRunComputePack } from "./umr-exact-current-run-pack-v1.js?v=20260904-stop-v1";
import { retargetMotionBrowserExact } from "./browser-umr-solver-exact-v1.js?v=20260905-fourier-hoi-memory-v1";

const nextPaint = () => new Promise((resolve) => requestAnimationFrame(resolve));
const makeAbortError = () => {
  const error = new Error("Retargeting stopped.");
  error.name = "AbortError";
  return error;
};
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeAbortError();
};

function meshHeight(vertices) {
  const lower = [Infinity, Infinity, Infinity];
  const upper = [-Infinity, -Infinity, -Infinity];
  for (let point = 0; point < vertices.length / 3; point += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = Number(vertices[point * 3 + axis]);
      lower[axis] = Math.min(lower[axis], value);
      upper[axis] = Math.max(upper[axis], value);
    }
  }
  const extents = upper.map((value, axis) => value - lower[axis]);
  const maximum = Math.max(...extents);
  const height = extents[1] < 0.6 * maximum ? maximum : extents[1];
  if (!(height > 1e-8) || !Number.isFinite(height)) throw new Error("The uploaded robot has an invalid visual-surface height.");
  return height;
}

export function visualizationPoints(points, normalizationScale, trainingToRobotRoot) {
  const scale = Number(normalizationScale);
  if (!(scale > 1e-8) || !Number.isFinite(scale)) {
    throw new RangeError(`Visualization normalization scale must be positive and finite; got ${scale}.`);
  }
  const output = new Float32Array(points.length);
  for (let point = 0; point < points.length / 3; point += 1) {
    const offset = point * 3;
    if (trainingToRobotRoot) {
      output[offset] = Number(points[offset + 2]) / scale;
      output[offset + 1] = Number(points[offset]) / scale;
      output[offset + 2] = Number(points[offset + 1]) / scale;
    } else {
      output[offset] = Number(points[offset]) / scale;
      output[offset + 1] = Number(points[offset + 1]) / scale;
      output[offset + 2] = Number(points[offset + 2]) / scale;
    }
  }
  const lower = [Infinity, Infinity, Infinity];
  const upper = [-Infinity, -Infinity, -Infinity];
  for (let point = 0; point < output.length / 3; point += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = Number(output[point * 3 + axis]);
      lower[axis] = Math.min(lower[axis], value);
      upper[axis] = Math.max(upper[axis], value);
    }
  }
  const extents = upper.map((value, axis) => value - lower[axis]);
  const viewerScale = extents[2] > 1e-6 ? extents[2] : Math.max(...extents);
  if (!(viewerScale > 1e-8) || !Number.isFinite(viewerScale)) {
    throw new Error("The correspondence artifact has an invalid visualization height.");
  }
  const floor = lower[2];
  for (let point = 0; point < output.length / 3; point += 1) {
    const offset = point * 3;
    output[offset] /= viewerScale;
    output[offset + 1] /= viewerScale;
    output[offset + 2] = (output[offset + 2] - floor) / viewerScale;
  }
  return { points: output, center: [0, 0, -floor / viewerScale] };
}

function rows(values) {
  return Array.from({ length: values.length / 3 }, (_, index) => [
    Number(values[index * 3]), Number(values[index * 3 + 1]), Number(values[index * 3 + 2])
  ]);
}

function stageArtifacts(
  manifest,
  partIds,
  sourcePoints,
  robotPoints,
  sourceNormalizationScale,
  robotNormalizationScale,
  sourceTrainingToRobotRoot,
  robotTrainingToRobotRoot
) {
  const source = visualizationPoints(
    sourcePoints, sourceNormalizationScale, sourceTrainingToRobotRoot
  );
  const robot = visualizationPoints(
    robotPoints, robotNormalizationScale, robotTrainingToRobotRoot
  );
  const ids = Uint8Array.from(partIds);
  const segmentNames = new Map((manifest.segments || []).map((segment) => [Number(segment.id), String(segment.name)]));
  const common = {
    normalized_source_points: rows(source.points),
    normalized_target_points: rows(robot.points),
    source_center_point: source.center,
    target_center_point: robot.center,
    source_name: manifest.display_name,
    target_name: "User-loaded robot"
  };
  return {
    sampling: { format: "umr-sampling-normalized-v3", ...common },
    classification: {
      format: "umr-mesh-binding-normalized-v4",
      ...common,
      segment_ids: Array.from(ids),
      correspondence_ids: Array.from({ length: ids.length }, (_, index) => index),
      segments: [...new Set(ids)].sort((left, right) => left - right).map((id) => ({
        id,
        name: segmentNames.get(Number(id)) || `surface_${id}`
      }))
    }
  };
}

function interactionObjectsForHeight(manifest, height) {
  return (manifest.interaction_objects || []).map((item) => ({
    ...item,
    vertices: (item.vertices_unit || []).map((point) => point.map((value) => Number(value) * height)),
    positions: (item.positions_unit || []).map((point) => point.map((value) => Number(value) * height)),
    quaternions_wxyz: item.quaternions_wxyz || []
  }));
}

export class BrowserUMRRuntimeExact {
  constructor(viewer) {
    this.viewer = viewer;
    this.trainingBackend = "pending";
  }

  async run({
    motionId,
    bboxCenterRatio,
    trainingThreads = 1,
    onProgress,
    onSampling,
    onClassification,
    signal = null
  }) {
    throwIfAborted(signal);
    onProgress("sampling", 1, "Downloading robot-independent reference motion…");
    const sourcePack = await loadExactSourcePack(motionId, (fraction) => onProgress(
      "sampling",
      2 + 18 * fraction,
      "Downloading reference motion · " + Math.round(100 * fraction) + "%"
    ), signal);
    throwIfAborted(signal);
    const toSmplFrame = sourcePack.manifest.pipeline !== "character";
    const source = sourceForCenterRatio(sourcePack, bboxCenterRatio);
    this.viewer.applyRetargetTPose();
    const mesh = collectRobotVisualMesh({
      module: this.viewer.module,
      model: this.viewer.model,
      data: this.viewer.data,
      pointCloudCenter: `body:${this.viewer.rootBodySelect.value}`,
      toSmplFrame,
      visualGeomPolicy: "auto"
    });
    const robotHeight = meshHeight(mesh.vertices);
    const sourceHeight = Number(
      sourcePack.manifest.normalization_scale ?? sourcePack.manifest.source_height
    );
    onProgress("sampling", 20, "Sampling 4,096 exterior robot-surface points with the native first-hit contract…");
    const samples = await sampleFirstHitSurfacePointsWASM({
      vertices: mesh.vertices,
      faces: mesh.faces,
      count: Number(sourcePack.manifest.sampling.count),
      seed: Number(sourcePack.manifest.sampling.seed),
      oversampleRatio: Number(sourcePack.manifest.sampling.oversample_ratio),
      candidateMultiplier: Number(sourcePack.manifest.sampling.candidate_multiplier),
      rayOffset: Number(sourcePack.manifest.sampling.ray_offset),
      rayDistance: Number(sourcePack.manifest.sampling.ray_distance),
      minVisibleViews: Number(sourcePack.manifest.sampling.min_visible_views),
      signal,
      onProgress: (fraction, label) => onProgress(
        "sampling",
        20 + 78 * fraction,
        `Exact exterior-surface sampling · ${label} · ${Math.round(fraction * 100)}%`
      )
    });
    throwIfAborted(signal);
    const initialPartIds = Uint8Array.from(
      source.sampleFaceIds,
      (faceId) => Number(sourcePack.assets.face_part_ids.values[Number(faceId)])
    );
    const initialArtifacts = stageArtifacts(
      sourcePack.manifest, initialPartIds, source.points, samples.points,
      sourceHeight, robotHeight, toSmplFrame, toSmplFrame
    );
    onSampling(initialArtifacts.sampling);
    onProgress("sampling", 100, `4,096 exact surface samples ready · robot height ${robotHeight.toFixed(3)} m`);
    await nextPaint();
    throwIfAborted(signal);

    onProgress(
      "training",
      0,
      `Initializing optimized 60-epoch CPU correspondence training · ${trainingThreads} core${trainingThreads === 1 ? "" : "s"}…`
    );
    const trained = await trainExactCorrespondenceWASM({
      sourcePoints: source.points,
      sourceVertices: source.vertices,
      robotPoints: samples.points,
      robotVertices: mesh.vertices,
      templateEdgeIndex: source.templateEdgeIndex,
      templateSortIndex: source.templateSortIndex,
      sourceNormalizationHeight: sourceHeight,
      robotNormalizationHeight: robotHeight,
      threadCount: trainingThreads,
      signal,
      onProgress: (fraction, message) => onProgress("training", 96 * fraction, message)
    });
    throwIfAborted(signal);
    this.trainingBackend = trained.backend;
    onProgress("training", 96, "Projecting learned robot slots onto the visual mesh…");
    this.viewer.applyRetargetTPose();
    const binding = bindRobotSlotsToMesh({
      model: this.viewer.model,
      data: this.viewer.data,
      mesh,
      robotSlotPoints: trained.robotSlots,
      toSmplFrame,
      nearestVertexK: Number(sourcePack.manifest.solver.bind_nearest_vertex_k || 24),
      projectToSurface: Boolean(sourcePack.manifest.solver.project_robot_slots)
    });
    onProgress("training", 97, "Building Stage 3/4 inputs from this robot and this training run…");
    const pack = await buildCurrentRunComputePack({
      sourcePack,
      source,
      trainedSourceSlots: trained.sourceSlots,
      robotBinding: binding,
      robotHeight,
      signal,
      onProgress: (fraction, message) => onProgress("training", 97 + 3 * fraction, message)
    });
    throwIfAborted(signal);
    const finalArtifacts = stageArtifacts(
      // Visualize the correspondence symmetrically: both source and robot
      // slots are the closest points from this run projected onto their meshes.
      pack.manifest, pack.assets.source_part_ids.values,
      pack.sourceBinding.closestPoints, binding.rootPoints, sourceHeight, robotHeight,
      toSmplFrame, false
    );
    onClassification(finalArtifacts.classification);
    onProgress("training", 100, `Exact correspondence trained and mesh-bound · ${trained.backend}`);
    await nextPaint();
    throwIfAborted(signal);

    onProgress("retargeting", 0, "Starting exact MuJoCo Jacobian + Clarabel CPU retargeting…");
    const qpos = await retargetMotionBrowserExact(
      this.viewer,
      pack,
      binding,
      robotHeight,
      (fraction, frame, total) => onProgress(
        "retargeting",
        fraction * 98,
        `Exact browser retargeting · frame ${frame} / ${total}`
      ),
      signal
    );
    throwIfAborted(signal);
    const nq = Number(this.viewer.model.nq);
    const valid = qpos.length && qpos.every((frame) =>
      Array.isArray(frame) && frame.length === nq && frame.every(Number.isFinite)
    );
    if (!valid) throw new Error("Exact browser retargeting produced an invalid qpos sequence.");
    onProgress("retargeting", 100, "Exact browser retargeting complete. Preparing synchronized playback…");
    return {
      format: "umr-qpos-v1",
      qpos,
      nq,
      fps: Number(pack.manifest.fps || 30),
      motion_id: motionId,
      motion_label: pack.manifest.display_name,
      source_frame_ids: Array.from(pack.assets.frame_ids.values),
      ground_height: 0,
      interaction_objects: interactionObjectsForHeight(pack.manifest, robotHeight),
      compute_backend: `browser-${trained.backend}-clarabel`
    };
  }
}

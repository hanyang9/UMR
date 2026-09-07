// Build all robot-dependent Stage 3/4 inputs from the current correspondence
// run. The only downloaded data accepted here is the robot-independent
// reference pack.

import { bindPointsToMesh } from "./umr-exact-mesh-binding-v1.js?v=20260904-current-run-v2";
import { ExactKDTree3 } from "./umr-exact-kdtree3-v1.js?v=20260904-current-run-v2";
import {
  NumpyPCG64,
  choiceWithoutReplacement
} from "./umr-numpy-pcg64-v1.js";

const SMPL_ADJACENT = [
  ["leftHand", "leftForeArm"], ["leftForeArm", "leftArm"],
  ["leftArm", "leftUpperArm"], ["leftUpperArm", "leftShoulder"],
  ["leftArm", "leftShoulder"], ["leftShoulder", "torso"],
  ["rightHand", "rightForeArm"], ["rightForeArm", "rightArm"],
  ["rightArm", "rightUpperArm"], ["rightUpperArm", "rightShoulder"],
  ["rightArm", "rightShoulder"], ["rightShoulder", "torso"],
  ["head", "torso"], ["torso", "hips"], ["hips", "leftUpLeg"],
  ["leftUpLeg", "leftLeg"], ["leftLeg", "leftFoot"],
  ["hips", "rightUpLeg"], ["rightUpLeg", "rightLeg"],
  ["rightLeg", "rightFoot"]
];

const CHARACTER_ADJACENT = [
  ["pelvis", "torso"], ["torso", "head"],
  ["torso", "left_upper_arm"], ["torso", "right_upper_arm"],
  ["left_upper_arm", "left_lower_arm"], ["left_lower_arm", "left_hand"],
  ["right_upper_arm", "right_lower_arm"], ["right_lower_arm", "right_hand"],
  ["pelvis", "left_thigh"], ["left_thigh", "left_shin"],
  ["left_shin", "left_foot"], ["pelvis", "right_thigh"],
  ["right_thigh", "right_shin"], ["right_shin", "right_foot"]
];

const wrap = (values, shape) => ({ values, shape });
const pairKey = (left, right) => left < right ? `${left}:${right}` : `${right}:${left}`;
const clamp = (value, lower, upper) => Math.min(upper, Math.max(lower, value));
const yieldTask = () => new Promise((resolve) => setTimeout(resolve, 0));
const makeAbortError = () => {
  const error = new Error("Retargeting stopped.");
  error.name = "AbortError";
  return error;
};
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeAbortError();
};

function normalized3(x, y, z) {
  const scale = 1 / Math.max(Math.hypot(x, y, z), 1e-12);
  return [x * scale, y * scale, z * scale];
}

function frameBasis(vertices, a, b, c) {
  const ao = a * 3;
  const bo = b * 3;
  const co = c * 3;
  const e1 = normalized3(
    Number(vertices[bo]) - Number(vertices[ao]),
    Number(vertices[bo + 1]) - Number(vertices[ao + 1]),
    Number(vertices[bo + 2]) - Number(vertices[ao + 2])
  );
  const acx = Number(vertices[co]) - Number(vertices[ao]);
  const acy = Number(vertices[co + 1]) - Number(vertices[ao + 1]);
  const acz = Number(vertices[co + 2]) - Number(vertices[ao + 2]);
  const normal = normalized3(
    e1[1] * acz - e1[2] * acy,
    e1[2] * acx - e1[0] * acz,
    e1[0] * acy - e1[1] * acx
  );
  const e2 = normalized3(
    normal[1] * e1[2] - normal[2] * e1[1],
    normal[2] * e1[0] - normal[0] * e1[2],
    normal[0] * e1[1] - normal[1] * e1[0]
  );
  return { e1, e2, normal };
}

async function bindDynamicReference(sourcePack, source, trainedSourceSlots, robotNormals, onProgress, signal) {
  throwIfAborted(signal);
  const manifest = sourcePack.manifest;
  const slotCount = Number(manifest.num_slots);
  const frames = Number(manifest.frames);
  const verticesPerFrame = Number(sourcePack.assets.motion_vertices_unit.shape[1]);
  const faces = source.faces;
  const templateVertices = source.retargetVertices || source.vertices;
  const binding = bindPointsToMesh(
    trainedSourceSlots,
    templateVertices,
    faces,
    Number(manifest.solver.bind_nearest_vertex_k || 24)
  );
  const sourcePoints = new Float32Array(frames * slotCount * 3);
  const sourceNormals = new Float32Array(sourcePoints.length);
  const normalTargets = new Float32Array(sourcePoints.length);
  const motionVertices = sourcePack.assets.motion_vertices_unit.values;
  const templateLocalNormals = new Float64Array(slotCount * 3);
  const templateFrames = new Array(slotCount);

  for (let slot = 0; slot < slotCount; slot += 1) {
    const face = Number(binding.faceIds[slot]);
    const a = Number(faces[face * 3]);
    const b = Number(faces[face * 3 + 1]);
    const c = Number(faces[face * 3 + 2]);
    const basis = frameBasis(templateVertices, a, b, c);
    templateFrames[slot] = { a, b, c };
    const no = slot * 3;
    const nx = Number(robotNormals[no]);
    const ny = Number(robotNormals[no + 1]);
    const nz = Number(robotNormals[no + 2]);
    templateLocalNormals[no] = basis.e1[0] * nx + basis.e1[1] * ny + basis.e1[2] * nz;
    templateLocalNormals[no + 1] = basis.e2[0] * nx + basis.e2[1] * ny + basis.e2[2] * nz;
    templateLocalNormals[no + 2] = basis.normal[0] * nx + basis.normal[1] * ny + basis.normal[2] * nz;
  }

  for (let frame = 0; frame < frames; frame += 1) {
    const vertexOffset = frame * verticesPerFrame * 3;
    const frameVertices = motionVertices.subarray(
      vertexOffset, vertexOffset + verticesPerFrame * 3
    );
    for (let slot = 0; slot < slotCount; slot += 1) {
      const { a, b, c } = templateFrames[slot];
      const output = (frame * slotCount + slot) * 3;
      const baryOffset = slot * 3;
      const w0 = Number(binding.bary[baryOffset]);
      const w1 = Number(binding.bary[baryOffset + 1]);
      const w2 = Number(binding.bary[baryOffset + 2]);
      for (let axis = 0; axis < 3; axis += 1) {
        sourcePoints[output + axis] =
          Number(motionVertices[vertexOffset + a * 3 + axis]) * w0 +
          Number(motionVertices[vertexOffset + b * 3 + axis]) * w1 +
          Number(motionVertices[vertexOffset + c * 3 + axis]) * w2;
      }
      const basis = frameBasis(frameVertices, a, b, c);
      sourceNormals.set(basis.normal, output);
      const no = slot * 3;
      const lx = templateLocalNormals[no];
      const ly = templateLocalNormals[no + 1];
      const lz = templateLocalNormals[no + 2];
      normalTargets.set(normalized3(
        basis.e1[0] * lx + basis.e2[0] * ly + basis.normal[0] * lz,
        basis.e1[1] * lx + basis.e2[1] * ly + basis.normal[1] * lz,
        basis.e1[2] * lx + basis.e2[2] * ly + basis.normal[2] * lz
      ), output);
    }
    if (frame % 4 === 0 || frame + 1 === frames) {
      onProgress(0.52 * (frame + 1) / frames, "Binding current source slots to reference motion…");
      await yieldTask();
      throwIfAborted(signal);
    }
  }
  return { binding, sourcePoints, sourceNormals, normalTargets };
}

function relabelUpperArms(partIds, closestPoints, segments) {
  const nameToId = new Map(segments.map((segment) => [String(segment.name), Number(segment.id)]));
  for (const [sourceName, targetName] of [["leftArm", "leftUpperArm"], ["rightArm", "rightUpperArm"]]) {
    const sourceId = nameToId.get(sourceName);
    const targetId = nameToId.get(targetName);
    if (!(sourceId > 0) || !(targetId > 0)) continue;
    const candidates = [];
    let lower = Infinity;
    let upper = -Infinity;
    for (let slot = 0; slot < partIds.length; slot += 1) {
      if (Number(partIds[slot]) !== sourceId) continue;
      const lateral = Math.abs(Number(closestPoints[slot * 3]));
      candidates.push([slot, lateral]);
      lower = Math.min(lower, lateral);
      upper = Math.max(upper, lateral);
    }
    for (const [slot, lateral] of candidates) {
      const ratio = upper <= lower + 1e-8 ? 0 : (lateral - lower) / (upper - lower);
      if (ratio >= 0 && ratio <= 0.3) partIds[slot] = targetId;
    }
  }
}

function classifyAndSelect(sourcePack, sourceBinding) {
  const { manifest, assets } = sourcePack;
  const slotCount = Number(manifest.num_slots);
  const facePartIds = assets.face_part_ids.values;
  const partIds = new Uint8Array(slotCount);
  for (let slot = 0; slot < slotCount; slot += 1) {
    partIds[slot] = Number(facePartIds[Number(sourceBinding.faceIds[slot])]);
  }
  if (manifest.pipeline !== "character") {
    relabelUpperArms(partIds, sourceBinding.closestPoints, manifest.segments || []);
  }
  const pointCosts = new Float32Array(slotCount);
  const normalCosts = new Float32Array(slotCount);
  const rng = new NumpyPCG64(0);
  const selected = [];
  for (const segment of manifest.segments || []) {
    const id = Number(segment.id);
    const candidates = [];
    for (let slot = 0; slot < slotCount; slot += 1) {
      if (Number(partIds[slot]) === id) {
        candidates.push(slot);
        pointCosts[slot] = Number(segment.point_cost || 0);
        normalCosts[slot] = Number(segment.normal_cost || 0);
      }
    }
    const requested = Number(segment.sample_slots || 0);
    if (!candidates.length || requested <= 0) continue;
    if (requested >= candidates.length) {
      selected.push(...candidates);
    } else {
      const choices = choiceWithoutReplacement(candidates.length, requested, rng);
      const picked = Array.from(choices, (index) => candidates[Number(index)]).sort((a, b) => a - b);
      selected.push(...picked);
    }
  }
  selected.sort((a, b) => a - b);
  const unique = selected.filter((value, index) => index === 0 || value !== selected[index - 1]);
  return {
    partIds,
    pointCosts,
    normalCosts,
    selected: Uint16Array.from(unique),
    selectedPartIds: Uint8Array.from(unique, (slot) => partIds[slot])
  };
}

function applyReferenceGround(manifest, sourcePoints, rootPositions) {
  const frames = Number(manifest.frames);
  const slotCount = Number(manifest.num_slots);
  let groundUnit = 0;
  if (String(manifest.source_ground_align) === "ground_min") {
    groundUnit = Infinity;
    for (let offset = 2; offset < sourcePoints.length; offset += 3) {
      groundUnit = Math.min(groundUnit, Number(sourcePoints[offset]));
    }
    const matUnit = Number(manifest.mat_height_m || 0) / Number(manifest.normalization_scale);
    if (groundUnit >= matUnit) groundUnit -= matUnit;
    for (let offset = 2; offset < sourcePoints.length; offset += 3) sourcePoints[offset] -= groundUnit;
  } else if (!["none", "raw", "off", "false", "0"].includes(String(manifest.source_ground_align))) {
    throw new Error(`Unsupported browser source ground mode ${manifest.source_ground_align}.`);
  }
  const roots = Float32Array.from(rootPositions);
  for (let frame = 0; frame < frames; frame += 1) roots[frame * 3 + 2] -= groundUnit;
  if (sourcePoints.length !== frames * slotCount * 3) throw new Error("Reference source slot shape mismatch.");
  return { roots, groundUnit };
}

async function groundMaps(sourcePoints, frames, slotCount, snapUnit, signal) {
  throwIfAborted(signal);
  const ground = new Float32Array(frames * slotCount);
  const weights = new Float32Array(ground.length);
  for (let frame = 0; frame < frames; frame += 1) {
    let minimum = Infinity;
    for (let slot = 0; slot < slotCount; slot += 1) {
      minimum = Math.min(minimum, Number(sourcePoints[(frame * slotCount + slot) * 3 + 2]));
    }
    for (let slot = 0; slot < slotCount; slot += 1) {
      const index = frame * slotCount + slot;
      const raw = Number(sourcePoints[index * 3 + 2]);
      weights[index] = raw - minimum;
      const clipped = Math.max(raw, 0);
      ground[index] = clipped < snapUnit ? 0 : clipped;
    }
    if (frame % 4 === 0 || frame + 1 === frames) {
      await yieldTask();
      throwIfAborted(signal);
    }
  }
  return { ground, weights };
}

async function selfContactPack(sourcePoints, selected, partIds, manifest, thresholdUnit, signal) {
  throwIfAborted(signal);
  const solver = manifest.solver;
  if (!(Number(solver.self_contact_map_cost) > 0) || selected.length < 2) return null;
  const frames = Number(manifest.frames);
  const slotCount = Number(manifest.num_slots);
  const idToName = new Map((manifest.segments || []).map((segment) => [Number(segment.id), String(segment.name)]));
  const adjacentPairs = manifest.pipeline === "character" ? CHARACTER_ADJACENT : SMPL_ADJACENT;
  const adjacent = new Set(adjacentPairs.map(([a, b]) => pairKey(a, b)));
  const pairSlots = [];
  const pairParts = [];
  for (let row = 0; row < selected.length; row += 1) {
    const left = Number(selected[row]);
    const leftName = idToName.get(Number(partIds[left])) || "";
    for (let col = row + 1; col < selected.length; col += 1) {
      const right = Number(selected[col]);
      const rightName = idToName.get(Number(partIds[right])) || "";
      if (!leftName || !rightName || leftName === rightName || adjacent.has(pairKey(leftName, rightName))) continue;
      pairSlots.push([left, right]);
      pairParts.push([Math.min(Number(partIds[left]), Number(partIds[right])), Math.max(Number(partIds[left]), Number(partIds[right]))]);
    }
  }
  const bodyGroups = new Map();
  for (let index = 0; index < pairParts.length; index += 1) {
    const key = `${pairParts[index][0]}:${pairParts[index][1]}`;
    if (!bodyGroups.has(key)) bodyGroups.set(key, []);
    bodyGroups.get(key).push(index);
  }
  const orderedGroups = [...bodyGroups.entries()].sort((a, b) => {
    const av = a[0].split(":").map(Number);
    const bv = b[0].split(":").map(Number);
    return av[0] - bv[0] || av[1] - bv[1];
  });
  const modes = Array.isArray(manifest.self_contact?.modes) ? manifest.self_contact.modes : [];
  const bodyTopk = manifest.self_contact?.body_topk || {};
  const defaultTopk = Number(bodyTopk.default ?? bodyTopk["*"] ?? 1);
  const topkById = new Map();
  for (const [name, count] of Object.entries(bodyTopk)) {
    const segment = (manifest.segments || []).find((item) => item.name === name);
    if (segment) topkById.set(Number(segment.id), Number(count));
  }
  const frameMaps = [];
  let maximumWidth = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    const distances = new Float32Array(pairSlots.length);
    for (let pair = 0; pair < pairSlots.length; pair += 1) {
      const left = (frame * slotCount + pairSlots[pair][0]) * 3;
      const right = (frame * slotCount + pairSlots[pair][1]) * 3;
      distances[pair] = Math.hypot(
        Number(sourcePoints[left]) - Number(sourcePoints[right]),
        Number(sourcePoints[left + 1]) - Number(sourcePoints[right + 1]),
        Number(sourcePoints[left + 2]) - Number(sourcePoints[right + 2])
      );
    }
    const merged = new Map();
    if (modes.includes("threshold_global_topk")) {
      const active = Array.from({ length: pairSlots.length }, (_, index) => index)
        .filter((index) => Number(distances[index]) <= thresholdUnit)
        .sort((a, b) => Number(distances[a]) - Number(distances[b]));
      const maximum = Number(solver.self_contact_max_pairs || 0);
      if (maximum > 0) active.length = Math.min(active.length, maximum);
      for (const pair of active) merged.set(pairKey(...pairSlots[pair]), { pair, weight: 1 });
    }
    if (modes.includes("source_clearance_body_pair_topk")) {
      const active = [];
      for (const [key, group] of orderedGroups) {
        const [leftPart, rightPart] = key.split(":").map(Number);
        const keep = Math.max(topkById.get(leftPart) ?? defaultTopk, topkById.get(rightPart) ?? defaultTopk);
        if (keep <= 0) continue;
        active.push(...group.slice().sort((a, b) => Number(distances[a]) - Number(distances[b])).slice(0, keep));
      }
      const ranked = active.slice().sort((a, b) => Number(distances[a]) - Number(distances[b]));
      const weights = new Map(ranked.map((pair, rank) => [
        pair,
        ranked.length > 1 ? Math.fround(1 - 0.9 * rank / (ranked.length - 1)) : 1
      ]));
      for (const pair of active) {
        const key = pairKey(...pairSlots[pair]);
        const weight = weights.get(pair);
        const previous = merged.get(key);
        if (!previous || weight > previous.weight) merged.set(key, { pair, weight });
      }
    }
    const values = [...merged.values()];
    maximumWidth = Math.max(maximumWidth, values.length);
    frameMaps.push(values.map((item) => ({
      slots: pairSlots[item.pair], distance: distances[item.pair], weight: item.weight
    })));
    if (frame % 4 === 0 || frame + 1 === frames) {
      await yieldTask();
      throwIfAborted(signal);
    }
  }
  const counts = new Int32Array(frames);
  const pairs = new Int32Array(frames * maximumWidth * 2).fill(-1);
  const distances = new Float32Array(frames * maximumWidth);
  const weights = new Float32Array(frames * maximumWidth);
  frameMaps.forEach((items, frame) => {
    counts[frame] = items.length;
    items.forEach((item, index) => {
      pairs[(frame * maximumWidth + index) * 2] = item.slots[0];
      pairs[(frame * maximumWidth + index) * 2 + 1] = item.slots[1];
      distances[frame * maximumWidth + index] = item.distance;
      weights[frame * maximumWidth + index] = item.weight;
    });
  });
  return {
    counts: wrap(counts, [frames]),
    pairs: wrap(pairs, [frames, maximumWidth, 2]),
    distances: wrap(distances, [frames, maximumWidth]),
    weights: wrap(weights, [frames, maximumWidth])
  };
}

function rotateQuaternion(values, offset, vector, conjugate = false) {
  const w = Number(values[offset]);
  const sign = conjugate ? -1 : 1;
  const x = sign * Number(values[offset + 1]);
  const y = sign * Number(values[offset + 2]);
  const z = sign * Number(values[offset + 3]);
  const tx = 2 * (y * vector[2] - z * vector[1]);
  const ty = 2 * (z * vector[0] - x * vector[2]);
  const tz = 2 * (x * vector[1] - y * vector[0]);
  return [
    vector[0] + w * tx + (y * tz - z * ty),
    vector[1] + w * ty + (z * tx - x * tz),
    vector[2] + w * tz + (x * ty - y * tx)
  ];
}

async function objectContactPack(sourcePack, sourcePoints, snapUnit, onProgress, signal) {
  throwIfAborted(signal);
  const { manifest, assets } = sourcePack;
  const localSpec = assets.reference_object_points_local_unit;
  const positionSpec = assets.reference_object_positions_unit;
  const quaternionSpec = assets.reference_object_quaternions_wxyz;
  if (!manifest.object_reference || !localSpec || !positionSpec || !quaternionSpec) return null;
  const frames = Number(manifest.frames);
  const slotCount = Number(manifest.num_slots);
  const localPoints = localSpec.values;
  const positions = positionSpec.values;
  const quaternions = quaternionSpec.values;
  const pointCount = Number(localSpec.shape[0]);
  const tree = new ExactKDTree3(localPoints, 0, pointCount);
  const distances = new Float32Array(frames * slotCount);
  const objectIds = new Int32Array(frames * slotCount);
  const pairVectors = new Float32Array(frames * slotCount * 3);
  for (let frame = 0; frame < frames; frame += 1) {
    const po = frame * 3;
    const qo = frame * 4;
    for (let slot = 0; slot < slotCount; slot += 1) {
      const so = (frame * slotCount + slot) * 3;
      const relative = [
        Number(sourcePoints[so]) - Number(positions[po]),
        Number(sourcePoints[so + 1]) - Number(positions[po + 1]),
        Number(sourcePoints[so + 2]) - Number(positions[po + 2])
      ];
      const query = rotateQuaternion(quaternions, qo, relative, true);
      tree.query(query[0], query[1], query[2], 1);
      const objectId = Number(tree.resultIds[0]);
      const lo = objectId * 3;
      const worldOffset = rotateQuaternion(quaternions, qo, [
        Number(localPoints[lo]), Number(localPoints[lo + 1]), Number(localPoints[lo + 2])
      ]);
      const vector = [
        relative[0] - worldOffset[0], relative[1] - worldOffset[1], relative[2] - worldOffset[2]
      ];
      let distance = Math.hypot(...vector);
      if (distance < snapUnit) {
        distance = 0;
        vector.fill(0);
      }
      const index = frame * slotCount + slot;
      distances[index] = distance;
      objectIds[index] = objectId;
      pairVectors.set(vector, so);
    }
    if (frame % 4 === 0 || frame + 1 === frames) {
      onProgress(0.78 + 0.22 * (frame + 1) / frames, "Building current source/object contact map…");
      await yieldTask();
      throwIfAborted(signal);
    }
  }
  return {
    distances: wrap(distances, [frames, slotCount]),
    object_ids: wrap(objectIds, [frames, slotCount]),
    pair_vectors: wrap(pairVectors, [frames, slotCount, 3]),
    object_points_local: localSpec,
    object_positions: positionSpec,
    object_quaternions_wxyz: quaternionSpec
  };
}

export async function buildCurrentRunComputePack({
  sourcePack,
  source,
  trainedSourceSlots,
  robotBinding,
  robotHeight,
  signal = null,
  onProgress = () => {}
}) {
  throwIfAborted(signal);
  if (sourcePack.manifest.format !== "umr-exact-browser-reference-pack-v2") {
    throw new Error("A robot-independent UMR reference pack is required.");
  }
  if (!robotBinding.trainingNormals || robotBinding.trainingNormals.length !== trainedSourceSlots.length) {
    throw new Error("The current robot binding is missing T-pose normals.");
  }
  const { manifest } = sourcePack;
  const frames = Number(manifest.frames);
  const slotCount = Number(manifest.num_slots);
  const dynamic = await bindDynamicReference(
    sourcePack, source, trainedSourceSlots, robotBinding.trainingNormals, onProgress, signal
  );
  throwIfAborted(signal);
  const classified = classifyAndSelect(sourcePack, dynamic.binding);
  onProgress(0.58, "Classifying current source slots with native face segments…");
  const rootGround = applyReferenceGround(
    manifest,
    dynamic.sourcePoints,
    sourcePack.assets.root_positions_unit.values
  );
  const solver = { ...manifest.solver };
  solver.ground_contact_threshold = Number(solver.ground_contact_threshold_m) / robotHeight;
  solver.ground_contact_snap_threshold = Number(solver.ground_contact_snap_threshold_m) / robotHeight;
  solver.self_contact_threshold = Number(solver.self_contact_threshold_m) / robotHeight;
  solver.object_contact_threshold = Number(solver.object_contact_threshold_m) / robotHeight;
  solver.object_contact_snap_threshold = Number(solver.object_contact_snap_threshold_m) / robotHeight;
  const contacts = await groundMaps(
    dynamic.sourcePoints,
    frames,
    slotCount,
    solver.ground_contact_snap_threshold,
    signal
  );
  onProgress(0.68, "Building current source ground-contact map…");
  const selfContact = await selfContactPack(
    dynamic.sourcePoints,
    classified.selected,
    classified.partIds,
    manifest,
    solver.self_contact_threshold,
    signal
  );
  onProgress(0.78, "Building current source self-contact map…");
  const objectContact = await objectContactPack(
    sourcePack,
    dynamic.sourcePoints,
    solver.object_contact_snap_threshold,
    onProgress,
    signal
  );
  throwIfAborted(signal);
  const assets = {
    selected_slot_ids: wrap(classified.selected, [classified.selected.length]),
    selected_part_ids: wrap(classified.selectedPartIds, [classified.selectedPartIds.length]),
    source_part_ids: wrap(classified.partIds, [slotCount]),
    selected_point_costs: wrap(classified.pointCosts, [slotCount]),
    selected_normal_costs: wrap(classified.normalCosts, [slotCount]),
    source_points: wrap(dynamic.sourcePoints, [frames, slotCount, 3]),
    source_normals: wrap(dynamic.sourceNormals, [frames, slotCount, 3]),
    surface_normal_targets: wrap(dynamic.normalTargets, [frames, slotCount, 3]),
    ground_contact_distances: wrap(contacts.ground, [frames, slotCount]),
    ground_contact_weight_distances: wrap(contacts.weights, [frames, slotCount]),
    frame_ids: sourcePack.assets.frame_ids,
    initial_root_positions: wrap(rootGround.roots, [frames, 3]),
    initial_root_quaternions_wxyz: sourcePack.assets.root_quaternions_wxyz
  };
  onProgress(1, "Current-run solver targets ready.");
  return {
    manifest: {
      format: "umr-browser-current-run-pack-v3",
      motion_id: manifest.motion_id,
      display_name: manifest.display_name,
      pipeline: manifest.pipeline,
      fps: manifest.fps,
      frames,
      num_slots: slotCount,
      solver,
      segments: manifest.segments,
      interaction_objects: manifest.interaction_objects || [],
      provenance: "current-browser-run"
    },
    assets,
    selfContact,
    objectContact,
    classification: classified,
    sourceBinding: dynamic.binding
  };
}

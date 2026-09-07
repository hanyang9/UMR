// CPU-only browser port of the native UMR surface-vector retargeter.
// Objective weights, contact selection, bounds, SOC step limits, warm starts,
// bidirectional DP, and trajectory filtering follow the Python pipeline.

import {
  initializeClarabelQP,
  solveClarabelQPStep
} from "./umr-clarabel-qp-v1.js";
import {
  buildRobotObjectCollisionCache,
  computeRobotObjectPenetrationRows
} from "./umr-exact-robot-object-collision-v1.js?v=20260905-fourier-hoi-memory-v1";

const clamp = (value, lower, upper) => Math.min(upper, Math.max(lower, value));
const nextPaint = () => new Promise((resolve) => requestAnimationFrame(resolve));
const yieldTask = () => globalThis.scheduler?.yield
  ? globalThis.scheduler.yield()
  : new Promise((resolve) => setTimeout(resolve, 0));
const makeAbortError = () => {
  const error = new Error("Retargeting stopped.");
  error.name = "AbortError";
  return error;
};
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeAbortError();
};

class DenseRowBuilder {
  constructor(width) {
    this.width = width;
    this.rows = [];
    this.residuals = [];
  }

  push(row, residual, scale = 1) {
    if (!Number.isFinite(residual) || !(scale !== 0)) return;
    const copied = new Float64Array(this.width);
    for (let index = 0; index < this.width; index += 1) copied[index] = Number(row[index]) * scale;
    this.rows.push(copied);
    this.residuals.push(Number(residual) * scale);
  }

  pushMatrix(matrix, rowCount, residual, scale = 1) {
    for (let row = 0; row < rowCount; row += 1) {
      this.push(
        matrix.subarray(row * this.width, (row + 1) * this.width),
        residual[row],
        scale
      );
    }
  }

  finish() {
    const jacobian = new Float64Array(this.rows.length * this.width);
    for (let row = 0; row < this.rows.length; row += 1) jacobian.set(this.rows[row], row * this.width);
    return {
      jacobian,
      residual: Float64Array.from(this.residuals),
      rowCount: this.rows.length
    };
  }
}

class SlotKinematicsCache {
  constructor(viewer, binding, buffers) {
    this.viewer = viewer;
    this.binding = binding;
    this.buffers = buffers;
    this.cache = new Map();
  }

  record(slotId) {
    const id = Number(slotId);
    if (this.cache.has(id)) return this.cache.get(id);
    const { model, data, module } = this.viewer;
    const geomId = Number(this.binding.geomIds[id]);
    const bodyId = Number(this.binding.bodyIds[id] ?? model.geom_bodyid[geomId]);
    if (!(geomId >= 0 && geomId < Number(model.ngeom)) || !(bodyId >= 0)) return null;
    const localOffset = id * 3;
    const matrixOffset = geomId * 9;
    const positionOffset = geomId * 3;
    const lx = Number(this.binding.localPositions[localOffset]);
    const ly = Number(this.binding.localPositions[localOffset + 1]);
    const lz = Number(this.binding.localPositions[localOffset + 2]);
    const point = new Float64Array([
      Number(data.geom_xpos[positionOffset]) + Number(data.geom_xmat[matrixOffset]) * lx + Number(data.geom_xmat[matrixOffset + 1]) * ly + Number(data.geom_xmat[matrixOffset + 2]) * lz,
      Number(data.geom_xpos[positionOffset + 1]) + Number(data.geom_xmat[matrixOffset + 3]) * lx + Number(data.geom_xmat[matrixOffset + 4]) * ly + Number(data.geom_xmat[matrixOffset + 5]) * lz,
      Number(data.geom_xpos[positionOffset + 2]) + Number(data.geom_xmat[matrixOffset + 6]) * lx + Number(data.geom_xmat[matrixOffset + 7]) * ly + Number(data.geom_xmat[matrixOffset + 8]) * lz
    ]);
    const nx = Number(this.binding.localNormals[localOffset]);
    const ny = Number(this.binding.localNormals[localOffset + 1]);
    const nz = Number(this.binding.localNormals[localOffset + 2]);
    const normal = new Float64Array([
      Number(data.geom_xmat[matrixOffset]) * nx + Number(data.geom_xmat[matrixOffset + 1]) * ny + Number(data.geom_xmat[matrixOffset + 2]) * nz,
      Number(data.geom_xmat[matrixOffset + 3]) * nx + Number(data.geom_xmat[matrixOffset + 4]) * ny + Number(data.geom_xmat[matrixOffset + 5]) * nz,
      Number(data.geom_xmat[matrixOffset + 6]) * nx + Number(data.geom_xmat[matrixOffset + 7]) * ny + Number(data.geom_xmat[matrixOffset + 8]) * nz
    ]);
    const length = Math.max(Math.hypot(normal[0], normal[1], normal[2]), 1e-12);
    normal[0] /= length;
    normal[1] /= length;
    normal[2] /= length;
    const { jacpHeap, jacrHeap } = this.buffers;
    jacpHeap.fill(0);
    jacrHeap.fill(0);
    module.mj_jac(model, data, jacpHeap, jacrHeap, point, bodyId);
    const jacp = Float64Array.from(jacpHeap);
    const jacr = Float64Array.from(jacrHeap);
    const nv = Number(model.nv);
    const normalJacobian = new Float64Array(3 * nv);
    for (let dof = 0; dof < nv; dof += 1) {
      const wx = jacr[dof];
      const wy = jacr[nv + dof];
      const wz = jacr[2 * nv + dof];
      normalJacobian[dof] = wy * normal[2] - wz * normal[1];
      normalJacobian[nv + dof] = wz * normal[0] - wx * normal[2];
      normalJacobian[2 * nv + dof] = wx * normal[1] - wy * normal[0];
    }
    const record = { point, normal, jacp, jacr, normalJacobian, geomId, bodyId };
    this.cache.set(id, record);
    return record;
  }
}

function scalarJointRecords(viewer) {
  const { model, module } = viewer;
  const hinge = Number(module.mjtJoint.mjJNT_HINGE.value);
  const slide = Number(module.mjtJoint.mjJNT_SLIDE.value);
  const records = [];
  for (let joint = 0; joint < Number(model.njnt); joint += 1) {
    const type = Number(model.jnt_type[joint]);
    if (type !== hinge && type !== slide) continue;
    // This MuJoCo-WASM build does not register memory_view<bool>, so reading
    // jnt_limited throws. MuJoCo leaves an unlimited scalar joint's range at
    // [0, 0]; a valid limited hinge/slide range is strictly increasing.
    const rangeLower = Number(model.jnt_range[joint * 2]);
    const rangeUpper = Number(model.jnt_range[joint * 2 + 1]);
    const limited = Number.isFinite(rangeLower) && Number.isFinite(rangeUpper) && rangeUpper > rangeLower;
    records.push({
      joint,
      qpos: Number(model.jnt_qposadr[joint]),
      dof: Number(model.jnt_dofadr[joint]),
      lower: limited ? rangeLower : -Infinity,
      upper: limited ? rangeUpper : Infinity
    });
  }
  return records;
}

function rootDofGroups(viewer) {
  const { model, module } = viewer;
  const free = Number(module.mjtJoint.mjJNT_FREE.value);
  for (let joint = 0; joint < Number(model.njnt); joint += 1) {
    if (Number(model.jnt_type[joint]) !== free) continue;
    const start = Number(model.jnt_dofadr[joint]);
    const qpos = Number(model.jnt_qposadr[joint]);
    return {
      translation: new Int32Array([start, start + 1, start + 2]),
      rotation: new Int32Array([start + 3, start + 4, start + 5]),
      qpos
    };
  }
  return { translation: new Int32Array(0), rotation: new Int32Array(0), qpos: -1 };
}

function localPoseDofs(nv, root) {
  const excluded = new Set([...root.translation, ...root.rotation]);
  return Int32Array.from(Array.from({ length: nv }, (_, index) => index).filter((index) => !excluded.has(index)));
}

function selectedByThreshold(values, frameOffset, candidates, threshold, maximum, rankValues = values, rankOffset = frameOffset) {
  const active = [];
  for (const rawId of candidates) {
    const id = Number(rawId);
    if (Number(values[frameOffset + id]) <= threshold) active.push(id);
  }
  if (maximum > 0 && active.length > maximum) {
    active.sort((left, right) => Number(rankValues[rankOffset + left]) - Number(rankValues[rankOffset + right]));
    active.length = maximum;
  }
  return Int32Array.from(active);
}

function selectedGroundAnchors(values, frameOffset, candidates, maximum, rankValues, rankOffset) {
  const active = [];
  for (const rawId of candidates) {
    const id = Number(rawId);
    if (Math.abs(Number(values[frameOffset + id])) <= 1e-8) active.push(id);
  }
  if (maximum > 0 && active.length > maximum) {
    active.sort((left, right) => Number(rankValues[rankOffset + left]) - Number(rankValues[rankOffset + right]));
    active.length = maximum;
  }
  return Int32Array.from(active);
}

function rotateQuaternionWxyz(values, offset, vector, output) {
  const w = Number(values[offset]);
  const x = Number(values[offset + 1]);
  const y = Number(values[offset + 2]);
  const z = Number(values[offset + 3]);
  const vx = vector[0];
  const vy = vector[1];
  const vz = vector[2];
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  output[0] = vx + w * tx + (y * tz - z * ty);
  output[1] = vy + w * ty + (z * tx - x * tz);
  output[2] = vz + w * tz + (x * ty - y * tx);
  return output;
}

function stepLimitFlags(mode, allowOff = false) {
  const normalized = String(mode).toLowerCase();
  if (["off", "none", "unlimited"].includes(normalized)) {
    if (allowOff) return { box: false, l2: false };
    throw new Error(`Unsupported step limit mode ${mode}`);
  }
  if (!["box", "l2", "box_l2"].includes(normalized)) throw new Error(`Unsupported step limit mode ${mode}`);
  return { box: normalized !== "l2", l2: normalized !== "box" };
}

function stepBounds(nv, qpos, joints, limitedDofs, useBox, maxDq) {
  const lower = new Float64Array(nv);
  const upper = new Float64Array(nv);
  lower.fill(-Infinity);
  upper.fill(Infinity);
  if (useBox && Number.isFinite(maxDq)) {
    const limit = Math.abs(maxDq);
    for (const dof of limitedDofs) {
      lower[dof] = Math.max(lower[dof], -limit);
      upper[dof] = Math.min(upper[dof], limit);
    }
  }
  for (const joint of joints) {
    if (!Number.isFinite(joint.lower) && !Number.isFinite(joint.upper)) continue;
    const jointLower = Number.isFinite(joint.lower) ? joint.lower - qpos[joint.qpos] : -Infinity;
    const jointUpper = Number.isFinite(joint.upper) ? joint.upper - qpos[joint.qpos] : Infinity;
    lower[joint.dof] = Math.max(lower[joint.dof], jointLower);
    upper[joint.dof] = Math.min(upper[joint.dof], jointUpper);
    if (lower[joint.dof] > upper[joint.dof]) {
      if (!useBox) {
        const center = 0.5 * (jointLower + jointUpper);
        lower[joint.dof] = center;
        upper[joint.dof] = center;
      } else if (qpos[joint.qpos] < joint.lower) {
        lower[joint.dof] = upper[joint.dof] = Math.min(jointLower, Math.abs(maxDq));
      } else if (qpos[joint.qpos] > joint.upper) {
        lower[joint.dof] = upper[joint.dof] = Math.max(jointUpper, -Math.abs(maxDq));
      }
    }
  }
  return { lower, upper };
}

function applyBoxLimit(bounds, ids, limit) {
  const maximum = Math.abs(Number(limit));
  if (!Number.isFinite(maximum)) return;
  for (const dof of ids) {
    bounds.lower[dof] = Math.max(bounds.lower[dof], -maximum);
    bounds.upper[dof] = Math.min(bounds.upper[dof], maximum);
  }
}

function clampQpos(qpos, joints, root) {
  for (const joint of joints) qpos[joint.qpos] = clamp(qpos[joint.qpos], joint.lower, joint.upper);
  if (root.qpos >= 0) {
    const offset = root.qpos + 3;
    const norm = Math.max(Math.hypot(qpos[offset], qpos[offset + 1], qpos[offset + 2], qpos[offset + 3]), 1e-12);
    for (let index = 0; index < 4; index += 1) qpos[offset + index] /= norm;
  }
}

function sourceOffset(frame, slot, slotCount) {
  return (frame * slotCount + slot) * 3;
}

function selfContactFrame(pack, frame, targetHeight) {
  if (!pack.selfContact) return null;
  const width = Number(pack.selfContact.pairs.shape[1] || 0);
  const count = Math.min(Number(pack.selfContact.counts.values[frame] || 0), width);
  return { width, count, targetHeight };
}

function objectContactFrame(pack, frame, targetHeight) {
  if (!pack.objectContact) return null;
  const slotCount = Number(pack.manifest.num_slots);
  return { frame, slotCount, targetHeight, mode: "world_points" };
}

function updateAnchors(anchorState, active, cache) {
  const activeSet = new Set(Array.from(active, Number));
  for (const id of anchorState.keys()) if (!activeSet.has(id)) anchorState.delete(id);
  for (const id of activeSet) {
    if (anchorState.has(id)) continue;
    const point = cache.record(id)?.point;
    if (point) anchorState.set(id, new Float64Array([point[0], point[1], 0]));
  }
}

function frameInitialQpos(base, pack, frame, targetHeight, root) {
  const output = Float64Array.from(base);
  if (root.qpos < 0) return output;
  const positions = pack.assets.initial_root_positions?.values;
  const quaternions = pack.assets.initial_root_quaternions_wxyz?.values;
  if (!positions || !quaternions) throw new Error("Exact compute pack is missing reference root initialization.");
  const po = frame * 3;
  const qo = frame * 4;
  output[root.qpos] = Number(positions[po]) * targetHeight;
  output[root.qpos + 1] = Number(positions[po + 1]) * targetHeight;
  output[root.qpos + 2] = Number(positions[po + 2]) * targetHeight;
  for (let index = 0; index < 4; index += 1) output[root.qpos + 3 + index] = Number(quaternions[qo + index]);
  return output;
}

async function solveFrame({
  viewer,
  pack,
  binding,
  frame,
  qposInitial,
  previous,
  previous2,
  iterations,
  targetHeight,
  joints,
  jointQpos,
  jointDofs,
  root,
  localDofs,
  anchorState,
  buffers,
  collisionCache,
  signal
}) {
  throwIfAborted(signal);
  const { model, data, module } = viewer;
  const solver = pack.manifest.solver;
  const slotCount = Number(pack.manifest.num_slots);
  const selected = pack.assets.selected_slot_ids.values;
  const sourcePoints = pack.assets.source_points.values;
  const normalTargets = pack.assets.surface_normal_targets.values;
  const pointCosts = pack.assets.selected_point_costs.values;
  const normalCosts = pack.assets.selected_normal_costs.values;
  const ground = pack.assets.ground_contact_distances?.values;
  const groundWeight = pack.assets.ground_contact_weight_distances?.values || ground;
  const groundFrameOffset = frame * slotCount;
  const groundThresholdUnit = Number(solver.ground_contact_threshold);
  const groundMaximum = Number(solver.ground_contact_max_points || 0);
  const groundActive = ground && Number(solver.ground_contact_map_cost) > 0 && groundThresholdUnit >= 0
    ? selectedByThreshold(ground, groundFrameOffset, selected, groundThresholdUnit, groundMaximum, groundWeight, groundFrameOffset)
    : new Int32Array(0);
  const anchorActive = ground && Number(solver.ground_contact_anchor_cost) > 0
    ? selectedGroundAnchors(ground, groundFrameOffset, selected, groundMaximum, groundWeight, groundFrameOffset)
    : new Int32Array(0);
  const selfFrame = selfContactFrame(pack, frame, targetHeight);
  const objectFrame = objectContactFrame(pack, frame, targetHeight);
  const qpos = Float64Array.from(qposInitial);
  data.qpos.set(qpos);
  module.mj_forward(model, data);
  updateAnchors(anchorState, anchorActive, new SlotKinematicsCache(viewer, binding, buffers));
  let lastCost = 0;

  for (let iteration = 0; iteration < Math.max(1, iterations); iteration += 1) {
    throwIfAborted(signal);
    data.qpos.set(qpos);
    module.mj_forward(model, data);
    const cache = new SlotKinematicsCache(viewer, binding, buffers);
    const rows = new DenseRowBuilder(Number(model.nv));

    for (const rawSlot of selected) {
      const slot = Number(rawSlot);
      const current = cache.record(slot);
      if (!current) continue;
      const offset = sourceOffset(frame, slot, slotCount);
      const pointCost = Number(pointCosts[slot] || 0);
      if (pointCost > 0) {
        const residual = new Float64Array([
          current.point[0] - Number(sourcePoints[offset]) * targetHeight,
          current.point[1] - Number(sourcePoints[offset + 1]) * targetHeight,
          current.point[2] - Number(sourcePoints[offset + 2]) * targetHeight
        ]);
        rows.pushMatrix(current.jacp, 3, residual, Math.sqrt(pointCost));
      }
      const normalCost = Number(normalCosts[slot] || 0);
      if (normalCost > 0) {
        const tx = Number(normalTargets[offset]);
        const ty = Number(normalTargets[offset + 1]);
        const tz = Number(normalTargets[offset + 2]);
        const norm = Math.max(Math.hypot(tx, ty, tz), 1e-12);
        rows.pushMatrix(
          current.normalJacobian,
          3,
          new Float64Array([
            current.normal[0] - tx / norm,
            current.normal[1] - ty / norm,
            current.normal[2] - tz / norm
          ]),
          Math.sqrt(normalCost)
        );
      }
    }

    if (selfFrame && Number(solver.self_contact_map_cost) > 0) {
      const pairs = pack.selfContact.pairs.values;
      const distances = pack.selfContact.distances.values;
      const weights = pack.selfContact.weights.values;
      const sqrtCost = Math.sqrt(Number(solver.self_contact_map_cost));
      const pairJacobian = new Float64Array(Number(model.nv));
      for (let pair = 0; pair < selfFrame.count; pair += 1) {
        const pairOffset = (frame * selfFrame.width + pair) * 2;
        const slotA = Number(pairs[pairOffset]);
        const slotB = Number(pairs[pairOffset + 1]);
        const left = cache.record(slotA);
        const right = cache.record(slotB);
        if (!left || !right) continue;
        const dx = left.point[0] - right.point[0];
        const dy = left.point[1] - right.point[1];
        const dz = left.point[2] - right.point[2];
        const distance = Math.hypot(dx, dy, dz);
        const targetDistance = Number(distances[frame * selfFrame.width + pair]) * targetHeight;
        const scale = sqrtCost * Math.sqrt(Math.max(Number(weights[frame * selfFrame.width + pair]), 0));
        if (!(scale > 0) || !(distance < targetDistance)) continue;
        let dirX;
        let dirY;
        let dirZ;
        if (distance > 1e-12) {
          dirX = dx / distance;
          dirY = dy / distance;
          dirZ = dz / distance;
        } else {
          const ao = sourceOffset(frame, slotA, slotCount);
          const bo = sourceOffset(frame, slotB, slotCount);
          dirX = Number(sourcePoints[ao]) - Number(sourcePoints[bo]);
          dirY = Number(sourcePoints[ao + 1]) - Number(sourcePoints[bo + 1]);
          dirZ = Number(sourcePoints[ao + 2]) - Number(sourcePoints[bo + 2]);
          const norm = Math.max(Math.hypot(dirX, dirY, dirZ), 1e-12);
          dirX /= norm;
          dirY /= norm;
          dirZ /= norm;
        }
        const nv = Number(model.nv);
        for (let dof = 0; dof < nv; dof += 1) {
          pairJacobian[dof] = dirX * (left.jacp[dof] - right.jacp[dof])
            + dirY * (left.jacp[nv + dof] - right.jacp[nv + dof])
            + dirZ * (left.jacp[2 * nv + dof] - right.jacp[2 * nv + dof]);
        }
        rows.push(pairJacobian, distance - targetDistance, scale);
      }
    }

    if (ground && Number(solver.ground_contact_map_cost) > 0) {
      for (const rawSlot of groundActive) {
        const slot = Number(rawSlot);
        const current = cache.record(slot);
        if (!current) continue;
        const targetUnit = Number(ground[groundFrameOffset + slot]);
        const rankUnit = Number(groundWeight[groundFrameOffset + slot]);
        const strength = clamp((groundThresholdUnit - rankUnit) / Math.max(groundThresholdUnit, 1e-8), 0.05, 1);
        const rowCost = Number(solver.ground_contact_map_cost) * strength;
        const nv = Number(model.nv);
        rows.push(current.jacp.subarray(2 * nv, 3 * nv), current.point[2] - targetUnit * targetHeight, rowCost);
      }
    }

    if (ground && Number(solver.ground_contact_anchor_cost) > 0) {
      for (const rawSlot of anchorActive) {
        const slot = Number(rawSlot);
        const current = cache.record(slot);
        const target = anchorState.get(slot);
        if (!current || !target) continue;
        const rankUnit = Number(groundWeight[groundFrameOffset + slot]);
        const strength = clamp((groundThresholdUnit - rankUnit) / Math.max(groundThresholdUnit, 1e-8), 0.05, 1);
        const rowCost = Number(solver.ground_contact_anchor_cost) * strength;
        rows.pushMatrix(current.jacp, 3, new Float64Array([
          current.point[0] - target[0], current.point[1] - target[1], current.point[2] - target[2]
        ]), rowCost);
      }
    }

    if (objectFrame && Number(solver.object_contact_map_cost) > 0) {
      const contact = pack.objectContact;
      const distances = contact.distances.values;
      const objectIds = contact.object_ids.values;
      const vectors = contact.pair_vectors.values;
      const localPoints = contact.object_points_local.values;
      const positions = contact.object_positions.values;
      const quaternions = contact.object_quaternions_wxyz.values;
      const pointCount = Number(contact.object_points_local.shape[0]);
      const thresholdUnit = Number(solver.object_contact_threshold);
      const active = selectedByThreshold(distances, frame * slotCount, Int32Array.from({ length: slotCount }, (_, index) => index), thresholdUnit, Number(solver.object_contact_max_points || 0));
      const objectPoint = new Float64Array(3);
      for (const rawSlot of active) {
        const slot = Number(rawSlot);
        const objectId = Number(objectIds[frame * slotCount + slot]);
        if (!(objectId >= 0 && objectId < pointCount)) continue;
        const current = cache.record(slot);
        if (!current) continue;
        const localOffset = objectId * 3;
        rotateQuaternionWxyz(quaternions, frame * 4, [
          Number(localPoints[localOffset]) * targetHeight,
          Number(localPoints[localOffset + 1]) * targetHeight,
          Number(localPoints[localOffset + 2]) * targetHeight
        ], objectPoint);
        objectPoint[0] += Number(positions[frame * 3]) * targetHeight;
        objectPoint[1] += Number(positions[frame * 3 + 1]) * targetHeight;
        objectPoint[2] += Number(positions[frame * 3 + 2]) * targetHeight;
        const distanceUnit = Number(distances[frame * slotCount + slot]);
        const strength = clamp((thresholdUnit - distanceUnit) / Math.max(thresholdUnit, 1e-8), 0.5, 1);
        const rowCost = Number(solver.object_contact_map_cost) * strength;
        const vectorOffset = sourceOffset(frame, slot, slotCount);
        rows.pushMatrix(current.jacp, 3, new Float64Array([
          current.point[0] - objectPoint[0] - Number(vectors[vectorOffset]) * targetHeight,
          current.point[1] - objectPoint[1] - Number(vectors[vectorOffset + 1]) * targetHeight,
          current.point[2] - objectPoint[2] - Number(vectors[vectorOffset + 2]) * targetHeight
        ]), rowCost);
      }
    }

    if (previous && Number(solver.smooth_cost) > 0) {
      const scale = Math.sqrt(Number(solver.smooth_cost));
      for (let index = 0; index < joints.length; index += 1) {
        const row = new Float64Array(Number(model.nv));
        row[jointDofs[index]] = 1;
        rows.push(row, qpos[jointQpos[index]] - previous[jointQpos[index]], scale);
      }
    }
    if (previous && previous2 && Number(solver.temporal_smooth_cost) > 0) {
      const scale = Math.sqrt(Number(solver.temporal_smooth_cost));
      for (let index = 0; index < joints.length; index += 1) {
        const row = new Float64Array(Number(model.nv));
        row[jointDofs[index]] = 1;
        const current = qpos[jointQpos[index]] - previous[jointQpos[index]];
        const prior = previous[jointQpos[index]] - previous2[jointQpos[index]];
        rows.push(row, current - prior, scale);
      }
    }

    let objectPenetration = { jacobians: [], distances: [] };
    if (objectFrame && collisionCache &&
        (solver.robot_object_hard_constraint || Number(solver.robot_object_penetration_soft_cost) > 0)) {
      const positions = pack.objectContact.object_positions.values;
      const quaternions = pack.objectContact.object_quaternions_wxyz.values;
      const po = frame * 3;
      const qo = frame * 4;
      const objectPose = new Float64Array([
        Number(positions[po]) * targetHeight,
        Number(positions[po + 1]) * targetHeight,
        Number(positions[po + 2]) * targetHeight,
        Number(quaternions[qo]),
        Number(quaternions[qo + 1]),
        Number(quaternions[qo + 2]),
        Number(quaternions[qo + 3])
      ]);
      objectPenetration = computeRobotObjectPenetrationRows(
        collisionCache,
        qpos,
        objectPose,
        Number(solver.robot_object_margin),
        Number(solver.robot_object_threshold),
        Number(solver.robot_object_max_pairs)
      );
      const softCost = Number(solver.robot_object_penetration_soft_cost);
      const margin = Number(solver.robot_object_margin);
      if (softCost > 0) {
        const scale = Math.sqrt(softCost);
        for (let index = 0; index < objectPenetration.jacobians.length; index += 1) {
          const distance = Number(objectPenetration.distances[index]);
          if (margin - distance <= 0) continue;
          rows.push(objectPenetration.jacobians[index], distance - margin, scale);
        }
      }
    }

    const stepFlags = stepLimitFlags(solver.step_limit_mode || "box");
    const rootFlags = stepLimitFlags(solver.root_step_limit_mode || "off", true);
    const bounds = stepBounds(Number(model.nv), qpos, joints, localDofs, stepFlags.box, Number(solver.max_dq));
    if (rootFlags.box) {
      applyBoxLimit(bounds, root.translation, Number(solver.root_max_translation_dq));
      applyBoxLimit(bounds, root.rotation, Number(solver.root_max_rotation_dq));
    }
    const l2StepLimits = [];
    if (stepFlags.l2 && localDofs.length) l2StepLimits.push({ dofIds: localDofs, radius: Number(solver.global_step_size) });
    if (rootFlags.l2 && root.translation.length) {
      l2StepLimits.push({ dofIds: root.translation, radius: Number(solver.root_global_translation_step_size) });
      l2StepLimits.push({ dofIds: root.rotation, radius: Number(solver.root_global_rotation_step_size) });
    }

    const inequalityRows = [];
    const inequalityBounds = [];
    const inequalitySoftCosts = [];
    const groundMode = String(solver.ground_penetration_hard_constraint_mode || "surface_slots");
    if (solver.ground_penetration_hard_constraint && ["surface_slots", "surface_slots_all"].includes(groundMode)) {
      const candidates = groundMode === "surface_slots_all"
        ? Int32Array.from({ length: slotCount }, (_, index) => index)
        : Int32Array.from(selected, Number);
      const active = [];
      const margin = Number(solver.ground_penetration_margin || 0);
      const threshold = Number(solver.ground_penetration_threshold);
      for (const rawSlot of candidates) {
        const slot = Number(rawSlot);
        const z = cache.record(slot)?.point[2];
        if (Number.isFinite(z) && (threshold < 0 || z < margin + threshold)) active.push({ slot, z });
      }
      const maximum = Number(solver.ground_penetration_max_points || 0);
      if (maximum > 0 && active.length > maximum) {
        active.sort((left, right) => left.z - right.z || left.slot - right.slot);
        active.length = maximum;
      }
      const slackCost = solver.ground_penetration_hard_slack ? Number(solver.ground_penetration_hard_slack_cost) : 0;
      const nv = Number(model.nv);
      for (const item of active) {
        const jacobian = cache.record(item.slot).jacp;
        const row = new Float64Array(nv);
        for (let dof = 0; dof < nv; dof += 1) row[dof] = -jacobian[2 * nv + dof];
        inequalityRows.push(row);
        inequalityBounds.push(item.z - margin);
        inequalitySoftCosts.push(slackCost);
      }
    } else if (solver.ground_penetration_hard_constraint) {
      throw new Error(`Exact browser solver does not yet support ground mode ${groundMode}.`);
    }
    if (solver.robot_self_penetration_hard_constraint || Number(solver.robot_self_penetration_cost) > 0) {
      throw new Error("Exact browser self-penetration collision rows are not initialized.");
    }
    if (solver.robot_object_hard_constraint && objectFrame && collisionCache) {
      const slackCost = solver.robot_object_hard_slack ? Number(solver.robot_object_hard_slack_cost) : 0;
      const margin = Number(solver.robot_object_margin);
      for (let index = 0; index < objectPenetration.jacobians.length; index += 1) {
        const source = objectPenetration.jacobians[index];
        const row = new Float64Array(Number(model.nv));
        for (let dof = 0; dof < row.length; dof += 1) row[dof] = -source[dof];
        inequalityRows.push(row);
        inequalityBounds.push(Number(objectPenetration.distances[index]) - margin);
        inequalitySoftCosts.push(slackCost);
      }
    }

    const objective = rows.finish();
    if (!objective.rowCount) throw new Error("Exact retarget QP has no objective rows.");
    const nv = Number(model.nv);
    const inequalityA = new Float64Array(inequalityRows.length * nv);
    for (let row = 0; row < inequalityRows.length; row += 1) inequalityA.set(inequalityRows[row], row * nv);
    const dq = await solveClarabelQPStep({
      ...objective,
      variableCount: nv,
      damping: Number(solver.damping || 0),
      lower: bounds.lower,
      upper: bounds.upper,
      inequalityA,
      inequalityB: Float64Array.from(inequalityBounds),
      inequalityRowCount: inequalityRows.length,
      inequalitySoftCosts: Float64Array.from(inequalitySoftCosts),
      l2StepLimits
    });
    throwIfAborted(signal);
    buffers.dqHeap.set(dq);
    buffers.qposHeap.set(qpos);
    module.mj_integratePos(model, buffers.qposHeap, buffers.dqHeap, 1);
    qpos.set(buffers.qposHeap);
    clampQpos(qpos, joints, root);
    let squared = 0;
    for (const value of objective.residual) squared += value * value;
    lastCost = squared / objective.residual.length;
    await yieldTask();
    throwIfAborted(signal);
  }
  data.qpos.set(qpos);
  module.mj_forward(model, data);
  return { qpos, cost: lastCost };
}

function selectBidirectionalDP(forward, backward, forwardCosts, backwardCosts, jointQpos, continuityCost, switchCost) {
  const frames = forward.length;
  const scores = Array.from({ length: frames }, () => new Float64Array([Infinity, Infinity]));
  const parents = Array.from({ length: frames }, () => new Uint8Array(2));
  scores[0][0] = forwardCosts[0];
  scores[0][1] = backwardCosts[0];
  for (let frame = 1; frame < frames; frame += 1) {
    const current = [forward[frame], backward[frame]];
    const prior = [forward[frame - 1], backward[frame - 1]];
    for (let state = 0; state < 2; state += 1) {
      const emission = state ? backwardCosts[frame] : forwardCosts[frame];
      for (let previousState = 0; previousState < 2; previousState += 1) {
        let continuity = 0;
        for (const qpos of jointQpos) {
          const delta = current[state][qpos] - prior[previousState][qpos];
          continuity += delta * delta;
        }
        const candidate = scores[frame - 1][previousState] + continuityCost * continuity + (state === previousState ? 0 : switchCost);
        if (candidate < scores[frame][state] - emission) {
          scores[frame][state] = emission + candidate;
          parents[frame][state] = previousState;
        }
      }
    }
  }
  let state = scores[frames - 1][1] < scores[frames - 1][0] ? 1 : 0;
  const output = new Array(frames);
  for (let frame = frames - 1; frame >= 0; frame -= 1) {
    output[frame] = Float64Array.from(state ? backward[frame] : forward[frame]);
    state = parents[frame][state];
  }
  return output;
}

function finiteDifferenceSystem(frames, dataCost, velocityCost, accelerationCost, jerkCost) {
  const matrix = new Float64Array(frames * frames);
  for (let index = 0; index < frames; index += 1) matrix[index * frames + index] = dataCost;
  const addOrder = (coefficients, cost) => {
    if (!(cost > 0) || frames <= coefficients.length - 1) return;
    for (let start = 0; start <= frames - coefficients.length; start += 1) {
      for (let left = 0; left < coefficients.length; left += 1) {
        for (let right = 0; right < coefficients.length; right += 1) {
          matrix[(start + left) * frames + start + right] += cost * coefficients[left] * coefficients[right];
        }
      }
    }
  };
  addOrder([-1, 1], velocityCost);
  addOrder([1, -2, 1], accelerationCost);
  addOrder([-1, 3, -3, 1], jerkCost);
  return matrix;
}

function solveDenseSymmetric(matrix, rhs, size, columns) {
  const lower = new Float64Array(size * size);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = matrix[row * size + column];
      for (let k = 0; k < column; k += 1) value -= lower[row * size + k] * lower[column * size + k];
      lower[row * size + column] = row === column
        ? Math.sqrt(Math.max(value, 1e-18))
        : value / lower[column * size + column];
    }
  }
  const result = new Float64Array(size * columns);
  const y = new Float64Array(size * columns);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let value = rhs[row * columns + column];
      for (let k = 0; k < row; k += 1) value -= lower[row * size + k] * y[k * columns + column];
      y[row * columns + column] = value / lower[row * size + row];
    }
  }
  for (let row = size - 1; row >= 0; row -= 1) {
    for (let column = 0; column < columns; column += 1) {
      let value = y[row * columns + column];
      for (let k = row + 1; k < size; k += 1) value -= lower[k * size + row] * result[k * columns + column];
      result[row * columns + column] = value / lower[row * size + row];
    }
  }
  return result;
}

function filterTrajectory(sequence, solver, joints, root) {
  if (String(solver.trajectory_filter_mode).toLowerCase() !== "lqr" || sequence.length <= 1) return sequence;
  const frames = sequence.length;
  const dataCost = Math.max(Number(solver.trajectory_filter_data_cost), 1e-12);
  const velocityCost = Math.max(Number(solver.trajectory_filter_velocity_cost), 0);
  const accelerationCost = Math.max(Number(solver.trajectory_filter_acceleration_cost), 0);
  const jerkCost = Math.max(Number(solver.trajectory_filter_jerk_cost), 0);
  if (!(velocityCost > 0 || accelerationCost > 0 || jerkCost > 0)) return sequence;
  const columns = [...new Set([
    ...(solver.trajectory_filter_root_translation && root.qpos >= 0 ? [root.qpos, root.qpos + 1, root.qpos + 2] : []),
    ...joints.map((joint) => joint.qpos)
  ])].sort((left, right) => left - right);
  const fixed = new Set();
  const startCount = Math.max(0, Number(solver.trajectory_filter_anchor_start_frames || 0));
  const endCount = Math.max(0, Number(solver.trajectory_filter_anchor_end_frames || 0));
  for (let frame = 0; frame < Math.min(startCount, frames); frame += 1) fixed.add(frame);
  for (let frame = Math.max(frames - endCount, 0); frame < frames; frame += 1) fixed.add(frame);
  const free = Array.from({ length: frames }, (_, index) => index).filter((index) => !fixed.has(index));
  if (!free.length) return sequence;
  const system = finiteDifferenceSystem(frames, dataCost, velocityCost, accelerationCost, jerkCost);
  const reduced = new Float64Array(free.length * free.length);
  const rhs = new Float64Array(free.length * columns.length);
  for (let row = 0; row < free.length; row += 1) {
    const frame = free[row];
    for (let column = 0; column < free.length; column += 1) reduced[row * free.length + column] = system[frame * frames + free[column]];
    for (let target = 0; target < columns.length; target += 1) {
      let value = dataCost * sequence[frame][columns[target]];
      for (const fixedFrame of fixed) value -= system[frame * frames + fixedFrame] * sequence[fixedFrame][columns[target]];
      rhs[row * columns.length + target] = value;
    }
  }
  const solved = solveDenseSymmetric(reduced, rhs, free.length, columns.length);
  const output = sequence.map((frame) => Float64Array.from(frame));
  for (let row = 0; row < free.length; row += 1) {
    for (let target = 0; target < columns.length; target += 1) output[free[row]][columns[target]] = solved[row * columns.length + target];
    clampQpos(output[free[row]], joints, root);
  }
  return output;
}

export async function retargetMotionBrowserExact(
  viewer,
  pack,
  binding,
  targetHeight,
  onProgress = () => {},
  signal = null
) {
  throwIfAborted(signal);
  if (pack.manifest.format !== "umr-browser-current-run-pack-v3" ||
      pack.manifest.provenance !== "current-browser-run") {
    throw new Error("Retargeting requires Stage 3/4 inputs generated by the current robot run.");
  }
  await initializeClarabelQP();
  throwIfAborted(signal);
  const { model, data, module } = viewer;
  const nv = Number(model.nv);
  const nq = Number(model.nq);
  const frames = Number(pack.manifest.frames);
  const solver = pack.manifest.solver;
  const joints = scalarJointRecords(viewer);
  const jointQpos = Int32Array.from(joints.map((joint) => joint.qpos));
  const jointDofs = Int32Array.from(joints.map((joint) => joint.dof));
  const root = rootDofGroups(viewer);
  const localDofs = localPoseDofs(nv, root);
  const savedQpos = Float64Array.from(data.qpos);
  module.mj_resetData(model, data);
  const qBodyZero = Float64Array.from(data.qpos);
  for (const joint of joints) qBodyZero[joint.qpos] = 0;
  clampQpos(qBodyZero, joints, root);
  // Compiling the appended-object model may grow Emscripten's memory and
  // detach existing heap views. Build it before allocating Jacobian buffers.
  const collisionCache = await buildRobotObjectCollisionCache(viewer, pack, targetHeight);
  const jacpBuffer = new module.DoubleBuffer(3 * nv);
  const jacrBuffer = new module.DoubleBuffer(3 * nv);
  const qposBuffer = new module.DoubleBuffer(nq);
  const dqBuffer = new module.DoubleBuffer(nv);
  const buffers = {
    get jacpHeap() { return jacpBuffer.GetView(); },
    get jacrHeap() { return jacrBuffer.GetView(); },
    get qposHeap() { return qposBuffer.GetView(); },
    get dqHeap() { return dqBuffer.GetView(); }
  };

  const bidirectional = String(solver.trajectory_mode).toLowerCase() === "bidirectional";
  let progressDone = 0;
  const progressTotal = frames * (bidirectional ? 2 : 1);
  const solveOrder = async (order) => {
    const sequence = new Array(frames);
    const costs = new Float64Array(frames);
    let previous = null;
    let previous2 = null;
    const anchorState = new Map();
    for (let cursor = 0; cursor < order.length; cursor += 1) {
      throwIfAborted(signal);
      const frame = order[cursor];
      const initial = previous || frameInitialQpos(qBodyZero, pack, frame, targetHeight, root);
      const solved = await solveFrame({
        viewer, pack, binding, frame, qposInitial: initial, previous, previous2,
        iterations: previous ? Number(solver.iters || 1) : Number(solver.pose_init_iters || solver.iters || 1),
        targetHeight, joints, jointQpos, jointDofs, root, localDofs, anchorState, buffers, collisionCache, signal
      });
      sequence[frame] = Float64Array.from(solved.qpos);
      costs[frame] = solved.cost;
      previous2 = previous;
      previous = solved.qpos;
      progressDone += 1;
      onProgress(progressDone / progressTotal, frame + 1, frames);
      if (cursor % 4 === 0 || cursor === order.length - 1) await nextPaint();
      throwIfAborted(signal);
    }
    return { sequence, costs };
  };

  try {
    throwIfAborted(signal);
    const forward = await solveOrder(Array.from({ length: frames }, (_, index) => index));
    throwIfAborted(signal);
    let sequence = forward.sequence;
    if (bidirectional) {
      const backward = await solveOrder(Array.from({ length: frames }, (_, index) => frames - 1 - index));
      throwIfAborted(signal);
      sequence = selectBidirectionalDP(
        forward.sequence,
        backward.sequence,
        forward.costs,
        backward.costs,
        jointQpos,
        Math.max(0, Number(solver.trajectory_continuity_cost || 0)),
        Math.max(0, Number(solver.trajectory_switch_cost || 0))
      );
    }
    throwIfAborted(signal);
    const filtered = filterTrajectory(sequence, solver, joints, root);
    throwIfAborted(signal);
    return filtered.map((frame) => Array.from(frame));
  } finally {
    data.qpos.set(savedQpos);
    module.mj_forward(model, data);
    jacpBuffer.delete();
    jacrBuffer.delete();
    qposBuffer.delete();
    dqBuffer.delete();
    collisionCache?.dispose();
  }
}

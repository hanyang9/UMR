// MuJoCo-WASM least-squares retargeter used by the static browser studio.
// All output buffers passed to MuJoCo live in the WASM heap; embind copies a
// normal TypedArray and would otherwise silently discard Jacobian/position output.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const nextPaint = () => new Promise((resolve) => requestAnimationFrame(resolve));

function transformLocal(data, bodyId, local, output) {
  const matrixOffset = bodyId * 9;
  const positionOffset = bodyId * 3;
  output[0] = data.xpos[positionOffset] + data.xmat[matrixOffset] * local[0] + data.xmat[matrixOffset + 1] * local[1] + data.xmat[matrixOffset + 2] * local[2];
  output[1] = data.xpos[positionOffset + 1] + data.xmat[matrixOffset + 3] * local[0] + data.xmat[matrixOffset + 4] * local[1] + data.xmat[matrixOffset + 5] * local[2];
  output[2] = data.xpos[positionOffset + 2] + data.xmat[matrixOffset + 6] * local[0] + data.xmat[matrixOffset + 7] * local[1] + data.xmat[matrixOffset + 8] * local[2];
  return output;
}

function rotateLocal(data, bodyId, local, output) {
  const offset = bodyId * 9;
  output[0] = data.xmat[offset] * local[0] + data.xmat[offset + 1] * local[1] + data.xmat[offset + 2] * local[2];
  output[1] = data.xmat[offset + 3] * local[0] + data.xmat[offset + 4] * local[1] + data.xmat[offset + 5] * local[2];
  output[2] = data.xmat[offset + 6] * local[0] + data.xmat[offset + 7] * local[1] + data.xmat[offset + 8] * local[2];
  return output;
}

function rotateQuaternionWxyz(quaternion, vector, output) {
  const w = Number(quaternion[0]);
  const x = Number(quaternion[1]);
  const y = Number(quaternion[2]);
  const z = Number(quaternion[3]);
  const vx = Number(vector[0]);
  const vy = Number(vector[1]);
  const vz = Number(vector[2]);
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  output[0] = vx + w * tx + (y * tz - z * ty);
  output[1] = vy + w * ty + (z * tx - x * tz);
  output[2] = vz + w * tz + (x * ty - y * tx);
  return output;
}

function addRow(H, gradient, jacobian, error, weight, nv) {
  if (!(weight > 0) || !Number.isFinite(error)) return;
  for (let row = 0; row < nv; row += 1) {
    const left = Number(jacobian[row]);
    if (!left) continue;
    gradient[row] += weight * left * error;
    const base = row * nv;
    for (let column = 0; column <= row; column += 1) {
      H[base + column] += weight * left * Number(jacobian[column]);
    }
  }
}

function choleskySolve(H, gradient, nv) {
  for (let row = 0; row < nv; row += 1) {
    for (let column = 0; column <= row; column += 1) H[column * nv + row] = H[row * nv + column];
  }
  const L = new Float64Array(nv * nv);
  for (let row = 0; row < nv; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = H[row * nv + column];
      for (let k = 0; k < column; k += 1) value -= L[row * nv + k] * L[column * nv + k];
      if (row === column) L[row * nv + column] = Math.sqrt(Math.max(value, 1e-12));
      else L[row * nv + column] = value / L[column * nv + column];
    }
  }
  const y = new Float64Array(nv);
  for (let row = 0; row < nv; row += 1) {
    let value = -gradient[row];
    for (let column = 0; column < row; column += 1) value -= L[row * nv + column] * y[column];
    y[row] = value / L[row * nv + row];
  }
  const result = new Float64Array(nv);
  for (let row = nv - 1; row >= 0; row -= 1) {
    let value = y[row];
    for (let column = row + 1; column < nv; column += 1) value -= L[column * nv + row] * result[column];
    result[row] = value / L[row * nv + row];
  }
  return result;
}

function scalarJointRecords(viewer) {
  const hinge = viewer.module.mjtJoint.mjJNT_HINGE.value;
  const slide = viewer.module.mjtJoint.mjJNT_SLIDE.value;
  const records = [];
  for (let joint = 0; joint < viewer.model.njnt; joint += 1) {
    const type = Number(viewer.model.jnt_type[joint]);
    if (type !== hinge && type !== slide) continue;
    records.push({
      qpos: Number(viewer.model.jnt_qposadr[joint]),
      dof: Number(viewer.model.jnt_dofadr[joint]),
      min: Number(viewer.model.jnt_range[joint * 2]),
      max: Number(viewer.model.jnt_range[joint * 2 + 1])
    });
  }
  return records;
}

function frameCost(left, right, start) {
  let cost = 0;
  const width = Math.min(left.length, right.length);
  for (let index = start; index < width; index += 1) {
    const delta = left[index] - right[index];
    cost += delta * delta;
  }
  return cost / Math.max(width - start, 1);
}

function selectBidirectionalDP(forward, backward, forwardCosts, backwardCosts, jointStart) {
  const frames = forward.length;
  const scores = Array.from({ length: frames }, () => [Infinity, Infinity]);
  const parents = Array.from({ length: frames }, () => [0, 0]);
  scores[0] = [forwardCosts[0], backwardCosts[0]];
  for (let frame = 1; frame < frames; frame += 1) {
    const current = [forward[frame], backward[frame]];
    const previous = [forward[frame - 1], backward[frame - 1]];
    const emission = [forwardCosts[frame], backwardCosts[frame]];
    for (let state = 0; state < 2; state += 1) {
      for (let prior = 0; prior < 2; prior += 1) {
        const continuity = frameCost(previous[prior], current[state], jointStart);
        const score = scores[frame - 1][prior] + emission[state] + 0.01 * continuity + (prior === state ? 0 : 0.01);
        if (score < scores[frame][state]) {
          scores[frame][state] = score;
          parents[frame][state] = prior;
        }
      }
    }
  }
  let state = scores[frames - 1][1] < scores[frames - 1][0] ? 1 : 0;
  const output = new Array(frames);
  for (let frame = frames - 1; frame >= 0; frame -= 1) {
    output[frame] = (state ? backward : forward)[frame];
    state = parents[frame][state];
  }
  return output;
}

function lowestContactIndices(values, frameOffset, count, threshold, maximum) {
  const active = [];
  for (let index = 0; index < count; index += 1) {
    const value = Number(values[frameOffset + index]);
    if (Number.isFinite(value) && value <= threshold) active.push(index);
  }
  active.sort((left, right) => values[frameOffset + left] - values[frameOffset + right]);
  return active.slice(0, Math.max(0, maximum));
}

export async function retargetMotionBrowser(viewer, pack, samples, bindingIds, onProgress) {
  const { model, data, module } = viewer;
  const manifest = pack.manifest;
  const solver = manifest.solver || {};
  const selectedIds = pack.assets.selected_slot_ids.values;
  const sourcePoints = pack.assets.source_points.values;
  const sourceNormals = pack.assets.surface_normal_targets.values;
  const pointCosts = pack.assets.selected_point_costs.values;
  const normalCosts = pack.assets.selected_normal_costs.values;
  const groundDistances = pack.assets.ground_contact_distances.values;
  const frames = Number(manifest.frames);
  const selectedCount = selectedIds.length;
  const scalarJoints = scalarJointRecords(viewer);
  const tpose = new Float64Array(viewer.retargetTPose || data.qpos);
  const nv = Number(model.nv);
  const nq = Number(model.nq);
  const jacpBuffer = new module.DoubleBuffer(3 * nv);
  const jacrBuffer = new module.DoubleBuffer(3 * nv);
  const qposBuffer = new module.DoubleBuffer(nq);
  const dqBuffer = new module.DoubleBuffer(nv);
  const jacpHeap = jacpBuffer.GetView();
  const jacrHeap = jacrBuffer.GetView();
  const qposWork = qposBuffer.GetView();
  const dqWork = dqBuffer.GetView();
  const worldPoint = new Float64Array(3);
  const worldNormal = new Float64Array(3);
  const localPoint = new Float64Array(3);
  const localNormal = new Float64Array(3);
  const objectPoint = new Float64Array(3);
  const objectLocal = new Float64Array(3);
  const objectQuaternion = new Float64Array(4);
  const pairJacobian = new Float64Array(nv);
  const normalJacobian = [new Float64Array(nv), new Float64Array(nv), new Float64Array(nv)];
  const smoothRows = new Map();
  for (const joint of scalarJoints) {
    const row = new Float64Array(nv);
    row[joint.dof] = 1;
    smoothRows.set(joint.dof, row);
  }

  const selfContact = pack.selfContact;
  const objectContact = pack.objectContact;
  const groundThreshold = Number(solver.ground_contact_threshold ?? 0.1);
  const groundMaximum = Number(solver.ground_contact_max_points ?? 128);
  const objectThreshold = Number(solver.object_contact_threshold ?? 0.1);
  const objectWidth = Number(objectContact?.slot_ids?.shape?.[1] || 0);
  const objectPointCount = Number(objectContact?.object_points_local?.shape?.[0] || 0);
  const selfWidth = Number(selfContact?.pairs?.shape?.[1] || 0);

  const solveFrame = (frame, initial, previous, previous2, iterations) => {
    const qpos = qposWork;
    qpos.set(initial);
    const groundActive = new Set(lowestContactIndices(
      groundDistances,
      frame * selectedCount,
      selectedCount,
      groundThreshold,
      groundMaximum
    ));
    let lastCost = 0;
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      data.qpos.set(qpos);
      module.mj_forward(model, data);
      const H = new Float64Array(nv * nv);
      const gradient = new Float64Array(nv);
      const kinematics = new Map();
      let totalError = 0;

      const slotKinematics = (globalSlot) => {
        let record = kinematics.get(globalSlot);
        if (record) return record;
        const sampleId = Number(bindingIds[globalSlot]);
        if (!(sampleId >= 0 && sampleId < samples.bodyIds.length)) return null;
        const bodyId = Number(samples.bodyIds[sampleId]);
        localPoint.set(samples.localPoints.subarray(sampleId * 3, sampleId * 3 + 3));
        localNormal.set(samples.localNormals.subarray(sampleId * 3, sampleId * 3 + 3));
        transformLocal(data, bodyId, localPoint, worldPoint);
        rotateLocal(data, bodyId, localNormal, worldNormal);
        jacpHeap.fill(0);
        jacrHeap.fill(0);
        module.mj_jac(model, data, jacpHeap, jacrHeap, worldPoint, bodyId);
        record = {
          point: Float64Array.from(worldPoint),
          normal: Float64Array.from(worldNormal),
          jacp: Float64Array.from(jacpHeap),
          jacr: Float64Array.from(jacrHeap)
        };
        kinematics.set(globalSlot, record);
        return record;
      };

      for (let selectedIndex = 0; selectedIndex < selectedCount; selectedIndex += 1) {
        const globalSlot = Number(selectedIds[selectedIndex]);
        const current = slotKinematics(globalSlot);
        if (!current) continue;
        const targetOffset = (frame * selectedCount + selectedIndex) * 3;
        const pointWeight = Math.max(0, Number(pointCosts[selectedIndex]));
        for (let axis = 0; axis < 3; axis += 1) {
          const error = current.point[axis] - Number(sourcePoints[targetOffset + axis]) * samples.height;
          addRow(H, gradient, current.jacp.subarray(axis * nv, (axis + 1) * nv), error, pointWeight, nv);
          totalError += error * error;
        }
        const normalWeight = Math.max(0, Number(normalCosts[selectedIndex]));
        if (normalWeight > 0) {
          const nx = Number(sourceNormals[targetOffset]);
          const ny = Number(sourceNormals[targetOffset + 1]);
          const nz = Number(sourceNormals[targetOffset + 2]);
          const normalLength = Math.max(Math.hypot(nx, ny, nz), 1e-12);
          for (let dof = 0; dof < nv; dof += 1) {
            const wx = current.jacr[dof];
            const wy = current.jacr[nv + dof];
            const wz = current.jacr[2 * nv + dof];
            normalJacobian[0][dof] = wy * current.normal[2] - wz * current.normal[1];
            normalJacobian[1][dof] = wz * current.normal[0] - wx * current.normal[2];
            normalJacobian[2][dof] = wx * current.normal[1] - wy * current.normal[0];
          }
          const targets = [nx / normalLength, ny / normalLength, nz / normalLength];
          for (let axis = 0; axis < 3; axis += 1) {
            addRow(H, gradient, normalJacobian[axis], current.normal[axis] - targets[axis], normalWeight, nv);
          }
        }
        if (groundActive.has(selectedIndex)) {
          const distance = Number(groundDistances[frame * selectedCount + selectedIndex]);
          const strength = clamp((groundThreshold - distance) / Math.max(groundThreshold, 1e-8), 0.05, 1);
          const rowCost = Number(solver.ground_contact_map_cost || 0) * strength;
          const targetZ = distance * samples.height;
          addRow(H, gradient, current.jacp.subarray(2 * nv, 3 * nv), current.point[2] - targetZ, rowCost * rowCost, nv);
        }
      }

      const selfCost = Number(solver.self_contact_map_cost || 0);
      const selfCount = Math.min(Number(selfContact?.counts?.values?.[frame] || 0), selfWidth);
      if (selfCost > 0 && selfCount > 0) {
        for (let pairIndex = 0; pairIndex < selfCount; pairIndex += 1) {
          const pairOffset = (frame * selfWidth + pairIndex) * 2;
          const slotA = Number(selfContact.pairs.values[pairOffset]);
          const slotB = Number(selfContact.pairs.values[pairOffset + 1]);
          const left = slotKinematics(slotA);
          const right = slotKinematics(slotB);
          if (!left || !right) continue;
          const dx = left.point[0] - right.point[0];
          const dy = left.point[1] - right.point[1];
          const dz = left.point[2] - right.point[2];
          const distance = Math.hypot(dx, dy, dz);
          const targetDistance = Number(selfContact.distances.values[frame * selfWidth + pairIndex]) * samples.height;
          if (!(distance < targetDistance)) continue;
          const inverseDistance = distance > 1e-12 ? 1 / distance : 0;
          const direction = distance > 1e-12 ? [dx * inverseDistance, dy * inverseDistance, dz * inverseDistance] : [1, 0, 0];
          for (let dof = 0; dof < nv; dof += 1) {
            pairJacobian[dof] =
              direction[0] * (left.jacp[dof] - right.jacp[dof]) +
              direction[1] * (left.jacp[nv + dof] - right.jacp[nv + dof]) +
              direction[2] * (left.jacp[2 * nv + dof] - right.jacp[2 * nv + dof]);
          }
          const pairWeight = selfCost * Math.max(0, Number(selfContact.weights.values[frame * selfWidth + pairIndex]));
          addRow(H, gradient, pairJacobian, distance - targetDistance, pairWeight, nv);
        }
      }

      const objectCost = Number(solver.object_contact_map_cost || 0);
      if (objectCost > 0 && objectContact && objectWidth > 0 && objectPointCount > 0) {
        const positionOffset = frame * 3;
        const quaternionOffset = frame * 4;
        objectQuaternion.set(objectContact.object_quaternions_wxyz.values.subarray(quaternionOffset, quaternionOffset + 4));
        for (let contact = 0; contact < objectWidth; contact += 1) {
          const contactOffset = frame * objectWidth + contact;
          const globalSlot = Number(objectContact.slot_ids.values[contactOffset]);
          const objectId = Number(objectContact.object_ids.values[contactOffset]);
          const targetDistance = Number(objectContact.distances.values[contactOffset]);
          if (globalSlot < 0 || objectId < 0 || objectId >= objectPointCount || !(targetDistance <= objectThreshold)) continue;
          const current = slotKinematics(globalSlot);
          if (!current) continue;
          const localOffset = objectId * 3;
          objectLocal[0] = Number(objectContact.object_points_local.values[localOffset]) * samples.height;
          objectLocal[1] = Number(objectContact.object_points_local.values[localOffset + 1]) * samples.height;
          objectLocal[2] = Number(objectContact.object_points_local.values[localOffset + 2]) * samples.height;
          rotateQuaternionWxyz(objectQuaternion, objectLocal, objectPoint);
          objectPoint[0] += Number(objectContact.object_positions.values[positionOffset]) * samples.height;
          objectPoint[1] += Number(objectContact.object_positions.values[positionOffset + 1]) * samples.height;
          objectPoint[2] += Number(objectContact.object_positions.values[positionOffset + 2]) * samples.height;
          const vectorOffset = contactOffset * 3;
          const strength = clamp((objectThreshold - targetDistance) / Math.max(objectThreshold, 1e-8), 0.5, 1);
          const rowCost = objectCost * strength;
          for (let axis = 0; axis < 3; axis += 1) {
            const targetVector = Number(objectContact.pair_vectors.values[vectorOffset + axis]) * samples.height;
            const error = (current.point[axis] - objectPoint[axis]) - targetVector;
            addRow(H, gradient, current.jacp.subarray(axis * nv, (axis + 1) * nv), error, rowCost * rowCost, nv);
          }
        }
      }

      if (previous) {
        const smoothCost = Number(solver.smooth_cost || 0);
        const temporalCost = Number(solver.temporal_smooth_cost || 0);
        for (const joint of scalarJoints) {
          const row = smoothRows.get(joint.dof);
          const velocity = qpos[joint.qpos] - previous[joint.qpos];
          addRow(H, gradient, row, velocity, smoothCost, nv);
          if (previous2) {
            const priorVelocity = previous[joint.qpos] - previous2[joint.qpos];
            addRow(H, gradient, row, velocity - priorVelocity, temporalCost, nv);
          }
        }
      }

      const damping = Math.max(Number(solver.damping || 1e-4), 1e-6);
      for (let dof = 0; dof < nv; dof += 1) H[dof * nv + dof] += damping;
      dqWork.set(choleskySolve(H, gradient, nv));
      const maxStep = Number(solver.max_dq || 0.15);
      let localNorm = 0;
      for (const joint of scalarJoints) localNorm += dqWork[joint.dof] * dqWork[joint.dof];
      const localScale = Math.sqrt(localNorm) > 0.4 ? 0.4 / Math.sqrt(localNorm) : 1;
      for (const joint of scalarJoints) dqWork[joint.dof] = clamp(dqWork[joint.dof] * localScale, -maxStep, maxStep);
      for (let dof = 0; dof < Math.min(6, nv); dof += 1) dqWork[dof] = clamp(dqWork[dof], -0.3, 0.3);
      module.mj_integratePos(model, qpos, dqWork, 1);
      for (const joint of scalarJoints) {
        if (Number.isFinite(joint.min) && Number.isFinite(joint.max) && joint.max > joint.min) {
          qpos[joint.qpos] = clamp(qpos[joint.qpos], joint.min, joint.max);
        }
      }
      lastCost = totalError / Math.max(selectedCount, 1);
    }
    return { qpos: Array.from(qpos), cost: lastCost };
  };

  const solveOrder = async (order, progressStart, progressSpan) => {
    const sequence = new Array(frames);
    const costs = new Float32Array(frames);
    let previous = null;
    let previous2 = null;
    for (let cursor = 0; cursor < order.length; cursor += 1) {
      const frame = order[cursor];
      const initial = previous || tpose;
      const iterations = cursor === 0 ? Math.max(Number(solver.pose_init_iters || 10), 1) : Math.max(Number(solver.iters || 1), 1);
      const solved = solveFrame(frame, initial, previous, previous2, iterations);
      sequence[frame] = solved.qpos;
      costs[frame] = solved.cost;
      previous2 = previous;
      previous = solved.qpos;
      onProgress(progressStart + progressSpan * ((cursor + 1) / order.length), frame + 1, frames);
      if (cursor % 4 === 0 || cursor === order.length - 1) await nextPaint();
    }
    return { sequence, costs };
  };

  try {
    const useBidirectional = manifest.pipeline === "soma" || String(solver.trajectory_mode).includes("bidirectional");
    const forward = await solveOrder(Array.from({ length: frames }, (_, index) => index), 0, useBidirectional ? 0.5 : 1);
    let qpos = forward.sequence;
    if (useBidirectional) {
      const backward = await solveOrder(Array.from({ length: frames }, (_, index) => frames - 1 - index), 0.5, 0.5);
      const hasFreeRoot = Number(model.nq) - Number(model.nv) === 1;
      qpos = selectBidirectionalDP(forward.sequence, backward.sequence, forward.costs, backward.costs, hasFreeRoot ? 7 : 0);
    }
    return qpos;
  } finally {
    data.qpos.set(tpose);
    module.mj_forward(model, data);
    jacpBuffer.delete();
    jacrBuffer.delete();
    qposBuffer.delete();
    dqBuffer.delete();
  }
}

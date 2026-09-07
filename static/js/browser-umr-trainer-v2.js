// Local correspondence optimizer. WebGPU is preferred, while the deterministic
// spatial-grid implementation keeps the same 100-epoch workflow on CPU-only
// browsers without loading TensorFlow.js at all.

const TF_URL = new URL("../vendor/tfjs/tf.min.js", import.meta.url);
const TF_WEBGPU_URL = new URL("../vendor/tfjs/tf-backend-webgpu.js", import.meta.url);
const nextPaint = () => new Promise((resolve) => requestAnimationFrame(resolve));

function spatialKey(x, y, z) {
  return `${x},${y},${z}`;
}

function buildSpatialGrid(points, cellSize) {
  const grid = new Map();
  for (let index = 0; index < points.length / 3; index += 1) {
    const key = spatialKey(
      Math.floor(points[index * 3] / cellSize),
      Math.floor(points[index * 3 + 1] / cellSize),
      Math.floor(points[index * 3 + 2] / cellSize)
    );
    const bucket = grid.get(key);
    if (bucket) bucket.push(index);
    else grid.set(key, [index]);
  }
  return grid;
}

function nearestIndex(points, grid, cellSize, x, y, z) {
  const gx = Math.floor(x / cellSize);
  const gy = Math.floor(y / cellSize);
  const gz = Math.floor(z / cellSize);
  let best = -1;
  let bestDistance = Infinity;
  for (let radius = 0; radius <= 5 && best < 0; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          if (radius && Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== radius) continue;
          const bucket = grid.get(spatialKey(gx + dx, gy + dy, gz + dz));
          if (!bucket) continue;
          for (const index of bucket) {
            const px = points[index * 3] - x;
            const py = points[index * 3 + 1] - y;
            const pz = points[index * 3 + 2] - z;
            const distance = px * px + py * py + pz * pz;
            if (distance < bestDistance) {
              bestDistance = distance;
              best = index;
            }
          }
        }
      }
    }
  }
  if (best >= 0) return best;
  for (let index = 0; index < points.length / 3; index += 1) {
    const dx = points[index * 3] - x;
    const dy = points[index * 3 + 1] - y;
    const dz = points[index * 3 + 2] - z;
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

function nearestAssignments(slots, target, grid, cellSize) {
  const assignments = new Int32Array(slots.length / 3);
  for (let slot = 0; slot < assignments.length; slot += 1) {
    const offset = slot * 3;
    assignments[slot] = nearestIndex(
      target,
      grid,
      cellSize,
      slots[offset],
      slots[offset + 1],
      slots[offset + 2]
    );
  }
  return assignments;
}

async function trainCPU(source, target, edges, epochs, onProgress) {
  const slots = new Float32Array(source);
  const residual = new Float32Array(slots.length);
  const laplacian = new Float32Array(slots.length);
  const grid = buildSpatialGrid(target, 0.055);
  let loss = 0;
  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    const phase = (epoch - 1) / Math.max(epochs - 1, 1);
    const rate = 0.16 * (1 - phase) + 0.025 * phase;
    loss = 0;
    for (let index = 0; index < slots.length / 3; index += 1) {
      const offset = index * 3;
      const match = nearestIndex(target, grid, 0.055, slots[offset], slots[offset + 1], slots[offset + 2]);
      for (let axis = 0; axis < 3; axis += 1) {
        const delta = target[match * 3 + axis] - slots[offset + axis];
        slots[offset + axis] += rate * delta;
        loss += delta * delta;
        residual[offset + axis] = slots[offset + axis] - source[offset + axis];
      }
    }
    laplacian.fill(0);
    for (let edge = 0; edge < edges.length / 2; edge += 1) {
      const left = Number(edges[edge * 2]);
      const right = Number(edges[edge * 2 + 1]);
      for (let axis = 0; axis < 3; axis += 1) {
        const delta = residual[right * 3 + axis] - residual[left * 3 + axis];
        laplacian[left * 3 + axis] += delta;
        laplacian[right * 3 + axis] -= delta;
      }
    }
    for (let index = 0; index < slots.length; index += 1) slots[index] += 0.0015 * laplacian[index];
    if (epoch === 1 || epoch % 3 === 0 || epoch === epochs) {
      onProgress(epoch / epochs, loss / Math.max(slots.length / 3, 1), epoch, "CPU");
      await nextPaint();
    }
  }
  return { slots, backend: "cpu", loss: loss / Math.max(slots.length / 3, 1) };
}

async function loadWebGPU(onMessage) {
  if (!globalThis.navigator?.gpu) return null;
  try {
    onMessage("Initializing WebGPU training backend…");
    if (!globalThis.tf) await import(TF_URL.href);
    await import(TF_WEBGPU_URL.href);
    const tf = globalThis.tf;
    if (!(await tf.setBackend("webgpu"))) return null;
    await tf.ready();
    const probe = tf.tidy(() => tf.tensor1d([1, 2, 3]).square().sum());
    await probe.data();
    probe.dispose();
    return tf;
  } catch (error) {
    console.warn("WebGPU initialization failed; using deterministic CPU training.", error);
    return null;
  }
}

async function trainWebGPU(tf, source, target, edges, epochs, edgeWeight, learningRate, onProgress) {
  const count = source.length / 3;
  const targetCount = target.length / 3;
  const grid = buildSpatialGrid(target, 0.055);
  const sourceTensor = tf.tensor2d(source, [count, 3]);
  const targetTensor = tf.tensor2d(target, [targetCount, 3]);
  const edgeTensor = tf.tensor2d(edges, [edges.length / 2, 2], "int32");
  const edgeLeft = edgeTensor.slice([0, 0], [-1, 1]).reshape([-1]);
  const edgeRight = edgeTensor.slice([0, 1], [-1, 1]).reshape([-1]);
  const slots = tf.variable(sourceTensor.clone(), true, "umr_browser_slots");
  const optimizer = tf.train.adam(learningRate);
  let matchTensor = null;
  let lastLoss = Infinity;
  try {
    for (let epoch = 1; epoch <= epochs; epoch += 1) {
      if (!matchTensor || epoch === 2 || epoch % 10 === 0) {
        const current = epoch === 1 ? source : new Float32Array(await slots.data());
        const assignments = nearestAssignments(current, target, grid, 0.055);
        matchTensor?.dispose();
        matchTensor = tf.tensor1d(assignments, "int32");
      }
      const cost = optimizer.minimize(() => tf.tidy(() => {
        const matched = tf.gather(targetTensor, matchTensor);
        const fit = slots.sub(matched).square().mean();
        const residual = slots.sub(sourceTensor);
        const edgeDelta = tf.gather(residual, edgeLeft).sub(tf.gather(residual, edgeRight));
        return fit.add(edgeDelta.square().sum(1).mean().mul(edgeWeight));
      }), true, [slots]);
      if (!cost) throw new Error("WebGPU optimizer did not return a loss tensor.");
      if (epoch === 1 || epoch % 3 === 0 || epoch === epochs) {
        lastLoss = Number((await cost.data())[0]);
        if (!Number.isFinite(lastLoss)) throw new Error("WebGPU training produced a non-finite loss.");
        onProgress(epoch / epochs, lastLoss, epoch, "WebGPU");
        await tf.nextFrame();
      }
      cost.dispose();
    }
    return { slots: new Float32Array(await slots.data()), backend: "webgpu", loss: lastLoss };
  } finally {
    matchTensor?.dispose();
    optimizer.dispose?.();
    slots.dispose();
    edgeLeft.dispose();
    edgeRight.dispose();
    edgeTensor.dispose();
    sourceTensor.dispose();
    targetTensor.dispose();
  }
}

export async function trainCorrespondenceBrowser({
  source,
  target,
  edges,
  epochs = 100,
  edgeWeight = 0.4,
  learningRate = 0.001,
  onMessage = () => {},
  onProgress = () => {}
}) {
  const tf = await loadWebGPU(onMessage);
  if (tf) {
    try {
      return await trainWebGPU(tf, source, target, edges, epochs, edgeWeight, learningRate, onProgress);
    } catch (error) {
      console.warn("WebGPU correspondence training failed; restarting on CPU.", error);
      onMessage("WebGPU training was unavailable; restarting the same 100 epochs on CPU…");
    }
  }
  return trainCPU(source, target, edges, epochs, onProgress);
}

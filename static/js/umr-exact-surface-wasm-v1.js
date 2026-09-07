import { NumpyPCG64, weightedChoice } from "./umr-numpy-pcg64-v1.js";
import { sampleFirstHitSurfacePoints as sampleReference } from "./umr-exact-surface-v1.js?v=20260904-stop-v1";

const EPSILON = 1e-12;
let runtimePromise = null;
const makeAbortError = () => {
  const error = new Error("Retargeting stopped.");
  error.name = "AbortError";
  return error;
};
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeAbortError();
};

function yieldTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function canUseThreadedWASM() {
  return globalThis.crossOriginIsolated === true &&
    typeof globalThis.SharedArrayBuffer === "function" &&
    typeof globalThis.Worker === "function";
}

async function loadRuntime(onProgress) {
  if (!canUseThreadedWASM()) return null;
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const module = await import(
        "../vendor/umr-exact-surface-wasm-threaded-v1/umr_exact_surface_wasm.js"
      );
      const exports = await module.default();
      if (!(exports.memory.buffer instanceof SharedArrayBuffer)) {
        throw new Error("Exact surface WASM did not receive shared memory.");
      }
      const available = Math.max(1, Number(navigator.hardwareConcurrency) || 1);
      // Sampling is short, so leave at least half of the logical CPUs available
      // to the browser, renderer, and operating system.
      const threads = Math.min(4, Math.max(1, Math.floor(available / 2)));
      await module.initThreadPool(threads);
      return { module, threads };
    })();
  }
  onProgress(0.01, "initializing-multicore-sampler");
  return runtimePromise;
}

function validateMesh(vertices, faces) {
  if (vertices.length % 3 || faces.length % 3) {
    throw new TypeError("vertices and faces must contain xyz/triangle rows.");
  }
  if (!vertices.length || !faces.length) {
    throw new Error("Object mesh must contain vertices and triangles for surface sampling.");
  }
}

function prepareCandidates({ vertices, faces, count, seed, oversampleRatio, candidateMultiplier }) {
  const vertexCount = vertices.length / 3;
  const faceCount = faces.length / 3;
  const validFaceIds = [];
  const cumulativeAreas = [];
  const lower = [Infinity, Infinity, Infinity];
  const upper = [-Infinity, -Infinity, -Infinity];
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = Number(vertices[vertex * 3 + axis]);
      lower[axis] = Math.min(lower[axis], value);
      upper[axis] = Math.max(upper[axis], value);
    }
  }
  let totalArea = 0;
  for (let face = 0; face < faceCount; face += 1) {
    const ia = Number(faces[face * 3]) * 3;
    const ib = Number(faces[face * 3 + 1]) * 3;
    const ic = Number(faces[face * 3 + 2]) * 3;
    const abx = vertices[ib] - vertices[ia];
    const aby = vertices[ib + 1] - vertices[ia + 1];
    const abz = vertices[ib + 2] - vertices[ia + 2];
    const acx = vertices[ic] - vertices[ia];
    const acy = vertices[ic + 1] - vertices[ia + 1];
    const acz = vertices[ic + 2] - vertices[ia + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const area = 0.5 * Math.hypot(nx, ny, nz);
    if (!(area > EPSILON)) continue;
    totalArea += area;
    validFaceIds.push(face);
    cumulativeAreas.push(totalArea);
  }
  if (!validFaceIds.length) {
    throw new Error("Object mesh has no valid triangles for first_hit surface sampling.");
  }

  const candidateCount = Math.max(count * oversampleRatio * candidateMultiplier, count);
  const rng = new NumpyPCG64(seed);
  const candidateFaceIds = new Int32Array(candidateCount);
  for (let index = 0; index < candidateCount; index += 1) {
    candidateFaceIds[index] = validFaceIds[weightedChoice(cumulativeAreas, rng)];
  }
  const squareRootR1 = new Float64Array(candidateCount);
  for (let index = 0; index < candidateCount; index += 1) {
    squareRootR1[index] = Math.sqrt(rng.random());
  }
  const candidatePoints = new Float64Array(candidateCount * 3);
  for (let index = 0; index < candidateCount; index += 1) {
    const r1 = squareRootR1[index];
    const r2 = rng.random();
    const face = candidateFaceIds[index];
    const ia = Number(faces[face * 3]) * 3;
    const ib = Number(faces[face * 3 + 1]) * 3;
    const ic = Number(faces[face * 3 + 2]) * 3;
    const w0 = 1 - r1;
    const w1 = r1 * (1 - r2);
    const w2 = r1 * r2;
    for (let axis = 0; axis < 3; axis += 1) {
      candidatePoints[index * 3 + axis] =
        w0 * vertices[ia + axis] + w1 * vertices[ib + axis] + w2 * vertices[ic + axis];
    }
  }
  return { candidateFaceIds, candidatePoints, lower, upper };
}

function gatherResult(exteriorPoints, exteriorFaceIds, keep) {
  const points = new Float32Array(keep.length * 3);
  const faceIds = new Int32Array(keep.length);
  for (let index = 0; index < keep.length; index += 1) {
    const source = Number(keep[index]);
    points[index * 3] = exteriorPoints[source * 3];
    points[index * 3 + 1] = exteriorPoints[source * 3 + 1];
    points[index * 3 + 2] = exteriorPoints[source * 3 + 2];
    faceIds[index] = exteriorFaceIds[source];
  }
  return { points, faceIds };
}

// Exported for deterministic Python/browser golden diagnostics. Production
// sampling calls the same function below, so the test cannot drift from it.
export const prepareExactSurfaceCandidatesForTest = prepareCandidates;

export async function sampleFirstHitSurfacePointsWASM({
  vertices,
  faces,
  count,
  seed = 9000,
  oversampleRatio = 8,
  candidateMultiplier = 12,
  rayOffset = 1e-4,
  rayDistance = 0,
  minVisibleViews = 2,
  diagnostics = false,
  signal = null,
  onProgress = () => {}
}) {
  throwIfAborted(signal);
  validateMesh(vertices, faces);
  const runtime = await loadRuntime(onProgress);
  throwIfAborted(signal);
  if (!runtime) {
    onProgress(0.01, "multicore-unavailable-reference-fallback");
    return sampleReference({
      vertices, faces, count, seed, oversampleRatio, candidateMultiplier,
      rayOffset, rayDistance, minVisibleViews, signal, onProgress
    });
  }

  const prepared = prepareCandidates({
    vertices, faces, count, seed, oversampleRatio, candidateMultiplier
  });
  onProgress(0.1, "candidate-sampling");
  await yieldTask();
  throwIfAborted(signal);

  const faceValues = new Uint32Array(faces.length);
  for (let index = 0; index < faces.length; index += 1) {
    const value = Number(faces[index]);
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError(`Invalid face vertex index at ${index}: ${value}.`);
    }
    faceValues[index] = value;
  }
  const kernel = new runtime.module.ExactSurfaceKernel(
    vertices instanceof Float32Array ? vertices : Float32Array.from(vertices),
    faceValues
  );
  let fps = null;
  try {
    const uniqueFaceIds = Uint32Array.from(
      Array.from(new Set(prepared.candidateFaceIds)).sort((left, right) => left - right)
    );
    const diagonal = Math.hypot(
      prepared.upper[0] - prepared.lower[0],
      prepared.upper[1] - prepared.lower[1],
      prepared.upper[2] - prepared.lower[2]
    );
    const outsideDistance = rayDistance > 0 ? rayDistance : Math.max(2 * diagonal, 1);
    const visibleFaces = new Uint8Array(faces.length / 3);
    const visibilityBatch = 512;
    for (let start = 0; start < uniqueFaceIds.length; start += visibilityBatch) {
      throwIfAborted(signal);
      const end = Math.min(start + visibilityBatch, uniqueFaceIds.length);
      const visible = kernel.visible_faces(
        uniqueFaceIds.subarray(start, end), outsideDistance, rayOffset, minVisibleViews
      );
      for (let index = start; index < end; index += 1) {
        visibleFaces[uniqueFaceIds[index]] = visible[index - start];
      }
      onProgress(0.1 + 0.45 * end / Math.max(uniqueFaceIds.length, 1), "first-hit");
      await yieldTask();
    }

    let exteriorCount = 0;
    for (const face of prepared.candidateFaceIds) exteriorCount += visibleFaces[face];
    if (exteriorCount < count) {
      throw new Error(
        `first_hit kept ${exteriorCount}/${prepared.candidateFaceIds.length} object candidates, ` +
        `less than the requested ${count}; refusing to sample hidden surfaces.`
      );
    }
    const exteriorPoints = new Float64Array(exteriorCount * 3);
    const exteriorFaceIds = new Int32Array(exteriorCount);
    const exteriorMask = diagnostics ? new Uint8Array(prepared.candidateFaceIds.length) : null;
    let exteriorIndex = 0;
    for (let candidate = 0; candidate < prepared.candidateFaceIds.length; candidate += 1) {
      const face = prepared.candidateFaceIds[candidate];
      if (!visibleFaces[face]) continue;
      if (exteriorMask) exteriorMask[candidate] = 1;
      exteriorPoints.set(
        prepared.candidatePoints.subarray(candidate * 3, candidate * 3 + 3),
        exteriorIndex * 3
      );
      exteriorFaceIds[exteriorIndex] = face;
      exteriorIndex += 1;
    }
    onProgress(0.55, "first-hit");
    await yieldTask();
    throwIfAborted(signal);

    const firstIndex = new NumpyPCG64(seed).integers(exteriorCount);
    fps = new runtime.module.ExactFarthestPointSampler(exteriorPoints, count, firstIndex);
    while (!fps.step(64)) {
      onProgress(0.55 + 0.45 * fps.completed() / count, "farthest-point-sampling");
      await yieldTask();
      throwIfAborted(signal);
    }
    throwIfAborted(signal);
    const keep = fps.selected();
    const result = gatherResult(exteriorPoints, exteriorFaceIds, keep);
    onProgress(1, "complete");
    return {
      ...result,
      backend: "wasm-simd-threads-exact",
      threads: runtime.threads,
      diagnostics: diagnostics ? {
        candidateFaceIds: prepared.candidateFaceIds,
        candidatePoints: prepared.candidatePoints,
        exteriorMask,
        fpsIndices: Int32Array.from(keep)
      } : undefined
    };
  } finally {
    fps?.free();
    kernel.free();
  }
}

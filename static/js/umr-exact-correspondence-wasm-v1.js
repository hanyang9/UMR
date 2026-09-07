import {
  normalizeCorrespondenceSamples,
  templateSortYZx
} from "./umr-exact-correspondence-shared-v1.js";
import {
  applyAugmentationRecipe,
  loadExactTrainingRuntime
} from "./umr-exact-training-runtime-loader-v1.js?v=20260905-epoch60-contract-v1";
import {
  cosineAnnealingLearningRate,
  exactCorrespondenceTrainingContract as contract
} from "./umr-exact-training-kernels-v1.js?v=20260905-epoch60-contract-v1";

let scalarRuntimePromise = null;
const makeAbortError = () => {
  const error = new Error("Retargeting stopped.");
  error.name = "AbortError";
  return error;
};
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeAbortError();
};

function gatherPoints(points, indices) {
  const output = new Float32Array(indices.length * 3);
  for (let index = 0; index < indices.length; index += 1) {
    const source = Number(indices[index]) * 3;
    output.set(points.subarray(source, source + 3), index * 3);
  }
  return output;
}

function denormalize(values, scale) {
  const output = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    output[index] = values[index] * scale;
  }
  return output;
}

function normalizeWithExplicitHeights(sourcePoints, robotPoints, sourceHeight, robotHeight) {
  const sourceScale = Number(sourceHeight);
  const robotScale = Number(robotHeight);
  if (!(sourceScale > 1e-8) || !Number.isFinite(sourceScale) ||
      !(robotScale > 1e-8) || !Number.isFinite(robotScale)) {
    throw new RangeError("Explicit correspondence normalization heights must be positive and finite.");
  }
  const count = sourcePoints.length;
  const normalized = new Float32Array(count * 2);
  for (let index = 0; index < count; index += 1) {
    normalized[index] = Number(sourcePoints[index]) / sourceScale;
    normalized[count + index] = Number(robotPoints[index]) / robotScale;
  }
  return { normalized, sourceHeight: sourceScale, robotHeight: robotScale };
}

function unsignedEdges(edgeIndex) {
  const output = new Uint32Array(edgeIndex.length);
  for (let index = 0; index < output.length; index += 1) {
    const value = Number(edgeIndex[index]);
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError(`Invalid template edge index at ${index}: ${value}.`);
    }
    output[index] = value;
  }
  return output;
}

export function validatedTemplateSortIndex(indices, pointCount) {
  if (indices == null) return null;
  if (indices.length !== pointCount) {
    throw new TypeError(
      `Exact template sort index must contain ${pointCount} entries; got ${indices.length}.`
    );
  }
  const output = new Int32Array(pointCount);
  const seen = new Uint8Array(pointCount);
  for (let index = 0; index < pointCount; index += 1) {
    const value = Number(indices[index]);
    if (!Number.isInteger(value) || value < 0 || value >= pointCount || seen[value]) {
      throw new TypeError(`Exact template sort index is not a permutation at entry ${index}: ${value}.`);
    }
    output[index] = value;
    seen[value] = 1;
  }
  return output;
}

async function loadScalarRuntime() {
  if (!scalarRuntimePromise) {
    scalarRuntimePromise = (async () => {
      const module = await import("../vendor/umr-exact-cpu-wasm-v5/umr_exact_cpu_wasm.js");
      await module.default();
      return {
        module,
        threads: 1,
        simd: true,
        threaded: false,
        denseBackend: "matrixmultiply-wasm-simd"
      };
    })();
  }
  return scalarRuntimePromise;
}

function validatedThreadCount(value) {
  const threadCount = Number(value);
  const reported = Number(globalThis.navigator?.hardwareConcurrency);
  const maximum = Number.isFinite(reported) && reported >= 1 ? Math.floor(reported) : 1;
  if (!Number.isInteger(threadCount) || threadCount < 1 || threadCount > maximum) {
    throw new RangeError(
      `Correspondence training workers must be an integer from 1 to ${maximum}.`
    );
  }
  return threadCount;
}

function cloneTyped(value, Constructor) {
  return value == null ? null : Constructor.from(value);
}

function runThreadedTrainingInWorker(options) {
  const threadCount = validatedThreadCount(options.threadCount);
  if (!globalThis.crossOriginIsolated || typeof SharedArrayBuffer === "undefined") {
    throw new Error(
      "Multi-core WASM requires HTTPS plus cross-origin isolation. Select 1 worker or use an isolated HTTPS page."
    );
  }
  if (typeof Worker === "undefined") {
    throw new Error("This browser does not support Web Workers required for multi-core training.");
  }

  const payload = {
    sourcePoints: cloneTyped(options.sourcePoints, Float32Array),
    sourceVertices: cloneTyped(options.sourceVertices, Float32Array),
    robotPoints: cloneTyped(options.robotPoints, Float32Array),
    robotVertices: cloneTyped(options.robotVertices, Float32Array),
    templateEdgeIndex: cloneTyped(options.templateEdgeIndex, Uint32Array),
    templateSortIndex: cloneTyped(options.templateSortIndex, Int32Array),
    sourceNormalizationHeight: options.sourceNormalizationHeight ?? null,
    robotNormalizationHeight: options.robotNormalizationHeight ?? null,
    threadCount
  };
  const transfer = Object.values(payload)
    .filter((value) => ArrayBuffer.isView(value))
    .map((value) => value.buffer);
  const worker = new Worker(
    new URL("./umr-exact-correspondence-worker-v1.js?v=20260905-studio-epoch60-memory-shadow-v2", import.meta.url),
    { type: "module", name: `umr-correspondence-${threadCount}-worker` }
  );

  return new Promise((resolve, reject) => {
    let settled = false;
    const signal = options.signal;
    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
      worker.terminate();
    };
    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleAbort = () => rejectOnce(makeAbortError());
    if (signal?.aborted) {
      handleAbort();
      return;
    }
    signal?.addEventListener("abort", handleAbort, { once: true });
    worker.addEventListener("message", ({ data }) => {
      if (settled || !data) return;
      if (data.type === "progress") {
        options.onProgress?.(Number(data.fraction), String(data.message || ""));
        return;
      }
      if (data.type === "error") {
        const error = new Error(data.message || "Multi-core correspondence training failed.");
        error.name = data.name || "Error";
        if (data.stack) error.stack = data.stack;
        rejectOnce(error);
        return;
      }
      if (data.type === "result") {
        settled = true;
        cleanup();
        resolve(data.result);
      }
    });
    worker.addEventListener("error", (event) => {
      rejectOnce(new Error(event.message || "Multi-core correspondence Worker failed."));
    });
    worker.postMessage({ type: "train", options: payload }, transfer);
  });
}

export async function trainExactCorrespondenceInProcess({
  sourcePoints,
  sourceVertices,
  robotPoints,
  robotVertices,
  templateEdgeIndex,
  templateSortIndex = null,
  sourceNormalizationHeight = null,
  robotNormalizationHeight = null,
  threadCount = 1,
  trainerRuntime = null,
  signal = null,
  onProgress = () => {}
}) {
  const threads = validatedThreadCount(threadCount);
  throwIfAborted(signal);
  const pointCount = sourcePoints.length / 3;
  if (!Number.isInteger(pointCount) || pointCount !== 4096 ||
      robotPoints.length !== sourcePoints.length) {
    throw new TypeError("Exact UMR training requires matching source/robot point clouds of shape (4096, 3).");
  }
  if (templateEdgeIndex.length !== pointCount * contract.edgeK * 2) {
    throw new TypeError(
      `Exact UMR training requires the geodesic k=${contract.edgeK} graph ` +
      `(${pointCount * contract.edgeK} edges).`
    );
  }

  onProgress(
    0.01,
    threads === 1
      ? "Initializing optimized single-core CPU training…"
      : `Initializing optimized ${threads}-core CPU training…`
  );
  const [resolvedTrainerRuntime, runtime] = await Promise.all([
    trainerRuntime ? Promise.resolve(trainerRuntime) : loadScalarRuntime(),
    loadExactTrainingRuntime((fraction) =>
      onProgress(0.03 * fraction, "Loading exact PointNet initialization…"))
  ]);
  if (Number(resolvedTrainerRuntime.threads) !== threads) {
    throw new Error(
      `Training runtime initialized with ${resolvedTrainerRuntime.threads} cores; expected ${threads}.`
    );
  }
  throwIfAborted(signal);
  if (runtime.manifest.epochs < contract.epochs ||
      runtime.manifest.num_points !== pointCount ||
      runtime.manifest.samples !== 2) {
    throw new Error("Exact training runtime does not match the UMR correspondence contract.");
  }

  const useExplicitHeights = sourceNormalizationHeight !== null || robotNormalizationHeight !== null;
  if (useExplicitHeights && (sourceNormalizationHeight === null || robotNormalizationHeight === null)) {
    throw new TypeError("Both sourceNormalizationHeight and robotNormalizationHeight are required together.");
  }
  const normalized = useExplicitHeights
    ? normalizeWithExplicitHeights(
      sourcePoints,
      robotPoints,
      sourceNormalizationHeight,
      robotNormalizationHeight
    )
    : normalizeCorrespondenceSamples(
      sourcePoints,
      sourceVertices,
      robotPoints,
      robotVertices
    );
  const normalizedSource = normalized.normalized.subarray(0, pointCount * 3);
  // Character is z_y_x while SOMA/SMPL-X are y_z_x. The source pack stores
  // the native permutation, so never silently force Character into SMPL order.
  const sortIndex = validatedTemplateSortIndex(templateSortIndex, pointCount) ||
    templateSortYZx(normalizedSource);
  const template = gatherPoints(normalizedSource, sortIndex);
  const edges = unsignedEdges(templateEdgeIndex);
  throwIfAborted(signal);
  const trainer = new resolvedTrainerRuntime.module.ExactPointNetTrainer(pointCount, template, edges);
  let finalLoss = Infinity;
  let finalTerms = null;
  try {
    for (const [name, tensor] of Object.entries(runtime.state)) {
      trainer.set_tensor(name, tensor.values);
    }
    for (let epoch = 0; epoch < contract.epochs; epoch += 1) {
      throwIfAborted(signal);
      const augmented = applyAugmentationRecipe(normalized.normalized, runtime, epoch);
      const learningRate = cosineAnnealingLearningRate(
        epoch,
        contract.epochs,
        contract.learningRate,
        contract.minimumLearningRate
      );
      const terms = trainer.train_epoch(augmented.inputs, augmented.targets, learningRate);
      finalLoss = Number(terms[0]);
      finalTerms = Float64Array.from(terms);
      if (!Number.isFinite(finalLoss)) {
        throw new Error(`Correspondence loss became non-finite at epoch ${epoch + 1}.`);
      }
      const engine = threads === 1
        ? "optimized single-core CPU WASM"
        : `optimized ${threads}-core CPU WASM`;
      onProgress(
        0.03 + 0.97 * (epoch + 1) / contract.epochs,
        `${engine} · epoch ${epoch + 1}/${contract.epochs} · loss ${finalLoss.toFixed(6)}`
      );
      // A training epoch is synchronous WASM. Yield here so the page can paint
      // the real progress bar and service input between unchanged epochs.
      await new Promise((resolve) => setTimeout(resolve, 0));
      throwIfAborted(signal);
    }
    throwIfAborted(signal);
    const reconstructed = trainer.reconstruct(normalized.normalized);
    throwIfAborted(signal);
    return {
      sourceSlots: denormalize(
        reconstructed.subarray(0, pointCount * 3),
        normalized.sourceHeight
      ),
      robotSlots: denormalize(
        reconstructed.subarray(pointCount * 3),
        normalized.robotHeight
      ),
      normalizedSourcePoints: Float32Array.from(normalizedSource),
      normalizedRobotPoints: Float32Array.from(
        normalized.normalized.subarray(pointCount * 3)
      ),
      normalizationScales: new Float32Array([
        normalized.sourceHeight,
        normalized.robotHeight
      ]),
      templateSortIndex: sortIndex,
      finalLoss,
      finalTerms,
      backend: threads === 1
        ? "wasm-simd-matrixmultiply-exact"
        : "wasm-threads-simd-matrixmultiply-exact",
      threads: resolvedTrainerRuntime.threads,
      simd: resolvedTrainerRuntime.simd
    };
  } finally {
    trainer.free();
  }
}

export async function trainExactCorrespondenceWASM(options) {
  const threadCount = validatedThreadCount(options.threadCount ?? 1);
  if (threadCount === 1) {
    return trainExactCorrespondenceInProcess({ ...options, threadCount });
  }
  return runThreadedTrainingInWorker({ ...options, threadCount });
}

export const exactBrowserTrainingContract = contract;

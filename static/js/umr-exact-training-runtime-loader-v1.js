const RUNTIME_URL = new URL("../assets/browser_runtime/exact_training_v1/", import.meta.url);
// The exported recipe contains a superset of epochs; the active contract uses
// the deterministic prefix selected by umr-exact-training-kernels-v1.js.
const TRAINING_REVISION = "20260905-epoch60-contract-v1";
const TYPES = {
  float32: Float32Array,
  uint16: Uint16Array,
  uint8: Uint8Array
};

async function fetchJSON(url) {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set("rev", TRAINING_REVISION);
  const response = await fetch(requestUrl, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Could not load ${url.pathname} (${response.status}).`);
  return response.json();
}

async function fetchArray(base, spec) {
  const response = await fetch(new URL(spec.path, base), { cache: "force-cache" });
  if (!response.ok) throw new Error(`Could not load ${spec.path} (${response.status}).`);
  let buffer;
  if (spec.encoding === "gzip") {
    if (typeof DecompressionStream !== "function" || !response.body) {
      throw new Error("This browser cannot decompress the exact UMR training runtime.");
    }
    buffer = await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  } else {
    buffer = await response.arrayBuffer();
  }
  const Type = TYPES[spec.dtype];
  if (!Type) throw new Error(`Unsupported exact runtime dtype: ${spec.dtype}.`);
  const values = new Type(buffer);
  const expected = spec.shape.reduce((product, value) => product * Number(value), 1);
  if (values.length !== expected) throw new Error(`${spec.path} has ${values.length} values; expected ${expected}.`);
  return { values, shape: spec.shape.map(Number) };
}

let runtimePromise = null;

export function loadExactTrainingRuntime(onProgress = () => {}) {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const [manifest, orderManifest] = await Promise.all([
        fetchJSON(new URL("manifest.json", RUNTIME_URL)),
        fetchJSON(new URL("order-manifest.json", RUNTIME_URL))
      ]);
      if (manifest.format !== "umr-exact-browser-training-runtime-v1" ||
          orderManifest.format !== "umr-exact-browser-training-order-v1") {
        throw new Error("Exact UMR training runtime manifest version mismatch.");
      }
      const state = {};
      const queue = [];
      for (const [name, spec] of Object.entries(manifest.model.tensors)) {
        queue.push(fetchArray(RUNTIME_URL, spec).then((array) => { state[name] = array; }));
      }
      const augmentation = {};
      for (const [name, spec] of Object.entries(manifest.augmentation)) {
        queue.push(fetchArray(RUNTIME_URL, spec).then((array) => { augmentation[name] = array; }));
      }
      queue.push(fetchArray(RUNTIME_URL, orderManifest.order).then((array) => { augmentation.order = array; }));
      let complete = 0;
      await Promise.all(queue.map((request) => request.then(() => onProgress(++complete / queue.length))));
      return { manifest, state, augmentation };
    })().catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}

export function applyAugmentationRecipe(normalizedSamples, runtime, epoch) {
  const samples = Number(runtime.manifest.samples);
  const points = Number(runtime.manifest.num_points);
  const epochIndex = Number(epoch);
  if (!(normalizedSamples instanceof Float32Array) || normalizedSamples.length !== samples * points * 3) {
    throw new TypeError(`Expected ${samples} normalized point clouds with ${points} points.`);
  }
  if (!Number.isInteger(epochIndex) || epochIndex < 0 || epochIndex >= runtime.manifest.epochs) {
    throw new RangeError(`Training epoch ${epoch} is outside the exported augmentation recipe.`);
  }
  const inputs = new Float32Array(normalizedSamples.length);
  const targets = new Float32Array(normalizedSamples.length);
  const rotation = runtime.augmentation.rotation_2x2.values;
  const noise = runtime.augmentation.noise.values;
  const permutation = runtime.augmentation.permutation.values;
  const order = runtime.augmentation.order.values;
  for (let batchIndex = 0; batchIndex < samples; batchIndex += 1) {
    const sampleId = Number(order[epochIndex * samples + batchIndex]);
    const rotationOffset = (epochIndex * samples + sampleId) * 4;
    const recipePointBase = (epochIndex * samples + sampleId) * points;
    const samplePointBase = sampleId * points;
    for (let outputPoint = 0; outputPoint < points; outputPoint += 1) {
      const sourcePoint = Number(permutation[recipePointBase + outputPoint]);
      const source = (samplePointBase + sourcePoint) * 3;
      const recipeNoise = (recipePointBase + sourcePoint) * 3;
      const output = (batchIndex * points + outputPoint) * 3;
      const x = normalizedSamples[source];
      const y = normalizedSamples[source + 1];
      inputs[output] = rotation[rotationOffset] * x + rotation[rotationOffset + 1] * y + noise[recipeNoise];
      inputs[output + 1] = rotation[rotationOffset + 2] * x + rotation[rotationOffset + 3] * y + noise[recipeNoise + 1];
      inputs[output + 2] = normalizedSamples[source + 2] + noise[recipeNoise + 2];
      const targetSource = (samplePointBase + outputPoint) * 3;
      targets[output] = normalizedSamples[targetSource];
      targets[output + 1] = normalizedSamples[targetSource + 1];
      targets[output + 2] = normalizedSamples[targetSource + 2];
    }
  }
  return { inputs, targets };
}

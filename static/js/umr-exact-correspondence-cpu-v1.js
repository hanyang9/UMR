import { PointNetTemplateResidualAECPU } from "./umr-exact-pointnet-cpu-v2.js";
import {
  TorchAdamW,
  cosineAnnealingLearningRate,
  exactCorrespondenceTrainingContract as contract
} from "./umr-exact-training-kernels-cpu-v7.js";
import {
  applyAugmentationRecipe,
  loadExactTrainingRuntime
} from "./umr-exact-training-runtime-loader-v1.js";

function sampleHeight(meshVertices) {
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < meshVertices.length / 3; index += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = Number(meshVertices[index * 3 + axis]);
      minimum[axis] = Math.min(minimum[axis], value);
      maximum[axis] = Math.max(maximum[axis], value);
    }
  }
  const extents = maximum.map((value, axis) => value - minimum[axis]);
  const maximumExtent = Math.max(...extents);
  const height = extents[1] < 0.6 * maximumExtent ? maximumExtent : extents[1];
  if (!(height > 1e-6) || !Number.isFinite(height)) throw new Error(`Cannot compute point-cloud height: ${height}.`);
  return height;
}

export function normalizeCorrespondenceSamples(sourcePoints, sourceVertices, robotPoints, robotVertices) {
  const count = sourcePoints.length;
  if (robotPoints.length !== count || count % 3) throw new TypeError("Source and robot samples must have matching (N, 3) shapes.");
  const sourceHeight = sampleHeight(sourceVertices);
  const robotHeight = sampleHeight(robotVertices);
  const normalized = new Float32Array(count * 2);
  for (let index = 0; index < count; index += 1) {
    normalized[index] = sourcePoints[index] / sourceHeight;
    normalized[count + index] = robotPoints[index] / robotHeight;
  }
  return { normalized, sourceHeight, robotHeight };
}

export function templateSortYZx(points) {
  if (points.length % 3) throw new TypeError("Template points must contain complete xyz rows.");
  const ids = Array.from({ length: points.length / 3 }, (_, index) => index);
  ids.sort((left, right) =>
    Number(points[left * 3 + 1]) - Number(points[right * 3 + 1]) ||
    Number(points[left * 3 + 2]) - Number(points[right * 3 + 2]) ||
    Number(points[left * 3]) - Number(points[right * 3]) ||
    left - right
  );
  return Int32Array.from(ids);
}

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
  for (let index = 0; index < values.length; index += 1) output[index] = values[index] * scale;
  return output;
}

async function loadTensorflowCPU() {
  if (!globalThis.tf) await import(new URL("../vendor/tfjs/tf.min.js", import.meta.url).href);
  const tf = globalThis.tf;
  if (!tf) throw new Error("TensorFlow.js CPU runtime did not initialize.");
  await tf.setBackend("cpu");
  await tf.ready();
  return tf;
}

export async function trainExactCorrespondenceCPU({
  sourcePoints,
  sourceVertices,
  robotPoints,
  robotVertices,
  templateEdgeIndex,
  onProgress = () => {}
}) {
  const [tf, runtime] = await Promise.all([
    loadTensorflowCPU(),
    loadExactTrainingRuntime((fraction) => onProgress(0.03 * fraction, "Downloading exact training state…"))
  ]);
  if (runtime.manifest.epochs !== contract.epochs || runtime.manifest.num_points !== sourcePoints.length / 3) {
    throw new Error("Exact training runtime does not match the UMR correspondence contract.");
  }
  const normalized = normalizeCorrespondenceSamples(sourcePoints, sourceVertices, robotPoints, robotVertices);
  const pointCount = sourcePoints.length / 3;
  const normalizedSource = normalized.normalized.subarray(0, pointCount * 3);
  const sortIndex = templateSortYZx(normalizedSource);
  const templatePoints = gatherPoints(normalizedSource, sortIndex);
  const model = new PointNetTemplateResidualAECPU(tf, {
    templatePoints,
    state: runtime.state
  });
  const optimizer = new TorchAdamW(tf, model.trainableVariables, { weightDecay: contract.weightDecay });
  const edgeIndex = tf.tensor2d(templateEdgeIndex, [templateEdgeIndex.length / 2, 2], "int32");
  let finalLoss = Infinity;
  try {
    for (let epoch = 0; epoch < contract.epochs; epoch += 1) {
      const augmented = applyAugmentationRecipe(normalized.normalized, runtime, epoch);
      const input = tf.tensor3d(augmented.inputs, [2, pointCount, 3], "float32");
      const target = tf.tensor3d(augmented.targets, [2, pointCount, 3], "float32");
      const loss = model.trainStep({
        input,
        target,
        edgeIndex,
        optimizer,
        learningRate: cosineAnnealingLearningRate(epoch, contract.epochs, contract.learningRate, contract.minimumLearningRate),
        lossOptions: {
          chamferWeight: contract.chamferWeight,
          repulsionWeight: contract.repulsionWeight,
          repulsionK: contract.repulsionK,
          repulsionRadius: contract.repulsionRadius,
          residualWeight: contract.residualWeight,
          edgeWeight: contract.edgeWeight
        }
      });
      finalLoss = Number((await loss.data())[0]);
      loss.dispose();
      input.dispose();
      target.dispose();
      if (!Number.isFinite(finalLoss)) throw new Error(`Correspondence loss became non-finite at epoch ${epoch + 1}.`);
      onProgress(0.03 + 0.97 * (epoch + 1) / contract.epochs, `CPU training · epoch ${epoch + 1}/${contract.epochs} · loss ${finalLoss.toFixed(6)}`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const allSamples = tf.tensor3d(normalized.normalized, [2, pointCount, 3], "float32");
    const output = model.forward(allSamples);
    const reconstructed = new Float32Array(await output.reconstruction.data());
    allSamples.dispose();
    output.reconstruction.dispose();
    output.residual.dispose();
    output.latent.dispose();
    return {
      sourceSlots: denormalize(reconstructed.subarray(0, pointCount * 3), normalized.sourceHeight),
      robotSlots: denormalize(reconstructed.subarray(pointCount * 3), normalized.robotHeight),
      normalizedSourcePoints: Float32Array.from(normalizedSource),
      normalizedRobotPoints: Float32Array.from(normalized.normalized.subarray(pointCount * 3)),
      normalizationScales: new Float32Array([normalized.sourceHeight, normalized.robotHeight]),
      templateSortIndex: sortIndex,
      finalLoss,
      backend: "tfjs-cpu-exact"
    };
  } finally {
    edgeIndex.dispose();
    optimizer.dispose();
    model.dispose();
  }
}


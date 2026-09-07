// Allocation-bounded CPU kernels for the unchanged UMR correspondence losses.
// v8 also supplies a sparse custom derivative for the 131072-edge geodesic
// term, avoiding TensorFlow.js' dense gather-gradient expansion.

import {
  chamferL2CPU,
  pointRepulsionLossCPU
} from "./umr-exact-training-neighbors-cpu-v3.js";

export {
  TorchAdamW,
  cosineAnnealingLearningRate,
  exactCorrespondenceTrainingContract
} from "./umr-exact-training-kernels-v1.js";

export const chamferL2 = chamferL2CPU;
export const pointRepulsionLoss = pointRepulsionLossCPU;

export function residualRegularizationLoss(tf, residual) {
  return residual.square().mean();
}

export function residualEdgeSmoothnessLoss(tf, residual, edgeIndex) {
  if (!edgeIndex || !Number(edgeIndex.shape[0])) return tf.scalar(0, "float32");
  const operation = tf.customGrad((input, save) => {
    const values = input.dataSync();
    const edges = edgeIndex.dataSync();
    const batches = Number(input.shape[0]);
    const points = Number(input.shape[1]);
    const edgeCount = Number(edgeIndex.shape[0]);
    const gradient = new Float32Array(values.length);
    const scale = 2 / (batches * edgeCount);
    let total = 0;
    for (let batch = 0; batch < batches; batch += 1) {
      const batchOffset = batch * points * 3;
      for (let edge = 0; edge < edgeCount; edge += 1) {
        const source = batchOffset + Number(edges[edge * 2]) * 3;
        const target = batchOffset + Number(edges[edge * 2 + 1]) * 3;
        for (let axis = 0; axis < 3; axis += 1) {
          const difference = Number(values[source + axis]) - Number(values[target + axis]);
          total += difference * difference;
          const contribution = scale * difference;
          gradient[source + axis] += contribution;
          gradient[target + axis] -= contribution;
        }
      }
    }
    const gradientTensor = tf.tensor(gradient, input.shape, "float32");
    save([gradientTensor]);
    return {
      value: tf.scalar(total / (batches * edgeCount), "float32"),
      gradFunc: (outputGradient, saved) => saved[0].mul(outputGradient)
    };
  });
  return operation(residual);
}

export function correspondenceLoss(tf, {
  reconstruction,
  target,
  residual,
  edgeIndex,
  chamferWeight = 1,
  repulsionWeight = 0.002,
  repulsionK = 8,
  repulsionRadius = 0.035,
  residualWeight = 0,
  edgeWeight = 0.4
}) {
  const chamfer = chamferL2CPU(tf, reconstruction, target);
  const repulsion = pointRepulsionLossCPU(tf, reconstruction, repulsionK, repulsionRadius);
  const residualRegularization = residualRegularizationLoss(tf, residual);
  const edgeSmoothness = residualEdgeSmoothnessLoss(tf, residual, edgeIndex);
  const total = chamfer.mul(chamferWeight)
    .add(repulsion.mul(repulsionWeight))
    .add(residualRegularization.mul(residualWeight))
    .add(edgeSmoothness.mul(edgeWeight));
  return { total, chamfer, repulsion, residualRegularization, edgeSmoothness };
}

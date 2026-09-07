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
  const sourceIds = edgeIndex.slice([0, 0], [-1, 1]).reshape([-1]);
  const targetIds = edgeIndex.slice([0, 1], [-1, 1]).reshape([-1]);
  return tf.gather(residual, sourceIds, 1)
    .sub(tf.gather(residual, targetIds, 1))
    .square().sum(-1).mean();
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


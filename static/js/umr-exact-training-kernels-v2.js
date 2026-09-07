// Exact correspondence training kernels with a PyTorch-compatible gradient for
// nearest-k repulsion. TensorFlow.js exposes TopK on CPU but does not register a
// gradient for it, so selected value gradients are scattered back explicitly;
// TopK indices remain non-differentiable, as in PyTorch.

export {
  TorchAdamW,
  cosineAnnealingLearningRate,
  exactCorrespondenceTrainingContract
} from "./umr-exact-training-kernels-v1.js";

export function chamferL2(tf, prediction, target) {
  const differences = prediction.expandDims(2).sub(target.expandDims(1));
  const squaredDistances = differences.square().sum(-1);
  return squaredDistances.min(2).mean().add(squaredDistances.min(1).mean());
}

function smallestKWithGradient(tf, squaredDistances, k) {
  const width = Number(squaredDistances.shape[2]);
  const operation = tf.customGrad((distances, save) => {
    const selected = tf.topk(distances.neg(), k);
    save([selected.indices]);
    return {
      value: selected.values.neg(),
      gradFunc: (outputGradient, saved) => tf.tidy(() => {
        const selectedIndices = saved[0];
        return tf.oneHot(selectedIndices, width)
          .mul(outputGradient.expandDims(-1))
          .sum(2);
      })
    };
  });
  return operation(squaredDistances);
}

export function pointRepulsionLoss(tf, points, k = 8, radius = 0.04) {
  const count = Number(points.shape[1]);
  if (count <= 1 || k <= 0 || radius <= 0) return tf.scalar(0, "float32");
  const neighbours = Math.min(Number(k), count - 1);
  const differences = points.expandDims(2).sub(points.expandDims(1));
  const squaredDistances = differences.square().sum(-1);
  const diagonalMask = tf.eye(count).reshape([1, count, count]).mul(1e30);
  const withoutDiagonal = squaredDistances.add(diagonalMask);
  const nearestSquared = smallestKWithGradient(tf, withoutDiagonal, neighbours);
  return nearestSquared.div(-(Number(radius) ** 2)).exp().mean();
}

export function residualRegularizationLoss(tf, residual) {
  return residual.square().mean();
}

export function residualEdgeSmoothnessLoss(tf, residual, edgeIndex) {
  if (!edgeIndex || !Number(edgeIndex.shape[0])) return tf.scalar(0, "float32");
  const sourceIds = edgeIndex.slice([0, 0], [-1, 1]).reshape([-1]);
  const targetIds = edgeIndex.slice([0, 1], [-1, 1]).reshape([-1]);
  const edgeResidual = tf.gather(residual, sourceIds, 1).sub(tf.gather(residual, targetIds, 1));
  return edgeResidual.square().sum(-1).mean();
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
  const chamfer = chamferL2(tf, reconstruction, target);
  const repulsion = pointRepulsionLoss(tf, reconstruction, repulsionK, repulsionRadius);
  const residualRegularization = residualRegularizationLoss(tf, residual);
  const edgeSmoothness = residualEdgeSmoothnessLoss(tf, residual, edgeIndex);
  const total = chamfer.mul(chamferWeight)
    .add(repulsion.mul(repulsionWeight))
    .add(residualRegularization.mul(residualWeight))
    .add(edgeSmoothness.mul(edgeWeight));
  return { total, chamfer, repulsion, residualRegularization, edgeSmoothness };
}


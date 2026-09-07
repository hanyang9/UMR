// TensorFlow.js CPU kernels matching the loss and optimizer equations in
// train_correspondence_template_residual_ae.py. This is not the former
// nearest-neighbour browser approximation.

export function chamferL2(tf, prediction, target) {
  const differences = prediction.expandDims(2).sub(target.expandDims(1));
  const squaredDistances = differences.square().sum(-1);
  return squaredDistances.min(2).mean().add(squaredDistances.min(1).mean());
}

export function pointRepulsionLoss(tf, points, k = 8, radius = 0.04) {
  const count = Number(points.shape[1]);
  if (count <= 1 || k <= 0 || radius <= 0) return tf.scalar(0, "float32");
  const neighbours = Math.min(Number(k), count - 1);
  const differences = points.expandDims(2).sub(points.expandDims(1));
  const squaredDistances = differences.square().sum(-1);
  const diagonalMask = tf.eye(count).reshape([1, count, count]).mul(1e30);
  const withoutDiagonal = squaredDistances.add(diagonalMask);
  const nearestSquared = tf.topk(withoutDiagonal.neg(), neighbours).values.neg();
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

// PyTorch AdamW defaults used by UMR: beta=(0.9, 0.999), eps=1e-8,
// weight_decay=1e-4. State tensors are kept in float32 like model variables.
export class TorchAdamW {
  constructor(tf, variables, {
    beta1 = 0.9,
    beta2 = 0.999,
    epsilon = 1e-8,
    weightDecay = 1e-4
  } = {}) {
    this.tf = tf;
    this.variables = [...variables];
    this.beta1 = Number(beta1);
    this.beta2 = Number(beta2);
    this.epsilon = Number(epsilon);
    this.weightDecay = Number(weightDecay);
    this.step = 0;
    this.firstMoments = new Map();
    this.secondMoments = new Map();
    for (const variable of this.variables) {
      this.firstMoments.set(variable.name, tf.variable(tf.zerosLike(variable), false));
      this.secondMoments.set(variable.name, tf.variable(tf.zerosLike(variable), false));
    }
  }

  applyGradients(gradients, learningRate) {
    const tf = this.tf;
    const lr = Number(learningRate);
    this.step += 1;
    const biasCorrection1 = 1 - this.beta1 ** this.step;
    const biasCorrection2 = 1 - this.beta2 ** this.step;
    for (const variable of this.variables) {
      const gradient = gradients[variable.name];
      if (!gradient) continue;
      tf.tidy(() => {
        const first = this.firstMoments.get(variable.name);
        const second = this.secondMoments.get(variable.name);
        const nextFirst = first.mul(this.beta1).add(gradient.mul(1 - this.beta1));
        const nextSecond = second.mul(this.beta2).add(gradient.square().mul(1 - this.beta2));
        first.assign(nextFirst);
        second.assign(nextSecond);
        const decayed = variable.mul(1 - lr * this.weightDecay);
        const denominator = nextSecond.sqrt().div(Math.sqrt(biasCorrection2)).add(this.epsilon);
        const update = nextFirst.div(denominator).mul(lr / biasCorrection1);
        variable.assign(decayed.sub(update));
      });
    }
  }

  dispose() {
    for (const value of this.firstMoments.values()) value.dispose();
    for (const value of this.secondMoments.values()) value.dispose();
    this.firstMoments.clear();
    this.secondMoments.clear();
  }
}

export function cosineAnnealingLearningRate(epochIndex, epochs, baseLearningRate = 1e-3, minimumLearningRate = 1e-5) {
  return minimumLearningRate +
    (baseLearningRate - minimumLearningRate) * (1 + Math.cos(Math.PI * epochIndex / epochs)) / 2;
}

export const exactCorrespondenceTrainingContract = Object.freeze({
  epochs: 60,
  batchSize: 16,
  fixedTemplate: false,
  templateSort: "y_z_x",
  normalization: "per_sample_height",
  latentDimension: 1024,
  hiddenDimension: 512,
  learningRate: 1e-3,
  scheduler: "cosine",
  minimumLearningRate: 1e-5,
  weightDecay: 1e-4,
  chamferWeight: 1,
  repulsionWeight: 0.002,
  repulsionK: 8,
  repulsionRadius: 0.035,
  residualWeight: 0,
  edgeWeight: 0.4,
  edgeGraph: "geodesic",
  edgeK: 32,
  noiseStandardDeviation: 0.002,
  dropoutRatio: 0,
  seed: 0
});

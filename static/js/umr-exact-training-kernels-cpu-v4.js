// Allocation-bounded CPU implementation of the unchanged Chamfer and
// repulsion equations used by UMR correspondence training.

import { ExactKDTree3 } from "./umr-exact-kdtree3-v1.js";

export {
  TorchAdamW,
  cosineAnnealingLearningRate,
  exactCorrespondenceTrainingContract
} from "./umr-exact-training-kernels-v1.js";

function nearestMaps(predictionValues, predictionShape, targetValues, targetShape) {
  const batches = Number(predictionShape[0]);
  const predictionCount = Number(predictionShape[1]);
  const targetCount = Number(targetShape[1]);
  const predictionToTarget = new Int32Array(batches * predictionCount);
  const targetToPrediction = new Int32Array(batches * targetCount);
  let predictionDistanceSum = 0;
  let targetDistanceSum = 0;
  for (let batch = 0; batch < batches; batch += 1) {
    const predictionOffset = batch * predictionCount * 3;
    const targetOffset = batch * targetCount * 3;
    const predictionTree = new ExactKDTree3(predictionValues, predictionOffset, predictionCount);
    const targetTree = new ExactKDTree3(targetValues, targetOffset, targetCount);
    for (let index = 0; index < predictionCount; index += 1) {
      const offset = predictionOffset + index * 3;
      targetTree.query(predictionValues[offset], predictionValues[offset + 1], predictionValues[offset + 2], 1);
      predictionToTarget[batch * predictionCount + index] = batch * targetCount + targetTree.resultIds[0];
      predictionDistanceSum += targetTree.resultDistances[0];
    }
    for (let index = 0; index < targetCount; index += 1) {
      const offset = targetOffset + index * 3;
      predictionTree.query(targetValues[offset], targetValues[offset + 1], targetValues[offset + 2], 1);
      targetToPrediction[batch * targetCount + index] = batch * predictionCount + predictionTree.resultIds[0];
      targetDistanceSum += predictionTree.resultDistances[0];
    }
  }
  return {
    predictionToTarget,
    targetToPrediction,
    value: predictionDistanceSum / (batches * predictionCount) + targetDistanceSum / (batches * targetCount)
  };
}

export function chamferL2(tf, prediction, target) {
  const operation = tf.customGrad((predictionInput, targetInput, save) => {
    const maps = nearestMaps(
      predictionInput.dataSync(), predictionInput.shape,
      targetInput.dataSync(), targetInput.shape
    );
    const predictionIds = tf.tensor1d(maps.predictionToTarget, "int32");
    const targetIds = tf.tensor1d(maps.targetToPrediction, "int32");
    save([predictionInput, targetInput, predictionIds, targetIds]);
    return {
      value: tf.scalar(maps.value, "float32"),
      gradFunc: (outputGradient, saved) => tf.tidy(() => {
        const [savedPrediction, savedTarget, savedPredictionIds, savedTargetIds] = saved;
        const batches = Number(savedPrediction.shape[0]);
        const predictionCount = Number(savedPrediction.shape[1]);
        const targetCount = Number(savedTarget.shape[1]);
        const flatPrediction = savedPrediction.reshape([batches * predictionCount, 3]);
        const flatTarget = savedTarget.reshape([batches * targetCount, 3]);
        const predictionNearestTarget = tf.gather(flatTarget, savedPredictionIds);
        const targetNearestPrediction = tf.gather(flatPrediction, savedTargetIds);
        const predictionDirect = flatPrediction.sub(predictionNearestTarget).mul(2 / (batches * predictionCount));
        const predictionReverse = tf.unsortedSegmentSum(
          targetNearestPrediction.sub(flatTarget).mul(2 / (batches * targetCount)),
          savedTargetIds,
          batches * predictionCount
        );
        const targetDirect = flatTarget.sub(targetNearestPrediction).mul(2 / (batches * targetCount));
        const targetReverse = tf.unsortedSegmentSum(
          predictionNearestTarget.sub(flatPrediction).mul(2 / (batches * predictionCount)),
          savedPredictionIds,
          batches * targetCount
        );
        return [
          predictionDirect.add(predictionReverse).mul(outputGradient).reshape(savedPrediction.shape),
          targetDirect.add(targetReverse).mul(outputGradient).reshape(savedTarget.shape)
        ];
      })
    };
  });
  return operation(prediction, target);
}

function repulsionMap(values, shape, k, radius) {
  const batches = Number(shape[0]);
  const count = Number(shape[1]);
  const neighbours = Math.min(Number(k), count - 1);
  const ids = new Int32Array(batches * count * neighbours);
  const weights = new Float32Array(ids.length);
  let total = 0;
  for (let batch = 0; batch < batches; batch += 1) {
    const offset = batch * count * 3;
    const tree = new ExactKDTree3(values, offset, count);
    for (let index = 0; index < count; index += 1) {
      const pointOffset = offset + index * 3;
      tree.query(values[pointOffset], values[pointOffset + 1], values[pointOffset + 2], neighbours, index);
      for (let neighbour = 0; neighbour < neighbours; neighbour += 1) {
        const output = (batch * count + index) * neighbours + neighbour;
        ids[output] = batch * count + tree.resultIds[neighbour];
        const weight = Math.exp(-tree.resultDistances[neighbour] / (radius * radius));
        weights[output] = weight;
        total += weight;
      }
    }
  }
  return { ids, weights, value: total / ids.length };
}

export function pointRepulsionLoss(tf, points, k = 8, radius = 0.04) {
  const count = Number(points.shape[1]);
  if (count <= 1 || k <= 0 || radius <= 0) return tf.scalar(0, "float32");
  const operation = tf.customGrad((input, save) => {
    const map = repulsionMap(input.dataSync(), input.shape, k, Number(radius));
    const neighbourIds = tf.tensor1d(map.ids, "int32");
    const pairWeights = tf.tensor1d(map.weights, "float32");
    save([input, neighbourIds, pairWeights]);
    return {
      value: tf.scalar(map.value, "float32"),
      gradFunc: (outputGradient, saved) => tf.tidy(() => {
        const [savedPoints, savedNeighbourIds, savedWeights] = saved;
        const batches = Number(savedPoints.shape[0]);
        const pointCount = Number(savedPoints.shape[1]);
        const neighbours = savedNeighbourIds.size / (batches * pointCount);
        const flat = savedPoints.reshape([batches * pointCount, 3]);
        const sourceIds = tf.range(0, batches * pointCount, 1, "int32")
          .expandDims(1).tile([1, neighbours]).reshape([-1]);
        const source = tf.gather(flat, sourceIds);
        const target = tf.gather(flat, savedNeighbourIds);
        const coefficient = savedWeights
          .mul(-2 / (Number(radius) ** 2 * savedNeighbourIds.size))
          .mul(outputGradient).expandDims(1);
        const pairGradient = source.sub(target).mul(coefficient);
        const sourceGradient = tf.unsortedSegmentSum(pairGradient, sourceIds, batches * pointCount);
        const targetGradient = tf.unsortedSegmentSum(pairGradient.neg(), savedNeighbourIds, batches * pointCount);
        return sourceGradient.add(targetGradient).reshape(savedPoints.shape);
      })
    };
  });
  return operation(points);
}

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


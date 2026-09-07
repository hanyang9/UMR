// CPU-specialized evaluation of the unchanged UMR correspondence losses.
// Exact KD-tree nearest-neighbour queries replace materializing N x N cdist
// tensors; the scalar loss and selected-pair gradients remain the same.

export {
  TorchAdamW,
  cosineAnnealingLearningRate,
  exactCorrespondenceTrainingContract
} from "./umr-exact-training-kernels-v1.js";

function distanceSquared(values, offset, point) {
  const dx = Number(values[offset]) - point[0];
  const dy = Number(values[offset + 1]) - point[1];
  const dz = Number(values[offset + 2]) - point[2];
  return dx * dx + dy * dy + dz * dz;
}

function buildTree(values, baseOffset, ids, depth = 0) {
  if (!ids.length) return null;
  const axis = depth % 3;
  ids.sort((left, right) =>
    Number(values[baseOffset + left * 3 + axis]) - Number(values[baseOffset + right * 3 + axis])
  );
  const middle = ids.length >>> 1;
  return {
    id: ids[middle],
    axis,
    left: buildTree(values, baseOffset, ids.slice(0, middle), depth + 1),
    right: buildTree(values, baseOffset, ids.slice(middle + 1), depth + 1)
  };
}

function queryTree(values, baseOffset, tree, point, count, excludedId = -1) {
  const best = [];
  let worst = Infinity;
  const add = (id, distance) => {
    if (id === excludedId) return;
    if (best.length < count) {
      best.push({ id, distance });
    } else if (distance < worst || (distance === worst && id < best[0].id)) {
      let worstIndex = 0;
      for (let index = 1; index < best.length; index += 1) {
        if (best[index].distance > best[worstIndex].distance ||
            (best[index].distance === best[worstIndex].distance && best[index].id > best[worstIndex].id)) {
          worstIndex = index;
        }
      }
      best[worstIndex] = { id, distance };
    } else {
      return;
    }
    worst = best.length < count ? Infinity : Math.max(...best.map((item) => item.distance));
  };
  const visit = (node) => {
    if (!node) return;
    const delta = point[node.axis] - Number(values[baseOffset + node.id * 3 + node.axis]);
    const near = delta <= 0 ? node.left : node.right;
    const far = delta <= 0 ? node.right : node.left;
    visit(near);
    add(node.id, distanceSquared(values, baseOffset + node.id * 3, point));
    if (delta * delta <= worst) visit(far);
  };
  visit(tree);
  best.sort((left, right) => left.distance - right.distance || left.id - right.id);
  return best;
}

function nearestMaps(predictionValues, predictionShape, targetValues, targetShape) {
  const batches = predictionShape[0];
  const predictionCount = predictionShape[1];
  const targetCount = targetShape[1];
  const predictionToTarget = new Int32Array(batches * predictionCount);
  const targetToPrediction = new Int32Array(batches * targetCount);
  let predictionDistanceSum = 0;
  let targetDistanceSum = 0;
  for (let batch = 0; batch < batches; batch += 1) {
    const predictionOffset = batch * predictionCount * 3;
    const targetOffset = batch * targetCount * 3;
    const predictionTree = buildTree(
      predictionValues,
      predictionOffset,
      Array.from({ length: predictionCount }, (_, index) => index)
    );
    const targetTree = buildTree(
      targetValues,
      targetOffset,
      Array.from({ length: targetCount }, (_, index) => index)
    );
    for (let index = 0; index < predictionCount; index += 1) {
      const point = [
        predictionValues[predictionOffset + index * 3],
        predictionValues[predictionOffset + index * 3 + 1],
        predictionValues[predictionOffset + index * 3 + 2]
      ];
      const nearest = queryTree(targetValues, targetOffset, targetTree, point, 1)[0];
      predictionToTarget[batch * predictionCount + index] = batch * targetCount + nearest.id;
      predictionDistanceSum += nearest.distance;
    }
    for (let index = 0; index < targetCount; index += 1) {
      const point = [
        targetValues[targetOffset + index * 3],
        targetValues[targetOffset + index * 3 + 1],
        targetValues[targetOffset + index * 3 + 2]
      ];
      const nearest = queryTree(predictionValues, predictionOffset, predictionTree, point, 1)[0];
      targetToPrediction[batch * targetCount + index] = batch * predictionCount + nearest.id;
      targetDistanceSum += nearest.distance;
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
        const predictionDirect = flatPrediction.sub(predictionNearestTarget)
          .mul(2 / (batches * predictionCount));
        const predictionReverseValues = targetNearestPrediction.sub(flatTarget)
          .mul(2 / (batches * targetCount));
        const predictionReverse = tf.unsortedSegmentSum(
          predictionReverseValues,
          savedTargetIds,
          batches * predictionCount
        );
        const targetDirect = flatTarget.sub(targetNearestPrediction)
          .mul(2 / (batches * targetCount));
        const targetReverseValues = predictionNearestTarget.sub(flatPrediction)
          .mul(2 / (batches * predictionCount));
        const targetReverse = tf.unsortedSegmentSum(
          targetReverseValues,
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
    const tree = buildTree(values, offset, Array.from({ length: count }, (_, index) => index));
    for (let index = 0; index < count; index += 1) {
      const point = [values[offset + index * 3], values[offset + index * 3 + 1], values[offset + index * 3 + 2]];
      const selected = queryTree(values, offset, tree, point, neighbours, index);
      for (let neighbour = 0; neighbour < neighbours; neighbour += 1) {
        const output = (batch * count + index) * neighbours + neighbour;
        ids[output] = batch * count + selected[neighbour].id;
        const weight = Math.exp(-selected[neighbour].distance / (radius * radius));
        weights[output] = weight;
        total += weight;
      }
    }
  }
  return { ids, weights, neighbours, value: total / ids.length };
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
          .mul(outputGradient)
          .expandDims(1);
        const sourcePairGradient = source.sub(target).mul(coefficient);
        const sourceGradient = tf.unsortedSegmentSum(
          sourcePairGradient,
          sourceIds,
          batches * pointCount
        );
        const targetGradient = tf.unsortedSegmentSum(
          sourcePairGradient.neg(),
          savedNeighbourIds,
          batches * pointCount
        );
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


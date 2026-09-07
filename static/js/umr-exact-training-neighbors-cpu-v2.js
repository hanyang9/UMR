// First-order CPU custom gradients for UMR's unchanged nearest-neighbour
// losses. Gradients are accumulated into typed arrays to avoid TF.js CPU's
// memory-heavy UnsortedSegmentSum implementation.

import { ExactKDTree3 } from "./umr-exact-kdtree3-v2.js";

function addDifference(gradient, leftOffset, rightOffset, valuesLeft, valuesRight, scale) {
  for (let axis = 0; axis < 3; axis += 1) {
    const difference = Number(valuesLeft[leftOffset + axis]) - Number(valuesRight[rightOffset + axis]);
    gradient[leftOffset + axis] += scale * difference;
  }
}

export function chamferL2CPU(tf, prediction, target) {
  const operation = tf.customGrad((predictionInput, targetInput, save) => {
    const predictionValues = predictionInput.dataSync();
    const targetValues = targetInput.dataSync();
    const batches = Number(predictionInput.shape[0]);
    const predictionCount = Number(predictionInput.shape[1]);
    const targetCount = Number(targetInput.shape[1]);
    const predictionGradient = new Float32Array(predictionValues.length);
    const targetGradient = new Float32Array(targetValues.length);
    let predictionDistanceSum = 0;
    let targetDistanceSum = 0;
    const predictionScale = 2 / (batches * predictionCount);
    const targetScale = 2 / (batches * targetCount);
    for (let batch = 0; batch < batches; batch += 1) {
      const predictionBase = batch * predictionCount * 3;
      const targetBase = batch * targetCount * 3;
      const predictionTree = new ExactKDTree3(predictionValues, predictionBase, predictionCount);
      const targetTree = new ExactKDTree3(targetValues, targetBase, targetCount);
      for (let index = 0; index < predictionCount; index += 1) {
        const predictionOffset = predictionBase + index * 3;
        targetTree.query(
          predictionValues[predictionOffset],
          predictionValues[predictionOffset + 1],
          predictionValues[predictionOffset + 2],
          1
        );
        const targetOffset = targetBase + targetTree.resultIds[0] * 3;
        predictionDistanceSum += targetTree.resultDistances[0];
        addDifference(predictionGradient, predictionOffset, targetOffset, predictionValues, targetValues, predictionScale);
        addDifference(targetGradient, targetOffset, predictionOffset, targetValues, predictionValues, predictionScale);
      }
      for (let index = 0; index < targetCount; index += 1) {
        const targetOffset = targetBase + index * 3;
        predictionTree.query(
          targetValues[targetOffset],
          targetValues[targetOffset + 1],
          targetValues[targetOffset + 2],
          1
        );
        const predictionOffset = predictionBase + predictionTree.resultIds[0] * 3;
        targetDistanceSum += predictionTree.resultDistances[0];
        addDifference(targetGradient, targetOffset, predictionOffset, targetValues, predictionValues, targetScale);
        addDifference(predictionGradient, predictionOffset, targetOffset, predictionValues, targetValues, targetScale);
      }
    }
    const predictionGradientTensor = tf.tensor(predictionGradient, predictionInput.shape, "float32");
    const targetGradientTensor = tf.tensor(targetGradient, targetInput.shape, "float32");
    save([predictionGradientTensor, targetGradientTensor]);
    return {
      value: tf.scalar(
        predictionDistanceSum / (batches * predictionCount) +
        targetDistanceSum / (batches * targetCount),
        "float32"
      ),
      gradFunc: (outputGradient, saved) => [
        saved[0].mul(outputGradient),
        saved[1].mul(outputGradient)
      ]
    };
  });
  return operation(prediction, target);
}

export function pointRepulsionLossCPU(tf, points, k = 8, radius = 0.04) {
  const count = Number(points.shape[1]);
  if (count <= 1 || k <= 0 || radius <= 0) return tf.scalar(0, "float32");
  const operation = tf.customGrad((input, save) => {
    const values = input.dataSync();
    const batches = Number(input.shape[0]);
    const pointCount = Number(input.shape[1]);
    const neighbours = Math.min(Number(k), pointCount - 1);
    const gradient = new Float32Array(values.length);
    const radiusSquared = Number(radius) ** 2;
    const gradientScale = -2 / (radiusSquared * batches * pointCount * neighbours);
    let total = 0;
    for (let batch = 0; batch < batches; batch += 1) {
      const base = batch * pointCount * 3;
      const tree = new ExactKDTree3(values, base, pointCount);
      for (let index = 0; index < pointCount; index += 1) {
        const sourceOffset = base + index * 3;
        tree.query(
          values[sourceOffset],
          values[sourceOffset + 1],
          values[sourceOffset + 2],
          neighbours,
          index
        );
        for (let neighbour = 0; neighbour < neighbours; neighbour += 1) {
          const targetOffset = base + tree.resultIds[neighbour] * 3;
          const weight = Math.exp(-tree.resultDistances[neighbour] / radiusSquared);
          total += weight;
          for (let axis = 0; axis < 3; axis += 1) {
            const contribution = gradientScale * weight *
              (Number(values[sourceOffset + axis]) - Number(values[targetOffset + axis]));
            gradient[sourceOffset + axis] += contribution;
            gradient[targetOffset + axis] -= contribution;
          }
        }
      }
    }
    const gradientTensor = tf.tensor(gradient, input.shape, "float32");
    save([gradientTensor]);
    return {
      value: tf.scalar(total / (batches * pointCount * neighbours), "float32"),
      gradFunc: (outputGradient, saved) => saved[0].mul(outputGradient)
    };
  });
  return operation(points);
}


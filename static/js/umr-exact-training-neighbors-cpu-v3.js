// Tight-loop CPU evaluation of UMR's unchanged cdist/min/top-k losses. It
// avoids materializing N x N tensors while retaining the same exhaustive pair
// search, scalar objective, and selected-pair first derivative.

function addPairGradient(gradient, left, right, valuesLeft, valuesRight, scale) {
  for (let axis = 0; axis < 3; axis += 1) {
    gradient[left + axis] += scale * (Number(valuesLeft[left + axis]) - Number(valuesRight[right + axis]));
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
    const predictionNearest = new Int32Array(batches * predictionCount);
    const targetNearest = new Int32Array(batches * targetCount);
    const predictionMinimum = new Float64Array(predictionNearest.length).fill(Infinity);
    const targetMinimum = new Float64Array(targetNearest.length).fill(Infinity);
    for (let batch = 0; batch < batches; batch += 1) {
      const predictionBase = batch * predictionCount * 3;
      const targetBase = batch * targetCount * 3;
      for (let predictionId = 0; predictionId < predictionCount; predictionId += 1) {
        const predictionOffset = predictionBase + predictionId * 3;
        const px = Number(predictionValues[predictionOffset]);
        const py = Number(predictionValues[predictionOffset + 1]);
        const pz = Number(predictionValues[predictionOffset + 2]);
        for (let targetId = 0; targetId < targetCount; targetId += 1) {
          const targetOffset = targetBase + targetId * 3;
          const dx = px - Number(targetValues[targetOffset]);
          const dy = py - Number(targetValues[targetOffset + 1]);
          const dz = pz - Number(targetValues[targetOffset + 2]);
          const distance = dx * dx + dy * dy + dz * dz;
          const predictionMapIndex = batch * predictionCount + predictionId;
          if (distance < predictionMinimum[predictionMapIndex]) {
            predictionMinimum[predictionMapIndex] = distance;
            predictionNearest[predictionMapIndex] = targetId;
          }
          const targetMapIndex = batch * targetCount + targetId;
          if (distance < targetMinimum[targetMapIndex]) {
            targetMinimum[targetMapIndex] = distance;
            targetNearest[targetMapIndex] = predictionId;
          }
        }
      }
    }
    let predictionDistanceSum = 0;
    let targetDistanceSum = 0;
    const predictionScale = 2 / (batches * predictionCount);
    const targetScale = 2 / (batches * targetCount);
    for (let batch = 0; batch < batches; batch += 1) {
      const predictionBase = batch * predictionCount * 3;
      const targetBase = batch * targetCount * 3;
      for (let predictionId = 0; predictionId < predictionCount; predictionId += 1) {
        const mapIndex = batch * predictionCount + predictionId;
        const predictionOffset = predictionBase + predictionId * 3;
        const targetOffset = targetBase + predictionNearest[mapIndex] * 3;
        predictionDistanceSum += predictionMinimum[mapIndex];
        addPairGradient(predictionGradient, predictionOffset, targetOffset, predictionValues, targetValues, predictionScale);
        addPairGradient(targetGradient, targetOffset, predictionOffset, targetValues, predictionValues, predictionScale);
      }
      for (let targetId = 0; targetId < targetCount; targetId += 1) {
        const mapIndex = batch * targetCount + targetId;
        const targetOffset = targetBase + targetId * 3;
        const predictionOffset = predictionBase + targetNearest[mapIndex] * 3;
        targetDistanceSum += targetMinimum[mapIndex];
        addPairGradient(targetGradient, targetOffset, predictionOffset, targetValues, predictionValues, targetScale);
        addPairGradient(predictionGradient, predictionOffset, targetOffset, predictionValues, targetValues, targetScale);
      }
    }
    const predictionGradientTensor = tf.tensor(predictionGradient, predictionInput.shape, "float32");
    const targetGradientTensor = tf.tensor(targetGradient, targetInput.shape, "float32");
    save([predictionGradientTensor, targetGradientTensor]);
    return {
      value: tf.scalar(
        predictionDistanceSum / (batches * predictionCount) + targetDistanceSum / (batches * targetCount),
        "float32"
      ),
      gradFunc: (outputGradient, saved) => [saved[0].mul(outputGradient), saved[1].mul(outputGradient)]
    };
  });
  return operation(prediction, target);
}

function updateTopK(distances, ids, base, k, candidateId, distance) {
  let empty = -1;
  let worst = 0;
  for (let index = 0; index < k; index += 1) {
    const current = distances[base + index];
    if (current === Infinity) {
      empty = index;
      break;
    }
    if (current > distances[base + worst] ||
        (current === distances[base + worst] && ids[base + index] > ids[base + worst])) {
      worst = index;
    }
  }
  const slot = empty >= 0 ? empty : worst;
  if (empty >= 0 || distance < distances[base + worst] ||
      (distance === distances[base + worst] && candidateId < ids[base + worst])) {
    distances[base + slot] = distance;
    ids[base + slot] = candidateId;
  }
}

export function pointRepulsionLossCPU(tf, points, k = 8, radius = 0.04) {
  const count = Number(points.shape[1]);
  if (count <= 1 || k <= 0 || radius <= 0) return tf.scalar(0, "float32");
  const operation = tf.customGrad((input, save) => {
    const values = input.dataSync();
    const batches = Number(input.shape[0]);
    const pointCount = Number(input.shape[1]);
    const neighbours = Math.min(Number(k), pointCount - 1);
    const neighbourIds = new Int32Array(batches * pointCount * neighbours).fill(-1);
    const neighbourDistances = new Float64Array(neighbourIds.length).fill(Infinity);
    for (let batch = 0; batch < batches; batch += 1) {
      const pointBase = batch * pointCount * 3;
      const mapBase = batch * pointCount * neighbours;
      for (let left = 0; left < pointCount; left += 1) {
        const leftOffset = pointBase + left * 3;
        const lx = Number(values[leftOffset]);
        const ly = Number(values[leftOffset + 1]);
        const lz = Number(values[leftOffset + 2]);
        for (let right = left + 1; right < pointCount; right += 1) {
          const rightOffset = pointBase + right * 3;
          const dx = lx - Number(values[rightOffset]);
          const dy = ly - Number(values[rightOffset + 1]);
          const dz = lz - Number(values[rightOffset + 2]);
          const distance = dx * dx + dy * dy + dz * dz;
          updateTopK(neighbourDistances, neighbourIds, mapBase + left * neighbours, neighbours, right, distance);
          updateTopK(neighbourDistances, neighbourIds, mapBase + right * neighbours, neighbours, left, distance);
        }
      }
    }
    const gradient = new Float32Array(values.length);
    const radiusSquared = Number(radius) ** 2;
    const gradientScale = -2 / (radiusSquared * batches * pointCount * neighbours);
    let total = 0;
    for (let batch = 0; batch < batches; batch += 1) {
      const pointBase = batch * pointCount * 3;
      const mapBase = batch * pointCount * neighbours;
      for (let sourceId = 0; sourceId < pointCount; sourceId += 1) {
        const sourceOffset = pointBase + sourceId * 3;
        const neighbourBase = mapBase + sourceId * neighbours;
        for (let neighbour = 0; neighbour < neighbours; neighbour += 1) {
          const targetOffset = pointBase + neighbourIds[neighbourBase + neighbour] * 3;
          const weight = Math.exp(-neighbourDistances[neighbourBase + neighbour] / radiusSquared);
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


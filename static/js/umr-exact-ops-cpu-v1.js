// Allocation-bounded CPU operations for the fixed UMR correspondence model.
// These operations preserve the model equations; they only avoid dispatching
// a batch-of-two decoder layer through generic TFJS matrix kernels.

export function linearBatchTwoCPU(tf, input, kernel, bias) {
  if (input.rank !== 2 || kernel.rank !== 2 || bias.rank !== 1) {
    throw new TypeError("linearBatchTwoCPU expects rank-2 input/kernel and rank-1 bias.");
  }
  const batches = Number(input.shape[0]);
  const inputSize = Number(input.shape[1]);
  const outputSize = Number(kernel.shape[1]);
  if (batches !== 2 || Number(kernel.shape[0]) !== inputSize || Number(bias.shape[0]) !== outputSize) {
    throw new TypeError("linearBatchTwoCPU shape mismatch.");
  }

  const operation = tf.customGrad((inputTensor, kernelTensor, biasTensor) => {
    const inputValues = Float32Array.from(inputTensor.dataSync());
    const kernelValues = Float32Array.from(kernelTensor.dataSync());
    const biasValues = Float32Array.from(biasTensor.dataSync());
    const output = new Float32Array(batches * outputSize);
    output.set(biasValues, 0);
    output.set(biasValues, outputSize);
    for (let channel = 0; channel < inputSize; channel += 1) {
      const weightBase = channel * outputSize;
      const scale0 = Number(inputValues[channel]);
      const scale1 = Number(inputValues[inputSize + channel]);
      for (let outputId = 0; outputId < outputSize; outputId += 1) {
        const weight = Number(kernelValues[weightBase + outputId]);
        output[outputId] += scale0 * weight;
        output[outputSize + outputId] += scale1 * weight;
      }
    }
    return {
      value: tf.tensor2d(output, [batches, outputSize], "float32"),
      gradFunc: (dy) => {
        const outputGradient = dy.dataSync();
        const inputGradient = new Float32Array(batches * inputSize);
        const kernelGradient = new Float32Array(inputSize * outputSize);
        const biasGradient = new Float32Array(outputSize);
        for (let outputId = 0; outputId < outputSize; outputId += 1) {
          biasGradient[outputId] = Number(outputGradient[outputId]) +
            Number(outputGradient[outputSize + outputId]);
        }
        for (let channel = 0; channel < inputSize; channel += 1) {
          const weightBase = channel * outputSize;
          const input0 = Number(inputValues[channel]);
          const input1 = Number(inputValues[inputSize + channel]);
          let inputGradient0 = 0;
          let inputGradient1 = 0;
          for (let outputId = 0; outputId < outputSize; outputId += 1) {
            const gradient0 = Number(outputGradient[outputId]);
            const gradient1 = Number(outputGradient[outputSize + outputId]);
            const weight = Number(kernelValues[weightBase + outputId]);
            kernelGradient[weightBase + outputId] = input0 * gradient0 + input1 * gradient1;
            inputGradient0 += weight * gradient0;
            inputGradient1 += weight * gradient1;
          }
          inputGradient[channel] = inputGradient0;
          inputGradient[inputSize + channel] = inputGradient1;
        }
        return [
          tf.tensor2d(inputGradient, [batches, inputSize], "float32"),
          tf.tensor2d(kernelGradient, [inputSize, outputSize], "float32"),
          tf.tensor1d(biasGradient, "float32")
        ];
      }
    };
  });
  return operation(input, kernel, bias);
}

export class FusedTorchAdamWCPU {
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
      this.firstMoments.set(variable.name, new Float32Array(variable.size));
      this.secondMoments.set(variable.name, new Float32Array(variable.size));
    }
  }

  applyGradients(gradients, learningRate) {
    const tf = this.tf;
    const lr = Number(learningRate);
    this.step += 1;
    const beta1 = this.beta1;
    const beta2 = this.beta2;
    const oneMinusBeta1 = 1 - beta1;
    const oneMinusBeta2 = 1 - beta2;
    const decay = 1 - lr * this.weightDecay;
    const biasCorrection1 = 1 - beta1 ** this.step;
    const biasCorrection2 = 1 - beta2 ** this.step;
    const updateScale = lr / biasCorrection1;
    for (const variable of this.variables) {
      const gradient = gradients[variable.name];
      if (!gradient) continue;
      const source = variable.dataSync();
      const gradientValues = gradient.dataSync();
      const first = this.firstMoments.get(variable.name);
      const second = this.secondMoments.get(variable.name);
      const next = new Float32Array(source.length);
      for (let index = 0; index < source.length; index += 1) {
        const value = Number(gradientValues[index]);
        const nextFirst = beta1 * Number(first[index]) + oneMinusBeta1 * value;
        const nextSecond = beta2 * Number(second[index]) + oneMinusBeta2 * value * value;
        first[index] = nextFirst;
        second[index] = nextSecond;
        next[index] = Number(source[index]) * decay -
          updateScale * nextFirst / (Math.sqrt(nextSecond / biasCorrection2) + this.epsilon);
      }
      tf.tidy(() => variable.assign(tf.tensor(next, variable.shape, "float32")));
    }
  }

  dispose() {
    this.firstMoments.clear();
    this.secondMoments.clear();
  }
}

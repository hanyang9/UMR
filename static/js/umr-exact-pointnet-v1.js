// PointNetTemplateResidualAE port for browser CPU execution. Weight tensors are
// loaded from a PyTorch state export so initialization and parameter layout are
// not substituted by TensorFlow.js defaults.

import {
  correspondenceLoss,
  exactCorrespondenceTrainingContract
} from "./umr-exact-training-kernels-v2.js";

function requireTensorState(state, name, expectedLength) {
  const entry = state[name];
  if (!entry || !entry.values) throw new Error(`Missing exported PyTorch tensor: ${name}`);
  if (entry.values.length !== expectedLength) {
    throw new Error(`${name} has ${entry.values.length} values; expected ${expectedLength}.`);
  }
  return entry.values;
}

function tensorFromTorch(tf, state, name, torchShape, permutation = null) {
  const length = torchShape.reduce((result, value) => result * value, 1);
  let tensor = tf.tensor(requireTensorState(state, name, length), torchShape, "float32");
  if (permutation) {
    const transposed = tensor.transpose(permutation);
    tensor.dispose();
    tensor = transposed;
  }
  return tensor;
}

function createTrainable(tf, tensor, name) {
  const variable = tf.variable(tensor, true, name.replaceAll(".", "__"));
  tensor.dispose();
  return variable;
}

function createStateVariable(tf, state, name, length) {
  const tensor = tf.tensor1d(requireTensorState(state, name, length), "float32");
  const variable = tf.variable(tensor, false, name.replaceAll(".", "__"));
  tensor.dispose();
  return variable;
}

export class PointNetTemplateResidualAE {
  constructor(tf, {
    templatePoints,
    state,
    encoderChannels = [64, 128, 512, 1024],
    hiddenDimension = 512,
    batchNormMomentum = 0.1,
    batchNormEpsilon = 1e-5
  }) {
    this.tf = tf;
    this.numPoints = Number(templatePoints.length / 3);
    this.templatePoints = tf.tensor2d(templatePoints, [this.numPoints, 3], "float32");
    this.batchNormMomentum = Number(batchNormMomentum);
    this.batchNormEpsilon = Number(batchNormEpsilon);
    this.trainableVariables = [];
    this.ownedVariables = [];
    this.encoder = [];
    let inputChannels = 3;
    for (let layer = 0; layer < encoderChannels.length; layer += 1) {
      const outputChannels = Number(encoderChannels[layer]);
      const torchIndex = layer === 0 ? 0 : layer === 1 ? 3 : layer === 2 ? 6 : 9;
      const kernel = createTrainable(
        tf,
        tensorFromTorch(tf, state, `encoder.${torchIndex}.weight`, [outputChannels, inputChannels, 1], [2, 1, 0]),
        `encoder.${torchIndex}.weight`
      );
      const biasTensor = tf.tensor1d(
        requireTensorState(state, `encoder.${torchIndex}.bias`, outputChannels),
        "float32"
      );
      const bias = createTrainable(tf, biasTensor, `encoder.${torchIndex}.bias`);
      const record = { kernel, bias, relu: layer < encoderChannels.length - 1 };
      this.trainableVariables.push(kernel, bias);
      this.ownedVariables.push(kernel, bias);
      if (record.relu) {
        const batchNormIndex = torchIndex + 1;
        record.gamma = createTrainable(
          tf,
          tf.tensor1d(requireTensorState(state, `encoder.${batchNormIndex}.weight`, outputChannels), "float32"),
          `encoder.${batchNormIndex}.weight`
        );
        record.beta = createTrainable(
          tf,
          tf.tensor1d(requireTensorState(state, `encoder.${batchNormIndex}.bias`, outputChannels), "float32"),
          `encoder.${batchNormIndex}.bias`
        );
        record.runningMean = createStateVariable(tf, state, `encoder.${batchNormIndex}.running_mean`, outputChannels);
        record.runningVariance = createStateVariable(tf, state, `encoder.${batchNormIndex}.running_var`, outputChannels);
        this.trainableVariables.push(record.gamma, record.beta);
        this.ownedVariables.push(record.gamma, record.beta, record.runningMean, record.runningVariance);
      }
      this.encoder.push(record);
      inputChannels = outputChannels;
    }

    const latentDimension = Number(encoderChannels[encoderChannels.length - 1]);
    const decoderShapes = [
      [latentDimension, hiddenDimension],
      [hiddenDimension, hiddenDimension],
      [hiddenDimension, this.numPoints * 3]
    ];
    const decoderIndices = [0, 2, 4];
    this.decoder = decoderShapes.map(([input, output], layer) => {
      const index = decoderIndices[layer];
      const kernel = createTrainable(
        tf,
        tensorFromTorch(tf, state, `decoder.${index}.weight`, [output, input], [1, 0]),
        `decoder.${index}.weight`
      );
      const bias = createTrainable(
        tf,
        tf.tensor1d(requireTensorState(state, `decoder.${index}.bias`, output), "float32"),
        `decoder.${index}.bias`
      );
      this.trainableVariables.push(kernel, bias);
      this.ownedVariables.push(kernel, bias);
      return { kernel, bias, relu: layer < decoderShapes.length - 1 };
    });
  }

  batchNorm(values, layer, training, statistics) {
    const tf = this.tf;
    if (!training) {
      return tf.batchNorm(
        values,
        layer.runningMean,
        layer.runningVariance,
        layer.beta,
        layer.gamma,
        this.batchNormEpsilon
      );
    }
    const moments = tf.moments(values, [0, 1]);
    statistics.push({
      mean: tf.keep(moments.mean),
      variance: tf.keep(moments.variance),
      sampleCount: Number(values.shape[0] * values.shape[1]),
      runningMean: layer.runningMean,
      runningVariance: layer.runningVariance
    });
    return tf.batchNorm(
      values,
      moments.mean,
      moments.variance,
      layer.beta,
      layer.gamma,
      this.batchNormEpsilon
    );
  }

  forward(points, { training = false, batchStatistics = [] } = {}) {
    const tf = this.tf;
    let activation = points;
    for (const layer of this.encoder) {
      activation = tf.conv1d(activation, layer.kernel, 1, "valid").add(layer.bias);
      if (layer.relu) activation = this.batchNorm(activation, layer, training, batchStatistics).relu();
    }
    const latent = activation.max(1);
    activation = latent;
    for (const layer of this.decoder) {
      activation = activation.matMul(layer.kernel).add(layer.bias);
      if (layer.relu) activation = activation.relu();
    }
    const residual = activation.reshape([points.shape[0], this.numPoints, 3]);
    const reconstruction = residual.add(this.templatePoints.expandDims(0));
    return { reconstruction, residual, latent };
  }

  updateBatchNormState(statistics) {
    const tf = this.tf;
    for (const item of statistics) {
      tf.tidy(() => {
        const momentum = this.batchNormMomentum;
        item.runningMean.assign(item.runningMean.mul(1 - momentum).add(item.mean.mul(momentum)));
        const correction = item.sampleCount > 1 ? item.sampleCount / (item.sampleCount - 1) : 1;
        const unbiasedVariance = item.variance.mul(correction);
        item.runningVariance.assign(
          item.runningVariance.mul(1 - momentum).add(unbiasedVariance.mul(momentum))
        );
      });
      item.mean.dispose();
      item.variance.dispose();
    }
  }

  trainStep({ input, target, edgeIndex, optimizer, learningRate, lossOptions = {} }) {
    const tf = this.tf;
    const batchStatistics = [];
    const result = tf.variableGrads(() => {
      const output = this.forward(input, { training: true, batchStatistics });
      return correspondenceLoss(tf, {
        reconstruction: output.reconstruction,
        target,
        residual: output.residual,
        edgeIndex,
        ...lossOptions
      }).total;
    }, this.trainableVariables);
    optimizer.applyGradients(result.grads, learningRate);
    this.updateBatchNormState(batchStatistics);
    Object.values(result.grads).forEach((gradient) => gradient.dispose());
    return result.value;
  }

  dispose() {
    this.templatePoints.dispose();
    for (const variable of this.ownedVariables) variable.dispose();
    this.ownedVariables.length = 0;
    this.trainableVariables.length = 0;
  }
}

export const exactPointNetArchitecture = Object.freeze({
  encoderChannels: [64, 128, 512, exactCorrespondenceTrainingContract.latentDimension],
  hiddenDimension: exactCorrespondenceTrainingContract.hiddenDimension,
  batchNormMomentum: 0.1,
  batchNormEpsilon: 1e-5,
  zeroInitializeFinalResidual: true
});


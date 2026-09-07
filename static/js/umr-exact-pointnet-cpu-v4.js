import { PointNetTemplateResidualAE as BasePointNetTemplateResidualAE } from "./umr-exact-pointnet-v1.js";
import { correspondenceLoss } from "./umr-exact-training-kernels-cpu-v8.js";

// Every encoder convolution in the original PointNet has kernel size 1.
// Evaluating it as a flattened matrix multiplication is algebraically the
// same operation while avoiding TFJS CPU's general Conv1D dispatch/backprop.
export class PointNetTemplateResidualAECPU extends BasePointNetTemplateResidualAE {
  forward(points, { training = false, batchStatistics = [] } = {}) {
    const tf = this.tf;
    return tf.tidy(() => {
      let activation = points;
      for (const layer of this.encoder) {
        const inputChannels = Number(activation.shape[2]);
        const outputChannels = Number(layer.bias.shape[0]);
        activation = activation.reshape([-1, inputChannels])
          .matMul(layer.kernel.reshape([inputChannels, outputChannels]))
          .reshape([points.shape[0], points.shape[1], outputChannels])
          .add(layer.bias);
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
    });
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
}

export { exactPointNetArchitecture } from "./umr-exact-pointnet-v1.js";

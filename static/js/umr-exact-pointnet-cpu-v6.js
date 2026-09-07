import { PointNetTemplateResidualAE as BasePointNetTemplateResidualAE } from "./umr-exact-pointnet-v1.js";
import { correspondenceLoss } from "./umr-exact-training-kernels-cpu-v9.js";
import { linearBatchTwoCPU } from "./umr-exact-ops-cpu-v1.js";

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
      for (let index = 0; index < this.decoder.length; index += 1) {
        const layer = this.decoder[index];
        activation = index === this.decoder.length - 1
          ? linearBatchTwoCPU(tf, activation, layer.kernel, layer.bias)
          : activation.matMul(layer.kernel).add(layer.bias);
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

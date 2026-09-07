import { PointNetTemplateResidualAE as BasePointNetTemplateResidualAE } from "./umr-exact-pointnet-v1.js";
import { correspondenceLoss } from "./umr-exact-training-kernels-cpu-v8.js";

// Production CPU model. The network, BN state and optimizer remain identical
// to PyTorch; only the loss derivatives use allocation-bounded sparse kernels.
export class PointNetTemplateResidualAECPU extends BasePointNetTemplateResidualAE {
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

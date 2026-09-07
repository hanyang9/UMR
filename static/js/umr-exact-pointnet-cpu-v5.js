import { PointNetTemplateResidualAECPU as MatrixPointNet } from "./umr-exact-pointnet-cpu-v4.js";
import { correspondenceLoss } from "./umr-exact-training-kernels-cpu-v9.js";

export class PointNetTemplateResidualAECPU extends MatrixPointNet {
  trainStep({ input, target, edgeIndex, optimizer, learningRate, lossOptions = {} }) {
    const tf = this.tf;
    const batchStatistics = [];
    const result = tf.variableGrads(() => {
      const output = this.forward(input, { training: true, batchStatistics });
      return correspondenceLoss(tf, { reconstruction: output.reconstruction, target,
        residual: output.residual, edgeIndex, ...lossOptions }).total;
    }, this.trainableVariables);
    optimizer.applyGradients(result.grads, learningRate);
    this.updateBatchNormState(batchStatistics);
    Object.values(result.grads).forEach((gradient) => gradient.dispose());
    return result.value;
  }
}

export { exactPointNetArchitecture } from "./umr-exact-pointnet-v1.js";

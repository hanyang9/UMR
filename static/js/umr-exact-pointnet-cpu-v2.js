import { PointNetTemplateResidualAE as BasePointNetTemplateResidualAE } from "./umr-exact-pointnet-v1.js";
import { correspondenceLoss } from "./umr-exact-training-kernels-cpu-v7.js";

// CPU production variant: identical PointNet/BatchNorm/decoder state, with the
// allocation-bounded exhaustive Chamfer/repulsion kernels used by trainStep.
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


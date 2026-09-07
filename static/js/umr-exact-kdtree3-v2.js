import { ExactKDTree3 as BaseExactKDTree3 } from "./umr-exact-kdtree3-v1.js";

// The traversal stores a node/far-child pair for every active level, so the
// workspace needs two integer slots per tree node in the conservative bound.
export class ExactKDTree3 extends BaseExactKDTree3 {
  constructor(values, pointOffset, count) {
    super(values, pointOffset, count);
    this.stack = new Int32Array(Math.max(4, Number(count) * 2));
  }
}


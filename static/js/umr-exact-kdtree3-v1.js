// Allocation-bounded exact 3D KD tree for the CPU correspondence kernels.

export class ExactKDTree3 {
  constructor(values, pointOffset, count) {
    this.values = values;
    this.pointOffset = Number(pointOffset);
    this.count = Number(count);
    this.pointIds = new Int32Array(this.count);
    this.axes = new Uint8Array(this.count);
    this.left = new Int32Array(this.count).fill(-1);
    this.right = new Int32Array(this.count).fill(-1);
    this.stack = new Int32Array(this.count);
    this.resultIds = new Int32Array(1);
    this.resultDistances = new Float64Array(1);
    this.resultSize = 0;
    let nextNode = 0;
    const build = (ids, depth) => {
      if (!ids.length) return -1;
      const axis = depth % 3;
      ids.sort((a, b) => Number(values[this.pointOffset + a * 3 + axis]) - Number(values[this.pointOffset + b * 3 + axis]));
      const middle = ids.length >>> 1;
      const node = nextNode++;
      this.pointIds[node] = ids[middle];
      this.axes[node] = axis;
      this.left[node] = build(ids.slice(0, middle), depth + 1);
      this.right[node] = build(ids.slice(middle + 1), depth + 1);
      return node;
    };
    this.root = build(Array.from({ length: this.count }, (_, index) => index), 0);
  }

  ensureResultCapacity(k) {
    if (this.resultIds.length >= k) return;
    this.resultIds = new Int32Array(k);
    this.resultDistances = new Float64Array(k);
  }

  query(x, y, z, k = 1, excludedId = -1) {
    const requested = Math.min(Math.max(1, Number(k)), this.count - (excludedId >= 0 ? 1 : 0));
    this.ensureResultCapacity(requested);
    let resultSize = 0;
    let worstIndex = 0;
    let worstDistance = Infinity;
    let stackSize = 0;
    let node = this.root;
    const query = [Number(x), Number(y), Number(z)];
    while (node >= 0 || stackSize) {
      while (node >= 0) {
        const axis = this.axes[node];
        const pointId = this.pointIds[node];
        const delta = query[axis] - Number(this.values[this.pointOffset + pointId * 3 + axis]);
        const near = delta <= 0 ? this.left[node] : this.right[node];
        const far = delta <= 0 ? this.right[node] : this.left[node];
        // Encode node and far child; revisit after the near branch.
        this.stack[stackSize++] = node;
        this.stack[stackSize++] = far;
        node = near;
      }
      const far = this.stack[--stackSize];
      const current = this.stack[--stackSize];
      const pointId = this.pointIds[current];
      const axis = this.axes[current];
      const offset = this.pointOffset + pointId * 3;
      const dx = Number(this.values[offset]) - query[0];
      const dy = Number(this.values[offset + 1]) - query[1];
      const dz = Number(this.values[offset + 2]) - query[2];
      const distance = dx * dx + dy * dy + dz * dz;
      if (pointId !== excludedId) {
        if (resultSize < requested) {
          this.resultIds[resultSize] = pointId;
          this.resultDistances[resultSize] = distance;
          resultSize += 1;
        } else if (distance < worstDistance ||
                   (distance === worstDistance && pointId < this.resultIds[worstIndex])) {
          this.resultIds[worstIndex] = pointId;
          this.resultDistances[worstIndex] = distance;
        }
        worstIndex = 0;
        worstDistance = resultSize < requested ? Infinity : this.resultDistances[0];
        for (let index = 1; index < resultSize; index += 1) {
          if (this.resultDistances[index] > worstDistance ||
              (this.resultDistances[index] === worstDistance && this.resultIds[index] > this.resultIds[worstIndex])) {
            worstIndex = index;
            worstDistance = this.resultDistances[index];
          }
        }
      }
      const splitDelta = query[axis] - Number(this.values[offset + axis]);
      node = splitDelta * splitDelta <= worstDistance ? far : -1;
    }
    // Stable ascending distance/id order, matching the selected top-k set.
    for (let left = 1; left < resultSize; left += 1) {
      const id = this.resultIds[left];
      const distance = this.resultDistances[left];
      let right = left - 1;
      while (right >= 0 && (this.resultDistances[right] > distance ||
             (this.resultDistances[right] === distance && this.resultIds[right] > id))) {
        this.resultIds[right + 1] = this.resultIds[right];
        this.resultDistances[right + 1] = this.resultDistances[right];
        right -= 1;
      }
      this.resultIds[right + 1] = id;
      this.resultDistances[right + 1] = distance;
    }
    this.resultSize = resultSize;
    return resultSize;
  }
}


// NumPy-compatible PCG64 primitives used by the exact browser port.
//
// UMR currently samples the uploaded robot with dataset seed + 9000.  The
// states below are the public PCG64 states produced by NumPy's
// `np.random.PCG64(seed)` for the two seeds used by the fixed Studio pipeline.
// Keeping this intentionally narrow prevents an unsupported seed from silently
// producing a different point cloud.

const MASK_64 = (1n << 64n) - 1n;
const MASK_128 = (1n << 128n) - 1n;
const MULTIPLIER = 47026247687942121848144207491837523525n;
const TWO_POW_53 = 9007199254740992;

const SEEDED_STATES = new Map([
  [0, {
    state: 35399562948360463058890781895381311971n,
    increment: 87136372517582989555478159403783844777n
  }],
  [9000, {
    state: 33220003690008660558826652711261771479n,
    increment: 273693408026790334520942567954209499589n
  }]
]);

function rotateRight64(value, amount) {
  const rotation = Number(amount & 63n);
  if (rotation === 0) return value & MASK_64;
  return ((value >> BigInt(rotation)) | (value << BigInt(64 - rotation))) & MASK_64;
}

export class NumpyPCG64 {
  constructor(seed) {
    const seeded = SEEDED_STATES.get(Number(seed));
    if (!seeded) {
      throw new RangeError(
        `The exact UMR browser sampler has no verified NumPy PCG64 state for seed ${seed}.`
      );
    }
    this.state = seeded.state;
    this.increment = seeded.increment;
    this.cachedUint32 = 0;
    this.hasCachedUint32 = false;
  }

  nextUint64() {
    // NumPy's PCG64 advances before returning XSL-RR output for the new state.
    this.state = (this.state * MULTIPLIER + this.increment) & MASK_128;
    const mixed = ((this.state >> 64n) ^ this.state) & MASK_64;
    return rotateRight64(mixed, this.state >> 122n);
  }

  nextUint32() {
    if (this.hasCachedUint32) {
      this.hasCachedUint32 = false;
      return this.cachedUint32;
    }
    const value = this.nextUint64();
    this.cachedUint32 = Number((value >> 32n) & 0xffffffffn);
    this.hasCachedUint32 = true;
    return Number(value & 0xffffffffn);
  }

  random() {
    return Number(this.nextUint64() >> 11n) / TWO_POW_53;
  }

  integers(high) {
    const bound = Number(high);
    if (!Number.isSafeInteger(bound) || bound <= 0 || bound > 0xffffffff) {
      throw new RangeError(`PCG64 integer bound must be in [1, 2^32-1], got ${high}.`);
    }
    const range = BigInt(bound);
    const threshold = (1n << 32n) % range;
    while (true) {
      const product = BigInt(this.nextUint32()) * range;
      if ((product & 0xffffffffn) >= threshold) return Number(product >> 32n);
    }
  }

  boundedUint64Inclusive(maximum) {
    const maximumValue = BigInt(maximum);
    if (maximumValue < 0n || maximumValue > MASK_64) {
      throw new RangeError(`PCG64 inclusive bound must be in [0, 2^64-1], got ${maximum}.`);
    }
    if (maximumValue <= 0xffffffffn) {
      const range32 = maximumValue + 1n;
      const threshold32 = ((1n << 32n) - range32) % range32;
      while (true) {
        const product32 = BigInt(this.nextUint32()) * range32;
        if ((product32 & 0xffffffffn) >= threshold32) return Number(product32 >> 32n);
      }
    }
    const range = maximumValue + 1n;
    const threshold = ((1n << 64n) - range) % range;
    while (true) {
      const product = this.nextUint64() * range;
      if ((product & MASK_64) >= threshold) return Number(product >> 64n);
    }
  }
}

// Port of Generator.choice(population, size, replace=False) for the small
// unweighted body-part samples used by UMR. NumPy uses Floyd's algorithm and
// then shuffles the selected indices when population <= 10,000.
export function choiceWithoutReplacement(population, count, rng) {
  const size = Number(population);
  const requested = Number(count);
  if (!Number.isSafeInteger(size) || !Number.isSafeInteger(requested) ||
      size < 0 || requested < 0 || requested > size) {
    throw new RangeError(`Invalid no-replacement choice population=${population} count=${count}.`);
  }
  const output = new Int32Array(requested);
  const selected = new Set();
  for (let offset = 0; offset < requested; offset += 1) {
    const upper = size - requested + offset;
    let value = rng.boundedUint64Inclusive(upper);
    if (selected.has(value)) value = upper;
    selected.add(value);
    output[offset] = value;
  }
  for (let index = requested - 1; index > 0; index -= 1) {
    const other = rng.boundedUint64Inclusive(index);
    const temporary = output[index];
    output[index] = output[other];
    output[other] = temporary;
  }
  return output;
}

export function weightedChoice(cumulativeWeights, rng) {
  const length = cumulativeWeights.length;
  if (!length) throw new RangeError("weightedChoice requires at least one weight.");
  const total = Number(cumulativeWeights[length - 1]);
  if (!(total > 0) || !Number.isFinite(total)) {
    throw new RangeError("weightedChoice requires a finite positive total weight.");
  }
  const ticket = rng.random() * total;
  let low = 0;
  let high = length;
  // np.searchsorted(cumsum, u, side="right")
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (ticket < cumulativeWeights[middle]) high = middle;
    else low = middle + 1;
  }
  return Math.min(low, length - 1);
}


// CPU reference port of UMR_release/scripts/surface_sampling.py.
//
// This module preserves the production algorithm: weighted area candidates,
// 26-direction first-hit exterior filtering (at least two visible views), then
// farthest-point sampling.  It deliberately favors fidelity over speed; the
// optimized worker/WASM backend must match this implementation before it can
// replace it in the Studio.

import { NumpyPCG64, weightedChoice } from "./umr-numpy-pcg64-v1.js";

const EPSILON = 1e-12;
const makeAbortError = () => {
  const error = new Error("Retargeting stopped.");
  error.name = "AbortError";
  return error;
};
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeAbortError();
};

function yieldTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function firstHitDirections() {
  const directions = [];
  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        if (x === 0 && y === 0 && z === 0) continue;
        const inverseLength = 1 / Math.hypot(x, y, z);
        directions.push([x * inverseLength, y * inverseLength, z * inverseLength]);
      }
    }
  }
  return directions;
}

const FIRST_HIT_DIRECTIONS = firstHitDirections();

function coordinate(vertices, vertexId, axis) {
  return Number(vertices[vertexId * 3 + axis]);
}

function triangleBounds(vertices, faces, faceId) {
  const a = Number(faces[faceId * 3]);
  const b = Number(faces[faceId * 3 + 1]);
  const c = Number(faces[faceId * 3 + 2]);
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (const vertex of [a, b, c]) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = coordinate(vertices, vertex, axis);
      minimum[axis] = Math.min(minimum[axis], value);
      maximum[axis] = Math.max(maximum[axis], value);
    }
  }
  return { minimum, maximum };
}

function mergeBounds(target, source) {
  for (let axis = 0; axis < 3; axis += 1) {
    target.minimum[axis] = Math.min(target.minimum[axis], source.minimum[axis]);
    target.maximum[axis] = Math.max(target.maximum[axis], source.maximum[axis]);
  }
}

function buildBVH(vertices, faces, faceIds, leafSize = 8) {
  const faceBounds = new Map();
  const getBounds = (faceId) => {
    let bounds = faceBounds.get(faceId);
    if (!bounds) {
      bounds = triangleBounds(vertices, faces, faceId);
      faceBounds.set(faceId, bounds);
    }
    return bounds;
  };

  const build = (ids) => {
    const bounds = { minimum: [Infinity, Infinity, Infinity], maximum: [-Infinity, -Infinity, -Infinity] };
    for (const faceId of ids) mergeBounds(bounds, getBounds(faceId));
    if (ids.length <= leafSize) return { ...bounds, faces: ids };
    const spans = bounds.maximum.map((value, axis) => value - bounds.minimum[axis]);
    let axis = 0;
    if (spans[1] > spans[axis]) axis = 1;
    if (spans[2] > spans[axis]) axis = 2;
    ids.sort((left, right) => {
      const a = getBounds(left);
      const b = getBounds(right);
      return (a.minimum[axis] + a.maximum[axis]) - (b.minimum[axis] + b.maximum[axis]);
    });
    const middle = ids.length >>> 1;
    return {
      ...bounds,
      left: build(ids.slice(0, middle)),
      right: build(ids.slice(middle))
    };
  };
  return build(Array.from(faceIds, Number));
}

function rayBoxDistance(origin, direction, node, maximumDistance) {
  let near = 0;
  let far = maximumDistance;
  for (let axis = 0; axis < 3; axis += 1) {
    const component = direction[axis];
    if (Math.abs(component) <= EPSILON) {
      if (origin[axis] < node.minimum[axis] || origin[axis] > node.maximum[axis]) return Infinity;
      continue;
    }
    const inverse = 1 / component;
    let first = (node.minimum[axis] - origin[axis]) * inverse;
    let second = (node.maximum[axis] - origin[axis]) * inverse;
    if (first > second) [first, second] = [second, first];
    near = Math.max(near, first);
    far = Math.min(far, second);
    if (far < near) return Infinity;
  }
  return near;
}

function rayTriangleDistance(vertices, faces, faceId, origin, direction, maximumDistance) {
  const ia = Number(faces[faceId * 3]) * 3;
  const ib = Number(faces[faceId * 3 + 1]) * 3;
  const ic = Number(faces[faceId * 3 + 2]) * 3;
  const e1x = vertices[ib] - vertices[ia];
  const e1y = vertices[ib + 1] - vertices[ia + 1];
  const e1z = vertices[ib + 2] - vertices[ia + 2];
  const e2x = vertices[ic] - vertices[ia];
  const e2y = vertices[ic + 1] - vertices[ia + 1];
  const e2z = vertices[ic + 2] - vertices[ia + 2];
  const px = direction[1] * e2z - direction[2] * e2y;
  const py = direction[2] * e2x - direction[0] * e2z;
  const pz = direction[0] * e2y - direction[1] * e2x;
  const determinant = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(determinant) <= EPSILON) return Infinity;
  const inverse = 1 / determinant;
  const tx = origin[0] - vertices[ia];
  const ty = origin[1] - vertices[ia + 1];
  const tz = origin[2] - vertices[ia + 2];
  const u = (tx * px + ty * py + tz * pz) * inverse;
  if (u < 0 || u > 1) return Infinity;
  const qx = ty * e1z - tz * e1y;
  const qy = tz * e1x - tx * e1z;
  const qz = tx * e1y - ty * e1x;
  const v = (direction[0] * qx + direction[1] * qy + direction[2] * qz) * inverse;
  if (v < 0 || u + v > 1) return Infinity;
  const distance = (e2x * qx + e2y * qy + e2z * qz) * inverse;
  return distance > 0 && distance < maximumDistance ? distance : Infinity;
}

function firstHitFace(vertices, faces, root, origin, direction) {
  let closestDistance = Infinity;
  let closestFace = -1;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (rayBoxDistance(origin, direction, node, closestDistance) === Infinity) continue;
    if (node.faces) {
      for (const faceId of node.faces) {
        const distance = rayTriangleDistance(vertices, faces, faceId, origin, direction, closestDistance);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestFace = faceId;
        }
      }
      continue;
    }
    const leftDistance = rayBoxDistance(origin, direction, node.left, closestDistance);
    const rightDistance = rayBoxDistance(origin, direction, node.right, closestDistance);
    if (leftDistance < rightDistance) {
      if (rightDistance !== Infinity) stack.push(node.right);
      if (leftDistance !== Infinity) stack.push(node.left);
    } else {
      if (leftDistance !== Infinity) stack.push(node.left);
      if (rightDistance !== Infinity) stack.push(node.right);
    }
  }
  return closestFace;
}

async function farthestPointIndices(points, count, seed, onProgress, signal = null) {
  throwIfAborted(signal);
  const pointCount = points.length / 3;
  if (pointCount <= count) return Int32Array.from({ length: pointCount }, (_, index) => index);
  const rng = new NumpyPCG64(seed);
  const selected = new Int32Array(count);
  const minimumDistances = new Float64Array(pointCount);
  selected[0] = rng.integers(pointCount);
  const updateDistances = (selectedIndex) => {
    const sx = points[selectedIndex * 3];
    const sy = points[selectedIndex * 3 + 1];
    const sz = points[selectedIndex * 3 + 2];
    for (let index = 0; index < pointCount; index += 1) {
      const dx = points[index * 3] - sx;
      const dy = points[index * 3 + 1] - sy;
      const dz = points[index * 3 + 2] - sz;
      const distance = dx * dx + dy * dy + dz * dz;
      if (selectedIndex === selected[0] || distance < minimumDistances[index]) {
        minimumDistances[index] = distance;
      }
    }
  };
  updateDistances(selected[0]);
  for (let outputIndex = 1; outputIndex < count; outputIndex += 1) {
    let farthest = 0;
    for (let index = 1; index < pointCount; index += 1) {
      if (minimumDistances[index] > minimumDistances[farthest]) farthest = index;
    }
    selected[outputIndex] = farthest;
    updateDistances(farthest);
    if (outputIndex % 128 === 0) {
      onProgress?.(outputIndex / count);
      await yieldTask();
      throwIfAborted(signal);
    }
  }
  return selected;
}

export async function sampleFirstHitSurfacePoints({
  vertices,
  faces,
  count,
  seed = 9000,
  oversampleRatio = 8,
  candidateMultiplier = 12,
  rayOffset = 1e-4,
  rayDistance = 0,
  minVisibleViews = 2,
  signal = null,
  onProgress = () => {}
}) {
  throwIfAborted(signal);
  if (vertices.length % 3 || faces.length % 3) throw new TypeError("vertices and faces must contain xyz/triangle rows.");
  const vertexCount = vertices.length / 3;
  const faceCount = faces.length / 3;
  if (!vertexCount) return { points: new Float32Array(), faceIds: new Int32Array() };
  if (count <= 0 || !faceCount) {
    return { points: Float32Array.from(vertices), faceIds: new Int32Array() };
  }

  const validFaceIds = [];
  const cumulativeAreas = [];
  let totalArea = 0;
  const lower = [Infinity, Infinity, Infinity];
  const upper = [-Infinity, -Infinity, -Infinity];
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = Number(vertices[vertex * 3 + axis]);
      lower[axis] = Math.min(lower[axis], value);
      upper[axis] = Math.max(upper[axis], value);
    }
  }
  for (let face = 0; face < faceCount; face += 1) {
    const ia = Number(faces[face * 3]) * 3;
    const ib = Number(faces[face * 3 + 1]) * 3;
    const ic = Number(faces[face * 3 + 2]) * 3;
    const abx = vertices[ib] - vertices[ia];
    const aby = vertices[ib + 1] - vertices[ia + 1];
    const abz = vertices[ib + 2] - vertices[ia + 2];
    const acx = vertices[ic] - vertices[ia];
    const acy = vertices[ic + 1] - vertices[ia + 1];
    const acz = vertices[ic + 2] - vertices[ia + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const area = 0.5 * Math.hypot(nx, ny, nz);
    if (!(area > EPSILON)) continue;
    totalArea += area;
    validFaceIds.push(face);
    cumulativeAreas.push(totalArea);
  }
  if (!validFaceIds.length) throw new Error("Object mesh has no valid triangles for first_hit surface sampling.");

  const candidateCount = Math.max(count * oversampleRatio * candidateMultiplier, count);
  const rng = new NumpyPCG64(seed);
  const candidateFaceIds = new Int32Array(candidateCount);
  for (let index = 0; index < candidateCount; index += 1) {
    candidateFaceIds[index] = validFaceIds[weightedChoice(cumulativeAreas, rng)];
  }
  const squareRootR1 = new Float64Array(candidateCount);
  for (let index = 0; index < candidateCount; index += 1) squareRootR1[index] = Math.sqrt(rng.random());
  const candidatePoints = new Float64Array(candidateCount * 3);
  for (let index = 0; index < candidateCount; index += 1) {
    const r1 = squareRootR1[index];
    const r2 = rng.random();
    const face = candidateFaceIds[index];
    const ia = Number(faces[face * 3]) * 3;
    const ib = Number(faces[face * 3 + 1]) * 3;
    const ic = Number(faces[face * 3 + 2]) * 3;
    const w0 = 1 - r1;
    const w1 = r1 * (1 - r2);
    const w2 = r1 * r2;
    for (let axis = 0; axis < 3; axis += 1) {
      candidatePoints[index * 3 + axis] =
        w0 * vertices[ia + axis] + w1 * vertices[ib + axis] + w2 * vertices[ic + axis];
    }
  }
  onProgress(0.1, "candidate-sampling");
  await yieldTask();
  throwIfAborted(signal);

  const uniqueFaceIds = Array.from(new Set(candidateFaceIds)).sort((left, right) => left - right);
  const visibleFaces = new Uint8Array(faceCount);
  const bvh = buildBVH(vertices, faces, validFaceIds);
  const diagonal = Math.hypot(upper[0] - lower[0], upper[1] - lower[1], upper[2] - lower[2]);
  const outsideDistance = rayDistance > 0 ? rayDistance : Math.max(2 * diagonal, 1);
  for (let uniqueIndex = 0; uniqueIndex < uniqueFaceIds.length; uniqueIndex += 1) {
    const face = uniqueFaceIds[uniqueIndex];
    const ia = Number(faces[face * 3]) * 3;
    const ib = Number(faces[face * 3 + 1]) * 3;
    const ic = Number(faces[face * 3 + 2]) * 3;
    const center = [0, 0, 0];
    for (let axis = 0; axis < 3; axis += 1) {
      center[axis] = (vertices[ia + axis] + vertices[ib + axis] + vertices[ic + axis]) / 3;
    }
    let visibleViews = 0;
    for (const view of FIRST_HIT_DIRECTIONS) {
      const direction = [-view[0], -view[1], -view[2]];
      const origin = [
        center[0] + view[0] * outsideDistance + direction[0] * rayOffset,
        center[1] + view[1] * outsideDistance + direction[1] * rayOffset,
        center[2] + view[2] * outsideDistance + direction[2] * rayOffset
      ];
      if (firstHitFace(vertices, faces, bvh, origin, direction) === face) visibleViews += 1;
    }
    visibleFaces[face] = visibleViews >= minVisibleViews ? 1 : 0;
    if (uniqueIndex % 256 === 0) {
      onProgress(0.1 + 0.45 * uniqueIndex / Math.max(uniqueFaceIds.length, 1), "first-hit");
      await yieldTask();
      throwIfAborted(signal);
    }
  }

  let exteriorCount = 0;
  for (const face of candidateFaceIds) exteriorCount += visibleFaces[face];
  if (exteriorCount < count) {
    throw new Error(
      `first_hit kept ${exteriorCount}/${candidateCount} object candidates, less than the requested ${count}; refusing to sample hidden surfaces.`
    );
  }
  const exteriorPoints = new Float64Array(exteriorCount * 3);
  const exteriorFaceIds = new Int32Array(exteriorCount);
  let exteriorIndex = 0;
  for (let candidate = 0; candidate < candidateCount; candidate += 1) {
    if (!visibleFaces[candidateFaceIds[candidate]]) continue;
    exteriorPoints.set(candidatePoints.subarray(candidate * 3, candidate * 3 + 3), exteriorIndex * 3);
    exteriorFaceIds[exteriorIndex] = candidateFaceIds[candidate];
    exteriorIndex += 1;
  }
  onProgress(0.55, "first-hit");
  await yieldTask();
  throwIfAborted(signal);

  const keep = await farthestPointIndices(exteriorPoints, count, seed, (fraction) => {
    onProgress(0.55 + 0.45 * fraction, "farthest-point-sampling");
  }, signal);
  throwIfAborted(signal);
  const points = new Float32Array(keep.length * 3);
  const faceIds = new Int32Array(keep.length);
  for (let index = 0; index < keep.length; index += 1) {
    const source = keep[index];
    points[index * 3] = exteriorPoints[source * 3];
    points[index * 3 + 1] = exteriorPoints[source * 3 + 1];
    points[index * 3 + 2] = exteriorPoints[source * 3 + 2];
    faceIds[index] = exteriorFaceIds[source];
  }
  onProgress(1, "complete");
  return { points, faceIds };
}

export const exactSurfaceSamplingContract = Object.freeze({
  directions: 26,
  minVisibleViews: 2,
  oversampleRatio: 8,
  candidateMultiplier: 12,
  rayOffset: 1e-4,
  seed: 9000
});

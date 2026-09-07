import { ExactKDTree3 } from "./umr-exact-kdtree3-v1.js?v=20260904-current-run-v2";

// CPU reference port of smpl_surface_retarget_common.bind_points_to_mesh.
// It keeps the same nearest-24-vertices candidate rule, closest-triangle
// projection, barycentric binding, face normal, and error outputs.

function squaredDistance(points, left, x, y, z) {
  const dx = Number(points[left * 3]) - x;
  const dy = Number(points[left * 3 + 1]) - y;
  const dz = Number(points[left * 3 + 2]) - z;
  return dx * dx + dy * dy + dz * dz;
}

function buildKDTree(vertices, ids, depth = 0) {
  if (!ids.length) return null;
  const axis = depth % 3;
  ids.sort((left, right) => Number(vertices[left * 3 + axis]) - Number(vertices[right * 3 + axis]));
  const middle = ids.length >>> 1;
  return {
    id: ids[middle],
    axis,
    left: buildKDTree(vertices, ids.slice(0, middle), depth + 1),
    right: buildKDTree(vertices, ids.slice(middle + 1), depth + 1)
  };
}

function nearestVertices(vertices, tree, point, k) {
  const best = [];
  let worst = Infinity;
  const push = (id, distance) => {
    if (best.length < k) {
      best.push({ id, distance });
    } else if (distance < worst) {
      let worstIndex = 0;
      for (let index = 1; index < best.length; index += 1) {
        if (best[index].distance > best[worstIndex].distance) worstIndex = index;
      }
      best[worstIndex] = { id, distance };
    } else {
      return;
    }
    worst = best.length < k ? Infinity : Math.max(...best.map((item) => item.distance));
  };
  const visit = (node) => {
    if (!node) return;
    const axisDelta = point[node.axis] - Number(vertices[node.id * 3 + node.axis]);
    const near = axisDelta <= 0 ? node.left : node.right;
    const far = axisDelta <= 0 ? node.right : node.left;
    visit(near);
    push(node.id, squaredDistance(vertices, node.id, point[0], point[1], point[2]));
    if (axisDelta * axisDelta <= worst) visit(far);
  };
  visit(tree);
  best.sort((left, right) => left.distance - right.distance || left.id - right.id);
  return best.map((item) => item.id);
}

// Real-Time Collision Detection, Christer Ericson, closest point on triangle.
function closestPointOnTriangle(point, a, b, c) {
  const zeroTolerance = 1e-13;
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ap = [point[0] - a[0], point[1] - a[1], point[2] - a[2]];
  const d1 = ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2];
  const d2 = ac[0] * ap[0] + ac[1] * ap[1] + ac[2] * ap[2];
  if (d1 < zeroTolerance && d2 < zeroTolerance) return a.slice();

  const bp = [point[0] - b[0], point[1] - b[1], point[2] - b[2]];
  const d3 = ab[0] * bp[0] + ab[1] * bp[1] + ab[2] * bp[2];
  const d4 = ac[0] * bp[0] + ac[1] * bp[1] + ac[2] * bp[2];
  if (d3 > -zeroTolerance && d4 <= d3) return b.slice();

  const vc = d1 * d4 - d3 * d2;
  if (vc < zeroTolerance && d1 > -zeroTolerance && d3 < zeroTolerance) {
    const v = d1 / (d1 - d3);
    return [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]];
  }

  const cp = [point[0] - c[0], point[1] - c[1], point[2] - c[2]];
  const d5 = ab[0] * cp[0] + ab[1] * cp[1] + ab[2] * cp[2];
  const d6 = ac[0] * cp[0] + ac[1] * cp[1] + ac[2] * cp[2];
  if (d6 > -zeroTolerance && d5 <= d6) return c.slice();

  const vb = d5 * d2 - d1 * d6;
  if (vb < zeroTolerance && d2 > -zeroTolerance && d6 < zeroTolerance) {
    const w = d2 / (d2 - d6);
    return [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]];
  }

  const va = d3 * d6 - d5 * d4;
  if (va < zeroTolerance && d4 - d3 > -zeroTolerance && d5 - d6 > -zeroTolerance) {
    const edge = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return [b[0] + w * edge[0], b[1] + w * edge[1], b[2] + w * edge[2]];
  }

  const inverse = 1 / (va + vb + vc);
  const v = vb * inverse;
  const w = vc * inverse;
  return [
    a[0] + ab[0] * v + ac[0] * w,
    a[1] + ab[1] * v + ac[1] * w,
    a[2] + ab[2] * v + ac[2] * w
  ];
}

function barycentricCoordinates(point, a, b, c) {
  const v0 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const v2 = [point[0] - a[0], point[1] - a[1], point[2] - a[2]];
  const d00 = v0[0] ** 2 + v0[1] ** 2 + v0[2] ** 2;
  const d01 = v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2];
  const d11 = v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2;
  const d20 = v2[0] * v0[0] + v2[1] * v0[1] + v2[2] * v0[2];
  const d21 = v2[0] * v1[0] + v2[1] * v1[1] + v2[2] * v1[2];
  const denominator = d00 * d11 - d01 * d01;
  if (Math.abs(denominator) < 1e-12) return [1, 0, 0];
  const v = (d11 * d20 - d01 * d21) / denominator;
  const w = (d00 * d21 - d01 * d20) / denominator;
  const values = [1 - v - w, v, w].map((value) => Math.max(0, Math.min(1, value)));
  const sum = Math.max(values[0] + values[1] + values[2], 1e-12);
  return values.map((value) => value / sum);
}

function pythonIntSetIteration(values) {
  const findSlot = (table, key) => {
    const mask = table.length - 1;
    let index = key & mask;
    let perturb = key >>> 0;
    while (true) {
      let probes = index + 9 <= mask ? 9 : 0;
      while (true) {
        const value = table[index];
        if (value === -1 || value === key) return [index, value === key];
        if (probes-- === 0) break;
        index += 1;
      }
      perturb >>>= 5;
      index = (index * 5 + 1 + perturb) & mask;
    }
  };
  const cleanInsert = (table, key) => {
    table[findSlot(table, key)[0]] = key;
  };
  let table = new Int32Array(8).fill(-1);
  let used = 0;
  for (const key of values) {
    const [index, exists] = findSlot(table, Number(key));
    if (exists) continue;
    table[index] = Number(key);
    used += 1;
    if (used * 5 < (table.length - 1) * 3) continue;
    let size = 8;
    while (size <= used * 4) size <<= 1;
    const previous = table;
    table = new Int32Array(size).fill(-1);
    for (const value of previous) if (value !== -1) cleanInsert(table, value);
  }
  return Array.from(table).filter((value) => value !== -1);
}

export function bindPointsToMesh(points, vertices, faces, nearestVertexK = 24) {
  if (points.length % 3 || vertices.length % 3 || faces.length % 3) {
    throw new TypeError("points, vertices, and faces must contain complete xyz/triangle rows.");
  }
  const pointCount = points.length / 3;
  const vertexCount = vertices.length / 3;
  const faceCount = faces.length / 3;
  if (!vertexCount || !faceCount) throw new RangeError("Cannot bind points to an empty mesh.");
  const vertexToFaces = Array.from({ length: vertexCount }, () => []);
  for (let face = 0; face < faceCount; face += 1) {
    vertexToFaces[Number(faces[face * 3])].push(face);
    vertexToFaces[Number(faces[face * 3 + 1])].push(face);
    vertexToFaces[Number(faces[face * 3 + 2])].push(face);
  }
  const tree = new ExactKDTree3(vertices, 0, vertexCount);
  const k = Math.min(Math.max(1, Number(nearestVertexK)), vertexCount);
  const faceIds = new Int32Array(pointCount);
  const bary = new Float32Array(pointCount * 3);
  const closestPoints = new Float32Array(pointCount * 3);
  const closestNormals = new Float32Array(pointCount * 3);
  const errors = new Float32Array(pointCount);

  for (let pointId = 0; pointId < pointCount; pointId += 1) {
    const point = [points[pointId * 3], points[pointId * 3 + 1], points[pointId * 3 + 2]];
    const candidateSet = new Set();
    const candidateInsertion = [];
    tree.query(point[0], point[1], point[2], k);
    for (let nearest = 0; nearest < tree.resultSize; nearest += 1) {
      const vertex = Number(tree.resultIds[nearest]);
      for (const face of vertexToFaces[vertex]) {
        if (candidateSet.has(face)) continue;
        candidateSet.add(face);
        candidateInsertion.push(face);
      }
    }
    if (!candidateInsertion.length) candidateInsertion.push(0);
    // Native UMR feeds a CPython integer set directly to np.fromiter. Its
    // table order breaks exact-distance ties between coincident triangles.
    const candidateFaces = pythonIntSetIteration(candidateInsertion);
    let bestFace = candidateFaces[0];
    let bestPoint = [0, 0, 0];
    let bestDistance = Infinity;
    for (const face of candidateFaces) {
      const triangle = [0, 1, 2].map((corner) => {
        const vertex = Number(faces[face * 3 + corner]);
        return [vertices[vertex * 3], vertices[vertex * 3 + 1], vertices[vertex * 3 + 2]];
      });
      const closest = closestPointOnTriangle(point, triangle[0], triangle[1], triangle[2]);
      const distance = (closest[0] - point[0]) ** 2 + (closest[1] - point[1]) ** 2 + (closest[2] - point[2]) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestFace = face;
        bestPoint = closest;
      }
    }
    const triangle = [0, 1, 2].map((corner) => {
      const vertex = Number(faces[bestFace * 3 + corner]);
      return [vertices[vertex * 3], vertices[vertex * 3 + 1], vertices[vertex * 3 + 2]];
    });
    const coordinates = barycentricCoordinates(bestPoint, triangle[0], triangle[1], triangle[2]);
    const ab = triangle[1].map((value, axis) => value - triangle[0][axis]);
    const ac = triangle[2].map((value, axis) => value - triangle[0][axis]);
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0]
    ];
    const normalLength = Math.max(Math.hypot(...normal), 1e-12);
    faceIds[pointId] = bestFace;
    closestPoints.set(bestPoint, pointId * 3);
    bary.set(coordinates, pointId * 3);
    closestNormals.set(normal.map((value) => value / normalLength), pointId * 3);
    errors[pointId] = Math.sqrt(bestDistance);
  }
  return { faceIds, bary, closestPoints, closestNormals, errors };
}


function sampleHeight(meshVertices) {
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < meshVertices.length / 3; index += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = Number(meshVertices[index * 3 + axis]);
      minimum[axis] = Math.min(minimum[axis], value);
      maximum[axis] = Math.max(maximum[axis], value);
    }
  }
  const extents = maximum.map((value, axis) => value - minimum[axis]);
  const maximumExtent = Math.max(...extents);
  const height = extents[1] < 0.6 * maximumExtent ? maximumExtent : extents[1];
  if (!(height > 1e-6) || !Number.isFinite(height)) {
    throw new Error(`Cannot compute point-cloud height: ${height}.`);
  }
  return height;
}

export function normalizeCorrespondenceSamples(sourcePoints, sourceVertices, robotPoints, robotVertices) {
  const count = sourcePoints.length;
  if (robotPoints.length !== count || count % 3) {
    throw new TypeError("Source and robot samples must have matching (N, 3) shapes.");
  }
  const sourceHeight = sampleHeight(sourceVertices);
  const robotHeight = sampleHeight(robotVertices);
  const normalized = new Float32Array(count * 2);
  for (let index = 0; index < count; index += 1) {
    normalized[index] = sourcePoints[index] / sourceHeight;
    normalized[count + index] = robotPoints[index] / robotHeight;
  }
  return { normalized, sourceHeight, robotHeight };
}

export function templateSortYZx(points) {
  if (points.length % 3) throw new TypeError("Template points must contain complete xyz rows.");
  const ids = Array.from({ length: points.length / 3 }, (_, index) => index);
  ids.sort((left, right) =>
    Number(points[left * 3 + 1]) - Number(points[right * 3 + 1]) ||
    Number(points[left * 3 + 2]) - Number(points[right * 3 + 2]) ||
    Number(points[left * 3]) - Number(points[right * 3]) || left - right
  );
  return Int32Array.from(ids);
}

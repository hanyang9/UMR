import { bindPointsToMesh } from "./umr-exact-mesh-binding-v1.js?v=20260904-current-run-v2";

function trainingToRobotRoot(values, offset, toSmplFrame) {
  if (toSmplFrame) {
    return [
      Number(values[offset + 2]),
      Number(values[offset]),
      Number(values[offset + 1])
    ];
  }
  return [
    Number(values[offset]),
    Number(values[offset + 1]),
    Number(values[offset + 2])
  ];
}

function rotate(matrix, vector) {
  return [
    matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
    matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
    matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2]
  ];
}

function inverseRotate(matrix, vector) {
  return [
    matrix[0] * vector[0] + matrix[3] * vector[1] + matrix[6] * vector[2],
    matrix[1] * vector[0] + matrix[4] * vector[1] + matrix[7] * vector[2],
    matrix[2] * vector[0] + matrix[5] * vector[1] + matrix[8] * vector[2]
  ];
}

export function bindRobotSlotsToMesh({
  model,
  data,
  mesh,
  robotSlotPoints,
  toSmplFrame = true,
  nearestVertexK = 24,
  projectToSurface = true
}) {
  const slotCount = robotSlotPoints.length / 3;
  if (!Number.isInteger(slotCount) || slotCount <= 0) {
    throw new TypeError("Robot slot points must have shape (N, 3).");
  }
  const binding = bindPointsToMesh(
    robotSlotPoints,
    mesh.vertices,
    mesh.faces,
    nearestVertexK
  );
  const geomIds = new Int32Array(slotCount);
  const bodyIds = new Int32Array(slotCount);
  const localPositions = new Float32Array(slotCount * 3);
  const localNormals = new Float32Array(slotCount * 3);
  const rootPoints = new Float32Array(slotCount * 3);

  for (let slot = 0; slot < slotCount; slot += 1) {
    const offset = slot * 3;
    const faceId = Number(binding.faceIds[slot]);
    const geomId = Number(mesh.faceGeomIds[faceId]);
    if (!(geomId >= 0 && geomId < Number(model.ngeom))) {
      throw new RangeError(`Bound slot ${slot} references invalid geom ${geomId}.`);
    }
    const trainingPoint = projectToSurface ? binding.closestPoints : robotSlotPoints;
    const rootPoint = trainingToRobotRoot(trainingPoint, offset, toSmplFrame);
    const rootNormal = trainingToRobotRoot(binding.closestNormals, offset, toSmplFrame);
    const worldPoint = rotate(mesh.centerRotation, rootPoint);
    worldPoint[0] += mesh.centerPosition[0];
    worldPoint[1] += mesh.centerPosition[1];
    worldPoint[2] += mesh.centerPosition[2];
    const worldNormal = rotate(mesh.centerRotation, rootNormal);
    const geomOffset = geomId * 3;
    const matrixOffset = geomId * 9;
    const geomRotation = data.geom_xmat.subarray(matrixOffset, matrixOffset + 9);
    const relative = [
      worldPoint[0] - Number(data.geom_xpos[geomOffset]),
      worldPoint[1] - Number(data.geom_xpos[geomOffset + 1]),
      worldPoint[2] - Number(data.geom_xpos[geomOffset + 2])
    ];
    const localPoint = inverseRotate(geomRotation, relative);
    const localNormal = inverseRotate(geomRotation, worldNormal);
    const normalLength = Math.max(Math.hypot(...localNormal), 1e-12);
    geomIds[slot] = geomId;
    bodyIds[slot] = Number(model.geom_bodyid[geomId]);
    rootPoints.set(rootPoint, offset);
    localPositions.set(localPoint, offset);
    localNormals.set(localNormal.map((value) => value / normalLength), offset);
  }

  return {
    geomIds,
    bodyIds,
    localPositions,
    localNormals,
    rootPoints,
    trainingNormals: Float32Array.from(binding.closestNormals),
    faceIds: binding.faceIds,
    barycentricCoordinates: binding.bary,
    projectionErrors: binding.errors
  };
}

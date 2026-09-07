// Browser port of UMR_release/scripts/mujoco_geom_surface.py and the robot
// frame portion of build_correspondence_ae_dataset.py. Geometry is read from
// MuJoCo WASM model/data arrays, never from Three.js display tessellation.

const range = (count) => Array.from({ length: Number(count) }, (_, index) => index);

function enumValue(value) {
  return typeof value === "object" && value !== null && "value" in value
    ? Number(value.value)
    : Number(value);
}

function objectName(module, model, objectType, id) {
  return module.mj_id2name(model, enumValue(objectType), Number(id)) || "";
}

function isFloorLikeGeom(module, model, geomId) {
  const bodyId = Number(model.geom_bodyid[geomId]);
  const bodyName = objectName(module, model, module.mjtObj.mjOBJ_BODY, bodyId);
  const geomName = objectName(module, model, module.mjtObj.mjOBJ_GEOM, geomId);
  const label = `${bodyName} ${geomName}`.toLowerCase();
  return bodyName === "world" || label.includes("floor") || label.includes("ground") ||
    Number(model.geom_type[geomId]) === enumValue(module.mjtGeom.mjGEOM_PLANE);
}

export function surfaceGeomIds(module, model, policy = "auto") {
  const meshType = enumValue(module.mjtGeom.mjGEOM_MESH);
  const meshIds = range(model.ngeom).filter((id) => Number(model.geom_type[id]) === meshType);
  const visual = meshIds.filter((id) =>
    Number(model.geom_contype[id]) === 0 &&
    Number(model.geom_conaffinity[id]) === 0 &&
    Number(model.geom_group[id]) !== 3
  );
  if (meshIds.length) {
    if (policy === "visual") return Int32Array.from(visual.length ? visual : meshIds);
    const withoutFloor = (values) => values.filter((id) => !isFloorLikeGeom(module, model, id));
    if (policy === "all_mesh") return Int32Array.from(meshIds);
    if (policy === "mesh_no_floor") {
      const filtered = withoutFloor(meshIds);
      return Int32Array.from(filtered.length ? filtered : meshIds);
    }
    const filteredVisual = withoutFloor(visual);
    if (filteredVisual.length) return Int32Array.from(filteredVisual);
    const filteredMesh = withoutFloor(meshIds);
    return Int32Array.from(filteredMesh.length ? filteredMesh : meshIds);
  }

  const supported = new Set([
    enumValue(module.mjtGeom.mjGEOM_SPHERE),
    enumValue(module.mjtGeom.mjGEOM_CAPSULE),
    enumValue(module.mjtGeom.mjGEOM_ELLIPSOID),
    enumValue(module.mjtGeom.mjGEOM_CYLINDER),
    enumValue(module.mjtGeom.mjGEOM_BOX)
  ]);
  return Int32Array.from(range(model.ngeom).filter((id) =>
    supported.has(Number(model.geom_type[id])) && !isFloorLikeGeom(module, model, id)
  ));
}

function ringVertices(radius, z, segments) {
  const vertices = new Float32Array(segments * 3);
  for (let index = 0; index < segments; index += 1) {
    const angle = 2 * Math.PI * index / segments;
    vertices[index * 3] = radius * Math.cos(angle);
    vertices[index * 3 + 1] = radius * Math.sin(angle);
    vertices[index * 3 + 2] = z;
  }
  return vertices;
}

function connectRings(ringCount, segments) {
  const faces = new Int32Array((ringCount - 1) * segments * 2 * 3);
  let cursor = 0;
  for (let row = 0; row < ringCount - 1; row += 1) {
    const base = row * segments;
    const next = (row + 1) * segments;
    for (let column = 0; column < segments; column += 1) {
      const following = (column + 1) % segments;
      faces.set([base + column, next + column, next + following], cursor);
      cursor += 3;
      faces.set([base + column, next + following, base + following], cursor);
      cursor += 3;
    }
  }
  return faces;
}

function concatenateFloat32(chunks) {
  const result = new Float32Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function sphereMesh(radius, segments = 24, rings = 12, scale = [1, 1, 1]) {
  const rows = [];
  for (let row = 0; row <= rings; row += 1) {
    const theta = -0.5 * Math.PI + Math.PI * row / rings;
    rows.push(ringVertices(radius * Math.cos(theta), radius * Math.sin(theta), segments));
  }
  const vertices = concatenateFloat32(rows);
  for (let index = 0; index < vertices.length / 3; index += 1) {
    vertices[index * 3] *= scale[0];
    vertices[index * 3 + 1] *= scale[1];
    vertices[index * 3 + 2] *= scale[2];
  }
  return { vertices, faces: connectRings(rings + 1, segments) };
}

function capsuleMesh(radius, halfLength, segments = 24, hemiRings = 8) {
  const rows = [];
  for (let row = 0; row <= hemiRings; row += 1) {
    const theta = -0.5 * Math.PI + 0.5 * Math.PI * row / hemiRings;
    rows.push(ringVertices(radius * Math.cos(theta), -halfLength + radius * Math.sin(theta), segments));
  }
  rows.push(ringVertices(radius, halfLength, segments));
  for (let row = 1; row <= hemiRings; row += 1) {
    const theta = 0.5 * Math.PI * row / hemiRings;
    rows.push(ringVertices(radius * Math.cos(theta), halfLength + radius * Math.sin(theta), segments));
  }
  return { vertices: concatenateFloat32(rows), faces: connectRings(rows.length, segments) };
}

function cylinderMesh(radius, halfLength, segments = 24) {
  const vertices = concatenateFloat32([
    ringVertices(radius, -halfLength, segments),
    ringVertices(radius, halfLength, segments),
    new Float32Array([0, 0, -halfLength, 0, 0, halfLength])
  ]);
  const sideFaces = connectRings(2, segments);
  const faces = new Int32Array(sideFaces.length + segments * 6);
  faces.set(sideFaces);
  let cursor = sideFaces.length;
  const bottomCenter = 2 * segments;
  const topCenter = bottomCenter + 1;
  for (let column = 0; column < segments; column += 1) {
    const following = (column + 1) % segments;
    faces.set([bottomCenter, following, column], cursor);
    cursor += 3;
    faces.set([topCenter, segments + column, segments + following], cursor);
    cursor += 3;
  }
  return { vertices, faces };
}

function boxMesh(size) {
  const [x, y, z] = size;
  return {
    vertices: new Float32Array([
      -x, -y, -z, x, -y, -z, x, y, -z, -x, y, -z,
      -x, -y, z, x, -y, z, x, y, z, -x, y, z
    ]),
    faces: new Int32Array([
      0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7,
      0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5,
      2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7
    ])
  };
}

export function geomLocalMesh(module, model, geomId) {
  const type = Number(model.geom_type[geomId]);
  const meshType = enumValue(module.mjtGeom.mjGEOM_MESH);
  if (type === meshType) {
    const meshId = Number(model.geom_dataid[geomId]);
    if (meshId < 0) throw new Error(`Mesh geom ${geomId} has no mesh data.`);
    const vertexStart = Number(model.mesh_vertadr[meshId]);
    const vertexCount = Number(model.mesh_vertnum[meshId]);
    const faceStart = Number(model.mesh_faceadr[meshId]);
    const faceCount = Number(model.mesh_facenum[meshId]);
    return {
      vertices: Float32Array.from(model.mesh_vert.subarray(vertexStart * 3, (vertexStart + vertexCount) * 3)),
      faces: Int32Array.from(model.mesh_face.subarray(faceStart * 3, (faceStart + faceCount) * 3))
    };
  }
  const size = [
    Number(model.geom_size[geomId * 3]),
    Number(model.geom_size[geomId * 3 + 1]),
    Number(model.geom_size[geomId * 3 + 2])
  ];
  if (type === enumValue(module.mjtGeom.mjGEOM_SPHERE)) return sphereMesh(size[0]);
  if (type === enumValue(module.mjtGeom.mjGEOM_ELLIPSOID)) return sphereMesh(1, 24, 12, size);
  if (type === enumValue(module.mjtGeom.mjGEOM_CAPSULE)) return capsuleMesh(size[0], size[1]);
  if (type === enumValue(module.mjtGeom.mjGEOM_CYLINDER)) return cylinderMesh(size[0], size[1]);
  if (type === enumValue(module.mjtGeom.mjGEOM_BOX)) return boxMesh(size);
  throw new Error(`Unsupported geom type for surface sampling: ${type}`);
}

function resolveCenterFrame(module, model, data, centerSpec) {
  const text = String(centerSpec);
  const separator = text.indexOf(":");
  const explicitKind = separator >= 0 ? text.slice(0, separator).trim().toLowerCase() : null;
  const name = separator >= 0 ? text.slice(separator + 1).trim() : text;
  const kinds = explicitKind ? [explicitKind] : ["body", "geom", "joint"];
  for (const kind of kinds) {
    if (kind === "body") {
      const id = module.mj_name2id(model, enumValue(module.mjtObj.mjOBJ_BODY), name);
      if (id >= 0) {
        return {
          position: Float64Array.from(data.xpos.subarray(id * 3, id * 3 + 3)),
          rotation: Float64Array.from(data.xmat.subarray(id * 9, id * 9 + 9)),
          label: `body:${name}`
        };
      }
    } else if (kind === "geom") {
      const id = module.mj_name2id(model, enumValue(module.mjtObj.mjOBJ_GEOM), name);
      if (id >= 0) {
        return {
          position: Float64Array.from(data.geom_xpos.subarray(id * 3, id * 3 + 3)),
          rotation: Float64Array.from(data.geom_xmat.subarray(id * 9, id * 9 + 9)),
          label: `geom:${name}`
        };
      }
    } else if (kind === "joint") {
      const id = module.mj_name2id(model, enumValue(module.mjtObj.mjOBJ_JOINT), name);
      if (id >= 0) {
        const isFree = Number(model.jnt_type[id]) === enumValue(module.mjtJoint.mjJNT_FREE);
        const address = Number(model.jnt_qposadr[id]);
        return {
          position: isFree
            ? Float64Array.from(data.qpos.subarray(address, address + 3))
            : Float64Array.from(data.xanchor.subarray(id * 3, id * 3 + 3)),
          rotation: new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
          label: `joint:${name}`
        };
      }
    }
  }
  throw new Error(`Point cloud center ${JSON.stringify(centerSpec)} was not found as body/geom/joint.`);
}

export function collectRobotVisualMesh({
  module,
  model,
  data,
  pointCloudCenter,
  toSmplFrame = true,
  visualGeomPolicy = "auto"
}) {
  const geomIds = surfaceGeomIds(module, model, visualGeomPolicy);
  if (!geomIds.length) throw new Error("No mesh or primitive surface geoms found in the uploaded MJCF.");
  const center = resolveCenterFrame(module, model, data, pointCloudCenter);
  const meshChunks = [];
  let totalVertices = 0;
  let totalFaces = 0;
  for (const geomId of geomIds) {
    const local = geomLocalMesh(module, model, geomId);
    meshChunks.push({ geomId: Number(geomId), ...local, vertexOffset: totalVertices });
    totalVertices += local.vertices.length / 3;
    totalFaces += local.faces.length / 3;
  }
  const vertices = new Float32Array(totalVertices * 3);
  const faces = new Int32Array(totalFaces * 3);
  const faceGeomIds = new Int32Array(totalFaces);
  let vertexCursor = 0;
  let faceCursor = 0;
  for (const chunk of meshChunks) {
    const geomPosition = data.geom_xpos.subarray(chunk.geomId * 3, chunk.geomId * 3 + 3);
    const geomRotation = data.geom_xmat.subarray(chunk.geomId * 9, chunk.geomId * 9 + 9);
    for (let vertex = 0; vertex < chunk.vertices.length / 3; vertex += 1) {
      const x = chunk.vertices[vertex * 3];
      const y = chunk.vertices[vertex * 3 + 1];
      const z = chunk.vertices[vertex * 3 + 2];
      const dx = geomPosition[0] + geomRotation[0] * x + geomRotation[1] * y + geomRotation[2] * z - center.position[0];
      const dy = geomPosition[1] + geomRotation[3] * x + geomRotation[4] * y + geomRotation[5] * z - center.position[1];
      const dz = geomPosition[2] + geomRotation[6] * x + geomRotation[7] * y + geomRotation[8] * z - center.position[2];
      const rootX = dx * center.rotation[0] + dy * center.rotation[3] + dz * center.rotation[6];
      const rootY = dx * center.rotation[1] + dy * center.rotation[4] + dz * center.rotation[7];
      const rootZ = dx * center.rotation[2] + dy * center.rotation[5] + dz * center.rotation[8];
      const offset = (vertexCursor + vertex) * 3;
      if (toSmplFrame) {
        vertices[offset] = rootY;
        vertices[offset + 1] = rootZ;
        vertices[offset + 2] = rootX;
      } else {
        vertices[offset] = rootX;
        vertices[offset + 1] = rootY;
        vertices[offset + 2] = rootZ;
      }
    }
    for (let index = 0; index < chunk.faces.length; index += 1) {
      faces[faceCursor * 3 + index] = chunk.faces[index] + chunk.vertexOffset;
    }
    faceGeomIds.fill(chunk.geomId, faceCursor, faceCursor + chunk.faces.length / 3);
    vertexCursor += chunk.vertices.length / 3;
    faceCursor += chunk.faces.length / 3;
  }
  return {
    vertices,
    faces,
    faceGeomIds,
    geomIds,
    centerLabel: center.label,
    centerPosition: Float64Array.from(center.position),
    centerRotation: Float64Array.from(center.rotation)
  };
}

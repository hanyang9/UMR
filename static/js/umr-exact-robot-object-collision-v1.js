// Browser equivalent of UMR's build_robot_object_penetration_cache and
// compute_robot_object_penetration_rows.  The object collision mesh is rebuilt
// from the already-baked interaction mesh, so a static deployment does not
// depend on any machine-local source path.

const enumValue = (value) => typeof value === "object" && value !== null && "value" in value
  ? Number(value.value)
  : Number(value);

function objectName(module, model, type, id) {
  return module.mj_id2name(model, enumValue(type), Number(id)) || "";
}

function collisionLabel(module, model, geomId) {
  const bodyId = Number(model.geom_bodyid[geomId]);
  const geomName = objectName(module, model, module.mjtObj.mjOBJ_GEOM, geomId);
  const bodyName = objectName(module, model, module.mjtObj.mjOBJ_BODY, bodyId);
  return `${geomName} ${bodyName}`.trim().toLowerCase();
}

function robotCollisionGeomIds(module, model) {
  const plane = enumValue(module.mjtGeom.mjGEOM_PLANE);
  const output = [];
  for (let geomId = 0; geomId < Number(model.ngeom); geomId += 1) {
    const bodyId = Number(model.geom_bodyid[geomId]);
    const bodyName = objectName(module, model, module.mjtObj.mjOBJ_BODY, bodyId);
    const label = collisionLabel(module, model, geomId);
    if (bodyName === "world" || label.includes("floor") || label.includes("ground")) continue;
    if (Number(model.geom_type[geomId]) === plane) continue;
    if (Number(model.geom_contype[geomId]) === 0 && Number(model.geom_conaffinity[geomId]) === 0) continue;
    output.push(geomId);
  }
  return Int32Array.from(output);
}

function appendInlineCollisionObject(document, manifest, targetHeight) {
  const root = document.documentElement;
  if (!root || root.tagName.toLowerCase() !== "mujoco") {
    throw new Error("The selected robot XML is not a MuJoCo document.");
  }
  const object = manifest.interaction_objects?.[0];
  if (!object || !Array.isArray(object.vertices_unit) || !Array.isArray(object.indices)) {
    throw new Error("The exact HOI pack is missing its baked object collision mesh.");
  }
  const vertices = object.vertices_unit.flatMap((point) => point.map((value) => Number(value) * targetHeight));
  const faces = object.indices.map(Number);
  if (vertices.length < 12 || vertices.length % 3 || faces.length < 3 || faces.length % 3) {
    throw new Error("The baked object collision mesh is invalid.");
  }

  let asset = Array.from(root.children).find((node) => node.tagName.toLowerCase() === "asset");
  if (!asset) {
    asset = document.createElement("asset");
    root.insertBefore(asset, Array.from(root.children).find((node) => node.tagName.toLowerCase() === "worldbody") || null);
  }
  const mesh = document.createElement("mesh");
  mesh.setAttribute("name", "__umr_collision_object_mesh");
  mesh.setAttribute("vertex", vertices.map((value) => Number(value).toPrecision(17)).join(" "));
  mesh.setAttribute("face", faces.join(" "));
  asset.appendChild(mesh);

  let worldbody = Array.from(root.children).find((node) => node.tagName.toLowerCase() === "worldbody");
  if (!worldbody) {
    worldbody = document.createElement("worldbody");
    root.appendChild(worldbody);
  }
  const body = document.createElement("body");
  body.setAttribute("name", "__umr_collision_object");
  const freejoint = document.createElement("freejoint");
  freejoint.setAttribute("name", "__umr_collision_object_freejoint");
  const geom = document.createElement("geom");
  geom.setAttribute("name", "__umr_collision_object_geom");
  geom.setAttribute("type", "mesh");
  geom.setAttribute("mesh", "__umr_collision_object_mesh");
  geom.setAttribute("group", "3");
  geom.setAttribute("contype", "1");
  geom.setAttribute("conaffinity", "1");
  body.append(freejoint, geom);
  worldbody.appendChild(body);
}

function vectorAttribute(values, start, count) {
  return Array.from({ length: count }, (_, index) => Number(values[start + index]).toPrecision(17)).join(" ");
}

function integerAttribute(values, start, count) {
  return values.subarray(start, start + count).join(" ");
}

function floatAttribute(values, start, count) {
  // mjModel mesh vertices are float32. The default decimal rendering is a
  // lossless float32 round-trip and keeps the inline collision MJCF compact.
  return values.subarray(start, start + count).join(" ");
}

function primitiveGeomType(module, type) {
  const types = module.mjtGeom;
  if (type === enumValue(types.mjGEOM_SPHERE)) return ["sphere", 1];
  if (type === enumValue(types.mjGEOM_CAPSULE)) return ["capsule", 2];
  if (type === enumValue(types.mjGEOM_ELLIPSOID)) return ["ellipsoid", 3];
  if (type === enumValue(types.mjGEOM_CYLINDER)) return ["cylinder", 2];
  if (type === enumValue(types.mjGEOM_BOX)) return ["box", 3];
  return null;
}

function buildCollisionDocument(viewer, sourceGeomIds) {
  const { module, model } = viewer;
  const document = new DOMParser().parseFromString(
    `<mujoco model="__umr_collision_only"><compiler angle="radian" autolimits="true" fusestatic="false"/><asset/><worldbody/></mujoco>`,
    "application/xml"
  );
  const asset = document.querySelector("asset");
  const worldbody = document.querySelector("worldbody");
  const bodies = new Array(Number(model.nbody));
  bodies[0] = worldbody;
  for (let bodyId = 1; bodyId < Number(model.nbody); bodyId += 1) {
    const body = document.createElement("body");
    body.setAttribute("name", `__umr_body_${bodyId}`);
    body.setAttribute("pos", vectorAttribute(model.body_pos, bodyId * 3, 3));
    body.setAttribute("quat", vectorAttribute(model.body_quat, bodyId * 4, 4));
    const inertial = document.createElement("inertial");
    inertial.setAttribute("pos", "0 0 0");
    inertial.setAttribute("mass", "1");
    inertial.setAttribute("diaginertia", "1 1 1");
    body.appendChild(inertial);
    const parentId = Number(model.body_parentid[bodyId]);
    (bodies[parentId] || worldbody).appendChild(body);
    bodies[bodyId] = body;
  }

  const free = enumValue(module.mjtJoint.mjJNT_FREE);
  const ball = enumValue(module.mjtJoint.mjJNT_BALL);
  const slide = enumValue(module.mjtJoint.mjJNT_SLIDE);
  const hinge = enumValue(module.mjtJoint.mjJNT_HINGE);
  for (let jointId = 0; jointId < Number(model.njnt); jointId += 1) {
    const bodyId = Number(model.jnt_bodyid[jointId]);
    const type = Number(model.jnt_type[jointId]);
    const joint = document.createElement(type === free ? "freejoint" : "joint");
    joint.setAttribute("name", `__umr_joint_${jointId}`);
    if (type !== free) {
      joint.setAttribute("type", type === ball ? "ball" : type === slide ? "slide" : type === hinge ? "hinge" : "hinge");
      joint.setAttribute("pos", vectorAttribute(model.jnt_pos, jointId * 3, 3));
    }
    if (type === slide || type === hinge) {
      joint.setAttribute("axis", vectorAttribute(model.jnt_axis, jointId * 3, 3));
      const lower = Number(model.jnt_range[jointId * 2]);
      const upper = Number(model.jnt_range[jointId * 2 + 1]);
      // This MuJoCo-WASM build does not register its uint8 memory_view, so
      // jnt_limited cannot be read through embind. A finite increasing range
      // is the same criterion already used by the browser joint model.
      const limited = Number.isFinite(lower) && Number.isFinite(upper) && upper > lower;
      joint.setAttribute("limited", limited ? "true" : "false");
      if (limited) joint.setAttribute("range", `${lower.toPrecision(17)} ${upper.toPrecision(17)}`);
      const qadr = Number(model.jnt_qposadr[jointId]);
      const reference = Number(model.qpos0[qadr]);
      if (Math.abs(reference) > 1e-15) joint.setAttribute("ref", reference.toPrecision(17));
    }
    bodies[bodyId].appendChild(joint);
  }

  const meshType = enumValue(module.mjtGeom.mjGEOM_MESH);
  const collisionMeshNames = new Map();
  const robotGeomNames = [];
  sourceGeomIds.forEach((sourceGeomId, collisionGeomId) => {
    const type = Number(model.geom_type[sourceGeomId]);
    const geomName = `__umr_robot_collision_${collisionGeomId}`;
    const geom = document.createElement("geom");
    geom.setAttribute("name", geomName);
    robotGeomNames.push(geomName);
    if (type === meshType) {
      const meshId = Number(model.geom_dataid[sourceGeomId]);
      if (meshId < 0) throw new Error(`Collision mesh geom ${sourceGeomId} has no mesh data.`);
      let meshName = collisionMeshNames.get(meshId);
      if (!meshName) {
        meshName = `__umr_robot_collision_mesh_${meshId}`;
        collisionMeshNames.set(meshId, meshName);
        const vertexStart = Number(model.mesh_vertadr[meshId]);
        const vertexCount = Number(model.mesh_vertnum[meshId]);
        const faceStart = Number(model.mesh_faceadr[meshId]);
        const faceCount = Number(model.mesh_facenum[meshId]);
        const mesh = document.createElement("mesh");
        mesh.setAttribute("name", meshName);
        mesh.setAttribute("vertex", floatAttribute(model.mesh_vert, vertexStart * 3, vertexCount * 3));
        mesh.setAttribute("face", integerAttribute(model.mesh_face, faceStart * 3, faceCount * 3));
        asset.appendChild(mesh);
      }
      geom.setAttribute("type", "mesh");
      geom.setAttribute("mesh", meshName);
    } else {
      const primitive = primitiveGeomType(module, type);
      if (!primitive) throw new Error(`Unsupported robot collision geom type ${type}.`);
      const [typeName, sizeCount] = primitive;
      geom.setAttribute("type", typeName);
      geom.setAttribute("size", vectorAttribute(model.geom_size, sourceGeomId * 3, sizeCount));
    }
    geom.setAttribute("pos", vectorAttribute(model.geom_pos, sourceGeomId * 3, 3));
    geom.setAttribute("quat", vectorAttribute(model.geom_quat, sourceGeomId * 4, 4));
    geom.setAttribute("contype", String(Number(model.geom_contype[sourceGeomId])));
    geom.setAttribute("conaffinity", String(Number(model.geom_conaffinity[sourceGeomId])));
    geom.setAttribute("group", "3");
    geom.setAttribute("density", "0");
    geom.setAttribute("margin", Number(model.geom_margin[sourceGeomId]).toPrecision(17));
    if (model.geom_gap) geom.setAttribute("gap", Number(model.geom_gap[sourceGeomId]).toPrecision(17));
    bodies[Number(model.geom_bodyid[sourceGeomId])].appendChild(geom);
  });
  return { document, robotGeomNames };
}

export async function buildRobotObjectCollisionCache(viewer, pack, targetHeight) {
  const solver = pack.manifest.solver || {};
  const enabled = Boolean(solver.robot_object_hard_constraint) || Number(solver.robot_object_penetration_soft_cost) > 0;
  if (!enabled) return null;
  const { module, model: mainModel } = viewer;
  if (!module || !mainModel) throw new Error("The selected robot model is unavailable for exact HOI collision constraints.");
  const sourceRobotGeomIds = robotCollisionGeomIds(module, mainModel);
  let collisionModel;
  let collisionData;
  let robotGeomIds;
  let robotGeomNames;
  try {
    // The native pipeline compiles a second robot+object model for collision
    // queries. Recompiling all uploaded visual meshes is equivalent but can
    // exhaust the 2 GiB MuJoCo-WASM heap for high-resolution assets. Build
    // the same kinematic tree from mjModel and retain only collision-enabled
    // geoms; mesh collision geoms are copied losslessly from compiled arrays.
    // The viewer continues to own and render the complete visual model.
    const compact = buildCollisionDocument(viewer, sourceRobotGeomIds);
    const { document } = compact;
    robotGeomNames = compact.robotGeomNames;
    appendInlineCollisionObject(document, pack.manifest, targetHeight);
    collisionModel = module.MjModel.from_xml_string(new XMLSerializer().serializeToString(document));
    if (!collisionModel) throw new Error("MuJoCo could not compile the robot-object collision model.");
    if (Number(collisionModel.nq) !== Number(mainModel.nq) + 7 || Number(collisionModel.nv) !== Number(mainModel.nv) + 6) {
      throw new Error(
        `Collision-only kinematics mismatch: main nq/nv ${mainModel.nq}/${mainModel.nv}, combined ${collisionModel.nq}/${collisionModel.nv}.`
      );
    }
    collisionData = new module.MjData(collisionModel);
  } catch (error) {
    collisionData?.delete();
    collisionModel?.delete();
    throw error;
  }

  const mainNq = Number(mainModel.nq);
  const mainNv = Number(mainModel.nv);
  let objectQadr = -1;
  const free = enumValue(module.mjtJoint.mjJNT_FREE);
  for (let joint = 0; joint < Number(collisionModel.njnt); joint += 1) {
    const qadr = Number(collisionModel.jnt_qposadr[joint]);
    if (Number(collisionModel.jnt_type[joint]) === free && qadr >= mainNq) {
      objectQadr = qadr;
      break;
    }
  }
  const robotGeomNameSet = new Set(robotGeomNames);
  robotGeomIds = [];
  const plane = enumValue(module.mjtGeom.mjGEOM_PLANE);
  const objectGeomIds = [];
  for (let geomId = 0; geomId < Number(collisionModel.ngeom); geomId += 1) {
    if (Number(collisionModel.geom_type[geomId]) === plane) continue;
    const geomName = objectName(module, collisionModel, module.mjtObj.mjOBJ_GEOM, geomId);
    if (robotGeomNameSet.has(geomName)) {
      robotGeomIds.push(geomId);
    } else if (geomName === "__umr_collision_object_geom" &&
      (Number(collisionModel.geom_group[geomId]) === 3 ||
        Number(collisionModel.geom_contype[geomId]) !== 0 ||
        Number(collisionModel.geom_conaffinity[geomId]) !== 0)) {
      objectGeomIds.push(geomId);
    }
  }
  if (objectQadr < 0 || !robotGeomIds.length || !objectGeomIds.length) {
    collisionData.delete();
    collisionModel.delete();
    throw new Error(
      `Exact HOI collision model is incomplete (object root ${objectQadr}, robot geoms ${robotGeomIds.length}, object geoms ${objectGeomIds.length}).`
    );
  }

  const combinedNv = Number(collisionModel.nv);
  const fromtoBuffer = new module.DoubleBuffer(6);
  const jacpBuffer = new module.DoubleBuffer(3 * combinedNv);
  const jacrBuffer = new module.DoubleBuffer(3 * combinedNv);
  return {
    module,
    model: collisionModel,
    data: collisionData,
    robotNq: mainNq,
    robotNv: mainNv,
    objectQadr,
    robotGeomIds,
    objectGeomIds: Int32Array.from(objectGeomIds),
    labels: Array.from({ length: Number(collisionModel.ngeom) }, (_, geomId) => collisionLabel(module, collisionModel, geomId)),
    fromtoBuffer,
    jacpBuffer,
    jacrBuffer,
    dispose() {
      fromtoBuffer.delete();
      jacpBuffer.delete();
      jacrBuffer.delete();
      collisionData.delete();
      collisionModel.delete();
    }
  };
}

function relativeJacobian(cache, geom1, geom2, fromto, distance) {
  const { module, model, data, robotNv } = cache;
  const jacp = cache.jacpBuffer.GetView();
  const jacr = cache.jacrBuffer.GetView();
  const combinedNv = Number(model.nv);
  const dx = Number(fromto[0]) - Number(fromto[3]);
  const dy = Number(fromto[1]) - Number(fromto[4]);
  const dz = Number(fromto[2]) - Number(fromto[5]);
  const length = Math.hypot(dx, dy, dz);
  const normal = new Float64Array(3);
  if (length > 1e-12) {
    const sign = distance >= 0 ? 1 : -1;
    normal[0] = sign * dx / length;
    normal[1] = sign * dy / length;
    normal[2] = sign * dz / length;
  } else if (cache.labels[geom2].includes("ground") || cache.labels[geom2].includes("floor")) {
    normal[2] = distance >= 0 ? 1 : -1;
  } else if (cache.labels[geom1].includes("ground") || cache.labels[geom1].includes("floor")) {
    normal[2] = distance >= 0 ? -1 : 1;
  }
  jacp.fill(0);
  jacr.fill(0);
  module.mj_jac(model, data, jacp, jacr, fromto.subarray(0, 3), Number(model.geom_bodyid[geom1]));
  const first = Float64Array.from(jacp);
  jacp.fill(0);
  jacr.fill(0);
  module.mj_jac(model, data, jacp, jacr, fromto.subarray(3, 6), Number(model.geom_bodyid[geom2]));
  const row = new Float64Array(robotNv);
  for (let dof = 0; dof < robotNv; dof += 1) {
    row[dof] = normal[0] * (first[dof] - jacp[dof])
      + normal[1] * (first[combinedNv + dof] - jacp[combinedNv + dof])
      + normal[2] * (first[2 * combinedNv + dof] - jacp[2 * combinedNv + dof]);
  }
  return row;
}

export function computeRobotObjectPenetrationRows(cache, qpos, objectPoseWxyz, margin, threshold, maxPairs) {
  if (!cache) return { jacobians: [], distances: [] };
  const { module, model, data } = cache;
  module.mj_resetData(model, data);
  data.qpos.subarray(0, cache.robotNq).set(qpos.subarray(0, cache.robotNq));
  data.qpos.subarray(cache.objectQadr, cache.objectQadr + 7).set(objectPoseWxyz);
  module.mj_forward(model, data);
  const activation = Math.max(Number(threshold), Number(margin), 0);
  const savedContype = Int32Array.from(model.geom_contype);
  const savedConaffinity = Int32Array.from(model.geom_conaffinity);
  const savedMargin = Float64Array.from(model.geom_margin);
  const robotSet = new Set(cache.robotGeomIds);
  const objectSet = new Set(cache.objectGeomIds);
  const candidates = new Map();
  try {
    for (const geomId of cache.robotGeomIds) {
      model.geom_contype[geomId] = 1;
      model.geom_conaffinity[geomId] = 1;
    }
    for (const geomId of cache.objectGeomIds) {
      model.geom_contype[geomId] = 1;
      model.geom_conaffinity[geomId] = 1;
    }
    for (let geomId = 0; geomId < Number(model.ngeom); geomId += 1) {
      model.geom_margin[geomId] = Math.max(Number(savedMargin[geomId]), activation);
    }
    module.mj_collision(model, data);
    // In this MuJoCo-WASM binding, data.contact returns an owning copy of the
    // complete std::vector<MjContact>.  Read it once per collision pass and
    // release it explicitly; reading data.contact inside this loop copies the
    // whole vector for every contact and exhausts the WASM heap.
    const contacts = data.contact;
    try {
      const count = Math.min(Number(data.ncon), Number(contacts.size()));
      for (let contactId = 0; contactId < count; contactId += 1) {
        const contact = contacts.get(contactId);
        const geom1 = Number(contact.geom1);
        const geom2 = Number(contact.geom2);
        if (robotSet.has(geom1) && objectSet.has(geom2)) candidates.set(`${geom1}:${geom2}`, [geom1, geom2]);
        else if (robotSet.has(geom2) && objectSet.has(geom1)) candidates.set(`${geom2}:${geom1}`, [geom2, geom1]);
      }
    } finally {
      contacts.delete?.();
    }
  } finally {
    model.geom_contype.set(savedContype);
    model.geom_conaffinity.set(savedConaffinity);
    model.geom_margin.set(savedMargin);
  }

  const found = [];
  const ordered = [...candidates.values()].sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  for (const [robotGeom, objectGeom] of ordered) {
    // mj_collision can grow Emscripten memory for a large uploaded model.
    // Always reacquire views after it runs instead of retaining detached views.
    const fromto = cache.fromtoBuffer.GetView();
    fromto.fill(0);
    let distance;
    try {
      distance = Number(module.mj_geomDistance(model, data, robotGeom, objectGeom, activation, fromto));
    } catch {
      continue;
    }
    if (distance > activation) continue;
    found.push({
      jacobian: relativeJacobian(cache, robotGeom, objectGeom, fromto, distance),
      distance,
      robotGeom,
      objectGeom
    });
  }
  if (Number(maxPairs) > 0 && found.length > Number(maxPairs)) {
    found.sort((left, right) => left.distance - right.distance);
    found.length = Number(maxPairs);
  }
  return {
    jacobians: found.map((item) => item.jacobian),
    distances: found.map((item) => item.distance),
    pairs: found.map((item) => [item.robotGeom, item.objectGeom])
  };
}

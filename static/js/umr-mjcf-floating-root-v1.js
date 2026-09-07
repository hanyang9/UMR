// Browser port of UMR_release.prepare_robot_xml's floating-root transform.

function directChild(parent, tagName) {
  return Array.from(parent.children).find((child) => child.tagName.toLowerCase() === tagName) || null;
}

function bodyHasFreeJoint(body) {
  return Array.from(body.children).some((child) =>
    child.tagName.toLowerCase() === "freejoint" ||
    (child.tagName.toLowerCase() === "joint" && String(child.getAttribute("type") || "").toLowerCase() === "free")
  );
}

function worldbodyChildIsRobot(child) {
  const tag = child.tagName.toLowerCase();
  if (tag === "body") return true;
  if (tag !== "geom") return false;
  const name = String(child.getAttribute("name") || "").toLowerCase();
  const type = String(child.getAttribute("type") || "").toLowerCase();
  if (name.includes("floor") || name.includes("ground") || type === "plane") return false;
  return Boolean(child.getAttribute("mesh"));
}

export function prepareFloatingRobotXml(xmlText) {
  const document = new DOMParser().parseFromString(String(xmlText), "application/xml");
  const parseError = document.querySelector("parsererror");
  if (parseError) throw new Error(`Could not parse robot MJCF: ${parseError.textContent}`);
  const root = document.documentElement;
  if (!root || root.tagName.toLowerCase() !== "mujoco") throw new Error("The selected XML is not a MuJoCo document.");
  const worldbody = directChild(root, "worldbody");
  if (!worldbody) throw new Error("The selected MJCF has no worldbody.");

  const bodies = Array.from(root.getElementsByTagName("body"));
  let addedFreejoint = false;
  if (!bodies.some(bodyHasFreeJoint)) {
    const floatRoot = document.createElement("body");
    floatRoot.setAttribute("name", "__umr_float_root");
    floatRoot.setAttribute("pos", "0 0 0");
    const inertial = document.createElement("inertial");
    inertial.setAttribute("pos", "0 0 0");
    inertial.setAttribute("mass", "0.001");
    inertial.setAttribute("diaginertia", "1e-6 1e-6 1e-6");
    const freejoint = document.createElement("freejoint");
    freejoint.setAttribute("name", "__umr_float_root_freejoint");
    floatRoot.append(inertial, freejoint);
    for (const child of Array.from(worldbody.children)) {
      if (worldbodyChildIsRobot(child)) floatRoot.appendChild(child);
    }
    worldbody.appendChild(floatRoot);
    addedFreejoint = true;
  }

  for (const body of Array.from(root.getElementsByTagName("body"))) {
    if (!bodyHasFreeJoint(body) || directChild(body, "inertial")) continue;
    const inertial = document.createElement("inertial");
    inertial.setAttribute("pos", "0 0 0");
    inertial.setAttribute("mass", "0.001");
    inertial.setAttribute("diaginertia", "1e-6 1e-6 1e-6");
    body.insertBefore(inertial, body.firstChild);
  }
  return {
    xml: new XMLSerializer().serializeToString(document),
    addedFreejoint
  };
}

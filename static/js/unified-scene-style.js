import * as THREE from "../vendor/three/three.module.js";

export const UNIFIED_SCENE_SKY = 0xe8f0fc;

export function createUnifiedSceneGround(scene, camera, controls) {
  const gridColor = new THREE.Color(0x161c23);
  const horizonColor = new THREE.Color(0xdce8f7);
  const fresnelCameraPosition = new THREE.Vector3();
  const cameraOffset = new THREE.Vector3();
  const fresnelOrigin = new THREE.Vector2();
  const fresnelForward = new THREE.Vector2(0, 1);
  const referenceFov = 32;
  const referenceElevation = Math.atan2(2.2, 6);
  const material = new THREE.MeshStandardMaterial({
    color: 0x303840,
    roughness: 0.84,
    metalness: 0,
    envMapIntensity: 0,
    side: THREE.DoubleSide
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.groundGridColor = { value: gridColor };
    shader.uniforms.groundHorizonColor = { value: horizonColor };
    shader.uniforms.groundFresnelCameraPosition = { value: fresnelCameraPosition };
    shader.uniforms.groundFresnelOriginXY = { value: fresnelOrigin };
    shader.uniforms.groundFresnelForwardXY = { value: fresnelForward };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "varying vec2 vGroundGridPosition;",
          "varying vec3 vGroundWorldPosition;"
        ].join("\n")
      )
      .replace(
        "#include <begin_vertex>",
        [
          "#include <begin_vertex>",
          "vec4 groundWorldPosition = modelMatrix * vec4(position, 1.0);",
          "vGroundGridPosition = groundWorldPosition.xy;",
          "vGroundWorldPosition = groundWorldPosition.xyz;"
        ].join("\n")
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "varying vec2 vGroundGridPosition;",
          "varying vec3 vGroundWorldPosition;",
          "uniform vec3 groundGridColor;",
          "uniform vec3 groundHorizonColor;",
          "uniform vec3 groundFresnelCameraPosition;",
          "uniform vec2 groundFresnelOriginXY;",
          "uniform vec2 groundFresnelForwardXY;",
          "float stableGroundGridLine(float coordinate) {",
          "  float spacing = 0.75;",
          "  float halfWidth = 0.009;",
          "  float pixelSpan = max(fwidth(coordinate), 1e-6);",
          "  float distanceToLine = abs(fract(coordinate / spacing + 0.5) - 0.5) * spacing;",
          "  float antialiasWidth = max(pixelSpan * 1.25, 0.001);",
          "  float line = 1.0 - smoothstep(max(0.0, halfWidth - antialiasWidth), halfWidth + antialiasWidth, distanceToLine);",
          "  float cellsPerPixel = pixelSpan / spacing;",
          "  float frequencyFade = 1.0 - smoothstep(0.16, 0.48, cellsPerPixel);",
          "  return line * frequencyFade;",
          "}"
        ].join("\n")
      )
      .replace(
        "#include <color_fragment>",
        [
          "#include <color_fragment>",
          "float groundGridMask = max(",
          "  stableGroundGridLine(vGroundGridPosition.x),",
          "  stableGroundGridLine(vGroundGridPosition.y)",
          ");",
          "diffuseColor.rgb = mix(diffuseColor.rgb, groundGridColor, groundGridMask * 0.58);"
        ].join("\n")
      )
      .replace(
        "#include <opaque_fragment>",
        [
          "vec3 groundReferenceViewDirection = normalize(groundFresnelCameraPosition - vGroundWorldPosition);",
          "float groundNdotV = clamp(abs(groundReferenceViewDirection.z), 0.0, 1.0);",
          "float groundFresnel = 0.02 + 0.98 * pow(1.0 - groundNdotV, 3.0);",
          "float groundForwardDistance = dot(vGroundWorldPosition.xy - groundFresnelOriginXY, groundFresnelForwardXY);",
          "float groundHorizonGate = 1.0 / (1.0 + exp(-0.22 * (groundForwardDistance - 3.0)));",
          "outgoingLight = mix(outgoingLight, groundHorizonColor, clamp(groundFresnel * groundHorizonGate * 0.52, 0.0, 0.52));",
          "#include <opaque_fragment>"
        ].join("\n")
      );
  };
  material.customProgramCacheKey = () => "unified-ground-grid-horizon-v1";

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  ground.receiveShadow = false;
  ground.castShadow = false;
  ground.renderOrder = -1;
  ground.visible = false;
  scene.add(ground);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShadowMaterial({
      color: 0x101419,
      opacity: 0.38,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    })
  );
  shadow.receiveShadow = true;
  shadow.castShadow = false;
  shadow.material.depthWrite = false;
  shadow.renderOrder = 1;
  shadow.visible = false;
  scene.add(shadow);

  const update = () => {
    cameraOffset.subVectors(camera.position, controls.target);
    if (cameraOffset.lengthSq() < 1e-8) cameraOffset.set(0, -1, 0.35);
    const horizontalDistance = Math.hypot(cameraOffset.x, cameraOffset.y);
    if (horizontalDistance > 1e-8) {
      cameraOffset.z = Math.sign(cameraOffset.z || 1) * horizontalDistance * Math.tan(referenceElevation);
    }
    const actualDistance = cameraOffset.length();
    const actualTangent = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const referenceTangent = Math.tan(THREE.MathUtils.degToRad(referenceFov) * 0.5);
    const referenceDistance = actualDistance * actualTangent / referenceTangent;
    fresnelCameraPosition.copy(controls.target).addScaledVector(
      cameraOffset.normalize(),
      Math.max(0.1, referenceDistance)
    );
    fresnelOrigin.set(controls.target.x, controls.target.y);
    fresnelForward.set(
      controls.target.x - camera.position.x,
      controls.target.y - camera.position.y
    );
    if (fresnelForward.lengthSq() < 1e-8) fresnelForward.set(0, 1);
    else fresnelForward.normalize();
  };

  const dispose = () => {
    ground.geometry.dispose();
    ground.material.dispose();
    shadow.geometry.dispose();
    shadow.material.dispose();
  };

  return { ground, shadow, update, dispose };
}

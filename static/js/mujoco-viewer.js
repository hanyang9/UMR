import * as THREE from "../vendor/three/three.module.js";
import { OrbitControls } from "../vendor/three/OrbitControls.js";
import { RoomEnvironment } from "../vendor/three/addons/environments/RoomEnvironment.js";
import loadMujoco from "../vendor/mujoco/mujoco.js";
import { ReferenceMotionLibrary } from "./reference-motion-scene.js?v=20260905-hoi-642-140-480-v1";
import { BrowserUMRRuntimeExact } from "./browser-umr-runtime-exact-v1.js?v=20260905-hoi-642-ground-hard-v2";
import { prepareFloatingRobotXml } from "./umr-mjcf-floating-root-v1.js";

const DEMO_MJCF = `
<mujoco model="UMR T-pose demo">
  <compiler angle="radian"/>
  <option gravity="0 0 0"/>
  <default>
    <joint damping="1" limited="true"/>
    <geom type="capsule" size=".055" rgba=".28 .52 .78 1"/>
  </default>
  <worldbody>
    <geom name="floor" type="plane" size="2 2 .01" rgba=".92 .92 .92 1"/>
    <body name="pelvis" pos="0 0 .92">
      <geom type="box" size=".13 .14 .09" rgba=".22 .36 .54 1"/>
      <body name="torso" pos="0 0 .13">
        <joint name="waist" type="hinge" axis="0 0 1" range="-1 1"/>
        <geom fromto="0 0 0 0 0 .40" size=".12" rgba=".24 .44 .68 1"/>
        <body name="head" pos="0 0 .51">
          <joint name="neck" type="hinge" axis="0 0 1" range="-.8 .8"/>
          <geom type="sphere" size=".12" rgba=".72 .78 .84 1"/>
        </body>
        <body name="left_upper_arm" pos="0 .12 .36">
          <joint name="left_shoulder" type="hinge" axis="1 0 0" range="-2.6 2.6"/>
          <geom fromto="0 0 0 0 .34 0"/>
          <body name="left_forearm" pos="0 .34 0">
            <joint name="left_elbow" type="hinge" axis="0 0 1" range="-2.4 0"/>
            <geom fromto="0 0 0 0 .31 0" size=".045"/>
          </body>
        </body>
        <body name="right_upper_arm" pos="0 -.12 .36">
          <joint name="right_shoulder" type="hinge" axis="1 0 0" range="-2.6 2.6"/>
          <geom fromto="0 0 0 0 -.34 0"/>
          <body name="right_forearm" pos="0 -.34 0">
            <joint name="right_elbow" type="hinge" axis="0 0 1" range="0 2.4"/>
            <geom fromto="0 0 0 0 -.31 0" size=".045"/>
          </body>
        </body>
      </body>
      <body name="left_thigh" pos="0 .085 -.09">
        <joint name="left_hip" type="hinge" axis="0 1 0" range="-2 1"/>
        <geom fromto="0 0 0 0 0 -.40" size=".07"/>
        <body name="left_shin" pos="0 0 -.40">
          <joint name="left_knee" type="hinge" axis="0 1 0" range="0 2.4"/>
          <geom fromto="0 0 0 0 0 -.40" size=".055"/>
          <body name="left_foot" pos="0 0 -.40">
            <joint name="left_ankle" type="hinge" axis="0 1 0" range="-.8 .8"/>
            <geom type="box" pos=".08 0 -.035" size=".14 .075 .035"/>
          </body>
        </body>
      </body>
      <body name="right_thigh" pos="0 -.085 -.09">
        <joint name="right_hip" type="hinge" axis="0 1 0" range="-2 1"/>
        <geom fromto="0 0 0 0 0 -.40" size=".07"/>
        <body name="right_shin" pos="0 0 -.40">
          <joint name="right_knee" type="hinge" axis="0 1 0" range="0 2.4"/>
          <geom fromto="0 0 0 0 0 -.40" size=".055"/>
          <body name="right_foot" pos="0 0 -.40">
            <joint name="right_ankle" type="hinge" axis="0 1 0" range="-.8 .8"/>
            <geom type="box" pos=".08 0 -.035" size=".14 .075 .035"/>
          </body>
        </body>
      </body>
    </body>
  </worldbody>
</mujoco>`;

const ROBOT_PRESET_CATALOG_URL = new URL(
  "../assets/studio_robot_presets/manifest.json?v=20260905-studio-robot-presets-v1",
  import.meta.url
);
const ROBOT_PRESET_DRAG_TYPE = "application/x-umr-robot-preset";

const $ = (selector) => document.querySelector(selector);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const normalizePath = (path = "") =>
  path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "");
const cleanPath = (path = "") => normalizePath(path)
  .split("/")
  .reduce((parts, part) => {
    if (!part || part === ".") return parts;
    if (part === "..") parts.pop();
    else parts.push(part);
    return parts;
  }, [])
  .join("/");
const dirname = (path = "") => {
  const clean = cleanPath(path);
  const slash = clean.lastIndexOf("/");
  return slash < 0 ? "" : clean.slice(0, slash);
};
const joinPath = (...parts) => cleanPath(parts.filter(Boolean).join("/"));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const makeAbortError = () => {
  const error = new Error("Retargeting stopped.");
  error.name = "AbortError";
  return error;
};
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeAbortError();
};

class MujocoTPoseViewer {
  constructor(root) {
    this.root = root;
    this.shell = root.closest(".mj-studio-shell") || root;
    this.stage = root.querySelector("#mj-stage");
    this.canvas = root.querySelector("#mj-canvas");
    this.status = root.querySelector("#mj-status");
    this.dropHint = root.querySelector("#mj-drop-hint");
    this.loading = root.querySelector("#mj-loading");
    this.loadingTitle = root.querySelector("#mj-loading-title");
    this.loadingDetail = root.querySelector("#mj-loading-detail");
    this.modelSelectHint = root.querySelector("#mj-model-select-hint");
    this.customTPoseReminder = root.querySelector("#mj-custom-tpose-reminder");
    this.jointList = root.querySelector("#mj-joint-list");
    this.jointSearch = root.querySelector("#mj-joint-search");
    this.modelInfo = root.querySelector("#mj-model-info");
    this.modelBrowser = root.querySelector("#mj-model-browser");
    this.modelList = root.querySelector("#mj-model-list");
    this.modelSearch = root.querySelector("#mj-model-search");
    this.modelCount = root.querySelector("#mj-model-count");
    this.folderInput = root.querySelector("#mj-folder-input");
    this.copyTPoseButton = root.querySelector("#mj-save-tpose");
    this.selectFolderButton = root.querySelector("#mj-select-folder");
    this.rootBodySelect = root.querySelector("#mj-root-body");
    this.trainingCoreControl = root.querySelector("#mj-training-core-control");
    this.trainingCoreSelect = root.querySelector("#mj-training-cores");
    this.trainingCoreHelp = root.querySelector("#mj-training-core-help");
    this.runRetargetButton = root.querySelector("#mj-run-retarget");
    this.stopRetargetButton = root.querySelector("#mj-stop-retarget");
    this.pipelineStepsContainer = root.querySelector("#mj-pipeline-steps");
    this.pipelineSteps = [...root.querySelectorAll("#mj-pipeline-steps [data-stage]")];
    this.pipelineMessage = root.querySelector("#mj-pipeline-message");
    this.tposeSceneHint = root.querySelector("#mj-tpose-scene-hint");
    this.tposeSceneNumber = root.querySelector("#mj-tpose-scene-number");
    this.sceneGuideState = root.querySelector("#mj-scene-guide-state");
    this.sceneGuideToggle = root.querySelector("#mj-scene-guide-toggle");
    this.tposeSceneTitle = root.querySelector("#mj-tpose-scene-title");
    this.tposeSceneDetail = root.querySelector("#mj-tpose-scene-detail");
    this.player = root.querySelector("#mj-player");
    this.playButton = root.querySelector("#mj-play-motion");
    this.motionScrubber = root.querySelector("#mj-motion-scrubber");
    this.motionFrame = root.querySelector("#mj-motion-frame");
    this.playbackSpeed = root.querySelector("#mj-playback-speed");
    this.stageViewButtons = [...root.querySelectorAll("#mj-stage-views [data-view]")];
    this.stageLegend = root.querySelector("#mj-stage-legend");
    this.stageLegendTitle = root.querySelector("#mj-stage-legend-title");
    this.stageLegendItems = root.querySelector("#mj-stage-legend-items");
    this.referenceList = this.shell.querySelector("#mj-motion-list");
    this.motionSourceSelect = this.shell.querySelector("#mj-motion-source");
    this.retargetTitle = root.querySelector("#mj-retarget-title");
    this.model = null;
    this.data = null;
    this.meshes = [];
    this.bodyGroups = [];
    this.geometryCache = new Map();
    this.jointById = new Map();
    this.jointControlMap = new Map();
    this.modelWorkspace = null;
    this.modelOptions = [];
    this.currentModelPath = "";
    this.currentCompiledXmlText = "";
    this.module = null;
    this.modulePromise = null;
    this.userModelRequested = false;
    this.robotPresetCatalogPromise = null;
    this.activeRobotPresetId = "";
    this.robotAssetSource = "empty";
    this.fileBytesCache = new WeakMap();
    this.memfsLoadCounter = 0;
    this.frameId = null;
    this.sceneNeedsRender = true;
    this.onControlsChange = () => this.markSceneDirty();
    this.jobId = null;
    this.jobPollTimer = null;
    this.pipelineAbortController = null;
    this.preRetargetTPose = null;
    this.preRetargetView = null;
    this.uploadController = null;
    this.motion = null;
    this.interactionObjects = [];
    this.motionCursor = 0;
    this.motionPlaying = false;
    this.playbackStartedAt = 0;
    this.samplingArtifact = null;
    this.classificationArtifact = null;
    this.retargetTPose = null;
    this.currentViewStage = "editor";
    this.editorGroundState = null;
    this.motionCameraFollowBodyId = null;
    this.motionCameraFollowRoot = null;
    this.tposeConfirmed = false;
    this.lastPipelineStage = "";
    this.taskLocked = false;
    this.maximumTrainingWorkers = 1;
    this.renderVisible = false;
    this.renderVisibilityObserver = null;
    this.onDocumentVisibilityChange = () => this.requestAnimationLoop();
    this.onPaste = (event) => { void this.handlePastedFiles(event); };
    this.initThree();
    this.referenceScene = new ReferenceMotionLibrary({
      container: this.referenceList,
      selectionInput: this.motionSourceSelect,
      onMotionChange: (motion) => this.handleReferenceMotionChange(motion)
    });
    this.browserRuntime = new BrowserUMRRuntimeExact(this);
    this.populateTrainingCoreOptions();
    this.resize();
    this.bindUI();
    this.setupRenderVisibility();
    this.initMujoco();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe8f0fc);
    this.stageVisualGroup = new THREE.Group();
    this.scene.add(this.stageVisualGroup);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(this.viewerPixelRatio());
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.scene.environment = this.createEnvironmentMap();
    if ("environmentIntensity" in this.scene) this.scene.environmentIntensity = 0.8;

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(2.4, -2.4, 1.7);

    this.controls = new OrbitControls(this.camera, this.canvas);
    // Match robot_viewer: camera input maps directly to the current frame.
    this.controls.enableDamping = false;
    this.controls.target.set(0, 0, 0.9);
    this.controls.addEventListener("change", this.onControlsChange);

    const hemi = new THREE.HemisphereLight(0xf7f9fb, 0x30343a, 0.38);
    this.scene.add(hemi);
    this.keyLight = new THREE.DirectionalLight(0xfff8ef, 5.25);
    this.keyLight.position.set(-9, 13.8, 15.6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.00035;
    this.keyLight.shadow.normalBias = 0.008;
    this.keyLight.shadow.radius = 2;
    this.scene.add(this.keyLight, this.keyLight.target);
    this.fillLights = [
      this.createViewerDirectionalLight(0x8bb8ff, 0.14, -12, 9, 12),
      this.createViewerDirectionalLight(0xffedd8, 0.44, -7.5, -10.5, 7.5),
      this.createViewerDirectionalLight(0xf4f8ff, 0.38, 4.5, 9.6, 10.2),
      this.createViewerDirectionalLight(0xffffff, 0.32, -3, 1.8, 15)
    ];

    this.setupViewerGround();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stage);
    this.initJointInteraction();
    this.resize();
  }

  viewerPixelRatio(
    width = Math.max(this.canvas?.clientWidth || 1, 1),
    height = Math.max(this.canvas?.clientHeight || 1, 1)
  ) {
    const requested = Math.min(window.devicePixelRatio || 1, 1.75);
    const pixelBudgetRatio = Math.sqrt(2_500_000 / Math.max(width * height, 1));
    return Math.max(1, Math.min(requested, pixelBudgetRatio));
  }

  markSceneDirty({ shadow = false } = {}) {
    this.sceneNeedsRender = true;
    if (shadow && this.renderer?.shadowMap) {
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  createEnvironmentMap() {
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const environment = pmrem.fromScene(new RoomEnvironment(this.renderer), 0.02).texture;
      pmrem.dispose();
      return environment;
    } catch (error) {
      console.warn("Room environment could not be initialized.", error);
    }
    const faces = Array.from({ length: 6 }, (_, face) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const context = canvas.getContext("2d");
      const gradient = context.createLinearGradient(0, 0, 64, 64);
      gradient.addColorStop(0, face === 2 ? "#ffffff" : "#b8c0ca");
      gradient.addColorStop(0.45, "#555e68");
      gradient.addColorStop(1, "#11151a");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      return canvas;
    });
    const environment = new THREE.CubeTexture(faces);
    environment.colorSpace = THREE.SRGBColorSpace;
    environment.needsUpdate = true;
    return environment;
  }

  createViewerDirectionalLight(color, intensity, x, y, z) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.userData.viewerOffset = new THREE.Vector3(x, y, z);
    light.position.copy(light.userData.viewerOffset);
    this.scene.add(light, light.target);
    return light;
  }

  updateViewerLightRig(center) {
    const keyOffset = new THREE.Vector3(-9, 13.8, 15.6);
    this.keyLight.target.position.copy(center);
    this.keyLight.position.copy(center).add(keyOffset);
    this.keyLight.target.updateMatrixWorld();
    for (const light of this.fillLights || []) {
      light.target.position.copy(center);
      light.position.copy(center).add(light.userData.viewerOffset);
      light.target.updateMatrixWorld();
    }
  }

  setupViewerGround() {
    const gridColor = new THREE.Color(0x161c23);
    const horizonColor = new THREE.Color(0xdce8f7);
    const fresnelCameraPosition = new THREE.Vector3();
    const cameraOffset = new THREE.Vector3();
    const fresnelOrigin = new THREE.Vector2();
    const fresnelForward = new THREE.Vector2(0, 1);
    const referenceFov = 32;
    const referenceElevation = Math.atan2(2.2, 6);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x303840,
      roughness: 0.84,
      metalness: 0,
      envMapIntensity: 0,
      side: THREE.DoubleSide
    });
    groundMaterial.onBeforeCompile = (shader) => {
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
    groundMaterial.customProgramCacheKey = () => "studio-unified-ground-grid-horizon-v1";
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), groundMaterial);
    this.ground.receiveShadow = false;
    this.ground.castShadow = false;
    this.ground.visible = false;
    this.ground.renderOrder = -1;
    this.scene.add(this.ground);

    this.groundShadow = new THREE.Mesh(
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
    this.groundShadow.receiveShadow = true;
    this.groundShadow.castShadow = false;
    this.groundShadow.material.depthWrite = false;
    this.groundShadow.renderOrder = 1;
    this.groundShadow.visible = false;
    this.scene.add(this.groundShadow);

    this.updateViewerGroundShader = () => {
      cameraOffset.subVectors(this.camera.position, this.controls.target);
      if (cameraOffset.lengthSq() < 1e-8) cameraOffset.set(0, -1, 0.35);
      const horizontalDistance = Math.hypot(cameraOffset.x, cameraOffset.y);
      if (horizontalDistance > 1e-8) {
        cameraOffset.z = Math.sign(cameraOffset.z || 1) * horizontalDistance * Math.tan(referenceElevation);
      }
      const actualDistance = cameraOffset.length();
      const actualTangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) * 0.5);
      const referenceTangent = Math.tan(THREE.MathUtils.degToRad(referenceFov) * 0.5);
      const referenceDistance = actualDistance * actualTangent / referenceTangent;
      fresnelCameraPosition.copy(this.controls.target).addScaledVector(
        cameraOffset.normalize(),
        Math.max(0.1, referenceDistance)
      );
      fresnelOrigin.set(this.controls.target.x, this.controls.target.y);
      fresnelForward.set(
        this.controls.target.x - this.camera.position.x,
        this.controls.target.y - this.camera.position.y
      );
      if (fresnelForward.lengthSq() < 1e-8) fresnelForward.set(0, 1);
      else fresnelForward.normalize();
    };
  }

  bindUI() {
    this.selectFolderButton.addEventListener("click", () => {
      this.folderInput.click();
    });
    this.folderInput.addEventListener("change", async () => {
      await this.loadFileObjects([...this.folderInput.files], { autoLoadSingle: false, userInitiated: true });
      this.folderInput.value = "";
    });
    document.addEventListener("paste", this.onPaste);

    ["dragenter", "dragover"].forEach((eventName) => {
      this.stage.addEventListener(eventName, (event) => {
        event.preventDefault();
        this.stage.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      this.stage.addEventListener(eventName, (event) => {
        event.preventDefault();
        this.stage.classList.remove("is-dragging");
      });
    });
    this.stage.addEventListener("drop", async (event) => {
      const robotPresetId = this.robotPresetIdFromDrop(event.dataTransfer);
      if (robotPresetId) {
        await this.loadRobotPreset(robotPresetId);
        return;
      }
      this.prioritizeUserAssetLoad();
      const files = await this.filesFromDrop(event.dataTransfer);
      await this.loadFileObjects(files, { autoLoadSingle: false, userInitiated: true });
    });

    this.root.querySelector("#mj-default-pose").addEventListener("click", () => {
      if (!this.model || !this.data) return;
      this.setViewStage("editor", { fit: false });
      this.data.qpos.set(this.model.qpos0);
      this.forwardAndRefreshControls();
      this.retargetTPose = [...this.data.qpos];
      this.setTPoseGuideState("editing");
      this.setStatus("Robot pose reset. Adjust it into a T-pose before continuing.", "ready");
    });
    this.copyTPoseButton.addEventListener("click", () => this.copyTPoseConfig());
    this.sceneGuideToggle.addEventListener("click", () => {
      this.setSceneGuideCollapsed(this.tposeSceneHint.dataset.collapsed !== "true");
    });
    this.jointSearch.addEventListener("input", () => this.filterJoints());
    this.modelSearch.addEventListener("input", () => this.filterModelOptions());
    this.trainingCoreSelect.addEventListener("change", () => this.updateTrainingCoreHelp());
    this.updateTrainingCoreHelp();
    this.runRetargetButton.addEventListener("click", () => this.startRetargeting());
    this.stopRetargetButton.addEventListener("click", () => this.stopRetargeting());
    this.playButton.addEventListener("click", () => this.toggleMotionPlayback());
    this.motionScrubber.addEventListener("input", () => {
      if (this.currentViewStage !== "motion") this.setViewStage("motion", { fit: false });
      this.pauseMotion();
      this.setMotionFrame(Number(this.motionScrubber.value));
    });
    this.playbackSpeed.addEventListener("change", () => {
      if (!this.motionPlaying) return;
      this.playbackStartFrame = this.motionCursor;
      this.playbackStartedAt = performance.now();
    });
    this.stageViewButtons.forEach((button) => {
      button.addEventListener("click", () => this.setViewStage(button.dataset.view));
    });
    this.bindRobotPresetCards();
  }

  async handlePastedFiles(event) {
    if (this.taskLocked) return;
    const files = [...(event.clipboardData?.files || [])];
    if (!files.length) return;
    event.preventDefault();
    this.prioritizeUserAssetLoad();
    await this.loadFileObjects(files, { autoLoadSingle: false, userInitiated: true });
  }

  prioritizeUserAssetLoad() {
    this.userModelRequested = true;
    this.setLoadingOverlay(
      this.module ? "Indexing robot folder…" : "Preparing MuJoCo runtime…",
      this.module
        ? "MuJoCo is already ready; only the dropped folder is being indexed."
        : "Your robot will load as soon as the shared runtime is ready.",
      true
    );
  }

  async ensureMujocoReady() {
    if (this.module) return this.module;
    if (!this.modulePromise) {
      this.modulePromise = globalThis.__umrMujocoModulePromise || loadMujoco();
      globalThis.__umrMujocoModulePromise = this.modulePromise;
    }
    this.module = await this.modulePromise;
    return this.module;
  }

  async initMujoco() {
    if (window.location.protocol === "file:") {
      this.setStatus("MuJoCo WASM requires HTTP. Run: python3 serve_umr.py", "error");
      this.loading.hidden = true;
      return;
    }

    try {
      this.setStatus("Loading MuJoCo WASM…", "loading");
      this.setLoadingOverlay("Preparing MuJoCo runtime…", "The reference library is loading in parallel.", true);
      this.modulePromise = globalThis.__umrMujocoModulePromise || loadMujoco();
      globalThis.__umrMujocoModulePromise = this.modulePromise;
      this.module = await this.modulePromise;
      if (!this.userModelRequested) {
        this.showEmptyRobotScene();
        this.loading.hidden = true;
      }
      const referenceLoad = this.referenceScene.initialize(this.module, "humanoid_spinkick")
        .then(() => {
          if (!this.referenceScene.motion) return;
          if (this.userModelRequested) {
            const motion = this.referenceScene.motion;
            this.retargetTitle.textContent = (motion.display_name || motion.id).replace(" — ", " · ");
          } else {
            this.handleReferenceMotionChange(this.referenceScene.motion);
          }
        })
        .catch((referenceError) => {
          console.error("Target motion preview could not be initialized", referenceError);
          this.referenceScene.setStatus(referenceError.message || String(referenceError), true);
        });
      await referenceLoad;
      if (!this.userModelRequested) this.showEmptyRobotScene();
      this.dropHint.hidden = false;
      const query = new URLSearchParams(globalThis.location?.search || "");
      const debugPreset = query.has("umrDebug") ? query.get("robotPreset") : "";
      if (debugPreset) await this.loadRobotPreset(debugPreset);
    } catch (error) {
      this.handleError(error, "Studio initialization failed");
    } finally {
      if (!this.userModelRequested) this.loading.hidden = true;
    }
  }

  async robotPresetCatalog() {
    if (!this.robotPresetCatalogPromise) {
      this.robotPresetCatalogPromise = fetch(ROBOT_PRESET_CATALOG_URL)
        .then((response) => {
          if (!response.ok) throw new Error(`Could not load robot presets (${response.status}).`);
          return response.json();
        });
    }
    return this.robotPresetCatalogPromise;
  }

  bindRobotPresetCards() {
    document.querySelectorAll("[data-umr-robot-preset]").forEach((card) => {
      const presetId = card.dataset.umrRobotPreset;
      card.addEventListener("dragstart", (event) => {
        if (!event.dataTransfer) return;
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(ROBOT_PRESET_DRAG_TYPE, presetId);
        event.dataTransfer.setData("text/plain", `umr-robot-preset:${presetId}`);
        card.classList.add("is-dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
    });
  }

  robotPresetIdFromDrop(dataTransfer) {
    const exact = dataTransfer?.getData(ROBOT_PRESET_DRAG_TYPE) || "";
    if (exact) return exact;
    const fallback = dataTransfer?.getData("text/plain") || "";
    return fallback.startsWith("umr-robot-preset:")
      ? fallback.slice("umr-robot-preset:".length)
      : "";
  }

  async loadRobotPreset(presetId) {
    if (!presetId || this.jobId) return;
    this.prioritizeUserAssetLoad();
    this.root.dataset.modelState = "loading";
    this.setPresetCardState(presetId, "loading");
    try {
      const catalog = await this.robotPresetCatalog();
      const preset = catalog.robots?.find((candidate) => candidate.id === presetId);
      if (!preset) throw new Error(`Unknown Studio robot preset: ${presetId}`);
      const assetRoot = new URL(preset.asset_root, ROBOT_PRESET_CATALOG_URL);
      const totalMB = (Number(preset.total_bytes || 0) / (1024 * 1024)).toFixed(1);
      this.setLoadingOverlay(
        `Loading ${preset.display_name}…`,
        `${preset.files.length} referenced files · ${totalMB} MB · downloaded only when selected.`,
        true
      );
      this.setStatus(`Loading ${preset.display_name} robot assets…`, "loading");
      const descriptors = await this.mapWithConcurrency(preset.files, 6, async (filePath) => {
        const response = await fetch(new URL(filePath, assetRoot));
        if (!response.ok) throw new Error(`Could not fetch ${preset.display_name} asset: ${filePath}`);
        const blob = await response.blob();
        return {
          file: new File([blob], filePath.split("/").pop()),
          path: filePath
        };
      });
      await this.loadFileObjects(descriptors, {
        autoLoadSingle: true,
        showModelBrowser: false
      });
      if (!this.model || cleanPath(this.currentModelPath) !== cleanPath(preset.model_path)) {
        throw new Error(`${preset.display_name} MJCF did not finish loading.`);
      }
      this.applyRobotPresetTPose(preset);
      this.activeRobotPresetId = preset.id;
      this.setRobotAssetSource("preset");
      this.setPresetCardState(preset.id, "ready");
    } catch (error) {
      this.root.dataset.modelState = this.model ? "ready" : "empty";
      if (!this.model) {
        this.showEmptyEnvironment();
        this.dropHint.hidden = false;
      }
      this.setPresetCardState(presetId, "error");
      this.handleError(error, "Could not load the Studio robot preset");
      this.loading.hidden = true;
    }
  }

  setPresetCardState(activeId = "", state = "") {
    document.querySelectorAll("[data-umr-robot-preset]").forEach((card) => {
      const active = card.dataset.umrRobotPreset === activeId;
      card.classList.toggle("is-loading", active && state === "loading");
      card.classList.toggle("is-active", active && state === "ready");
      card.classList.toggle("has-error", active && state === "error");
      card.setAttribute("aria-pressed", String(active && state === "ready"));
      const label = card.querySelector(".umr-studio-robot-drag-label");
      if (label) {
        label.textContent = active && state === "loading"
          ? "Loading…"
          : active && state === "ready"
            ? "Loaded"
            : "Drag to Studio";
      }
    });
  }

  setRobotAssetSource(source = "empty") {
    const normalized = source === "custom" || source === "preset" ? source : "empty";
    this.robotAssetSource = normalized;
    this.root.dataset.robotSource = normalized;
    if (this.customTPoseReminder) {
      this.customTPoseReminder.hidden = normalized !== "custom";
    }
  }

  applyRobotPresetTPose(preset) {
    if (!this.model || !this.data) return;
    this.data.qpos.set(this.model.qpos0);
    const jointsByName = new Map(this.scalarJoints().map((joint) => [joint.name, joint]));
    const missing = [];
    let applied = 0;
    for (const [name, rawValue] of Object.entries(preset.tpose_qpos || {})) {
      const joint = jointsByName.get(name);
      if (!joint) {
        missing.push(name);
        continue;
      }
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      this.data.qpos[joint.qposAddress] = value;
      applied += 1;
    }
    this.module.mj_forward(this.model, this.data);
    this.syncScene();
    this.refreshJointControls();
    this.updateModelEnvironment();
    this.fitCamera();
    const centerBody = String(preset.point_cloud_center || "");
    if (centerBody && [...this.rootBodySelect.options].some((option) => option.value === centerBody)) {
      this.rootBodySelect.value = centerBody;
    }
    this.retargetTPose = [...this.data.qpos];
    this.setTPoseGuideState("complete");
    this.setPipelineStatus("", 0, "Stage 1 · Configured T-pose loaded. Choose a reference motion, then start retargeting.");
    this.setStatus(
      `${preset.display_name} loaded in its configured UMR T-pose · ${applied} joint values applied${missing.length ? ` · ${missing.length} unmatched` : ""}.`,
      missing.length ? "error" : "ready"
    );
  }

  async loadFileObjects(
    inputFiles,
    { autoLoadSingle = false, userInitiated = false, showModelBrowser = true } = {}
  ) {
    if (!inputFiles.length) return;
    if (userInitiated) this.prioritizeUserAssetLoad();
    if (!this.module) {
      try {
        await this.ensureMujocoReady();
      } catch (error) {
        this.handleError(error, "MuJoCo runtime could not be prepared");
        this.loading.hidden = true;
        return;
      }
    }
    if (this.jobId) {
      this.setStatus("Cancel the active retargeting job before loading another robot.", "error");
      return;
    }
    const rawDescriptors = inputFiles.map((item) => {
      if (item.file) return item;
      return {
        file: item,
        path: normalizePath(item.webkitRelativePath || item.name)
      };
    });
    const sharedRoot = this.findSharedRoot(rawDescriptors.map(({ path, file }) =>
      cleanPath(path || file.name)
    ));
    const descriptors = rawDescriptors.map(({ file, path: rawPath }) => {
      let relativePath = cleanPath(rawPath || file.name);
      if (sharedRoot && relativePath.startsWith(`${sharedRoot}/`)) {
        relativePath = relativePath.slice(sharedRoot.length + 1);
      }
      return { file, path: relativePath };
    });
    const xmlFiles = descriptors.filter(({ file, path: filePath }) =>
      file.name.toLowerCase().endsWith(".xml") || filePath.toLowerCase().endsWith(".xml")
    );
    if (!xmlFiles.length) {
      this.setStatus("No .xml MJCF file found in the selected folder.", "error");
      return;
    }

    this.resetForModelSelection();
    this.root.dataset.modelState = "indexing";
    this.setLoadingOverlay(
      "Indexing robot folder…",
      `${descriptors.length} local files · mesh data will wait until an XML is selected.`,
      true
    );
    this.setStatus(`Indexing ${descriptors.length} local file(s)…`, "loading");
    try {
      const xmlRecords = await this.mapWithConcurrency(xmlFiles, 8, async (entry) => ({
        ...entry,
        text: await entry.file.text()
      }));
      const fileIndex = this.buildFileIndex(descriptors);
      const modelRecords = this.findModelRecords(xmlRecords);
      if (!modelRecords.length) {
        throw new Error("No loadable MJCF model or scene XML was found.");
      }
      if (userInitiated) this.setRobotAssetSource("custom");
      this.disposeModel();
      this.jointList.replaceChildren();
      this.controls.target.set(0, 0, 0.8);
      this.camera.position.set(2.4, -2.4, 1.7);
      this.camera.near = 0.01;
      this.camera.far = 100;
      this.camera.updateProjectionMatrix();
      this.controls.update();
      this.modelWorkspace = { descriptors, xmlRecords, fileIndex };
      this.currentModelPath = "";
      this.currentCompiledXmlText = "";
      this.renderModelBrowser(modelRecords);
      if (!showModelBrowser) this.modelBrowser.hidden = true;
      this.root.dataset.modelState = "selecting";
      this.primeModelAssets(modelRecords[0]);
      this.modelInfo.textContent = `${modelRecords.length} MJCF model(s) indexed · choose one below`;
      this.setStatus(
        `${descriptors.length} files indexed · choose one of ${modelRecords.length} MJCF model(s)`,
        "ready"
      );
      this.modelSelectHint.hidden = !showModelBrowser || (autoLoadSingle && modelRecords.length === 1);
      if (autoLoadSingle && modelRecords.length === 1) {
        await this.loadIndexedModel(modelRecords[0]);
      }
    } catch (error) {
      this.root.dataset.modelState = "empty";
      this.setRobotAssetSource("empty");
      this.showEmptyEnvironment();
      this.dropHint.hidden = false;
      this.handleError(error, "Could not index the selected files");
    } finally {
      this.loading.hidden = true;
    }
  }

  createMemfsWorkspace(loaded, loadPlan, mainRecord) {
    const fs = this.module.FS;
    const rootPath = `/umr_robot_${++this.memfsLoadCounter}`;
    const files = [];
    const directories = new Set([rootPath]);
    fs.mkdirTree(rootPath);
    const added = new Set();

    for (const { record, bytes } of loaded) {
      const memfsPaths = loadPlan.aliases.get(record) || new Set([record.path]);
      for (const memfsPath of memfsPaths) {
        const clean = cleanPath(memfsPath);
        if (!clean || added.has(clean)) continue;
        added.add(clean);
        const fullPath = `${rootPath}/${clean}`;
        const parentPath = fullPath.slice(0, fullPath.lastIndexOf("/"));
        fs.mkdirTree(parentPath);
        let current = parentPath;
        while (current.startsWith(rootPath)) {
          directories.add(current);
          if (current === rootPath) break;
          current = current.slice(0, current.lastIndexOf("/"));
        }
        fs.writeFile(fullPath, bytes, { canOwn: true });
        files.push(fullPath);
      }
    }
    return {
      files,
      directories,
      modelPath: `${rootPath}/${cleanPath(mainRecord.path)}`
    };
  }

  cleanupMemfsWorkspace(workspace) {
    if (!workspace) return;
    const fs = this.module.FS;
    for (const filePath of workspace.files) {
      try { fs.unlink(filePath); } catch {}
    }
    for (const directory of [...workspace.directories].sort((a, b) => b.length - a.length)) {
      try { fs.rmdir(directory); } catch {}
    }
  }

  readFileBytes(record, xmlTextByFile = null) {
    const file = record.file;
    let promise = this.fileBytesCache.get(file);
    if (!promise) {
      const xmlText = xmlTextByFile?.get(file);
      promise = xmlText === undefined
        ? file.arrayBuffer().then((buffer) => new Uint8Array(buffer))
        : Promise.resolve(new TextEncoder().encode(xmlText));
      this.fileBytesCache.set(file, promise);
      promise.catch(() => {
        if (this.fileBytesCache.get(file) === promise) this.fileBytesCache.delete(file);
      });
    }
    return promise;
  }

  primeModelAssets(mainRecord) {
    if (!this.modelWorkspace || !mainRecord) return;
    const { xmlRecords, fileIndex } = this.modelWorkspace;
    const loadPlan = this.buildDependencyPlan(mainRecord, xmlRecords, fileIndex);
    if (loadPlan.missing.length) return;
    const xmlTextByFile = new Map(xmlRecords.map((record) => [record.file, record.text]));
    void Promise.all(
      loadPlan.records.map((record) => this.readFileBytes(record, xmlTextByFile))
    ).catch((error) => {
      console.debug("Robot asset prefetch skipped", error);
    });
  }


  async loadIndexedModel(mainRecord) {
    if (!this.module || !this.modelWorkspace || !mainRecord) return;
    if (this.jobId) {
      this.setStatus("Cancel the active retargeting job before changing MJCF.", "error");
      return;
    }
    const { descriptors, xmlRecords, fileIndex } = this.modelWorkspace;
    let memfsWorkspace = null;
    this.modelSelectHint.hidden = true;
    this.loading.hidden = false;
    const loadStartedAt = performance.now();
    this.setModelOptionsDisabled(true);
    try {
      const loadPlan = this.buildDependencyPlan(mainRecord, xmlRecords, fileIndex);
      if (loadPlan.missing.length) {
        const preview = loadPlan.missing.slice(0, 6).join(", ");
        const more = loadPlan.missing.length > 6 ? ` (+${loadPlan.missing.length - 6} more)` : "";
        throw new Error(`Missing referenced asset(s): ${preview}${more}`);
      }
      const planReadyAt = performance.now();
      const totalBytes = loadPlan.records.reduce((sum, record) => sum + record.file.size, 0);
      const totalMB = (totalBytes / (1024 * 1024)).toFixed(totalBytes >= 10 * 1024 * 1024 ? 0 : 1);
      this.setLoadingOverlay(
        "Reading referenced robot assets…",
        `${loadPlan.records.length} files · ${totalMB} MB · cached reads are reused.`,
        true
      );
      this.setStatus(
        `Loading ${mainRecord.path} · ${loadPlan.records.length} referenced file(s), ${totalMB} MB…`,
        "loading"
      );
      await nextFrame();

      const xmlTextByFile = new Map(xmlRecords.map((record) => [record.file, record.text]));
      const loaded = await Promise.all(loadPlan.records.map(async (record) => ({
        record,
        bytes: await this.readFileBytes(record, xmlTextByFile)
      })));
      const bytesReadyAt = performance.now();
      memfsWorkspace = this.createMemfsWorkspace(loaded, loadPlan, mainRecord);
      const memfsReadyAt = performance.now();

      const preparedRobot = prepareFloatingRobotXml(mainRecord.text);
      this.module.FS.writeFile(
        memfsWorkspace.modelPath,
        new TextEncoder().encode(preparedRobot.xml)
      );

      this.setStatus(`Compiling ${mainRecord.path} with MuJoCo…`, "loading");
      this.setLoadingOverlay(
        "Compiling selected MJCF…",
        `${mainRecord.path} · MuJoCo is building the interactive joint model.`,
        true
      );
      await nextFrame();
      const compiledModel = this.module.MjModel.from_xml_path(memfsWorkspace.modelPath);
      if (!compiledModel) throw new Error("MuJoCo returned an empty model.");
      const compiledAt = performance.now();
      this.setLoadingOverlay(
        "Building interactive scene…",
        "MuJoCo model ready · preparing robot meshes and joint controls.",
        true
      );
      await nextFrame();
      this.currentModelPath = mainRecord.path;
      this.installModel(compiledModel, mainRecord.path);
      this.currentCompiledXmlText = preparedRobot.xml;
      const sceneReadyAt = performance.now();
      const timings = {
        dependencyPlanMs: planReadyAt - loadStartedAt,
        fileReadMs: bytesReadyAt - planReadyAt,
        memfsWriteMs: memfsReadyAt - bytesReadyAt,
        compileMs: compiledAt - memfsReadyAt,
        sceneBuildMs: sceneReadyAt - compiledAt,
        totalMs: sceneReadyAt - loadStartedAt
      };
      this.root.dataset.modelLoadTimings = JSON.stringify(timings);
      console.info("MJCF load timings", mainRecord.path, timings);
      this.markActiveModel(mainRecord.path);
      this.setStatus(
        `${mainRecord.file.name} loaded in ${((performance.now() - loadStartedAt) / 1000).toFixed(2)} s · ${loadPlan.records.length}/${descriptors.length} files · ${this.model.njnt} joints · ${this.model.ngeom} geoms${preparedRobot.addedFreejoint ? " · floating root added" : ""}`,
        "ready"
      );
    } catch (error) {
      this.modelSelectHint.hidden = false;
      this.handleError(error, `Could not compile ${mainRecord.path}`);
    } finally {
      this.cleanupMemfsWorkspace(memfsWorkspace);
      this.loading.hidden = true;
      this.setModelOptionsDisabled(false);
    }
  }

  findModelRecords(xmlRecords) {
    const loadable = xmlRecords.filter((record) => {
      if (!/<mujoco\b/i.test(record.text)) return false;
      return /<worldbody\b/i.test(record.text) || /<include\b/i.test(record.text);
    });
    const candidates = loadable.length ? loadable : xmlRecords.filter((record) => /<mujoco\b/i.test(record.text));
    return [...candidates].sort((a, b) => this.modelRecordScore(a, xmlRecords) - this.modelRecordScore(b, xmlRecords));
  }

  modelRecordScore(item, xmlRecords) {
    const includedNames = new Set();
    for (const record of xmlRecords) {
      for (const match of record.text.matchAll(/<include\b[^>]*\bfile\s*=\s*["']([^"']+)["']/gi)) {
        includedNames.add(cleanPath(match[1]).split("/").pop().toLowerCase());
      }
    }
    const filePath = cleanPath(item.path || item.file.name).toLowerCase();
    const name = item.file.name.toLowerCase();
    let value = filePath.split("/").length * 10;
    if (name === "scene.xml") value -= 80;
    else if (name === "main.xml") value -= 70;
    else if (name === "robot.xml") value -= 60;
    else if (name === "model.xml") value -= 50;
    if (includedNames.has(name)) value += 100;
    if (/<worldbody\b/i.test(item.text)) value -= 10;
    return value;
  }

  renderModelBrowser(modelRecords) {
    this.modelOptions = modelRecords;
    this.modelBrowser.hidden = false;
    this.modelCount.textContent = `${modelRecords.length} MJCF`;
    this.modelSearch.value = "";
    this.modelList.replaceChildren();
    modelRecords.forEach((record, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mj-model-option";
      button.dataset.modelPath = record.path;
      button.setAttribute("role", "option");

      const main = document.createElement("span");
      main.className = "mj-model-option-main";
      const name = document.createElement("span");
      name.className = "mj-model-option-name";
      name.textContent = record.file.name;
      const path = document.createElement("span");
      path.className = "mj-model-option-path";
      const modelName = record.text.match(/<mujoco\b[^>]*\bmodel\s*=\s*["']([^"']+)["']/i)?.[1];
      button.dataset.search = `${record.path} ${modelName || ""}`.toLowerCase();
      path.textContent = modelName ? `${record.path} · ${modelName}` : record.path;
      main.append(name, path);
      button.append(main);
      if (index === 0) {
        const badge = document.createElement("span");
        badge.className = "mj-model-badge";
        badge.textContent = "suggested";
        button.append(badge);
      }
      const primeAssets = () => this.primeModelAssets(record);
      button.addEventListener("pointerenter", primeAssets, { once: true });
      button.addEventListener("focus", primeAssets, { once: true });
      button.addEventListener("click", () => this.loadIndexedModel(record));
      this.modelList.append(button);
    });
    this.markActiveModel(this.currentModelPath);
  }

  filterModelOptions() {
    const query = this.modelSearch.value.trim().toLowerCase();
    this.modelList.querySelectorAll(".mj-model-option").forEach((option) => {
      option.hidden = Boolean(query) && !option.dataset.search.includes(query);
    });
  }

  markActiveModel(modelPath) {
    this.modelList.querySelectorAll(".mj-model-option").forEach((option) => {
      const active = Boolean(modelPath) && option.dataset.modelPath === modelPath;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-selected", String(active));
    });
  }

  setModelOptionsDisabled(disabled) {
    this.modelList.querySelectorAll(".mj-model-option").forEach((option) => {
      option.disabled = disabled;
    });
  }

  async loadXmlString(xml, label) {
    const compiledModel = this.module.MjModel.from_xml_string(xml);
    if (!compiledModel) throw new Error("MuJoCo returned an empty model.");
    this.installModel(compiledModel, label);
    this.setStatus("Demo robot ready. Drop your MJCF and its assets into the viewport.", "ready");
  }

  installModel(compiledModel, label) {
    this.clearStageArtifacts();
    this.clearMotion();
    this.disposeModel();
    this.model = compiledModel;
    this.data = new this.module.MjData(this.model);
    this.root.dataset.modelState = "ready";
    // The XML chooser is only useful between folder indexing and model
    // selection. Once a model is ready, recover the sidebar space for the
    // retarget controls; loading a new folder will render it again.
    this.modelBrowser.hidden = true;
    this.dropHint.hidden = false;
    this.module.mj_forward(this.model, this.data);
    this.buildRobotVisuals();
    this.buildJointControls();
    this.populateRootBodies();
    this.runRetargetButton.disabled = false;
    this.modelSelectHint.hidden = true;
    this.setTPoseGuideState("editing");
    this.setPipelineStatus("", 0, "Stage 1 · Edit or confirm the T-pose, then start retargeting.");
    this.modelInfo.textContent =
      `${label} · nq ${this.model.nq} · ${this.model.nbody} bodies · ${this.model.ngeom} geoms`;
    this.syncScene();
    this.updateModelEnvironment();
    this.fitCamera();
    this.retargetTPose = [...this.data.qpos];
    this.setViewStage("editor", { fit: false });
  }

  disposeModel() {
    this.clearRobotVisuals();
    this.data?.delete();
    this.model?.delete();
    this.data = null;
    this.model = null;
  }

  clearRobotVisuals() {
    this.clearBodyHighlight();
    this.hideJointAxis();
    this.hoveredMesh = null;
    this.hoveredBodyId = null;
    this.hoveredJoint = null;
    this.jointDrag = null;
    this.controls.enabled = true;
    this.stage.classList.remove("is-joint-hover", "is-joint-dragging");
    this.ground.visible = false;
    this.groundShadow.visible = false;
    this.bodyGroups.forEach((body) => this.scene.remove(body));
    this.meshes.forEach((mesh) => mesh.material?.dispose());
    this.meshes.length = 0;
    this.bodyGroups.length = 0;
    this.geometryCache.forEach((geometry) => geometry.dispose());
    this.geometryCache.clear();
    this.markSceneDirty({ shadow: true });
  }

  scalarJoints() {
    if (!this.model) return [];
    const joints = [];
    const hinge = this.module.mjtJoint.mjJNT_HINGE.value;
    const slide = this.module.mjtJoint.mjJNT_SLIDE.value;
    for (let id = 0; id < this.model.njnt; id += 1) {
      const type = this.model.jnt_type[id];
      if (type !== hinge && type !== slide) continue;
      let min;
      let max;
      const rangeMin = this.model.jnt_range[id * 2];
      const rangeMax = this.model.jnt_range[id * 2 + 1];
      // In compiled MuJoCo models, an unlimited scalar joint has a zero-width
      // range. Reading jnt_limited directly is avoided because MuJoCo 3.11's
      // WASM binding does not register its bool memory-view type.
      if (Number.isFinite(rangeMin) && Number.isFinite(rangeMax) && rangeMax > rangeMin) {
        min = rangeMin;
        max = rangeMax;
      } else if (type === hinge) {
        min = -Math.PI;
        max = Math.PI;
      } else {
        min = -0.5;
        max = 0.5;
      }
      const name = this.module.mj_id2name(
        this.model,
        this.module.mjtObj.mjOBJ_JOINT.value,
        id
      ) || `joint_${id}`;
      joints.push({
        id,
        name,
        type,
        isHinge: type === hinge,
        qposAddress: this.model.jnt_qposadr[id],
        min,
        max
      });
    }
    return joints;
  }

  buildJointControls() {
    this.jointList.replaceChildren();
    this.jointById.clear();
    this.jointControlMap.clear();
    const joints = this.scalarJoints();
    joints.forEach((joint) => this.jointById.set(joint.id, joint));
    if (!joints.length) {
      const empty = document.createElement("p");
      empty.className = "mj-empty";
      empty.textContent = "No scalar hinge or slide joints were found.";
      this.jointList.append(empty);
      return;
    }

    for (const joint of joints) {
      const row = document.createElement("div");
      row.className = "mj-joint-row";
      row.dataset.jointName = joint.name.toLowerCase();

      const header = document.createElement("div");
      header.className = "mj-joint-header";
      const name = document.createElement("label");
      name.textContent = joint.name;
      name.title = joint.name;
      const value = document.createElement("output");
      header.append(name, value);

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = String(joint.min);
      slider.max = String(joint.max);
      slider.step = String(Math.max((joint.max - joint.min) / 1000, 0.0001));
      slider.value = String(this.data.qpos[joint.qposAddress]);
      slider.dataset.qposAddress = String(joint.qposAddress);

      const updateValue = () => {
        const numeric = this.data.qpos[joint.qposAddress];
        slider.value = String(numeric);
        value.value = joint.isHinge
          ? `${THREE.MathUtils.radToDeg(numeric).toFixed(1)}°`
          : `${numeric.toFixed(3)} m`;
      };
      this.jointControlMap.set(joint.id, { joint, row, slider, value, updateValue });
      updateValue();
      slider.addEventListener("input", () => {
        this.setJointValue(joint, Number(slider.value));
      });
      row.append(header, slider);
      this.jointList.append(row);
    }
    this.filterJoints();
  }

  setJointValue(joint, value) {
    if (!this.model || !this.data || !joint) return;
    this.data.qpos[joint.qposAddress] = clamp(value, joint.min, joint.max);
    this.module.mj_forward(this.model, this.data);
    this.syncScene();
    if (this.currentViewStage === "editor") {
      this.retargetTPose = [...this.data.qpos];
      this.setTPoseGuideState("editing");
    }
    this.jointControlMap.get(joint.id)?.updateValue();
  }

  refreshJointControls() {
    this.jointControlMap.forEach((control) => control.updateValue());
  }

  forwardAndRefreshControls() {
    this.module.mj_forward(this.model, this.data);
    this.syncScene();
    this.refreshJointControls();
    this.updateModelEnvironment();
  }

  focusJointControl(joint) {
    this.jointControlMap.forEach(({ row }) => row.classList.remove("is-active"));
    const control = this.jointControlMap.get(joint.id);
    if (!control) return;
    control.row.classList.add("is-active");
    if (control.row.hidden) {
      this.jointSearch.value = "";
      this.filterJoints();
    }
    control.row.scrollIntoView({ block: "nearest" });
  }

  filterJoints() {
    const query = this.jointSearch.value.trim().toLowerCase();
    this.jointList.querySelectorAll(".mj-joint-row").forEach((row) => {
      row.hidden = Boolean(query) && !row.dataset.jointName.includes(query);
    });
  }

  getGeometry(geomId) {
    const type = this.model.geom_type[geomId];
    const dataId = this.model.geom_dataid[geomId];
    const size = [
      this.model.geom_size[geomId * 3],
      this.model.geom_size[geomId * 3 + 1],
      this.model.geom_size[geomId * 3 + 2]
    ];
    const key = JSON.stringify([type, size, dataId]);
    if (this.geometryCache.has(key)) return [key, this.geometryCache.get(key)];

    const geomTypes = this.module.mjtGeom;
    let geometry;
    if (type === geomTypes.mjGEOM_PLANE.value) {
      const extent = Math.max(this.model.stat.extent || 1, 1);
      geometry = new THREE.PlaneGeometry(
        2 * (size[0] || extent * 2),
        2 * (size[1] || extent * 2)
      );
    } else if (type === geomTypes.mjGEOM_SPHERE.value) {
      geometry = new THREE.SphereGeometry(size[0], 28, 18);
    } else if (type === geomTypes.mjGEOM_CAPSULE.value) {
      geometry = new THREE.CapsuleGeometry(size[0], 2 * size[1], 8, 18);
      geometry.rotateX(Math.PI / 2);
    } else if (type === geomTypes.mjGEOM_ELLIPSOID.value) {
      geometry = new THREE.SphereGeometry(1, 28, 18);
      geometry.scale(size[0], size[1], size[2]);
    } else if (type === geomTypes.mjGEOM_CYLINDER.value) {
      geometry = new THREE.CylinderGeometry(size[0], size[0], 2 * size[1], 28);
      geometry.rotateX(Math.PI / 2);
    } else if (type === geomTypes.mjGEOM_BOX.value) {
      geometry = new THREE.BoxGeometry(2 * size[0], 2 * size[1], 2 * size[2]);
    } else if (type === geomTypes.mjGEOM_MESH.value && dataId >= 0) {
      geometry = this.buildMeshGeometry(dataId);
    } else {
      geometry = new THREE.SphereGeometry(Math.max(size[0] || 0.015, 0.015), 12, 8);
    }
    this.geometryCache.set(key, geometry);
    return [key, geometry];
  }

  buildMeshGeometry(meshId) {
    const vertexStart = this.model.mesh_vertadr[meshId];
    const vertexCount = this.model.mesh_vertnum[meshId];
    const faceStart = this.model.mesh_faceadr[meshId];
    const faceCount = this.model.mesh_facenum[meshId];
    const positions = new Float32Array(vertexCount * 3);
    positions.set(this.model.mesh_vert.subarray(vertexStart * 3, (vertexStart + vertexCount) * 3));
    const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;
    const indices = new IndexArray(faceCount * 3);
    indices.set(this.model.mesh_face.subarray(faceStart * 3, (faceStart + faceCount) * 3));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  buildRobotVisuals() {
    const geomTypes = this.module.mjtGeom;
    for (let bodyId = 0; bodyId < this.model.nbody; bodyId += 1) {
      const body = new THREE.Group();
      this.bodyGroups[bodyId] = body;
      this.scene.add(body);
    }

    for (let geomId = 0; geomId < this.model.ngeom; geomId += 1) {
      // MuJoCo and robot_viewer use geom groups 0–2 for normal visuals.
      // Group 3 is conventionally collision geometry and is hidden here.
      if (this.model.geom_group[geomId] >= 3) continue;
      const type = this.model.geom_type[geomId];
      const isGroundGeom = type === geomTypes.mjGEOM_PLANE.value;
      const [, geometry] = this.getGeometry(geomId);
      const rgba = this.geomColor(geomId);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(rgba[0], rgba[1], rgba[2]),
        opacity: rgba[3],
        transparent: rgba[3] < 0.999,
        roughness: 0.72,
        metalness: 0.03,
        side: type === geomTypes.mjGEOM_PLANE.value ? THREE.DoubleSide : THREE.FrontSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.bodyId = this.model.geom_bodyid[geomId];
      mesh.userData.geomId = geomId;
      mesh.userData.isGroundGeom = isGroundGeom;
      mesh.userData.baseOpacity = material.opacity;
      mesh.userData.baseTransparent = material.transparent;
      mesh.castShadow = !isGroundGeom;
      // Keep the ground contact shadow, but do not sample a moving geom's own
      // depth map. Self-reception caused shadow acne and grid-like striping.
      mesh.receiveShadow = false;
      // Keep framing stable and avoid z-fighting with the viewer-owned floor.
      mesh.visible = !isGroundGeom;
      mesh.position.fromArray(this.model.geom_pos, geomId * 3);
      mesh.quaternion.set(
        this.model.geom_quat[geomId * 4 + 1],
        this.model.geom_quat[geomId * 4 + 2],
        this.model.geom_quat[geomId * 4 + 3],
        this.model.geom_quat[geomId * 4]
      );
      this.meshes.push(mesh);
      this.bodyGroups[this.model.geom_bodyid[geomId]].add(mesh);
    }
  }

  geomColor(geomId) {
    const materialId = this.model.geom_matid[geomId];
    const rgba = materialId >= 0 ? this.model.mat_rgba : this.model.geom_rgba;
    const offset = (materialId >= 0 ? materialId : geomId) * 4;
    return [rgba[offset], rgba[offset + 1], rgba[offset + 2], rgba[offset + 3]];
  }

  syncScene() {
    if (!this.model || !this.data) return;
    for (let bodyId = 0; bodyId < this.bodyGroups.length; bodyId += 1) {
      const body = this.bodyGroups[bodyId];
      body.position.fromArray(this.data.xpos, bodyId * 3);
      body.quaternion.set(
        this.data.xquat[bodyId * 4 + 1],
        this.data.xquat[bodyId * 4 + 2],
        this.data.xquat[bodyId * 4 + 3],
        this.data.xquat[bodyId * 4]
      );
    }
    if (this.hoveredJoint) this.updateJointAxis(this.hoveredJoint);
    this.markSceneDirty({ shadow: true });
  }

  // Direct manipulation follows Robot Viewer's ray-hit / parent-joint / axis-plane approach.
  initJointInteraction() {
    this.jointRaycaster = new THREE.Raycaster();
    this.jointPointer = new THREE.Vector2();
    this.jointDrag = null;
    this.hoveredMesh = null;
    this.hoveredBodyId = null;
    this.hoveredJoint = null;
    this.highlightedMeshes = [];
    this.createJointAxisHelper();
    this.scene.add(this.jointAxisHelper);

    this.onJointPointerDown = (event) => {
      if (
        event.button !== 0 ||
        !this.model ||
        !this.data ||
        this.motionPlaying ||
        this.taskLocked ||
        this.currentViewStage !== "editor"
      ) return;
      this.setPointerRay(event);
      const hit = this.findDraggableHit();
      if (!hit) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.controls.enabled = false;
      this.canvas.setPointerCapture?.(event.pointerId);
      const point = this.jointRaycaster.ray.at(hit.intersection.distance, new THREE.Vector3());
      this.jointDrag = {
        pointerId: event.pointerId,
        joint: hit.joint,
        mesh: hit.intersection.object,
        hitDistance: hit.intersection.distance,
        previousPoint: point.clone(),
        initialGrabPoint: hit.intersection.point.clone()
      };
      this.setHoveredHit(hit);
      this.stage.classList.add("is-joint-dragging");
      this.focusJointControl(hit.joint);
      this.setStatus(`Dragging ${hit.joint.name}…`, "ready");
    };

    this.onJointPointerMove = (event) => {
      if (!this.model || !this.data) return;
      this.setPointerRay(event);
      if (!this.jointDrag) {
        if (this.taskLocked) {
          this.setHoveredHit(null);
          return;
        }
        // Camera manipulation must not raycast the complete robot for every
        // pointer event. Hover resumes immediately after the button is up.
        if (event.buttons) {
          this.setHoveredHit(null);
          return;
        }
        const hit = this.findDraggableHit();
        this.setHoveredHit(hit);
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const drag = this.jointDrag;
      const nextPoint = this.jointRaycaster.ray.at(drag.hitDistance, new THREE.Vector3());
      const delta = drag.joint.isHinge
        ? this.getHingeDragDelta(drag.joint, drag.previousPoint, nextPoint, drag.initialGrabPoint)
        : this.getSlideDragDelta(drag.joint, drag.previousPoint, nextPoint);
      if (Number.isFinite(delta) && Math.abs(delta) > 1e-7) {
        const current = this.data.qpos[drag.joint.qposAddress];
        this.setJointValue(drag.joint, current + delta);
      }
      drag.previousPoint.copy(nextPoint);
    };

    this.onJointPointerUp = (event) => {
      if (!this.jointDrag || (event.pointerId !== undefined && event.pointerId !== this.jointDrag.pointerId)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const joint = this.jointDrag.joint;
      this.canvas.releasePointerCapture?.(this.jointDrag.pointerId);
      this.jointDrag = null;
      this.controls.enabled = true;
      this.stage.classList.remove("is-joint-dragging");
      const value = this.data.qpos[joint.qposAddress];
      const formatted = joint.isHinge
        ? `${THREE.MathUtils.radToDeg(value).toFixed(1)}°`
        : `${value.toFixed(3)} m`;
      this.setStatus(`${joint.name} set to ${formatted}`, "ready");
      this.updateModelEnvironment();
    };

    this.onJointPointerLeave = () => {
      if (!this.jointDrag) this.setHoveredHit(null);
    };

    this.canvas.addEventListener("pointerdown", this.onJointPointerDown, true);
    this.canvas.addEventListener("pointermove", this.onJointPointerMove, true);
    this.canvas.addEventListener("pointerup", this.onJointPointerUp, true);
    this.canvas.addEventListener("pointercancel", this.onJointPointerUp, true);
    this.canvas.addEventListener("pointerleave", this.onJointPointerLeave, true);
  }

  setPointerRay(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.jointPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.jointRaycaster.setFromCamera(this.jointPointer, this.camera);
  }

  findDraggableHit() {
    const intersections = this.jointRaycaster.intersectObjects(this.meshes, false);
    for (const intersection of intersections) {
      if (!intersection.object.visible) continue;
      const joint = this.findJointForBody(intersection.object.userData.bodyId);
      if (joint) return { intersection, joint };
    }
    return null;
  }

  findJointForBody(bodyId) {
    let currentBody = Number(bodyId);
    while (Number.isInteger(currentBody) && currentBody > 0) {
      const start = this.model.body_jntadr[currentBody];
      const count = this.model.body_jntnum[currentBody];
      for (let offset = 0; offset < count; offset += 1) {
        const joint = this.jointById.get(start + offset);
        if (joint) return joint;
      }
      currentBody = this.model.body_parentid[currentBody];
    }
    return null;
  }

  getJointWorldFrame(joint) {
    const pivot = new THREE.Vector3();
    const axis = new THREE.Vector3();
    if (this.data.xanchor && this.data.xaxis) {
      pivot.fromArray(this.data.xanchor, joint.id * 3);
      axis.fromArray(this.data.xaxis, joint.id * 3).normalize();
    } else {
      const bodyId = this.model.jnt_bodyid[joint.id];
      const body = this.bodyGroups[bodyId];
      body.updateMatrixWorld(true);
      pivot.fromArray(this.model.jnt_pos, joint.id * 3).applyMatrix4(body.matrixWorld);
      axis.fromArray(this.model.jnt_axis, joint.id * 3).applyQuaternion(body.quaternion).normalize();
    }
    return { pivot, axis };
  }

  getHingeDragDelta(joint, startPoint, endPoint, initialGrabPoint) {
    const { pivot, axis } = this.getJointWorldFrame(joint);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(axis, pivot);
    const viewDirection = this.camera.position.clone().sub(initialGrabPoint).normalize();
    if (Math.abs(viewDirection.dot(axis)) > 0.3) {
      const start = plane.projectPoint(startPoint, new THREE.Vector3()).sub(pivot);
      const end = plane.projectPoint(endPoint, new THREE.Vector3()).sub(pivot);
      if (start.lengthSq() < 1e-12 || end.lengthSq() < 1e-12) return 0;
      start.normalize();
      end.normalize();
      const cross = new THREE.Vector3().crossVectors(start, end);
      return Math.atan2(axis.dot(cross), clamp(start.dot(end), -1, 1));
    }
    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const tangent = cameraForward.cross(axis).normalize();
    return tangent.dot(new THREE.Vector3().subVectors(endPoint, startPoint));
  }

  getSlideDragDelta(joint, startPoint, endPoint) {
    const { axis } = this.getJointWorldFrame(joint);
    return new THREE.Vector3().subVectors(endPoint, startPoint).dot(axis);
  }

  createJointAxisHelper() {
    const axisMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2d2d,
      depthTest: false,
      depthWrite: false
    });
    const directionMaterial = new THREE.MeshBasicMaterial({
      color: 0x25e06f,
      depthTest: false,
      depthWrite: false
    });

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.7, 16),
      axisMaterial
    );
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = 0.35;

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.3, 20),
      axisMaterial
    );
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.85;

    this.jointRotationArc = new THREE.Group();
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.012, 8, 48, Math.PI * 1.5),
      directionMaterial
    );
    const arcHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.1, 12),
      directionMaterial
    );
    arcHead.position.set(0, -0.25, 0);
    arcHead.rotation.z = -Math.PI / 2;
    this.jointRotationArc.add(arc, arcHead);

    this.jointAxisHelper = new THREE.Group();
    this.jointAxisHelper.add(shaft, head, this.jointRotationArc);
    this.jointAxisHelper.visible = false;
    this.jointAxisHelper.renderOrder = 20;
    this.jointAxisHelper.traverse((object) => {
      if (object.isMesh) object.renderOrder = 20;
    });
  }

  setHoveredHit(hit) {
    const mesh = hit?.intersection?.object || null;
    const joint = hit?.joint || null;
    const bodyId = mesh ? Number(mesh.userData.bodyId) : null;
    if (this.hoveredBodyId === bodyId && this.hoveredJoint?.id === joint?.id) {
      if (joint) this.updateJointAxis(joint);
      return;
    }

    this.clearBodyHighlight();
    this.hoveredMesh = mesh;
    this.hoveredBodyId = bodyId;
    this.hoveredJoint = joint;

    if (mesh && joint) {
      const white = new THREE.Color(0xffffff);
      this.highlightedMeshes = this.meshes.filter((candidate) => {
        if (!candidate.visible || candidate.userData.isGroundGeom) return false;
        return this.findJointForBody(candidate.userData.bodyId)?.id === joint.id;
      });
      for (const candidate of this.highlightedMeshes) {
        const material = candidate.material;
        if (!material?.color || !material?.emissive) continue;
        if (!candidate.userData.baseColor) {
          candidate.userData.baseColor = material.color.clone();
          candidate.userData.baseEmissive = material.emissive.clone();
          candidate.userData.baseEmissiveIntensity = material.emissiveIntensity;
        }
        material.color.copy(candidate.userData.baseColor).lerp(white, 0.58);
        material.emissive.setHex(0xffffff);
        material.emissiveIntensity = 0.25;
      }
      this.updateJointAxis(joint);
    } else {
      this.hideJointAxis();
    }
    this.stage.classList.toggle("is-joint-hover", Boolean(mesh && joint));
    this.markSceneDirty();
  }

  clearBodyHighlight() {
    for (const mesh of this.highlightedMeshes || []) {
      this.restoreMeshHighlight(mesh);
    }
    this.highlightedMeshes = [];
  }

  restoreMeshHighlight(mesh) {
    const material = mesh?.material;
    if (!material || !mesh.userData.baseColor) return;
    material.color.copy(mesh.userData.baseColor);
    material.emissive.copy(mesh.userData.baseEmissive);
    material.emissiveIntensity = mesh.userData.baseEmissiveIntensity;
  }

  updateJointAxis(joint) {
    if (!joint || !this.model || !this.data) return;
    const { pivot, axis } = this.getJointWorldFrame(joint);
    const bounds = this.getRobotBounds();
    const size = bounds?.getSize(new THREE.Vector3()) || new THREE.Vector3(1, 1, 1);
    const modelSize = Math.max(size.x, size.y, size.z);
    const length = clamp(modelSize * 0.18, 0.12, 0.55);
    this.jointAxisHelper.position.copy(pivot);
    this.jointAxisHelper.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      axis
    );
    this.jointAxisHelper.scale.setScalar(length);
    this.jointRotationArc.visible = joint.isHinge;
    this.jointAxisHelper.visible = true;
  }

  hideJointAxis() {
    if (this.jointAxisHelper) this.jointAxisHelper.visible = false;
  }

  getRobotBounds() {
    if (!this.model || !this.meshes.length) return null;
    this.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    const meshBounds = new THREE.Box3();
    let found = false;
    for (const mesh of this.meshes) {
      if (!mesh.visible || mesh.userData.isGroundGeom) continue;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      if (!mesh.geometry.boundingBox || mesh.geometry.boundingBox.isEmpty()) continue;
      meshBounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
      bounds.union(meshBounds);
      found = true;
    }
    return found && !bounds.isEmpty() ? bounds : null;
  }

  updateModelEnvironment() {
    const bounds = this.getRobotBounds();
    if (!bounds) {
      this.ground.visible = false;
      this.groundShadow.visible = false;
      return;
    }
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const modelSize = Math.max(size.x, size.y, size.z, 0.1);
    const groundSize = Math.max(modelSize * 12, 8);
    const groundZ = bounds.min.z;
    this.editorGroundState = { center: center.clone(), groundZ, groundSize, modelSize };

    this.ground.position.set(center.x, center.y, groundZ);
    this.ground.scale.set(groundSize, groundSize, 1);
    this.ground.visible = true;

    this.groundShadow.position.set(
      center.x,
      center.y,
      groundZ + Math.max(modelSize * 0.002, 0.003)
    );
    this.groundShadow.scale.set(groundSize, groundSize, 1);
    this.groundShadow.visible = true;

    this.updateViewerLightRig(center);
    const shadowExtent = Math.max(modelSize * 1.4, 1);
    const shadowCamera = this.keyLight.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -shadowExtent;
    shadowCamera.right = shadowCamera.top = shadowExtent;
    const shadowDistance = this.keyLight.position.distanceTo(this.keyLight.target.position);
    const shadowDepthMargin = Math.max(modelSize * 4, 6);
    shadowCamera.near = Math.max(0.5, shadowDistance - shadowDepthMargin);
    shadowCamera.far = shadowDistance + shadowDepthMargin;
    shadowCamera.updateProjectionMatrix();
    this.markSceneDirty({ shadow: true });
  }

  fitCamera() {
    const bounds = this.getRobotBounds();
    if (!bounds) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const modelSize = Math.max(size.x, size.y, size.z);
    if (modelSize < 0.001) return;

    // Robot Viewer framing, adapted from Y-up to MuJoCo's Z-up world.
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = modelSize / (2 * Math.tan(verticalFov / 2)) * 1.8;
    const verticalAngle = Math.PI / 6;
    const horizontalDistance = distance * Math.cos(verticalAngle);
    const diagonal = horizontalDistance / Math.sqrt(2);
    const offset = new THREE.Vector3(
      diagonal,
      -diagonal,
      distance * Math.sin(verticalAngle)
    );

    this.controls.target.copy(center);
    this.camera.position.copy(center).add(offset);
    this.camera.near = Math.max(modelSize / 1000, 0.001);
    this.camera.far = Math.max(modelSize * 100, 20);
    this.controls.minDistance = Math.max(modelSize * 0.05, 0.01);
    this.controls.maxDistance = Math.max(modelSize * 50, 20);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  motionCameraAnchor(frame = this.motionCursor) {
    if (
      Number.isInteger(this.motionCameraFollowBodyId) &&
      this.motionCameraFollowBodyId >= 0 &&
      this.motionCameraFollowBodyId < this.model.nbody
    ) {
      return new THREE.Vector3().fromArray(this.data.xpos, this.motionCameraFollowBodyId * 3);
    }
    const qpos = this.motion?.qpos?.[frame];
    if (Array.isArray(qpos) && qpos.length >= 3) {
      return new THREE.Vector3(Number(qpos[0]), Number(qpos[1]), Number(qpos[2]));
    }
    return this.getRobotBounds()?.getCenter(new THREE.Vector3()) || new THREE.Vector3();
  }

  clearMotionCameraFollow() {
    this.motionCameraFollowBodyId = null;
    this.motionCameraFollowRoot = null;
  }

  initializeMotionCameraFollow(frame = this.motionCursor) {
    const bodyId = this.module.mj_name2id(
      this.model,
      this.module.mjtObj.mjOBJ_BODY.value,
      this.rootBodySelect.value
    );
    this.motionCameraFollowBodyId = bodyId >= 0 ? bodyId : null;
    this.motionCameraFollowRoot = this.motionCameraAnchor(frame);
  }

  updateMotionCameraFollow(frame = this.motionCursor) {
    if (
      this.currentViewStage !== "motion" ||
      !this.motionCameraFollowRoot
    ) return;
    const nextRoot = this.motionCameraAnchor(frame);
    const delta = nextRoot.clone().sub(this.motionCameraFollowRoot);
    delta.z = 0;
    this.controls.target.add(delta);
    this.camera.position.add(delta);
    this.keyLight.position.add(delta);
    this.keyLight.target.position.add(delta);
    this.keyLight.target.updateMatrixWorld();
    for (const light of this.fillLights || []) {
      light.position.add(delta);
      light.target.position.add(delta);
      light.target.updateMatrixWorld();
    }
    this.motionCameraFollowRoot.copy(nextRoot);
  }

  setStageAvailable(stage, available) {
    const button = this.stageViewButtons.find((candidate) => candidate.dataset.view === stage);
    if (button) button.disabled = !available;
  }

  clearStageVisualization() {
    this.stageVisualGroup.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material?.dispose();
      }
    });
    this.stageVisualGroup.clear();
    this.stageLegend.hidden = true;
    this.stageLegendItems.replaceChildren();
    this.markSceneDirty({ shadow: true });
  }

  clearStageArtifacts() {
    this.clearStageVisualization();
    this.samplingArtifact = null;
    this.classificationArtifact = null;
    this.setStageAvailable("sampling", false);
    this.setStageAvailable("classification", false);
  }

  setRobotStagePointCloudOnly(pointCloudOnly) {
    this.setHoveredHit(null);
    for (const mesh of this.meshes) {
      if (!mesh.material || mesh.userData.isGroundGeom) continue;
      mesh.visible = !pointCloudOnly;
      mesh.material.opacity = mesh.userData.baseOpacity;
      mesh.material.transparent = mesh.userData.baseTransparent;
      mesh.material.depthWrite = true;
    }
  }

  applyRetargetTPose() {
    if (!this.model || !this.data || !this.retargetTPose) return;
    if (this.retargetTPose.length !== this.model.nq) return;
    this.data.qpos.set(this.retargetTPose);
    this.module.mj_forward(this.model, this.data);
    this.syncScene();
    this.refreshJointControls();
  }

  setFixedGroundHeight(height) {
    if (!this.editorGroundState || !Number.isFinite(Number(height))) return;
    const { center, groundSize, modelSize } = this.editorGroundState;
    const groundZ = Number(height);
    this.ground.position.set(center.x, center.y, groundZ);
    this.ground.scale.set(groundSize, groundSize, 1);
    this.ground.visible = true;
    this.groundShadow.position.set(
      center.x,
      center.y,
      groundZ + Math.max(modelSize * 0.002, 0.003)
    );
    this.groundShadow.scale.set(groundSize, groundSize, 1);
    this.groundShadow.visible = true;
    this.markSceneDirty({ shadow: true });
  }

  setViewStage(stage, { fit = true } = {}) {
    if (!this.model || !this.data) return;
    if (stage === "sampling" && !this.samplingArtifact) return;
    if (stage === "classification" && !this.classificationArtifact) return;
    if (stage === "motion" && !this.motion) return;

    this.pauseMotion();
    this.clearMotionCameraFollow();
    this.currentViewStage = stage;
    this.controls.enabled = true;
    this.controls.enableDamping = false;
    this.root.dataset.viewStage = stage;
    this.stageViewButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === stage);
    });
    this.jointControlMap.forEach(({ slider }) => {
      slider.disabled = this.taskLocked || stage !== "editor";
    });
    this.clearStageVisualization();
    this.setRobotStagePointCloudOnly(stage === "sampling" || stage === "classification");
    this.interactionObjects.forEach(({ mesh }) => {
      mesh.visible = stage === "motion";
    });

    if (stage === "motion") {
      this.player.hidden = false;
      this.setMotionFrame(this.motionCursor);
      this.setFixedGroundHeight(this.motion.groundHeight);
      if (fit) this.fitCamera();
      this.initializeMotionCameraFollow(this.motionCursor);
      this.updateMotionCameraFollow(this.motionCursor);
      this.showSceneGuideForView(stage);
      return;
    }

    this.player.hidden = true;
    this.applyRetargetTPose();
    this.updateModelEnvironment();
    if (stage === "sampling") this.renderStagePointPair(this.samplingArtifact, false);
    if (stage === "classification") this.renderStagePointPair(this.classificationArtifact, true);
    if (fit) {
      if (stage === "editor") this.fitCamera();
      else this.fitStageVisualization();
    }
    this.showSceneGuideForView(stage);
    this.markSceneDirty({ shadow: true });
  }

  pointCloud(points, { color = 0xffffff, colors = null, size = 0.01 } = {}) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    points.forEach((point, index) => {
      positions[index * 3] = Number(point[0]);
      positions[index * 3 + 1] = Number(point[1]);
      positions[index * 3 + 2] = Number(point[2]);
    });
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    if (colors) geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingBox();
    const material = new THREE.PointsMaterial({
      color: colors ? 0xffffff : color,
      size,
      sizeAttenuation: true,
      vertexColors: Boolean(colors),
      transparent: true,
      opacity: 0.96
    });
    return new THREE.Points(geometry, material);
  }

  pointCloudCenter(centerPoint, { color = 0xffffff, radius = 0.03 } = {}) {
    const coordinates = Array.isArray(centerPoint) && centerPoint.length >= 3
      ? centerPoint.slice(0, 3).map(Number)
      : [0, 0, 0];
    const center = coordinates.every(Number.isFinite)
      ? new THREE.Vector3(...coordinates)
      : new THREE.Vector3();
    const centerColor = new THREE.Color(color);
    const material = new THREE.MeshStandardMaterial({
      color: centerColor,
      emissive: centerColor.clone().multiplyScalar(0.12),
      emissiveIntensity: 0.45,
      roughness: 0.32,
      metalness: 0.08
    });
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 16),
      material
    );
    marker.position.copy(center);
    // The point-cloud center is an annotation, not part of the shaded actor.
    // Keeping it out of the shadow pass avoids a small crawling shadow during
    // stage transitions while preserving its material response to scene light.
    marker.castShadow = false;
    marker.receiveShadow = false;
    return marker;
  }

  segmentColors(segmentIds, correspondenceIds = []) {
    const palette = [
      0xf2c14e, 0x4ea5d9, 0xe76f51, 0x70c1b3, 0xb388eb,
      0xff8fab, 0x3a86ff, 0x90be6d, 0xffbe0b, 0x577590,
      0xf9844a, 0x43aa8b, 0x9b5de5, 0x00b4d8, 0xf15bb5
    ];
    const colors = new Float32Array(segmentIds.length * 3);
    const color = new THREE.Color();
    segmentIds.forEach((partId, index) => {
      color.setHex(palette[(Math.max(1, Number(partId)) - 1) % palette.length]);
      const correspondenceId = Number(correspondenceIds[index] ?? index);
      const hash = Math.imul(correspondenceId + 1, 2654435761) >>> 0;
      const hueOffset = (((hash & 255) / 255) - 0.5) * 0.055;
      const lightOffset = ((((hash >>> 8) & 255) / 255) - 0.5) * 0.18;
      color.offsetHSL(hueOffset, 0, lightOffset);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    });
    return { colors, palette };
  }

  renderStagePointPair(artifact, classified) {
    const bodyId = this.module.mj_name2id(
      this.model,
      this.module.mjtObj.mjOBJ_BODY.value,
      this.rootBodySelect.value
    );
    const centerBody = this.bodyGroups[bodyId >= 0 ? bodyId : 1];
    if (!centerBody) return;
    const sourcePoints = artifact.normalized_source_points;
    const targetPoints = artifact.normalized_target_points;
    if (!Array.isArray(sourcePoints) || !Array.isArray(targetPoints)) {
      throw new Error("Stage visualization requires training-normalized point arrays.");
    }
    // Normalized point clouds have unit-scale height. Point size, center
    // marker size, and inter-cloud gap must therefore also be normalized-space
    // constants rather than values derived from the original robot scale.
    const pointSize = 0.014;
    const centerRadius = 0.035;
    const frame = new THREE.Group();
    frame.position.copy(centerBody.position);
    frame.quaternion.copy(centerBody.quaternion);
    this.stageVisualGroup.add(frame);

    let sourceColors = null;
    let targetColors = null;
    let palette = null;
    if (classified) {
      ({ colors: sourceColors, palette } = this.segmentColors(
        artifact.segment_ids,
        artifact.correspondence_ids
      ));
      targetColors = sourceColors.slice();
    }
    const target = this.pointCloud(targetPoints, {
      color: 0xffa552,
      colors: targetColors,
      size: pointSize
    });
    const source = this.pointCloud(sourcePoints, {
      color: 0x59c3ff,
      colors: sourceColors,
      size: pointSize
    });
    const sourceBounds = source.geometry.boundingBox;
    const targetBounds = target.geometry.boundingBox;
    const normalizedGap = 0.25;
    const sourceOffset = new THREE.Vector3(
      0,
      targetBounds.max.y - sourceBounds.min.y + normalizedGap,
      0
    );
    source.position.copy(sourceOffset);
    const targetCenter = this.pointCloudCenter(artifact.target_center_point, {
      color: 0xffa552,
      radius: centerRadius
    });
    const sourceCenter = this.pointCloudCenter(artifact.source_center_point, {
      color: 0x59c3ff,
      radius: centerRadius
    });
    sourceCenter.position.add(sourceOffset);
    frame.add(target, source, targetCenter, sourceCenter);

    if (classified) {
      this.showStageLegend(
        "Height-normalized, foot-aligned correspondence · same ID uses the same color · spheres mark training centers",
        artifact.segments.map((segment) => ({
          label: segment.name.replaceAll("_", " "),
          color: palette[(Math.max(1, Number(segment.id)) - 1) % palette.length]
        }))
      );
    } else {
      this.showStageLegend("Height-normalized exterior samples · feet at 0, heads at 1 · spheres mark training centers", [
        { label: artifact.source_name, color: 0x59c3ff },
        { label: artifact.target_name, color: 0xffa552 }
      ]);
    }
  }

  showStageLegend(title, entries) {
    this.stageLegendTitle.textContent = title;
    this.stageLegendItems.replaceChildren();
    for (const entry of entries) {
      const item = document.createElement("span");
      item.className = "mj-legend-item";
      const dot = document.createElement("span");
      dot.className = "mj-legend-dot";
      dot.style.backgroundColor = `#${new THREE.Color(entry.color).getHexString()}`;
      const label = document.createElement("span");
      label.textContent = entry.label;
      item.append(dot, label);
      this.stageLegendItems.append(item);
    }
    this.stageLegend.hidden = false;
  }

  fitStageVisualization() {
    this.scene.updateMatrixWorld(true);
    const bounds = this.getRobotBounds() || new THREE.Box3();
    bounds.union(new THREE.Box3().setFromObject(this.stageVisualGroup));
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const modelSize = Math.max(size.x, size.y, size.z, 0.1);
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = modelSize / (2 * Math.tan(verticalFov / 2)) * 1.75;
    const offset = new THREE.Vector3(distance * 0.58, -distance * 0.58, distance * 0.42);
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(offset);
    this.camera.near = Math.max(modelSize / 1000, 0.001);
    this.camera.far = Math.max(modelSize * 100, 20);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  async loadStageArtifact(jobId, kind, signal = null) {
    const response = await fetch(`/api/retarget/jobs/${jobId}/artifacts/${kind}`, { cache: "no-store", signal });
    const artifact = await response.json().catch(() => ({}));
    throwIfAborted(signal);
    if (!response.ok) throw new Error(artifact.error || `Could not load ${kind} visualization.`);
    if (kind === "sampling") {
      if (artifact.format !== "umr-sampling-normalized-v3") {
        throw new Error("Stage 2 requires a training-normalized sampling artifact.");
      }
      this.samplingArtifact = artifact;
      this.setStageAvailable("sampling", true);
      if (this.currentViewStage === "editor") this.setViewStage("sampling");
      return;
    }
    if (artifact.format !== "umr-mesh-binding-normalized-v4") {
      throw new Error("Stage 3 requires a normalized mesh-bound correspondence artifact.");
    }
    this.classificationArtifact = artifact;
    this.setStageAvailable("classification", true);
    if (this.currentViewStage !== "motion") this.setViewStage("classification");
  }

  populateRootBodies() {
    this.rootBodySelect.replaceChildren();
    if (!this.model) {
      this.rootBodySelect.disabled = true;
      return;
    }
    const bodies = [];
    for (let id = 1; id < this.model.nbody; id += 1) {
      const name = this.module.mj_id2name(
        this.model,
        this.module.mjtObj.mjOBJ_BODY.value,
        id
      );
      if (name) bodies.push({ id, name });
    }
    const preferred = [
      "waist_yaw_link", "pelvis", "waist", "torso", "base_link", "base", "root"
    ];
    const score = (name) => {
      const lower = name.toLowerCase();
      const exact = preferred.indexOf(lower);
      if (exact >= 0) return exact;
      const partial = preferred.findIndex((token) => lower.includes(token));
      return partial >= 0 ? 20 + partial : 100;
    };
    bodies.sort((a, b) => score(a.name) - score(b.name) || a.id - b.id);
    for (const body of bodies) {
      const option = document.createElement("option");
      option.value = body.name;
      option.textContent = body.name;
      this.rootBodySelect.append(option);
    }
    this.rootBodySelect.disabled = !bodies.length;
  }

  currentTPoseJointMap() {
    const values = {};
    for (const joint of this.scalarJoints()) {
      values[joint.name] = Number(this.data.qpos[joint.qposAddress]);
    }
    return values;
  }

  currentPointCloudCenterRatio() {
    if (!this.model || !this.data) {
      throw new Error("Load a robot before computing its point-cloud center ratio.");
    }
    const bounds = this.getRobotBounds();
    if (!bounds) {
      throw new Error("The robot surface bounds are unavailable.");
    }
    const height = bounds.max.z - bounds.min.z;
    if (!Number.isFinite(height) || height <= 1e-8) {
      throw new Error("The robot has an invalid surface height.");
    }
    const bodyId = this.module.mj_name2id(
      this.model,
      this.module.mjtObj.mjOBJ_BODY.value,
      this.rootBodySelect.value
    );
    if (bodyId < 0) {
      throw new Error(`The selected center body ${this.rootBodySelect.value} was not found.`);
    }
    const centerZ = Number(this.data.xpos[bodyId * 3 + 2]);
    const ratio = (centerZ - bounds.min.z) / height;
    if (!Number.isFinite(ratio) || ratio < -1e-6 || ratio > 1 + 1e-6) {
      throw new Error(
        `The selected center body lies outside the robot surface bbox (ratio=${ratio}).`
      );
    }
    return clamp(ratio, 0, 1);
  }

  resetForModelSelection() {
    this.clearStageArtifacts();
    this.clearMotion();
    this.disposeModel();
    this.modelWorkspace = null;
    this.currentModelPath = "";
    this.currentCompiledXmlText = "";
    this.modelOptions = [];
    this.modelList.replaceChildren();
    this.modelBrowser.hidden = true;
    this.modelSelectHint.hidden = true;
    this.jointList.replaceChildren();
    this.rootBodySelect.replaceChildren();
    this.rootBodySelect.disabled = true;
    this.runRetargetButton.disabled = true;
    this.retargetTPose = null;
    this.editorGroundState = null;
    this.currentViewStage = "editor";
    this.root.dataset.viewStage = "editor";
    this.stageViewButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === "editor");
    });
    this.tposeConfirmed = false;
    this.lastPipelineStage = "";
    this.activeRobotPresetId = "";
    this.setRobotAssetSource("empty");
    this.root.dataset.modelState = "empty";
    this.setPresetCardState();
    this.showEmptyEnvironment();
    this.setPipelineStatus(
      "",
      0,
      "Stage 1 · Choose an MJCF in the right sidebar, then edit or confirm its T-pose."
    );
    this.setSceneGuideCollapsed(false);
    this.modelInfo.textContent = "Indexing robot assets…";
  }

  showEmptyEnvironment() {
    const center = new THREE.Vector3(0, 0, 0.85);
    this.controls.target.copy(center);
    this.camera.position.set(2.4, -2.4, 1.7);
    this.camera.near = 0.01;
    this.camera.far = 100;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.ground.position.set(0, 0, 0);
    this.ground.scale.set(12, 12, 1);
    this.ground.visible = true;
    this.groundShadow.position.set(0, 0, 0.003);
    this.groundShadow.scale.set(12, 12, 1);
    this.groundShadow.visible = true;
    this.editorGroundState = null;
    this.updateViewerLightRig(center);
    this.markSceneDirty({ shadow: true });
  }

  showEmptyRobotScene() {
    this.resetForModelSelection();
    this.modelInfo.textContent = "No robot loaded";
    this.dropHint.hidden = false;
    this.setSceneGuidePresentation({
      stage: "tpose",
      number: 1,
      title: "Load a robot",
      detail: "Drop a robot asset folder or one of the T-pose examples below into this scene.",
      state: "Waiting",
      tone: "editing"
    });
    this.pipelineMessage.textContent = "Stage 1 · Load a robot to begin editing its T-pose.";
    this.setStatus("Studio ready · drop a robot asset folder or T-pose example into the empty scene.", "ready");
  }

  async copyTPoseConfig() {
    if (!this.model || !this.data) return;
    this.setViewStage("editor", { fit: false });
    this.retargetTPose = [...this.data.qpos];

    const tposeQpos = Object.fromEntries(
      Object.entries(this.currentTPoseJointMap()).map(([name, value]) => [
        name,
        Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(12))
      ])
    );
    const configText = JSON.stringify({ robot: { tpose_qpos: tposeQpos } }, null, 2);

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(configText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = configText;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Clipboard access is unavailable.");
      }
      this.setTPoseGuideState("complete");
      this.copyTPoseButton.textContent = "Copied";
      window.setTimeout(() => {
        this.copyTPoseButton.textContent = "Copy T-pose config";
      }, 1400);
      this.setStatus(
        `Copied UMR_release robot.tpose_qpos config · ${Object.keys(tposeQpos).length} scalar joints · radians.`,
        "ready"
      );
    } catch (error) {
      this.handleError(error, "Could not copy T-pose config");
    }
  }

  setLoadingOverlay(title, detail = "", visible = true) {
    this.loadingTitle.textContent = title;
    this.loadingDetail.textContent = detail;
    this.loading.hidden = !visible;
  }

  setSceneGuidePresentation({ stage, number, title, detail, state, tone }) {
    this.tposeSceneHint.dataset.pipelineStage = stage;
    this.tposeSceneHint.dataset.state = tone;
    const visibleStage = stage === "ready" ? "retargeting" : stage;
    this.pipelineStepsContainer.hidden = !["sampling", "training", "retargeting", "ready"].includes(stage);
    this.pipelineSteps.forEach((step) => {
      step.hidden = step.dataset.stage !== visibleStage;
    });
    this.tposeSceneNumber.textContent = String(number);
    this.tposeSceneTitle.textContent = title;
    this.tposeSceneDetail.textContent = detail;
    this.sceneGuideState.textContent = state;
  }

  setSceneGuideCollapsed(collapsed) {
    const isCollapsed = Boolean(collapsed);
    this.tposeSceneHint.dataset.collapsed = String(isCollapsed);
    this.sceneGuideToggle.setAttribute("aria-expanded", String(!isCollapsed));
    const label = isCollapsed ? "Expand stage guide" : "Collapse stage guide";
    this.sceneGuideToggle.setAttribute("aria-label", label);
    this.sceneGuideToggle.title = label;
  }

  showSceneGuideForView(viewStage) {
    if (viewStage === "editor") {
      this.setTPoseGuideState(this.tposeConfirmed ? "complete" : "editing");
      this.pipelineMessage.textContent = "Stage 1 · Edit or confirm the T-pose before retargeting.";
      return;
    }

    const views = {
      sampling: {
        stage: "sampling",
        number: 2,
        title: "Sampling robot surfaces",
        detail: "Source and robot point clouds in the shared canonical frame.",
        fallback: "Stage 2 · Exterior surface samples are ready."
      },
      classification: {
        stage: "training",
        number: 3,
        title: "Learned and bound correspondence",
        detail: "Paired point IDs are projected and bound to both meshes.",
        fallback: "Stage 3 · Dense correspondence and mesh binding are ready."
      },
      motion: {
        stage: "retargeting",
        number: 4,
        title: "Synchronized motion",
        detail: "Robot and reference playback share the same timestamps.",
        fallback: "Stage 4 · Retargeted motion is ready for synchronized playback."
      }
    };
    const view = views[viewStage];
    if (!view) return;
    const step = this.pipelineSteps.find((candidate) => candidate.dataset.stage === view.stage);
    const progress = clamp(Number(step?.dataset.progress) || 0, 0, 100);
    const failed = Boolean(step?.classList.contains("has-error"));
    const complete = Boolean(step?.classList.contains("is-complete")) || progress >= 100;
    this.setSceneGuidePresentation({
      stage: viewStage === "motion" && complete ? "ready" : view.stage,
      number: view.number,
      title: view.title,
      detail: view.detail,
      state: failed ? "Failed" : complete ? "Complete" : "Running",
      tone: failed ? "error" : complete ? "complete" : "running"
    });
    this.pipelineMessage.textContent = step?.dataset.message || view.fallback;
  }

  setTPoseGuideState(state = "editing") {
    const complete = state === "complete";
    this.tposeConfirmed = complete;
    this.setSceneGuidePresentation({
      stage: "tpose",
      number: 1,
      title: complete ? "T-pose confirmed" : "Edit the robot T-pose",
      detail: complete
        ? "Stage 2 is ready. Start retargeting when the reference motion is selected."
        : "Keep the torso upright, extend both arms at shoulder height, keep both feet flat, then copy its UMR config.",
      state: complete ? "Ready" : "Editing",
      tone: complete ? "complete" : "editing"
    });
  }

  setPipelineStatus(stage, progress, message) {
    const order = ["sampling", "training", "retargeting"];
    if (!stage || stage === "loading") this.lastPipelineStage = "";
    if (order.includes(stage)) this.lastPipelineStage = stage;
    const activeStage = order.includes(stage)
      ? stage
      : stage === "error"
        ? this.lastPipelineStage
        : "";
    const activeIndex = order.indexOf(activeStage);
    const stageProgress = clamp(Number(progress) || 0, 0, 100);

    this.pipelineSteps.forEach((step, index) => {
      const stepStage = step.dataset.stage;
      const isError = stage === "error" && stepStage === activeStage;
      let value = 0;
      if (stage === "ready") {
        value = 100;
      } else if (isError) {
        value = Number(step.dataset.progress) || 0;
      } else if (activeIndex >= 0) {
        if (index < activeIndex) {
          value = 100;
        } else if (index === activeIndex) {
          value = stageProgress;
        }
      }

      const complete = stage === "ready" || (
        !isError && activeIndex >= 0 && (index < activeIndex || (index === activeIndex && value >= 100))
      );
      const active = !isError && stage !== "ready" && stepStage === activeStage && !complete;
      const rounded = Math.round(value);
      step.dataset.progress = String(value);
      step.classList.toggle("is-active", active);
      step.classList.toggle("is-complete", complete);
      step.classList.toggle("has-error", isError);
      step.querySelector("[data-stage-progress]").style.width = `${value}%`;
      step.querySelector("[data-stage-percent]").textContent = `${rounded}%`;
      const stateLabel = step.querySelector("[data-stage-state]");
      stateLabel.textContent = isError
        ? "Failed"
        : complete
          ? "Complete"
          : active
            ? "Running"
            : "Waiting";
      const track = step.querySelector(".mj-stage-progress");
      track.setAttribute("aria-valuenow", String(rounded));
      track.setAttribute("aria-valuetext", stateLabel.textContent);
      if (!stage || stage === "loading") {
        delete step.dataset.message;
      } else if (
        message && (stepStage === activeStage || (stage === "ready" && stepStage === "retargeting"))
      ) {
        step.dataset.message = message;
      }
    });
    this.pipelineMessage.textContent = message || "";

    const stagePresentations = {
      loading: {
        stage: "loading",
        number: 1,
        title: "Preparing the UMR pipeline",
        detail: "Preparing the user-loaded robot and confirmed T-pose locally in this browser.",
        state: "Loading",
        tone: "running"
      },
      sampling: {
        stage: "sampling",
        number: 2,
        title: "Sampling exterior surfaces",
        detail: "Building source and robot visual-surface point clouds in the shared canonical frame.",
        state: "Running",
        tone: "running"
      },
      training: {
        stage: "training",
        number: 3,
        title: "Learning and binding correspondence",
        detail: "Training dense point IDs, then binding the paired points to both meshes.",
        state: "Running",
        tone: "running"
      },
      retargeting: {
        stage: "retargeting",
        number: 4,
        title: "Retargeting the selected motion",
        detail: "Solving synchronized robot qpos against the reference timestamps.",
        state: "Running",
        tone: "running"
      },
      ready: {
        stage: "ready",
        number: 4,
        title: "Synchronized motion ready",
        detail: "Robot and reference playback now share the same timeline.",
        state: "Complete",
        tone: "complete"
      }
    };

    if (!stage) {
      this.setTPoseGuideState(this.tposeConfirmed ? "complete" : "editing");
    } else if (stage === "error") {
      const failedStage = stagePresentations[activeStage] || stagePresentations.loading;
      this.setSceneGuidePresentation({
        ...failedStage,
        title: "Pipeline stopped",
        detail: message || "The current UMR task could not be completed.",
        state: "Failed",
        tone: "error"
      });
    } else {
      const presentation = { ...(stagePresentations[stage] || stagePresentations.loading) };
      if (order.includes(stage) && stageProgress >= 100) {
        presentation.state = "Complete";
        presentation.tone = "complete";
      }
      this.setSceneGuidePresentation(presentation);
    }
  }

  setTaskLocked(locked) {
    this.taskLocked = Boolean(locked);
    this.runRetargetButton.disabled = this.taskLocked || !this.model;
    this.stopRetargetButton.disabled = !this.taskLocked;
    this.rootBodySelect.disabled = this.taskLocked || !this.model;
    this.trainingCoreSelect.disabled = this.taskLocked;
    this.trainingCoreControl.dataset.state = this.taskLocked ? "locked" : "ready";
    this.selectFolderButton.disabled = this.taskLocked;
    this.motionSourceSelect.disabled = this.taskLocked;
    this.referenceScene.setLocked(this.taskLocked);
    this.setModelOptionsDisabled(this.taskLocked);
    this.jointControlMap.forEach(({ slider }) => {
      slider.disabled = this.taskLocked || this.currentViewStage !== "editor";
    });
    if (this.taskLocked) this.setHoveredHit(null);
    else this.updateTrainingCoreHelp();
  }

  populateTrainingCoreOptions() {
    const reported = Number(globalThis.navigator?.hardwareConcurrency);
    this.maximumTrainingWorkers = Number.isFinite(reported) && reported >= 1
      ? Math.floor(reported)
      : 1;
    const defaultWorkers = Math.max(1, Math.floor(this.maximumTrainingWorkers / 2));
    const options = [];
    for (let workers = 1; workers <= this.maximumTrainingWorkers; workers += 1) {
      const option = document.createElement("option");
      option.value = String(workers);
      option.textContent = `${workers} worker${workers === 1 ? "" : "s"}` +
        (workers === defaultWorkers ? " (default)" : "");
      options.push(option);
    }
    this.trainingCoreSelect.replaceChildren(...options);
    this.trainingCoreSelect.value = String(defaultWorkers);
  }

  selectedTrainingThreads() {
    const threads = Number(this.trainingCoreSelect.value);
    if (!Number.isInteger(threads) || threads < 1 || threads > this.maximumTrainingWorkers) {
      throw new RangeError(
        `Select a correspondence training worker count from 1 to ${this.maximumTrainingWorkers}.`
      );
    }
    if (threads > 1 && (!globalThis.crossOriginIsolated || typeof SharedArrayBuffer === "undefined")) {
      throw new Error(
        "Multi-core WASM requires HTTPS plus cross-origin isolation. Select 1 worker or use the protected HTTPS page."
      );
    }
    return threads;
  }

  updateTrainingCoreHelp() {
    const threads = Number(this.trainingCoreSelect.value) || 1;
    const available = this.maximumTrainingWorkers;
    const multithreadReady = Boolean(
      globalThis.crossOriginIsolated && typeof SharedArrayBuffer !== "undefined"
    );
    if (threads === 1) {
      this.trainingCoreControl.dataset.state = this.taskLocked ? "locked" : "ready";
      this.trainingCoreHelp.innerHTML =
        `<strong>1 worker selected.</strong> Browser reports ${available} available logical worker${available === 1 ? "" : "s"}; select before Retarget. More workers usually reduce training time, but increase CPU load and may make the computer less responsive.`;
      return;
    }
    if (!multithreadReady) {
      this.trainingCoreControl.dataset.state = "unavailable";
      this.trainingCoreHelp.innerHTML =
        "<strong>Multiple workers are unavailable on this origin.</strong> Use HTTPS with cross-origin isolation or select 1 worker.";
      return;
    }
    this.trainingCoreControl.dataset.state = this.taskLocked ? "locked" : "ready";
    this.trainingCoreHelp.innerHTML =
      `<strong>${threads} workers selected.</strong> Browser reports a maximum of ${available}; select before Retarget. More workers usually reduce training time, but increase CPU load and may make the computer less responsive.`;
  }

  handleReferenceMotionChange(motion) {
    if (this.jobId) return;
    this.clearMotion();
    const displayName = motion.display_name || motion.id;
    this.retargetTitle.textContent = displayName.replace(" — ", " · ");
    this.runRetargetButton.textContent = "Retarget";
    this.setPipelineStatus("", 0, "Stage 1 · Edit or confirm the T-pose, then start retargeting.");
    this.setStatus("Target motion selected · " + displayName, "ready");
  }

  async startRetargeting() {
    if (this.jobId) return;
    if (!this.model || !this.data || !this.modelWorkspace || !this.currentModelPath) return;
    if (!this.rootBodySelect.value) {
      this.setStatus("Choose a root or torso body before retargeting.", "error");
      return;
    }
    const selectedMotion = this.referenceScene.motion;
    if (!selectedMotion) {
      this.setStatus("Choose a target motion before retargeting.", "error");
      return;
    }
    let trainingThreads;
    try {
      trainingThreads = this.selectedTrainingThreads();
    } catch (error) {
      this.setStatus(error.message || String(error), "error");
      this.trainingCoreSelect.focus();
      return;
    }
    const motionDisplayName = selectedMotion.display_name || selectedMotion.id;
    this.setViewStage("editor", { fit: false });
    let bboxCenterRatio;
    try {
      bboxCenterRatio = this.currentPointCloudCenterRatio();
    } catch (error) {
      this.handleError(error, "Could not resolve the point-cloud center");
      return;
    }
    this.preRetargetTPose = Float64Array.from(this.data.qpos);
    this.preRetargetView = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      near: this.camera.near,
      far: this.camera.far
    };
    this.pipelineAbortController = new AbortController();
    const taskSignal = this.pipelineAbortController.signal;
    if (new URLSearchParams(window.location.search).get("compute") !== "server") {
      await this.startBrowserRetargeting(
        selectedMotion, bboxCenterRatio, trainingThreads, taskSignal
      );
      return;
    }
    this.retargetTPose = [...this.data.qpos];
    this.setTPoseGuideState("complete");
    this.clearStageArtifacts();
    this.clearMotion();
    this.setTaskLocked(true);
    this.setPipelineStatus("loading", 3, "Uploading robot assets and T-pose…");
    this.setLoadingOverlay(
      "Loading robot into UMR…",
      `${this.modelWorkspace.descriptors.length} files · ${motionDisplayName}`
    );
    this.jobId = "uploading";
    this.uploadController = new AbortController();

    const descriptors = this.modelWorkspace.descriptors;
    const metadata = {
      main_xml: this.currentModelPath,
      model_label: this.currentModelPath.split("/").pop().replace(/\.xml$/i, ""),
      root_body: this.rootBodySelect.value,
      bbox_center_ratio: Number(bboxCenterRatio.toPrecision(12)),
      tpose_qpos: this.currentTPoseJointMap(),
      paths: descriptors.map(({ file, path }) => cleanPath(path || file.name)),
      motion_source: selectedMotion.id
    };
    const form = new FormData();
    form.append("metadata", JSON.stringify(metadata));
    descriptors.forEach(({ file }, index) => {
      form.append(`asset_${index}`, file, file.name);
    });

    try {
      const response = await fetch("/api/retarget/jobs", {
        method: "POST",
        body: form,
        signal: this.uploadController.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (taskSignal.aborted) {
        if (/^[a-f0-9]{16}$/.test(payload.job_id || "")) {
          fetch(`/api/retarget/jobs/${payload.job_id}/cancel`, { method: "POST" }).catch(() => {});
        }
        throw makeAbortError();
      }
      if (!response.ok) {
        const staticServerHint = response.status === 404 || response.status === 501
          ? " Start the page with: python3 serve_umr.py"
          : "";
        throw new Error((payload.error || `Server returned ${response.status}.`) + staticServerHint);
      }
      this.jobId = payload.job_id;
      this.setLoadingOverlay("", "", false);
      this.setPipelineStatus("sampling", 0, "Pipeline started. Waiting for exterior-surface sampling…");
      this.setStatus("UMR job started · " + motionDisplayName, "loading");
      await this.pollRetargetJob();
    } catch (error) {
      if (!taskSignal.aborted) {
        this.handleError(error, "Could not start UMR retargeting");
        this.setPipelineStatus("error", 100, error.message || String(error));
        this.jobId = null;
        this.setLoadingOverlay("", "", false);
        this.setTaskLocked(false);
        this.pipelineAbortController = null;
        this.preRetargetTPose = null;
        this.preRetargetView = null;
      }
    } finally {
      this.uploadController = null;
    }
  }

  stopRetargeting() {
    if (!this.jobId) return;
    const activeJobId = this.jobId;
    const waitsForBrowserCleanup = activeJobId === "browser";
    const pose = this.preRetargetTPose
      ? Float64Array.from(this.preRetargetTPose)
      : this.retargetTPose
        ? Float64Array.from(this.retargetTPose)
        : null;
    const view = this.preRetargetView;

    this.jobId = null;
    clearTimeout(this.jobPollTimer);
    this.jobPollTimer = null;
    this.pipelineAbortController?.abort();
    this.uploadController?.abort();
    this.pipelineAbortController = null;
    this.uploadController = null;

    if (/^[a-f0-9]{16}$/.test(activeJobId)) {
      fetch(`/api/retarget/jobs/${activeJobId}/cancel`, { method: "POST" })
        .catch((error) => console.warn("Could not confirm server-side cancellation.", error));
    }

    this.clearStageArtifacts();
    this.clearMotion();
    if (pose && this.model && this.data && pose.length === this.model.nq) {
      this.retargetTPose = Array.from(pose);
      this.data.qpos.set(pose);
      this.module.mj_forward(this.model, this.data);
      this.syncScene();
      this.refreshJointControls();
      this.updateModelEnvironment();
      this.setViewStage("editor", { fit: false });
    }
    if (view) {
      this.camera.position.copy(view.position);
      this.controls.target.copy(view.target);
      this.camera.near = view.near;
      this.camera.far = view.far;
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }
    this.preRetargetTPose = null;
    this.preRetargetView = null;
    this.setTPoseGuideState("editing");
    this.setPipelineStatus("", 0, "Retargeting stopped · pre-run T-pose restored.");
    this.setStatus("Retargeting stopped. Your edited T-pose has been restored.", "ready");
    this.setLoadingOverlay("", "", false);
    this.setTaskLocked(waitsForBrowserCleanup);
    if (waitsForBrowserCleanup) this.stopRetargetButton.disabled = true;
  }

  async startBrowserRetargeting(selectedMotion, bboxCenterRatio, trainingThreads, signal) {
    this.retargetTPose = [...this.data.qpos];
    this.setTPoseGuideState("complete");
    this.clearStageArtifacts();
    this.clearMotion();
    this.setTaskLocked(true);
    this.setPipelineStatus("loading", 1, "Preparing the in-browser UMR runtime…");
    this.setLoadingOverlay("", "", false);
    this.jobId = "browser";
    try {
      const motion = await this.browserRuntime.run({
        motionId: selectedMotion.id,
        bboxCenterRatio,
        trainingThreads,
        signal,
        onProgress: (stage, progress, message) => {
          this.setPipelineStatus(stage, progress, message);
          this.setStatus(message, "loading");
        },
        onSampling: (artifact) => {
          this.samplingArtifact = artifact;
          this.setStageAvailable("sampling", true);
          this.setLoadingOverlay("", "", false);
          this.setViewStage("sampling");
        },
        onClassification: (artifact) => {
          this.classificationArtifact = artifact;
          this.setStageAvailable("classification", true);
          this.setViewStage("classification");
        }
      });
      throwIfAborted(signal);
      await this.loadRetargetedMotion(motion);
    } catch (error) {
      if (!signal?.aborted) {
        this.jobId = null;
        this.setTaskLocked(false);
        this.setLoadingOverlay("", "", false);
        this.setPipelineStatus("error", 100, error.message || String(error));
        this.handleError(error, "Browser UMR pipeline stopped");
        this.pipelineAbortController = null;
        this.preRetargetTPose = null;
        this.preRetargetView = null;
      }
    } finally {
      if (signal?.aborted && !this.jobId) this.setTaskLocked(false);
    }
  }

  async pollRetargetJob() {
    if (!/^[a-f0-9]{16}$/.test(this.jobId || "")) return;
    const jobId = this.jobId;
    const signal = this.pipelineAbortController?.signal;
    try {
      const response = await fetch(`/api/retarget/jobs/${jobId}`, { cache: "no-store", signal });
      const status = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(status.error || "Could not read job status.");
      if (this.jobId !== jobId) return;
      if (status.sampling_ready && !this.samplingArtifact) {
        try {
          await this.loadStageArtifact(jobId, "sampling", signal);
        } catch (artifactError) {
          if (signal?.aborted || artifactError.name === "AbortError") throw artifactError;
          console.warn("Sampling visualization is not ready yet.", artifactError);
        }
      }
      if (status.classification_ready && !this.classificationArtifact) {
        try {
          await this.loadStageArtifact(jobId, "classification", signal);
        } catch (artifactError) {
          if (signal?.aborted || artifactError.name === "AbortError") throw artifactError;
          console.warn("Surface classification visualization is not ready yet.", artifactError);
        }
      }
      throwIfAborted(signal);
      if (this.jobId !== jobId) return;
      this.setPipelineStatus(status.stage, status.progress, status.message);
      this.setStatus(status.message || "UMR pipeline is running…", status.state === "error" ? "error" : "loading");

      if (status.state === "ready") {
        await this.loadRetargetedMotion(jobId);
        return;
      }
      if (status.state === "error" || status.state === "cancelled") {
        throw new Error(status.message || `Retargeting ${status.state}.`);
      }
      this.jobPollTimer = window.setTimeout(() => this.pollRetargetJob(), 1000);
    } catch (error) {
      if (this.jobId !== jobId) return;
      if (signal?.aborted || error.name === "AbortError") return;
      this.jobId = null;
      this.setTaskLocked(false);
      this.setPipelineStatus("error", 100, error.message || String(error));
      this.handleError(error, "UMR pipeline stopped");
      this.pipelineAbortController = null;
      this.preRetargetTPose = null;
      this.preRetargetView = null;
    }
  }

  async loadRetargetedMotion(jobId) {
    const signal = this.pipelineAbortController?.signal;
    throwIfAborted(signal);
    this.setLoadingOverlay("Loading retargeted motion…", "Preparing qpos playback in MuJoCo WASM");
    try {
      let motion;
      if (jobId && typeof jobId === "object") {
        motion = jobId;
      } else {
        const response = await fetch("/api/retarget/jobs/" + jobId + "/motion", { signal });
        motion = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(motion.error || "Could not load motion result.");
      }
      throwIfAborted(signal);
      if (
        motion.format !== "umr-qpos-v1" ||
        !Array.isArray(motion.qpos) ||
        !motion.qpos.length ||
        !Number.isFinite(Number(motion.fps))
      ) {
        throw new Error("The pipeline returned an invalid qpos motion.");
      }
      const motionId = String(motion.motion_id || motion.source || this.motionSourceSelect.value);
      await this.referenceScene.ensureMotion(motionId);
      throwIfAborted(signal);
      this.referenceScene.stopPreview();
      const motionLabel = motion.motion_label || this.referenceScene.motion?.display_name || motionId;
      this.motion = {
        qpos: motion.qpos,
        fps: Number(motion.fps),
        frames: motion.qpos.length,
        nq: Number(motion.nq),
        motionId,
        motionLabel,
        sourceFrameIds: Array.isArray(motion.source_frame_ids) ? motion.source_frame_ids : null,
        groundHeight: Number.isFinite(Number(motion.ground_height))
          ? Number(motion.ground_height)
          : 0,
        interactionObjects: Array.isArray(motion.interaction_objects)
          ? motion.interaction_objects
          : []
      };
      this.buildInteractionObjects(this.motion.interactionObjects);
      this.motionScrubber.max = String(this.motion.frames - 1);
      this.motionScrubber.value = "0";
      this.setStageAvailable("motion", true);
      this.setViewStage("motion");
      this.referenceScene.setSynchronizedPlayback(() => this.toggleMotionPlayback());
      this.setPipelineStatus("ready", 100, `${motionLabel} ready · ${this.motion.frames} synchronized frames · ${this.motion.fps.toFixed(1)} fps · target ground z=${this.motion.groundHeight.toFixed(3)}`);
      this.setStatus("Retargeted and target motions are synchronized for comparison.", "ready");
      this.jobId = null;
      this.pipelineAbortController = null;
      this.preRetargetTPose = null;
      this.preRetargetView = null;
      this.setTaskLocked(false);
      this.toggleMotionPlayback();
    } finally {
      this.setLoadingOverlay("", "", false);
    }
  }

  setMotionFrame(index) {
    if (!this.motion || !this.model || !this.data) return;
    const frame = clamp(Math.trunc(index), 0, this.motion.frames - 1);
    const qpos = this.motion.qpos[frame];
    if (!Array.isArray(qpos)) return;
    this.data.qpos.set(this.model.qpos0);
    const width = Math.min(qpos.length, this.model.nq);
    for (let address = 0; address < width; address += 1) {
      this.data.qpos[address] = Number(qpos[address]);
    }
    this.module.mj_forward(this.model, this.data);
    this.syncScene();
    this.updateInteractionObjects(frame);
    const sourceFrame = this.motion.sourceFrameIds?.[frame] ?? Math.round(
      (frame / this.motion.fps) * Number(this.referenceScene.motion?.fps || this.motion.fps)
    );
    if (Number.isFinite(Number(sourceFrame))) {
      this.referenceScene.setFrame(Number(sourceFrame));
    }
    this.refreshJointControls();
    this.motionCursor = frame;
    this.updateMotionCameraFollow(frame);
    this.motionScrubber.value = String(frame);
    this.motionFrame.value = `${frame + 1} / ${this.motion.frames} · ${(frame / this.motion.fps).toFixed(2)} s`;
    this.motionFrame.textContent = this.motionFrame.value;
  }

  toggleMotionPlayback() {
    if (!this.motion) return;
    this.referenceScene.stopPreview();
    if (this.currentViewStage !== "motion") this.setViewStage("motion");
    if (this.motionPlaying) {
      this.pauseMotion();
      return;
    }
    if (this.motionCursor >= this.motion.frames - 1) this.setMotionFrame(0);
    this.motionPlaying = true;
    this.playbackStartFrame = this.motionCursor;
    this.playbackStartedAt = performance.now();
    this.root.classList.add("is-playing");
    const icon = this.playButton.querySelector("i");
    if (icon) icon.className = "fas fa-pause";
    this.playButton.setAttribute("aria-label", "Pause motion");
    this.referenceScene.setSynchronizedPlaying(true);
  }

  pauseMotion() {
    this.motionPlaying = false;
    this.root.classList.remove("is-playing");
    const icon = this.playButton.querySelector("i");
    if (icon) icon.className = "fas fa-play";
    this.playButton.setAttribute("aria-label", "Play motion");
    this.referenceScene.setSynchronizedPlaying(false);
  }

  clearMotion() {
    this.pauseMotion();
    this.referenceScene.clearSynchronizedPlayback();
    this.clearMotionCameraFollow();
    this.clearInteractionObjects();
    this.controls.enabled = true;
    this.controls.enableDamping = false;
    this.motion = null;
    this.motionCursor = 0;
    this.player.hidden = true;
    this.motionScrubber.max = "0";
    this.motionScrubber.value = "0";
    this.motionFrame.value = "0 / 0";
    this.motionFrame.textContent = "0 / 0";
    this.setStageAvailable("motion", false);
    this.markSceneDirty({ shadow: true });
  }

  buildInteractionObjects(objects) {
    this.clearInteractionObjects();
    for (const spec of objects) {
      if (
        !Array.isArray(spec.vertices) || !spec.vertices.length ||
        !Array.isArray(spec.indices) || !spec.indices.length ||
        !Array.isArray(spec.positions) || !Array.isArray(spec.quaternions_wxyz)
      ) continue;
      const vertices = new Float32Array(spec.vertices.length * 3);
      spec.vertices.forEach((point, index) => {
        vertices[index * 3] = Number(point[0]);
        vertices[index * 3 + 1] = Number(point[1]);
        vertices[index * 3 + 2] = Number(point[2]);
      });
      const maxIndex = spec.indices.reduce((maximum, value) => Math.max(maximum, Number(value)), 0);
      const IndexArray = maxIndex > 65535 ? Uint32Array : Uint16Array;
      const indices = new IndexArray(spec.indices.map(Number));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const color = spec.color || [0.75, 0.72, 0.66];
      const alpha = Number(spec.alpha ?? 1);
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(Number(color[0]), Number(color[1]), Number(color[2])),
        opacity: alpha,
        transparent: alpha < 0.999,
        roughness: 0.46,
        metalness: 0.04,
        clearcoat: 0.2,
        clearcoatRoughness: 0.52,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = String(spec.name || "interaction_object");
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.visible = this.currentViewStage === "motion";
      this.scene.add(mesh);
      this.interactionObjects.push({
        mesh,
        positions: spec.positions,
        quaternions: spec.quaternions_wxyz
      });
    }
  }

  updateInteractionObjects(frame) {
    for (const object of this.interactionObjects) {
      const position = object.positions[frame];
      const quaternion = object.quaternions[frame];
      if (!Array.isArray(position) || !Array.isArray(quaternion)) continue;
      object.mesh.position.set(Number(position[0]), Number(position[1]), Number(position[2]));
      object.mesh.quaternion.set(
        Number(quaternion[1]),
        Number(quaternion[2]),
        Number(quaternion[3]),
        Number(quaternion[0])
      ).normalize();
    }
  }

  clearInteractionObjects() {
    this.interactionObjects.forEach(({ mesh }) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.interactionObjects.length = 0;
  }

  updateMotionPlayback(timestamp) {
    if (!this.motionPlaying || !this.motion) return;
    const speed = Number(this.playbackSpeed.value) || 1;
    const elapsedFrames = Math.floor(
      ((timestamp - this.playbackStartedAt) / 1000) * this.motion.fps * speed
    );
    const frame = (this.playbackStartFrame + elapsedFrames) % this.motion.frames;
    if (frame !== this.motionCursor) this.setMotionFrame(frame);
  }

  resize() {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    this.renderer.setPixelRatio(this.viewerPixelRatio(width, height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.referenceScene?.resize();
    this.markSceneDirty();
  }

  setupRenderVisibility() {
    const setVisible = (visible) => {
      this.renderVisible = Boolean(visible);
      this.requestAnimationLoop();
    };

    if ("IntersectionObserver" in window) {
      this.renderVisibilityObserver = new IntersectionObserver((entries) => {
        setVisible(entries.some((entry) => entry.isIntersecting));
      }, { threshold: 0.01 });
      this.renderVisibilityObserver.observe(this.shell);
    } else {
      setVisible(true);
    }
    document.addEventListener("visibilitychange", this.onDocumentVisibilityChange);
  }

  requestAnimationLoop() {
    if (!this.renderVisible || document.hidden || this.frameId !== null) return;
    this.frameId = requestAnimationFrame((timestamp) => this.animate(timestamp));
  }

  animate(timestamp = performance.now()) {
    this.frameId = null;
    if (!this.renderVisible || document.hidden) return;
    this.updateMotionPlayback(timestamp);
    if (this.controls.update()) this.markSceneDirty();
    if (this.sceneNeedsRender) {
      this.updateViewerGroundShader?.();
      this.renderer.render(this.scene, this.camera);
      this.sceneNeedsRender = false;
    }
    this.referenceScene?.update(timestamp);
    this.referenceScene?.render();
    this.requestAnimationLoop();
  }

  async filesFromDrop(dataTransfer) {
    const items = [...(dataTransfer?.items || [])];
    if (!items.length || !items[0].webkitGetAsEntry) {
      return [...(dataTransfer?.files || [])];
    }
    const results = [];
    await Promise.all(items.map(async (item) => {
      const entry = item.webkitGetAsEntry();
      if (entry) await this.walkEntry(entry, "", results);
    }));
    return results;
  }

  async walkEntry(entry, parentPath, results) {
    const currentPath = normalizePath(`${parentPath}/${entry.name}`);
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      results.push({ file, path: currentPath });
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      while (true) {
        const entries = await new Promise((resolve, reject) =>
          reader.readEntries(resolve, reject)
        );
        if (!entries.length) break;
        await Promise.all(entries.map(async (child) => {
          await this.walkEntry(child, currentPath, results);
        }));
      }
    }
  }

  findSharedRoot(paths) {
    const usable = paths.filter((path) => path.includes("/"));
    if (!usable.length) return "";
    const first = usable[0].split("/")[0];
    return paths.every((path) => path === first || path.startsWith(`${first}/`))
      ? first
      : "";
  }

  pickMainXml(xmlFiles) {
    return [...xmlFiles].sort((a, b) => this.modelRecordScore(a, xmlFiles) - this.modelRecordScore(b, xmlFiles))[0];
  }

  buildFileIndex(descriptors) {
    const byPath = new Map();
    const byBasename = new Map();
    const bySuffix = new Map();
    for (const descriptor of descriptors) {
      const filePath = cleanPath(descriptor.path || descriptor.file.name);
      const record = { ...descriptor, path: filePath };
      byPath.set(filePath.toLowerCase(), record);
      const basename = filePath.split("/").pop().toLowerCase();
      if (!byBasename.has(basename)) byBasename.set(basename, []);
      byBasename.get(basename).push(record);
      const parts = filePath.toLowerCase().split("/");
      for (let start = 1; start < parts.length; start += 1) {
        const suffix = parts.slice(start).join("/");
        if (!bySuffix.has(suffix)) bySuffix.set(suffix, []);
        bySuffix.get(suffix).push(record);
      }
    }
    return { byPath, byBasename, bySuffix };
  }

  resolveFileReference(reference, candidateBases, fileIndex) {
    const ref = cleanPath(reference);
    const candidates = new Set(candidateBases.map((base) => joinPath(base, ref)));
    candidates.add(ref);
    for (const candidate of candidates) {
      const exact = fileIndex.byPath.get(candidate.toLowerCase());
      if (exact) return { record: exact, expectedPath: candidate };
    }
    const suffixMatches = [];
    for (const candidate of candidates) {
      for (const record of fileIndex.bySuffix.get(candidate.toLowerCase()) || []) {
        suffixMatches.push({ record, expectedPath: candidate });
      }
    }
    const uniqueSuffix = [...new Map(suffixMatches.map((item) => [item.record.path, item])).values()];
    if (uniqueSuffix.length === 1) return uniqueSuffix[0];
    const basename = ref.split("/").pop().toLowerCase();
    const basenameMatches = fileIndex.byBasename.get(basename) || [];
    return basenameMatches.length === 1
      ? { record: basenameMatches[0], expectedPath: [...candidates][0] }
      : null;
  }

  buildDependencyPlan(mainRecord, xmlRecords, fileIndex) {
    const records = new Set();
    const aliases = new Map();
    const missing = new Set();
    const xmlByFile = new Map(xmlRecords.map((record) => [record.file, record]));
    const add = (record, expectedPath = record.path) => {
      records.add(record);
      if (!aliases.has(record)) aliases.set(record, new Set([record.path]));
      aliases.get(record).add(cleanPath(expectedPath));
    };

    const reachableXml = [];
    const queued = [mainRecord];
    const visitedXml = new Set();
    while (queued.length) {
      const xmlRecord = queued.shift();
      if (visitedXml.has(xmlRecord.file)) continue;
      visitedXml.add(xmlRecord.file);
      reachableXml.push(xmlRecord);
      const indexedRecord = fileIndex.byPath.get(xmlRecord.path.toLowerCase());
      if (indexedRecord) add(indexedRecord);
      for (const match of xmlRecord.text.matchAll(/<include\b[^>]*\bfile\s*=\s*["']([^"']+)["']/gi)) {
        const reference = match[1];
        const resolved = this.resolveFileReference(
          reference,
          [dirname(xmlRecord.path), dirname(mainRecord.path), ""],
          fileIndex
        );
        if (!resolved) {
          missing.add(reference);
          continue;
        }
        add(resolved.record, resolved.expectedPath);
        const includedXml = xmlByFile.get(resolved.record.file);
        if (includedXml) queued.push(includedXml);
      }
    }

    const mainDir = dirname(mainRecord.path);
    const compilerDirs = { asset: "", mesh: "", texture: "", stripPath: false };
    for (const xmlRecord of reachableXml) {
      const compiler = xmlRecord.text.match(/<compiler\b([^>]*)>/i)?.[1] || "";
      const attrs = Object.fromEntries(
        [...compiler.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)]
          .map((match) => [match[1].toLowerCase(), match[2]])
      );
      if (attrs.assetdir !== undefined) compilerDirs.asset = attrs.assetdir;
      if (attrs.meshdir !== undefined) compilerDirs.mesh = attrs.meshdir;
      if (attrs.texturedir !== undefined) compilerDirs.texture = attrs.texturedir;
      if (attrs.strippath !== undefined) compilerDirs.stripPath = attrs.strippath.toLowerCase() === "true";
    }
    if (!compilerDirs.mesh) compilerDirs.mesh = compilerDirs.asset;
    if (!compilerDirs.texture) compilerDirs.texture = compilerDirs.asset || compilerDirs.mesh;

    for (const xmlRecord of reachableXml) {
      const fileRegex = /<([\w:-]+)\b[^>]*\bfile\s*=\s*["']([^"']+)["']/gi;
      for (const match of xmlRecord.text.matchAll(fileRegex)) {
        const tag = match[1].toLowerCase();
        const reference = match[2];
        if (tag === "include") continue;
        const kindDir = tag === "mesh"
          ? compilerDirs.mesh
          : tag === "texture"
            ? compilerDirs.texture
            : compilerDirs.asset;
        const recordDir = dirname(xmlRecord.path);
        const bases = compilerDirs.stripPath
          ? [""]
          : [joinPath(mainDir, kindDir), joinPath(recordDir, kindDir), kindDir, recordDir, mainDir, ""];
        const resolved = this.resolveFileReference(reference, bases, fileIndex);
        if (!resolved) {
          missing.add(reference);
          continue;
        }
        const expectedPath = compilerDirs.stripPath
          ? cleanPath(reference).split("/").pop()
          : resolved.expectedPath;
        add(resolved.record, expectedPath);
      }
    }
    return { records: [...records], aliases, missing: [...missing] };
  }

  async mapWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    });
    await Promise.all(runners);
    return results;
  }

  setStatus(message, state) {
    this.status.textContent = message;
    this.status.dataset.state = state;
  }

  handleError(error, prefix) {
    console.error(prefix, error);
    const message = error instanceof Error ? error.message : String(error);
    this.setStatus(`${prefix}: ${message}`, "error");
  }

  dispose() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.jobPollTimer);
    this.frameId = null;
    this.renderVisibilityObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.onDocumentVisibilityChange);
    document.removeEventListener("paste", this.onPaste);
    this.controls?.removeEventListener("change", this.onControlsChange);
    this.pipelineAbortController?.abort();
    this.uploadController?.abort();
    this.canvas.removeEventListener("pointerdown", this.onJointPointerDown, true);
    this.canvas.removeEventListener("pointermove", this.onJointPointerMove, true);
    this.canvas.removeEventListener("pointerup", this.onJointPointerUp, true);
    this.canvas.removeEventListener("pointercancel", this.onJointPointerUp, true);
    this.canvas.removeEventListener("pointerleave", this.onJointPointerLeave, true);
    this.resizeObserver.disconnect();
    this.referenceScene?.dispose();
    this.clearStageVisualization();
    this.disposeModel();
    this.jointAxisHelper.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material?.dispose();
      }
    });
    this.ground.geometry.dispose();
    this.ground.material.dispose();
    this.groundShadow.geometry.dispose();
    this.groundShadow.material.dispose();
    this.scene.environment?.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

const root = $("#mujoco-tpose-viewer");
if (root) {
  const viewer = new MujocoTPoseViewer(root);
  if (new URLSearchParams(globalThis.location?.search || "").has("umrDebug")) {
    globalThis.__umrDebugViewer = viewer;
  }
  window.addEventListener("beforeunload", () => viewer.dispose(), { once: true });
}

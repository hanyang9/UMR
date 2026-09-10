import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const errorBox = document.getElementById('error');

async function loadArray(path, Type) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
  return new Type(await response.arrayBuffer());
}

function setError(error) {
  errorBox.style.display = 'block';
  errorBox.textContent = error?.stack || String(error);
}

async function main() {
  const manifestResponse = await fetch('./manifest.json');
  if (!manifestResponse.ok) throw new Error(`Failed to load manifest: HTTP ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f6fa);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app').appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.01, 100);
  const initialPosition = new THREE.Vector3(0, 2.7, 10.5);
  const initialTarget = new THREE.Vector3(0, 0.8, 0);
  camera.position.copy(initialPosition);
  camera.lookAt(initialTarget);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(initialTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  scene.add(new THREE.GridHelper(14, 28, 0x788695, 0xc8d0da));
  const cloudObjects = [];
  for (const cloud of manifest.clouds) {
    const [positions, colors, highlightColors] = await Promise.all([
      loadArray(cloud.positions, Float32Array),
      loadArray(cloud.colors, Uint8Array),
      loadArray(cloud.highlight_colors, Uint8Array),
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Uint8BufferAttribute(highlightColors, 3, true));
    geometry.computeBoundingSphere();
    const material = new THREE.PointsMaterial({
      size: 0.010,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: cloud.kind === 'input' ? 0.72 : 1.0,
      depthWrite: true,
    });
    const points = new THREE.Points(geometry, material);
    points.userData = { kind: cloud.kind, colors, highlightColors };
    scene.add(points);
    cloudObjects.push(points);
  }

  const linePositions = await loadArray(manifest.racket_lines, Float32Array);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const racketLines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({ color: 0xe83640, transparent: true, opacity: 0.38 }),
  );
  racketLines.visible = false;
  scene.add(racketLines);

  const showInputs = document.getElementById('showInputs');
  const showLearned = document.getElementById('showLearned');
  const highlightRacket = document.getElementById('highlightRacket');
  const showLines = document.getElementById('showLines');
  function updateVisibility() {
    for (const cloud of cloudObjects) {
      cloud.visible = cloud.userData.kind === 'input' ? showInputs.checked : showLearned.checked;
    }
  }
  function updateColors() {
    for (const cloud of cloudObjects) {
      const values = highlightRacket.checked ? cloud.userData.highlightColors : cloud.userData.colors;
      cloud.geometry.setAttribute('color', new THREE.Uint8BufferAttribute(values, 3, true));
    }
  }
  showInputs.addEventListener('change', updateVisibility);
  showLearned.addEventListener('change', updateVisibility);
  highlightRacket.addEventListener('change', updateColors);
  showLines.addEventListener('change', () => { racketLines.visible = showLines.checked; });
  document.getElementById('pointSize').addEventListener('input', (event) => {
    for (const cloud of cloudObjects) cloud.material.size = Number(event.target.value);
  });
  document.getElementById('resetCamera').addEventListener('click', () => {
    camera.position.copy(initialPosition);
    controls.target.copy(initialTarget);
    controls.update();
  });

  document.getElementById('stats').innerHTML = [
    `Device: <b>${manifest.device}</b>`,
    `Epochs: <b>${manifest.epochs}</b>`,
    `Source racket samples: <b>${manifest.source_racket_samples}/4096</b>`,
    `G1 racket samples: <b>${manifest.target_racket_samples}/4096</b>`,
    `Learned source racket slots: <b>${manifest.source_racket_slots}</b>`,
    `Mapped onto G1 racket: <b>${manifest.racket_slot_matches}</b>`,
    `Source-racket mapping rate: <b>${(manifest.racket_mapping_rate * 100).toFixed(1)}%</b>`,
  ].join('<br>');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

main().catch(setError);

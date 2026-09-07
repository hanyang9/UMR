import { readFile, writeFile } from 'node:fs/promises';
import { FBXLoader } from './FBXLoaderPatched.js';
import { Vector3 } from 'three';

globalThis.window = globalThis;
globalThis.document = {
  createElementNS() {
    return {
      addEventListener() {},
      removeEventListener() {},
      set src(_value) {},
    };
  },
};

function matrixRows(matrix) {
  const e = matrix.elements;
  return [
    e[0], e[4], e[8], e[12],
    e[1], e[5], e[9], e[13],
    e[2], e[6], e[10], e[14],
    e[3], e[7], e[11], e[15],
  ];
}

function shortBoneName(name) {
  return String(name || '').split(':').pop();
}

function matchBoneName(name) {
  return shortBoneName(name).replace(/^BVH(?=[A-Z])/, '');
}

function attributeArray(attribute, expectedItemSize) {
  if (!attribute || attribute.itemSize !== expectedItemSize) return [];
  return Array.from(attribute.array);
}

const [fbxPath, outputPath] = process.argv.slice(2);
if (!fbxPath || !outputPath) {
  throw new Error('Usage: export_nr_fbx_skin.mjs INPUT.fbx OUTPUT.json');
}

const bytes = await readFile(fbxPath);
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const root = new FBXLoader().parse(buffer, '');
root.updateMatrixWorld(true);

const meshes = [];
root.traverse((object) => {
  if (object.isSkinnedMesh) meshes.push(object);
});
if (meshes.length === 0) throw new Error(`No SkinnedMesh found in ${fbxPath}`);
meshes.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count);
const mesh = meshes[0];
const geometry = mesh.geometry;
const position = geometry.attributes.position;
const skinIndex = geometry.attributes.skinIndex;
const skinWeight = geometry.attributes.skinWeight;
if (!position || !skinIndex || !skinWeight) throw new Error('SkinnedMesh lacks position/skinIndex/skinWeight');

const faces = geometry.index
  ? Array.from(geometry.index.array)
  : Array.from({ length: position.count }, (_value, index) => index);
if (faces.length % 3 !== 0) throw new Error(`Triangle index count is not divisible by 3: ${faces.length}`);

const bones = mesh.skeleton.bones;
const boneIndex = new Map(bones.map((bone, index) => [bone, index]));
const restWorldMatrices = bones.map((bone) => matrixRows(bone.matrixWorld));
const templateVertices = [];
const point = new Vector3();
for (let index = 0; index < position.count; index += 1) {
  point.fromBufferAttribute(position, index);
  mesh.applyBoneTransform(index, point);
  point.applyMatrix4(mesh.matrixWorld);
  templateVertices.push(point.x, point.y, point.z);
}

const payload = {
  version: 1,
  source: fbxPath,
  mesh_name: mesh.name,
  positions: attributeArray(position, 3),
  faces,
  skin_indices: attributeArray(skinIndex, 4),
  skin_weights: attributeArray(skinWeight, 4),
  bind_matrix: matrixRows(mesh.bindMatrix),
  bind_matrix_inverse: matrixRows(mesh.bindMatrixInverse),
  mesh_matrix_world: matrixRows(mesh.matrixWorld),
  template_vertices_world: templateVertices,
  bone_names: bones.map((bone) => shortBoneName(bone.name)),
  bone_match_names: bones.map((bone) => matchBoneName(bone.name)),
  bone_parents: bones.map((bone) => boneIndex.has(bone.parent) ? boneIndex.get(bone.parent) : -1),
  bone_parent_world: bones.map((bone) => boneIndex.has(bone.parent) ? null : matrixRows(bone.parent?.matrixWorld || root.matrixWorld)),
  bone_rest_positions: bones.flatMap((bone) => bone.position.toArray()),
  bone_rest_quaternions: bones.flatMap((bone) => bone.quaternion.toArray()),
  bone_rest_scales: bones.flatMap((bone) => bone.scale.toArray()),
  bone_inverse_matrices: mesh.skeleton.boneInverses.flatMap((matrix) => matrixRows(matrix)),
  bone_rest_world_matrices: restWorldMatrices.flat(),
};

await writeFile(outputPath, JSON.stringify(payload));
console.log(`[NRFBX] exported mesh=${mesh.name} vertices=${position.count} faces=${faces.length / 3} bones=${bones.length}`);

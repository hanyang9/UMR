import { readFile } from 'node:fs/promises';

// Parser-only Three.js runtime used by the NR FBX skin exporter. This is not a
// visualization or viewer dependency.
const threeRoot = new URL('./vendor/three/', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    return { url: new URL('build/three.module.js', threeRoot).href, shortCircuit: true };
  }
  if (specifier.startsWith('three/addons/')) {
    const relative = specifier.slice('three/addons/'.length);
    return { url: new URL(`examples/jsm/${relative}`, threeRoot).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('/scripts/FBXLoaderPatched.js')) {
    return {
      format: 'module',
      source: await readFile(new URL(url), 'utf8'),
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}

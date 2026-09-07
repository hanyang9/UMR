const ROOT = new URL("../assets/browser_runtime/source/", import.meta.url);
const SOURCE_REVISION = "20260905-omnicontact-642-viewer-140-480-ground-hard-v2";
const TYPES = {
  float32: Float32Array,
  int32: Int32Array,
  uint16: Uint16Array,
  uint32: Uint32Array,
  uint8: Uint8Array
};
const cache = new Map();
const makeAbortError = () => {
  const error = new Error("Retargeting stopped.");
  error.name = "AbortError";
  return error;
};
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeAbortError();
};

async function fetchArray(base, spec, signal = null) {
  throwIfAborted(signal);
  const url = new URL(spec.path, base);
  url.searchParams.set("rev", SOURCE_REVISION);
  const response = await fetch(url, { cache: "force-cache", signal });
  if (!response.ok) throw new Error(`Could not load exact source asset ${spec.path}.`);
  const buffer = spec.encoding === "gzip" && response.body
    ? await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()
    : await response.arrayBuffer();
  const Type = TYPES[spec.dtype];
  if (!Type) throw new Error(`Unsupported exact source dtype ${spec.dtype}.`);
  throwIfAborted(signal);
  const values = new Type(buffer);
  const expected = spec.shape.reduce((product, value) => product * Number(value), 1);
  if (values.length !== expected) throw new Error(`Exact source asset ${spec.path} has an invalid shape.`);
  return { values, shape: spec.shape.map(Number) };
}

export async function loadExactSourcePack(motionId, onProgress = () => {}, signal = null) {
  throwIfAborted(signal);
  const id = String(motionId);
  if (!cache.has(id)) {
    cache.set(id, (async () => {
      const base = new URL(`${encodeURIComponent(id)}/`, ROOT);
      const response = await fetch(new URL(`source-manifest.json?rev=${SOURCE_REVISION}`, base), {
        cache: "force-cache",
        signal
      });
      const manifest = await response.json();
      throwIfAborted(signal);
      if (!response.ok || manifest.format !== "umr-exact-browser-reference-pack-v2") {
        throw new Error(`Exact source pack is unavailable for ${id}.`);
      }
      const assets = {};
      const entries = Object.entries(manifest.assets);
      let complete = 0;
      await Promise.all(entries.map(async ([name, spec]) => {
        assets[name] = await fetchArray(base, spec, signal);
        onProgress(++complete / entries.length);
      }));
      throwIfAborted(signal);
      return { manifest, assets };
    })().catch((error) => {
      cache.delete(id);
      throw error;
    }));
  }
  const pack = await cache.get(id);
  throwIfAborted(signal);
  return pack;
}

export function sourceForCenterRatio(pack, ratio) {
  const requested = Number(ratio);
  if (!Number.isFinite(requested) || requested < 0 || requested > 1) {
    throw new RangeError(`Source bbox ratio must be in [0, 1], got ${ratio}.`);
  }
  const stored = Number(pack.manifest.stored_center_ratio);
  const axis = Number(pack.manifest.center_axis ?? 1);
  if (!Number.isInteger(axis) || axis < 0 || axis > 2) {
    throw new RangeError(`Source center axis must be 0, 1, or 2; got ${axis}.`);
  }
  const bboxHeight = Number(pack.manifest.bbox_height ?? pack.manifest.source_height);
  if (!(bboxHeight > 1e-8) || !Number.isFinite(bboxHeight)) {
    throw new RangeError(`Source bbox height must be positive and finite; got ${bboxHeight}.`);
  }
  const adjust = (source, height = bboxHeight) => {
    const output = new Float32Array(source.length);
    output.set(source);
    const localShift = (stored - requested) * Number(height);
    for (let index = axis; index < output.length; index += 3) output[index] += localShift;
    return output;
  };
  return {
    points: adjust(pack.assets.points_ratio_0_5.values),
    vertices: adjust(pack.assets.vertices_ratio_0_5.values),
    retargetVertices: pack.assets.retarget_template_vertices_ratio_0_5
      ? adjust(
          pack.assets.retarget_template_vertices_ratio_0_5.values,
          pack.manifest.retarget_template_bbox_height
        )
      : null,
    faces: pack.assets.faces.values,
    sampleFaceIds: pack.assets.sample_face_ids.values,
    templateSortIndex: pack.assets.template_sort_index.values,
    templateEdgeIndex: pack.assets.template_edge_index.values
  };
}

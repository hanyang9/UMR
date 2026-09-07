const TFJS_URL = new URL("../vendor/tfjs/tf.min.js", import.meta.url);
const WASM_BACKEND_URL = new URL("../vendor/tfjs-wasm/tf-backend-wasm.min.js", import.meta.url);
const WASM_ROOT_URL = new URL("../vendor/tfjs-wasm/", import.meta.url);

let runtimePromise = null;

// This backend is CPU-only. SIMD and threads are WebAssembly CPU features;
// they do not use CUDA, WebGPU, WebGL, or vendor GPU drivers.
export function loadExactTensorRuntime(onStatus = () => {}) {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      if (!globalThis.tf) {
        onStatus("Loading tensor runtime…");
        await import(TFJS_URL.href);
      }
      const tf = globalThis.tf;
      if (!tf) throw new Error("TensorFlow.js did not initialize.");
      try {
        if (!tf.findBackend("wasm")) {
          onStatus("Loading CPU WebAssembly kernels…");
          await import(WASM_BACKEND_URL.href);
        }
        if (!tf.wasm || typeof tf.wasm.setWasmPaths !== "function") {
          throw new Error("The TensorFlow.js WASM backend did not register.");
        }
        tf.wasm.setWasmPaths(WASM_ROOT_URL.href);
        if (globalThis.crossOriginIsolated && typeof tf.wasm.setThreadsCount === "function") {
          const hardwareThreads = Math.max(1, Number(globalThis.navigator?.hardwareConcurrency) || 1);
          tf.wasm.setThreadsCount(Math.min(8, hardwareThreads));
        }
        await tf.setBackend("wasm");
        await tf.ready();
        if (tf.getBackend() !== "wasm") throw new Error("CPU WebAssembly backend selection failed.");
        const threads = typeof tf.wasm.getThreadsCount === "function" ? tf.wasm.getThreadsCount() : 1;
        onStatus(`CPU WebAssembly ready · ${threads} thread${threads === 1 ? "" : "s"}`);
        return {
          tf,
          backend: "wasm",
          threads,
          simd: Boolean(await tf.env().getAsync("WASM_HAS_SIMD_SUPPORT"))
        };
      } catch (error) {
        console.warn("[UMR] CPU WebAssembly backend unavailable; using exact JS CPU fallback.", error);
        await tf.setBackend("cpu");
        await tf.ready();
        onStatus("JavaScript CPU fallback ready");
        return { tf, backend: "cpu", threads: 1, simd: false, fallbackReason: String(error) };
      }
    })().catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}

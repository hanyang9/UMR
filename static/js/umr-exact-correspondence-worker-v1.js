import {
  trainExactCorrespondenceInProcess
} from "./umr-exact-correspondence-wasm-v1.js?v=20260905-studio-epoch60-memory-shadow-v2";

self.addEventListener("message", async ({ data }) => {
  if (data?.type !== "train") return;
  const options = data.options;
  const threadCount = Number(options.threadCount);
  try {
    self.postMessage({
      type: "progress",
      fraction: 0.002,
      message: `Starting ${threadCount}-core WASM thread pool…`
    });
    const module = await import(
      "../vendor/umr-exact-cpu-wasm-threaded-v6/umr_exact_cpu_wasm.js"
    );
    await module.default();
    await module.initThreadPool(threadCount);
    const trainerRuntime = {
      module,
      threads: threadCount,
      simd: true,
      threaded: true,
      denseBackend: "matrixmultiply-wasm-threads-simd"
    };
    const result = await trainExactCorrespondenceInProcess({
      ...options,
      trainerRuntime,
      signal: null,
      onProgress: (fraction, message) => self.postMessage({
        type: "progress",
        fraction,
        message
      })
    });
    const transfer = [
      result.sourceSlots.buffer,
      result.robotSlots.buffer,
      result.normalizedSourcePoints.buffer,
      result.normalizedRobotPoints.buffer,
      result.normalizationScales.buffer,
      result.templateSortIndex.buffer,
      result.finalTerms.buffer
    ];
    self.postMessage({ type: "result", result }, transfer);
  } catch (error) {
    self.postMessage({
      type: "error",
      name: error?.name || "Error",
      message: error?.message || String(error),
      stack: error?.stack || ""
    });
  }
});

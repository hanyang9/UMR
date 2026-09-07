# Vendored browser dependencies

- `mujoco/`: `@mujoco/mujoco` 3.11.0, Apache-2.0
- `three/`: Three.js 0.185.1, MIT
- `tfjs/`: TensorFlow.js 4.22.0 with the WebGPU backend, Apache-2.0
- `umr-exact-cpu-wasm-v5/`: UMR exact CPU trainer using matrixmultiply 0.3.11,
  MIT OR Apache-2.0
- `umr-exact-cpu-wasm-threaded-v6/`: threaded build of the same exact trainer,
  using wasm-bindgen-rayon for a user-selected Worker pool whose maximum is
  generated from the browser-reported logical CPU limit,
  MIT OR Apache-2.0

The MuJoCo single-threaded WebAssembly build remains independent of the
correspondence trainer. Correspondence values above one core require
cross-origin isolation; the one-worker trainer still works without it. The
Studio selects half of the browser-reported logical worker maximum by default,
with a minimum of one worker.

/* tslint:disable */
/* eslint-disable */

export class ExactFarthestPointSampler {
    free(): void;
    [Symbol.dispose](): void;
    completed(): number;
    constructor(points: Float64Array, target: number, first_index: number);
    selected(): Uint32Array;
    step(iterations: number): boolean;
    target(): number;
}

export class ExactSurfaceKernel {
    free(): void;
    [Symbol.dispose](): void;
    constructor(vertices: Float32Array, faces: Uint32Array);
    visible_faces(face_ids: Uint32Array, outside_distance: number, ray_offset: number, minimum_views: number): Uint8Array;
}

export function initThreadPool(num_threads: number): Promise<any>;

export class wbg_rayon_PoolBuilder {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    build(): void;
    numThreads(): number;
    receiver(): number;
}

export function wbg_rayon_start_worker(receiver: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly __wbg_exactsurfacekernel_free: (a: number, b: number) => void;
    readonly exactsurfacekernel_new: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly exactsurfacekernel_visible_faces: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly __wbg_exactfarthestpointsampler_free: (a: number, b: number) => void;
    readonly exactfarthestpointsampler_new: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly exactfarthestpointsampler_step: (a: number, b: number) => number;
    readonly exactfarthestpointsampler_selected: (a: number, b: number) => void;
    readonly exactfarthestpointsampler_completed: (a: number) => number;
    readonly exactfarthestpointsampler_target: (a: number) => number;
    readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
    readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
    readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
    readonly wbg_rayon_poolbuilder_build: (a: number) => void;
    readonly initThreadPool: (a: number) => number;
    readonly wbg_rayon_start_worker: (a: number) => void;
    readonly memory: WebAssembly.Memory;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
    readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
    readonly __wbindgen_start: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number } | SyncInitInput, memory?: WebAssembly.Memory): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number } | InitInput | Promise<InitInput>, memory?: WebAssembly.Memory): Promise<InitOutput>;

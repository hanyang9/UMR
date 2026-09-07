/* tslint:disable */
/* eslint-disable */

export class ExactPointNetTrainer {
    free(): void;
    [Symbol.dispose](): void;
    current_step(): number;
    constructor(num_points: number, template: Float32Array, edge_index: Uint32Array);
    reconstruct(input: Float32Array): Float32Array;
    set_tensor(name: string, values: Float32Array): void;
    train_epoch(input: Float32Array, target: Float32Array, learning_rate: number): Float64Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_exactpointnettrainer_free: (a: number, b: number) => void;
    readonly exactpointnettrainer_current_step: (a: number) => number;
    readonly exactpointnettrainer_new: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly exactpointnettrainer_reconstruct: (a: number, b: number, c: number, d: number) => void;
    readonly exactpointnettrainer_set_tensor: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly exactpointnettrainer_train_epoch: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

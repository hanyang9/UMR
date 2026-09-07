/* tslint:disable */
/* eslint-disable */

/**
 * Solve the exact conic QP form used by UMR's Python Clarabel 0.11.1 path.
 *
 * Cone type codes are 0=zero/equality, 1=nonnegative, 2=second-order.
 * P must contain the upper triangle in CSC form, matching scipy.sparse.triu.
 */
export function solve_qp_csc(variable_count: number, p_column_pointers: Uint32Array, p_row_indices: Uint32Array, p_values: Float64Array, q: Float64Array, constraint_count: number, a_column_pointers: Uint32Array, a_row_indices: Uint32Array, a_values: Float64Array, b: Float64Array, cone_types: Uint8Array, cone_dimensions: Uint32Array): Float64Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly solve_qp_csc: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
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

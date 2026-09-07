/**
 * @license
 * Copyright 2024 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@tensorflow/tfjs-core')) :
    typeof define === 'function' && define.amd ? define(['exports', '@tensorflow/tfjs-core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.tf = global.tf || {}, global.tf));
})(this, (function (exports, tf) { 'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return n;
    }

    var tf__namespace = /*#__PURE__*/_interopNamespaceDefault(tf);

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b)
                if (Object.prototype.hasOwnProperty.call(b, p))
                    d[p] = b[p]; };
        return extendStatics(d, b);
    };
    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }
    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try {
                step(generator.next(value));
            }
            catch (e) {
                reject(e);
            } }
            function rejected(value) { try {
                step(generator["throw"](value));
            }
            catch (e) {
                reject(e);
            } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }
    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function () { if (t[0] & 1)
                throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f)
                throw new TypeError("Generator is already executing.");
            while (_)
                try {
                    if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                        return t;
                    if (y = 0, t)
                        op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                                _ = 0;
                                continue;
                            }
                            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2])
                                _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                }
                catch (e) {
                    op = [6, e];
                    y = 0;
                }
                finally {
                    f = t = 0;
                }
            if (op[0] & 5)
                throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
    }
    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
            return m.call(o);
        if (o && typeof o.length === "number")
            return {
                next: function () {
                    if (o && i >= o.length)
                        o = void 0;
                    return { value: o && o[i++], done: !o };
                }
            };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }
    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m)
            return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
                ar.push(r.value);
        }
        catch (error) {
            e = { error: error };
        }
        finally {
            try {
                if (r && !r.done && (m = i["return"]))
                    m.call(i);
            }
            finally {
                if (e)
                    throw e.error;
            }
        }
        return ar;
    }
    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
                if (ar || !(i in from)) {
                    if (!ar)
                        ar = Array.prototype.slice.call(from, 0, i);
                    ar[i] = from[i];
                }
            }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ENV = tf.env();
    /** The batched dispatching calls size in the device queue. */
    ENV.registerFlag('WEBGPU_DEFERRED_SUBMIT_BATCH_SIZE', function () { return 15; });
    /**
     * Whether we forward execution to the CPU backend if tensors are small and
     * reside on the CPU.
     */
    ENV.registerFlag('WEBGPU_CPU_FORWARD', function () { return true; });
    /**
     * This flag is used to test different types of matmul programs.
     *
     * See MatMulProgramType in webgpu_util.ts for a list of available values.
     */
    ENV.registerFlag('WEBGPU_MATMUL_PROGRAM_TYPE', function () { return -1; });
    /**
     * Whether to use conv2dTranspose_naive which directly implement the
     * conv2dTranspose logic rather than using a matmul to simulate.
     */
    ENV.registerFlag('WEBGPU_USE_NAIVE_CONV2D_TRANSPOSE', function () { return true; });
    /**
     * Whether we use low power GPU. Otherwise, a high performance GPU will be
     * requested.
     */
    ENV.registerFlag('WEBGPU_USE_LOW_POWER_GPU', function () { return false; });
    /**
     * Threshold for input tensor size that determines whether WebGPU backend will
     * delegate computation to CPU.
     *
     * Default value is 1000.
     */
    ENV.registerFlag('WEBGPU_CPU_HANDOFF_SIZE_THRESHOLD', function () { return 1000; });
    /**
     * Whether to use a dummy canvas to make profiling tools like PIX work with
     * TFJS webgpu backend.
     */
    ENV.registerFlag('WEBGPU_USE_PROFILE_TOOL', function () { return false; });
    /**
     * Whether to use import API.
     */
    ENV.registerFlag('WEBGPU_IMPORT_EXTERNAL_TEXTURE', function () { return true; });
    /**
     * Whether to use conv2dNaive for debugging.
     */
    ENV.registerFlag('WEBGPU_USE_NAIVE_CONV2D_DEBUG', function () { return false; });
    /**
     * Threshold to increase dispatched workgroups for matmul. If too few workgroups
     * are dispatched, it means the hardware may be in low occupancy.
     * -1 means it's not set by the user. A default strategy will be applied.
     */
    ENV.registerFlag('WEBGPU_THRESHOLD_TO_INCREASE_WORKGROUPS_FOR_MATMUL', function () { return -1; });
    /**
     * Whether we will run im2col as a separate shader for convolution.
     */
    ENV.registerFlag('WEBGPU_CONV_SEPARATE_IM2COL_SHADER', function () { return false; });
    /**
     * A string used to match shader key. If any matches, print the related shader.
     * Seperated by comma. 'all' to print all. 'binary' to print binary(add, mul,
     * etc.). 'unary,conv2d' to print both unary and conv2d.
     */
    ENV.registerFlag('WEBGPU_PRINT_SHADER', function () { return ''; });
    /** Experimental flag, whether enter compile only phase. */
    ENV.registerFlag('WEBGPU_ENGINE_COMPILE_ONLY', function () { return false; });

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var AdapterInfo = /** @class */ (function () {
        function AdapterInfo(adapterInfo) {
            if (adapterInfo) {
                this.vendor = adapterInfo.vendor;
                this.architecture = adapterInfo.architecture;
                this.intelGPUGeneration = this.getIntelGPUGeneration();
            }
        }
        AdapterInfo.prototype.getIntelGPUGeneration = function () {
            if (this.isIntel()) {
                if (this.architecture.startsWith('gen')) {
                    return Number(this.architecture.match(/\d+/));
                }
                else if (this.architecture.startsWith('xe')) {
                    return 12;
                }
            }
            return 0;
        };
        AdapterInfo.prototype.isIntel = function () {
            return this.vendor === 'intel';
        };
        return AdapterInfo;
    }());

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var BufferManager = /** @class */ (function () {
        function BufferManager(device) {
            this.device = device;
            this.numUsedBuffers = 0;
            this.numFreeBuffers = 0;
            this.freeBuffers = new Map();
            this.usedBuffers = new Map();
            this.numBytesUsed = 0;
            this.numBytesAllocated = 0;
        }
        BufferManager.prototype.acquireBuffer = function (size, usage, mappedAtCreation, reuse) {
            if (mappedAtCreation === void 0) { mappedAtCreation = false; }
            if (reuse === void 0) { reuse = true; }
            var buffer;
            var key = getBufferKey(size, usage);
            if (reuse) {
                if (!this.freeBuffers.has(key)) {
                    this.freeBuffers.set(key, []);
                }
                if (this.freeBuffers.get(key).length > 0) {
                    buffer = this.freeBuffers.get(key).pop();
                    this.numFreeBuffers--;
                }
                else {
                    buffer = this.device.createBuffer({ size: size, usage: usage, mappedAtCreation: mappedAtCreation });
                    this.numBytesAllocated += size;
                }
            }
            else {
                buffer = this.device.createBuffer({ size: size, usage: usage, mappedAtCreation: mappedAtCreation });
                this.numBytesAllocated += size;
            }
            if (!this.usedBuffers.has(key)) {
                this.usedBuffers.set(key, []);
            }
            this.usedBuffers.get(key).push(buffer);
            this.numUsedBuffers++;
            this.numBytesUsed += size;
            return buffer;
        };
        BufferManager.prototype.releaseBuffer = function (buffer, reuse) {
            if (reuse === void 0) { reuse = true; }
            if (this.freeBuffers.size === 0) {
                return;
            }
            var size = buffer.size;
            var usage = buffer.usage;
            var key = getBufferKey(size, usage);
            var bufferArray = this.usedBuffers.get(key);
            var index = bufferArray.indexOf(buffer);
            if (index < 0) {
                throw new Error('Cannot find the buffer in buffer manager');
            }
            bufferArray[index] = bufferArray[bufferArray.length - 1];
            bufferArray.pop();
            this.numUsedBuffers--;
            this.numBytesUsed -= size;
            if (reuse) {
                this.freeBuffers.get(key).push(buffer);
                this.numFreeBuffers++;
            }
            else {
                buffer.destroy();
                this.numBytesAllocated -= size;
            }
        };
        BufferManager.prototype.getNumUsedBuffers = function () {
            return this.numUsedBuffers;
        };
        BufferManager.prototype.getNumFreeBuffers = function () {
            return this.numFreeBuffers;
        };
        BufferManager.prototype.dispose = function () {
            this.freeBuffers.forEach(function (buffers, key) {
                buffers.forEach(function (buffer) {
                    buffer.destroy();
                });
            });
            this.usedBuffers.forEach(function (buffers, key) {
                buffers.forEach(function (buffer) {
                    buffer.destroy();
                });
            });
            this.freeBuffers = new Map();
            this.usedBuffers = new Map();
            this.numUsedBuffers = 0;
            this.numFreeBuffers = 0;
            this.numBytesUsed = 0;
            this.numBytesAllocated = 0;
        };
        return BufferManager;
    }());
    function getBufferKey(size, usage) {
        return "".concat(size, "_").concat(usage);
    }

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var TextureManager = /** @class */ (function () {
        function TextureManager(device) {
            this.device = device;
            this.numUsedTextures = 0;
            this.numFreeTextures = 0;
            this.freeTextures = new Map();
            this.usedTextures = new Map();
            this.numBytesUsed = 0;
            this.numBytesAllocated = 0;
        }
        TextureManager.prototype.acquireTexture = function (width, height, format, usage) {
            var bytesPerElement = getBytesPerElement(format);
            var byteSize = width * height * bytesPerElement;
            var key = getTextureKey(width, height, format, usage);
            if (!this.freeTextures.has(key)) {
                this.freeTextures.set(key, []);
            }
            if (!this.usedTextures.has(key)) {
                this.usedTextures.set(key, []);
            }
            this.numBytesUsed += byteSize;
            this.numUsedTextures++;
            if (this.freeTextures.get(key).length > 0) {
                this.numFreeTextures--;
                var newTexture_1 = this.freeTextures.get(key).shift();
                this.usedTextures.get(key).push(newTexture_1);
                return newTexture_1;
            }
            this.numBytesAllocated += byteSize;
            var newTexture = this.device.createTexture({
                size: [width, height],
                format: format,
                usage: usage,
            });
            this.usedTextures.get(key).push(newTexture);
            return newTexture;
        };
        TextureManager.prototype.releaseTexture = function (texture) {
            if (this.freeTextures.size === 0) {
                return;
            }
            var width = texture.width;
            var height = texture.height;
            var format = texture.format;
            var usage = texture.usage;
            var key = getTextureKey(width, height, format, usage);
            if (!this.freeTextures.has(key)) {
                this.freeTextures.set(key, []);
            }
            this.freeTextures.get(key).push(texture);
            this.numFreeTextures++;
            this.numUsedTextures--;
            var textureList = this.usedTextures.get(key);
            var textureIndex = textureList.indexOf(texture);
            if (textureIndex < 0) {
                throw new Error('Cannot release a texture that was never provided by this ' +
                    'texture manager');
            }
            textureList.splice(textureIndex, 1);
            var bytesPerElement = getBytesPerElement(format);
            var byteSize = width * height * bytesPerElement;
            this.numBytesUsed -= byteSize;
        };
        TextureManager.prototype.getNumUsedTextures = function () {
            return this.numUsedTextures;
        };
        TextureManager.prototype.getNumFreeTextures = function () {
            return this.numFreeTextures;
        };
        TextureManager.prototype.dispose = function () {
            this.freeTextures.forEach(function (textures, key) {
                textures.forEach(function (texture) {
                    texture.destroy();
                });
            });
            this.usedTextures.forEach(function (textures, key) {
                textures.forEach(function (texture) {
                    texture.destroy();
                });
            });
            this.freeTextures = new Map();
            this.usedTextures = new Map();
            this.numUsedTextures = 0;
            this.numFreeTextures = 0;
            this.numBytesUsed = 0;
            this.numBytesAllocated = 0;
        };
        return TextureManager;
    }());
    function getTextureKey(width, height, format, usage) {
        return "".concat(width, "_").concat(height, "_").concat(format, "_").concat(usage);
    }
    function getBytesPerElement(format) {
        if (format === 'rgba8unorm') {
            return 16;
        }
        else {
            throw new Error("".concat(format, " is not supported!"));
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    // Generates WGSL that computes strides.
    function symbolicallyComputeStrides(indicesArr, variableName) {
        if (Math.max.apply(Math, __spreadArray([], __read(indicesArr), false)) > 5) {
            throw new Error('Cannot symbolically compute strides for rank > 6 tensor.');
        }
        var numCoords = indicesArr.length;
        var indicesStr = 'xyzwuv';
        var shape = indicesArr.map(function (d) { return "".concat(variableName, ".").concat(indicesStr[d]); });
        var strides = new Array(numCoords - 1);
        strides[numCoords - 2] = shape[numCoords - 1];
        for (var i = numCoords - 3; i >= 0; --i) {
            strides[i] = "(".concat(strides[i + 1], " * ").concat(shape[i + 1], ")");
        }
        return strides;
    }
    var atomicAddSnippet = function (ptr, v, type) {
        if (type === 'int32') {
            return "atomicAdd(".concat(ptr, ", bitcast<i32>(").concat(v, "));");
        }
        else {
            // atomicAdd only supports uint/int type. For float, we use
            // atomicCompareExchangeWeak to simulate.
            return "\n          {\n            var oldValue = 0;\n            loop {\n              let newValueF32 = bitcast<f32>(oldValue) + (".concat(v, ");\n              let newValue = bitcast<i32>(newValueF32);\n              let res = atomicCompareExchangeWeak(").concat(ptr, ", oldValue, newValue);\n              if res.exchanged {\n                break;\n              }\n              oldValue = res.old_value;\n            }\n          }");
        }
    };

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var PixelsOpType;
    (function (PixelsOpType) {
        PixelsOpType[PixelsOpType["FROM_PIXELS"] = 0] = "FROM_PIXELS";
        PixelsOpType[PixelsOpType["DRAW"] = 1] = "DRAW";
    })(PixelsOpType || (PixelsOpType = {}));
    var compileProgram = function (device, program, inputsData, output, parallelCompilation) {
        var outputData = { dtype: output.dtype, shape: output.shape };
        var source = makeShader(inputsData, outputData, program);
        var module = device.createShaderModule({ code: source, label: program.constructor.name });
        var printShaderString = tf.env().get('WEBGPU_PRINT_SHADER');
        if (printShaderString !== '') {
            printShaderString = printShaderString.toLowerCase();
            var printShaderArray = printShaderString.split(',');
            if (printShaderString === 'all' ||
                printShaderArray.some(function (item) { return program.shaderKey.toLowerCase().includes(item); })) {
                console.group(program.shaderKey);
                console.debug(source);
                console.groupEnd();
            }
        }
        if (parallelCompilation) {
            return device.createComputePipelineAsync({
                compute: { module: module, entryPoint: '_start' },
                label: program.constructor.name,
                layout: 'auto'
            });
        }
        else {
            return device.createComputePipeline({
                compute: { module: module, entryPoint: '_start' },
                label: program.constructor.name,
                layout: 'auto'
            });
        }
    };
    var typeSnippet = function (component, type) {
        if (type === void 0) { type = 'f32'; }
        switch (component) {
            case 1:
                return "".concat(type);
            case 2:
                return "vec2<".concat(type, ">");
            case 3:
                return "vec3<".concat(type, ">");
            case 4:
                return "vec4<".concat(type, ">");
            default:
                throw new Error("".concat(component, "-component ").concat(type, " is not supported."));
        }
    };
    function getCoordsDataType(rank) {
        if (rank <= 1) {
            return 'i32';
        }
        else if (rank === 2) {
            return "vec2<i32>";
        }
        else if (rank === 3) {
            return "vec3<i32>";
        }
        else if (rank === 4) {
            return "vec4<i32>";
        }
        else if (rank === 5) {
            return "vec5";
        }
        else if (rank === 6) {
            return "vec6";
        }
        else {
            throw Error("GPU for rank ".concat(rank, " is not yet supported"));
        }
    }
    function getCoordsXYZ(index) {
        if (index === 0) {
            return 'x';
        }
        else if (index === 1) {
            return 'y';
        }
        else if (index === 2) {
            return 'z';
        }
        else if (index === 3) {
            return 'w';
        }
        else if (index === 4) {
            return 'u';
        }
        else if (index === 5) {
            return 'v';
        }
        else {
            throw Error("Index ".concat(index, " is not yet supported"));
        }
    }
    function getMainHeaderString() {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        var snippet;
        switch (params.length) {
            case 0:
                snippet = "\n        fn main()\n      ";
                break;
            case 1:
                snippet = "\n        fn main(".concat(params[0], " : i32)\n      ");
                break;
            default:
                throw Error('Unreachable');
        }
        return snippet;
    }
    function getStartHeaderString(useGlobalIndex, program) {
        var snippet;
        snippet = "\n     ".concat(getWorkgroupSizeString(program), "\n      fn _start(@builtin(local_invocation_id) LocalId : vec3<u32>,\n                @builtin(global_invocation_id) GlobalId : vec3<u32>,\n                @builtin(local_invocation_index) LocalIndex: u32,\n                @builtin(workgroup_id) WorkgroupId : vec3<u32>,\n                @builtin(num_workgroups) NumWorkgroups : vec3<u32>) {\n        localId = LocalId;\n        localIndex = LocalIndex;\n        globalId = GlobalId;\n        numWorkgroups = NumWorkgroups;\n        workgroupId = WorkgroupId;\n        ").concat(useGlobalIndex ? "main(getGlobalIndex());" : "main();", ";\n      }\n    ");
        return snippet;
    }
    function getWorkgroupSizeString(program) {
        return "\n  @compute @workgroup_size(".concat(program.workgroupSize[0], ", ").concat(program.workgroupSize[1], ", ").concat(program.workgroupSize[2], ")\n");
    }
    function makeShader(inputInfo, outputData, program) {
        var prefixSnippets = [];
        var flatWorkgroupSize = program.workgroupSize[0] *
            program.workgroupSize[1] * program.workgroupSize[2];
        program.outputComponent =
            program.outputComponent ? program.outputComponent : 1;
        prefixSnippets.push("\n\n      var<private> localId: vec3<u32>;\n      var<private> localIndex: u32;\n      var<private> globalId: vec3<u32>;\n      var<private> numWorkgroups: vec3<u32>;\n      var<private> workgroupId: vec3<u32>;\n\n      // Only used when the y/z dimension of workgroup size is 1.\n      fn getGlobalIndex() -> i32 {\n        ".concat(isFlatDispatch(program) ?
            "  return i32(globalId.x);" :
            "  return i32((workgroupId.z * numWorkgroups.x * numWorkgroups.y +\n                workgroupId.y * numWorkgroups.x + workgroupId.x) * ".concat(flatWorkgroupSize, "u +\n                localIndex);\n        "), "\n      }\n    "));
        if (program.pixelsOpType != null) {
            var inoutSnippet = program.pixelsOpType === PixelsOpType.FROM_PIXELS ?
                "@group(0) @binding(0) var<storage, read_write> result: array<".concat(dataTypeToGPUType(outputData.dtype, program.outputComponent), ">;") :
                "@group(0) @binding(1) var<storage, read> inBuf : array<".concat(dataTypeToGPUType(inputInfo[0].dtype, program.outputComponent), ">;");
            var outShapeStridesType = outputData.shape.length === 3 ? 'vec2<i32>' : 'i32';
            prefixSnippets.push("\n        struct Uniform {\n          outShapeStrides : ".concat(outShapeStridesType, ",\n          size            : i32,\n          numChannels     : i32,\n          alpha           : f32,\n        };\n\n        ").concat(inoutSnippet, "\n        @group(0) @binding(2) var<uniform> uniforms: Uniform;\n      "));
            var useGlobalIndex_1 = isFlatDispatchLayout(program);
            return [
                commonSnippet,
                prefixSnippets.join('\n'),
                getCoordsFromIndexSnippet(outputData.shape),
                program.getUserCode(),
                getStartHeaderString(useGlobalIndex_1, program),
            ].join('\n');
        }
        var stridesLength;
        var stridesDataType;
        var uniformDeclaration = 'struct Uniforms { NAN : f32, INFINITY : f32, ';
        program.variableNames.forEach(function (x, i) {
            var perDataType = getCoordsDataType(inputInfo[i].shape.length);
            uniformDeclaration +=
                "".concat(x.charAt(0).toLowerCase() + x.slice(1), "Shape : ").concat(perDataType, ", ");
            stridesLength = inputInfo[i].shape.length - 1;
            stridesDataType = getCoordsDataType(stridesLength);
            uniformDeclaration +=
                "".concat(x.charAt(0).toLowerCase() + x.slice(1), "ShapeStrides: ").concat(stridesDataType, ", ");
        });
        var outputDataType = getCoordsDataType(outputData.shape.length);
        uniformDeclaration += "outShape : ".concat(outputDataType, ", ");
        stridesLength = outputData.shape.length - 1;
        stridesDataType = getCoordsDataType(stridesLength);
        uniformDeclaration += "\n         outShapeStrides: ".concat(stridesDataType, ", ");
        if (program.size) {
            uniformDeclaration += 'size : i32, ';
        }
        if (program.uniforms) {
            uniformDeclaration += program.uniforms;
        }
        uniformDeclaration += '};';
        uniformDeclaration = insertAlignment(uniformDeclaration);
        prefixSnippets.push(uniformDeclaration);
        // Output buffer.
        if (program.atomic) {
            prefixSnippets.push("\n      @group(0) @binding(0) var<storage, read_write> result: array<atomic<i32>>;\n    ");
        }
        else {
            prefixSnippets.push("\n      @group(0) @binding(0) var<storage, read_write> result: array<".concat(dataTypeToGPUType(outputData.dtype, program.outputComponent), ">;\n    "));
        }
        program.variableNames.forEach(function (x, i) {
            prefixSnippets.push("\n      @group(0) @binding(".concat(1 + i, ") var<storage, read> ").concat(x, ": array<").concat(program.variableComponents ?
                dataTypeToGPUType(inputInfo[i].dtype, program.variableComponents[i]) :
                dataTypeToGPUType(inputInfo[i].dtype, program.outputComponent), ">;\n        "));
        });
        if (uniformDeclaration !== '') {
            prefixSnippets.push("\n      @group(0) @binding(".concat(1 + program.variableNames.length, ") var<uniform> uniforms: Uniforms;\n      "));
        }
        var coordsSnippet = getOutputCoordsSnippet(outputData.shape, program.dispatchLayout);
        var sources = [
            commonSnippet, prefixSnippets.join('\n') + isInfSnippet,
            getCoordsFromIndexSnippet(outputData.shape), coordsSnippet,
            getOutputIndexFromCoordsSnippet(outputData.shape.length)
        ];
        if (!program.atomic) {
            sources.push(setOutputSnippet(outputData.shape, outputData.dtype, program.outputComponent));
        }
        program.variableNames.forEach(function (x, i) {
            sources.push("".concat(getCoordsFromIndexSnippet(inputInfo[i].shape, x)));
        });
        var inputSnippet = inputInfo
            .map(function (x, i) { return getInputSnippet(x, outputData.shape, program.variableComponents ? program.variableComponents[i] :
            program.outputComponent, program.dispatchLayout.x.length === outputData.shape.length); })
            .join('\n');
        sources.push(inputSnippet);
        sources.push(program.getUserCode());
        var useGlobalIndex = isFlatDispatchLayout(program);
        sources.push(getStartHeaderString(useGlobalIndex, program));
        var source = sources.join('\n');
        return source;
    }
    function makeShaderKey(program, inputsData, output) {
        var key = program.shaderKey;
        if (program.pixelsOpType != null) {
            return key;
        }
        var shapes = [];
        var types = [];
        inputsData.forEach(function (element) {
            shapes.push(element.shape);
            types.push(element.dtype);
        });
        shapes.push(output.shape);
        types.push(output.dtype);
        var broadcastDims = inputsData.map(function (d) { return tf.backend_util.getBroadcastDims(d.shape, output.shape); });
        var inputShapesEqualsOutShape = inputsData.map(function (d) { return tf.util.arraysEqual(d.shape, output.shape); }).join('_');
        var broadcastDimsKey = broadcastDims.map(function (d) { return d.join('_'); }).join(';');
        var flatDispatchString = isFlatDispatch(program) ? 'flatDispatch' : '';
        key += '_' + (program.workgroupSize ? program.workgroupSize.join(',') : '') +
            shapes.map(function (shape) { return shape.length; }).join(',') + types.join(',') +
            program.variableNames.join(',') + broadcastDimsKey +
            inputShapesEqualsOutShape + flatDispatchString;
        return key;
    }
    var commonSnippet = "\n  struct vec5 {x: i32, y: i32, z: i32, w: i32, u: i32};\n  struct vec6 {x: i32, y: i32, z: i32, w: i32, u: i32, v: i32};\n\n  // Checks whether coordinates lie within the bounds of the shape.\n  fn coordsInBounds2D(coord : vec2<i32>, shape : vec2<i32>) -> bool {\n    return all(coord >= vec2<i32>(0)) && all(coord < shape);\n  }\n  fn coordsInBounds3D(coord : vec3<i32>, shape : vec3<i32>) -> bool {\n    return all(coord >= vec3<i32>(0)) && all(coord < shape);\n  }\n  fn coordsInBounds4D(coord : vec4<i32>, shape : vec4<i32>) -> bool {\n    return all(coord >= vec4<i32>(0)) && all(coord < shape);\n  }\n\n  fn getIndexFromCoords1D(coord : i32, shape : i32) -> i32 {\n    return coord;\n  }\n  fn getIndexFromCoords2D(coords : vec2<i32>, shape : vec2<i32>) -> i32 {\n    return dot(coords, vec2<i32>(shape.y, 1));\n  }\n  fn getIndexFromCoords3D(coords : vec3<i32>, shape : vec3<i32>) -> i32 {\n    return dot(coords, vec3<i32>(shape.y * shape.z, shape.z, 1));\n  }\n  fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {\n    return dot(coords, vec4<i32>(\n        shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));\n  }\n  fn getIndexFromCoords5D(coords : vec5, shape : vec5) -> i32 {\n    let shapeStrides: vec5 = vec5(shape.y * shape.z * shape.w * shape.u, shape.z * shape.w * shape.u, shape.w * shape.u, shape.u, 1);\n    return coords.x*shapeStrides.x + coords.y*shapeStrides.y + coords.z*shapeStrides.z + coords.w*shapeStrides.w + coords.u*shapeStrides.u;\n  }\n  fn getIndexFromCoords6D(coords : vec6, shape : vec6) -> i32 {\n    let shapeStrides: vec6 = vec6(shape.y * shape.z * shape.w * shape.u * shape.v, shape.z * shape.w * shape.u * shape.v, shape.w * shape.u * shape.v, shape.u * shape.v, shape.v, 1);\n    return coords.x*shapeStrides.x + coords.y*shapeStrides.y + coords.z*shapeStrides.z + coords.w*shapeStrides.w + coords.u*shapeStrides.u + coords.v*shapeStrides.v;\n  }\n\n  // NaN defination in IEEE 754-1985 is :\n  //   - sign = either 0 or 1.\n  //   - biased exponent = all 1 bits.\n  //   - fraction = anything except all 0 bits (since all 0 bits represents infinity).\n  // https://en.wikipedia.org/wiki/IEEE_754-1985#Representation_of_non-numbers\n  fn isnan(val: f32) -> bool {\n    let floatToUint: u32 = bitcast<u32>(val);\n    return (floatToUint & 0x7fffffffu) > 0x7f800000u;\n  }\n  fn isnanVec4(val : vec4<f32>) -> vec4<bool> {\n    let floatToUint: vec4<u32> = bitcast<vec4<u32>>(val);\n    return (floatToUint & vec4<u32>(0x7fffffffu)) > vec4<u32>(0x7f800000u);\n  }\n";
    var isInfSnippet = "\n  fn isinf(val: f32) -> bool {\n    return abs(val) == uniforms.INFINITY;\n  }\n";
    /**
     * Derives logical coordinates from a flat index. Performs integer division
     * with each stride and decrements the index until the index equals the final
     * dimension coordinate.
     */
    function getCoordsFromIndexSnippet(shape, name) {
        if (name === void 0) { name = ''; }
        var rank = shape.length;
        var funcName = name !== '' ?
            "get".concat(name.charAt(0).toUpperCase() + name.slice(1), "CoordsFromIndex") :
            'getCoordsFromIndex';
        var stridesName = name !== '' ?
            "".concat(name.charAt(0).toLowerCase() + name.slice(1), "ShapeStrides") :
            "outShapeStrides";
        if (rank <= 1) {
            return "fn ".concat(funcName, "(index : i32) -> i32 { return index; }");
        }
        var strides = tf.util.computeStrides(shape);
        var dtype = getCoordsDataType(rank);
        var coords = [];
        for (var i = 0; i < rank; i++) {
            coords.push("d".concat(i));
        }
        if (strides.length === 1) {
            return "    fn ".concat(funcName, "(index : i32) -> vec2<i32> {\n      let d0 = index / uniforms.").concat(stridesName, "; let d1 = index - d0 * uniforms.").concat(stridesName, ";\n      return vec2<i32>(d0, d1);\n    }");
        }
        var snippet;
        snippet = 'var index2 = index;' +
            strides
                .map(function (_, i) {
                var line1 = "let ".concat(coords[i], " = index2 / uniforms.").concat(stridesName, ".").concat(getCoordsXYZ(i));
                var line2 = i === strides.length - 1 ?
                    "let ".concat(coords[i + 1], " = index2 - ").concat(coords[i], " * uniforms.").concat(stridesName, ".").concat(getCoordsXYZ(i)) :
                    "index2 = index2 - ".concat(coords[i], " * uniforms.").concat(stridesName, ".").concat(getCoordsXYZ(i));
                return "".concat(line1, "; ").concat(line2, ";");
            })
                .join('');
        return "\n    fn ".concat(funcName, "(index : i32) -> ").concat(dtype, " {\n      ").concat(snippet, "\n      return ").concat(dtype, "(").concat(coords.join(','), ");\n    }\n  ");
    }
    function getInputAtCoordsSnippet(inputInfo, component) {
        var texName = inputInfo.name;
        var rank = inputInfo.shape.length;
        var type = getCoordsDataType(rank);
        var funcName = 'get' + texName.charAt(0).toUpperCase() + texName.slice(1);
        var dims = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'].slice(0, rank);
        var inputs = dims.map(function (d) { return "".concat(d, " : i32"); }).join(', ');
        if (rank < 1) {
            return "\n      fn ".concat(funcName, "() -> ").concat(typeSnippet(component), " {\n        return ").concat(typeSnippet(component), "(").concat(texName, "[0]);\n      }\n    ");
        }
        var shapeStr = "uniforms.".concat(texName.charAt(0).toLowerCase() + texName.slice(1), "Shape");
        var rankStr = "".concat(rank, "D");
        if (rank === 0) {
            rankStr = '1D';
        }
        return "\n    fn ".concat(funcName, "(").concat(inputs, ") -> ").concat(typeSnippet(component), " {\n      return ").concat(typeSnippet(component), "(").concat(texName, "[getIndexFromCoords").concat(rankStr, "(").concat(type, "(").concat(dims.join(','), "),\n        ").concat(shapeStr, ")").concat(component === 1 ? '' : " / ".concat(component), "]);\n    }\n   ");
    }
    function getInputByOutputSnippet(inputInfo, outShape, component, isFlatDispatchLayout) {
        var texName = inputInfo.name;
        var texFuncSnippet = texName.charAt(0).toUpperCase() + texName.slice(1);
        var funcName = 'get' + texFuncSnippet + 'ByOutput';
        var inRank = inputInfo.shape.length;
        var outRank = outShape.length;
        var type = getCoordsDataType(outRank);
        // If the inShape equals the outShape and the dispatch layout is flat, we can
        // directly use |gl_GlobalInvocationID.x| as the index and don't need coords
        // conversion between these two shapes.
        if (tf.util.arraysEqual(inputInfo.shape, outShape) && isFlatDispatchLayout) {
            return "\n    fn ".concat(funcName, "Index(globalIndex : i32) -> ").concat(typeSnippet(component), " {\n      return ").concat(typeSnippet(component), "(").concat(texName, "[globalIndex]);\n    }\n\n    fn ").concat(funcName, "Coords(coords : ").concat(type, ") -> ").concat(typeSnippet(component), " {\n      return ").concat(typeSnippet(component), "(").concat(texName, "[").concat(outRank > 1 ? 'getOutputIndexFromCoords(coords)' :
                'coords').concat(component === 1 ? '' : " / ".concat(component), "]);\n    }\n    ");
        }
        var broadcastDims = tf.backend_util.getBroadcastDims(inputInfo.shape, outShape);
        var rankDiff = outRank - inRank;
        var coordsSnippet = '';
        if (inRank === 0) {
            return "\n    fn ".concat(funcName, "Index(globalIndex : i32) -> ").concat(typeSnippet(component), "{\n      return get").concat(texFuncSnippet, "();\n    }\n\n    fn ").concat(funcName, "Coords(coords : ").concat(type, ") -> ").concat(typeSnippet(component), "{\n      return get").concat(texFuncSnippet, "();\n    }\n  ");
        }
        else {
            if (outRank < 2 && broadcastDims.length >= 1) {
                coordsSnippet = 'coords = 0;';
            }
            else {
                coordsSnippet =
                    broadcastDims.map(function (d) { return "coords.".concat(getCoordsXYZ(d + rankDiff), " = 0;"); })
                        .join('\n');
            }
        }
        var unpackedCoordsSnippet = '';
        if (outRank < 2 && inRank > 0) {
            unpackedCoordsSnippet = 'coords';
        }
        else {
            if (outRank > 1) {
                var coordsType = getCoordsDataType(inRank);
                var coordsValues = inputInfo.shape.map(function (s, i) { return "coords.".concat(getCoordsXYZ(i + rankDiff)); })
                    .join(', ');
                unpackedCoordsSnippet = "".concat(coordsType, "(").concat(coordsValues, ")");
            }
            else {
                unpackedCoordsSnippet = 'coords';
            }
        }
        var shapeStr = "uniforms.".concat(texName.charAt(0).toLowerCase() + texName.slice(1), "Shape");
        var rankStr = "".concat(inRank, "D");
        return "\n  fn ".concat(funcName, "Index(globalIndex : i32) -> ").concat(typeSnippet(component), " {\n    var coords = getCoordsFromIndex(globalIndex);\n    ").concat(coordsSnippet, "\n    return ").concat(typeSnippet(component), "(").concat(texName, "[getIndexFromCoords").concat(rankStr, "(").concat(unpackedCoordsSnippet, ", ").concat(shapeStr, ")").concat(component === 1 ? '' : " / ".concat(component), "]);\n  }\n\n  fn ").concat(funcName, "Coords(coordsIn : ").concat(type, ") -> ").concat(typeSnippet(component), " {\n    var coords = coordsIn;\n    ").concat(coordsSnippet, "\n    return ").concat(typeSnippet(component), "(").concat(texName, "[getIndexFromCoords").concat(rankStr, "(").concat(unpackedCoordsSnippet, ", ").concat(shapeStr, ")").concat(component === 1 ? '' : " / ".concat(component), "]);\n  }\n");
    }
    function getInputSnippet(inputInfo, outShape, component, isFlatDispatchLayout) {
        var res = getInputAtCoordsSnippet(inputInfo, component);
        var inShape = inputInfo.shape;
        if (inShape.length <= outShape.length) {
            res += getInputByOutputSnippet(inputInfo, outShape, component, isFlatDispatchLayout);
        }
        return res;
    }
    /**
     * Generates getOutputCoords() function that computes output coordinates
     * from dispatch geometry to reduce arithmetic.
     */
    function getOutputCoordsSnippet(outShape, dispatchLayout) {
        var x = dispatchLayout.x, _a = dispatchLayout.y, y = _a === void 0 ? [] : _a, _b = dispatchLayout.z, z = _b === void 0 ? [] : _b;
        var outRank = outShape.length;
        var rank = x.length + y.length + z.length;
        // getOutputCoords is only meaningful when the output rank is same with
        // dispatch layout rank.
        if (rank !== outRank) {
            return '';
        }
        if (x.length === outRank) {
            var dtype_1 = getCoordsDataType(outRank);
            var snippet_1 = "fn getOutputCoords() -> ".concat(dtype_1, "{\n    let globalIndex = getGlobalIndex();\n    return getCoordsFromIndex(globalIndex);\n  }\n  ");
            return snippet_1;
        }
        var gatherDimensionsStr = '';
        var dims = [x, y, z];
        for (var i = 0; i < dims.length; i++) {
            var arr = dims[i];
            if (arr.length === 0) {
                continue;
            }
            if (arr.length === 1) {
                gatherDimensionsStr += "let d".concat(arr[0], " = i32(globalId[").concat(i, "]);");
            }
            else {
                var strides = symbolicallyComputeStrides(arr, 'uniforms.outShape');
                gatherDimensionsStr += "var index".concat(i, " = i32(globalId[").concat(i, "]);");
                for (var j = 0; j < strides.length; j++) {
                    gatherDimensionsStr += "let d".concat(arr[j], " = index").concat(i, " / ").concat(strides[j], ";");
                    if (j === strides.length - 1) {
                        gatherDimensionsStr += "let d".concat(arr[j + 1], " = ") +
                            "index".concat(i, " - d").concat(arr[j], " * ").concat(strides[j], ";");
                    }
                    else {
                        gatherDimensionsStr +=
                            "index".concat(i, " = index").concat(i, " - d").concat(arr[j], " * ").concat(strides[j], ";");
                    }
                }
            }
        }
        var dimensions = [];
        for (var i = 0; i < rank; i++) {
            dimensions.push("d".concat(i));
        }
        var dtype = getCoordsDataType(rank);
        var snippet = "fn getOutputCoords() -> ".concat(dtype, " {\n  ").concat(gatherDimensionsStr, "\n");
        if (dimensions.length === 0) {
            snippet += "return ".concat(dtype, "(0); }");
        }
        else {
            snippet += "return ".concat(dtype, "(").concat(dimensions.join(','), "); }");
        }
        return snippet;
    }
    function getOutputIndexFromCoordsSnippet(outRank) {
        var snippet = '';
        switch (outRank) {
            case 0:
            case 1:
                snippet += "\n        fn getOutputIndexFromCoords(coords : i32) -> i32 {\n          return coords;\n        }\n        ";
                break;
            case 2:
                snippet += "\n        fn getOutputIndexFromCoords(coords : vec2<i32>) -> i32 {\n          return dot(coords, vec2<i32>(uniforms.outShapeStrides, 1));\n        }\n        ";
                break;
            case 3:
                snippet += "\n        fn getOutputIndexFromCoords(coords : vec3<i32>) -> i32 {\n          return dot(coords, vec3<i32>(uniforms.outShapeStrides.x, uniforms.outShapeStrides.y, 1));\n        }\n        ";
                break;
            case 4:
                snippet += "\n        fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {\n          return dot(coords, vec4<i32>(\n            uniforms.outShapeStrides.x, uniforms.outShapeStrides.y, uniforms.outShapeStrides.z, 1));\n        }\n        ";
                break;
            case 5:
                snippet += "\n        fn getOutputIndexFromCoords(coords : vec5) -> i32 {\n          return coords.x * uniforms.outShapeStrides.x +\n              coords.y * uniforms.outShapeStrides.y +\n              coords.z * uniforms.outShapeStrides.z +\n              coords.w * uniforms.outShapeStrides.w +\n              coords.u;\n        }\n        ";
                break;
            case 6:
                snippet += "\n        fn getOutputIndexFromCoords(coords : vec6) -> i32 {\n          return coords.x * uniforms.outShapeStrides.x +\n              coords.y * uniforms.outShapeStrides.y +\n              coords.z * uniforms.outShapeStrides.z +\n              coords.w * uniforms.outShapeStrides.w +\n              coords.u * uniforms.outShapeStrides.u +\n              coords.v;\n        }\n        ";
                break;
            default:
                tf.util.assert(false, function () { return "Unsupported ".concat(outRank, "D shape"); });
                break;
        }
        return snippet;
    }
    function isFlatDispatch(program) {
        return program.dispatch[1] === 1 && program.dispatch[2] === 1;
    }
    function dataTypeToGPUType(type, component) {
        if (component === void 0) { component = 1; }
        if (type === 'float32') {
            return typeSnippet(component, 'f32');
        }
        else if (type === 'int32' || type === 'bool') {
            return typeSnippet(component, 'i32');
        }
        throw new Error("type ".concat(type, " is not supported."));
    }
    function setOutputSnippet(outShape, outBufferType, component) {
        var outRank = outShape.length;
        var gpuType = dataTypeToGPUType(outBufferType, component);
        var snippet = "fn setOutputAtIndex(flatIndex : i32, value : ".concat(typeSnippet(component), ") {\n      result[flatIndex] = ").concat(gpuType, "(value);\n    }\n\n    fn setOutputAtIndexI32(flatIndex : i32, value : ").concat(typeSnippet(component, 'i32'), ") {\n      result[flatIndex] = ").concat(gpuType, "(value);\n    }\n    ");
        if (outRank >= 2) {
            var dims = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'].slice(0, outRank);
            var type = getCoordsDataType(outRank);
            snippet += "\n      fn setOutputAtCoords(".concat(dims.map(function (d) { return "".concat(d, " : i32"); }).join(', '), ", value : ").concat(typeSnippet(component), ") {\n        let flatIndex = getOutputIndexFromCoords(").concat(type, "(").concat(dims.join(', '), "));\n        setOutputAtIndex(flatIndex").concat(component === 1 ? '' : " / ".concat(component), ", value);\n      }\n      fn setOutputAtCoordsI32(").concat(dims.map(function (d) { return "".concat(d, " : i32"); }).join(', '), ", value : ").concat(typeSnippet(component, 'i32'), ") {\n        let flatIndex = getOutputIndexFromCoords(").concat(type, "(").concat(dims.join(', '), "));\n        setOutputAtIndexI32(flatIndex").concat(component === 1 ? '' : " / ".concat(component), ", value);\n      }\n    ");
        }
        return snippet;
    }
    function insertAlignment(uniformShader) {
        // insert alignment when current pattern is vec5 or vec6
        var curInsertRe = /(\w+)\s*:\s*vec(5|6)/g;
        uniformShader = uniformShader.replace(curInsertRe, function (match) {
            return '@align(16) ' + match;
        });
        // insert alignment when previous pattern is vec5 or vec6
        var preInsertRe = /vec(5|6)\s*,\s*(\w+)/g;
        uniformShader = uniformShader.replace(preInsertRe, function (_, p1, p2) {
            return "vec".concat(p1, ", @align(16) ").concat(p2);
        });
        return uniformShader;
    }
    function isFlatDispatchLayout(program) {
        if (program.dispatchLayout.hasOwnProperty('y') &&
            program.dispatchLayout.y.length !== 0) {
            return false;
        }
        if (program.dispatchLayout.hasOwnProperty('z') &&
            program.dispatchLayout.z.length !== 0) {
            return false;
        }
        return true;
    }

    var arrayProduct = function (arr) {
        var product = 1;
        for (var i = 0; i < arr.length; i++) {
            product *= arr[i];
        }
        return product;
    };
    function tilesFitEvenlyIntoShape(tileSize, shape) {
        if (tileSize.length !== shape.length) {
            throw new Error("Cannot compute whether rank ".concat(tileSize.length) +
                " tiles fit evenly into rank ".concat(shape.length, " shape") +
                " - ranks must match.");
        }
        return shape.every(function (dim, dimIdx) { return dim % tileSize[dimIdx] === 0; });
    }
    // Computes dispatch geometry based on layout of output dimensions and
    // workgroupSize.
    function computeDispatch(layout, outputShape, workgroupSize, elementsPerThread) {
        if (workgroupSize === void 0) { workgroupSize = [1, 1, 1]; }
        if (elementsPerThread === void 0) { elementsPerThread = [1, 1, 1]; }
        var _a = __read([
            Math.ceil(arrayProduct(layout.x.map(function (d) { return outputShape[d]; })) /
                (workgroupSize[0] * elementsPerThread[0])),
            layout.y ? Math.ceil(arrayProduct(layout.y.map(function (d) { return outputShape[d]; })) /
                (workgroupSize[1] * elementsPerThread[1])) :
                1,
            layout.z ? Math.ceil(arrayProduct(layout.z.map(function (d) { return outputShape[d]; })) /
                (workgroupSize[2] * elementsPerThread[2])) :
                1
        ], 3), dispatchX = _a[0], dispatchY = _a[1], dispatchZ = _a[2];
        return [dispatchX, dispatchY, dispatchZ];
    }
    function computeWorkgroupInfoForMatMul(dimAOuter, dimInner, dimBOuter, transposeA) {
        if (transposeA === void 0) { transposeA = false; }
        // These are experimental values. Usually, we need to adjust the work group
        // size based on the input shapes to improve the EU occupancy.
        // TODO: WebGPU limits the maximum allowed shared memory size as 16K. To make
        // sure it doesn't exceed this limitations. Temporarily reduce the work group
        // size to [8, 8, 1] and the work per thread size is [4, 4, 1]. But we should
        // revisit it and find the balance between work group size and work per thread
        // size.
        var workgroupSize = [8, 8, 1];
        var elementsPerThread = [4, 4, 1];
        if (!transposeA) {
            if (dimAOuter <= 8) {
                elementsPerThread[1] = 1;
            }
            if (dimInner <= 16 && dimBOuter <= 16) {
                workgroupSize[0] = 4;
            }
        }
        return { workgroupSize: workgroupSize, elementsPerThread: elementsPerThread };
    }
    function computeWorkgroupSizeForConv2d(layout, outputShape, isVec4) {
        if (isVec4 === void 0) { isVec4 = false; }
        if (isVec4) {
            return [8, 8, 1];
        }
        var dim0 = arrayProduct(layout.x.map(function (d) { return outputShape[d]; }));
        var dim1 = arrayProduct(layout.y.map(function (d) { return outputShape[d]; }));
        // TODO(jiajia.qin@intel.com): More fine tune based on outputShape.
        // These are experimental values. Usually, we need to adjust the work group
        // size based on the output shape. For example, when one dimension is smaller
        // than 4, it will be wasteful if we assign a larger size for this dimension,
        // which results lots of threads doing useless work and reduces parallelism
        // of hardware threads. But it is always a balance between work group size
        // and shared memory. If one dimension is too small, such as 1, shared memory
        // will won't be fully utilized.
        if (dim0 <= 4) {
            return [4, 16, 1];
        }
        if (dim1 <= 4) {
            return [16, 4, 1];
        }
        return [16, 16, 1];
    }
    function computeWorkPerThreadForConv2d(layout, outputShape, isVec4) {
        if (isVec4 === void 0) { isVec4 = false; }
        if (isVec4) {
            return [4, 4, 1];
        }
        var dim0 = arrayProduct(layout.x.map(function (d) { return outputShape[d]; }));
        var dim1 = arrayProduct(layout.y.map(function (d) { return outputShape[d]; }));
        // TODO(jiajia.qin@intel.com): More fine tune based on outputShape.
        // The following conditions correspond to the values set in
        // computeWorkgroupSizeForConv2d.
        if (dim0 <= 4) {
            return [1, 2, 1];
        }
        if (dim1 <= 4) {
            return [2, 1, 1];
        }
        return [2, 2, 1];
    }
    function flatDispatchLayout(shape) {
        return { x: shape.map(function (d, i) { return i; }) };
    }
    function GPUBytesPerElement(dtype) {
        if (dtype === 'float32' || dtype === 'int32' || dtype === 'bool' ||
            dtype === 'string') {
            return 4;
        }
        else if (dtype === 'complex64') {
            return 8;
        }
        else {
            throw new Error("Unknown dtype ".concat(dtype));
        }
    }
    function isWebGPUSupported() {
        return !!(typeof globalThis !== 'undefined' && (globalThis.navigator)
            && (globalThis.navigator.gpu));
    }
    function assertNotComplex(tensor, opName) {
        if (!Array.isArray(tensor)) {
            tensor = [tensor];
        }
        tensor.forEach(function (t) {
            if (t != null) {
                tf.util.assert(t.dtype !== 'complex64', function () { return "".concat(opName, " does not support complex64 tensors ") +
                    'in the WebGPU backend.'; });
            }
        });
    }
    var MatMulProgramType;
    (function (MatMulProgramType) {
        MatMulProgramType[MatMulProgramType["MatMulReduceProgram"] = 0] = "MatMulReduceProgram";
        MatMulProgramType[MatMulProgramType["MatMulSplitKProgram"] = 1] = "MatMulSplitKProgram";
        MatMulProgramType[MatMulProgramType["MatMulSmallOutputSizeProgram"] = 2] = "MatMulSmallOutputSizeProgram";
        MatMulProgramType[MatMulProgramType["MatMulPackedProgram"] = 3] = "MatMulPackedProgram";
        MatMulProgramType[MatMulProgramType["MatMulMax"] = 4] = "MatMulMax";
    })(MatMulProgramType || (MatMulProgramType = {}));

    var webgpu_util = {
        __proto__: null,
        GPUBytesPerElement: GPUBytesPerElement,
        get MatMulProgramType () { return MatMulProgramType; },
        assertNotComplex: assertNotComplex,
        computeDispatch: computeDispatch,
        computeWorkPerThreadForConv2d: computeWorkPerThreadForConv2d,
        computeWorkgroupInfoForMatMul: computeWorkgroupInfoForMatMul,
        computeWorkgroupSizeForConv2d: computeWorkgroupSizeForConv2d,
        flatDispatchLayout: flatDispatchLayout,
        isWebGPUSupported: isWebGPUSupported,
        tilesFitEvenlyIntoShape: tilesFitEvenlyIntoShape
    };

    // Empirically determined constant used to determine size threshold for handing
    // off execution to the CPU.
    var CPU_HANDOFF_SIZE_THRESHOLD = tf.env().getNumber('WEBGPU_CPU_HANDOFF_SIZE_THRESHOLD');
    // Reshape dispatch, not to exceed device limits.
    var reshapeDispatch = function (device, program) {
        var MAX_COMPUTE_PER_DIMENSION_DISPATCH_SIZE = device.limits.maxComputeWorkgroupsPerDimension;
        var layout = program['dispatchLayout'];
        var dispatch = program['dispatch'];
        if (dispatch.every(function (d) { return d <= MAX_COMPUTE_PER_DIMENSION_DISPATCH_SIZE; })) {
            return dispatch;
        }
        tf.util.assert(dispatch[0] > MAX_COMPUTE_PER_DIMENSION_DISPATCH_SIZE &&
            layout.y === undefined && layout.z === undefined, function () { return 'Dispatch size exceeds WebGPU limits in Y or Z dimension.'; });
        var dispatchAverage = Math.ceil(Math.sqrt(dispatch[0]));
        if (dispatchAverage > MAX_COMPUTE_PER_DIMENSION_DISPATCH_SIZE) {
            dispatchAverage = Math.ceil(Math.cbrt(dispatch[0]));
            tf.util.assert(dispatchAverage <= MAX_COMPUTE_PER_DIMENSION_DISPATCH_SIZE, function () { return 'Total dispatch size exceeds WebGPU maximum.'; });
            return [dispatchAverage, dispatchAverage, dispatchAverage];
        }
        else {
            return [dispatchAverage, dispatchAverage, 1];
        }
    };
    var WebGPUBackend = /** @class */ (function (_super) {
        __extends(WebGPUBackend, _super);
        function WebGPUBackend(device, adapterInfo) {
            var _this = _super.call(this) || this;
            _this.commandQueueOwnedIds = new WeakSet();
            _this.dispatchCountInPass = 0;
            _this.disposed = false;
            _this.downloadWaitMs = 0;
            _this.tensorDataPendingDisposal = [];
            _this.queryResolveBuffer = null;
            _this.querySet = null;
            _this.querySetCount = 2;
            _this.stagingPendingDisposal = [];
            _this.uniformPendingDisposal = [];
            _this.uploadWaitMs = 0;
            _this.hasReadSyncWarned = false;
            _this.hasTimestampQueryWarned = false;
            if (!isWebGPUSupported()) {
                throw new Error('WebGPU is not supported on this device');
            }
            _this.pipelineCache = {};
            _this.device = device;
            _this.queue = device.queue;
            _this.commandEncoder = null;
            _this.computePassEncoder = null;
            _this.adapterInfo = new AdapterInfo(adapterInfo);
            _this.supportTimestampQuery = _this.device.features.has('timestamp-query');
            _this.thresholdToIncreaseWorkgroups =
                _this.adapterInfo.intelGPUGeneration >= 12 ? 16 : 8;
            _this.bufferManager = new BufferManager(_this.device);
            _this.textureManager = new TextureManager(_this.device);
            _this.tensorMap = new tf.DataStorage(_this, tf.engine());
            // Profiling tools like PIX needs this dummy canvas to
            // trigger capturing a frame.
            if (tf.env().getBool('WEBGPU_USE_PROFILE_TOOL')) {
                _this.dummyCanvas = document.createElement('canvas');
                _this.dummyCanvas.width = 1;
                _this.dummyCanvas.height = 1;
                _this.dummyContext = _this.dummyCanvas.getContext('webgpu');
                _this.dummyContext.configure({
                    device: device,
                    format: 'bgra8unorm',
                });
                document.body.appendChild(_this.dummyCanvas);
            }
            return _this;
        }
        WebGPUBackend.prototype.nextDataId = function () {
            return WebGPUBackend.nextDataId++;
        };
        WebGPUBackend.prototype.floatPrecision = function () {
            return 32;
        };
        /**
         * Dispose the memory if the dataId has 0 refCount. Return true if the memory
         * is released or delayed in this backend, false if there are still
         * references.
         * @param dataId
         * @oaram force Optional, remove the data regardless of refCount
         */
        WebGPUBackend.prototype.disposeData = function (dataId, force) {
            if (force === void 0) { force = false; }
            // No-op if already disposed.
            if (!this.tensorMap.has(dataId)) {
                return true;
            }
            var tensorData = this.tensorMap.get(dataId);
            if (force) {
                tensorData.refCount = 0;
            }
            else {
                tensorData.refCount--;
            }
            if (tensorData.refCount > 0) {
                return false;
            }
            if (tensorData.complexTensorInfos != null) {
                this.disposeData(tensorData.complexTensorInfos.real.dataId);
                this.disposeData(tensorData.complexTensorInfos.imag.dataId);
            }
            if (this.commandQueueOwnedIds.has(dataId)) {
                this.tensorDataPendingDisposal.push(dataId);
                return true;
            }
            this.releaseResource(dataId);
            this.tensorMap.delete(dataId);
            return true;
        };
        WebGPUBackend.prototype.memory = function () {
            return {
                numBytesInGPU: this.bufferManager.numBytesUsed,
                numBytesAllocatedInGPU: this.bufferManager.numBytesAllocated,
                unreliable: false
            };
        };
        WebGPUBackend.prototype.releaseResource = function (dataId) {
            var tensorData = this.tensorMap.get(dataId);
            if (!tensorData || !tensorData.resource) {
                return;
            }
            // If tensor's resource is from external, do not release.
            if (tensorData.external) {
                tensorData.resource = null;
                return;
            }
            if (tensorData.resource instanceof GPUBuffer) {
                this.bufferManager.releaseBuffer(tensorData.resource);
            }
            else if (tensorData.resource instanceof GPUTexture) {
                this.textureManager.releaseTexture(tensorData.resource);
            }
            tensorData.resource = null;
        };
        /** Return refCount of a `TensorData`. */
        WebGPUBackend.prototype.refCount = function (dataId) {
            if (this.tensorMap.has(dataId)) {
                var tensorData = this.tensorMap.get(dataId);
                return tensorData.refCount;
            }
            return 0;
        };
        /** Increase refCount of a `TensorData`. */
        WebGPUBackend.prototype.incRef = function (dataId) {
            var tensorData = this.tensorMap.get(dataId);
            tensorData.refCount++;
        };
        /** Decrease refCount of a `TensorData`. */
        WebGPUBackend.prototype.decRef = function (dataId) {
            if (this.tensorMap.has(dataId)) {
                var tensorData = this.tensorMap.get(dataId);
                tensorData.refCount--;
            }
        };
        WebGPUBackend.prototype.write = function (values, shape, dtype) {
            if (dtype === 'complex64' && values != null) {
                throw new Error("Cannot write to a complex64 dtype. " +
                    "Please use tf.complex(real, imag).");
            }
            var dataId = { id: this.nextDataId() };
            this.tensorMap.set(dataId, { dtype: dtype, shape: shape, values: values, refCount: 1 });
            return dataId;
        };
        WebGPUBackend.prototype.move = function (dataId, values, shape, dtype, refCount) {
            if (dtype === 'complex64') {
                throw new Error("Cannot write to a complex64 dtype. " +
                    "Please use tf.complex(real, imag).");
            }
            this.tensorMap.set(dataId, { dtype: dtype, shape: shape, values: values, refCount: refCount });
        };
        WebGPUBackend.prototype.submitQueue = function () {
            var _this = this;
            this.queue.submit([this.commandEncoder.finish()]);
            this.commandEncoder = null;
            this.dispatchCountInPass = 0;
            this.commandQueueOwnedIds = new WeakSet();
            this.tensorDataPendingDisposal.forEach(function (d) {
                _this.releaseResource(d);
                _this.tensorMap.delete(d);
            });
            this.uniformPendingDisposal.forEach(function (b) { return _this.bufferManager.releaseBuffer(b); });
            this.stagingPendingDisposal.forEach(function (b) { return _this.bufferManager.releaseBuffer(b, false); });
            this.tensorDataPendingDisposal = [];
            this.uniformPendingDisposal = [];
            this.stagingPendingDisposal = [];
        };
        WebGPUBackend.prototype.ensureCommandEncoderReady = function () {
            if (!this.commandEncoder) {
                this.commandEncoder = this.device.createCommandEncoder();
            }
        };
        WebGPUBackend.prototype.endComputePassEncoder = function () {
            if (this.computePassEncoder) {
                this.computePassEncoder.end();
                this.computePassEncoder = null;
            }
        };
        // Check if parallel compilation is done.
        WebGPUBackend.prototype.checkCompileCompletionAsync = function () {
            return __awaiter(this, void 0, void 0, function () {
                var pipelines, e_1;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, Promise.all(Object.values(this.pipelineCache))];
                        case 1:
                            pipelines = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            e_1 = _b.sent();
                            // TODO: Add test case to catch this exception.
                            throw new Error(e_1.message);
                        case 3:
                            Object.keys(this.pipelineCache).map(function (key, i) {
                                _this.pipelineCache[key] = pipelines[i];
                            });
                            return [2 /*return*/];
                    }
                });
            });
        };
        WebGPUBackend.prototype.getBufferData = function (buffer) {
            return __awaiter(this, void 0, void 0, function () {
                var size, stagingBuffer, values;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (tf.env().getBool('WEBGPU_ENGINE_COMPILE_ONLY')) {
                                console.warn('The data may be invalid since WEBGPU_ENGINE_COMPILE_ONLY is true, this can only be called when WEBGPU_ENGINE_COMPILE_ONLY is false');
                                return [2 /*return*/, null];
                            }
                            size = buffer.size;
                            stagingBuffer = this.bufferManager.acquireBuffer(size, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
                            this.ensureCommandEncoderReady();
                            this.endComputePassEncoder();
                            this.commandEncoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, size);
                            this.submitQueue();
                            return [4 /*yield*/, stagingBuffer.mapAsync(GPUMapMode.READ)];
                        case 1:
                            _b.sent();
                            values = stagingBuffer.getMappedRange().slice(0);
                            stagingBuffer.unmap();
                            if (stagingBuffer != null) {
                                this.bufferManager.releaseBuffer(stagingBuffer);
                            }
                            // Need to get texture from swapChain to enable profiling tool
                            // to capture a frame
                            if (tf.env().getBool('WEBGPU_USE_PROFILE_TOOL')) {
                                tf.util.assert(this.dummyContext !== undefined, function () { return "Fail to get context for profiling tool"; });
                                this.dummyContext.getCurrentTexture();
                            }
                            return [2 /*return*/, values];
                    }
                });
            });
        };
        WebGPUBackend.prototype.convertAndCacheOnCPU = function (dataId, data) {
            var tensorData = this.tensorMap.get(dataId);
            tensorData.values = data;
            return tensorData.values;
        };
        WebGPUBackend.prototype.readSync = function (dataId) {
            var _this = this;
            var tensorData = this.tensorMap.get(dataId);
            var values = tensorData.values, complexTensorInfos = tensorData.complexTensorInfos;
            if (values != null || tensorData.dtype === 'string') {
                return values;
            }
            if (tensorData.dtype === 'complex64') {
                var realValues = this.readSync(complexTensorInfos.real.dataId);
                var imagValues = this.readSync(complexTensorInfos.imag.dataId);
                var complexVals = tf.util.convertBackendValuesAndArrayBuffer(tf.backend_util.mergeRealAndImagArrays(realValues, imagValues).buffer, 'float32');
                this.convertAndCacheOnCPU(dataId, complexVals);
                return complexVals;
            }
            if (!this.hasReadSyncWarned) {
                this.hasReadSyncWarned = true;
                console.warn("The performance of synchronously reading data from GPU to CPU is " +
                    "poor on the webgpu backend, please use asynchronous APIs instead.");
            }
            var alphaModes = ['opaque', 'premultiplied'];
            var buffer = tensorData.resource;
            var bufferSize = buffer.size;
            tf.util.assert(bufferSize % 4 === 0, function () { return 'Because there is 4 bytes for ' +
                'one pixel, buffer size must be multiple of 4.'; });
            var pixelsSize = bufferSize / 4;
            var valsGPU = new ArrayBuffer(bufferSize);
            // TODO: adjust the reading window size according the `bufferSize`.
            var canvasWidth = 256, canvasHeight = 256;
            var stagingDeviceStorage = alphaModes.map(function (_) { return new OffscreenCanvas(canvasWidth, canvasHeight); });
            var stagingHostStorage = new OffscreenCanvas(canvasWidth, canvasHeight);
            this.endComputePassEncoder();
            stagingDeviceStorage
                .map(function (storage, index) {
                var context = storage.getContext('webgpu');
                // TODO: use rgba8unorm format when this format is supported on Mac.
                // https://bugs.chromium.org/p/chromium/issues/detail?id=1298618
                context.configure({
                    device: _this.device,
                    format: 'bgra8unorm',
                    usage: GPUTextureUsage.COPY_DST,
                    alphaMode: alphaModes[index],
                });
                return context.getCurrentTexture();
            })
                .map(function (texture, index) {
                var bytesPerRow = canvasWidth * 4;
                var readDataGPUToCPU = function (width, height, offset) {
                    _this.ensureCommandEncoderReady();
                    _this.commandEncoder.copyBufferToTexture({
                        buffer: buffer,
                        bytesPerRow: bytesPerRow,
                        offset: offset,
                    }, {
                        texture: texture,
                    }, {
                        width: width,
                        height: height,
                    });
                    _this.submitQueue();
                    var context = stagingHostStorage.getContext('2d', {
                        willReadFrequently: true,
                    });
                    context.clearRect(0, 0, width, height);
                    context.drawImage(stagingDeviceStorage[index], 0, 0);
                    var stagingValues = context.getImageData(0, 0, width, height).data;
                    var alphaMode = alphaModes[index];
                    var span = new Uint8ClampedArray(valsGPU, offset, width * height * 4);
                    for (var k = 0; k < span.length; k += 4) {
                        if (alphaMode === 'premultiplied') {
                            span[k + 3] = stagingValues[k + 3];
                        }
                        else {
                            var value = stagingValues[k];
                            span[k] = stagingValues[k + 2];
                            span[k + 1] = stagingValues[k + 1];
                            span[k + 2] = value;
                        }
                    }
                };
                var fullyReadCount = Math.floor(pixelsSize / (canvasWidth * canvasHeight));
                var width = canvasWidth, height = canvasHeight, offset = 0;
                for (var i = 0; i < fullyReadCount; i++) {
                    // Read the buffer data, which fully fill the whole canvas.
                    readDataGPUToCPU(width, height, offset);
                    offset += canvasWidth * canvasHeight * 4;
                }
                var remainSize = pixelsSize % (canvasWidth * canvasHeight);
                height = Math.floor(remainSize / canvasWidth);
                if (height > 0) {
                    // Read the buffer data, which fully fill certain rows of canvas.
                    readDataGPUToCPU(width, height, offset);
                    offset += height * (canvasWidth * 4);
                }
                width = remainSize % canvasWidth;
                if (width > 0) {
                    // Read the buffer data, which not fully fill one row of canvas.
                    readDataGPUToCPU(width, 1, offset);
                }
            });
            var vals = tf.util.convertBackendValuesAndArrayBuffer(valsGPU, tensorData.dtype);
            this.convertAndCacheOnCPU(dataId, vals);
            return vals;
        };
        WebGPUBackend.prototype.read = function (dataId) {
            return __awaiter(this, void 0, void 0, function () {
                var tensorData, values, vals, ps, realValues, imagValues, data;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!this.tensorMap.has(dataId)) {
                                throw new Error("Tensor ".concat(dataId, " was not registered!"));
                            }
                            tensorData = this.tensorMap.get(dataId);
                            values = tensorData.values;
                            if (values != null) {
                                return [2 /*return*/, values];
                            }
                            if (!(tensorData.dtype === 'complex64')) return [3 /*break*/, 2];
                            return [4 /*yield*/, Promise.all([
                                    this.read(tensorData.complexTensorInfos.real.dataId),
                                    this.read(tensorData.complexTensorInfos.imag.dataId)
                                ])];
                        case 1:
                            ps = _b.sent();
                            realValues = ps[0];
                            imagValues = ps[1];
                            vals = tf.backend_util.mergeRealAndImagArrays(realValues, imagValues);
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, this.getBufferData(tensorData.resource)];
                        case 3:
                            data = _b.sent();
                            vals = tf.util.convertBackendValuesAndArrayBuffer(data, tensorData.dtype);
                            _b.label = 4;
                        case 4:
                            this.convertAndCacheOnCPU(dataId, vals);
                            return [2 /*return*/, vals];
                    }
                });
            });
        };
        // The source GPUBuffer and destination GPUBuffer have the same size and
        // usage.
        WebGPUBackend.prototype.copyBuffer = function (srcBuffer) {
            var size = srcBuffer.size;
            var usage = srcBuffer.usage;
            var dstBuffer = this.bufferManager.acquireBuffer(size, usage);
            this.ensureCommandEncoderReady();
            this.endComputePassEncoder();
            this.commandEncoder.copyBufferToBuffer(srcBuffer, 0, dstBuffer, 0, size);
            this.submitQueue();
            return dstBuffer;
        };
        /**
         * Create a TF.js tensor out of an existing WebGPU buffer.
         */
        WebGPUBackend.prototype.createTensorFromGPUData = function (webGPUData, shape, dtype) {
            var buffer = webGPUData.buffer;
            if (dtype === 'complex64') {
                throw new Error("Cannot write to a complex64 dtype. ");
            }
            var dataId = { id: this.nextDataId() };
            this.tensorMap.set(dataId, {
                dtype: dtype,
                shape: shape,
                values: null,
                refCount: 1,
                external: webGPUData.zeroCopy
            });
            var tensorData = this.tensorMap.get(dataId);
            var size = GPUBytesPerElement(tensorData.dtype) *
                tf.util.sizeFromShape(tensorData.shape);
            if (webGPUData.buffer.size < size) {
                throw new Error("GPUBuffer size(".concat(webGPUData.buffer.size, ") is smaller than tensor size(").concat(size, ")!"));
            }
            else if ((webGPUData.buffer.usage &
                (GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC)) !==
                (GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC)) {
                throw new Error('GPUBuffer.usage should include GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC!');
            }
            // Do buffer copy by default.
            if (webGPUData.zeroCopy !== true) {
                buffer = this.copyBuffer(buffer);
            }
            tensorData.resource = buffer;
            return tf.engine().makeTensorFromDataId(dataId, shape, dtype, this);
        };
        /**
         * Read tensor to a new GPUBuffer.
         * @param dataId The source tensor.
         */
        WebGPUBackend.prototype.readToGPU = function (dataId) {
            var srcTensorData = this.tensorMap.get(dataId);
            var values = srcTensorData.values, dtype = srcTensorData.dtype, shape = srcTensorData.shape, resource = srcTensorData.resource;
            if (dtype === 'complex64') {
                throw new Error('Does not support reading buffer for complex64 dtype.');
            }
            if (resource == null) {
                if (values != null) {
                    throw new Error('Data is not on GPU but on CPU.');
                }
                else {
                    throw new Error('There is no data on GPU or CPU.');
                }
            }
            var srcBuffer = resource;
            var size = srcBuffer.size;
            var usage = srcBuffer.usage;
            var buffer = this.bufferManager.acquireBuffer(size, usage);
            this.ensureCommandEncoderReady();
            this.endComputePassEncoder();
            this.commandEncoder.copyBufferToBuffer(resource, 0, buffer, 0, size);
            this.submitQueue();
            var tensorInfo = this.makeTensorInfo(shape, dtype);
            // Make engine track this tensor, so that we can dispose it later.
            var tensorRef = tf.engine().makeTensorFromTensorInfo(tensorInfo);
            var tensorData = this.tensorMap.get(tensorInfo.dataId);
            tensorData.resource = buffer;
            return { tensorRef: tensorRef, buffer: buffer };
        };
        WebGPUBackend.prototype.bufferSync = function (t) {
            var data = this.readSync(t.dataId);
            if (t.dtype === 'string') {
                try {
                    // Decode the bytes into string.
                    var strings = data.map(function (d) { return tf.util.decodeString(d); });
                    return tf.buffer(t.shape, t.dtype, strings);
                }
                catch (_a) {
                    throw new Error('Failed to decode encoded string bytes into utf-8');
                }
            }
            return tf.buffer(t.shape, t.dtype, data);
        };
        WebGPUBackend.prototype.time = function (f) {
            return __awaiter(this, void 0, void 0, function () {
                var oldActiveTimers, newActiveTimers, outerMostTime, flattenedActiveTimerQueries, flattenedActiveTimerNames, res, kernelMs;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!this.supportTimestampQuery && !this.hasTimestampQueryWarned) {
                                console.warn("This device doesn't support timestamp-query extension. " +
                                    "Start Chrome browser with flag " +
                                    "--enable-dawn-features=allow_unsafe_apis to try it again. " +
                                    "Otherwise, zero will be shown for the kernel time when profiling " +
                                    "mode is enabled.");
                                this.hasTimestampQueryWarned = true;
                            }
                            oldActiveTimers = this.activeTimers;
                            newActiveTimers = [];
                            outerMostTime = false;
                            if (this.programTimersStack == null) {
                                this.programTimersStack = newActiveTimers;
                                outerMostTime = true;
                            }
                            else {
                                this.activeTimers.push(newActiveTimers);
                            }
                            this.activeTimers = newActiveTimers;
                            f();
                            flattenedActiveTimerQueries = tf.util.flatten(this.activeTimers.map(function (d) { return d.query; }))
                                .filter(function (d) { return d != null; });
                            flattenedActiveTimerNames = tf.util.flatten(this.activeTimers.map(function (d) { return d.name; }))
                                .filter(function (d) { return d != null; });
                            this.activeTimers = oldActiveTimers;
                            if (outerMostTime) {
                                this.programTimersStack = null;
                            }
                            res = {
                                uploadWaitMs: this.uploadWaitMs,
                                downloadWaitMs: this.downloadWaitMs,
                                kernelMs: null,
                                wallMs: null
                            };
                            return [4 /*yield*/, Promise.all(flattenedActiveTimerQueries)];
                        case 1:
                            kernelMs = _b.sent();
                            res['kernelMs'] = tf.util.sum(kernelMs);
                            res['getExtraProfileInfo'] = function () { return kernelMs.map(function (d, i) { return ({ name: flattenedActiveTimerNames[i], ms: d }); })
                                .map(function (d) { return "".concat(d.name, ": ").concat(d.ms); })
                                .join(', '); };
                            this.uploadWaitMs = 0;
                            this.downloadWaitMs = 0;
                            return [2 /*return*/, res];
                    }
                });
            });
        };
        WebGPUBackend.prototype.makeTensorInfo = function (shape, dtype, values) {
            if (dtype === 'string' && values != null && values.length > 0 &&
                tf.util.isString(values[0])) {
                values = values.map(function (d) { return tf.util.encodeString(d); });
            }
            var dataId = this.write(values, shape, dtype);
            return { dataId: dataId, shape: shape, dtype: dtype };
        };
        WebGPUBackend.prototype.tensorToBinding = function (tensor) {
            if (!tensor) {
                return null;
            }
            var tensorData = this.tensorMap.get(tensor.dataId);
            var resource = tensorData.resource;
            if (resource instanceof GPUBuffer) {
                return { buffer: resource };
            }
            if (resource instanceof GPUTexture) {
                return resource.createView();
            }
            // GPUExternalTexture
            return resource;
        };
        WebGPUBackend.prototype.uploadToGPU = function (dataId) {
            var tensorData = this.tensorMap.get(dataId);
            // Already on the GPU.
            if (tensorData.resource != null) {
                return;
            }
            var size = GPUBytesPerElement(tensorData.dtype) *
                tf.util.sizeFromShape(tensorData.shape);
            var buffer;
            var usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC |
                GPUBufferUsage.COPY_DST;
            if (tensorData.values) {
                buffer = this.bufferManager.acquireBuffer(size, usage, true);
                if (buffer.mapState === 'unmapped') {
                    var stagingBuffer = this.bufferManager.acquireBuffer(size, GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC, true, false);
                    var arrayBuffer = stagingBuffer.getMappedRange();
                    if (tensorData.dtype === 'int32' || tensorData.dtype === 'bool') {
                        new Int32Array(arrayBuffer).set(tensorData.values);
                    }
                    else {
                        new Float32Array(arrayBuffer).set(tensorData.values);
                    }
                    stagingBuffer.unmap();
                    this.ensureCommandEncoderReady();
                    this.endComputePassEncoder();
                    this.commandEncoder.copyBufferToBuffer(stagingBuffer, 0, buffer, 0, size);
                    this.stagingPendingDisposal.push(stagingBuffer);
                }
                else {
                    var arrayBuffer = buffer.getMappedRange();
                    if (tensorData.dtype === 'int32' || tensorData.dtype === 'bool') {
                        new Int32Array(arrayBuffer).set(tensorData.values);
                    }
                    else {
                        new Float32Array(arrayBuffer).set(tensorData.values);
                    }
                    buffer.unmap();
                }
                // Once uploaded, don't store the values on cpu.
                tensorData.values = null;
            }
            else {
                buffer = this.bufferManager.acquireBuffer(size, usage);
            }
            tensorData.resource = buffer;
        };
        WebGPUBackend.prototype.makeUniforms = function (programUniform) {
            var currentOffset = 0;
            var preLength = 0;
            var offsets = [];
            var maxAlignmentOfField = 1;
            programUniform.forEach(function (d) {
                if (d.data.length === 0) {
                    d.data = [1];
                }
                // https://www.w3.org/TR/WGSL/#alignof
                var baseAlignment;
                switch (d.data.length) {
                    case 1:
                        baseAlignment = 4;
                        break;
                    case 2:
                        baseAlignment = 8;
                        break;
                    case 3:
                        baseAlignment = 16;
                        break;
                    case 4:
                        baseAlignment = 16;
                        break;
                    case 5:
                        baseAlignment = 16;
                        break;
                    case 6:
                        baseAlignment = 16;
                        break;
                    default:
                        tf.util.assert(false, function () { return "Unsupported ".concat(d.data.length, "D shape"); });
                }
                if (preLength === 5 || preLength === 6) {
                    baseAlignment = 16;
                }
                if (baseAlignment > maxAlignmentOfField) {
                    maxAlignmentOfField = baseAlignment;
                }
                currentOffset = Math.ceil(currentOffset / baseAlignment) * baseAlignment;
                preLength = d.data.length;
                offsets.push(currentOffset);
                currentOffset += d.data.length * 4;
            });
            currentOffset =
                Math.ceil(currentOffset / maxAlignmentOfField) * maxAlignmentOfField;
            var arrayBuffer = new ArrayBuffer(currentOffset);
            programUniform.forEach(function (d, i) {
                var offset = offsets[i];
                if (d.type === 'int32') {
                    new Int32Array(arrayBuffer, offset, d.data.length).set(d.data);
                }
                else if (d.type === 'uint32') {
                    new Uint32Array(arrayBuffer, offset, d.data.length).set(d.data);
                }
                else {
                    new Float32Array(arrayBuffer, offset, d.data.length).set(d.data);
                }
            });
            var uniformBuffer = this.bufferManager.acquireBuffer(currentOffset, GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM);
            this.queue.writeBuffer(uniformBuffer, 0, arrayBuffer, 0, currentOffset);
            this.uniformPendingDisposal.push(uniformBuffer);
            return { offset: 0, size: currentOffset, buffer: uniformBuffer };
        };
        WebGPUBackend.prototype.runWebGPUProgram = function (program, inputs, outputDtype, programDefinedUniform, output) {
            var _this = this;
            if (!output) {
                output = this.makeTensorInfo(program.outputShape, outputDtype);
            }
            if (tf.util.sizeFromShape(output.shape) === 0) {
                // Short-circuit the computation since the result is empty (has 0 in its
                // shape).
                this.tensorMap.get(output.dataId).values =
                    tf.util.getTypedArrayFromDType(output.dtype, 0);
                return output;
            }
            this.uploadToGPU(output.dataId);
            program.dispatch = reshapeDispatch(this.device, program);
            var inputsData = inputs.map(function (input, i) {
                if (input.dtype === 'complex64') {
                    throw new Error("GPGPUProgram does not support complex64 input. For complex64 " +
                        "dtypes, please separate the program into real and imaginary " +
                        "parts.");
                }
                _this.uploadToGPU(input.dataId);
                return {
                    // Returning dtype from tensorMap because it reflects dtype
                    // of underlying buffer, rather than abstract dtype.
                    dtype: _this.tensorMap.get(input.dataId).dtype,
                    shape: input.shape,
                    name: program.variableNames[i]
                };
            });
            program.shaderKey =
                makeShaderKey(program, inputsData, output);
            var parallelCompilation = tf.env().getBool('WEBGPU_ENGINE_COMPILE_ONLY');
            if (!(program.shaderKey in this.pipelineCache)) {
                this.pipelineCache[program.shaderKey] = compileProgram(this.device, program, inputsData, output, parallelCompilation);
            }
            program.pipeline = this.pipelineCache[program.shaderKey];
            if (!parallelCompilation) {
                this.recordAndSubmit(program, output, inputs, programDefinedUniform);
            }
            return output;
        };
        WebGPUBackend.prototype.recordAndSubmit = function (program, output, inputs, programDefinedUniform) {
            var _this = this;
            if (program.pipeline instanceof Promise) {
                throw new Error('Please call checkCompileCompletionAsync to ensure parallel compilation is done!');
            }
            // There are six kinds of uniforms: NAN, INFINITY, shapes, shape strides,
            // program size, program defined uniforms.
            var programUniform = [];
            var bufferShapes = [];
            var uniformsType = 'int32';
            if (program.pixelsOpType == null) {
                programUniform.push({ type: 'float32', data: [NaN] }, { type: 'float32', data: [Infinity] });
                bufferShapes = inputs.concat(output).map(function (d) { return d.shape; });
                var uniformsType_1 = 'int32';
                bufferShapes.map(function (d) {
                    programUniform.push({ type: uniformsType_1, data: d });
                    var strides = tf.util.computeStrides(d);
                    programUniform.push({ type: uniformsType_1, data: strides });
                });
            }
            else {
                var strides = tf.util.computeStrides(output.shape);
                programUniform.push({ type: uniformsType, data: strides });
            }
            if (program.size) {
                var size = tf.util.sizeFromShape(program.outputShape);
                programUniform.push({
                    type: uniformsType,
                    data: [program.outputComponent ? size / program.outputComponent : size]
                });
            }
            if (programDefinedUniform) {
                programUniform = __spreadArray(__spreadArray([], __read(programUniform), false), __read(programDefinedUniform), false);
            }
            var bindings = __spreadArray(__spreadArray([
                this.tensorToBinding(output)
            ], __read(inputs.map(function (t) { return _this.tensorToBinding(t); })), false), [
                this.makeUniforms(programUniform)
            ], false);
            inputs.forEach(function (input) {
                _this.commandQueueOwnedIds.add(input.dataId);
            });
            this.commandQueueOwnedIds.add(output.dataId);
            var bindGroup = this.device.createBindGroup({
                layout: program.pipeline.getBindGroupLayout(0),
                entries: bindings.map(function (b, i) { return ({ binding: i, resource: b }); }),
            });
            var shouldTimeProgram = this.activeTimers != null;
            this.ensureCommandEncoderReady();
            var computePassDescriptor = {};
            if (shouldTimeProgram && this.supportTimestampQuery) {
                this.endComputePassEncoder();
                if (this.querySet == null) {
                    this.querySet = this.device.createQuerySet({
                        type: 'timestamp',
                        count: this.querySetCount,
                    });
                }
                computePassDescriptor.timestampWrites = {
                    querySet: this.querySet,
                    beginningOfPassWriteIndex: 0,
                    endOfPassWriteIndex: 1,
                };
                this.computePassEncoder =
                    this.commandEncoder.beginComputePass(computePassDescriptor);
            }
            else if (!this.computePassEncoder) {
                this.computePassEncoder =
                    this.commandEncoder.beginComputePass(computePassDescriptor);
            }
            this.computePassEncoder.setPipeline(program.pipeline);
            this.computePassEncoder.setBindGroup(0, bindGroup);
            this.computePassEncoder.dispatchWorkgroups(program.dispatch[0], program.dispatch[1], program.dispatch[2]);
            this.dispatchCountInPass++;
            if (shouldTimeProgram ||
                tf.env().get('WEBGPU_DEFERRED_SUBMIT_BATCH_SIZE') <= this.dispatchCountInPass ||
                program.pixelsOpType === PixelsOpType.DRAW) {
                this.endComputePassEncoder();
                if (shouldTimeProgram) {
                    this.activeTimers.push({ name: program.constructor.name, query: this.getQueryTime() });
                }
                else {
                    this.submitQueue();
                }
            }
        };
        WebGPUBackend.prototype.getQueryTime = function () {
            return __awaiter(this, void 0, void 0, function () {
                var queryStagingBuffer, arrayBuffer, time;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!this.supportTimestampQuery) {
                                return [2 /*return*/, 0];
                            }
                            if (this.queryResolveBuffer == null) {
                                this.queryResolveBuffer = this.bufferManager.acquireBuffer(this.querySetCount * 8, GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST |
                                    GPUBufferUsage.QUERY_RESOLVE);
                            }
                            this.commandEncoder.resolveQuerySet(this.querySet, 0, this.querySetCount, this.queryResolveBuffer, 0);
                            queryStagingBuffer = this.bufferManager.acquireBuffer(this.querySetCount * 8, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
                            this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer, 0, queryStagingBuffer, 0, this.querySetCount * 8);
                            this.submitQueue();
                            return [4 /*yield*/, queryStagingBuffer.mapAsync(GPUMapMode.READ)];
                        case 1:
                            _b.sent();
                            arrayBuffer = new BigUint64Array(queryStagingBuffer.getMappedRange());
                            time = Number(arrayBuffer[1] - arrayBuffer[0]) / 1000000;
                            queryStagingBuffer.unmap();
                            this.bufferManager.releaseBuffer(queryStagingBuffer);
                            return [2 /*return*/, time];
                    }
                });
            });
        };
        WebGPUBackend.prototype.shouldExecuteOnCPU = function (inputs, sizeThreshold) {
            var _this = this;
            if (sizeThreshold === void 0) { sizeThreshold = CPU_HANDOFF_SIZE_THRESHOLD; }
            return tf.env().getBool('WEBGPU_CPU_FORWARD') &&
                inputs.every(function (input) { return _this.tensorMap.get(input.dataId).resource == null &&
                    tf.util.sizeFromShape(input.shape) < sizeThreshold; });
        };
        WebGPUBackend.prototype.numDataIds = function () {
            return this.tensorMap.numDataIds() - this.tensorDataPendingDisposal.length;
        };
        WebGPUBackend.prototype.dispose = function () {
            if (this.disposed) {
                return;
            }
            if (this.querySet != null) {
                this.querySet.destroy();
            }
            this.bufferManager.dispose();
            this.textureManager.dispose();
            this.disposed = true;
        };
        return WebGPUBackend;
    }(tf.KernelBackend));
    WebGPUBackend.nextDataId = 0;

    if (isWebGPUSupported()) {
        tf.registerBackend('webgpu', function () { return __awaiter(void 0, void 0, void 0, function () {
            var gpuDescriptor, adapter, deviceDescriptor, requiredFeatures, adapterLimits, device, adapterInfo, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        gpuDescriptor = {
                            powerPreference: tf.env().get('WEBGPU_USE_LOW_POWER_GPU') ?
                                'low-power' :
                                'high-performance'
                        };
                        return [4 /*yield*/, navigator.gpu.requestAdapter(gpuDescriptor)];
                    case 1:
                        adapter = _c.sent();
                        deviceDescriptor = {};
                        requiredFeatures = [];
                        if (adapter.features.has('timestamp-query')) {
                            requiredFeatures.push('timestamp-query');
                        }
                        if (adapter.features.has('bgra8unorm-storage')) {
                            requiredFeatures.push(['bgra8unorm-storage']);
                        }
                        deviceDescriptor.requiredFeatures =
                            requiredFeatures;
                        adapterLimits = adapter.limits;
                        deviceDescriptor.requiredLimits = {
                            'maxComputeWorkgroupStorageSize': adapterLimits.maxComputeWorkgroupStorageSize,
                            'maxComputeWorkgroupsPerDimension': adapterLimits.maxComputeWorkgroupsPerDimension,
                            'maxStorageBufferBindingSize': adapterLimits.maxStorageBufferBindingSize,
                            'maxBufferSize': adapterLimits.maxBufferSize,
                            'maxComputeWorkgroupSizeX': adapterLimits.maxComputeWorkgroupSizeX,
                            'maxComputeInvocationsPerWorkgroup': adapterLimits.maxComputeInvocationsPerWorkgroup,
                        };
                        return [4 /*yield*/, adapter.requestDevice(deviceDescriptor)];
                    case 2:
                        device = _c.sent();
                        if (!('info' in adapter)) return [3 /*break*/, 3];
                        _a = adapter.info;
                        return [3 /*break*/, 7];
                    case 3:
                        if (!('requestAdapterInfo' in adapter)) return [3 /*break*/, 5];
                        return [4 /*yield*/, adapter.requestAdapterInfo()];
                    case 4:
                        _b = _c.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        _b = undefined;
                        _c.label = 6;
                    case 6:
                        _a = _b;
                        _c.label = 7;
                    case 7:
                        adapterInfo = _a;
                        return [2 /*return*/, new WebGPUBackend(device, adapterInfo)];
                }
            });
        }); }, 3 /*priority*/);
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var BinaryOpType;
    (function (BinaryOpType) {
        BinaryOpType[BinaryOpType["ADD"] = 0] = "ADD";
        BinaryOpType[BinaryOpType["ATAN2"] = 1] = "ATAN2";
        BinaryOpType[BinaryOpType["COMPLEX_MULTIPLY_IMAG"] = 2] = "COMPLEX_MULTIPLY_IMAG";
        BinaryOpType[BinaryOpType["COMPLEX_MULTIPLY_REAL"] = 3] = "COMPLEX_MULTIPLY_REAL";
        BinaryOpType[BinaryOpType["DIV"] = 4] = "DIV";
        BinaryOpType[BinaryOpType["ELU_DER"] = 5] = "ELU_DER";
        BinaryOpType[BinaryOpType["EQUAL"] = 6] = "EQUAL";
        BinaryOpType[BinaryOpType["FLOOR_DIV"] = 7] = "FLOOR_DIV";
        BinaryOpType[BinaryOpType["GREATER"] = 8] = "GREATER";
        BinaryOpType[BinaryOpType["GREATER_EQUAL"] = 9] = "GREATER_EQUAL";
        BinaryOpType[BinaryOpType["LESS"] = 10] = "LESS";
        BinaryOpType[BinaryOpType["LESS_EQUAL"] = 11] = "LESS_EQUAL";
        BinaryOpType[BinaryOpType["LOGICAL_AND"] = 12] = "LOGICAL_AND";
        BinaryOpType[BinaryOpType["LOGICAL_OR"] = 13] = "LOGICAL_OR";
        BinaryOpType[BinaryOpType["MAX"] = 14] = "MAX";
        BinaryOpType[BinaryOpType["MIN"] = 15] = "MIN";
        BinaryOpType[BinaryOpType["MOD"] = 16] = "MOD";
        BinaryOpType[BinaryOpType["MUL"] = 17] = "MUL";
        BinaryOpType[BinaryOpType["NOT_EQUAL"] = 18] = "NOT_EQUAL";
        BinaryOpType[BinaryOpType["POW"] = 19] = "POW";
        BinaryOpType[BinaryOpType["PRELU"] = 20] = "PRELU";
        BinaryOpType[BinaryOpType["SQUARED_DIFFERENCE"] = 21] = "SQUARED_DIFFERENCE";
        BinaryOpType[BinaryOpType["SUB"] = 22] = "SUB";
    })(BinaryOpType || (BinaryOpType = {}));
    var ADD = 'let resultTemp = a + b;';
    var ATAN2 = 'let resultTemp = atan2(a, b);';
    // (Ar + Ai)(Br + Bi) =
    // ArBr + ArBi + AiBr + AiBi = ArBr - AB + ArBi + AiBr
    // Yr = ArBr - AB
    // Yi = ArBi + AiBr
    var COMPLEX_MULTIPLY_REAL = 'let resultTemp = areal * breal - aimag * bimag;';
    var COMPLEX_MULTIPLY_IMAG = 'let resultTemp = areal * bimag + aimag * breal;';
    var DIV = 'let resultTemp = a / b;';
    var ELU_DER = 'let resultTemp = select(a * (b + 1.0), a, b >= b - b);';
    var EQUAL = "\n  let zero = sign(a) * 0 + 0;\n  let one = sign(b) * 0 + 1;\n  let resultTemp = select(zero, one, a == b);\n";
    var FLOOR_DIV = "\n  let remainder =\n      select(a % b, round(a % b), (round(a) == a) & (round(b) == b));\n  let quotient = (a - remainder) / b;\n  let resultTemp =\n      round(select(quotient, quotient - 1, sign(remainder) == -sign(b)));\n";
    var GREATER = "\n  let zero = sign(a) * 0 + 0;\n  let one = sign(b) * 0 + 1;\n  let resultTemp = select(zero, one, a > b);\n";
    var GREATER_EQUAL = "\n  let zero = sign(a) * 0 + 0;\n  let one = sign(b) * 0 + 1;\n  let resultTemp = select(zero, one, a >= b);\n";
    var LESS = "\n  let zero = sign(a) * 0 + 0;\n  let one = sign(b) * 0 + 1;\n  let resultTemp = select(zero, one, a < b);\n";
    var LESS_EQUAL = "\n  let zero = sign(a) * 0 + 0;\n  let one = sign(b) * 0 + 1;\n  let resultTemp = select(zero, one, a <= b);\n";
    var LOGICAL_AND = 'return f32(a >= 1.0 && b >= 1.0);';
    var LOGICAL_AND_VEC4 = "return (vec4<f32>(a >= vec4<f32>(1.0)) *\n  vec4<f32>(b >= vec4<f32>(1.0)));";
    var LOGICAL_OR = 'return f32(a >= 1.0 || b >= 1.0);';
    var LOGICAL_OR_VEC4 = "return min(vec4<f32>(a >= vec4<f32>(1.0)) +\n  vec4<f32>(b >= vec4<f32>(1.0)), vec4<f32>(1.0));";
    var MAX = 'let resultTemp = max(a, b);';
    var MIN = 'let resultTemp = min(a, b);';
    var MOD = "\n  let isNaN = b == 0.;\n  var resultTemp = a % b;\n  resultTemp = select((resultTemp + b) % b, resultTemp,\n      (a < 0. && b < 0.) || (a >= 0. && b > 0.));\n";
    var MOD_VEC4 = "\n  let isNaN = !vec4<bool>(b);\n  var resultTemp = vec4<f32>(a % b);\n  if (!((a[0] < 0. && b[0] < 0.) || (a[0] >= 0. && b[0] > 0.))) {\n    resultTemp[0] = (resultTemp[0] + b[0]) % b[0];\n  }\n  if (!((a[1] < 0. && b[1] < 0.) || (a[1] >= 0. && b[1] > 0.))) {\n    resultTemp[1] = (resultTemp[1] + b[1]) % b[1];\n  }\n  if (!((a[2] < 0. && b[2] < 0.) || (a[2] >= 0. && b[2] > 0.))) {\n    resultTemp[2] = (resultTemp[2] + b[2]) % b[2];\n  }\n  if (!((a[3] < 0. && b[3] < 0.) || (a[3] >= 0. && b[3] > 0.))) {\n    resultTemp[3] = (resultTemp[3] + b[3]) % b[3];\n  }\n";
    var MUL = 'let resultTemp = a * b;';
    var NOT_EQUAL = "\n  var resultTemp = f32(a != b);\n  let valueForNaN = 1.0;\n";
    var NOT_EQUAL_VEC4 = "\n  var resultTemp = vec4<f32>(a != b);\n  let valueForNaN = 1.0;\n";
    var POW = "\n  let isNaN = a < 0.0 && floor(b) < b;\n  if (b == 0.0) {\n    return 1.0;\n  }\n  var resultTemp = select(sign(a) * pow(abs(a), b), pow(abs(a), b),\n      round(abs(b) % 2.0) != 1.0);\n";
    var POW_VEC4 = "\n  let isModRound1Bool = vec4<i32>(round(abs(b) % vec4<f32>(2.0))) == vec4<i32>(1);\n  let isModRound1 = vec4<f32>(isModRound1Bool);\n  let multiplier = sign(a) * isModRound1 + (vec4<f32>(1.0) - isModRound1);\n  var resultTemp = multiplier * pow(abs(a), b);\n\n  // Ensure that a^0 = 1, including 0^0 = 1 as this correspond to TF and JS\n  let isExpZero = b == vec4<f32>(0.0);\n  if (isExpZero.r) {\n    resultTemp.r = 1.0;\n  }\n  if (isExpZero.g) {\n    resultTemp.g = 1.0;\n  }\n  if (isExpZero.b) {\n    resultTemp.b = 1.0;\n  }\n  if (isExpZero.a) {\n    resultTemp.a = 1.0;\n  }\n  let isNaN = (a < vec4<f32>(0.0)) & (floor(b) < b);\n";
    var PRELU = "if (a < 0.0) { return b * a; }  return a;";
    var PRELU_VEC4 = "\n  let aLessThanZero = vec4<f32>(a < vec4<f32>(0.0));\n  return (aLessThanZero * (b * a)) + ((vec4<f32>(1.0) - aLessThanZero) * a);\n";
    var SQUARED_DIFFERENCE = 'let resultTemp = (a - b) * (a - b);';
    var SUB = 'let resultTemp = a - b;';
    function getBinaryOpString(type, useVec4) {
        var doOpSnippet;
        // Ops with NaN check
        do {
            switch (type) {
                case BinaryOpType.ATAN2:
                    doOpSnippet = ATAN2;
                    break;
                case BinaryOpType.MAX:
                    doOpSnippet = MAX;
                    break;
                case BinaryOpType.MIN:
                    doOpSnippet = MIN;
                    break;
                case BinaryOpType.MOD:
                    doOpSnippet = useVec4 ? MOD_VEC4 : MOD;
                    break;
                case BinaryOpType.NOT_EQUAL:
                    doOpSnippet = useVec4 ? NOT_EQUAL_VEC4 : NOT_EQUAL;
                    break;
                case BinaryOpType.POW:
                    doOpSnippet = useVec4 ? POW_VEC4 : POW;
                    break;
                default:
                    continue;
            }
            var isNaN = void 0;
            var dTypeN = void 0;
            var boolN = void 0;
            if (useVec4) {
                isNaN = 'isnanVec4';
                dTypeN = 'vec4<f32>';
                boolN = 'vec4<bool>';
            }
            else {
                isNaN = 'isnan';
                dTypeN = 'f32';
                boolN = 'bool';
            }
            return "\n      let aIsNaN = ".concat(isNaN, "(a);\n      let aPostLegalization = select(a, ").concat(dTypeN, "(42), aIsNaN);\n      let bIsNaN = ").concat(isNaN, "(b);\n      let bPostLegalization = select(b, ").concat(dTypeN, "(42), bIsNaN);\n      let isNaN = false;\n      let valueForNaN = uniforms.NAN;\n      {\n        let a = aPostLegalization;\n        let b = bPostLegalization;\n        ").concat(doOpSnippet, "\n        return select(\n            resultTemp, ").concat(dTypeN, "(valueForNaN),\n            ").concat(boolN, "(isNaN) | aIsNaN | bIsNaN);\n      }\n    ");
        } while (false);
        // Ops without NaN check
        switch (type) {
            case BinaryOpType.ADD:
                doOpSnippet = ADD;
                break;
            case BinaryOpType.COMPLEX_MULTIPLY_IMAG:
                doOpSnippet = COMPLEX_MULTIPLY_IMAG;
                break;
            case BinaryOpType.COMPLEX_MULTIPLY_REAL:
                doOpSnippet = COMPLEX_MULTIPLY_REAL;
                break;
            case BinaryOpType.DIV:
                doOpSnippet = DIV;
                break;
            case BinaryOpType.ELU_DER:
                doOpSnippet = ELU_DER;
                break;
            case BinaryOpType.EQUAL:
                doOpSnippet = EQUAL;
                break;
            case BinaryOpType.FLOOR_DIV:
                doOpSnippet = FLOOR_DIV;
                break;
            case BinaryOpType.GREATER:
                doOpSnippet = GREATER;
                break;
            case BinaryOpType.GREATER_EQUAL:
                doOpSnippet = GREATER_EQUAL;
                break;
            case BinaryOpType.LESS:
                doOpSnippet = LESS;
                break;
            case BinaryOpType.LESS_EQUAL:
                doOpSnippet = LESS_EQUAL;
                break;
            case BinaryOpType.LOGICAL_AND:
                return useVec4 ? LOGICAL_AND_VEC4 : LOGICAL_AND;
            case BinaryOpType.LOGICAL_OR:
                return useVec4 ? LOGICAL_OR_VEC4 : LOGICAL_OR;
            case BinaryOpType.MUL:
                doOpSnippet = MUL;
                break;
            case BinaryOpType.PRELU:
                return useVec4 ? PRELU_VEC4 : PRELU;
            case BinaryOpType.SQUARED_DIFFERENCE:
                doOpSnippet = SQUARED_DIFFERENCE;
                break;
            case BinaryOpType.SUB:
                doOpSnippet = SUB;
                break;
            // throw new Error(`BinaryType ${type} is not implemented!`);
        }
        return "\n    ".concat(doOpSnippet, "\n    return resultTemp;\n  ");
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var UnaryOpType;
    (function (UnaryOpType) {
        UnaryOpType[UnaryOpType["ABS"] = 0] = "ABS";
        UnaryOpType[UnaryOpType["ACOS"] = 1] = "ACOS";
        UnaryOpType[UnaryOpType["ACOSH"] = 2] = "ACOSH";
        UnaryOpType[UnaryOpType["ASIN"] = 3] = "ASIN";
        UnaryOpType[UnaryOpType["ASINH"] = 4] = "ASINH";
        UnaryOpType[UnaryOpType["ATAN"] = 5] = "ATAN";
        UnaryOpType[UnaryOpType["ATANH"] = 6] = "ATANH";
        UnaryOpType[UnaryOpType["CEIL"] = 7] = "CEIL";
        UnaryOpType[UnaryOpType["COS"] = 8] = "COS";
        UnaryOpType[UnaryOpType["COSH"] = 9] = "COSH";
        UnaryOpType[UnaryOpType["ELU"] = 10] = "ELU";
        UnaryOpType[UnaryOpType["ERF"] = 11] = "ERF";
        UnaryOpType[UnaryOpType["EXP"] = 12] = "EXP";
        UnaryOpType[UnaryOpType["EXPM1"] = 13] = "EXPM1";
        UnaryOpType[UnaryOpType["FLOOR"] = 14] = "FLOOR";
        UnaryOpType[UnaryOpType["IS_FINITE"] = 15] = "IS_FINITE";
        UnaryOpType[UnaryOpType["IS_INF"] = 16] = "IS_INF";
        UnaryOpType[UnaryOpType["IS_NAN"] = 17] = "IS_NAN";
        UnaryOpType[UnaryOpType["LINEAR"] = 18] = "LINEAR";
        UnaryOpType[UnaryOpType["LOG"] = 19] = "LOG";
        UnaryOpType[UnaryOpType["LOG1P"] = 20] = "LOG1P";
        UnaryOpType[UnaryOpType["LOGICAL_NOT"] = 21] = "LOGICAL_NOT";
        UnaryOpType[UnaryOpType["NEG"] = 22] = "NEG";
        UnaryOpType[UnaryOpType["RELU"] = 23] = "RELU";
        UnaryOpType[UnaryOpType["RELU6"] = 24] = "RELU6";
        UnaryOpType[UnaryOpType["LEAKYRELU"] = 25] = "LEAKYRELU";
        UnaryOpType[UnaryOpType["RECIPROCAL"] = 26] = "RECIPROCAL";
        UnaryOpType[UnaryOpType["ROUND"] = 27] = "ROUND";
        UnaryOpType[UnaryOpType["RSQRT"] = 28] = "RSQRT";
        UnaryOpType[UnaryOpType["SELU"] = 29] = "SELU";
        UnaryOpType[UnaryOpType["SIGMOID"] = 30] = "SIGMOID";
        UnaryOpType[UnaryOpType["SIGN"] = 31] = "SIGN";
        UnaryOpType[UnaryOpType["SIN"] = 32] = "SIN";
        UnaryOpType[UnaryOpType["SINH"] = 33] = "SINH";
        UnaryOpType[UnaryOpType["SOFTPLUS"] = 34] = "SOFTPLUS";
        UnaryOpType[UnaryOpType["SQRT"] = 35] = "SQRT";
        UnaryOpType[UnaryOpType["SQUARE"] = 36] = "SQUARE";
        UnaryOpType[UnaryOpType["STEP"] = 37] = "STEP";
        UnaryOpType[UnaryOpType["TAN"] = 38] = "TAN";
        UnaryOpType[UnaryOpType["TANH"] = 39] = "TANH";
        UnaryOpType[UnaryOpType["TO_INT"] = 40] = "TO_INT";
    })(UnaryOpType || (UnaryOpType = {}));
    var ABS = "return abs(a);";
    var ACOS = "\n  if (abs(a) > 1.) {\n    return uniforms.NAN;\n  }\n  return acos(a);\n";
    var ACOSH = "\n  if (a < 1.) {\n    return uniforms.NAN;\n  }\n  return acosh(a);\n";
    var ASIN = "\n  if (abs(a) > 1.) {\n    return uniforms.NAN;\n  }\n  return asin(a);\n";
    var ASINH = "return asinh(a);";
    var ATAN = "\n  if (isnan(a)) {\n    return uniforms.NAN;\n  }\n  return atan(a);\n";
    var ATANH = "\n  if (abs(a) > 1.) {\n    return uniforms.NAN;\n  }\n  if (a == 1.) {\n    return uniforms.INFINITY;\n  }\n  if (a == -1.) {\n    return -uniforms.INFINITY;\n  }\n  return atanh(a);\n";
    var CEIL = "return ceil(a);";
    var COS = "return cos(a);";
    var COSH = "\n  let e2x = exp(-a);\n  return (e2x + 1.0 / e2x) / 2.0;\n";
    var EXPM1 = "return exp(a) - 1.0;";
    var ELU = "if (a >= 0.0) { return a; }  return (exp(a) - 1.0);";
    var ELU_VEC4 = "\n  var resFloat = exp(a) - vec4<f32>(1.0);\n  if (a.r >= 0.0) {\n    resFloat.r = a.r;\n  }\n  if (a.g >= 0.0) {\n    resFloat.g = a.g;\n  }\n  if (a.b >= 0.0) {\n    resFloat.b = a.b;\n  }\n  if (a.a >= 0.0) {\n    resFloat.a = a.a;\n  }\n  return resFloat;\n";
    var ERF = "\n  // Error function is calculated approximately with elementary function.\n  // See \"Handbook of Mathematical Functions with Formulas,\n  // Graphs, and Mathematical Tables\", Abramowitz and Stegun.\n  let p = ".concat(tf.backend_util.ERF_P, ";\n  let a1 = ").concat(tf.backend_util.ERF_A1, ";\n  let a2 = ").concat(tf.backend_util.ERF_A2, ";\n  let a3 = ").concat(tf.backend_util.ERF_A3, ";\n  let a4 = ").concat(tf.backend_util.ERF_A4, ";\n  let a5 = ").concat(tf.backend_util.ERF_A5, ";\n\n  let sign = sign(a);\n  let absA = abs(a);\n  let t = 1.0 / (1.0 + p * absA);\n  return sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * exp(-absA * absA));\n");
    var EXP = "return exp(a);";
    var FLOOR = "return floor(a);";
    var IS_FINITE = "return f32(!isnan(a) && !isinf(a));";
    var IS_INF = "return f32(isinf(a));";
    var IS_NAN = "return f32(isnan(a));";
    var LINEAR = "return a;";
    var LOG = "if (a < 0.0) { return uniforms.NAN; }\n  return log(a);";
    var LOG1P = "\n  if (isnan(a)) { return a; }\n  return log(1.0 + a);\n";
    var LOGICAL_NOT = "return f32(!(a >= 1.0));";
    var NEG = "return -a;";
    var LEAKYRELU = "if (a < 0.0) { return uniforms.alpha * a; } return a;";
    var LEAKYRELU_VEC4 = "\n  let aLessThanZero = vec4<f32>(a < vec4<f32>(0.0));\n  return (aLessThanZero * (uniforms.alpha * a)) + ((vec4<f32>(1.0) - aLessThanZero) * a);\n";
    var RECIPROCAL = "return 1.0 / a;";
    var RELU = "return select(a, 0.0, a < 0.0);";
    var RELU6 = 'return clamp(a, 0.0, 6.0);';
    var RELU6_VEC4 = 'return clamp(a, vec4<f32>(0.0, 0.0, 0.0, 0.0), vec4<f32>(6.0, 6.0, 6.0, 6.0));';
    var RELU_VEC4 = "\n  return select(a, vec4<f32>(0.0), a < vec4<f32>(0.0));\n";
    var ROUND = "return round(a);";
    var RSQRT = "return inverseSqrt(a);";
    // Stable and Attracting Fixed Point (0, 1) for Normalized Weights.
    // See: https://arxiv.org/abs/1706.02515
    var SELU = "\n  if (a >= 0.0) {\n    return ".concat(tf.backend_util.SELU_SCALE, " * a;\n  } else {\n    return ").concat(tf.backend_util.SELU_SCALEALPHA, " * (exp(a) - 1.0);\n  }\n");
    var SIGMOID = "return 1.0 / (1.0 + exp(-1.0 * a));";
    var SIGN = "return sign(a);";
    var SIN = "return sin(a);";
    var SINH = "\n  let e2x = exp(a);\n  return (e2x - 1.0 / e2x) / 2.0;\n";
    var SOFTPLUS = "\n  let epsilon = 1.1920928955078125e-7;\n  let threshold = log(epsilon) + 2.0;\n\n  let too_large = a > -threshold;\n  let too_small = a < threshold;\n  let exp_a = exp(a);\n\n  if (too_large) {\n    return a;\n  } else if (too_small) {\n    return exp_a;\n  } else {\n    return log(exp_a + 1.0);\n  }\n";
    var SQRT = "return sqrt(a);";
    var SQUARE = "return a * a;";
    var STEP = "\n  if (isnan(a)) {\n    return a;\n  }\n\n  return select(uniforms.stepAlpha, 1.0, a > 0.0);\n";
    var TAN = "return tan(a);";
    var TANH = "\n  let e2x = exp(-2.0 * abs(a));\n  return sign(a) * (1.0 - e2x) / (1.0 + e2x);\n";
    var TO_INT = "return f32(i32((a)));";
    function getUnaryOpString(type, useVec4) {
        switch (type) {
            case UnaryOpType.ABS:
                return ABS;
            case UnaryOpType.ACOS:
                return ACOS;
            case UnaryOpType.ACOSH:
                return ACOSH;
            case UnaryOpType.ASIN:
                return ASIN;
            case UnaryOpType.ASINH:
                return ASINH;
            case UnaryOpType.ATAN:
                return ATAN;
            case UnaryOpType.ATANH:
                return ATANH;
            case UnaryOpType.COS:
                return COS;
            case UnaryOpType.COSH:
                return COSH;
            case UnaryOpType.CEIL:
                return CEIL;
            case UnaryOpType.ELU:
                return useVec4 ? ELU_VEC4 : ELU;
            case UnaryOpType.ERF:
                return ERF;
            case UnaryOpType.EXP:
                return EXP;
            case UnaryOpType.EXPM1:
                return EXPM1;
            case UnaryOpType.FLOOR:
                return FLOOR;
            case UnaryOpType.IS_FINITE:
                return IS_FINITE;
            case UnaryOpType.IS_INF:
                return IS_INF;
            case UnaryOpType.IS_NAN:
                return IS_NAN;
            case UnaryOpType.LINEAR:
                return LINEAR;
            case UnaryOpType.LOG:
                return LOG;
            case UnaryOpType.LOG1P:
                return LOG1P;
            case UnaryOpType.LOGICAL_NOT:
                return LOGICAL_NOT;
            case UnaryOpType.NEG:
                return NEG;
            case UnaryOpType.LEAKYRELU:
                return useVec4 ? LEAKYRELU_VEC4 : LEAKYRELU;
            case UnaryOpType.RECIPROCAL:
                return RECIPROCAL;
            case UnaryOpType.RELU:
                return useVec4 ? RELU_VEC4 : RELU;
            case UnaryOpType.RELU6:
                return useVec4 ? RELU6_VEC4 : RELU6;
            case UnaryOpType.ROUND:
                return ROUND;
            case UnaryOpType.RSQRT:
                return RSQRT;
            case UnaryOpType.SELU:
                return SELU;
            case UnaryOpType.SIGMOID:
                return SIGMOID;
            case UnaryOpType.SIGN:
                return SIGN;
            case UnaryOpType.SIN:
                return SIN;
            case UnaryOpType.SINH:
                return SINH;
            case UnaryOpType.SOFTPLUS:
                return SOFTPLUS;
            case UnaryOpType.SQRT:
                return SQRT;
            case UnaryOpType.SQUARE:
                return SQUARE;
            case UnaryOpType.STEP:
                return STEP;
            case UnaryOpType.TAN:
                return TAN;
            case UnaryOpType.TANH:
                return TANH;
            case UnaryOpType.TO_INT:
                return TO_INT;
            default:
                throw new Error("BinaryType ".concat(type, " is not implemented!"));
        }
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function activationFnSnippet(activation, hasPreluActivationWeights, packed, coordsLength) {
        if (hasPreluActivationWeights === void 0) { hasPreluActivationWeights = false; }
        if (packed === void 0) { packed = false; }
        if (coordsLength === void 0) { coordsLength = 3; }
        if (activation === null) {
            return '';
        }
        var activationOpSnippet = '';
        if (activation === 'linear') {
            activationOpSnippet = getUnaryOpString(UnaryOpType.LINEAR);
        }
        else if (activation === 'relu') {
            activationOpSnippet = getUnaryOpString(UnaryOpType.RELU, packed);
        }
        else if (activation === 'elu') {
            activationOpSnippet = getUnaryOpString(UnaryOpType.ELU, packed);
        }
        else if (activation === 'relu6') {
            activationOpSnippet = getUnaryOpString(UnaryOpType.RELU6, packed);
        }
        else if (activation === 'prelu') {
            activationOpSnippet = getBinaryOpString(BinaryOpType.PRELU, packed);
        }
        else if (activation === 'sigmoid') {
            activationOpSnippet = getUnaryOpString(UnaryOpType.SIGMOID, packed);
        }
        else if (activation === 'leakyrelu') {
            activationOpSnippet = getUnaryOpString(UnaryOpType.LEAKYRELU, packed);
        }
        else {
            throw new Error("Activation ".concat(activation, " has not been implemented for the WebGPU backend."));
        }
        var elementSize = packed ? 4 : 1;
        var dataType = typeSnippet(elementSize);
        var activationFnSnippet = '';
        if (hasPreluActivationWeights) {
            activationFnSnippet = "\n      fn activation(a : ".concat(dataType, ", coords : vec").concat(coordsLength, "<i32>) -> ").concat(dataType, " {\n        let b = getPreluActivationWeightsByOutputCoords(coords);\n        ").concat(activationOpSnippet, "\n      }");
        }
        else {
            activationFnSnippet = "\n      fn activation(a : ".concat(dataType, ", coords : vec").concat(coordsLength, "<i32>) -> ").concat(dataType, " {\n        ").concat(activationOpSnippet, "\n      }");
        }
        return activationFnSnippet;
    }
    function biasActivationSnippet(hasBias, activation) {
        return "\n      ".concat(hasBias ? 'value = value + getBiasByOutputCoords(coords);' : '', "\n      ").concat(activation ? 'value = activation(value, coords);' : '', "\n      ");
    }

    function matMulReadFnSource(transposeA, transposeB, fitAOuter, fitBOuter, fitInner, component) {
        if (fitAOuter === void 0) { fitAOuter = false; }
        if (fitInner === void 0) { fitInner = false; }
        if (component === void 0) { component = 1; }
        tf.util.assert(transposeA && component === 1 || !transposeA, function () { return "transposeA ".concat(transposeA, " is not compatible with component size ").concat(component); });
        var sampleA = "\n      ".concat(transposeA ? "value = getA(batch, col, row);" :
            "value = getA(batch, row, col);", "\n\n    ");
        var sampleB = transposeB ? "value = getB(batch, col, row);" :
            "value = getB(batch, row, col);";
        return "\n  fn mm_readA(batch: i32, row: i32, col: i32) -> ".concat(typeSnippet(component), " {\n    var value = ").concat(typeSnippet(component), "(0.0);\n    ").concat(fitAOuter && fitInner ?
            sampleA :
            "\n    ".concat(transposeA ?
                "if(row < uniforms.dimAOuter && col < uniforms.dimInner)" :
                "if(row < uniforms.aShape[1] && col < uniforms.aShape[2])", "\n    {\n      ").concat(sampleA, "\n    }\n    "), "\n    return value;\n  }\n\n  fn mm_readB(batch: i32, row: i32, col: i32) -> ").concat(typeSnippet(component), " {\n    var value = ").concat(typeSnippet(component), "(0.0);\n    ").concat(sampleB, "\n    return value;\n  }\n  ");
    }
    function matMulReadWriteFnSource(hasBias, activation, transposeA, transposeB, fitAOuter, fitBOuter, fitInner, component) {
        if (fitAOuter === void 0) { fitAOuter = false; }
        if (fitBOuter === void 0) { fitBOuter = false; }
        if (fitInner === void 0) { fitInner = false; }
        if (component === void 0) { component = 1; }
        return "\n  ".concat(matMulReadFnSource(transposeA, transposeB, fitAOuter, fitBOuter, fitInner, component), "\n  fn mm_write(batch: i32, row: i32, col: i32, valueIn: ").concat(typeSnippet(component), ") {\n    ").concat(fitAOuter && fitBOuter ?
            '' :
            'if (row < uniforms.dimAOuter && col < uniforms.dimBOuter)', "\n    {\n      var value = valueIn;\n      let coords = vec3<i32>(batch, row, col);\n      ").concat(biasActivationSnippet(hasBias, activation), "\n      setOutputAtCoords(coords[0], coords[1], coords[2], value);\n    }\n  }\n  ");
    }
    var writeDataToSubAVec4Snippet = function (transpose, innerElementSize) {
        if (transpose) {
            return "\n        mm_Asub[inputRow][inputCol] = mm_readA(batchA,\n          kStart + inputRow,\n          globalRowStart + inputCol * ".concat(innerElementSize, ");\n        ");
        }
        else {
            return "\n        mm_Asub[inputRow][inputCol] = mm_readA(batchA,\n          globalRow + innerRow,\n          kStart + inputCol * ".concat(innerElementSize, ");\n        ");
        }
    };
    var calculateResultSnippet = function (transposeA, innerElementSize, rowPerThread, tileInner) {
        if (transposeA) {
            return "\n      for (var k = 0; k < ".concat(tileInner, "; k++) {\n        let BCached0 = mm_Bsub[k][tileCol];\n        let ACached0 = mm_Asub[k][localRow];\n        for (var i = 0; i < ").concat(rowPerThread, "; i++) {\n          acc[i] = fma(BCached0, vec4<f32>(ACached0[i]), acc[i]);\n        }\n      }");
        }
        else {
            var bCachedStr = '';
            var accStr = '';
            for (var i = 0; i < innerElementSize; i++) {
                bCachedStr += "let BCached".concat(i, " = mm_Bsub[k * ").concat(innerElementSize, " + ").concat(i, "][tileCol];");
                accStr +=
                    "acc[i] = fma(BCached".concat(i, ", vec4<f32>(ACached[").concat(i, "]), acc[i]);");
            }
            return "\n      for (var k = 0; k < ".concat(tileInner / innerElementSize, "; k++) {\n        ").concat(bCachedStr, "\n        for (var i = 0; i < ").concat(rowPerThread, "; i++) {\n          let ACached = mm_Asub[tileRow + i][k];\n          ").concat(accStr, "\n        }\n      }");
        }
    };
    function makeMatMulPackedVec4Source(workPerThread, workgroupSize, transposeA, tileInner, splitK, splitedDimInner, broadcastBatch) {
        if (transposeA === void 0) { transposeA = false; }
        if (tileInner === void 0) { tileInner = 32; }
        if (splitK === void 0) { splitK = false; }
        if (splitedDimInner === void 0) { splitedDimInner = 32; }
        if (broadcastBatch === void 0) { broadcastBatch = false; }
        var tileAOuter = workgroupSize[1] * workPerThread[1];
        var tileBOuter = workgroupSize[0] * workPerThread[0];
        var tileAWidth = transposeA ? tileAOuter : tileInner;
        var tileAHight = transposeA ? tileInner : tileAOuter;
        var innerElementSize = tileAWidth / workgroupSize[0];
        var rowPerThreadB = tileInner / workgroupSize[1];
        var rowPerThread = workPerThread[1];
        var colPerThread = workPerThread[0];
        tf.util.assert(((transposeA && innerElementSize === 4 && workPerThread[1] === 4) ||
            (!transposeA && (innerElementSize === 3 || innerElementSize === 4))) &&
            tileAWidth % workgroupSize[0] === 0 &&
            tileInner % workgroupSize[1] === 0 && workPerThread[0] === 4, function () { return "If transposeA ".concat(transposeA, " is true, innerElementSize ").concat(innerElementSize, " and workPerThread[1] ").concat(workPerThread[1], " must be 4.\n          Otherwise, innerElementSize ").concat(innerElementSize, " must be 3 or 4.\n      tileAWidth ").concat(tileAWidth, " must be divisible by workgroupSize[0]").concat(workgroupSize[0], ". tileInner ").concat(tileInner, " must be divisible by workgroupSize[1] ").concat(workgroupSize[1], ". colPerThread ").concat(workPerThread[0], " must be 4."); });
        return "\n  var<workgroup> mm_Asub : array<array<vec".concat(innerElementSize, "<f32>, ").concat(tileAWidth / innerElementSize, ">, ").concat(tileAHight, ">;\n  var<workgroup> mm_Bsub : array<array<vec4<f32>, ").concat(tileBOuter / workPerThread[0], ">, ").concat(tileInner, ">;\n\n  ").concat(getMainHeaderString(), " {\n    let localRow = i32(localId.y);\n    let tileRow = localRow * ").concat(rowPerThread, ";\n    let tileCol = i32(localId.x);\n\n    let globalRow = i32(globalId.y) * ").concat(rowPerThread, ";\n    let globalCol = i32(globalId.x) * ").concat(colPerThread, ";\n    let batch = ").concat(splitK ? '0' : 'i32(globalId.z)', ";\n    let batchA = ").concat(splitK || !broadcastBatch ? 'batch' : 'batch % uniforms.aShape[0]', ";\n    let batchB = ").concat(splitK || !broadcastBatch ? 'batch' : 'batch % uniforms.bShape[0]', ";\n    let globalRowStart = i32(workgroupId.y) * ").concat(tileAOuter, ";\n\n    let numTiles = ").concat(splitK ? "".concat(Math.ceil(splitedDimInner / tileInner)) :
            "(uniforms.dimInner - 1) / ".concat(tileInner, " + 1"), ";\n    var kStart = ").concat(splitK ? "i32(globalId.z) * ".concat(splitedDimInner) : '0', ";\n\n    var acc: array<vec4<f32>, ").concat(rowPerThread, ">;\n\n    // Loop over shared dimension.\n    let tileRowB = localRow * ").concat(rowPerThreadB, ";\n    for (var t = 0; t < numTiles; t++) {\n        // Load one tile of A into local memory.\n        for (var innerRow = 0; innerRow < ").concat(rowPerThread, "; innerRow++) {\n            let inputRow = tileRow + innerRow;\n            let inputCol = tileCol;\n            ").concat(writeDataToSubAVec4Snippet(transposeA, innerElementSize), "\n        }\n\n        // Load one tile of B into local memory.\n        for (var innerRow = 0; innerRow < ").concat(rowPerThreadB, "; innerRow++) {\n            let inputRow = tileRowB + innerRow;\n            let inputCol = tileCol;\n            mm_Bsub[inputRow][inputCol] = mm_readB(batchB, kStart + inputRow, globalCol);\n        }\n        kStart = kStart + ").concat(tileInner, ";\n        workgroupBarrier();\n\n        // Compute acc values for a single thread.\n        ").concat(calculateResultSnippet(transposeA, innerElementSize, rowPerThread, tileInner), "\n        workgroupBarrier();\n    }\n\n    for (var innerRow = 0; innerRow < ").concat(rowPerThread, "; innerRow++) {\n        mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);\n    }\n  }");
    }
    var writeDataToSubASnippet = function (transpose) {
        if (transpose) {
            return "\n        mm_Asub[inputRow][inputCol] = mm_readA(batchA,\n          kStart + inputRow,\n          globalRowStart + inputCol);\n        ";
        }
        else {
            return "\n        mm_Asub[inputRow][inputCol] = mm_readA(batchA,\n          globalRowStart + inputRow,\n          kStart + inputCol);\n        ";
        }
    };
    var readDataFromSubASnippet = function (transposeA) {
        return transposeA ? 'let ACached = mm_Asub[k][tileRow + innerRow];' :
            'let ACached = mm_Asub[tileRow + innerRow][k];';
    };
    // sequentialAccessByThreads means sequential data in memory is accessed by
    // threads, instead of a single thread (default behavior).
    function makeMatMulPackedSource(workPerThread, workgroupSize, transposeA, tileInner, splitK, splitedDimInner, sequentialAccessByThreads, broadcastBatch) {
        if (transposeA === void 0) { transposeA = false; }
        if (tileInner === void 0) { tileInner = 32; }
        if (splitK === void 0) { splitK = false; }
        if (splitedDimInner === void 0) { splitedDimInner = 32; }
        if (sequentialAccessByThreads === void 0) { sequentialAccessByThreads = false; }
        if (broadcastBatch === void 0) { broadcastBatch = false; }
        var tileAOuter = workPerThread[1] * workgroupSize[1];
        var tileBOuter = workPerThread[0] * workgroupSize[0];
        var tileAWidth = transposeA ? tileAOuter : tileInner;
        var tileAHight = transposeA ? tileInner : tileAOuter;
        tf.util.assert(tileAHight % workgroupSize[1] === 0 &&
            tileAWidth % workgroupSize[0] === 0 &&
            tileInner % workgroupSize[1] === 0, function () { return "tileAHight ".concat(tileAHight, " must be divisible by workgroupSize[1]").concat(workgroupSize[1], ", tileAWidth ").concat(tileAWidth, " must be divisible by workgroupSize[0]").concat(workgroupSize[0], ", tileInner ").concat(tileInner, " must be divisible by workgroupSize[1]").concat(workgroupSize[1]); });
        var rowPerThreadA = tileAHight / workgroupSize[1];
        var colPerThreadA = tileAWidth / workgroupSize[0];
        var rowPerThreadB = tileInner / workgroupSize[1];
        var rowPerThread = workPerThread[1];
        var colPerThread = workPerThread[0];
        var matmulSnippet = sequentialAccessByThreads ?
            "\n      let localRow = i32(localId.y);\n      let localCol = i32(localId.x);\n      let globalRowStart = i32(workgroupId.y) * ".concat(tileAOuter, ";\n      let globalColStart = i32(workgroupId.x) * ").concat(tileBOuter, ";\n\n      // Loop over shared dimension.\n      for (var t = 0; t < numTiles; t++) {\n        // Load one tile of A into local memory.\n        for (var inputRow = localRow; inputRow < ").concat(tileAHight, "; inputRow = inputRow + ").concat(workgroupSize[1], ") {\n          for (var inputCol = localCol; inputCol < ").concat(tileAWidth, "; inputCol = inputCol + ").concat(workgroupSize[0], ") {\n            ").concat(writeDataToSubASnippet(transposeA), "\n          }\n        }\n        // Load one tile of B into local memory.\n        for (var inputRow = localRow; inputRow < ").concat(tileInner, "; inputRow = inputRow + ").concat(workgroupSize[1], ") {\n              for (var inputCol = localCol; inputCol < ").concat(tileBOuter, "; inputCol = inputCol + ").concat(workgroupSize[0], ") {\n            mm_Bsub[inputRow][inputCol] = mm_readB(batchB,\n              kStart + inputRow,\n              globalColStart + inputCol);\n          }\n        }\n        kStart = kStart + ").concat(tileInner, ";\n        workgroupBarrier();\n\n        // Compute acc values for a single thread.\n        var BCached : array<f32, ").concat(colPerThread, ">;\n        for (var k = 0; k < ").concat(tileInner, "; k++) {\n          for (var inner = 0; inner < ").concat(colPerThread, "; inner++) {\n            BCached[inner] = mm_Bsub[k][localCol + inner * ").concat(workgroupSize[0], "];\n          }\n          for (var innerRow = 0; innerRow < ").concat(rowPerThread, "; innerRow++) {\n            let ACached = ").concat(transposeA ?
                "mm_Asub[k][localRow + innerRow * ".concat(workgroupSize[1], "];") :
                "mm_Asub[localRow + innerRow * ".concat(workgroupSize[1], "][k];"), "\n            for (var innerCol = 0; innerCol < ").concat(colPerThread, "; innerCol++) {\n              acc[innerRow][innerCol] =\n                  fma(ACached, BCached[innerCol], acc[innerRow][innerCol]);\n            }\n          }\n        }\n        workgroupBarrier();\n      }\n      for (var innerRow = 0; innerRow < ").concat(rowPerThread, "; innerRow++) {\n        let gRow = globalRowStart + localRow + innerRow * ").concat(workgroupSize[1], ";\n        for (var innerCol = 0; innerCol < ").concat(colPerThread, "; innerCol++) {\n          let gCol = globalColStart + localCol + innerCol * ").concat(workgroupSize[0], ";\n          mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);\n        }\n      }\n      ") :
            "\n  let tileRow = i32(localId.y) * ".concat(rowPerThread, ";\n  let tileCol = i32(localId.x) * ").concat(colPerThread, ";\n\n  let globalRow = i32(globalId.y) * ").concat(rowPerThread, ";\n  let globalCol = i32(globalId.x) * ").concat(colPerThread, ";\n  let globalRowStart = i32(workgroupId.y) * ").concat(tileAOuter, ";\n\n  let tileRowA = i32(localId.y) * ").concat(rowPerThreadA, ";\n  let tileColA = i32(localId.x) * ").concat(colPerThreadA, ";\n  let tileRowB = i32(localId.y) * ").concat(rowPerThreadB, ";\n  // Loop over shared dimension.\n  for (var t = 0; t < numTiles; t++) {\n    // Load one tile of A into local memory.\n    for (var innerRow = 0; innerRow < ").concat(rowPerThreadA, "; innerRow++) {\n      for (var innerCol = 0; innerCol < ").concat(colPerThreadA, "; innerCol++) {\n        let inputRow = tileRowA + innerRow;\n        let inputCol = tileColA + innerCol;\n        ").concat(writeDataToSubASnippet(transposeA), "\n      }\n    }\n\n    // Load one tile of B into local memory.\n    for (var innerRow = 0; innerRow < ").concat(rowPerThreadB, "; innerRow++) {\n      for (var innerCol = 0; innerCol < ").concat(colPerThread, "; innerCol++) {\n        let inputRow = tileRowB + innerRow;\n        let inputCol = tileCol + innerCol;\n        mm_Bsub[inputRow][inputCol] = mm_readB(batchB,\n          kStart + inputRow,\n          globalCol + innerCol);\n      }\n    }\n    kStart = kStart + ").concat(tileInner, ";\n    workgroupBarrier();\n\n    // Compute acc values for a single thread.\n    var BCached : array<f32, ").concat(colPerThread, ">;\n    for (var k = 0; k < ").concat(tileInner, "; k++) {\n      for (var inner = 0; inner < ").concat(colPerThread, "; inner++) {\n        BCached[inner] = mm_Bsub[k][tileCol + inner];\n      }\n\n      for (var innerRow = 0; innerRow < ").concat(rowPerThread, "; innerRow++) {\n        ").concat(readDataFromSubASnippet(transposeA), "\n        for (var innerCol = 0; innerCol < ").concat(colPerThread, "; innerCol++) {\n          acc[innerRow][innerCol] =\n              fma(ACached, BCached[innerCol], acc[innerRow][innerCol]);\n        }\n      }\n    }\n\n    workgroupBarrier();\n  }\n\n  for (var innerRow = 0; innerRow < ").concat(rowPerThread, "; innerRow++) {\n    for (var innerCol = 0; innerCol < ").concat(colPerThread, "; innerCol++) {\n      mm_write(batch, globalRow + innerRow, globalCol + innerCol,\n          acc[innerRow][innerCol]);\n    }\n  }\n  ");
        return "\n    var<workgroup> mm_Asub : array<array<f32, ".concat(tileAWidth, ">, ").concat(tileAHight, ">;\n    var<workgroup> mm_Bsub : array<array<f32, ").concat(tileBOuter, ">, ").concat(tileInner, ">;\n\n    ").concat(getMainHeaderString(), " {\n      let batch = ").concat(splitK ? '0' : 'i32(globalId.z)', ";\n      let batchA = ").concat(splitK || !broadcastBatch ? 'batch' : 'batch % uniforms.aShape[0]', ";\n      let batchB = ").concat(splitK || !broadcastBatch ? 'batch' : 'batch % uniforms.bShape[0]', ";\n      let numTiles = ").concat(splitK ? "".concat(Math.ceil(splitedDimInner / tileInner)) :
            "(uniforms.dimInner - 1) / ".concat(tileInner, " + 1"), ";\n      var kStart = ").concat(splitK ? "i32(globalId.z) * ".concat(splitedDimInner) : '0', ";\n\n      var acc : array<array<f32, ").concat(colPerThread, ">, ").concat(rowPerThread, ">;\n\n      // Without this initialization strange values show up in acc.\n      for (var innerRow = 0; innerRow < ").concat(rowPerThread, "; innerRow++) {\n        for (var innerCol = 0; innerCol < ").concat(colPerThread, "; innerCol++) {\n          acc[innerRow][innerCol] = 0.0;\n        }\n      }\n      ").concat(matmulSnippet, "\n    }\n  ");
    }
    var readVectorASnippet = function (transpose) {
        return transpose ? "\n      mm_readA(batchA, colA, globalRow),\n      mm_readA(batchA, colA + 1, globalRow),\n      mm_readA(batchA, colA + 2, globalRow),\n      mm_readA(batchA, colA + 3, globalRow)\n  " :
            "\n      mm_readA(batchA, globalRow, colA),\n      mm_readA(batchA, globalRow, colA + 1),\n      mm_readA(batchA, globalRow, colA + 2),\n      mm_readA(batchA, globalRow, colA + 3)\n  ";
    };
    function makeVectorMatrixProductSource(workgroupSize, transposeA) {
        if (transposeA === void 0) { transposeA = false; }
        tf.util.assert(workgroupSize[1] === 1 && workgroupSize[2] === 1, function () { return "A linear work group size is required. But got ".concat(workgroupSize, "."); });
        var tileSize = workgroupSize[0] * 4;
        return "\n    var<workgroup> mm_Asub : array<vec4<f32>, ".concat(workgroupSize[0], ">;\n\n    ").concat(getMainHeaderString(), " {\n      let tileCol = i32(localId.x);\n      let globalCol = i32(globalId.x);\n      let globalRow = i32(globalId.y);\n\n      let numTiles = (uniforms.dimInner - 1) / ").concat(tileSize, " + 1;\n      let batch = i32(globalId.z);\n      let batchA = batch % uniforms.aShape[0];\n      let batchB = batch % uniforms.bShape[0];\n      // Without this initialization strange values show up in acc.\n      var acc = 0.0;\n\n      // Loop over shared dimension.\n      for (var t = 0; t < numTiles; t++) {\n        // Load one tile of A into local memory.\n        let colA = t * ").concat(tileSize, " + tileCol * 4;\n        mm_Asub[tileCol] = vec4<f32>(").concat(readVectorASnippet(transposeA), ");\n        workgroupBarrier();\n\n        // Compute acc values for a single thread.\n        for (var k = 0; k < ").concat(tileSize / 4, "; k++) {\n          let rowB = t * ").concat(tileSize, " + k * 4;\n          let BCached = vec4<f32>(mm_readB(batchB, rowB, globalCol),\n                              mm_readB(batchB, rowB + 1, globalCol),\n                              mm_readB(batchB, rowB + 2, globalCol),\n                              mm_readB(batchB, rowB + 3, globalCol));\n\n          let ACached = mm_Asub[k];\n          acc = acc + dot(ACached, BCached);\n        }\n\n        workgroupBarrier();\n      }\n\n      mm_write(batch, globalRow, globalCol, acc);\n    }\n  ");
    }
    var MatMulPackedProgram = /** @class */ (function () {
        function MatMulPackedProgram(aShape, outputShape, transposeA, transposeB, bias, activation, preluActivationWeights, sequentialAccessByThreads) {
            var _a;
            if (transposeA === void 0) { transposeA = false; }
            if (transposeB === void 0) { transposeB = false; }
            if (bias === void 0) { bias = null; }
            if (activation === void 0) { activation = null; }
            if (preluActivationWeights === void 0) { preluActivationWeights = null; }
            if (sequentialAccessByThreads === void 0) { sequentialAccessByThreads = false; }
            this.variableNames = ['A', 'B'];
            this.uniforms = "dimAOuter : i32, dimBOuter : i32, dimInner : i32,";
            this.outputShape = outputShape;
            this.dispatchLayout = { x: [2], y: [1], z: [0] };
            var dimInner = transposeA ? aShape[1] : aShape[2];
            this.isVec4 = ((dimInner % 4 === 0 && !transposeA) ||
                (outputShape[1] % 4 === 0 && transposeA)) &&
                outputShape[2] % 4 === 0 && !transposeB;
            this.outputComponent = this.isVec4 ? 4 : 1;
            this.isVectorA = outputShape[1] === 1 && !transposeA;
            if (!this.isVec4 && this.isVectorA) {
                // For makeVectorMatrixProductSource
                this.elementsPerThread = [1, 1, 1];
                this.workgroupSize = [32, 1, 1];
            }
            else {
                var workgroupInfo = computeWorkgroupInfoForMatMul(outputShape[1], dimInner, outputShape[2], transposeA);
                this.workgroupSize = workgroupInfo.workgroupSize;
                this.elementsPerThread = workgroupInfo.elementsPerThread;
            }
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, this.elementsPerThread);
            var addBias = bias != null;
            var hasPreluActivationWeights = preluActivationWeights != null;
            if (addBias) {
                this.variableNames.push('bias');
            }
            if (hasPreluActivationWeights) {
                this.variableNames.push('preluActivationWeights');
            }
            this.sequentialAccessByThreads = sequentialAccessByThreads;
            this.transposeA = transposeA;
            this.transposeB = transposeB;
            this.addBias = addBias;
            this.activation = activation;
            this.hasPreluActivationWeights = hasPreluActivationWeights;
            _a = __read(this.getShapeFit(outputShape[1], outputShape[2], dimInner), 3), this.fitAOuter = _a[0], this.fitBOuter = _a[1], this.fitInner = _a[2];
            this.shaderKey = "matMulPacked_".concat(this.elementsPerThread, "_").concat(transposeA, "_").concat(transposeB, "_").concat(this.activation, "_").concat(this.fitAOuter, "_").concat(this.fitBOuter, "_").concat(this.fitInner, "_").concat(this.isVec4, "_").concat(this.isVectorA, "_").concat(this.sequentialAccessByThreads);
        }
        MatMulPackedProgram.prototype.getShapeFit = function (dimAOuter, dimBOuter, dimInner) {
            var tileAOuter = this.workgroupSize[1] * this.elementsPerThread[1];
            var tileBOuter = this.workgroupSize[0] * this.elementsPerThread[0];
            if (!this.isVec4 && this.isVectorA) {
                // For makeVectorMatrixProductSource
                this.tileInner = this.workgroupSize[0] * 4;
            }
            else {
                this.tileInner = tileBOuter;
            }
            var fitAOuter = dimAOuter % tileAOuter === 0;
            var fitBOuter = dimBOuter % tileBOuter === 0;
            var fitInner = dimInner % this.tileInner === 0;
            return [fitAOuter, fitBOuter, fitInner];
        };
        MatMulPackedProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(activationFnSnippet(this.activation, this.hasPreluActivationWeights, this.isVec4), "\n      ").concat(matMulReadWriteFnSource(this.addBias, this.activation, false /* transposeA is implemented in makeMatMulPackedSource */, this.transposeB, this.fitAOuter, this.fitBOuter, this.fitInner, this.isVec4 ? 4 : 1), "\n      ").concat(this.isVec4 ?
                makeMatMulPackedVec4Source(this.elementsPerThread, this.workgroupSize, this.transposeA, this.tileInner, false, null, true) :
                (this.isVectorA ? makeVectorMatrixProductSource(this.workgroupSize, this.transposeA) :
                    makeMatMulPackedSource(this.elementsPerThread, this.workgroupSize, this.transposeA, this.tileInner, false, null, this.sequentialAccessByThreads, true)), "\n    ");
            return userCode;
        };
        return MatMulPackedProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function makeMatMulReduceSource(workgroupSizeX) {
        return "\n    var<workgroup> sumValues : array<f32, ".concat(workgroupSizeX, ">;\n    ").concat(getMainHeaderString(), " {\n      let coords = getOutputCoords();\n      let batch = coords[0];\n      let batchA = batch % uniforms.aShape[0];\n      let batchB = batch % uniforms.bShape[0];\n      let row = coords[1];\n      let col = coords[2];\n      var sum = 0.0;\n      let Length = uniforms.dimInner;\n      for (var k = i32(localId.x); k < Length; k = k + ").concat(workgroupSizeX, ") {\n        let dataA = mm_readA(batchA, row, k);\n        let dataB = mm_readB(batchB, k, col);\n        sum = sum + dataA * dataB;\n      }\n      sumValues[localId.x] = sum;\n      workgroupBarrier();\n\n      for(var currentSize = ").concat(workgroupSizeX / 2, "u; currentSize > 1u;\n          currentSize = currentSize / 2u) {\n        if (localId.x < currentSize)\n        {\n          sumValues[localId.x] = sumValues[localId.x] + sumValues[localId.x + currentSize];\n        }\n        workgroupBarrier();\n      }\n\n      if (localId.x == 0u) {\n        sum = sumValues[0] + sumValues[1];\n        mm_write(batch, row, col, sum);\n      }\n    }\n  ");
    }
    var MatMulReduceProgram = /** @class */ (function () {
        function MatMulReduceProgram(outputShape, transposeA, transposeB, bias, activation, preluActivationWeights) {
            if (transposeA === void 0) { transposeA = false; }
            if (transposeB === void 0) { transposeB = false; }
            if (bias === void 0) { bias = null; }
            if (activation === void 0) { activation = null; }
            if (preluActivationWeights === void 0) { preluActivationWeights = null; }
            this.variableNames = ['A', 'B'];
            this.uniforms = "dimAOuter : i32, dimBOuter : i32, dimInner : i32,";
            this.workgroupSize = [256, 1, 1];
            this.outputShape = outputShape;
            this.dispatchLayout = { x: [], y: [1, 2], z: [0] };
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            var addBias = bias != null;
            var hasPreluActivationWeights = preluActivationWeights != null;
            if (addBias) {
                this.variableNames.push('bias');
            }
            if (hasPreluActivationWeights) {
                this.variableNames.push('preluActivationWeights');
            }
            this.transposeA = transposeA;
            this.transposeB = transposeB;
            this.addBias = addBias;
            this.activation = activation;
            this.hasPreluActivationWeights = hasPreluActivationWeights;
            this.shaderKey =
                "matMulReduce_".concat(this.activation, "_").concat(transposeA, "_").concat(transposeB);
        }
        MatMulReduceProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(activationFnSnippet(this.activation, this.hasPreluActivationWeights), "\n      ").concat(matMulReadWriteFnSource(this.addBias, this.activation, this.transposeA, this.transposeB), "\n      ").concat(makeMatMulReduceSource(this.workgroupSize[0]), "\n    ");
            return userCode;
        };
        return MatMulReduceProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function makeMatMulSmallOutputSizeSource(workgroupSize) {
        var tileAOuter = workgroupSize[1];
        var tileBOuter = workgroupSize[0];
        var tileInner = tileAOuter > tileBOuter ? tileAOuter : tileBOuter;
        return "\n  var<workgroup> mm_Asub : array<array<f32, ".concat(tileInner, ">, ").concat(tileAOuter, ">;\n  var<workgroup> mm_Bsub : array<array<f32, ").concat(tileBOuter, ">, ").concat(tileInner, ">;\n\n  // If the output size is small for matrix multiplication, avoid to use vec4\n  // and handle some elements per thread to optimally utilize the ALU.\n  // Read data from global memory to registers firstly, then store them into\n  // shared memory, so it is instruction-Level parallelism for arithmetic\n  // operations and others handle IO operations between barrier api, makes ALU\n  // and load/store units work simultaneously, could improves the performance.\n  ").concat(getMainHeaderString(), " {\n    let tileRow = i32(localId.y);\n    let tileCol = i32(localId.x);\n    let globalRow = i32(globalId.y);\n    let globalCol = i32(globalId.x);\n    let batch = i32(globalId.z);\n    let batchA = batch % uniforms.aShape[0];\n    let batchB = batch % uniforms.bShape[0];\n\n    // uniforms.dimInner should be greater than 0.\n    let numTiles = (uniforms.dimInner - 1) / ").concat(tileInner, " + 1;\n    var acc = 0.0;\n\n    var globalColA = tileCol;\n    var globalRowB = 0;\n    var regA = mm_readA(batchA, globalRow, globalColA);\n    var regB0 = mm_readB(batchB, globalRowB + 2 * tileRow, globalCol);\n    var regB1 = mm_readB(batchB, globalRowB + 2 * tileRow + 1, globalCol);\n    globalColA = globalColA + ").concat(tileInner, ";\n    globalRowB = globalRowB + ").concat(tileInner, ";\n\n    for (var t = 0; t < numTiles; t = t + 1) {\n      mm_Asub[tileRow][tileCol] = regA;\n      mm_Bsub[2 * tileRow][tileCol] = regB0;\n      mm_Bsub[2 * tileRow + 1][tileCol] = regB1;\n\n      workgroupBarrier();\n\n      regA = mm_readA(batchA, globalRow, globalColA);\n      regB0 = mm_readB(batchB, globalRowB + 2 * tileRow, globalCol);\n      regB1 = mm_readB(batchB, globalRowB + 2 * tileRow + 1, globalCol);\n      globalColA = globalColA + ").concat(tileInner, ";\n      globalRowB = globalRowB + ").concat(tileInner, ";\n\n      for (var k = 0; k < ").concat(tileInner, "; k = k + 1) {\n        acc = acc + mm_Asub[tileRow][k] * mm_Bsub[k][tileCol];\n      }\n      workgroupBarrier();\n    }\n\n    mm_write(batch, globalRow, globalCol, acc);\n  }\n  ");
    }
    var MatMulSmallOutputSizeProgram = /** @class */ (function () {
        function MatMulSmallOutputSizeProgram(aShape, bShape, outputShape, transposeA, transposeB, bias, activation, preluActivationWeights) {
            if (transposeA === void 0) { transposeA = false; }
            if (transposeB === void 0) { transposeB = false; }
            if (bias === void 0) { bias = null; }
            if (activation === void 0) { activation = null; }
            if (preluActivationWeights === void 0) { preluActivationWeights = null; }
            this.variableNames = ['A', 'B'];
            this.uniforms = "dimAOuter : i32, dimBOuter : i32, dimInner : i32,";
            this.workgroupSize = [16, 8, 1];
            this.outputShape = outputShape;
            this.dispatchLayout = { x: [2], y: [1], z: [0] };
            this.dispatch = [
                Math.ceil(outputShape[2] / this.workgroupSize[0]),
                Math.ceil(outputShape[1] / this.workgroupSize[1]), outputShape[0]
            ];
            var addBias = bias != null;
            if (addBias) {
                this.variableNames.push('bias');
            }
            var hasPreluActivationWeights = preluActivationWeights != null;
            if (hasPreluActivationWeights) {
                this.variableNames.push('preluActivationWeights');
            }
            this.transposeA = transposeA;
            this.transposeB = transposeB;
            this.addBias = addBias;
            this.activation = activation;
            this.hasPreluActivationWeights = hasPreluActivationWeights;
            this.shaderKey =
                "matMulSmallOutputSize_".concat(this.activation, "_").concat(transposeA, "_").concat(transposeB);
        }
        MatMulSmallOutputSizeProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(activationFnSnippet(this.activation, this.hasPreluActivationWeights), "\n      ").concat(matMulReadWriteFnSource(this.addBias, this.activation, this.transposeA, this.transposeB), "\n      ").concat(makeMatMulSmallOutputSizeSource(this.workgroupSize), "\n    ");
            return userCode;
        };
        return MatMulSmallOutputSizeProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var MatMulSplitKProgram = /** @class */ (function () {
        function MatMulSplitKProgram(outputShape, dimInner, transposeA, transposeB) {
            if (transposeA === void 0) { transposeA = false; }
            if (transposeB === void 0) { transposeB = false; }
            this.variableNames = ['A', 'B'];
            this.uniforms = "dimAOuter : i32, dimBOuter : i32, dimInner : i32,";
            this.workgroupSize = [8, 8, 1];
            this.atomic = true;
            this.splitedDimInner = 128;
            tf.util.assert(outputShape[0] === 1, function () { return 'MatMulSplitKProgram only supports batch = 1.'; });
            this.outputShape = outputShape;
            this.dispatchLayout = { x: [2], y: [1], z: [0, 3] };
            var isVec4 = (transposeA && this.outputShape[1] % 4 === 0 ||
                !transposeA && dimInner % 4 === 0) &&
                this.outputShape[2] % 4 === 0;
            this.elementsPerThread = [4, 4, this.splitedDimInner];
            this.outputComponent = isVec4 ? 4 : 1;
            if (!isVec4) {
                if (this.outputShape[1] < 16) {
                    this.elementsPerThread[1] = 1;
                }
                if (this.outputShape[2] < 16) {
                    this.elementsPerThread[0] = 1;
                }
            }
            this.dispatch = computeDispatch(this.dispatchLayout, [
                this.outputShape[0], this.outputShape[1], this.outputShape[2],
                dimInner
            ], this.workgroupSize, this.elementsPerThread);
            this.transposeA = transposeA;
            this.transposeB = transposeB;
            this.shaderKey = "matMulSplitK_".concat(transposeA, "_").concat(transposeB, "_").concat(this.elementsPerThread, "_").concat(this.outputComponent);
        }
        MatMulSplitKProgram.prototype.getUserCode = function () {
            var component = this.outputComponent;
            var userCode = "\n      ".concat(matMulReadFnSource(false, this.transposeB, false, false, false, component), "\n      fn mm_write(batch: i32, row : i32, col : i32, value : ").concat(typeSnippet(component), ") {\n        if (row < uniforms.dimAOuter && col < uniforms.dimBOuter) {\n          let coords = vec3<i32>(batch, row, col);\n          let flatIndex = getOutputIndexFromCoords(coords);\n          // The problem is that we should initialize output to zero before using.\n          // Otherwise, the original value will be added to the result.\n          for (var i = 0; i < ").concat(component, "; i = i + 1) {\n            ").concat(atomicAddSnippet('&result[flatIndex + i]', "".concat(component > 1 ? 'value[i]' : 'value'), 'float32'), "\n          }\n        }\n      }\n      ").concat(component === 4 ? makeMatMulPackedVec4Source(this.elementsPerThread, this.workgroupSize, this.transposeA, 32, true, this.splitedDimInner) :
                makeMatMulPackedSource(this.elementsPerThread, this.workgroupSize, this.transposeA, 32, true, this.splitedDimInner), "\n    ");
            return userCode;
        };
        return MatMulSplitKProgram;
    }());
    var BiasActivationProgram = /** @class */ (function () {
        function BiasActivationProgram(outputShape, bias, activation, preluActivationWeights) {
            if (bias === void 0) { bias = null; }
            if (activation === void 0) { activation = null; }
            if (preluActivationWeights === void 0) { preluActivationWeights = null; }
            this.uniforms = '';
            this.variableNames = ['x'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.addBias = bias != null;
            this.hasPreluActivationWeights = preluActivationWeights != null;
            this.activation = activation;
            if (this.addBias) {
                this.variableNames.push('bias');
            }
            if (this.hasPreluActivationWeights) {
                this.variableNames.push('preluActivationWeights');
            }
            this.shaderKey = "biasActivation_".concat(activation);
        }
        BiasActivationProgram.prototype.getUserCode = function () {
            return "\n    ".concat(activationFnSnippet(this.activation, this.hasPreluActivationWeights), "\n    ").concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        var value = getXByOutputIndex(index);\n        ").concat(biasActivationSnippet(this.addBias, this.activation), "\n        setOutputAtIndex(index, value);\n      }\n    }\n    ");
        };
        return BiasActivationProgram;
    }());

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var FillProgram = /** @class */ (function () {
        function FillProgram(shape) {
            this.variableNames = [];
            this.outputShape = [];
            this.uniforms = 'value : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = shape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'fill';
        }
        FillProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        setOutputAtIndex(index, uniforms.value);\n      }\n    }\n  ");
            return userCode;
        };
        return FillProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function fill(args) {
        var backend = args.backend, attrs = args.attrs;
        var shape = attrs.shape, value = attrs.value;
        var dtype = attrs.dtype;
        dtype = dtype || tf.util.inferDtype(value);
        if (dtype === 'string') {
            // String type should be handled in CPU memory.
            var values = tf.util.getArrayFromDType(dtype, tf.util.sizeFromShape(shape));
            values.fill(value);
            return backend.makeTensorInfo(shape, dtype, values);
        }
        else {
            var program = new FillProgram(shape);
            var uniformData = [{ type: 'float32', data: [value] }];
            return backend.runWebGPUProgram(program, [], dtype, uniformData);
        }
    }
    var fillConfig = {
        kernelName: tf.Fill,
        backendName: 'webgpu',
        kernelFunc: fill
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function reshape(args) {
        var inputs = args.inputs, attrs = args.attrs;
        var x = inputs.x;
        var shape = attrs.shape;
        var xSize = tf.util.sizeFromShape(x.shape);
        var $shape = tf.util.inferFromImplicitShape(shape, xSize);
        var $xSize = tf.util.sizeFromShape($shape);
        tf.util.assert(xSize === $xSize, function () { return "The new shape (".concat($shape, ") has ").concat($xSize, " elements and the old ") +
            "shape (".concat(x.shape, ") has ").concat(xSize, " elements. The new shape and old ") +
            "shape must have the same number of elements."; });
        // Backend needs to track refCount for the dataId for reshape op
        args.backend.incRef(x.dataId);
        return { dataId: x.dataId, shape: $shape, dtype: x.dtype };
    }
    var reshapeConfig = {
        kernelName: tf.Reshape,
        backendName: 'webgpu',
        kernelFunc: reshape
    };

    function batchMatMulImpl(_a) {
        var e_1, _b, e_2, _c;
        var a = _a.a, b = _a.b, transposeA = _a.transposeA, transposeB = _a.transposeB, backend = _a.backend, _d = _a.bias, bias = _d === void 0 ? null : _d, _e = _a.preluActivationWeights, preluActivationWeights = _e === void 0 ? null : _e, _f = _a.leakyreluAlpha, leakyreluAlpha = _f === void 0 ? 0 : _f, _g = _a.activation, activation = _g === void 0 ? null : _g;
        var aRank = a.shape.length;
        var bRank = b.shape.length;
        var innerShapeA = transposeA ? a.shape[aRank - 2] : a.shape[aRank - 1];
        var innerShapeB = transposeB ? b.shape[bRank - 1] : b.shape[bRank - 2];
        var outerShapeA = transposeA ? a.shape[aRank - 1] : a.shape[aRank - 2];
        var outerShapeB = transposeB ? b.shape[bRank - 2] : b.shape[bRank - 1];
        var outerDimsA = a.shape.slice(0, -2);
        var outerDimsB = b.shape.slice(0, -2);
        var batchDimA = tf.util.sizeFromShape(outerDimsA);
        var batchDimB = tf.util.sizeFromShape(outerDimsB);
        var outShapeOuterDims = tf.broadcast_util.assertAndGetBroadcastShape(a.shape.slice(0, -2), b.shape.slice(0, -2));
        var outShape = outShapeOuterDims.concat([outerShapeA, outerShapeB]);
        tf.util.assert(innerShapeA === innerShapeB, function () { return "Error in matMul: inner shapes (".concat(innerShapeA, ") and (") +
            "".concat(innerShapeB, ") of Tensors with shapes ").concat(a.shape, " and ") +
            "".concat(b.shape, " and transposeA=").concat(transposeA) +
            " and transposeB=".concat(transposeB, " must match."); });
        var a3dShape = transposeA ?
            [batchDimA, innerShapeA, outerShapeA] :
            [batchDimA, outerShapeA, innerShapeA];
        var b3dShape = transposeB ?
            [batchDimB, outerShapeB, innerShapeB] :
            [batchDimB, innerShapeB, outerShapeB];
        // The rest of the implementation is designed to operate on rank-3 tensors
        var a3d = reshape({ inputs: { x: a }, backend: backend, attrs: { shape: a3dShape } });
        var b3d = reshape({ inputs: { x: b }, backend: backend, attrs: { shape: b3dShape } });
        var intermediates = [a3d, b3d];
        var batchDim = Math.max(batchDimA, batchDimB);
        var inputs = [a3d, b3d];
        var dimensions = [
            { type: 'int32', data: [outerShapeA] }, { type: 'int32', data: [outerShapeB] },
            { type: 'int32', data: [innerShapeA] }
        ];
        var program;
        var out;
        var outputShape = [batchDim, outerShapeA, outerShapeB];
        var matmulProgramType = tf.env().get('WEBGPU_MATMUL_PROGRAM_TYPE');
        if (matmulProgramType < 0) {
            // Usually increasing workgroups is a good way to gain more performance for
            // few workgroups by tiling 32x32 (default matmul algorithm). Currently,
            // there are three ways to increase workgroups. 1) MatMulReduceProgram,
            // which is used only when the output size is very small (128 for now). 2)
            // MatMulSplitKProgram, increasing workgroups by spliting K. 3)
            // MatMulSmallOutputSizeProgram, increasing workgroups by small tile size.
            // For different devices, the minimum optimal workgroups may be different.
            // So here we set a |thresholdToIncreaseWorkgroups| to indicate whether we
            // need to increase workgroups. And the literal number is an empirical
            // value.
            var thresholdFlagValue = tf.env().getNumber('WEBGPU_THRESHOLD_TO_INCREASE_WORKGROUPS_FOR_MATMUL');
            var thresholdToIncreaseWorkgroups = thresholdFlagValue > 0 ?
                thresholdFlagValue :
                backend.thresholdToIncreaseWorkgroups;
            var workgroupsBy32x32 = batchDim * Math.ceil(outerShapeA / 32) * Math.ceil(outerShapeB / 32);
            var hasFewWorkgroups = workgroupsBy32x32 <= thresholdToIncreaseWorkgroups ||
                (outerShapeA <= 8 &&
                    workgroupsBy32x32 <= thresholdToIncreaseWorkgroups * 2);
            if (hasFewWorkgroups) {
                if (batchDim * outerShapeA * outerShapeB <= 128) {
                    matmulProgramType = MatMulProgramType.MatMulReduceProgram;
                }
                else if (batchDim === 1 && innerShapeB >= 2000) {
                    matmulProgramType = MatMulProgramType.MatMulSplitKProgram;
                }
                else {
                    matmulProgramType = MatMulProgramType.MatMulSmallOutputSizeProgram;
                }
            }
            else {
                matmulProgramType = MatMulProgramType.MatMulPackedProgram;
            }
        }
        switch (matmulProgramType) {
            case MatMulProgramType.MatMulReduceProgram:
                program = new MatMulReduceProgram(outputShape, transposeA, transposeB, bias, activation, preluActivationWeights);
                break;
            case MatMulProgramType.MatMulSplitKProgram: {
                // The output buffer must be initailzed to zero before using since we
                // use atomicAdd in MatMulSplitKProgram.
                out = fill({ backend: backend, attrs: { shape: outputShape, value: 0, dtype: a.dtype } });
                program = new MatMulSplitKProgram(outputShape, innerShapeB, transposeA, transposeB);
                if (bias || activation) {
                    out =
                        backend.runWebGPUProgram(program, inputs, a.dtype, dimensions, out);
                    var biasActivationProgram = new BiasActivationProgram(out.shape, bias, activation, preluActivationWeights);
                    var uniformData = null;
                    var activationInputs = [out];
                    if (bias) {
                        activationInputs.push(bias);
                    }
                    if (preluActivationWeights) {
                        activationInputs.push(preluActivationWeights);
                    }
                    if (activation === 'leakyrelu') {
                        uniformData = [{ type: 'float32', data: [leakyreluAlpha] }];
                        biasActivationProgram.uniforms += ' alpha : f32,';
                    }
                    var outActivated = backend.runWebGPUProgram(biasActivationProgram, activationInputs, out.dtype, uniformData);
                    intermediates.push(out);
                    var outReshaped_1 = reshape({ inputs: { x: outActivated }, backend: backend, attrs: { shape: outShape } });
                    intermediates.push(outActivated);
                    try {
                        for (var intermediates_1 = __values(intermediates), intermediates_1_1 = intermediates_1.next(); !intermediates_1_1.done; intermediates_1_1 = intermediates_1.next()) {
                            var i = intermediates_1_1.value;
                            backend.disposeData(i.dataId);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (intermediates_1_1 && !intermediates_1_1.done && (_b = intermediates_1.return)) _b.call(intermediates_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return outReshaped_1;
                }
                break;
            }
            case MatMulProgramType.MatMulSmallOutputSizeProgram:
                program = new MatMulSmallOutputSizeProgram(a3dShape, b3dShape, outputShape, transposeA, transposeB, bias, activation, preluActivationWeights);
                break;
            case MatMulProgramType.MatMulPackedProgram:
                // Experiments show that sequential access is more friendly for Intel
                // GPUs.
                var sequentialAccessByThreads = backend.adapterInfo.isIntel();
                program = new MatMulPackedProgram(a3dShape, outputShape, transposeA, transposeB, bias, activation, preluActivationWeights, sequentialAccessByThreads);
                break;
            default:
                throw new Error("Unsupported MatMulProgramType ".concat(matmulProgramType, "."));
        }
        if (bias) {
            inputs.push(bias);
        }
        if (preluActivationWeights) {
            inputs.push(preluActivationWeights);
        }
        if (activation === 'leakyrelu') {
            dimensions.push({ type: 'float32', data: [leakyreluAlpha] });
            program.uniforms += ' alpha : f32,';
        }
        out = backend.runWebGPUProgram(program, inputs, a.dtype, dimensions, out);
        var outReshaped = reshape({ inputs: { x: out }, backend: backend, attrs: { shape: outShape } });
        intermediates.push(out);
        try {
            for (var intermediates_2 = __values(intermediates), intermediates_2_1 = intermediates_2.next(); !intermediates_2_1.done; intermediates_2_1 = intermediates_2.next()) {
                var i = intermediates_2_1.value;
                backend.disposeData(i.dataId);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (intermediates_2_1 && !intermediates_2_1.done && (_c = intermediates_2.return)) _c.call(intermediates_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return outReshaped;
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function _fusedMatMul(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var a = inputs.a, b = inputs.b, bias = inputs.bias, preluActivationWeights = inputs.preluActivationWeights;
        var transposeA = attrs.transposeA, transposeB = attrs.transposeB, activation = attrs.activation, leakyreluAlpha = attrs.leakyreluAlpha;
        return batchMatMulImpl({
            a: a,
            b: b,
            transposeA: transposeA,
            transposeB: transposeB,
            backend: backend,
            bias: bias,
            preluActivationWeights: preluActivationWeights,
            leakyreluAlpha: leakyreluAlpha,
            activation: activation
        });
    }
    var _fusedMatMulConfig = {
        kernelName: tf._FusedMatMul,
        backendName: 'webgpu',
        kernelFunc: _fusedMatMul,
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var BinaryOpComplexProgram = /** @class */ (function () {
        function BinaryOpComplexProgram(op, aShape, bShape) {
            this.variableNames = ['AReal', 'AImag', 'BReal', 'BImag'];
            this.workgroupSize = [128, 1, 1];
            this.size = true;
            this.outputShape = tf.backend_util.assertAndGetBroadcastShape(aShape, bShape);
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "binaryOpComplex_".concat(op);
            this.op = op;
        }
        BinaryOpComplexProgram.prototype.getUserCode = function () {
            var opStr = getBinaryOpString(this.op, false);
            var userCode = "\n      fn binaryOpComplex(\n          areal : f32, aimag : f32, breal : f32, bimag : f32) -> f32 {\n        ".concat(opStr, "\n      }\n\n      ").concat(getMainHeaderString('index'), " {\n        if(index < uniforms.size) {\n          let areal = getARealByOutputIndex(index);\n          let aimag = getAImagByOutputIndex(index);\n          let breal = getBRealByOutputIndex(index);\n          let bimag = getBImagByOutputIndex(index);\n          setOutputAtIndex(index, binaryOpComplex(areal, aimag, breal, bimag));\n        }\n      }\n    ");
            return userCode;
        };
        return BinaryOpComplexProgram;
    }());

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var BinaryOpProgram = /** @class */ (function () {
        function BinaryOpProgram(op, aShape, bShape) {
            this.size = true;
            this.variableNames = ['A', 'B'];
            this.outputShape = tf.backend_util.assertAndGetBroadcastShape(aShape, bShape);
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.op = op;
            this.useSharedMemoryWithA =
                aShape.length <= 1 && bShape.length > 1 && aShape[0] < 128;
            this.useSharedMemoryWithB =
                bShape.length <= 1 && aShape.length > 1 && bShape[0] < 128;
            if (this.useSharedMemoryWithA || this.useSharedMemoryWithB) {
                this.outputComponent = 1;
                this.variableComponents = [1, 1];
                // lastDimensionSize is used as sharedBuf array size, so can not be
                // used as uniform.
                this.lastDimensionSize =
                    this.useSharedMemoryWithB ? bShape[0] : aShape[0];
                this.shaderKey = "binary_".concat(op, "_").concat(this.lastDimensionSize);
                this.type = 'shared';
                // This is an experimental value when using shared memory.
                // Note that the maximum of workgroup X dimension is 256.
                this.workgroupSize = [256, 1, 1];
            }
            else {
                var aDivisibleBy4 = aShape.length > 0 && aShape[aShape.length - 1] % 4 === 0;
                var bDivisibleBy4 = bShape.length > 0 && bShape[bShape.length - 1] % 4 === 0;
                if (aDivisibleBy4 && bDivisibleBy4) {
                    this.outputComponent = 4;
                    this.variableComponents = [4, 4];
                }
                else if ((aDivisibleBy4 &&
                    (tf.util.isScalarShape(bShape) || bShape[bShape.length - 1] === 1)) ||
                    (bDivisibleBy4 &&
                        (tf.util.isScalarShape(aShape) || aShape[aShape.length - 1] === 1))) {
                    this.outputComponent = 4;
                    this.variableComponents = aDivisibleBy4 ? [4, 1] : [1, 4];
                }
                else {
                    this.outputComponent = 1;
                    this.variableComponents = [1, 1];
                }
                this.type = 'nonshared';
                this.shaderKey = "binary_".concat(op, "_").concat(this.variableComponents);
                // TODO(jiajia.qin@intel.com): Heuristically select a good work group
                // size.
                this.workgroupSize = [128, 1, 1];
            }
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [this.outputComponent, 1, 1]);
        }
        BinaryOpProgram.prototype.getUserCode = function () {
            var userCode;
            var dType = this.outputComponent === 4 ? 'vec4<f32>' : 'f32';
            var opFnStr = "\n    fn binaryOperation(a : ".concat(dType, ", b : ").concat(dType, ") -> ").concat(dType, " {\n      ").concat(getBinaryOpString(this.op, this.outputComponent === 4), "\n    };\n    ");
            if (this.type === 'shared') {
                var sharedIndexSnippet = this.lastDimensionSize > 1 ?
                    "coords[".concat(this.outputShape.length - 1, "]") :
                    '0';
                var accessDataSnippet = this.useSharedMemoryWithB ?
                    "let a = getAByOutputIndex(index);\n          let b = sharedBuf[".concat(sharedIndexSnippet, "];") :
                    "let a = sharedBuf[".concat(sharedIndexSnippet, "];\n          let b = getBByOutputIndex(index);");
                userCode = "\n        ".concat(opFnStr, "\n        var<workgroup> sharedBuf : array<f32, ").concat(this.lastDimensionSize, ">;\n        ").concat(getMainHeaderString('index'), " {\n          // Fill in the shared memory buffer.\n          let localIndex = i32(localId.x);\n          if(localIndex < ").concat(this.lastDimensionSize, ") {\n            sharedBuf[localIndex] = f32(").concat(this.useSharedMemoryWithB ? 'B' : 'A', "[localIndex]);\n          }\n          workgroupBarrier();\n\n          if(index < uniforms.size) {\n            let coords = getCoordsFromIndex(index);\n            ").concat(accessDataSnippet, "\n            setOutputAtIndex(index, binaryOperation(a, b));\n          }\n        }\n        ");
            }
            else {
                userCode = "\n       ".concat(opFnStr, "\n       ").concat(getMainHeaderString('index'), " {\n         if (index < uniforms.size) {\n           let coords = getCoordsFromIndex(index * ").concat(this.outputComponent, ");\n           let a = ").concat(dType, "(getAByOutputCoords(coords));\n           let b = ").concat(dType, "(getBByOutputCoords(coords));\n           setOutputAtIndex(index, binaryOperation(a, b));\n         }\n       }\n       ");
            }
            return userCode;
        };
        return BinaryOpProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function identity(args) {
        var inputs = args.inputs;
        var x = inputs.x;
        args.backend.incRef(x.dataId);
        return { dataId: x.dataId, shape: x.shape, dtype: x.dtype };
    }
    var identityConfig = {
        kernelName: tf.Identity,
        backendName: 'webgpu',
        kernelFunc: identity
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    /**
     * Complex tensors share data with their real and imaginary components. Complex
     * tensors' reference to the components is tracked by refCount on the individual
     * component. The refCounts are increased by the identity call.
     *
     * When a complex tensor is disposed, it will reduce the refCount on the
     * components by calling disposeData on each.
     */
    function complex(args) {
        var inputs = args.inputs, backend = args.backend;
        var real = inputs.real, imag = inputs.imag;
        var complexInfo = backend.makeTensorInfo(real.shape, 'complex64');
        var complex = backend.tensorMap.get(complexInfo.dataId);
        var realTensorInfo = identity({ inputs: { x: real }, backend: backend });
        var imagTensorInfo = identity({ inputs: { x: imag }, backend: backend });
        complex.complexTensorInfos = { real: realTensorInfo, imag: imagTensorInfo };
        return complexInfo;
    }
    var complexConfig = {
        kernelName: tf.Complex,
        backendName: 'webgpu',
        kernelFunc: complex
    };

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var UnaryOpProgram = /** @class */ (function () {
        function UnaryOpProgram(outputShape, op, uniforms) {
            if (uniforms === void 0) { uniforms = ''; }
            this.variableNames = ['A'];
            this.size = true;
            // TODO(jiajia.qin@intel.com): Heuristically select a good work group size.
            var workgroupSizeX = 128;
            this.workgroupSize = [workgroupSizeX, 1, 1];
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.op = op;
            if (uniforms !== '') {
                this.uniforms = uniforms;
            }
            this.shaderKey = "unary_".concat(op);
        }
        UnaryOpProgram.prototype.getUserCode = function () {
            return "\n      fn unaryOperation(a : f32) -> f32 {\n        ".concat(getUnaryOpString(this.op, false), "\n      }\n      ").concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let a = getAByOutputIndex(index);\n          setOutputAtIndex(index, unaryOperation(a));\n        }\n      }\n      ");
        };
        return UnaryOpProgram;
    }());

    /**
     * Template that creates a `KernelFunc` for unary ops.
     * @param opType Op type to create `UnaryOpProgram`.
     * @param cpuKernelImpl Optional. Shared functionality from tfjs-backend-cpu, it
     *     will be involved when necessary.
     * @param dtype Optional. If set, the result has this dtype. Otherwise, the
     *     result has the same dtype as the first input. This is mainly used in
     *     comparison kernels, such as Equal, Less, Greater, etc.
     */
    function unaryKernelFunc(_a) {
        var opType = _a.opType, cpuKernelImpl = _a.cpuKernelImpl, dtype = _a.dtype;
        return function (_a) {
            var inputs = _a.inputs, backend = _a.backend;
            var x = inputs.x;
            var webgpuBackend = backend;
            var $dtype = dtype || x.dtype;
            if (webgpuBackend.shouldExecuteOnCPU([x]) && cpuKernelImpl != null) {
                var xData = webgpuBackend.tensorMap.get(x.dataId);
                var outValues = cpuKernelImpl(xData.values, $dtype);
                return webgpuBackend.makeTensorInfo(x.shape, $dtype, outValues);
            }
            var program = new UnaryOpProgram(x.shape, opType);
            return webgpuBackend.runWebGPUProgram(program, [x], $dtype);
        };
    }
    /**
     * Template that creates a `KernelFunc` for binary ops.
     * @param opType Op type to create `BinaryOpProgram`.
     * @param cpuKernelImpl Optional. Shared functionality from tfjs-backend-cpu, it
     *     will be involved when necessary.
     * @param dtype Optional. If set, the result has this dtype. Otherwise, the
     *     result has the same dtype as the first input. This is mainly used in
     *     comparison kernels, such as Equal, Less, Greater, etc.
     */
    function binaryKernelFunc(_a) {
        var opType = _a.opType, cpuKernelImpl = _a.cpuKernelImpl, _b = _a.supportsComplex, supportsComplex = _b === void 0 ? false : _b, dtype = _a.dtype;
        return function (_a) {
            var _b;
            var inputs = _a.inputs, backend = _a.backend;
            var a = inputs.a, b = inputs.b;
            var webgpuBackend = backend;
            if (supportsComplex && a.dtype === 'complex64') {
                var aData = webgpuBackend.tensorMap.get(a.dataId);
                var bData = webgpuBackend.tensorMap.get(b.dataId);
                var real = void 0, imag = void 0;
                if (opType !== BinaryOpType.MUL) {
                    _b = __read([
                        [aData.complexTensorInfos.real, bData.complexTensorInfos.real],
                        [aData.complexTensorInfos.imag, bData.complexTensorInfos.imag]
                    ].map(function (complexParts) {
                        var _a = __read(complexParts, 2), aPart = _a[0], bPart = _a[1];
                        var aHandle = {
                            dataId: aPart.dataId,
                            dtype: aPart.dtype,
                            shape: a.shape
                        };
                        var bHandle = {
                            dataId: bPart.dataId,
                            dtype: bPart.dtype,
                            shape: b.shape
                        };
                        var program = new BinaryOpProgram(opType, a.shape, b.shape);
                        return webgpuBackend.runWebGPUProgram(program, [aHandle, bHandle], tf.upcastType(aPart.dtype, bPart.dtype));
                    }), 2), real = _b[0], imag = _b[1];
                }
                else {
                    var realProgram = new BinaryOpComplexProgram(BinaryOpType.COMPLEX_MULTIPLY_REAL, a.shape, b.shape);
                    var imagProgram = new BinaryOpComplexProgram(BinaryOpType.COMPLEX_MULTIPLY_IMAG, a.shape, b.shape);
                    var inputs_1 = [
                        {
                            dataId: aData.complexTensorInfos.real.dataId,
                            dtype: aData.complexTensorInfos.real.dtype,
                            shape: a.shape
                        },
                        {
                            dataId: aData.complexTensorInfos.imag.dataId,
                            dtype: aData.complexTensorInfos.imag.dtype,
                            shape: a.shape
                        },
                        {
                            dataId: bData.complexTensorInfos.real.dataId,
                            dtype: bData.complexTensorInfos.real.dtype,
                            shape: b.shape
                        },
                        {
                            dataId: bData.complexTensorInfos.imag.dataId,
                            dtype: bData.complexTensorInfos.imag.dtype,
                            shape: b.shape
                        }
                    ];
                    real = webgpuBackend.runWebGPUProgram(realProgram, inputs_1, 'float32');
                    imag = webgpuBackend.runWebGPUProgram(imagProgram, inputs_1, 'float32');
                }
                var complexOutput = complex({ inputs: { real: real, imag: imag }, backend: webgpuBackend });
                webgpuBackend.disposeData(real.dataId);
                webgpuBackend.disposeData(imag.dataId);
                // TODO: Implement CPU forwarding for complex inputs.
                return complexOutput;
            }
            var $dtype = dtype || tf.upcastType(a.dtype, b.dtype);
            if ((a.dtype === 'string' || b.dtype === 'string' ||
                webgpuBackend.shouldExecuteOnCPU([a, b])) &&
                cpuKernelImpl != null) {
                var aData = webgpuBackend.tensorMap.get(a.dataId).values;
                var bData = webgpuBackend.tensorMap.get(b.dataId).values;
                var decodedAVals = a.dtype === 'string' ?
                    // tslint:disable-next-line: no-any
                    tf.backend_util.fromUint8ToStringArray(aData) :
                    aData;
                var decodedBVals = a.dtype === 'string' ?
                    // tslint:disable-next-line: no-any
                    tf.backend_util.fromUint8ToStringArray(bData) :
                    bData;
                var _c = __read(cpuKernelImpl(a.shape, b.shape, decodedAVals, decodedBVals, $dtype), 2), outValues = _c[0], outShape = _c[1];
                return webgpuBackend.makeTensorInfo(outShape, $dtype, outValues);
            }
            var program = new BinaryOpProgram(opType, a.shape, b.shape);
            return webgpuBackend.runWebGPUProgram(program, [a, b], $dtype);
        };
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the License);
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an AS IS BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function simpleAbsImpl(vals) {
        var resultValues = new Float32Array(vals.length);
        for (var i = 0; i < vals.length; ++i) {
            resultValues[i] = Math.abs(vals[i]);
        }
        return resultValues;
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    /**
     * Template that creates implementation for binary ops. Supports broadcast.
     */
    function createSimpleBinaryKernelImpl(op) {
        return function (aShape, bShape, aVals, bVals, dtype) {
            var newShape = tf.backend_util.assertAndGetBroadcastShape(aShape, bShape);
            var resultRank = newShape.length;
            var resultStrides = tf.util.computeStrides(newShape);
            var resultSize = tf.util.sizeFromShape(newShape);
            var result = tf.util.getTypedArrayFromDType(dtype, resultSize);
            var aRank = aShape.length;
            var bRank = bShape.length;
            var aStrides = tf.util.computeStrides(aShape);
            var bStrides = tf.util.computeStrides(bShape);
            var aBroadcastDims = tf.backend_util.getBroadcastDims(aShape, newShape);
            var bBroadcastDims = tf.backend_util.getBroadcastDims(bShape, newShape);
            if (aBroadcastDims.length + bBroadcastDims.length === 0) {
                for (var i = 0; i < result.length; ++i) {
                    result[i] = op(aVals[i % aVals.length], bVals[i % bVals.length]);
                }
            }
            else {
                var _loop_1 = function (i) {
                    var loc = tf.util.indexToLoc(i, resultRank, resultStrides);
                    var aLoc = loc.slice(-aRank);
                    aBroadcastDims.forEach(function (d) { return aLoc[d] = 0; });
                    var aIndex = tf.util.locToIndex(aLoc, aRank, aStrides);
                    var bLoc = loc.slice(-bRank);
                    bBroadcastDims.forEach(function (d) { return bLoc[d] = 0; });
                    var bIndex = tf.util.locToIndex(bLoc, bRank, bStrides);
                    result[i] = op(aVals[aIndex], bVals[bIndex]);
                };
                for (var i = 0; i < result.length; ++i) {
                    _loop_1(i);
                }
            }
            return [result, newShape];
        };
    }

    function castImpl(values, shape, inputType, dtype) {
        if (dtype === 'int32') {
            var resultValues = Int32Array.from(values);
            return [shape, 'int32', resultValues];
        }
        if (dtype === 'bool') {
            // This is essentially the result of notEqual(x, 0). We avoid using
            // kernel notEqual to avoid circular dependency, i.e. binary_utils ->
            // cast -> notEqual -> binary_utils.
            var zero = tf.util.toTypedArray([0], inputType);
            var _a = __read(createSimpleBinaryKernelImpl(function (a, b) { return (a !== b) ? 1 : 0; })(shape, [], values, zero, 'bool'), 2), resultData = _a[0], resultShape = _a[1];
            return [resultShape, 'bool', resultData];
        }
        throw new Error("Error in Cast: failed to cast ".concat(inputType, " to ").concat(dtype));
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var addImpl = createSimpleBinaryKernelImpl((function (a, b) { return a + b; }));

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    /**
     * Template that creates implementation for unary op.
     */
    function createSimpleUnaryImpl(op) {
        return function (values, dtype, attrs) {
            var newValues = tf.util.getArrayFromDType(dtype, values.length);
            for (var i = 0; i < values.length; ++i) {
                newValues[i] = op(values[i], attrs);
            }
            return newValues;
        };
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the License);
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an AS IS BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ceilImpl = createSimpleUnaryImpl(function (xi) { return Math.ceil(xi); });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function concatImpl$1(inputs, outShape, dtype, simplyConcat) {
        var outVals = tf.util.getArrayFromDType(dtype, tf.util.sizeFromShape(outShape));
        if (simplyConcat && dtype !== 'string') {
            // Use built-in TypedArray.set() method for speed.
            var offset_1 = 0;
            inputs.forEach(function (input) {
                var size = tf.util.sizeFromShape(input.shape);
                outVals.set(input.vals, offset_1);
                offset_1 += size;
            });
        }
        else {
            var colOffset_1 = 0;
            inputs.forEach(function (input) {
                var decodedData = dtype === 'string' ?
                    tf.backend_util.fromUint8ToStringArray(input.vals) :
                    input.vals;
                var tIdx = 0;
                for (var row = 0; row < input.shape[0]; ++row) {
                    var resIdx = row * outShape[1] + colOffset_1;
                    for (var col = 0; col < input.shape[1]; ++col) {
                        outVals[resIdx + col] = decodedData[tIdx++];
                    }
                }
                colOffset_1 += input.shape[1];
            });
        }
        return outVals;
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var equalImpl = createSimpleBinaryKernelImpl(function (a, b) { return (a === b) ? 1 : 0; });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the License);
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an AS IS BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var expImpl = createSimpleUnaryImpl(function (xi) { return Math.exp(xi); });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the License);
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an AS IS BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var expm1Impl = createSimpleUnaryImpl(function (xi) { return Math.expm1(xi); });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the License);
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an AS IS BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var floorImpl = createSimpleUnaryImpl(function (xi) { return Math.floor(xi); });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var floorDivImpl = createSimpleBinaryKernelImpl(function (a, b) { return Math.floor(a / b); });

    function gatherNdImpl(indicesData, paramsBuf, dtype, numSlices, sliceRank, sliceSize, strides, paramsShape, paramsSize) {
        var outBuf = tf.buffer([numSlices, sliceSize], dtype);
        for (var i = 0; i < numSlices; i++) {
            var index = [];
            var flattenIndex = 0;
            for (var j = 0; j < sliceRank; j++) {
                var dim = indicesData[i * sliceRank + j];
                flattenIndex += dim * strides[j];
                index.push(dim);
            }
            if (flattenIndex < 0 || flattenIndex >= paramsSize / sliceSize) {
                throw new Error("Invalid indices: ".concat(index, " does not index into ").concat(paramsShape));
            }
            for (var k = 0; k < sliceSize; k++) {
                outBuf.values[i * sliceSize + k] = paramsBuf.get.apply(paramsBuf, __spreadArray([], __read(paramsBuf.indexToLoc(flattenIndex * sliceSize + k)), false));
            }
        }
        return outBuf;
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function gatherV2Impl(xBuf, indicesBuf, flattenOutputShape) {
        var outBuf = tf.buffer(flattenOutputShape, xBuf.dtype);
        for (var i = 0; i < outBuf.size; ++i) {
            var newLoc = outBuf.indexToLoc(i);
            var originalLoc = newLoc.slice();
            var batchIdx = originalLoc[0];
            var indicesIdx = originalLoc[2];
            var indicesIndex = indicesBuf.locToIndex([batchIdx, indicesIdx]);
            originalLoc[2] = indicesBuf.values[indicesIndex];
            var originalIndex = xBuf.locToIndex(originalLoc);
            if (0 <= originalIndex && originalIndex < xBuf.values.length) {
                outBuf.values[i] = xBuf.values[originalIndex];
            } // Else, index is out of bounds, so leave the default zero val in outBuf.
        }
        return outBuf;
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var greaterImpl = createSimpleBinaryKernelImpl(function (a, b) { return (a > b) ? 1 : 0; });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var greaterEqualImpl = createSimpleBinaryKernelImpl(function (a, b) { return (a >= b) ? 1 : 0; });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var lessImpl = createSimpleBinaryKernelImpl(function (a, b) { return (a < b) ? 1 : 0; });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var lessEqualImpl = createSimpleBinaryKernelImpl(function (a, b) { return (a <= b) ? 1 : 0; });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the License);
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an AS IS BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var logImpl = createSimpleUnaryImpl(function (xi) { return Math.log(xi); });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function maxImpl(aVals, reduceSize, outShape, dtype) {
        var vals = tf.util.getTypedArrayFromDType(dtype, tf.util.sizeFromShape(outShape));
        for (var i = 0; i < vals.length; ++i) {
            var offset = i * reduceSize;
            var max = aVals[offset];
            for (var j = 0; j < reduceSize; ++j) {
                var value = aVals[offset + j];
                if (Number.isNaN(value) ||
                    value > max) { // comparison with NaN always return false
                    max = value;
                }
            }
            vals[i] = max;
        }
        return vals;
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var maximumImpl = createSimpleBinaryKernelImpl((function (aValue, bValue) { return Math.max(aValue, bValue); }));

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var minimumImpl = createSimpleBinaryKernelImpl((function (aValue, bValue) { return Math.min(aValue, bValue); }));

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var multiplyImpl = createSimpleBinaryKernelImpl((function (aValue, bValue) { return aValue * bValue; }));

    function negImpl(xVals, xShape, xDtype) {
        var minusOne = tf.util.createScalarValue(-1, xDtype);
        return multiplyImpl([], xShape, minusOne, xVals, xDtype);
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var notEqualImpl = createSimpleBinaryKernelImpl((function (a, b) { return (a !== b) ? 1 : 0; }));

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function transposeImpl(xVals, xShape, dtype, perm, newShape) {
        var xRank = xShape.length;
        var xSize = tf.util.sizeFromShape(xShape);
        var xStrides = tf.util.computeStrides(xShape);
        var newStrides = tf.util.computeStrides(newShape);
        var result = tf.util.getTypedArrayFromDType(dtype, tf.util.sizeFromShape(newShape));
        for (var i = 0; i < xSize; ++i) {
            var loc = tf.util.indexToLoc(i, xRank, xStrides);
            // Permute location.
            var newLoc = new Array(loc.length);
            for (var i_1 = 0; i_1 < newLoc.length; i_1++) {
                newLoc[i_1] = loc[perm[i_1]];
            }
            var newIndex = tf.util.locToIndex(newLoc, xRank, newStrides);
            result[newIndex] = xVals[i];
        }
        return result;
    }

    function prodImpl(xShape, xDtype, xVals, reductionAxes) {
        var _a = __read(tf.backend_util.computeOutAndReduceShapes(xShape, reductionAxes), 2), outShape = _a[0], reduceShape = _a[1];
        var outDtype = tf.upcastType(xDtype, 'int32');
        var outVals = tf.util.makeZerosTypedArray(tf.util.sizeFromShape(outShape), outDtype);
        var reduceSize = tf.util.sizeFromShape(reduceShape);
        for (var i = 0; i < outVals.length; ++i) {
            var offset = i * reduceSize;
            var prod_1 = 1;
            for (var j = 0; j < reduceSize; ++j) {
                prod_1 *= xVals[offset + j];
            }
            outVals[i] = prod_1;
        }
        return { outVals: outVals, outShape: outShape, outDtype: outDtype };
    }

    tf.backend_util.RowPartitionType;

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function rangeImpl(start, stop, step, dtype) {
        var sameStartStop = start === stop;
        var increasingRangeNegativeStep = start < stop && step < 0;
        var decreasingRangePositiveStep = stop < start && step > 1;
        if (sameStartStop || increasingRangeNegativeStep ||
            decreasingRangePositiveStep) {
            return tf.util.makeZerosTypedArray(0, dtype);
        }
        var numElements = Math.abs(Math.ceil((stop - start) / step));
        var values = tf.util.makeZerosTypedArray(numElements, dtype);
        if (stop < start && step === 1) {
            // Auto adjust the step's sign if it hasn't been set
            // (or was set to 1)
            step = -1;
        }
        values[0] = start;
        for (var i = 1; i < values.length; i++) {
            values[i] = values[i - 1] + step;
        }
        return values;
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the License);
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an AS IS BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var rsqrtImpl = createSimpleUnaryImpl(function (xi) { return 1 / Math.sqrt(xi); });

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function scatterImpl(indices, updates, shape, outputSize, sliceSize, numUpdates, sliceRank, strides, defaultValue, sumDupeIndices) {
        var flattenShape = [outputSize / sliceSize, sliceSize];
        var indicesData = indices.values;
        var updatesData = updates.values;
        if (outputSize === 0) {
            return tf.buffer(shape, updates.dtype);
        }
        var outBuf = (defaultValue instanceof tf.TensorBuffer) ?
            defaultValue :
            tf.buffer(flattenShape, updates.dtype);
        if (typeof defaultValue === 'string') {
            outBuf.values.fill(defaultValue);
        }
        else if (typeof defaultValue === 'number') {
            outBuf.values.fill(defaultValue);
        }
        else if (typeof defaultValue === 'boolean') {
            outBuf.values.fill(+defaultValue);
        }
        for (var i = 0; i < numUpdates; i++) {
            var index = [];
            var flattenIndex = 0;
            for (var j = 0; j < sliceRank; j++) {
                var dim = indicesData[i * sliceRank + j];
                index.push(dim);
                flattenIndex += dim * strides[j];
            }
            if (flattenIndex < 0 || flattenIndex >= outputSize / sliceSize) {
                throw new Error("Invalid indices: ".concat(index, " does not index into ").concat(shape));
            }
            for (var k = 0; k < sliceSize; k++) {
                if (sumDupeIndices) {
                    outBuf.values[flattenIndex * sliceSize + k] +=
                        updatesData[i * sliceSize + k];
                }
                else {
                    outBuf.values[flattenIndex * sliceSize + k] = updates.rank === 0 ?
                        updatesData[0] :
                        updatesData[i * sliceSize + k];
                }
            }
        }
        return outBuf;
    }

    function sliceImpl(vals, begin, size, shape, dtype) {
        var isContinous = tf.slice_util.isSliceContinous(shape, begin, size);
        var length = tf.util.sizeFromShape(size);
        var xStrides = tf.util.computeStrides(shape);
        if (isContinous) {
            var flatOffset = tf.slice_util.computeFlatOffset(begin, xStrides);
            if (dtype === 'string') {
                return vals.slice(flatOffset, flatOffset + length);
            }
            return vals.subarray(flatOffset, flatOffset + length);
        }
        var decodedData = dtype === 'string' ?
            tf.backend_util.fromUint8ToStringArray(vals) :
            vals;
        var inBuf = tf.buffer(shape, dtype, decodedData);
        var outBuf = tf.buffer(size, dtype);
        for (var i = 0; i < outBuf.size; ++i) {
            var outLoc = outBuf.indexToLoc(i);
            var inLoc = outLoc.map(function (idx, j) { return idx + begin[j]; });
            outBuf.set.apply(outBuf, __spreadArray([inBuf.get.apply(inBuf, __spreadArray([], __read(inLoc), false))], __read(outLoc), false));
        }
        if (dtype === 'string') {
            return tf.backend_util.fromStringArrayToUint8(outBuf.values);
        }
        return outBuf.values;
    }

    function stridedSliceImpl(outShape, xBuf, strides, begin) {
        var outBuf = tf.buffer(outShape, xBuf.dtype);
        for (var i = 0; i < outBuf.size; i++) {
            var loc = outBuf.indexToLoc(i);
            var newLoc = new Array(loc.length);
            for (var j = 0; j < newLoc.length; j++) {
                newLoc[j] = loc[j] * strides[j] + begin[j];
            }
            outBuf.set.apply(outBuf, __spreadArray([xBuf.get.apply(xBuf, __spreadArray([], __read(newLoc), false))], __read(loc), false));
        }
        return outBuf;
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    /**
     * The StringNGramsOp class creates ngrams from ragged string data.
     * The constructor contains all attributes related to the operation such as
     * padding widths and strings, and the compute function can be used to
     * compute the ngrams for different ragged tensor inputs.
     */
    var StringNGramsOp = /** @class */ (function () {
        function StringNGramsOp(separator, nGramWidths, leftPad, rightPad, padWidth, preserveShortSequences) {
            this.separator = tf.util.encodeString(separator);
            this.nGramWidths = nGramWidths;
            this.leftPad = tf.util.encodeString(leftPad);
            this.rightPad = tf.util.encodeString(rightPad);
            this.padWidth = padWidth;
            this.preserveShort = preserveShortSequences;
        }
        StringNGramsOp.prototype.getPadWidth = function (nGramWidth) {
            // Ngrams can be padded with either a fixed pad width or a dynamic pad
            // width depending on the 'padWidth' arg, but in no case should the padding
            // ever be wider than 'nGramWidth' - 1.
            return Math.min(this.padWidth < 0 ? nGramWidth - 1 : this.padWidth, nGramWidth - 1);
        };
        StringNGramsOp.prototype.getNumNGrams = function (length, nGramWidth) {
            var padWidth = this.getPadWidth(nGramWidth);
            return Math.max(0, ((length + 2 * padWidth) - nGramWidth) + 1);
        };
        StringNGramsOp.prototype.createNGrams = function (data, splitIndex, output, outputStartIndex, numNGrams, nGramWidth) {
            var _loop_1 = function (nGramIndex) {
                var padWidth = this_1.getPadWidth(nGramWidth);
                var leftPadding = Math.max(0, padWidth - nGramIndex);
                var rightPadding = Math.max(0, padWidth - (numNGrams - (nGramIndex + 1)));
                var numTokens = nGramWidth - (leftPadding + rightPadding);
                var dataStartIndex = splitIndex + (leftPadding > 0 ? 0 : nGramIndex - padWidth);
                // Calculate the total expected size of the nGram so we can reserve the
                // correct amount of space in the string.
                var nGramSize = 0;
                // Size of the left padding.
                nGramSize += leftPadding * this_1.leftPad.length;
                // Size of the tokens.
                for (var n = 0; n < numTokens; ++n) {
                    nGramSize += data[dataStartIndex + n].length;
                }
                // Size of the right padding.
                nGramSize += rightPadding * this_1.rightPad.length;
                // Size of the separators.
                var numSeparators = leftPadding + rightPadding + numTokens - 1;
                nGramSize += numSeparators * this_1.separator.length;
                // Build the nGram.
                output[outputStartIndex + nGramIndex] = new Uint8Array(nGramSize);
                var nGram = output[outputStartIndex + nGramIndex];
                var nextNGramIndex = 0;
                var appendToNGram = function (str) { return str.forEach(function (value) { return nGram[nextNGramIndex++] = value; }); };
                for (var n = 0; n < leftPadding; ++n) {
                    appendToNGram(this_1.leftPad);
                    appendToNGram(this_1.separator);
                }
                // Only output first numTokens - 1 pairs of data and separator
                for (var n = 0; n < numTokens - 1; ++n) {
                    appendToNGram(data[dataStartIndex + n]);
                    appendToNGram(this_1.separator);
                }
                // Handle case when there are no tokens or no right padding as these
                // can result in consecutive separators.
                if (numTokens > 0) {
                    // If we have tokens, then output last and then pair each separator
                    // with the right padding that follows, to ensure nGram ends either with
                    // the token or with the right pad.
                    appendToNGram(data[dataStartIndex + numTokens - 1]);
                    for (var n = 0; n < rightPadding; ++n) {
                        appendToNGram(this_1.separator);
                        appendToNGram(this_1.rightPad);
                    }
                }
                else {
                    // If we don't have tokens, then the last item inserted into the nGram
                    // has been the separator from the left padding loop above. Hence,
                    // output right pad and separator and make sure to finish with a
                    // padding, not a separator.
                    for (var n = 0; n < rightPadding - 1; ++n) {
                        appendToNGram(this_1.rightPad);
                        appendToNGram(this_1.separator);
                    }
                    appendToNGram(this_1.rightPad);
                }
            };
            var this_1 = this;
            for (var nGramIndex = 0; nGramIndex < numNGrams; ++nGramIndex) {
                _loop_1(nGramIndex);
            }
        };
        // Data and splits together form the definition of the ragged tensor,
        // where data is 1 dimensional and contains the values of the tensor
        // and splits denotes the indices at which each row starts.
        StringNGramsOp.prototype.compute = function (data, splits) {
            var _this = this;
            // Validate that the splits are valid indices into data, only if there are
            // splits specified.
            var inputDataSize = data.length;
            var splitsSize = splits.length;
            if (splitsSize > 0) {
                var prevSplit = splits[0];
                if (prevSplit !== 0) {
                    throw new Error("First split value must be 0, got ".concat(prevSplit));
                }
                for (var i = 1; i < splitsSize; ++i) {
                    var validSplits = splits[i] >= prevSplit;
                    validSplits = validSplits && (splits[i] <= inputDataSize);
                    if (!validSplits) {
                        throw new Error("Invalid split value ".concat(splits[i], ", must be in [").concat(prevSplit, ", ").concat(inputDataSize, "]"));
                    }
                    prevSplit = splits[i];
                }
                if (prevSplit !== inputDataSize) {
                    throw new Error("Last split value must be data size. Expected ".concat(inputDataSize, ", got ").concat(prevSplit));
                }
            }
            var numBatchItems = splitsSize - 1;
            var nGramsSplits = tf.util.getArrayFromDType('int32', splitsSize);
            // If there is no data or size, return an empty ragged tensor.
            if (inputDataSize === 0 || splitsSize === 0) {
                var empty = new Array(inputDataSize);
                for (var i = 0; i <= numBatchItems; ++i) {
                    nGramsSplits[i] = 0;
                }
                return [empty, nGramsSplits];
            }
            nGramsSplits[0] = 0;
            var _loop_2 = function (i) {
                var length = splits[i] - splits[i - 1];
                var numNGrams = 0;
                this_2.nGramWidths.forEach(function (nGramWidth) {
                    numNGrams += _this.getNumNGrams(length, nGramWidth);
                });
                if (this_2.preserveShort && length > 0 && numNGrams === 0) {
                    numNGrams = 1;
                }
                nGramsSplits[i] = nGramsSplits[i - 1] + numNGrams;
            };
            var this_2 = this;
            for (var i = 1; i <= numBatchItems; ++i) {
                _loop_2(i);
            }
            var nGrams = new Array(nGramsSplits[numBatchItems]);
            var _loop_3 = function (i) {
                var splitIndex = splits[i];
                var outputStartIdx = nGramsSplits[i];
                this_3.nGramWidths.forEach(function (nGramWidth) {
                    var length = splits[i + 1] - splits[i];
                    var numNGrams = _this.getNumNGrams(length, nGramWidth);
                    _this.createNGrams(data, splitIndex, nGrams, outputStartIdx, numNGrams, nGramWidth);
                    outputStartIdx += numNGrams;
                });
                // If we're preserving short sequences, check to see if no sequence was
                // generated by comparing the current output start idx to the original
                // one (nGramSplitsdata). If no ngrams were generated, then they will
                // be equal (since we increment outputStartIdx by numNGrams every
                // time we create a set of ngrams.)
                if (this_3.preserveShort && outputStartIdx === nGramsSplits[i]) {
                    var dataLength = splits[i + 1] - splits[i];
                    // One legitimate reason to not have any ngrams when this.preserveShort
                    // is true is if the sequence itself is empty. In that case, move on.
                    if (dataLength === 0) {
                        return "continue";
                    }
                    // We don't have to worry about dynamic padding sizes here: if padding
                    // was dynamic, every sequence would have had sufficient padding to
                    // generate at least one nGram.
                    var nGramWidth = dataLength + 2 * this_3.padWidth;
                    var numNGrams = 1;
                    this_3.createNGrams(data, splitIndex, nGrams, outputStartIdx, numNGrams, nGramWidth);
                }
            };
            var this_3 = this;
            for (var i = 0; i < numBatchItems; ++i) {
                _loop_3(i);
            }
            return [nGrams, nGramsSplits];
        };
        return StringNGramsOp;
    }());
    function stringNGramsImpl(data, dataSplits, separator, nGramWidths, leftPad, rightPad, padWidth, preserveShortSequences) {
        return new StringNGramsOp(separator, nGramWidths, leftPad, rightPad, padWidth, preserveShortSequences)
            .compute(data, dataSplits);
    }

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var subImpl = createSimpleBinaryKernelImpl((function (aValue, bValue) { return aValue - bValue; }));

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    /**
     * An implementation of the tile kernel shared between webgl and cpu for string
     * tensors only.
     */
    function tileImpl(xBuf, reps) {
        var newShape = new Array(xBuf.rank);
        for (var i = 0; i < newShape.length; i++) {
            newShape[i] = xBuf.shape[i] * reps[i];
        }
        var result = tf.buffer(newShape, xBuf.dtype);
        for (var i = 0; i < result.values.length; ++i) {
            var newLoc = result.indexToLoc(i);
            var originalLoc = new Array(xBuf.rank);
            for (var j = 0; j < originalLoc.length; j++) {
                originalLoc[j] = newLoc[j] % xBuf.shape[j];
            }
            var originalIndex = xBuf.locToIndex(originalLoc);
            result.values[i] = xBuf.values[originalIndex];
        }
        return result;
    }

    var comparePair = function (a, b) {
        var valueDiff = b.value - a.value;
        return valueDiff === 0 ? a.index - b.index : valueDiff;
    };
    /**
     * Partitions array where all elements smaller than the (k+1) smallest element
     * are found to the left of it, and all larger to the right of it.
     * Based on the Floyd-Rivest Algorithm, ref:
     * https://en.wikipedia.org/wiki/Floyd%E2%80%93Rivest_algorithm
     * @param array: Array to partition
     * @param left: Left index for the interval
     * @param right: Right index for the interval
     * @param k: Desired index value, where array[k] is the (k+1)th smallest element
     *           when left = 0
     */
    function select$1(array, k, left, right) {
        if (left === void 0) { left = 0; }
        if (right === void 0) { right = array.length - 1; }
        while (right > left) {
            // Use select recursively to sample a smaller set of size s
            // the arbitrary constants 600 and 0.5 are used in the original
            // version to minimize execution time.
            if (right - left > 600) {
                var n = right - left + 1;
                var i_1 = k - left + 1;
                var z = Math.log(n);
                var s = 0.5 * Math.exp(2 * z / 3);
                var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * Math.sign(i_1 - n / 2);
                var newLeft = Math.max(left, Math.floor(k - i_1 * s / n + sd));
                var newRight = Math.min(right, Math.floor(k + (n - i_1) * s / n + sd));
                select$1(array, k, newLeft, newRight);
            }
            // partition the elements between left and right around t
            var t = array[k];
            var i = left;
            var j = right;
            tf.util.swap(array, left, k);
            if (comparePair(array[right], t) > 0) {
                tf.util.swap(array, left, right);
            }
            while (i < j) {
                tf.util.swap(array, i, j);
                i++;
                j--;
                while (comparePair(array[i], t) < 0) {
                    i = i + 1;
                }
                while (comparePair(array[j], t) > 0) {
                    j = j - 1;
                }
            }
            if (comparePair(array[left], t) === 0) {
                tf.util.swap(array, left, j);
            }
            else {
                j = j + 1;
                tf.util.swap(array, j, right);
            }
            // Adjust left and right towards the boundaries of the subset
            // containing the (k - left + 1)th smallest element.
            if (j <= k) {
                left = j + 1;
            }
            if (k <= j) {
                right = j - 1;
            }
        }
    }
    function topKImpl(x, xShape, xDtype, k, sorted) {
        // Reshape into a 2d tensor [batch, lastDim] and compute topk along lastDim.
        var lastDim = xShape[xShape.length - 1];
        var _a = __read([x.length / lastDim, lastDim], 2), batch = _a[0], size = _a[1];
        var allTopKVals = tf.util.getTypedArrayFromDType(xDtype, batch * k);
        var allTopKIndices = tf.util.getTypedArrayFromDType('int32', batch * k);
        var _loop_1 = function (b) {
            var offset = b * size;
            var vals = x.subarray(offset, offset + size);
            var valAndInd = new Array(vals.length);
            vals.forEach(function (value, index) { return valAndInd[index] = { value: value, index: index }; });
            if (k < valAndInd.length) {
                select$1(valAndInd, k);
                valAndInd = valAndInd.slice(0, k);
            }
            if (sorted) {
                valAndInd.sort(comparePair);
            }
            var outOffset = b * k;
            var topKVals = allTopKVals.subarray(outOffset, outOffset + k);
            var topKIndices = allTopKIndices.subarray(outOffset, outOffset + k);
            for (var i = 0; i < k; i++) {
                topKVals[i] = valAndInd[i].value;
                topKIndices[i] = valAndInd[i].index;
            }
        };
        for (var b = 0; b < batch; b++) {
            _loop_1(b);
        }
        // Reshape back to the original input shape, except that the last
        // dimension is k.
        var outputShape = xShape.slice();
        outputShape[outputShape.length - 1] = k;
        return [
            tf.buffer(outputShape, xDtype, allTopKVals),
            tf.buffer(outputShape, 'int32', allTopKIndices)
        ];
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var addImplCPU = addImpl, castImplCPU = castImpl, ceilImplCPU = ceilImpl, concatImplCPU = concatImpl$1, equalImplCPU = equalImpl, expImplCPU = expImpl, expm1ImplCPU = expm1Impl, floorImplCPU = floorImpl, floorDivImplCPU = floorDivImpl, gatherNdImplCPU = gatherNdImpl, gatherV2ImplCPU = gatherV2Impl, greaterEqualImplCPU = greaterEqualImpl, greaterImplCPU = greaterImpl, lessEqualImplCPU = lessEqualImpl, lessImplCPU = lessImpl, logImplCPU = logImpl, maxImplCPU = maxImpl, maximumImplCPU = maximumImpl, minimumImplCPU = minimumImpl, multiplyImplCPU = multiplyImpl, negImplCPU = negImpl, notEqualImplCPU = notEqualImpl, prodImplCPU = prodImpl, rangeImplCPU = rangeImpl, rsqrtImplCPU = rsqrtImpl, scatterImplCPU = scatterImpl, simpleAbsImplCPU = simpleAbsImpl, sliceImplCPU = sliceImpl, stridedSliceImplCPU = stridedSliceImpl, stringNGramsImplCPU = stringNGramsImpl, subImplCPU = subImpl, tileImplCPU = tileImpl, topKImplCPU = topKImpl, transposeImplCPU = transposeImpl;

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var abs = unaryKernelFunc({ opType: UnaryOpType.ABS, cpuKernelImpl: simpleAbsImplCPU });
    var absConfig = {
        kernelName: tf.Abs,
        backendName: 'webgpu',
        kernelFunc: abs
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var acos = unaryKernelFunc({ opType: UnaryOpType.ACOS });
    var acosConfig = {
        kernelName: tf.Acos,
        backendName: 'webgpu',
        kernelFunc: acos
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var acosh = unaryKernelFunc({ opType: UnaryOpType.ACOSH });
    var acoshConfig = {
        kernelName: tf.Acosh,
        backendName: 'webgpu',
        kernelFunc: acosh
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var addKernelFunc = binaryKernelFunc({ opType: BinaryOpType.ADD, cpuKernelImpl: addImplCPU, supportsComplex: true });
    var addConfig = {
        kernelName: tf.Add,
        backendName: 'webgpu',
        kernelFunc: addKernelFunc
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var AddNPackedProgram = /** @class */ (function () {
        function AddNPackedProgram(shapes) {
            this.workPerThread = 1;
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = shapes[0];
            this.variableNames = shapes.map(function (_, i) { return "T".concat(i); });
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [this.workPerThread, 1, 1]);
            this.shaderKey = 'addN';
        }
        AddNPackedProgram.prototype.getUserCode = function () {
            var snippets = [];
            // Get target elements from every input tensor.
            this.variableNames.forEach(function (variable) {
                snippets.push("let v".concat(variable, " = get").concat(variable, "ByOutputCoords(coords);"));
            });
            // Calculate the sum of all elements.
            var operation = this.variableNames
                .map(function (variable) {
                return "v".concat(variable);
            })
                .join(' + ');
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        for (var i = 0; i < ").concat(this.workPerThread, "; i = i + 1) {\n          let flatIndex = index * ").concat(this.workPerThread, " + i;\n          if (flatIndex < uniforms.size) {\n            let coords = getCoordsFromIndex(flatIndex);\n            ").concat(snippets.join('\n        '), "\n            setOutputAtIndex(flatIndex, ").concat(operation, ");\n          }\n        }\n      }\n    ");
            return userCode;
        };
        return AddNPackedProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function addN(args) {
        var inputs = args.inputs, backend = args.backend;
        var tensors = inputs;
        if (tensors.length === 1) {
            return identity({ inputs: { x: tensors[0] }, backend: backend });
        }
        var dtype = tensors.map(function (t) { return t.dtype; }).reduce(function (d1, d2) { return tf.upcastType(d1, d2); });
        var shapes = tensors.map(function (t) { return t.shape; });
        var program = new AddNPackedProgram(shapes);
        return backend.runWebGPUProgram(program, tensors, dtype);
    }
    var addNConfig = {
        kernelName: tf.AddN,
        backendName: 'webgpu',
        kernelFunc: addN
    };

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var TransposeSharedProgram = /** @class */ (function () {
        function TransposeSharedProgram(aShape, newDim) {
            this.variableNames = ['A'];
            // Note that the maximum number of workgroup invocations by webgpu is 256.
            this.workgroupSize = [16, 16, 1];
            var outputShape = new Array(aShape.length);
            for (var i = 0; i < outputShape.length; i++) {
                outputShape[i] = aShape[newDim[i]];
            }
            this.outputShape = outputShape;
            this.dispatchLayout = { x: [0], y: [1] };
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [1, 1, 1]);
            this.shaderKey = 'transposeShared';
        }
        TransposeSharedProgram.prototype.getUserCode = function () {
            var _this = this;
            tf.util.assert(this.workgroupSize[0] === this.workgroupSize[1], function () { return "Must be a square tile, current tile shape is ".concat(_this.workgroupSize[0], " x ").concat(_this.workgroupSize[1]); });
            var tileSize = this.workgroupSize[0];
            var userCode = "\n      var<workgroup> tile : array<array<f32, ".concat(this.workgroupSize[0] + 1, ">, ").concat(this.workgroupSize[0], ">;\n      ").concat(getMainHeaderString(), " {\n        var x = i32(workgroupId.x) * ").concat(tileSize, " + i32(localId.x);\n        var y = i32(workgroupId.y) * ").concat(tileSize, " + i32(localId.y);\n        let width = uniforms.outShape[0];\n        let height = uniforms.outShape[1];\n        if (x < width && y < height) {\n          tile[localId.y][localId.x] = f32(A[y * width + x]);\n        }\n        workgroupBarrier();\n\n        x = i32(workgroupId.y) * ").concat(tileSize, " + i32(localId.x);\n        y = i32(workgroupId.x) * ").concat(tileSize, " + i32(localId.y);\n        if (x < height && y < width) {\n          setOutputAtIndex((y * height + x), tile[localId.x]\n            [localId.y]);\n        }\n      }\n    ");
            return userCode;
        };
        return TransposeSharedProgram;
    }());

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var TransposeProgram = /** @class */ (function () {
        function TransposeProgram(aShape, newDim) {
            this.variableNames = ['A'];
            this.workPerThread = 1;
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            var outputShape = new Array(aShape.length);
            for (var i = 0; i < outputShape.length; i++) {
                outputShape[i] = aShape[newDim[i]];
            }
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [this.workPerThread, 1, 1]);
            this.newDim = newDim;
            this.shaderKey = "transpose_".concat(newDim);
        }
        TransposeProgram.prototype.getUserCode = function () {
            var dtype = getCoordsDataType(this.outputShape.length);
            var switched = getSwitchedCoords(this.newDim);
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        for(var i = 0; i < ").concat(this.workPerThread, "; i = i + 1) {\n          let flatIndex = index * ").concat(this.workPerThread, " + i;\n          if(flatIndex < uniforms.size) {\n            let coords = getCoordsFromIndex(flatIndex);\n            setOutputAtIndex(flatIndex, A[getIndexFromCoords").concat(this.outputShape.length, "D(\n              ").concat(dtype, "(").concat(switched, "), uniforms.aShape)]);\n          }\n        }\n      }\n    ");
            return userCode;
        };
        return TransposeProgram;
    }());
    function getSwitchedCoords(newDim) {
        var rank = newDim.length;
        if (rank > 6) {
            throw Error("Transpose for rank ".concat(rank, " is not yet supported"));
        }
        var switchedCoords = new Array(rank);
        for (var i = 0; i < newDim.length; i++) {
            switchedCoords[newDim[i]] = "coords.".concat(getCoordsXYZ(i));
        }
        return switchedCoords.join();
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function transpose(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var perm = attrs.perm;
        var webgpuBackend = backend;
        var xRank = x.shape.length;
        var newShape = new Array(xRank);
        for (var i = 0; i < newShape.length; i++) {
            newShape[i] = x.shape[perm[i]];
        }
        if (backend.shouldExecuteOnCPU([x])) {
            var xData = webgpuBackend.tensorMap.get(x.dataId);
            var values = xData.values;
            var outValues = transposeImplCPU(values, x.shape, x.dtype, perm, newShape);
            return backend.makeTensorInfo(newShape, x.dtype, outValues);
        }
        if (x.shape.length === 2 && tf.util.arraysEqual(perm, [1, 0])) {
            var program_1 = new TransposeSharedProgram(x.shape, perm);
            return webgpuBackend.runWebGPUProgram(program_1, [x], x.dtype);
        }
        var program = new TransposeProgram(x.shape, perm);
        return webgpuBackend.runWebGPUProgram(program, [x], x.dtype);
    }
    var transposeConfig = {
        kernelName: tf.Transpose,
        backendName: 'webgpu',
        kernelFunc: transpose
    };

    var ReduceProgram = /** @class */ (function () {
        function ReduceProgram(reduceInfo, reduceType, maxComputeWorkgroupSizeX) {
            this.variableNames = ['x'];
            this.uniforms = 'reduceSize : i32,';
            this.size = true;
            this.inputShape = [reduceInfo.batchSize, reduceInfo.inSize];
            var _a = __read(tf.backend_util.computeOutAndReduceShapes(this.inputShape, [1]), 1), outputShape = _a[0];
            this.outputShape = outputShape.length === 0 ? [1] : outputShape;
            // If reduceSize |reduceInfo.inSize| is very large, the I/O accessing will
            // become the bottleneck. Increasing workgroupSize can reduce the times of
            // accessing global memory. The threshold value is just to make sure the
            // reduceSize is large enough for a bigger workgroupSize.
            if (reduceInfo.inSize >= 32768 && maxComputeWorkgroupSizeX >= 512) {
                this.workgroupSize = [512, 1, 1];
            }
            else if (reduceInfo.inSize >= 4096) {
                this.workgroupSize = [256, 1, 1];
            }
            else {
                this.workgroupSize = [64, 1, 1];
            }
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            // A work group only outputs a data, so we transfer [1, 1, 1] to compute
            // dispatch size.
            this.dispatch =
                computeDispatch(this.dispatchLayout, this.outputShape, [1, 1, 1]);
            this.reduceType = reduceType;
            this.shaderKey = "reduce_".concat(reduceType);
        }
        ReduceProgram.prototype.getUserCode = function () {
            var reduceOp = "";
            var initValue = '0.0';
            var workgroupSizeX = this.workgroupSize[0];
            if (this.reduceType === 'min' || this.reduceType === 'max') {
                reduceOp = "\n         if (isnan(candidate)) {\n          bestValue = uniforms.NAN;\n         } else if (!isnan(bestValue) && candidate ".concat(this.reduceType === 'min' ? '<' : '>', " bestValue)\n           {  bestValue = candidate; }");
                initValue = 'f32(x[offset])';
            }
            else if (this.reduceType === 'sum' || this.reduceType === 'mean') {
                reduceOp = ' bestValue = bestValue + candidate; ';
            }
            else if (this.reduceType === 'prod') {
                reduceOp = ' bestValue = bestValue * candidate; ';
                initValue = '1.0';
            }
            else if (this.reduceType === 'all') {
                reduceOp = ' bestValue = f32(bestValue >= 1.0 && candidate >= 1.0); ';
                initValue = '1.0';
            }
            else if (this.reduceType === 'any') {
                reduceOp = ' bestValue = f32(bestValue >= 1.0 || candidate >= 1.0); ';
                initValue = '0.0';
            }
            var outputSnippet = this.reduceType === 'mean' ?
                // tslint:disable-next-line:max-line-length
                "setOutputAtIndex(outputIndex, bestValue / f32(uniforms.reduceSize));" :
                "setOutputAtIndex(outputIndex, bestValue);";
            var sharedMemorySnippet = "\n         var<workgroup> xBestValues : array<f32, ".concat(workgroupSizeX, ">;\n       ");
            var userCode = "\n       fn DIV_CEIL(a : u32, b : u32) -> u32 {\n        return ((a - 1u) / b + 1u);\n       }\n\n       ".concat(sharedMemorySnippet, "\n       fn getOffset(outputIndex : i32) -> i32 {\n         let outputCoords = getCoordsFromIndex(outputIndex);\n         let offset = ").concat(this.outputShape.length === 1 ?
                'outputCoords' :
                'outputCoords[0]', " * uniforms.reduceSize;\n          return offset;\n       }\n       ").concat(getMainHeaderString('index'), " {\n         let outputIndex = index / ").concat(workgroupSizeX, ";\n         let offset = getOffset(outputIndex);\n         var bestValue = ").concat(initValue, ";\n         let Length = uniforms.reduceSize;\n         let WorkPerThread = DIV_CEIL(u32(Length), ").concat(workgroupSizeX, "u);\n         for (var k = i32(localId.x); k < Length && outputIndex < uniforms.size;\n             k = k + ").concat(workgroupSizeX, ") {\n           let candidate = f32(x[offset + k]);\n           ").concat(reduceOp, "\n         }\n         xBestValues[localId.x] = bestValue;\n         workgroupBarrier();\n\n         var reduceSize = min(u32(Length), ").concat(workgroupSizeX, "u);\n         for (var currentSize = reduceSize / 2u; reduceSize > 1u;\n             currentSize = reduceSize / 2u) {\n           let interval = DIV_CEIL(reduceSize, 2u);\n           if (localId.x < currentSize) {\n            let candidate = xBestValues[localId.x + interval];\n            ").concat(reduceOp, "\n            xBestValues[localId.x] = bestValue;\n           }\n           reduceSize = interval;\n           workgroupBarrier();\n         }\n\n         if (localId.x == 0u && outputIndex < uniforms.size) {\n          ").concat(outputSnippet, "\n        }\n       }\n     ");
            return userCode;
        };
        return ReduceProgram;
    }());

    var RETURN_TYPES = {
        'mean': 'float32',
        'all': 'bool',
        'any': 'bool',
    };
    function reduce(x, axis, keepDims, reduceType, backend) {
        var xRank = x.shape.length;
        var toDispose = [];
        var origAxes = tf.util.parseAxisParam(axis, x.shape);
        var axes = origAxes;
        var permutedAxes = tf.backend_util.getAxesPermutation(axes, xRank);
        var input = x;
        if (permutedAxes != null) {
            input = transpose({ inputs: { x: x }, attrs: { perm: permutedAxes }, backend: backend });
            axes = tf.backend_util.getInnerMostAxes(axes.length, xRank);
            toDispose.push(input);
        }
        tf.backend_util.assertAxesAreInnerMostDims(reduceType, axes, xRank);
        var _a = __read(tf.backend_util.computeOutAndReduceShapes(input.shape, axes), 2), reduceOutShape = _a[0], reduceShape = _a[1];
        var resOutShape = reduceOutShape;
        if (keepDims) {
            // rather than reshape at the end, set the target shape here.
            resOutShape = tf.backend_util.expandShapeToKeepDim(reduceOutShape, origAxes);
        }
        var res;
        if ((reduceType === 'max' || reduceType === 'prod') &&
            backend.shouldExecuteOnCPU([input])) {
            var xVals = backend.tensorMap.get(input.dataId).values;
            switch (reduceType) {
                case 'max':
                    var outValues = maxImplCPU(xVals, tf.util.sizeFromShape(reduceShape), resOutShape, x.dtype);
                    res = backend.makeTensorInfo(resOutShape, x.dtype, outValues);
                    break;
                case 'prod':
                    var _b = prodImplCPU(input.shape, input.dtype, xVals, axes), outVals = _b.outVals, outShape = _b.outShape, outDtype = _b.outDtype;
                    res = backend.makeTensorInfo(outShape, outDtype, outVals);
                    break;
                default:
                    throw new Error("".concat(reduceType, " CPU implementation is not yet supported."));
            }
        }
        else {
            var inSize = tf.util.sizeFromShape(reduceShape);
            var xSize = tf.util.sizeFromShape(input.shape);
            var batchSize = xSize / inSize;
            var reduceInfo = { windowSize: inSize, inSize: inSize, batchSize: batchSize, outSize: 1 };
            var dtype = RETURN_TYPES[reduceType] || tf.sumOutType(x.dtype);
            var uniformData = [
                { type: 'int32', data: [inSize] },
            ];
            var program = new ReduceProgram(reduceInfo, reduceType, backend.device.limits.maxComputeWorkgroupSizeX);
            var reduced = backend.runWebGPUProgram(program, [input], dtype, uniformData);
            toDispose.push(reduced);
            res = reshape({ inputs: { x: reduced }, attrs: { shape: resOutShape }, backend: backend });
        }
        toDispose.forEach(function (t) { return backend.disposeData(t.dataId); });
        return res;
    }

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function all(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var keepDims = attrs.keepDims, axis = attrs.axis;
        return reduce(x, axis, keepDims, 'all', backend);
    }
    var allConfig = {
        kernelName: tf.All,
        backendName: 'webgpu',
        kernelFunc: all
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function any(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var keepDims = attrs.keepDims, axis = attrs.axis;
        return reduce(x, axis, keepDims, 'any', backend);
    }
    var anyConfig = {
        kernelName: tf.Any,
        backendName: 'webgpu',
        kernelFunc: any
    };

    var ArgMinMaxProgram = /** @class */ (function () {
        function ArgMinMaxProgram(inputShape, axis, reduceType) {
            this.workgroupSize = [64, 1, 1];
            this.variableNames = ['x'];
            this.uniforms = 'infinityValue : f32,';
            this.size = true;
            var axes = [axis];
            this.op = reduceType === 'min' ? '<' : '>';
            // |outShape| is the shape with the removed axis
            var _a = __read(tf.backend_util.computeOutAndReduceShapes(inputShape, axes), 2), outputShape = _a[0], reduceShape = _a[1];
            this.outputShape = outputShape.length === 0 ? [1] : outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            // The shared algorithm is mainly used for large reduce size. It fully
            // utilizes the threads in one workgroup to do the reduction. However,
            // when the reduce size is very small, it's better to use the plain
            // algorithm to reduce the number of workgroups to speedup. The threthold
            // can be further tuned.
            if (tf.util.sizeFromShape(reduceShape) < 32) {
                this.type = 'plain';
                this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            }
            else {
                this.type = 'shared';
                // A work group only outputs a data, so we transfer [1, 1, 1] to compute
                // dispatch size.
                this.dispatch =
                    computeDispatch(this.dispatchLayout, this.outputShape, [1, 1, 1]);
            }
            this.inputShape = inputShape;
            this.shaderKey = "argMinMax_".concat(this.op, "_").concat(this.type);
        }
        ArgMinMaxProgram.prototype.getUserCode = function () {
            var _this = this;
            var workgroupSizeX = this.workgroupSize[0];
            var getInputShapeLastDim = function () {
                if (_this.inputShape.length === 1) {
                    return 'uniforms.xShape';
                }
                else {
                    return "uniforms.xShape.".concat(getCoordsXYZ(_this.inputShape.length - 1));
                }
            };
            var splitOutputCoords = function () {
                var snippet = '';
                if (_this.outputShape.length === 1) {
                    if (_this.inputShape.length !== 1) {
                        snippet += 'outputCoords,';
                    }
                }
                else {
                    for (var i = 0; i < _this.outputShape.length; i++) {
                        snippet += "outputCoords.".concat(getCoordsXYZ(i), ",");
                    }
                }
                return snippet;
            };
            if (this.type === 'shared') {
                var sharedMemorySnippet = "\n      var<workgroup> xBestIndices : array<i32, ".concat(workgroupSizeX, ">;\n      var<workgroup> xBestValues : array<f32, ").concat(workgroupSizeX, ">;\n    ");
                var userCode = "\n      fn DIV_CEIL(a : u32, b : u32) -> u32 {\n        return ((a - 1u) / b + 1u);\n      }\n\n      ".concat(sharedMemorySnippet, "\n\n      ").concat(getMainHeaderString('index'), " {\n        let outputIndex = index / ").concat(workgroupSizeX, ";\n        let reduceLength = ").concat(getInputShapeLastDim(), ";\n\n        var bestIndex = i32(localId.x);\n        var bestValue = uniforms.infinityValue;\n        let outputCoords = getCoordsFromIndex(outputIndex);\n        for (var k = i32(localId.x); k < reduceLength && outputIndex < uniforms.size;\n            k = k + ").concat(workgroupSizeX, ") {\n          let candidate = getX(").concat(splitOutputCoords(), " k);\n          if (!isnan(candidate) && candidate ").concat(this.op, " bestValue) {\n            bestValue = candidate;\n            bestIndex = k;\n          }\n        }\n        xBestValues[localId.x] = bestValue;\n        xBestIndices[localId.x] = bestIndex;\n        workgroupBarrier();\n\n        var reduceSize = min(u32(reduceLength), ").concat(workgroupSizeX, "u);\n        for (var currentSize = reduceSize / 2u; reduceSize > 1u;\n            currentSize = reduceSize / 2u) {\n          let interval = DIV_CEIL(reduceSize, 2u);\n          if (localId.x < currentSize) {\n            let candidate = xBestValues[localId.x + interval];\n            if (candidate ").concat(this.op, " bestValue) {\n              bestValue = candidate;\n              xBestValues[localId.x] = bestValue;\n              xBestIndices[localId.x] = xBestIndices[localId.x + interval];\n            }\n          }\n          reduceSize = interval;\n          workgroupBarrier();\n        }\n\n        if (localId.x == 0u && outputIndex < uniforms.size) {\n          setOutputAtIndexI32(outputIndex, xBestIndices[localId.x]);\n        }\n      }\n    ");
                return userCode;
            }
            else {
                var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let outputCoords = getCoordsFromIndex(index);\n          var bestIndex = 0;\n          var bestValue = getX(").concat(splitOutputCoords(), " 0);\n          let reduceLength = ").concat(getInputShapeLastDim(), ";\n          for (var i = 1; i < reduceLength; i++) {\n            let candidate = getX(").concat(splitOutputCoords(), " i);\n            if (candidate ").concat(this.op, " bestValue) {\n              bestValue = candidate;\n              bestIndex = i;\n            }\n          }\n          setOutputAtIndexI32(index, bestIndex);\n        }\n      }\n      ");
                return userCode;
            }
        };
        return ArgMinMaxProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function argMax(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var axis = attrs.axis;
        var axes = tf.util.parseAxisParam(axis, x.shape);
        var permutedAxes = tf.backend_util.getAxesPermutation(axes, x.shape.length);
        var $x = x;
        var intermediateTensorInfos = [];
        if (permutedAxes != null) {
            $x = transpose({ inputs: { x: x }, backend: backend, attrs: { perm: permutedAxes } });
            intermediateTensorInfos.push($x);
            axes = tf.backend_util.getInnerMostAxes(axes.length, $x.shape.length);
        }
        tf.backend_util.assertAxesAreInnerMostDims('argMax', [axes[0]], $x.shape.length);
        var program = new ArgMinMaxProgram($x.shape, axes[0], 'max');
        var uniformData = [{ type: 'float32', data: [Number.NEGATIVE_INFINITY] }];
        var out = backend.runWebGPUProgram(program, [$x], 'int32', uniformData);
        intermediateTensorInfos.forEach(function (t) { return backend.disposeData(t.dataId); });
        return out;
    }
    var argMaxConfig = {
        kernelName: tf.ArgMax,
        backendName: 'webgpu',
        kernelFunc: argMax
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function argMin(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var axis = attrs.axis;
        var axes = tf.util.parseAxisParam(axis, x.shape);
        var permutedAxes = tf.backend_util.getAxesPermutation(axes, x.shape.length);
        var $x = x;
        var intermediateTensorInfos = [];
        if (permutedAxes != null) {
            $x = transpose({ inputs: { x: x }, backend: backend, attrs: { perm: permutedAxes } });
            intermediateTensorInfos.push($x);
            axes = tf.backend_util.getInnerMostAxes(axes.length, $x.shape.length);
        }
        tf.backend_util.assertAxesAreInnerMostDims('argMin', [axes[0]], $x.shape.length);
        var program = new ArgMinMaxProgram($x.shape, axes[0], 'min');
        var uniformData = [{ type: 'float32', data: [Number.POSITIVE_INFINITY] }];
        var out = backend.runWebGPUProgram(program, [$x], 'int32', uniformData);
        intermediateTensorInfos.forEach(function (t) { return backend.disposeData(t.dataId); });
        return out;
    }
    var argMinConfig = {
        kernelName: tf.ArgMin,
        backendName: 'webgpu',
        kernelFunc: argMin
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var asin = unaryKernelFunc({ opType: UnaryOpType.ASIN });
    var asinConfig = {
        kernelName: tf.Asin,
        backendName: 'webgpu',
        kernelFunc: asin
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var asinh = unaryKernelFunc({ opType: UnaryOpType.ASINH });
    var asinhConfig = {
        kernelName: tf.Asinh,
        backendName: 'webgpu',
        kernelFunc: asinh
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var atan = unaryKernelFunc({ opType: UnaryOpType.ATAN });
    var atanConfig = {
        kernelName: tf.Atan,
        backendName: 'webgpu',
        kernelFunc: atan
    };

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var atan2 = binaryKernelFunc({ opType: BinaryOpType.ATAN2 });
    var atan2Config = {
        kernelName: tf.Atan2,
        backendName: 'webgpu',
        kernelFunc: atan2
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var atanh = unaryKernelFunc({ opType: UnaryOpType.ATANH });
    var atanhConfig = {
        kernelName: tf.Atanh,
        backendName: 'webgpu',
        kernelFunc: atanh
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var PoolWithFilterSizeEqualsOneProgram = /** @class */ (function () {
        function PoolWithFilterSizeEqualsOneProgram(convInfo) {
            this.variableNames = ['x'];
            this.uniforms = "strides : vec2<i32>,";
            this.workgroupSize = [256, 1, 1];
            this.size = true;
            this.outputShape = convInfo.outShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'poolWithFilterSizeEqualsOne';
        }
        PoolWithFilterSizeEqualsOneProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          let batch = coords[0];\n          let d = coords[3];\n\n          let xRCCorner = coords.yz * uniforms.strides;\n          let xRCorner = xRCCorner.x;\n          let xCCorner = xRCCorner.y;\n\n          let value = getX(batch, xRCorner, xCCorner, d);\n          setOutputAtIndex(index, value);\n        }\n      }\n    ");
            return userCode;
        };
        return PoolWithFilterSizeEqualsOneProgram;
    }());

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var Pool2DProgram = /** @class */ (function () {
        function Pool2DProgram(convInfo, poolType, computePositions, flattenPositions, includeBatchIndex) {
            if (computePositions === void 0) { computePositions = false; }
            if (flattenPositions === void 0) { flattenPositions = false; }
            if (includeBatchIndex === void 0) { includeBatchIndex = false; }
            this.variableNames = ['x'];
            this.uniforms = "strides : vec2<i32>, pads : vec2<i32>, dilations : vec2<i32>, convDims : vec2<i32>, filterDims : vec2<i32>,";
            // TODO(jiajia.qin@intel.com): Dynamically choose different workgroupSize for
            // different output shapes.
            this.workgroupSize = [128, 1, 1];
            this.size = true;
            if (poolType === 'avg' && computePositions) {
                throw new Error('Cannot compute positions for average pool.');
            }
            this.outputShape = convInfo.outShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.poolType = poolType;
            this.computePositions = computePositions;
            this.flattenPositions = flattenPositions;
            this.includeBatchIndex = includeBatchIndex;
            this.shaderKey = "pool2D_".concat(poolType, "_").concat(computePositions, "_").concat(flattenPositions, "_").concat(includeBatchIndex);
        }
        Pool2DProgram.prototype.getUserCode = function () {
            var updateSnippet;
            if (this.poolType === 'avg') {
                updateSnippet = "resultValue = resultValue + value; count = count + 1.0;";
            }
            else if (this.computePositions) {
                var positionStr = this.flattenPositions ?
                    (this.includeBatchIndex ?
                        "((batch * uniforms.xShape[1] + xR) * uniforms.xShape[2] + xC) * uniforms.xShape[3] + d" :
                        "(xR * uniforms.xShape[2] + xC) * uniforms.xShape[3] + d") :
                    "wR * uniforms.filterDims.y + wC";
                updateSnippet = "let currMaxValue = mix(value, maxValue, maxValueFound);\n      if (value >= currMaxValue) {\n        maxValue = value;\n        maxValueFound = 1.0;\n        maxPosition = ".concat(positionStr, ";\n      }");
            }
            else {
                updateSnippet = "resultValue = max(value, resultValue);";
            }
            var returnValue = "resultValue";
            if (this.poolType === 'avg') {
                returnValue = "resultValue / max(count, 1.0)";
            }
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n          let batch = coords[0];\n          let d = coords[3];\n          let xRCCorner = vec2<i32>(coords.yz) * uniforms.strides - uniforms.pads;\n          let xRCorner = xRCCorner.x;\n          let xCCorner = xRCCorner.y;\n\n          ").concat(this.computePositions ?
                "var maxValue = 0.0;\n            var maxValueFound = 0.0;\n            var maxPosition = 0;" :
                "var resultValue = ".concat(this.poolType === 'avg' ? '0.0' : '-1.0 / pow(10.0, -20.0)', ";"), "\n\n          var count = 0.0;\n          for (var wR = 0; wR < uniforms.filterDims.x; wR = wR + uniforms.dilations.x) {\n            let xR = xRCorner + wR;\n\n            if (xR < 0 || xR >= uniforms.convDims.x) {\n              continue;\n            }\n\n            for (var wC = 0; wC < uniforms.filterDims.y; wC = wC + uniforms.dilations.y) {\n              let xC = xCCorner + wC;\n              if (xC < 0 || xC >= uniforms.convDims.y) {\n                continue;\n              }\n\n              let value = getX(batch, xR, xC, d);\n              ").concat(updateSnippet, "\n            }\n          }\n\n          ").concat(this.computePositions ? "setOutputAtIndexI32(index, maxPosition);" :
                "setOutputAtIndex(index, ".concat(returnValue, ");"), "\n        }\n      }\n    ");
            return userCode;
        };
        return Pool2DProgram;
    }());
    var Pool3DProgram = /** @class */ (function () {
        function Pool3DProgram(convInfo, poolType, computePositions, flattenPositions, includeBatchIndex) {
            if (computePositions === void 0) { computePositions = false; }
            if (flattenPositions === void 0) { flattenPositions = false; }
            if (includeBatchIndex === void 0) { includeBatchIndex = false; }
            this.variableNames = ['x'];
            this.uniforms = "strides : vec3<i32>, pads : vec3<i32>, convDims : vec3<i32>, filterDims : vec3<i32>,";
            this.workgroupSize = [128, 1, 1];
            this.size = true;
            if (poolType === 'avg' && computePositions) {
                throw new Error('Cannot compute positions for average pool.');
            }
            this.outputShape = convInfo.outShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.poolType = poolType;
            this.computePositions = computePositions;
            this.flattenPositions = flattenPositions;
            this.includeBatchIndex = includeBatchIndex;
            this.shaderKey = "pool3D_".concat(poolType, "_").concat(computePositions, "_").concat(flattenPositions, "_").concat(includeBatchIndex);
        }
        Pool3DProgram.prototype.getUserCode = function () {
            var updateSnippet;
            if (this.poolType === 'avg') {
                updateSnippet = "resultValue += value; count += 1.0;";
            }
            else if (this.computePositions) {
                var positionStr = this.flattenPositions ?
                    (this.includeBatchIndex ?
                        "(((batch * uniforms.xShape.y + xD) * uniforms.xShape.z + xR) * uniforms.xShape.w + xC) * uniforms.xShape.u + ch" :
                        "((xD * uniforms.xShape.z + xR) * uniforms.xShape.w + xC) * uniforms.xShape.u + ch") :
                    "wD * uniforms.filterDims.y * uniforms.filterDims.y + wR * uniforms.filterDims.z + wC";
                updateSnippet = "let currMaxValue = mix(value, maxValue, maxValueFound);\n      if (value >= currMaxValue) {\n        maxValue = value;\n        maxValueFound = 1.0;\n        maxPosition = ".concat(positionStr, ";\n      }");
            }
            else {
                updateSnippet = "resultValue = max(value, resultValue);";
            }
            var returnValue = "resultValue";
            if (this.poolType === 'avg') {
                returnValue = "resultValue / max(count, 1.0)";
            }
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          let batch = coords.x;\n          let ch = coords.u;\n\n          let xCorner = vec3<i32>(coords.y, coords.z, coords.w) * uniforms.strides - uniforms.pads;\n          let xDCorner = xCorner.x;\n          let xRCorner = xCorner.y;\n          let xCCorner = xCorner.z;\n\n          ").concat(this.computePositions ?
                "var maxValue = 0.0;\n            var maxValueFound = 0.0;\n            var maxPosition = 0;" :
                "var resultValue = ".concat(this.poolType === 'avg' ? '0.0' : '-1.0 / pow(10.0, -20.0)', ";"), "\n\n          var count = 0.0;\n          for (var wD = 0; wD < uniforms.filterDims.x; wD++) {\n            let xD = xDCorner + wD;\n            if (xD < 0 || xD >= uniforms.convDims.x) {\n              continue;\n            }\n\n            for (var wR = 0; wR < uniforms.filterDims.y; wR++) {\n              let xR = xRCorner + wR;\n              if (xR < 0 || xR >= uniforms.convDims.y) {\n                continue;\n              }\n\n              for (var wC = 0; wC < uniforms.filterDims.z; wC++) {\n                let xC = xCCorner + wC;\n                if (xC < 0 || xC >= uniforms.convDims.z) {\n                  continue;\n                }\n\n                let value = getX(batch, xD, xR, xC, ch);\n                ").concat(updateSnippet, "\n              }\n            }\n          }\n\n          ").concat(this.computePositions ? "setOutputAtIndexI32(index, maxPosition);" :
                "setOutputAtIndex(index, ".concat(returnValue, ");"), "\n        }\n      }\n    ");
            return userCode;
        };
        return Pool3DProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function max(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var reductionIndices = attrs.reductionIndices, keepDims = attrs.keepDims;
        return reduce(x, reductionIndices, keepDims, 'max', backend);
    }
    var maxConfig = {
        kernelName: tf.Max,
        backendName: 'webgpu',
        kernelFunc: max
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function mean(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var keepDims = attrs.keepDims, axis = attrs.axis;
        return reduce(x, axis, keepDims, 'mean', backend);
    }
    var meanConfig = {
        kernelName: tf.Mean,
        backendName: 'webgpu',
        kernelFunc: mean
    };

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function poolImpl(x, convInfo, poolType, backend) {
        if (convInfo.filterWidth === 1 && convInfo.filterHeight === 1 &&
            tf.util.arraysEqual(convInfo.inShape, convInfo.outShape)) {
            return identity({ inputs: { x: x }, backend: backend });
        }
        if (convInfo.filterWidth === convInfo.inWidth &&
            convInfo.filterHeight === convInfo.inHeight && convInfo.batchSize === 1 &&
            convInfo.padInfo.type === 'VALID') {
            var length = x.shape.length;
            var reshapeX = reshape({
                inputs: { x: x },
                backend: backend,
                attrs: {
                    shape: [
                        x.shape[length - 3] * x.shape[length - 2] /* height * width */,
                        x.shape[length - 1] /* channel */
                    ]
                }
            });
            var reduceX = void 0;
            if (poolType === 'avg') {
                reduceX = mean({ inputs: { x: reshapeX }, backend: backend, attrs: { axis: 0, keepDims: false } });
            }
            else {
                tf.util.assert(poolType === 'max', function () { return "Invalid pool type ".concat(poolType); });
                reduceX = max({
                    inputs: { x: reshapeX },
                    backend: backend,
                    attrs: { reductionIndices: 0, keepDims: false }
                });
            }
            var result = reshape({ inputs: { x: reduceX }, backend: backend, attrs: { shape: convInfo.outShape } });
            backend.disposeData(reshapeX.dataId);
            backend.disposeData(reduceX.dataId);
            return result;
        }
        var program;
        var dimensions = [{ type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] }];
        if (convInfo.filterHeight === 1 && convInfo.filterWidth === 1) {
            program = new PoolWithFilterSizeEqualsOneProgram(convInfo);
        }
        else {
            if (poolType === 'avg') {
                program = new Pool2DProgram(convInfo, 'avg');
            }
            else {
                tf.util.assert(poolType === 'max', function () { return "Invalid pool type ".concat(poolType); });
                program = new Pool2DProgram(convInfo, 'max');
            }
            dimensions.push({ type: 'int32', data: [convInfo.padInfo.top, convInfo.padInfo.left] }, {
                type: 'int32',
                data: [convInfo.dilationHeight, convInfo.dilationWidth]
            }, { type: 'int32', data: [convInfo.inHeight, convInfo.inWidth] }, {
                type: 'int32',
                data: [convInfo.effectiveFilterHeight, convInfo.effectiveFilterWidth]
            });
        }
        return backend.runWebGPUProgram(program, [x], x.dtype, dimensions);
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function avgPool(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var filterSize = attrs.filterSize, strides = attrs.strides, pad = attrs.pad, dimRoundingMode = attrs.dimRoundingMode;
        var dilations = 1;
        var convInfo = tf.backend_util.computePool2DInfo(x.shape, filterSize, strides, dilations, pad, dimRoundingMode);
        return poolImpl(x, convInfo, 'avg', backend);
    }
    var avgPoolConfig = {
        kernelName: tf.AvgPool,
        backendName: 'webgpu',
        kernelFunc: avgPool
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function avgPool3D(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var filterSize = attrs.filterSize, strides = attrs.strides, pad = attrs.pad, dataFormat = attrs.dataFormat, dimRoundingMode = attrs.dimRoundingMode;
        var dilations = [1, 1, 1];
        var convInfo = tf.backend_util.computePool3DInfo(x.shape, filterSize, strides, dilations, pad, dimRoundingMode, dataFormat);
        var avgPoolProgram = new Pool3DProgram(convInfo, 'avg');
        var dimensions = [
            {
                type: 'int32',
                data: [convInfo.strideDepth, convInfo.strideHeight, convInfo.strideWidth]
            },
            {
                type: 'int32',
                data: [convInfo.padInfo.front, convInfo.padInfo.top, convInfo.padInfo.left]
            },
            {
                type: 'int32',
                data: [convInfo.inDepth, convInfo.inHeight, convInfo.inWidth]
            },
            {
                type: 'int32',
                data: [
                    convInfo.effectiveFilterDepth, convInfo.effectiveFilterHeight,
                    convInfo.effectiveFilterWidth
                ]
            }
        ];
        return backend.runWebGPUProgram(avgPoolProgram, [x], x.dtype, dimensions);
    }
    var avgPool3DConfig = {
        kernelName: tf.AvgPool3D,
        backendName: 'webgpu',
        kernelFunc: avgPool3D
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var AvgPool2DBackpropProgram = /** @class */ (function () {
        function AvgPool2DBackpropProgram(convInfo) {
            this.variableNames = ['dy'];
            this.uniforms = "strides : vec2<i32>, pads : vec2<i32>, dilations : vec2<i32>, filterDims : vec2<i32>,\n       outHeight : i32, outWidth : i32, avgMultiplier : f32,";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.inShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "avgPool2DBackprop";
        }
        AvgPool2DBackpropProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let batch = coords[0];\n        let d = coords[3];\n\n        let dyRCCorner = vec2<i32>(coords.yz) - uniforms.pads;\n        let dyRCorner = dyRCCorner.x;\n        let dyCCorner = dyRCCorner.y;\n\n        // Convolve dy(?, ?, d) with pos mask(:, :, d) to get dx(xR, xC, d).\n        // ? = to be determined. : = across all values in that axis.\n        var dotProd = 0.0;\n        for (var wR = 0; wR < uniforms.filterDims[0]; wR = wR + uniforms.dilations[0]) {\n          let dyR = f32(dyRCorner + wR) / f32(uniforms.strides[0]);\n\n          if (dyR < 0.0 || dyR >= f32(uniforms.outHeight) || fract(dyR) > 0.0) {\n            continue;\n          }\n          let idyR = i32(dyR);\n\n          for (var wC = 0; wC < uniforms.filterDims[1]; wC = wC + uniforms.dilations[1]) {\n            let dyC = f32(dyCCorner + wC) / f32(uniforms.strides[1]);\n\n            if (dyC < 0.0 || dyC >= f32(uniforms.outWidth) || fract(dyC) > 0.0) {\n              continue;\n            }\n            let idyC = i32(dyC);\n\n            let dyValue = getDy(batch, idyR, idyC, d);\n\n            dotProd = dotProd + dyValue * uniforms.avgMultiplier;\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n    ");
            return userCode;
        };
        return AvgPool2DBackpropProgram;
    }());
    var AvgPool3DBackpropProgram = /** @class */ (function () {
        function AvgPool3DBackpropProgram(convInfo) {
            this.variableNames = ['dy'];
            this.uniforms = "strides : vec3<i32>, pads : vec3<i32>, filterDims : vec3<i32>,\n       outDepth : i32, outHeight : i32, outWidth : i32, avgMultiplier : f32,";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.inShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "avgPool3DBackprop";
        }
        AvgPool3DBackpropProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let batch = coords.x;\n        let ch = coords.u;\n\n        let dyCorner = vec3<i32>(coords.y, coords.z, coords.w) - uniforms.pads;\n        let dyDCorner = dyCorner.x;\n        let dyRCorner = dyCorner.y;\n        let dyCCorner = dyCorner.z;\n\n        // Convolve dy(?, ?, ?, d) with pos mask(:, :, :, ch) to get\n        // dx(xD, xR, xC, ch).\n        // ? = to be determined. : = across all values in that axis.\n        var dotProd = 0.0;\n        for (var wD = 0; wD < uniforms.filterDims[0]; wD++) {\n          let dyD = f32(dyDCorner + wD) / f32(uniforms.strides[0]);\n\n          if (dyD < 0.0 || dyD >= f32(uniforms.outDepth) || fract(dyD) > 0.0) {\n            continue;\n          }\n          let idyD = i32(dyD);\n\n          for (var wR = 0; wR < uniforms.filterDims[1]; wR++) {\n            let dyR = f32(dyRCorner + wR) / f32(uniforms.strides[1]);\n\n            if (dyR < 0.0 || dyR >= f32(uniforms.outHeight) || fract(dyR) > 0.0) {\n              continue;\n            }\n            let idyR = i32(dyR);\n\n            for (var wC = 0; wC < uniforms.filterDims[2]; wC++) {\n              let dyC = f32(dyCCorner + wC) / f32(uniforms.strides[2]);\n\n              if (dyC < 0.0 || dyC >= f32(uniforms.outWidth) || fract(dyC) > 0.0) {\n                continue;\n              }\n              let idyC = i32(dyC);\n\n              let dyValue = getDy(batch, idyD, idyR, idyC, ch);\n              dotProd += dyValue * uniforms.avgMultiplier;\n            }\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n    ");
            return userCode;
        };
        return AvgPool3DBackpropProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function avgPool3DGrad(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var dy = inputs.dy, input = inputs.input;
        var x = input;
        var filterSize = attrs.filterSize, strides = attrs.strides, pad = attrs.pad, dimRoundingMode = attrs.dimRoundingMode;
        var convInfo = tf.backend_util.computePool3DInfo(x.shape, filterSize, strides, 1 /* dilations */, pad, dimRoundingMode);
        var program = new AvgPool3DBackpropProgram(convInfo);
        var avgMultiplier = 1 / (convInfo.filterDepth * convInfo.filterHeight * convInfo.filterWidth);
        var uniformData = [
            {
                type: 'int32',
                data: [convInfo.strideDepth, convInfo.strideHeight, convInfo.strideWidth]
            },
            {
                type: 'int32',
                data: [
                    convInfo.effectiveFilterDepth - 1 - convInfo.padInfo.front,
                    convInfo.effectiveFilterHeight - 1 - convInfo.padInfo.top,
                    convInfo.effectiveFilterWidth - 1 - convInfo.padInfo.left
                ]
            },
            {
                type: 'int32',
                data: [
                    convInfo.effectiveFilterDepth, convInfo.effectiveFilterHeight,
                    convInfo.effectiveFilterWidth
                ]
            },
            { type: 'int32', data: [convInfo.outDepth] },
            { type: 'int32', data: [convInfo.outHeight] },
            { type: 'int32', data: [convInfo.outWidth] },
            { type: 'float32', data: [avgMultiplier] }
        ];
        return backend.runWebGPUProgram(program, [dy], x.dtype, uniformData);
    }
    var avgPool3DGradConfig = {
        kernelName: tf.AvgPool3DGrad,
        backendName: 'webgpu',
        kernelFunc: avgPool3DGrad
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function avgPoolGrad(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var dy = inputs.dy, input = inputs.input;
        var x = input;
        assertNotComplex([dy, input], 'avgPoolGrad');
        var filterSize = attrs.filterSize, strides = attrs.strides, pad = attrs.pad;
        var convInfo = tf.backend_util.computePool2DInfo(x.shape, filterSize, strides, 1 /* dilations */, pad);
        var program = new AvgPool2DBackpropProgram(convInfo);
        var avgMultiplier = 1 / (convInfo.filterHeight * convInfo.filterWidth);
        var uniformData = [
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] }, {
                type: 'int32',
                data: [
                    convInfo.effectiveFilterHeight - 1 - convInfo.padInfo.top,
                    convInfo.effectiveFilterWidth - 1 - convInfo.padInfo.left
                ]
            },
            { type: 'int32', data: [convInfo.dilationHeight, convInfo.dilationWidth] }, {
                type: 'int32',
                data: [convInfo.effectiveFilterHeight, convInfo.effectiveFilterWidth]
            },
            { type: 'int32', data: [convInfo.outHeight] },
            { type: 'int32', data: [convInfo.outWidth] },
            { type: 'float32', data: [avgMultiplier] }
        ];
        return backend.runWebGPUProgram(program, [dy], x.dtype, uniformData);
    }
    var avgPoolGradConfig = {
        kernelName: tf.AvgPoolGrad,
        backendName: 'webgpu',
        kernelFunc: avgPoolGrad
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function batchMatMul(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var a = inputs.a, b = inputs.b;
        var transposeA = attrs.transposeA, transposeB = attrs.transposeB;
        return batchMatMulImpl({ a: a, b: b, transposeA: transposeA, transposeB: transposeB, backend: backend });
    }
    var batchMatMulConfig = {
        kernelName: tf.BatchMatMul,
        backendName: 'webgpu',
        kernelFunc: batchMatMul,
    };

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var SliceProgram = /** @class */ (function () {
        function SliceProgram(start, destSize) {
            this.variableNames = ['source'];
            this.workPerThread = 1;
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = destSize;
            this.rank = destSize.length;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [this.workPerThread, 1, 1]);
            this.start = start;
            this.uniforms = "start : ".concat(getCoordsDataType(start.length), ", ");
            this.shaderKey = 'slice';
        }
        SliceProgram.prototype.getUserCode = function () {
            var dtype = getCoordsDataType(this.rank);
            var sourceCoords = getCoords$1(this.rank);
            var coordSum;
            if (this.start.length === 1) {
                coordSum = this.outputShape.map(function (_, i) {
                    return "sourceLoc = uniforms.start + coords;";
                });
            }
            else {
                coordSum = this.outputShape.map(function (_, i) {
                    return "sourceLoc.".concat(coords[i], " = uniforms.start.").concat(getCoordsXYZ(i), " + coords.").concat(coords[i], ";");
                });
            }
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          var sourceLoc : ").concat(dtype, ";\n          let coords = getCoordsFromIndex(index);\n          ").concat(coordSum.join('\n'), "\n          setOutputAtIndex(index, getSource(").concat(sourceCoords, "));\n        }\n      }\n    ");
            return userCode;
        };
        return SliceProgram;
    }());
    var coords = ['x', 'y', 'z', 'w', 'u', 'v'];
    function getCoords$1(rank) {
        if (rank === 1) {
            return 'sourceLoc';
        }
        else if (rank <= 6) {
            return coords.slice(0, rank).map(function (coord) { return "sourceLoc.".concat(coord); }).join(',');
        }
        else {
            throw Error("Slicing for rank ".concat(rank, " is not yet supported"));
        }
    }

    function slice(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var begin = attrs.begin, size = attrs.size;
        var _a = __read(tf.slice_util.parseSliceParams(x, begin, size), 2), $begin = _a[0], $size = _a[1];
        tf.slice_util.assertParamsValid(x, $begin, $size);
        if (backend.shouldExecuteOnCPU([x]) || x.dtype === 'string') {
            var xTensorData = backend.tensorMap.get(x.dataId);
            var outValues = sliceImplCPU(xTensorData.values, $begin, $size, x.shape, x.dtype);
            return backend.makeTensorInfo($size, x.dtype, outValues);
        }
        if (tf.util.sizeFromShape($size) === 0) {
            return backend.makeTensorInfo($size, x.dtype, []);
        }
        // TODO(xing.xu): Add shadow slice support.
        var program = new SliceProgram($begin, $size);
        var uniformData = [{ type: 'int32', data: $begin }];
        return backend.runWebGPUProgram(program, [x], x.dtype, uniformData);
    }
    var sliceConfig = {
        kernelName: tf.Slice,
        backendName: 'webgpu',
        kernelFunc: slice
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var batchToSpaceND = function (args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var blockShape = attrs.blockShape, crops = attrs.crops;
        tf.util.assert(x.shape.length <= 4, function () { return 'batchToSpaceND for rank > 4 with a WebGPU backend not ' +
            'implemented yet'; });
        var prod = blockShape.reduce(function (a, b) { return a * b; });
        var reshaped = tf.backend_util.getReshaped(x.shape, blockShape, prod);
        var permuted = tf.backend_util.getPermuted(reshaped.length, blockShape.length);
        var reshapedPermuted = tf.backend_util.getReshapedPermuted(x.shape, blockShape, prod);
        var sliceBeginCoords = tf.backend_util.getSliceBeginCoords(crops, blockShape.length);
        var sliceSize = tf.backend_util.getSliceSize(reshapedPermuted, crops, blockShape.length);
        var toDispose = [];
        var reshapedIntermediate = reshape({ inputs: { x: x }, backend: backend, attrs: { shape: reshaped } });
        var transposedIntermediate = transpose({ inputs: { x: reshapedIntermediate }, backend: backend, attrs: { perm: permuted } });
        var reshapedIntermediate2 = reshape({
            inputs: { x: transposedIntermediate },
            backend: backend,
            attrs: { shape: reshapedPermuted }
        });
        var sliced = slice({
            inputs: { x: reshapedIntermediate2 },
            backend: backend,
            attrs: { begin: sliceBeginCoords, size: sliceSize }
        });
        toDispose.push(reshapedIntermediate);
        toDispose.push(transposedIntermediate);
        toDispose.push(reshapedIntermediate2);
        toDispose.forEach(function (t) { return backend.disposeData(t.dataId); });
        return sliced;
    };
    var batchToSpaceNDConfig = {
        kernelName: tf.BatchToSpaceND,
        backendName: 'webgpu',
        kernelFunc: batchToSpaceND
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var writeSnippet = "\n  fn bincount_write(index: i32, value: f32) {\n    ".concat(atomicAddSnippet('&result[index]', 'value', 'float32'), "\n  }\n");
    var binaryWriteSnippet = "\n  fn bincount_write(index: i32, value: f32) {\n    atomicStore(&result[index], bitcast<i32>(value));\n  }\n";
    var BincountProgram = /** @class */ (function () {
        function BincountProgram(shape, hasWeights, binaryOutput) {
            if (binaryOutput === void 0) { binaryOutput = false; }
            this.outputShape = [];
            this.variableNames = ['x'];
            this.uniforms = 'binCountSize : i32,';
            this.workgroupSize = [64, 1, 1];
            this.atomic = true;
            this.hasWeights = true;
            this.binaryOutput = false;
            this.outputShape = shape;
            this.rank = shape.length;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.binaryOutput = binaryOutput;
            if (binaryOutput) {
                this.atomic = false;
            }
            this.hasWeights = hasWeights;
            if (this.hasWeights) {
                this.variableNames.push('w');
            }
            this.shaderKey =
                "bincount_".concat(this.hasWeights, "_").concat(this.binaryOutput, "_").concat(this.rank);
        }
        BincountProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(this.binaryOutput ? binaryWriteSnippet : writeSnippet, "\n  ").concat(getMainHeaderString('index'), " {\n    ").concat(this.rank === 1 ?
                "if (index < uniforms.xShape) {\n      let indexVal = i32(getX(index));\n      if (indexVal < uniforms.binCountSize) {\n        let value = ".concat(this.binaryOutput ? 1. :
                    (this.hasWeights ? 'getW(index)' : '1.'), ";\n        bincount_write(indexVal, value);\n      }\n    }") :
                "let coord = getCoordsFromIndex(index);\n    if (coordsInBounds2D(coord, uniforms.xShape)) {\n      let indexVal = i32(getX(coord[0], coord[1]));\n      if (indexVal < uniforms.binCountSize) {\n        let value = ".concat(this.binaryOutput ?
                    1. :
                    (this.hasWeights ? 'getW(coord[0], coord[1])' : '1.'), ";\n        bincount_write(coord.x * uniforms.binCountSize + indexVal, value);\n      }\n    }"), "\n  }\n  ");
            return userCode;
        };
        return BincountProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function bincount(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, weights = inputs.weights;
        var size = attrs.size;
        var xSize = tf.util.sizeFromShape(x.shape);
        var weightsSize = tf.util.sizeFromShape(weights.shape);
        var hasWeights = weightsSize > 0;
        var outputSize = [size];
        var dtype = weights.dtype;
        var output = fill({ backend: backend, attrs: { shape: outputSize, value: 0, dtype: dtype } });
        var program = new BincountProgram([xSize], hasWeights);
        var uniformData = [{ type: 'int32', data: [size] }];
        var bincountInputs = hasWeights ? [x, weights] : [x];
        var res = backend.runWebGPUProgram(program, bincountInputs, dtype, uniformData, output);
        return res;
    }
    var bincountConfig = {
        kernelName: tf.Bincount,
        backendName: 'webgpu',
        kernelFunc: bincount
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var BroadcastArgsProgram = /** @class */ (function () {
        function BroadcastArgsProgram(shape) {
            this.outputShape = [];
            this.variableNames = ['s0', 's1'];
            this.uniforms = 's0Size : i32, s1Size : i32, ';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = [shape];
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'broadcastArgs';
        }
        BroadcastArgsProgram.prototype.getUserCode = function () {
            var userCode = "\n  ".concat(getMainHeaderString('index'), " {\n    if (index < uniforms.size) {\n      var s0 = 1.0;\n      var s1 = 1.0;\n      let indexS0 = index - uniforms.size + uniforms.s0Size;\n      let indexS1 = index - uniforms.size + uniforms.s1Size;\n      if (indexS0 >= 0) {\n        s0 = getS0(indexS0);\n      }\n      if (indexS1 >= 0) {\n        s1 = getS1(indexS1);\n      }\n\n      if (s0 == 1.0) {\n        setOutputAtIndex(index, s1);\n      } else if (s1 == 1.0) {\n        setOutputAtIndex(index, s0);\n      } else if (s0 != s1) {\n        setOutputAtIndex(index, uniforms.NAN);\n      } else {\n        setOutputAtIndex(index, s0);\n      }\n    }\n  }\n  ");
            return userCode;
        };
        return BroadcastArgsProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function broadcastArgs(args) {
        var inputs = args.inputs, backend = args.backend;
        var s0 = inputs.s0, s1 = inputs.s1;
        if (backend.shouldExecuteOnCPU([s0, s1])) {
            var s0TensorInfo = backend.tensorMap.get(s0.dataId);
            var s1TensorInfo = backend.tensorMap.get(s1.dataId);
            var s0Vals = s0TensorInfo.values;
            var s1Vals = s1TensorInfo.values;
            var broadcastShape = tf.backend_util.assertAndGetBroadcastShape(Array.from(s0Vals), Array.from(s1Vals));
            return backend.makeTensorInfo([broadcastShape.length], 'int32', Int32Array.from(broadcastShape));
        }
        var s0Size = tf.util.sizeFromShape(s0.shape);
        var s1Size = tf.util.sizeFromShape(s1.shape);
        var outputSize = Math.max(s0Size, s1Size);
        var program = new BroadcastArgsProgram(outputSize);
        var uniformData = [{ type: 'int32', data: [s0Size] }, { type: 'int32', data: [s1Size] }];
        return backend.runWebGPUProgram(program, [s0, s1], 'int32', uniformData);
    }
    var broadcastArgsConfig = {
        kernelName: tf.BroadcastArgs,
        backendName: 'webgpu',
        kernelFunc: broadcastArgs
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var notEqual = binaryKernelFunc({
        opType: BinaryOpType.NOT_EQUAL,
        dtype: 'bool',
        cpuKernelImpl: notEqualImplCPU
    });
    var notEqualConfig = {
        kernelName: tf.NotEqual,
        backendName: 'webgpu',
        kernelFunc: notEqual
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function real(args) {
        var inputs = args.inputs, backend = args.backend;
        var input = inputs.input;
        var inputData = backend.tensorMap.get(input.dataId);
        return identity({ inputs: { x: inputData.complexTensorInfos.real }, backend: backend });
    }
    var realConfig = {
        kernelName: tf.Real,
        backendName: 'webgpu',
        kernelFunc: real
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function int(input, backend) {
        var program = new UnaryOpProgram(input.shape, UnaryOpType.TO_INT);
        var output = backend.runWebGPUProgram(program, [input], 'int32');
        return { dataId: output.dataId, shape: output.shape, dtype: output.dtype };
    }

    function cast(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var dtype = attrs.dtype;
        // Casting to complex64.
        if (dtype === 'complex64') {
            if (x.dtype === 'complex64') {
                return identity({ inputs: { x: x }, backend: backend });
            }
            // TODO: Import kernel function once zeros is modularized.
            var zerosTensor = tf__namespace.zeros(x.shape);
            var floatX = cast({ inputs: { x: x }, backend: backend, attrs: { dtype: 'float32' } });
            var result = complex({ inputs: { real: floatX, imag: zerosTensor }, backend: backend });
            zerosTensor.dispose();
            backend.disposeData(floatX.dataId);
            return result;
        }
        // Casting from complex64
        if (x.dtype === 'complex64') {
            var realPart = real({ inputs: { input: x }, backend: backend });
            var result = cast({ inputs: { x: realPart }, backend: backend, attrs: { dtype: dtype } });
            backend.disposeData(realPart.dataId);
            return result;
        }
        if (!tf.util.hasEncodingLoss(x.dtype, dtype)) {
            // We don't change the underlying data, since we cast to higher
            // precision.
            var result = identity({ inputs: { x: x }, backend: backend });
            return { dataId: result.dataId, shape: result.shape, dtype: dtype };
        }
        if (backend.shouldExecuteOnCPU([x])) {
            var values = backend.tensorMap.get(x.dataId).values;
            var _a = __read(castImplCPU(values, x.shape, x.dtype, dtype), 3), resultShape = _a[0], resultType = _a[1], resultData = _a[2];
            return backend.makeTensorInfo(resultShape, resultType, resultData);
        }
        if (dtype === 'int32') {
            return int(x, backend);
        }
        if (dtype === 'bool') {
            var zerosTensorInfo = backend.makeTensorInfo([], 'bool', tf.util.getTypedArrayFromDType('bool', 1));
            var binaryInputs = { a: x, b: zerosTensorInfo };
            var result = notEqual({ inputs: binaryInputs, backend: backend });
            backend.disposeData(zerosTensorInfo.dataId);
            return result;
        }
        throw new Error("Error in Cast: failed to cast ".concat(x.dtype, " to ").concat(dtype));
    }
    var castConfig = {
        kernelName: tf.Cast,
        backendName: 'webgpu',
        kernelFunc: cast
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ceil = unaryKernelFunc({ opType: UnaryOpType.CEIL, cpuKernelImpl: ceilImplCPU });
    var ceilConfig = {
        kernelName: tf.Ceil,
        backendName: 'webgpu',
        kernelFunc: ceil
    };

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ClipVec4Program = /** @class */ (function () {
        function ClipVec4Program(outputShape) {
            this.variableNames = ['A'];
            this.uniforms = 'minVal : f32, maxVal : f32,';
            this.workPerThread = 4;
            this.workgroupSize = [64, 1, 1];
            this.outputComponent = 4;
            this.size = true;
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [this.workPerThread, 1, 1]);
            this.shaderKey = 'clipVec4';
        }
        ClipVec4Program.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if(index < uniforms.size) {\n          let value = getAByOutputIndex(index);\n          var clampedValue = clamp(\n              value, vec4<f32>(uniforms.minVal), vec4<f32>(uniforms.maxVal));\n          clampedValue = select(clampedValue, value, isnanVec4(value));\n          setOutputAtIndex(index, clampedValue);\n        }\n      }\n    ");
            return userCode;
        };
        return ClipVec4Program;
    }());

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ClipProgram = /** @class */ (function () {
        function ClipProgram(outputShape) {
            this.variableNames = ['A'];
            this.uniforms = 'minVal : f32, maxVal : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'clip';
        }
        ClipProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if(index < uniforms.size) {\n          let value = getAByOutputIndex(index);\n          if (isnan(value)) {\n            setOutputAtIndex(index, value);\n            return;\n          }\n          setOutputAtIndex(index, clamp(value, uniforms.minVal, uniforms.maxVal));\n        }\n      }\n    ");
            return userCode;
        };
        return ClipProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function clipByValue(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var clipValueMin = attrs.clipValueMin, clipValueMax = attrs.clipValueMax;
        var program;
        var uniformData = [
            { type: 'float32', data: [clipValueMin] },
            { type: 'float32', data: [clipValueMax] }
        ];
        if (tf.util.sizeFromShape(x.shape) % 4 === 0) {
            program = new ClipVec4Program(x.shape);
        }
        else {
            program = new ClipProgram(x.shape);
        }
        return backend.runWebGPUProgram(program, [x], x.dtype, uniformData);
    }
    var clipByValueConfig = {
        kernelName: tf.ClipByValue,
        backendName: 'webgpu',
        kernelFunc: clipByValue
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ComplexAbsProgram = /** @class */ (function () {
        function ComplexAbsProgram(shape) {
            this.outputShape = [];
            this.variableNames = ['real', 'imag'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = shape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'complexAbs';
        }
        ComplexAbsProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let re = abs(getRealByOutputIndex(index));\n        let im = abs(getImagByOutputIndex(index));\n        let mx = max(re, im);\n\n        // The length function in wgsl may be not underflow-safe on some GPUs.\n        // So the safe solution is to ensure underflow-safety in all cases.\n        setOutputAtIndex(index, select(mx * length(vec2<f32>(1, min(re, im)/mx)), 0.0, mx == 0.0));\n      }\n    }\n  ");
            return userCode;
        };
        return ComplexAbsProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    // Returns a TensorInfo with the complex shape and the dataId of the
    // underlying part. We need to do this because a reshaped complex tensor is
    // not reflected in its parts.
    function makeComplexComponentTensorInfo(complexTensor, complexPart) {
        return {
            dataId: complexPart.dataId,
            dtype: complexPart.dtype,
            shape: complexTensor.shape
        };
    }
    function complexAbs(args) {
        var inputs = args.inputs, backend = args.backend;
        var x = inputs.x;
        var xData = backend.tensorMap.get(x.dataId);
        var program = new ComplexAbsProgram(x.shape);
        var programInputs = [
            makeComplexComponentTensorInfo(x, xData.complexTensorInfos.real),
            makeComplexComponentTensorInfo(x, xData.complexTensorInfos.imag),
        ];
        return backend.runWebGPUProgram(program, programInputs, programInputs[0].dtype);
    }
    var complexAbsConfig = {
        kernelName: tf.ComplexAbs,
        backendName: 'webgpu',
        kernelFunc: complexAbs
    };

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ConcatProgram = /** @class */ (function () {
        function ConcatProgram(shapes) {
            this.uniforms = '';
            this.workPerThread = 1;
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape =
                tf.backend_util.computeOutShape(shapes, 1 /* axis */);
            this.variableNames = shapes.map(function (_, i) { return "T".concat(i); });
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [this.workPerThread, 1, 1]);
            this.offsetLength = shapes.length - 1;
            for (var i = 0; i < this.offsetLength; i++) {
                this.uniforms += "offset".concat(i, " : i32,");
            }
            this.shaderKey = 'concat';
        }
        ConcatProgram.prototype.getUserCode = function () {
            var snippets = [];
            if (this.offsetLength > 0) {
                snippets.push("if (yC < uniforms.offset0){ setOutputAtCoords(coords.x, coords.y, getT0(yR, yC)); }");
                for (var i = 1; i < this.offsetLength; i++) {
                    snippets.push("else if (yC < uniforms.offset".concat([i], "){ ") +
                        "setOutputAtCoords(coords.x, coords.y, getT".concat(i, "(yR, yC - uniforms.offset").concat(i - 1, ")); }"));
                }
                var lastIndex = this.offsetLength;
                var lastShiftIndex = this.offsetLength - 1;
                snippets.push("else { setOutputAtCoords(coords.x, coords.y, getT".concat(lastIndex, "(yR, yC - uniforms.offset").concat(lastShiftIndex, ")); }"));
            }
            else {
                snippets.push("setOutputAtCoords(coords.x, coords.y, getT0(yR, yC));");
            }
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        for(var i = 0; i < ").concat(this.workPerThread, "; i = i + 1) {\n          let flatIndex = index * ").concat(this.workPerThread, " + i;\n          if(flatIndex < uniforms.size) {\n            let coords = getCoordsFromIndex(flatIndex);\n            let yR = coords.x;\n            let yC = coords.y;\n\n            ").concat(snippets.join('\n        '), "\n          }\n        }\n      }\n    ");
            return userCode;
        };
        return ConcatProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function imag(args) {
        var inputs = args.inputs, backend = args.backend;
        var input = inputs.input;
        var inputData = backend.tensorMap.get(input.dataId);
        return identity({ inputs: { x: inputData.complexTensorInfos.imag }, backend: backend });
    }
    var imagConfig = {
        kernelName: tf.Imag,
        backendName: 'webgpu',
        kernelFunc: imag
    };

    function concatImpl(inputs, axis, backend) {
        var e_1, _a;
        var dtype = inputs[0].dtype;
        if (dtype === 'complex64') {
            var reals = inputs.map(function (t) { return real({ inputs: { input: t }, backend: backend }); });
            var imags = inputs.map(function (t) { return imag({ inputs: { input: t }, backend: backend }); });
            var realConcated = concatImpl(reals, axis, backend);
            var imagConcated = concatImpl(imags, axis, backend);
            var result = complex({ inputs: { real: realConcated, imag: imagConcated }, backend: backend });
            reals.forEach(function (r) { return backend.disposeData(r.dataId); });
            imags.forEach(function (i) { return backend.disposeData(i.dataId); });
            backend.disposeData(realConcated.dataId);
            backend.disposeData(imagConcated.dataId);
            return result;
        }
        var runOnCpu = backend.shouldExecuteOnCPU(inputs);
        // Run on cpu if dtype is string. For string, the backend represents it
        // as Uint8Array[], where each Uint8Array is a character. Given that the
        // computation is only on the outer array, uploading the whole data onto
        // gpu is wasteful. Also, currently webgpu doesn't have a design to
        // upload and retrieve Uint8Array[] between cpu and gpu. Therefore, we
        // just run the kernel on cpu if dtype is string.
        if (dtype === 'string') {
            runOnCpu = true;
        }
        if (runOnCpu) {
            // Any concat of n-dimensional tensors across any axis can be reduced to
            // a concatenation of two-dimensional tensors across the axis 1 by first
            // partitioning the axes of the original tensors into those less than the
            // axis to be concatenated and the rest. Then reshape the tensors
            // into a two-dimensional tensor by collapsing these two sets of axes and
            // concatenate the resulting matrices across the axis 1, finally reshaping
            // the result to have the proper shape.
            var tensors2D_1 = inputs.map(function (t) {
                var innerSize = tf.util.sizeFromShape(t.shape.slice(axis));
                var shape = [-1, innerSize];
                return reshape({ inputs: { x: t }, backend: backend, attrs: { shape: shape } });
            });
            var inputsValShapes = tensors2D_1.map(function (t) {
                return { vals: backend.readSync(t.dataId), shape: t.shape };
            });
            // Concats 2d tensors along axis=1.
            var outShape_1 = tf.backend_util.computeOutShape(tensors2D_1.map(function (t) { return t.shape; }), 1 /* axis */);
            var simplyConcat = tensors2D_1[0].shape[0] === 1;
            var outVals = concatImplCPU(inputsValShapes, outShape_1, dtype, simplyConcat);
            var finalOutShape = tf.backend_util.computeOutShape(inputs.map(function (t) { return t.shape; }), axis);
            var outInfo = backend.makeTensorInfo(finalOutShape, dtype, outVals);
            tensors2D_1.forEach(function (t) { return backend.disposeData(t.dataId); });
            return outInfo;
        }
        // There is a storage buffer limitation in compute stage, one for output so
        // the maximum for input is limits.maxStorageBuffersPerShaderStage - 1
        var maxInputNum = backend.device.limits.maxStorageBuffersPerShaderStage - 1;
        if (inputs.length > maxInputNum) {
            var reducedInputs = [];
            for (var i = 0; i < inputs.length; i += maxInputNum) {
                var subArray = inputs.slice(i, i + maxInputNum);
                reducedInputs.push(concatImpl(subArray, axis, backend));
            }
            var result = concatImpl(reducedInputs, axis, backend);
            try {
                for (var reducedInputs_1 = __values(reducedInputs), reducedInputs_1_1 = reducedInputs_1.next(); !reducedInputs_1_1.done; reducedInputs_1_1 = reducedInputs_1.next()) {
                    var i = reducedInputs_1_1.value;
                    backend.disposeData(i.dataId);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (reducedInputs_1_1 && !reducedInputs_1_1.done && (_a = reducedInputs_1.return)) _a.call(reducedInputs_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return result;
        }
        var _b = computeTensors2D(inputs, axis, backend), tensors2D = _b.tensors2D, outShape = _b.outShape;
        var shapes = (tensors2D).map(function (t) { return t.shape; });
        var program = new ConcatProgram(shapes);
        var uniformData = [];
        var offsets = new Array(shapes.length - 1);
        if (offsets.length > 0) {
            offsets[0] = shapes[0][1];
            uniformData.push({ type: 'int32', data: [offsets[0]] });
            for (var i = 1; i < offsets.length; i++) {
                offsets[i] = offsets[i - 1] + shapes[i][1];
                uniformData.push({ type: 'int32', data: [offsets[i]] });
            }
        }
        var res = backend.runWebGPUProgram(program, tensors2D, tensors2D[0].dtype, uniformData);
        tensors2D.forEach(function (r) { return backend.disposeData(r.dataId); });
        var reshapedResult = reshape({ inputs: { x: res }, backend: backend, attrs: { shape: outShape } });
        backend.disposeData(res.dataId);
        return reshapedResult;
    }
    function computeTensors2D(inputs, axis, backend) {
        var outShape = tf.backend_util.computeOutShape(inputs.map(function (t) { return t.shape; }), axis);
        var tensors2D = inputs.map(function (t) { return reshape({
            inputs: { x: t },
            backend: backend,
            attrs: {
                shape: [
                    tf.util.sizeFromShape(t.shape.slice(0, axis)),
                    tf.util.sizeFromShape(t.shape.slice(axis))
                ]
            }
        }); });
        return { tensors2D: tensors2D, outShape: outShape };
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function concat(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var axis = attrs.axis;
        var $axis = tf.util.parseAxisParam(axis, inputs[0].shape)[0];
        var shapes = inputs.map(function (t) { return t.shape; });
        tf.backend_util.assertParamsConsistent(shapes, $axis);
        var outShape = tf.backend_util.computeOutShape(inputs.map(function (t) { return t.shape; }), $axis);
        if (tf.util.sizeFromShape(outShape) === 0) {
            return backend.makeTensorInfo(outShape, inputs[0].dtype, []);
        }
        // Keep only non-empty tensors (ignore tensors with 0 in their shape).
        var $inputs = inputs.filter(function (t) { return tf.util.sizeFromShape(t.shape) > 0; });
        if ($inputs.length === 1) {
            return identity({ inputs: { x: $inputs[0] }, backend: backend });
        }
        return concatImpl($inputs, $axis, backend);
    }
    var concatConfig = {
        kernelName: tf.Concat,
        backendName: 'webgpu',
        kernelFunc: concat
    };

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function conv2dCommonSnippet(isChannelsLast, fitAOuter, fitBOuter, fitInner, addBias, activation, hasPreluActivationWeights, innerElementSizeX, innerElementSizeW, innerElementSize) {
        if (addBias === void 0) { addBias = false; }
        if (activation === void 0) { activation = null; }
        if (hasPreluActivationWeights === void 0) { hasPreluActivationWeights = false; }
        if (innerElementSizeX === void 0) { innerElementSizeX = 4; }
        if (innerElementSizeW === void 0) { innerElementSizeW = 4; }
        if (innerElementSize === void 0) { innerElementSize = 4; }
        var getXSnippet = function (innerElementSize) {
            switch (innerElementSize) {
                case 1:
                    return 'resData = f32(x[xIndex]);';
                case 3:
                    return 'resData = vec3<f32>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);';
                case 4:
                    return 'resData = vec4<f32>(x[xIndex / 4]);';
                default:
                    throw new Error("innerElementSize ".concat(innerElementSize, " is not supported."));
            }
        };
        var getWSnippet = function (innerElementSize) {
            switch (innerElementSize) {
                case 1:
                    return 'return f32(W[row * uniforms.wShape[3] + col]);';
                case 4:
                    return 'return vec4<f32>(W[(row * uniforms.wShape[3] + col) / 4]);';
                default:
                    throw new Error("innerElementSize ".concat(innerElementSize, " is not supported."));
            }
        };
        var coordASnippet = isChannelsLast ? "\n      let coord = vec4<i32>(batch, xRow, xCol, xCh);\n      " :
            "\n      let coord = vec4<i32>(batch, xCh, xRow, xCol);\n      ";
        var coordResSnippet = isChannelsLast ? "\n      let coords = vec4<i32>(\n        batch,\n        row / outWidth,\n        row % outWidth,\n        col);\n      " :
            "\n      let coords = vec4<i32>(\n        batch,\n        row,\n        col / outWidth,\n        col % outWidth);\n      ";
        var xHight = isChannelsLast ? 'uniforms.xShape[1]' : 'uniforms.xShape[2]';
        var xWidth = isChannelsLast ? 'uniforms.xShape[2]' : 'uniforms.xShape[3]';
        var row = isChannelsLast ? 'row' : 'col';
        var col = isChannelsLast ? 'col' : 'row';
        var readXSnippet = "\n      let inChannels = uniforms.wShape[2];\n      let outWidth = ".concat(isChannelsLast ? 'uniforms.outShape[2]' : 'uniforms.outShape[3]', ";\n      let outRow = ").concat(row, " / outWidth;\n      let outCol = ").concat(row, " % outWidth;\n\n      let WRow = ").concat(col, " / (uniforms.filterDims[1] * inChannels);\n      let WCol = ").concat(col, " / inChannels % uniforms.filterDims[1];\n      let xRow = outRow * uniforms.strides[0] + uniforms.dilations[0] * WRow - uniforms.pads[0];\n      let xCol = outCol * uniforms.strides[1] + uniforms.dilations[1] * WCol - uniforms.pads[1];\n      let xCh = ").concat(col, " % inChannels;\n      var resData = ").concat(typeSnippet(innerElementSizeX), "(0.0);\n      // The bounds checking is always needed since we use it to pad zero for\n      // the 'same' padding type.\n      if (xRow >= 0 && xRow < ").concat(xHight, " && xCol >= 0 && xCol < ").concat(xWidth, ") {\n        ").concat(coordASnippet, "\n        let xIndex = getIndexFromCoords4D(coord, uniforms.xShape);\n        ").concat(getXSnippet(innerElementSizeX), "\n      }\n      return resData;");
        var sampleX = isChannelsLast ? (fitAOuter && fitInner ? "\n      ".concat(readXSnippet) :
            "\n      if (row < uniforms.dimAOuter && col < uniforms.dimInner) {\n        ".concat(readXSnippet, "\n      }\n      return ").concat(typeSnippet(innerElementSizeX), "(0.0);")) :
            (fitInner && fitBOuter ? "\n      ".concat(readXSnippet) :
                "\n      if (row < uniforms.dimInner && col < uniforms.dimBOuter) {\n        ".concat(readXSnippet, "\n      }\n      return ").concat(typeSnippet(innerElementSizeX), "(0.0);"));
        var sampleW = "".concat(getWSnippet(innerElementSizeW));
        var resType = typeSnippet(innerElementSize);
        var aType = isChannelsLast ? typeSnippet(innerElementSizeX) :
            typeSnippet(innerElementSizeW);
        var bType = isChannelsLast ? typeSnippet(innerElementSizeW) :
            typeSnippet(innerElementSizeX);
        var userCode = "\n      ".concat(activationFnSnippet(activation, hasPreluActivationWeights, innerElementSize === 4, 4), "\n      fn mm_readA(batch: i32, row : i32, col : i32) -> ").concat(aType, " {\n        ").concat(isChannelsLast ? sampleX : sampleW, "\n      }\n\n      fn mm_readB(batch: i32, row : i32, col : i32) -> ").concat(bType, " {\n        ").concat(isChannelsLast ? sampleW : sampleX, "\n      }\n\n      fn mm_write(batch: i32, row : i32, col : i32, valueIn : ").concat(resType, ") {\n        if (row < uniforms.dimAOuter && col < uniforms.dimBOuter)\n        {\n        var value = valueIn;\n        let outWidth = ").concat(isChannelsLast ? 'uniforms.outShape[2]' : 'uniforms.outShape[3]', ";\n        ").concat(coordResSnippet, "\n        ").concat(biasActivationSnippet(addBias, activation), "\n        setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);\n        }\n      }");
        return userCode;
    }
    var Conv2DMMProgram = /** @class */ (function () {
        function Conv2DMMProgram(convInfo, dimAOuter, dimBOuter, dimInner, addBias, activation, hasPreluActivationWeights, sequentialAccessByThreads) {
            if (addBias === void 0) { addBias = false; }
            if (activation === void 0) { activation = null; }
            if (hasPreluActivationWeights === void 0) { hasPreluActivationWeights = false; }
            if (sequentialAccessByThreads === void 0) { sequentialAccessByThreads = false; }
            this.variableNames = ['x', 'W'];
            this.uniforms = "filterDims : vec2<i32>, pads : vec2<i32>, strides : vec2<i32>, dilations : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32,";
            this.outputShape = convInfo.outShape;
            this.isChannelsLast = convInfo.dataFormat === 'channelsLast';
            this.isVec4 =
                (((convInfo.inChannels % 4 === 0 || convInfo.inChannels % 3 === 0) &&
                    this.isChannelsLast) ||
                    (convInfo.outWidth % 4 === 0 && !this.isChannelsLast)) &&
                    convInfo.outChannels % 4 === 0;
            this.dispatchLayout = this.isChannelsLast ? { x: [3], y: [1, 2], z: [0] } :
                { x: [2, 3], y: [1], z: [0] };
            this.workgroupSize = computeWorkgroupSizeForConv2d(this.dispatchLayout, this.outputShape, this.isVec4);
            this.elementsPerThread = computeWorkPerThreadForConv2d(this.dispatchLayout, this.outputShape, this.isVec4);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, this.elementsPerThread);
            if (this.isVec4) {
                this.outputComponent = 4;
                if (this.isChannelsLast && convInfo.inChannels % 4 !== 0) {
                    this.innerElementSize = 3;
                    this.variableComponents = [1, 4];
                }
                else {
                    this.innerElementSize = 4;
                    this.variableComponents = [4, 4];
                }
                if (addBias) {
                    this.variableNames.push('bias');
                    this.variableComponents.push(4);
                }
                if (hasPreluActivationWeights) {
                    this.variableNames.push('preluActivationWeights');
                    this.variableComponents.push(4);
                }
            }
            else {
                this.innerElementSize = this.elementsPerThread[0];
                if (addBias) {
                    this.variableNames.push('bias');
                }
                if (hasPreluActivationWeights) {
                    this.variableNames.push('preluActivationWeights');
                }
            }
            this.sequentialAccessByThreads = sequentialAccessByThreads;
            this.addBias = addBias;
            this.activation = activation;
            this.hasPreluActivationWeights = hasPreluActivationWeights;
            this.tileAOuter = this.workgroupSize[1] * this.elementsPerThread[1];
            this.tileBOuter = this.workgroupSize[0] * this.elementsPerThread[0];
            this.tileInner = Math.max(this.workgroupSize[0] * this.innerElementSize, this.workgroupSize[1]);
            this.fitAOuter = dimAOuter % this.tileAOuter === 0;
            this.fitBOuter = dimBOuter % this.tileBOuter === 0;
            this.fitInner = dimInner % this.tileInner === 0;
            this.shaderKey = "conv2DMM_".concat(this.elementsPerThread, "_").concat(this.activation, "}_").concat(this.fitAOuter, "_").concat(this.fitBOuter, "_").concat(this.fitInner, "_").concat(this.isVec4, "_").concat(this.innerElementSize, "_").concat(this.isChannelsLast, "_").concat(this.sequentialAccessByThreads);
        }
        Conv2DMMProgram.prototype.getUserCode = function () {
            var matMulSource = this.isVec4 ?
                makeMatMulPackedVec4Source(this.elementsPerThread, this.workgroupSize, !this.isChannelsLast, this.tileInner) :
                makeMatMulPackedSource(this.elementsPerThread, this.workgroupSize, !this.isChannelsLast, this.tileInner, false, null, this.sequentialAccessByThreads);
            var elementsSize = this.isVec4 ? [this.innerElementSize, 4, 4] : [1, 1, 1];
            var userCode = "\n    ".concat(conv2dCommonSnippet(this.isChannelsLast, this.fitAOuter, this.fitBOuter, this.fitInner, this.addBias, this.activation, this.hasPreluActivationWeights, elementsSize[0], elementsSize[1], elementsSize[2]), "\n    ").concat(matMulSource, "\n  ");
            return userCode;
        };
        return Conv2DMMProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var Conv2DNaiveProgram = /** @class */ (function () {
        function Conv2DNaiveProgram(convInfo, addBias, activation, hasPreluActivationWeights) {
            if (addBias === void 0) { addBias = false; }
            if (activation === void 0) { activation = null; }
            if (hasPreluActivationWeights === void 0) { hasPreluActivationWeights = false; }
            this.variableNames = ['x', 'W'];
            this.uniforms = 'filterDims: vec2<i32>, pads: vec2<i32>, strides: vec2<i32>, dilations: vec2<i32>,';
            this.workgroupSize = [4, 4, 8];
            this.outputShape = convInfo.outShape;
            this.isChannelsLast = convInfo.dataFormat === 'channelsLast';
            this.dispatchLayout = this.isChannelsLast ? { x: [2], y: [1], z: [0, 3] } :
                { x: [3], y: [2], z: [0, 1] };
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.addBias = addBias;
            this.activation = activation;
            this.hasPreluActivationWeights = hasPreluActivationWeights;
            if (addBias) {
                this.variableNames.push('bias');
            }
            if (hasPreluActivationWeights) {
                this.variableNames.push('preluActivationWeights');
            }
            this.shaderKey = "conv2dnaive_".concat(this.activation, "_").concat(this.isChannelsLast);
        }
        Conv2DNaiveProgram.prototype.getUserCode = function () {
            var userCode = "\n       ".concat(activationFnSnippet(this.activation, this.hasPreluActivationWeights, false, 4), "\n       fn readInp(batch : i32, row : i32, col : i32, chan : i32) -> f32{\n         let coords = vec4<i32>(batch, row, col, chan);\n         if (coordsInBounds4D(coords, uniforms.xShape)) {\n           return  getX(batch, row, col, chan);\n         } else {\n          return 0.0;\n         }\n       }\n       fn readFilt(row : i32, col : i32, xChannel : i32, outChannel : i32) -> f32{\n         let coords = vec4<i32>(row, col, xChannel, outChannel);\n         if(coordsInBounds4D(coords, uniforms.wShape)) {\n           return getW(row, col, xChannel, outChannel);\n          } else {\n            return 0.0;\n          }\n       }\n       fn writeResult(batch : i32, row : i32, col : i32, chan : i32, valueIn : f32) {\n         let coords = ").concat(this.isChannelsLast ? "vec4<i32>(batch, row, col, chan);" :
                "vec4<i32>(batch, chan, row, col);", "\n         if (coordsInBounds4D(coords, uniforms.outShape)) {\n           var value = valueIn;\n           ").concat(biasActivationSnippet(this.addBias, this.activation), "\n           setOutputAtCoords(coords.x, coords.y, coords.z, coords.w, value);\n         }\n       }\n       ").concat(getMainHeaderString('index'), " {\n         let coords = getOutputCoords();\n         let batch = coords[0];\n         let outChannel = ").concat(this.isChannelsLast ? "coords[3];" : "coords[1];", "\n         let outRow = ").concat(this.isChannelsLast ? "coords[1];" : "coords[2];", "\n         let outCol = ").concat(this.isChannelsLast ? "coords[2];" : "coords[3];", "\n         var acc : f32 = 0.0;\n         for (var row = 0; row < uniforms.filterDims[0]; row = row + 1) {\n           for (var col = 0; col < uniforms.filterDims[1]; col = col + 1) {\n             let xRow = outRow * uniforms.strides[0] + uniforms.dilations[0] * row - uniforms.pads[0];\n             let xCol = outCol * uniforms.strides[1] + uniforms.dilations[1] * col - uniforms.pads[1];\n             for (var xChannel = 0; xChannel < ").concat(this.isChannelsLast ? "uniforms.xShape[3];" :
                "uniforms.xShape[1];", " xChannel = xChannel + 1) {\n               ").concat(this.isChannelsLast ? "let v = readInp(batch, xRow, xCol, xChannel);" :
                "let v = readInp(batch, xChannel, xRow, xCol);", "\n               let f = readFilt(row, col, xChannel, outChannel);\n               acc = acc + v * f;\n             }\n           }\n         }\n         writeResult(batch, outRow, outCol, outChannel, acc);\n       }\n     ");
            return userCode;
        };
        return Conv2DNaiveProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var Im2ColProgram = /** @class */ (function () {
        function Im2ColProgram(outputShape, isChannelsLast) {
            this.variableNames = ['x'];
            this.uniforms = "pads : vec2<i32>, strides : vec2<i32>, dilations : vec2<i32>, outWidth : i32, itemsPerBlockRow : i32,\n       inChannels : i32,";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.isChannelsLast = isChannelsLast;
            this.shaderKey = "im2col_".concat(this.isChannelsLast);
        }
        Im2ColProgram.prototype.getUserCode = function () {
            var rowDim = this.isChannelsLast ? 1 : 2;
            var colDim = this.isChannelsLast ? 2 : 3;
            var row = this.isChannelsLast ? 'coords[1]' : 'coords[2]';
            var col = this.isChannelsLast ? 'coords[2]' : 'coords[1]';
            var getXSnippet = this.isChannelsLast ? 'getX(batch, xRow, xCol, ch)' :
                'getX(batch, ch, xRow, xCol)';
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      let coords = getCoordsFromIndex(index);\n      if(index < uniforms.size) {\n        let batch = coords[0];\n        let row = ").concat(row, ";\n        let col = ").concat(col, ";\n        let offsetY = (row / uniforms.outWidth) * uniforms.strides[0] - uniforms.pads[0];\n        let xRow = offsetY + uniforms.dilations[0] * (col / uniforms.itemsPerBlockRow);\n        var value = 0.0;\n        if(xRow < uniforms.xShape[").concat(rowDim, "] && xRow >= 0) {\n          let offsetX = (row % uniforms.outWidth) * uniforms.strides[1] -\n              uniforms.pads[1];\n          let xCol = offsetX + uniforms.dilations[1] * ((col %\n              uniforms.itemsPerBlockRow) / uniforms.inChannels);\n          let ch = col % uniforms.inChannels;\n          if(xCol < uniforms.xShape[").concat(colDim, "] && xCol >= 0) {\n            value = ").concat(getXSnippet, ";\n          }\n        }\n        setOutputAtIndex(index, value);\n      }\n    }\n   ");
            return userCode;
        };
        return Im2ColProgram;
    }());

    // conv2dByMatMul fuses height and width into one dimension to compute
    // batchMatMul, so bias and activation weights are also supposed to fuse the two
    // dimensions into one.
    //
    // This function computes the target shape for fusing height and width
    // dimensions. Returning null means the shape is already compatible.
    function getShapeForBatchMatMul(shape, isChannelsLast) {
        var length = shape.length;
        if (length >= 3) {
            return isChannelsLast ? __spreadArray(__spreadArray([], __read(shape.slice(0, -3) /* batch */), false), [
                shape[length - 3] * shape[length - 2] /* height * width */,
                shape[length - 1] /* channel */
            ], false) : __spreadArray(__spreadArray([], __read(shape.slice(0, -3) /* batch */), false), [
                shape[length - 3] /* channel */,
                shape[length - 2] * shape[length - 1] /* height * width */
            ], false);
        }
        else if (!isChannelsLast && length === 1 && shape[0] > 1) {
            return [shape[0], 1];
        }
        else {
            return null;
        }
    }
    // For 1x1 kernels that iterate through every point in the input, convolution
    // can be expressed as matrix multiplication (without need for memory
    // remapping).
    function conv2dByMatMul(_a) {
        var e_1, _b;
        var x = _a.x, filter = _a.filter, convInfo = _a.convInfo, backend = _a.backend, _c = _a.bias, bias = _c === void 0 ? null : _c, _d = _a.preluActivationWeights, preluActivationWeights = _d === void 0 ? null : _d, _e = _a.leakyreluAlpha, leakyreluAlpha = _e === void 0 ? 0 : _e, _f = _a.activation, activation = _f === void 0 ? null : _f;
        var isChannelsLast = convInfo.dataFormat === 'channelsLast';
        var transposeA = isChannelsLast ? false : true;
        var transposeB = false;
        var sameSize = isChannelsLast &&
            convInfo.filterHeight === convInfo.inHeight &&
            convInfo.filterWidth === convInfo.inWidth &&
            convInfo.padInfo.type === 'VALID';
        var intermediates = [];
        var xReshaped;
        var filterReshaped;
        if (sameSize) {
            var sharedDim = convInfo.inHeight * convInfo.inWidth * convInfo.inChannels;
            xReshaped = reshape({
                inputs: { x: x },
                backend: backend,
                attrs: { shape: [1, convInfo.batchSize, sharedDim] }
            });
            filterReshaped = reshape({
                inputs: { x: filter },
                backend: backend,
                attrs: { shape: [1, sharedDim, convInfo.outChannels] }
            });
        }
        else {
            xReshaped = reshape({
                inputs: { x: x },
                backend: backend,
                attrs: {
                    shape: isChannelsLast ?
                        [
                            convInfo.batchSize, convInfo.inHeight * convInfo.inWidth,
                            convInfo.inChannels
                        ] :
                        [
                            convInfo.batchSize, convInfo.inChannels,
                            convInfo.inHeight * convInfo.inWidth
                        ]
                }
            });
            filterReshaped = reshape({
                inputs: { x: filter },
                backend: backend,
                attrs: { shape: [1, convInfo.inChannels, convInfo.outChannels] }
            });
        }
        intermediates.push(xReshaped);
        intermediates.push(filterReshaped);
        if (preluActivationWeights != null) {
            var targetShape = getShapeForBatchMatMul(preluActivationWeights.shape, isChannelsLast);
            if (targetShape != null) {
                preluActivationWeights = reshape({
                    inputs: { x: preluActivationWeights },
                    backend: backend,
                    attrs: { shape: targetShape }
                });
                intermediates.push(preluActivationWeights);
            }
        }
        if (bias != null) {
            var targetShape = getShapeForBatchMatMul(bias.shape, isChannelsLast);
            if (targetShape != null) {
                bias = reshape({ inputs: { x: bias }, backend: backend, attrs: { shape: targetShape } });
                intermediates.push(bias);
            }
        }
        var result = batchMatMulImpl({
            a: isChannelsLast ? xReshaped : filterReshaped,
            b: isChannelsLast ? filterReshaped : xReshaped,
            transposeA: transposeA,
            transposeB: transposeB,
            backend: backend,
            bias: bias,
            activation: activation,
            preluActivationWeights: preluActivationWeights,
            leakyreluAlpha: leakyreluAlpha
        });
        var out = reshape({ inputs: { x: result }, backend: backend, attrs: { shape: convInfo.outShape } });
        intermediates.push(result);
        try {
            for (var intermediates_1 = __values(intermediates), intermediates_1_1 = intermediates_1.next(); !intermediates_1_1.done; intermediates_1_1 = intermediates_1.next()) {
                var i = intermediates_1_1.value;
                backend.disposeData(i.dataId);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (intermediates_1_1 && !intermediates_1_1.done && (_b = intermediates_1.return)) _b.call(intermediates_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return out;
    }
    // Implements the im2col algorithm as outlined in "High Performance
    // Convolutional Neural Networks for Document Processing" (Suvisoft, 2006)
    function conv2dWithIm2Col(_a) {
        var e_2, _b;
        var x = _a.x, filter = _a.filter, convInfo = _a.convInfo, backend = _a.backend, _c = _a.bias, bias = _c === void 0 ? null : _c, _d = _a.preluActivationWeights, preluActivationWeights = _d === void 0 ? null : _d, _e = _a.leakyreluAlpha, leakyreluAlpha = _e === void 0 ? 0 : _e, _f = _a.activation, activation = _f === void 0 ? null : _f;
        // Rearranges conv2d input so each block to be convolved over forms the
        // row of a new matrix with shape [outHeight * outWidth,
        // filterWidth * filterHeight * inChannels]. The filter is also rearranged so
        // each output channel forms a col of a new matrix with shape [
        // filterWidth * filterHeight * inChannels, outChannels]. The convolution is
        // then computed by multiplying these matrices and reshaping the result.
        var filterWidth = convInfo.filterWidth, filterHeight = convInfo.filterHeight, inChannels = convInfo.inChannels, strideWidth = convInfo.strideWidth, strideHeight = convInfo.strideHeight, padInfo = convInfo.padInfo, outWidth = convInfo.outWidth, outHeight = convInfo.outHeight, dilationWidth = convInfo.dilationWidth, dilationHeight = convInfo.dilationHeight, dataFormat = convInfo.dataFormat;
        var isChannelsLast = dataFormat === 'channelsLast';
        var sharedDim = filterWidth * filterHeight * inChannels;
        var numCols = outHeight * outWidth;
        var x2ColShape = isChannelsLast ? [convInfo.batchSize, numCols, sharedDim] :
            [convInfo.batchSize, sharedDim, numCols];
        var im2ColProgram = new Im2ColProgram(x2ColShape, isChannelsLast);
        var dimensions = [
            { type: 'int32', data: [padInfo.top, padInfo.left] },
            { type: 'int32', data: [strideHeight, strideWidth] },
            { type: 'int32', data: [dilationHeight, dilationWidth] },
            { type: 'int32', data: [outWidth] },
            { type: 'int32', data: [inChannels * filterWidth] },
            { type: 'int32', data: [inChannels] }
        ];
        var x2Col = backend.runWebGPUProgram(im2ColProgram, [x], x.dtype, dimensions);
        var intermediates = [];
        intermediates.push(x2Col);
        var filterReshaped = reshape({ inputs: { x: filter }, backend: backend, attrs: { shape: [1, sharedDim, -1] } });
        intermediates.push(filterReshaped);
        if (preluActivationWeights != null) {
            var targetShape = getShapeForBatchMatMul(preluActivationWeights.shape, isChannelsLast);
            if (targetShape != null) {
                preluActivationWeights = reshape({
                    inputs: { x: preluActivationWeights },
                    backend: backend,
                    attrs: { shape: targetShape }
                });
                intermediates.push(preluActivationWeights);
            }
        }
        if (bias != null) {
            var targetShape = getShapeForBatchMatMul(bias.shape, isChannelsLast);
            if (targetShape != null) {
                bias = reshape({ inputs: { x: bias }, backend: backend, attrs: { shape: targetShape } });
                intermediates.push(bias);
            }
        }
        var transposeA = isChannelsLast ? false : true;
        var transposeB = false;
        var result = batchMatMulImpl({
            a: isChannelsLast ? x2Col : filterReshaped,
            b: isChannelsLast ? filterReshaped : x2Col,
            transposeA: transposeA,
            transposeB: transposeB,
            backend: backend,
            bias: bias,
            activation: activation,
            preluActivationWeights: preluActivationWeights,
            leakyreluAlpha: leakyreluAlpha
        });
        var out = reshape({ inputs: { x: result }, backend: backend, attrs: { shape: convInfo.outShape } });
        intermediates.push(result);
        try {
            for (var intermediates_2 = __values(intermediates), intermediates_2_1 = intermediates_2.next(); !intermediates_2_1.done; intermediates_2_1 = intermediates_2.next()) {
                var i = intermediates_2_1.value;
                backend.disposeData(i.dataId);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (intermediates_2_1 && !intermediates_2_1.done && (_b = intermediates_2.return)) _b.call(intermediates_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return out;
    }
    function conv2DImpl(_a) {
        var e_3, _b;
        var x = _a.x, filter = _a.filter, convInfo = _a.convInfo, backend = _a.backend, _c = _a.bias, bias = _c === void 0 ? null : _c, _d = _a.preluActivationWeights, preluActivationWeights = _d === void 0 ? null : _d, _e = _a.leakyreluAlpha, leakyreluAlpha = _e === void 0 ? 0 : _e, _f = _a.activation, activation = _f === void 0 ? null : _f;
        var hasBias = bias != null;
        var hasPreluActivationWeights = preluActivationWeights != null;
        var isChannelsLast = convInfo.dataFormat === 'channelsLast';
        var sameSize = isChannelsLast &&
            convInfo.filterHeight === convInfo.inHeight &&
            convInfo.filterWidth === convInfo.inWidth &&
            convInfo.padInfo.type === 'VALID';
        var useNaiveConv2d = tf.env().getBool('WEBGPU_USE_NAIVE_CONV2D_DEBUG');
        if (!useNaiveConv2d &&
            (sameSize ||
                (convInfo.filterHeight === 1 && convInfo.filterWidth === 1 &&
                    convInfo.dilationHeight === 1 && convInfo.dilationWidth === 1 &&
                    convInfo.strideHeight === 1 && convInfo.strideWidth === 1 &&
                    (convInfo.padInfo.type === 'SAME' ||
                        convInfo.padInfo.type === 'VALID')))) {
            return conv2dByMatMul({
                x: x,
                filter: filter,
                convInfo: convInfo,
                backend: backend,
                bias: bias,
                activation: activation,
                preluActivationWeights: preluActivationWeights,
                leakyreluAlpha: leakyreluAlpha
            });
        }
        var thresholdFlagValue = tf.env().getNumber('WEBGPU_THRESHOLD_TO_INCREASE_WORKGROUPS_FOR_MATMUL');
        var thresholdToIncreaseWorkgroups = thresholdFlagValue > -1 ?
            thresholdFlagValue :
            backend.thresholdToIncreaseWorkgroups;
        var workgroupsBy32x32 = convInfo.batchSize *
            Math.ceil((convInfo.outHeight * convInfo.outWidth) / 32) *
            Math.ceil(convInfo.outChannels / 32);
        if (tf.env().getBool('WEBGPU_CONV_SEPARATE_IM2COL_SHADER') ||
            workgroupsBy32x32 <= thresholdToIncreaseWorkgroups) {
            return conv2dWithIm2Col({
                x: x,
                filter: filter,
                convInfo: convInfo,
                backend: backend,
                bias: bias,
                preluActivationWeights: preluActivationWeights,
                leakyreluAlpha: leakyreluAlpha,
                activation: activation
            });
        }
        var program;
        var padInfo = [convInfo.padInfo.top, convInfo.padInfo.left];
        var dimensions = [
            { type: 'int32', data: [convInfo.filterHeight, convInfo.filterWidth] },
            { type: 'int32', data: __spreadArray([], __read(padInfo), false) },
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] },
            { type: 'int32', data: [convInfo.dilationHeight, convInfo.dilationWidth] }
        ];
        if (useNaiveConv2d) {
            program = new Conv2DNaiveProgram(convInfo, hasBias, activation, hasPreluActivationWeights);
        }
        else {
            var dimAOuter = isChannelsLast ? convInfo.outHeight * convInfo.outWidth :
                convInfo.outChannels;
            var dimBOuter = isChannelsLast ? convInfo.outChannels :
                convInfo.outHeight * convInfo.outWidth;
            var dimInner = convInfo.filterHeight * convInfo.filterWidth * convInfo.inChannels;
            dimensions.push({ type: 'int32', data: [dimAOuter] }, { type: 'int32', data: [dimBOuter] }, { type: 'int32', data: [dimInner] });
            // Experiments show that sequential access is more friendly for Intel GPUs.
            var sequentialAccessByThreads = backend.adapterInfo.isIntel();
            program = new Conv2DMMProgram(convInfo, dimAOuter, dimBOuter, dimInner, hasBias, activation, hasPreluActivationWeights, sequentialAccessByThreads);
        }
        var intermediates = [];
        var inputVar = [x, filter];
        if (hasBias) {
            if (!isChannelsLast && bias.shape.length === 1) {
                bias = reshape({ inputs: { x: bias }, backend: backend, attrs: { shape: [bias.shape[0], 1, 1] } });
                intermediates.push(bias);
            }
            inputVar.push(bias);
        }
        if (hasPreluActivationWeights) {
            if (!isChannelsLast && preluActivationWeights.shape.length === 1) {
                preluActivationWeights = reshape({
                    inputs: { x: preluActivationWeights },
                    backend: backend,
                    attrs: { shape: [preluActivationWeights.shape[0], 1, 1] }
                });
                intermediates.push(preluActivationWeights);
            }
            inputVar.push(preluActivationWeights);
        }
        if (activation === 'leakyrelu') {
            dimensions.push({ type: 'float32', data: [leakyreluAlpha] });
            program.uniforms += ' alpha : f32,';
        }
        var out = backend.runWebGPUProgram(program, inputVar, x.dtype, dimensions);
        try {
            for (var intermediates_3 = __values(intermediates), intermediates_3_1 = intermediates_3.next(); !intermediates_3_1.done; intermediates_3_1 = intermediates_3.next()) {
                var i = intermediates_3_1.value;
                backend.disposeData(i.dataId);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (intermediates_3_1 && !intermediates_3_1.done && (_b = intermediates_3.return)) _b.call(intermediates_3);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return out;
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function conv2d(args) {
        var inputs = args.inputs, attrs = args.attrs, backend = args.backend;
        var x = inputs.x, filter = inputs.filter;
        var strides = attrs.strides, pad = attrs.pad, dataFormat = attrs.dataFormat, dilations = attrs.dilations, dimRoundingMode = attrs.dimRoundingMode;
        var $dataFormat = tf.backend_util.convertConv2DDataFormat(dataFormat);
        var convInfo = tf.backend_util.computeConv2DInfo(x.shape, filter.shape, strides, dilations, pad, dimRoundingMode, false /* depthwise */, $dataFormat);
        return conv2DImpl({ x: x, filter: filter, convInfo: convInfo, backend: backend });
    }
    var conv2DConfig = {
        kernelName: tf.Conv2D,
        backendName: 'webgpu',
        kernelFunc: conv2d
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var Conv2DDerInputProgram = /** @class */ (function () {
        function Conv2DDerInputProgram(convInfo) {
            this.variableNames = ['dy', 'W'];
            this.uniforms = 'filterDims : vec2<i32>, pads : vec2<i32>, strides : vec2<i32>, outBackprop : vec4<i32>,';
            this.workgroupSize = [64, 1, 1];
            this.size = false;
            this.isVec4 = false;
            this.workPerThread = 1;
            this.outputShape = convInfo.inShape;
            this.isChannelsLast = convInfo.dataFormat === 'channelsLast';
            this.isVec4 = this.isChannelsLast && convInfo.outChannels % 4 === 0 &&
                convInfo.inChannels % 4 === 0;
            if (this.isVec4) {
                // TODO: Expand to any value.
                this.workPerThread = 2;
                this.outputComponent = 4;
                this.workgroupSize = [4, 4, 4];
                this.dispatchLayout = { x: [3], y: [2], z: [0, 1] };
                this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [4, this.workPerThread, 1]);
            }
            else {
                this.size = true;
                this.workPerThread = 1;
                this.workgroupSize = [64, 1, 1];
                this.dispatchLayout = flatDispatchLayout(this.outputShape);
                this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            }
            this.shaderKey = "conv2DDerInput_".concat(this.isChannelsLast, "_").concat(this.isVec4, "_").concat(this.workPerThread);
        }
        Conv2DDerInputProgram.prototype.getUserCode = function () {
            var rowDim = this.isChannelsLast ? 1 : 2;
            var colDim = this.isChannelsLast ? 2 : 3;
            var channelDim = this.isChannelsLast ? 3 : 1;
            var vec4Snippet = "\n    ".concat(getMainHeaderString(), " {\n      let batch = i32(globalId.z) / uniforms.outShape[1];\n      let r = i32(globalId.z) % uniforms.outShape[1];\n      let c = i32(globalId.y) * ").concat(this.workPerThread, ";\n      let d1 = i32(globalId.x) * 4;\n\n      let dyCorner = vec2<i32>(r, c) - uniforms.pads;\n\n      // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).\n      // ? = to be determined. : = across all values in that axis.\n      var dotProd: array<vec4<f32>, ").concat(this.workPerThread, ">;\n      for (var i = 0; i < ").concat(this.workPerThread, "; i++) {\n        dotProd[i] = vec4<f32>(0.0);\n      }\n      for (var wR = 0; wR < uniforms.filterDims.x; wR = wR + 1) {\n        let dyR = f32(dyCorner.x + wR) / f32(uniforms.strides.x);\n        let wRPerm = uniforms.filterDims.x - 1 - wR;\n        if (dyR < 0.0 || dyR >= f32(uniforms.outBackprop[1]) ||\n            fract(dyR) > 0.0) {\n          continue;\n        }\n        let idyR = i32(dyR);\n\n        for (var wC = 0; wC < uniforms.filterDims.y; wC = wC + 1) {\n          let dyC = f32(dyCorner.y + wC) / f32(uniforms.strides.y);\n          let dyC2 = f32(dyCorner.y + 1 + wC) / f32(uniforms.strides.y);\n          let wCPerm = uniforms.filterDims.y - 1 - wC;\n          var bDyCVal = true;\n          var bDyCVal2 = true;\n          if (dyC < 0.0 || dyC >= f32(uniforms.outBackprop[2]) ||\n              fract(dyC) > 0.0) {\n            bDyCVal = false;\n          }\n          if (dyC2 < 0.0 || dyC2 >= f32(uniforms.outBackprop[2]) ||\n              fract(dyC2) > 0.0) {\n            bDyCVal2 = false;\n          }\n\n          let idyC = i32(dyC);\n          let idyC2 = i32(dyC2);\n          if (bDyCVal && bDyCVal2) {\n            let d2Length = uniforms.outBackprop[3];\n            for (var d2 = 0; d2 < d2Length; d2 = d2 + 4) {\n              let wValue0 = getW(wRPerm, wCPerm, d1, d2);\n              let wValue1 = getW(wRPerm, wCPerm, d1 + 1, d2);\n              let wValue2 = getW(wRPerm, wCPerm, d1 + 2, d2);\n              let wValue3 = getW(wRPerm, wCPerm, d1 + 3, d2);\n              var xValue =  getDy(batch, idyR, idyC, d2);\n              let tmpval = vec4<f32>(dot(xValue, wValue0),\n                                     dot(xValue, wValue1),\n                                     dot(xValue, wValue2),\n                                     dot(xValue, wValue3));\n              dotProd[0] = dotProd[0] + tmpval;\n              xValue = getDy(batch, idyR, idyC2, d2);\n              dotProd[1] = dotProd[1] + vec4<f32>(dot(xValue, wValue0),\n                                                  dot(xValue, wValue1),\n                                                  dot(xValue, wValue2),\n                                                  dot(xValue, wValue3));\n            }\n          } else if (bDyCVal) {\n            let d2Length = uniforms.outBackprop[3];\n            for (var d2 = 0; d2 < d2Length; d2 = d2 + 4) {\n              let wValue0 = getW(wRPerm, wCPerm, d1, d2);\n              let wValue1 = getW(wRPerm, wCPerm, d1 + 1, d2);\n              let wValue2 = getW(wRPerm, wCPerm, d1 + 2, d2);\n              let wValue3 = getW(wRPerm, wCPerm, d1 + 3, d2);\n              var xValue =  getDy(batch, idyR, idyC, d2);\n              let tmpval = vec4<f32>(dot(xValue, wValue0),\n                                     dot(xValue, wValue1),\n                                     dot(xValue, wValue2),\n                                     dot(xValue, wValue3));\n              dotProd[0] = dotProd[0] + tmpval;\n            }\n          } else if (bDyCVal2) {\n            let d2Length = uniforms.outBackprop[3];\n            for (var d2 = 0; d2 < d2Length; d2 = d2 + 4) {\n              let wValue0 = getW(wRPerm, wCPerm, d1, d2);\n              let wValue1 = getW(wRPerm, wCPerm, d1 + 1, d2);\n              let wValue2 = getW(wRPerm, wCPerm, d1 + 2, d2);\n              let wValue3 = getW(wRPerm, wCPerm, d1 + 3, d2);\n              var xValue =  getDy(batch, idyR, idyC2, d2);\n              let tmpval = vec4<f32>(dot(xValue, wValue0),\n                                     dot(xValue, wValue1),\n                                     dot(xValue, wValue2),\n                                     dot(xValue, wValue3));\n              dotProd[1] = dotProd[1] + tmpval;\n            }\n          }\n        }\n      }\n\n      for (var i = 0; i < ").concat(this.workPerThread, "; i = i + 1) {\n        let coords = vec4<i32>(batch, r, c + i, d1);\n        if (coordsInBounds4D(coords, uniforms.outShape)) {\n          setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], dotProd[i]);\n        }\n      }\n    }\n    ");
            return this.isVec4 ?
                "\n    ".concat(vec4Snippet, "\n    ") :
                "\n    ".concat(getMainHeaderString('index'), " {\n      if(index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let batch = coords[0];\n        let d1 = coords[").concat(channelDim, "];\n\n        let dyCorner = vec2<i32>(coords[").concat(rowDim, "], coords[").concat(colDim, "]) - uniforms.pads;\n        let dyRCorner = dyCorner.x;\n        let dyCCorner = dyCorner.y;\n\n        // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).\n        // ? = to be determined. : = across all values in that axis.\n        var dotProd = 0.0;\n        for (var wR = 0; wR < uniforms.filterDims.x; wR = wR + 1) {\n          let dyR = (f32(dyRCorner) + f32(wR)) / f32(uniforms.strides.x);\n          let wRPerm = uniforms.filterDims.x - 1 - wR;\n          if (dyR < 0.0 || dyR >= f32(uniforms.outBackprop[1]) || fract(dyR) > 0.0 ||\n              wRPerm < 0) {\n            continue;\n          }\n          let idyR = i32(dyR);\n\n          for (var wC = 0; wC < uniforms.filterDims.y; wC = wC + 1) {\n            let dyC = (f32(dyCCorner) + f32(wC)) / f32(uniforms.strides.y);\n            let wCPerm = uniforms.filterDims.y - 1 - wC;\n            if (dyC < 0.0 || dyC >= f32(uniforms.outBackprop[2]) ||\n                fract(dyC) > 0.0 || wCPerm < 0) {\n              continue;\n            }\n            let idyC = i32(dyC);\n\n            for (var d2 = 0; d2 < uniforms.outBackprop[3]; d2 = d2 + 1) {\n              let xValue = ").concat(this.isChannelsLast ? 'getDy(batch, idyR, idyC, d2)' :
                    'getDy(batch, d2, idyR, idyC)', ";\n              let wValue = getW(wRPerm, wCPerm, d1, d2);\n              dotProd = dotProd + xValue * wValue;\n            }\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n  ");
        };
        return Conv2DDerInputProgram;
    }());
    var Conv2DDerFilterProgram = /** @class */ (function () {
        function Conv2DDerFilterProgram(convInfo) {
            this.variableNames = ['x', 'dy'];
            this.uniforms = 'pads : vec2<i32>, strides : vec2<i32>, batchSize : i32, outHeight : i32, outWidth : i32, inHeight : i32, inWidth : i32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.filterShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.isChannelsLast = convInfo.dataFormat === 'channelsLast';
            this.shaderKey = "conv2DDerFilter_".concat(this.isChannelsLast);
        }
        Conv2DDerFilterProgram.prototype.getUserCode = function () {
            return "\n    ".concat(getMainHeaderString('index'), " {\n      if(index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let wR = coords[0];\n        let wC = coords[1];\n        let d1 = coords[2];\n        let d2 = coords[3];\n\n        // Convolve x(?, ?, d1) with dy(:, :, d2) to get dw(wR, wC, d1, d2).\n        // ? = to be determined. : = across all values in that axis.\n        var dotProd = 0.0;\n        for (var b = 0; b < uniforms.batchSize; b = b + 1) {\n          for (var yR = 0; yR < uniforms.outHeight; yR = yR + 1) {\n            let xR = wR + yR * uniforms.strides[0] - uniforms.pads[0];\n            if (xR < 0 || xR >= uniforms.inHeight) {\n              continue;\n            }\n\n            for (var yC = 0; yC < uniforms.outWidth; yC = yC + 1) {\n              let xC = wC + yC * uniforms.strides[1] - uniforms.pads[1];\n\n              if (xC < 0 || xC >= uniforms.inWidth) {\n                continue;\n              }\n\n              if (").concat(this.isChannelsLast, ") {\n                let dyValue = getDy(b, yR, yC, d2);\n                let xValue = getX(b, xR, xC, d1);\n                dotProd = dotProd + xValue * dyValue;\n              } else {\n                let dyValue = getDy(b, d2, yR, yC);\n                let xValue = getX(b, d1, xR, xC);\n                dotProd = dotProd + xValue * dyValue;\n              }\n            }\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n  ");
        };
        return Conv2DDerFilterProgram;
    }());
    var Conv3DDerFilterProgram = /** @class */ (function () {
        function Conv3DDerFilterProgram(convInfo) {
            this.variableNames = ['x', 'dy'];
            this.uniforms = "pads : vec3<i32>, strides : vec3<i32>, batchSize : i32, outDepth : i32,\n       outHeight : i32, outWidth : i32, inDepth : i32, inHeight : i32, inWidth : i32,";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.filterShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "conv3DDerFilter";
        }
        Conv3DDerFilterProgram.prototype.getUserCode = function () {
            return "\n    ".concat(getMainHeaderString('index'), " {\n      if(index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let wF = coords.x;\n        let wR = coords.y;\n        let wC = coords.z;\n        let d1 = coords.w;\n        let d2 = coords.u;\n\n        var dotProd = 0.0;\n        for (var b = 0; b < uniforms.batchSize; b++) {\n          for (var yF = 0; yF < uniforms.outDepth; yF++) {\n            let xF = wF + yF * uniforms.strides[0] - uniforms.pads[0];\n            if (xF < 0 || xF >= uniforms.inDepth) {\n              continue;\n            }\n\n            for (var yR = 0; yR < uniforms.outHeight; yR++) {\n              let xR = wR + yR * uniforms.strides[1] - uniforms.pads[1];\n              if (xR < 0 || xR >= uniforms.inHeight) {\n                continue;\n              }\n\n              for (var yC = 0; yC < uniforms.outWidth; yC++) {\n                let xC = wC + yC * uniforms.strides[2] - uniforms.pads[2];\n                if (xC < 0 || xC >= uniforms.inWidth) {\n                  continue;\n                }\n\n                let dyValue = getDy(b, yF, yR, yC, d2);\n                let xValue = getX(b, xF, xR, xC, d1);\n                dotProd += xValue * dyValue;\n              }\n            }\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n  ");
        };
        return Conv3DDerFilterProgram;
    }());
    var Conv3DDerInputProgram = /** @class */ (function () {
        function Conv3DDerInputProgram(convInfo) {
            this.variableNames = ['dy', 'W'];
            this.uniforms = "filterDims : vec3<i32>, pads : vec3<i32>, strides : vec3<i32>,\n      outDepth : i32, outHeight : i32, outWidth : i32, outChannels : i32,";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.inShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "conv3DDerInput";
        }
        Conv3DDerInputProgram.prototype.getUserCode = function () {
            return "\n    ".concat(getMainHeaderString('index'), " {\n      if(index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let batch = coords.x;\n        let d1 = coords.u;\n\n        let dyCorner = vec3<i32>(coords.y, coords.z, coords.w) - uniforms.pads;\n        let dyFCorner = dyCorner.x;\n        let dyRCorner = dyCorner.y;\n        let dyCCorner = dyCorner.z;\n\n        var dotProd = 0.0;\n        for (var wF = 0; wF < uniforms.filterDims[0]; wF++) {\n          let dyF = f32(dyFCorner + wF) / f32(uniforms.strides[0]);\n          if (dyF < 0.0 || dyF >= f32(uniforms.outDepth) || fract(dyF) > 0.0) {\n            continue;\n          }\n          let idyF = i32(dyF);\n\n          let wFPerm = uniforms.filterDims[0] - 1 - wF;\n\n          for (var wR = 0; wR < uniforms.filterDims[1]; wR++) {\n            let dyR = f32(dyRCorner + wR) / f32(uniforms.strides[1]);\n\n            if (dyR < 0.0 || dyR >= f32(uniforms.outHeight) || fract(dyR) > 0.0) {\n              continue;\n            }\n            let idyR = i32(dyR);\n\n            let wRPerm = uniforms.filterDims[1] - 1 - wR;\n\n            for (var wC = 0; wC < uniforms.filterDims[2]; wC++) {\n              let dyC = f32(dyCCorner + wC) / f32(uniforms.strides[2]);\n\n              if (dyC < 0.0 || dyC >= f32(uniforms.outWidth) || fract(dyC) > 0.0) {\n                continue;\n              }\n              let idyC = i32(dyC);\n\n              let wCPerm = uniforms.filterDims[2] - 1 - wC;\n\n              for (var d2 = 0; d2 < uniforms.outChannels; d2++) {\n                let xValue = getDy(batch, idyF, idyR, idyC, d2);\n                let wValue = getW(wFPerm, wRPerm, wCPerm, d1, d2);\n                dotProd += xValue * wValue;\n              }\n            }\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n  ");
        };
        return Conv3DDerInputProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function conv2DBackpropFilter(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, dy = inputs.dy;
        var strides = attrs.strides, pad = attrs.pad, dataFormat = attrs.dataFormat, dimRoundingMode = attrs.dimRoundingMode, filterShape = attrs.filterShape;
        var $dataFormat = tf.backend_util.convertConv2DDataFormat(dataFormat);
        var convInfo = tf.backend_util.computeConv2DInfo(x.shape, filterShape, strides, 1 /* dilations */, pad, dimRoundingMode, false /* depthwise */, $dataFormat);
        var program = new Conv2DDerFilterProgram(convInfo);
        var uniformData = [
            { type: 'int32', data: [convInfo.padInfo.top, convInfo.padInfo.left] },
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] },
            { type: 'int32', data: [convInfo.batchSize] },
            { type: 'int32', data: [convInfo.outHeight] },
            { type: 'int32', data: [convInfo.outWidth] },
            { type: 'int32', data: [convInfo.inHeight] },
            { type: 'int32', data: [convInfo.inWidth] }
        ];
        return backend.runWebGPUProgram(program, [x, dy], x.dtype, uniformData);
    }
    var conv2DBackpropFilterConfig = {
        kernelName: tf.Conv2DBackpropFilter,
        backendName: 'webgpu',
        kernelFunc: conv2DBackpropFilter
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function conv2dTransposeCommonSnippet(innerElementSize) {
        if (innerElementSize === void 0) { innerElementSize = 4; }
        var getWSnippet = function (innerElementSize) {
            switch (innerElementSize) {
                case 1:
                    return 'return W[getIndexFromCoords4D(coord, uniforms.wShape)];';
                case 4:
                    return "\n            let coord1 = vec4<i32>(coordX, coordY, col + 1, rowInner);\n            let coord2 = vec4<i32>(coordX, coordY, col + 2, rowInner);\n            let coord3 = vec4<i32>(coordX, coordY, col + 3, rowInner);\n            let v0 = W[getIndexFromCoords4D(coord, uniforms.wShape)];\n            let v1 = W[getIndexFromCoords4D(coord1, uniforms.wShape)];\n            let v2 = W[getIndexFromCoords4D(coord2, uniforms.wShape)];\n            let v3 = W[getIndexFromCoords4D(coord3, uniforms.wShape)];\n            return vec4<f32>(v0, v1, v2, v3);\n            ";
                default:
                    throw new Error("innerElementSize ".concat(innerElementSize, " is not supported."));
            }
        };
        var readASnippet = "\n      let outRow = row / uniforms.outShape[2];\n      let outCol = row % uniforms.outShape[2];\n\n      let WRow = col / (uniforms.filterDims[1] * uniforms.outBackprop[3]);\n      let WCol = col / uniforms.outBackprop[3] % uniforms.filterDims[1];\n      let xR = f32(outRow - uniforms.pads[0] + WRow) / f32(uniforms.strides[0]);\n      let xC = f32(outCol - uniforms.pads[1] + WCol) / f32(uniforms.strides[1]);\n      if (xR < 0.0 || xR >= f32(uniforms.outBackprop[1]) || fract(xR) > 0.0) {\n        return ".concat(typeSnippet(innerElementSize), "(0.0);\n      }\n      if (xC < 0.0 || xC >= f32(uniforms.outBackprop[2]) || fract(xC) > 0.0) {\n        return ").concat(typeSnippet(innerElementSize), "(0.0);\n      }\n      let coord = vec4<i32>(\n          batch,\n          i32(xR),\n          i32(xC),\n          col % uniforms.outBackprop[3]);\n      return x[getIndexFromCoords4D(coord, uniforms.xShape)/").concat(innerElementSize, "];");
        var sampleA = "if (row < uniforms.dimAOuter && col < uniforms.dimInner) {\n        ".concat(readASnippet, "\n      }\n      return ").concat(typeSnippet(innerElementSize), "(0.0);");
        var userCode = "\n  fn mm_readA(batch: i32, row : i32, col : i32) -> ".concat(typeSnippet(innerElementSize), " {\n    ").concat(sampleA, "\n  }\n\n  fn mm_readB(batch: i32, row : i32, col : i32) -> ").concat(typeSnippet(innerElementSize), " {\n    let coordX = uniforms.filterDims.x - 1 -\n        row / (uniforms.filterDims[1] * uniforms.outBackprop[3]);\n    let coordY = uniforms.filterDims.y - 1 -\n        (row / uniforms.outBackprop[3]) % uniforms.filterDims[1];\n    if (row < uniforms.dimInner && col < uniforms.dimBOuter &&\n        coordX >= 0 && coordY >= 0) {\n      let rowInner = row % uniforms.outBackprop[3];\n      let coord = vec4<i32>(coordX, coordY, col, rowInner);\n      ").concat(getWSnippet(innerElementSize), "\n    }\n    return ").concat(typeSnippet(innerElementSize), "(0.0);\n  }\n\n  fn mm_write(batch: i32, row : i32, col : i32, valueInput : ").concat(typeSnippet(innerElementSize), ") {\n    if (row < uniforms.dimAOuter && col < uniforms.dimBOuter) {\n      var value = valueInput;\n      let outCoord = vec4<i32>(\n          batch,\n          row / uniforms.outShape[2],\n          row % uniforms.outShape[2],\n          col);\n      result[getIndexFromCoords4D(outCoord, uniforms.outShape)/").concat(innerElementSize, "] = value;\n    }\n  }");
        return userCode;
    }
    var Conv2DDerInputMMProgram = /** @class */ (function () {
        function Conv2DDerInputMMProgram(convInfo) {
            this.variableNames = ['x', 'W'];
            this.uniforms = 'filterDims : vec2<i32>, pads : vec2<i32>, strides : vec2<i32>, outBackprop : vec4<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32,';
            this.outputShape = convInfo.inShape;
            tf.util.assert(convInfo.dataFormat === 'channelsLast', function () { return 'TODO: NCHW is unimplemented'; });
            this.isVec4 =
                convInfo.inChannels % 4 === 0 && convInfo.outChannels % 4 === 0;
            this.dispatchLayout = { x: [3], y: [1, 2], z: [0] };
            this.workgroupSize = computeWorkgroupSizeForConv2d(this.dispatchLayout, this.outputShape, this.isVec4);
            this.elementsPerThread = computeWorkPerThreadForConv2d(this.dispatchLayout, this.outputShape, this.isVec4);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, this.elementsPerThread);
            if (this.isVec4) {
                this.outputComponent = 4;
                this.variableComponents = [4, 1];
            }
            this.shaderKey =
                "conv2DDerInputMM_".concat(this.isVec4, "_").concat(this.elementsPerThread);
        }
        Conv2DDerInputMMProgram.prototype.getUserCode = function () {
            var matMulSource = this.isVec4 ?
                makeMatMulPackedVec4Source(this.elementsPerThread, this.workgroupSize) :
                makeMatMulPackedSource(this.elementsPerThread, this.workgroupSize);
            var userCode = "\n    ".concat(conv2dTransposeCommonSnippet(this.isVec4 ? 4 : 1), "\n    ").concat(matMulSource, "\n    ");
            return userCode;
        };
        return Conv2DDerInputMMProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function conv2DBackpropInput(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var dy = inputs.dy, filter = inputs.filter;
        var inputShape = attrs.inputShape, strides = attrs.strides, pad = attrs.pad, dataFormat = attrs.dataFormat, dimRoundingMode = attrs.dimRoundingMode;
        var $dataFormat = tf.backend_util.convertConv2DDataFormat(dataFormat);
        var convInfo = tf.backend_util.computeConv2DInfo(inputShape, filter.shape, strides, 1 /* dilations */, pad, dimRoundingMode, false, $dataFormat);
        var dimensions = [
            { type: 'int32', data: [convInfo.filterHeight, convInfo.filterWidth] },
            {
                type: 'int32',
                data: [
                    convInfo.filterHeight - 1 - convInfo.padInfo.top,
                    convInfo.filterWidth - 1 - convInfo.padInfo.left
                ]
            },
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] },
            {
                type: 'int32',
                data: [
                    convInfo.batchSize, convInfo.outHeight, convInfo.outWidth,
                    convInfo.outChannels
                ]
            },
        ];
        var program;
        // TODO: Experiment when to use Conv2DDerInputMMProgram algorithm.
        if (tf.env().getBool('WEBGPU_USE_NAIVE_CONV2D_TRANSPOSE') ||
            convInfo.dataFormat !== 'channelsLast') {
            program = new Conv2DDerInputProgram(convInfo);
        }
        else {
            program = new Conv2DDerInputMMProgram(convInfo);
            var dimAOuter = convInfo.inHeight * convInfo.inWidth;
            var dimBOuter = convInfo.inChannels;
            var dimInner = convInfo.filterHeight * convInfo.filterWidth * convInfo.outChannels;
            dimensions.push({ type: 'uint32', data: [dimAOuter] }, { type: 'uint32', data: [dimBOuter] }, { type: 'uint32', data: [dimInner] });
        }
        return backend.runWebGPUProgram(program, [dy, filter], 'float32', dimensions);
    }
    var conv2DBackpropInputConfig = {
        kernelName: tf.Conv2DBackpropInput,
        backendName: 'webgpu',
        kernelFunc: conv2DBackpropInput,
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var Conv3DNaiveProgram = /** @class */ (function () {
        function Conv3DNaiveProgram(convInfo) {
            this.variableNames = ['x', 'W'];
            this.uniforms = 'filterDims: vec3<i32>, pads: vec3<i32>, strides: vec3<i32>, dilations: vec3<i32>,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.outShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "conv3dnaive";
        }
        Conv3DNaiveProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getOutputCoords();\n        let batch = coords.x;\n        let d2 = coords.u;\n\n        let xFRCCorner = vec3<i32>(coords.y, coords.z, coords.w) * uniforms.strides - uniforms.pads;\n        let xFCorner = xFRCCorner.x;\n        let xRCorner = xFRCCorner.y;\n        let xCCorner = xFRCCorner.z;\n\n        let inputDepthNearestVec4 = (uniforms.xShape.u / 4) * 4;\n        let inputDepthVec4Remainder = uniforms.xShape.u % 4;\n\n        var dotProd = 0.0;\n        for (var wF = 0; wF < uniforms.filterDims[0]; wF++) {\n          let xF = xFCorner + wF * uniforms.dilations[0];\n          if (xF < 0 || xF >= uniforms.xShape.y) {\n            continue;\n          }\n\n          for (var wR = 0; wR < uniforms.filterDims[1]; wR++) {\n            let xR = xRCorner + wR * uniforms.dilations[1];\n            if (xR < 0 || xR >= uniforms.xShape.z) {\n              continue;\n            }\n\n            for (var wC = 0; wC < uniforms.filterDims[2]; wC++) {\n              let xC = xCCorner + wC * uniforms.dilations[2];\n              if (xC < 0 || xC >= uniforms.xShape.w) {\n                continue;\n              }\n\n              for (var d1 = 0; d1 < inputDepthNearestVec4; d1 += 4) {\n                let xValues = vec4<f32>(\n                  getX(batch, xF, xR, xC, d1),\n                  getX(batch, xF, xR, xC, d1 + 1),\n                  getX(batch, xF, xR, xC, d1 + 2),\n                  getX(batch, xF, xR, xC, d1 + 3)\n                );\n                let wValues = vec4<f32>(\n                  getW(wF, wR, wC, d1, d2),\n                  getW(wF, wR, wC, d1 + 1, d2),\n                  getW(wF, wR, wC, d1 + 2, d2),\n                  getW(wF, wR, wC, d1 + 3, d2)\n                );\n\n                dotProd += dot(xValues, wValues);\n              }\n\n              if (inputDepthVec4Remainder == 1) {\n                dotProd += getX(batch, xF, xR, xC, inputDepthNearestVec4) *\n                  getW(wF, wR, wC, inputDepthNearestVec4, d2);\n              } else if (inputDepthVec4Remainder == 2) {\n                let xValues = vec2<f32>(\n                  getX(batch, xF, xR, xC, inputDepthNearestVec4),\n                  getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1)\n                );\n                let wValues = vec2<f32>(\n                  getW(wF, wR, wC, inputDepthNearestVec4, d2),\n                  getW(wF, wR, wC, inputDepthNearestVec4 + 1, d2)\n                );\n                dotProd += dot(xValues, wValues);\n              } else if (inputDepthVec4Remainder == 3) {\n                let xValues = vec3<f32>(\n                  getX(batch, xF, xR, xC, inputDepthNearestVec4),\n                  getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),\n                  getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2)\n                );\n                let wValues = vec3<f32>(\n                  getW(wF, wR, wC, inputDepthNearestVec4, d2),\n                  getW(wF, wR, wC, inputDepthNearestVec4 + 1, d2),\n                  getW(wF, wR, wC, inputDepthNearestVec4 + 2, d2)\n                );\n                dotProd += dot(xValues, wValues);\n              }\n            }\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }");
            return userCode;
        };
        return Conv3DNaiveProgram;
    }());

    function conv3D(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, filter = inputs.filter;
        var strides = attrs.strides, pad = attrs.pad, dilations = attrs.dilations;
        var convInfo = tf.backend_util.computeConv3DInfo(x.shape, filter.shape, strides, dilations, pad);
        var padInfo = [convInfo.padInfo.front, convInfo.padInfo.top, convInfo.padInfo.left];
        var dimensions = [
            {
                type: 'int32',
                data: [convInfo.filterDepth, convInfo.filterHeight, convInfo.filterWidth]
            },
            { type: 'int32', data: __spreadArray([], __read(padInfo), false) }, {
                type: 'int32',
                data: [convInfo.strideDepth, convInfo.strideHeight, convInfo.strideWidth]
            },
            {
                type: 'int32',
                data: [
                    convInfo.dilationDepth, convInfo.dilationHeight, convInfo.dilationWidth
                ]
            }
        ];
        var program = new Conv3DNaiveProgram(convInfo);
        var dtype = tf.upcastType(x.dtype, filter.dtype);
        return backend.runWebGPUProgram(program, [x, filter], dtype, dimensions);
    }
    var conv3DConfig = {
        kernelName: tf.Conv3D,
        backendName: 'webgpu',
        kernelFunc: conv3D,
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function conv3DBackpropFilterV2(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, dy = inputs.dy;
        var strides = attrs.strides, pad = attrs.pad, filterShape = attrs.filterShape;
        var convInfo = tf.backend_util.computeConv3DInfo(x.shape, filterShape, strides, 1 /* dilations */, pad);
        var program = new Conv3DDerFilterProgram(convInfo);
        var uniformData = [
            {
                type: 'int32',
                data: [convInfo.padInfo.front, convInfo.padInfo.top, convInfo.padInfo.left]
            },
            {
                type: 'int32',
                data: [convInfo.strideDepth, convInfo.strideHeight, convInfo.strideWidth]
            },
            { type: 'int32', data: [convInfo.batchSize] },
            { type: 'int32', data: [convInfo.outDepth] },
            { type: 'int32', data: [convInfo.outHeight] },
            { type: 'int32', data: [convInfo.outWidth] },
            { type: 'int32', data: [convInfo.inDepth] },
            { type: 'int32', data: [convInfo.inHeight] },
            { type: 'int32', data: [convInfo.inWidth] }
        ];
        return backend.runWebGPUProgram(program, [x, dy], dy.dtype, uniformData);
    }
    var conv3DBackpropFilterV2Config = {
        kernelName: tf.Conv3DBackpropFilterV2,
        backendName: 'webgpu',
        kernelFunc: conv3DBackpropFilterV2
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function conv3DBackpropInputV2(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var dy = inputs.dy, filter = inputs.filter;
        var strides = attrs.strides, pad = attrs.pad, inputShape = attrs.inputShape;
        var convInfo = tf.backend_util.computeConv3DInfo(inputShape, filter.shape, strides, 1 /* dilations */, pad);
        var program = new Conv3DDerInputProgram(convInfo);
        var uniformData = [
            {
                type: 'int32',
                data: [convInfo.filterDepth, convInfo.filterHeight, convInfo.filterWidth]
            },
            {
                type: 'int32',
                data: [
                    convInfo.filterDepth - 1 - convInfo.padInfo.front,
                    convInfo.filterHeight - 1 - convInfo.padInfo.top,
                    convInfo.filterWidth - 1 - convInfo.padInfo.left
                ]
            },
            {
                type: 'int32',
                data: [convInfo.strideDepth, convInfo.strideHeight, convInfo.strideWidth]
            },
            { type: 'int32', data: [convInfo.outDepth] },
            { type: 'int32', data: [convInfo.outHeight] },
            { type: 'int32', data: [convInfo.outWidth] },
            { type: 'int32', data: [convInfo.outChannels] }
        ];
        return backend.runWebGPUProgram(program, [dy, filter], dy.dtype, uniformData);
    }
    var conv3DBackpropInputV2Config = {
        kernelName: tf.Conv3DBackpropInputV2,
        backendName: 'webgpu',
        kernelFunc: conv3DBackpropInputV2,
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var cos = unaryKernelFunc({ opType: UnaryOpType.COS });
    var cosConfig = {
        kernelName: tf.Cos,
        backendName: 'webgpu',
        kernelFunc: cos
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var cosh = unaryKernelFunc({ opType: UnaryOpType.COSH });
    var coshConfig = {
        kernelName: tf.Cosh,
        backendName: 'webgpu',
        kernelFunc: cosh
    };

    var CropAndResizeProgram = /** @class */ (function () {
        function CropAndResizeProgram(channnel, boxShape, cropSize, method) {
            this.variableNames = ['Image', 'Boxes', 'BoxInd'];
            this.uniforms = 'extrapolationValue : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            var _a = __read(boxShape, 1), numBoxes = _a[0];
            this.outputShape = [numBoxes, cropSize[0], cropSize[1], channnel];
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.methodId = method === 'bilinear' ? 1 : 0;
            this.cropHeightBiggerThan1 = this.outputShape[1] > 1;
            this.cropWidthBiggerThan1 = this.outputShape[2] > 1;
            this.shaderKey = "cropAndResize_".concat(this.methodId, "_").concat(this.cropHeightBiggerThan1, "_").concat(this.cropWidthBiggerThan1);
        }
        CropAndResizeProgram.prototype.getUserCode = function () {
            var _a = __read(["f32(uniforms.imageShape[1] - 1)", "f32(uniforms.imageShape[2] - 1)"], 2), inputHeightFloat = _a[0], inputWidthFloat = _a[1];
            var _b = __read(this.cropHeightBiggerThan1 ?
                [
                    "(".concat(inputHeightFloat, " / f32(uniforms.outShape[1] - 1))"),
                    '(y2-y1) * height_ratio',
                    "y1*".concat(inputHeightFloat, " + f32(y)*(height_scale)"),
                ] :
                [
                    '0.0',
                    '0.0',
                    "0.5 * (y1+y2) * ".concat(inputHeightFloat),
                ], 3), heightRatio = _b[0], heightScale = _b[1], inY = _b[2];
            var _c = __read(this.cropWidthBiggerThan1 ?
                [
                    "(".concat(inputWidthFloat, " / f32(uniforms.outShape[2] - 1))"),
                    '(x2-x1) * width_ratio',
                    "x1*".concat(inputWidthFloat, " + f32(x)*(width_scale)"),
                ] :
                [
                    '0.0',
                    '0.0',
                    "0.5 * (x1+x2) * ".concat(inputWidthFloat),
                ], 3), widthRatio = _c[0], widthScale = _c[1], inX = _c[2];
            // Reference implementation
            // tslint:disable-next-line:max-line-length
            // https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/kernels/crop_and_resize_op_gpu.cu.cc
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let height_ratio = f32(").concat(heightRatio, ");\n        let width_ratio = f32(").concat(widthRatio, ");\n        let b = coords[0];\n        let y = coords[1];\n        let x = coords[2];\n        let d = coords[3];\n        // get box vals\n        let y1 = getBoxes(b, 0);\n        let x1 = getBoxes(b, 1);\n        let y2 = getBoxes(b, 2);\n        let x2 = getBoxes(b, 3);\n        // get image in batch index\n        let bInd = i32(round(getBoxInd(b)));\n        if(bInd < 0 || bInd >= uniforms.outShape[0]) {\n          return;\n        }\n        let height_scale = ").concat(heightScale, ";\n        let width_scale = ").concat(widthScale, ";\n        let in_y = ").concat(inY, ";\n        if( in_y < 0.0 || in_y > ").concat(inputHeightFloat, " ) {\n          setOutputAtIndex(index, uniforms.extrapolationValue);\n          return;\n        }\n        let in_x = ").concat(inX, ";\n        if( in_x < 0.0 || in_x > ").concat(inputWidthFloat, " ) {\n          setOutputAtIndex(index, uniforms.extrapolationValue);\n          return;\n        }\n        let sourceFracIndexCR = vec2<f32>(in_x,in_y);\n        if(").concat(this.methodId, " == 1) {\n          // Compute the four integer indices.\n          let sourceFloorCR = vec2<i32>(sourceFracIndexCR);\n          let sourceCeilCR = vec2<i32>(ceil(sourceFracIndexCR));\n          let topLeft = getImage(bInd, sourceFloorCR.y, sourceFloorCR.x, d);\n          let bottomLeft = getImage(bInd, sourceCeilCR.y, sourceFloorCR.x, d);\n          let topRight = getImage(bInd, sourceFloorCR.y, sourceCeilCR.x, d);\n          let bottomRight = getImage(bInd, sourceCeilCR.y, sourceCeilCR.x, d);\n          let fracCR = sourceFracIndexCR - vec2<f32>(sourceFloorCR);\n          let top = topLeft + (topRight - topLeft) * fracCR.x;\n          let bottom = bottomLeft + (bottomRight - bottomLeft) * fracCR.x;\n          let newValue = top + (bottom - top) * fracCR.y;\n          setOutputAtIndex(index, newValue);\n        } else {\n          // Compute the coordinators of nearest neighbor point.\n          let sourceNearestCR = vec2<i32>(floor(\n            sourceFracIndexCR + vec2<f32>(0.5,0.5)));\n          let newValue = getImage(\n            bInd, sourceNearestCR.y, sourceNearestCR.x, d);\n          setOutputAtIndex(index, newValue);\n        }\n      }\n    }\n    ");
            return userCode;
        };
        return CropAndResizeProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var cropAndResize = function (args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var image = inputs.image, boxes = inputs.boxes, boxInd = inputs.boxInd;
        var cropSize = attrs.cropSize, method = attrs.method, extrapolationValue = attrs.extrapolationValue;
        var program = new CropAndResizeProgram(image.shape[3], boxes.shape, cropSize, method);
        var uniformData = [{ type: 'float32', data: [extrapolationValue] }];
        return backend.runWebGPUProgram(program, [image, boxes, boxInd], 'float32', uniformData);
    };
    var cropAndResizeConfig = {
        kernelName: tf.CropAndResize,
        backendName: 'webgpu',
        kernelFunc: cropAndResize
    };

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var CumOpType;
    (function (CumOpType) {
        CumOpType["Prod"] = "*";
        CumOpType["Sum"] = "+";
    })(CumOpType || (CumOpType = {}));
    var CumProgram = /** @class */ (function () {
        function CumProgram(op, shape, exclusive, reverse) {
            this.variableNames = ['x'];
            // pow(i32, i32) is not supported, use pow(f32, f32) instead.
            this.uniforms = 'index : f32,';
            this.size = true;
            this.workgroupSize = [128, 1, 1];
            this.outputShape = shape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.exclusive = exclusive;
            this.reverse = reverse;
            this.op = op;
            this.shaderKey = "cum_".concat(this.op, "_").concat(this.exclusive, "_").concat(this.reverse);
        }
        CumProgram.prototype.getUserCode = function () {
            var rank = this.outputShape.length;
            var initVal = this.op === CumOpType.Prod ? '1.0' : '0.0';
            var val = this.exclusive ? initVal :
                "getX(".concat(getCoords(rank, 'coords', this.op), ")");
            var length = this.outputShape[this.outputShape.length - 1];
            var condition = '';
            var idxString = '';
            // When exclusive is set, the cum op becomes roll op that copies the
            // value from the previous index based on the direction specified by the
            // reverse flag.
            if (this.exclusive) {
                condition = this.reverse ? "end != ".concat(length - 1) : 'end != 0';
                idxString = this.reverse ? 'end + 1' : 'end - 1';
            }
            else {
                condition = this.reverse ? "end + pow2 < ".concat(length) : 'end >= pow2';
                idxString = (this.reverse ? 'end + pow2' : 'end - pow2');
            }
            return "\n      ".concat(getMainHeaderString('index'), " {\n       if (index < uniforms.size) {\n         var coords = getCoordsFromIndex(index);\n\n         let end = ").concat(getFinalCoord(rank, 'coords', this.op), ";\n         var val = ").concat(val, ";\n         let pow2 = i32(pow(2.0, uniforms.index));\n         if (").concat(condition, ") {\n           let idx = ").concat(idxString, ";\n           ").concat(getFinalCoord(rank, 'coords', this.op), " = idx;\n           val ").concat(this.op, "= getX(").concat(getCoords(rank, 'coords', this.op), ");\n         }\n         setOutputAtIndex(index, val);\n       }\n      }\n    ");
        };
        return CumProgram;
    }());
    function getCoords(rank, name, op) {
        if (rank === 1) {
            return "".concat(name);
        }
        else if (rank === 2) {
            return "".concat(name, ".x, ").concat(name, ".y");
        }
        else if (rank === 3) {
            return "".concat(name, ".x, ").concat(name, ".y, ").concat(name, ".z");
        }
        else if (rank === 4) {
            return "".concat(name, ".x, ").concat(name, ".y, ").concat(name, ".z, ").concat(name, ".w");
        }
        else {
            throw Error("Cumulative ".concat(op, " for rank ").concat(rank, " is not yet supported"));
        }
    }
    function getFinalCoord(rank, name, op) {
        if (rank === 1) {
            return "".concat(name);
        }
        else if (rank === 2) {
            return "".concat(name, ".y");
        }
        else if (rank === 3) {
            return "".concat(name, ".z");
        }
        else if (rank === 4) {
            return "".concat(name, ".w");
        }
        else {
            throw Error("Cumulative ".concat(op, " for rank ").concat(rank, " is not yet supported"));
        }
    }

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function cumImpl(op, x, backend, axis, exclusive, reverse) {
        var xRank = x.shape.length;
        var permutation = tf.backend_util.getAxesPermutation([axis], xRank);
        var permutedX = x;
        if (permutation != null) {
            permutedX = transpose({ inputs: { x: x }, backend: backend, attrs: { perm: permutation } });
        }
        var permutedAxis = tf.backend_util.getInnerMostAxes(1, xRank)[0];
        if (permutedAxis !== xRank - 1) {
            throw new Error("WebGPU cumprod shader expects an inner-most axis=".concat(x.shape.length - 1, " ") +
                "but got axis=".concat(axis));
        }
        var size = permutedX.shape[permutedAxis];
        var result = identity({ inputs: { x: permutedX }, backend: backend });
        // Use cum parallel algorithm, inspired by:
        // https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-39-parallel-prefix-sum-scan-cuda
        // Note: although the algorithm is called sum, it works for any associtative
        // operator with an identity.
        for (var i = 0; i <= Math.ceil(Math.log2(size)) - 1; i++) {
            var program = new CumProgram(op, permutedX.shape, false, reverse);
            var prevResult = result;
            var uniformData = [{ type: 'float32', data: [i] }];
            result =
                backend.runWebGPUProgram(program, [result], result.dtype, uniformData);
            backend.disposeData(prevResult.dataId);
        }
        // For exclusive cum, shift the end result in the direction of product or sum
        // and add 1 for product or 0 for sum to the front index.
        if (exclusive) {
            var program = new CumProgram(op, permutedX.shape, exclusive, reverse);
            var prevResult = result;
            var uniformData = [{ type: 'float32', data: [0] }];
            result =
                backend.runWebGPUProgram(program, [result], result.dtype, uniformData);
            backend.disposeData(prevResult.dataId);
        }
        if (permutation != null) {
            var reversePermutation = tf.backend_util.getUndoAxesPermutation(permutation);
            var reverseTransposedResult = transpose({ inputs: { x: result }, backend: backend, attrs: { perm: reversePermutation } });
            backend.disposeData(result.dataId);
            backend.disposeData(permutedX.dataId);
            return reverseTransposedResult;
        }
        return result;
    }

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function cumprod(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var axis = attrs.axis, exclusive = attrs.exclusive, reverse = attrs.reverse;
        return cumImpl(CumOpType.Prod, x, backend, axis, exclusive, reverse);
    }
    var cumprodConfig = {
        kernelName: tf.Cumprod,
        backendName: 'webgpu',
        kernelFunc: cumprod
    };

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function cumsum(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var axis = attrs.axis, exclusive = attrs.exclusive, reverse = attrs.reverse;
        return cumImpl(CumOpType.Sum, x, backend, axis, exclusive, reverse);
    }
    var cumsumConfig = {
        kernelName: tf.Cumsum,
        backendName: 'webgpu',
        kernelFunc: cumsum
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function denseBincount(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, weights = inputs.weights;
        var size = attrs.size, binaryOutput = attrs.binaryOutput;
        var xRankOne = x.shape.length === 1;
        var weightsSize = tf.util.sizeFromShape(weights.shape);
        var hasWeights = weightsSize > 0;
        var dtype = weights.dtype;
        var xSize = xRankOne ? [x.shape[0]] : [x.shape[0], x.shape[1]];
        var outputSize = xRankOne ? [size] : [x.shape[0], size];
        var output = fill({ backend: backend, attrs: { shape: outputSize, value: 0, dtype: dtype } });
        var program = new BincountProgram(xSize, hasWeights, binaryOutput);
        var uniformData = [{ type: 'int32', data: [size] }];
        var bincountInputs = hasWeights ? [x, weights] : [x];
        var res = backend.runWebGPUProgram(program, bincountInputs, dtype, uniformData, output);
        return res;
    }
    var denseBincountConfig = {
        kernelName: tf.DenseBincount,
        backendName: 'webgpu',
        kernelFunc: denseBincount
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var DepthToSpaceProgram = /** @class */ (function () {
        function DepthToSpaceProgram(outputShape, dataFormat) {
            this.variableNames = ['x'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.uniforms = 'blockSize : i32,';
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "depthToSpace_".concat(dataFormat);
            this.dataFormat = dataFormat;
        }
        DepthToSpaceProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          let b = coords[0];\n          let h = ").concat(this.getHeightCoordString(), ";\n          let w = ").concat(this.getWidthCoordString(), ";\n          let d = ").concat(this.getDepthCoordString(), ";\n\n          let in_h = h / uniforms.blockSize;\n          let offset_h = h % uniforms.blockSize;\n          let in_w = w / uniforms.blockSize;\n          let offset_w = w % uniforms.blockSize;\n          let offset_d = (offset_h * uniforms.blockSize + offset_w) *\n            ").concat(this.getOutputDepthSize(), ";\n          let in_d = d + offset_d;\n\n          let rlt = ").concat(this.getInputSamplingString(), ";\n          setOutputAtIndex(index, rlt);\n        }\n      }");
            return userCode;
        };
        DepthToSpaceProgram.prototype.getHeightCoordString = function () {
            if (this.dataFormat === 'NHWC') {
                return "coords[1]";
            }
            else {
                return "coords[2]";
            }
        };
        DepthToSpaceProgram.prototype.getWidthCoordString = function () {
            if (this.dataFormat === 'NHWC') {
                return "coords[2]";
            }
            else {
                return "coords[3]";
            }
        };
        DepthToSpaceProgram.prototype.getDepthCoordString = function () {
            if (this.dataFormat === 'NHWC') {
                return "coords[3]";
            }
            else {
                return "coords[1]";
            }
        };
        DepthToSpaceProgram.prototype.getOutputDepthSize = function () {
            if (this.dataFormat === 'NHWC') {
                return "uniforms.outShape[3]";
            }
            else {
                return "uniforms.outShape[1]";
            }
        };
        DepthToSpaceProgram.prototype.getInputSamplingString = function () {
            if (this.dataFormat === 'NHWC') {
                return "getX(b, in_h, in_w, in_d)";
            }
            else {
                return "getX(b, in_d, in_h, in_w)";
            }
        };
        return DepthToSpaceProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function depthToSpace(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var blockSize = attrs.blockSize, dataFormat = attrs.dataFormat;
        var batchSize = x.shape[0];
        var inputHeight = (dataFormat === 'NHWC') ? x.shape[1] : x.shape[2];
        var inputWidth = (dataFormat === 'NHWC') ? x.shape[2] : x.shape[3];
        var inputDepth = (dataFormat === 'NHWC') ? x.shape[3] : x.shape[1];
        var outputHeight = inputHeight * blockSize;
        var outputWidth = inputWidth * blockSize;
        var outputDepth = inputDepth / (blockSize * blockSize);
        var outputShape = (dataFormat === 'NHWC') ?
            [batchSize, outputHeight, outputWidth, outputDepth] :
            [batchSize, outputDepth, outputHeight, outputWidth];
        var uniformData = [
            { type: 'int32', data: [blockSize] },
        ];
        var program = new DepthToSpaceProgram(outputShape, dataFormat);
        return backend.runWebGPUProgram(program, [x], x.dtype, uniformData);
    }
    var depthToSpaceConfig = {
        kernelName: tf.DepthToSpace,
        backendName: 'webgpu',
        kernelFunc: depthToSpace
    };

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var DepthwiseConv2DNCHWSharedProgram = /** @class */ (function () {
        function DepthwiseConv2DNCHWSharedProgram(outputShape, filterHeight, filterWidth, addBias, activation, hasPreluActivation) {
            if (addBias === void 0) { addBias = false; }
            if (activation === void 0) { activation = null; }
            if (hasPreluActivation === void 0) { hasPreluActivation = false; }
            this.variableNames = ['x', 'W'];
            this.uniforms = "pads : vec2<i32>, inDims : vec2<i32>,";
            this.workgroupSize = [16, 16, 1];
            this.outputShape = outputShape;
            this.dispatchLayout = { x: [3], y: [2], z: [0, 1] };
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            if (addBias) {
                this.variableNames.push('bias');
            }
            if (hasPreluActivation) {
                this.variableNames.push('preluActivationWeights');
            }
            this.addBias = addBias;
            this.activation = activation;
            this.hasPreluActivation = hasPreluActivation;
            this.filterHeight = filterHeight;
            this.filterWidth = filterWidth;
            this.shaderKey = "depthwiseNCHW_".concat(this.activation, "_").concat(this.filterHeight, "_").concat(this.filterWidth);
        }
        DepthwiseConv2DNCHWSharedProgram.prototype.getUserCode = function () {
            var filterSize = this.filterWidth * this.filterHeight;
            var flatWorkgroupSize = this.workgroupSize[0] * this.workgroupSize[1] * this.workgroupSize[2];
            var tileAHeight = this.workgroupSize[1] + this.filterHeight - 1;
            var tileAWidth = this.workgroupSize[0] + this.filterWidth - 1;
            var userCode = "\n      ".concat(activationFnSnippet(this.activation, this.hasPreluActivation, false, 4), "\n\n      var<workgroup> mm_Asub : array<array<f32, ").concat(tileAWidth, ">, ").concat(tileAHeight, ">;\n      var<workgroup> mm_Bsub : array<array<f32, ").concat(this.filterWidth, ">, ").concat(this.filterHeight, ">;\n      fn readX(batch : i32, channel : i32, row : i32, col : i32) -> f32 {\n        var value = 0.0;\n        if (row >=0 && row < uniforms.inDims[0] && col >=0 && col < uniforms.inDims[1])\n        {\n          value = getX(batch, channel, row, col);\n        }\n        return value;\n      }\n\n      ").concat(getMainHeaderString(), " {\n        let coords = getOutputCoords();\n        let batch = coords[0];\n        let xRCCorner = vec2<i32>(coords.zw) - uniforms.pads;\n        let channelMul = uniforms.wShape[3];\n        let d1 = coords[1] / channelMul;\n        let q = coords[1] % channelMul;\n\n        let inputRowStart = xRCCorner.x;\n        let inputColStart = xRCCorner.y;\n\n        let localRow = i32(localId.y);\n        let localCol = i32(localId.x);\n\n        // Load one tile of X into local memory.\n        for (var inputRow = localRow; inputRow < ").concat(tileAHeight, "; inputRow = inputRow + ").concat(this.workgroupSize[1], ") {\n          for (var inputCol = localCol; inputCol < ").concat(tileAWidth, "; inputCol = inputCol + ").concat(this.workgroupSize[0], ") {\n            let rowOffset = inputRow - localRow;\n            let colOffset = inputCol - localCol;\n            mm_Asub[inputRow][inputCol] = readX(batch, d1, inputRowStart + rowOffset, inputColStart + colOffset);\n          }\n        }\n\n        // Load one tile of W into local memory.\n        var wIndex = i32(localIndex);\n        ").concat(filterSize < flatWorkgroupSize ?
                "if (wIndex < ".concat(filterSize, ")") :
                "for(; wIndex < ".concat(filterSize, "; wIndex = wIndex + ").concat(flatWorkgroupSize, ")"), "\n\n        {\n          let wRow = wIndex / ").concat(this.filterWidth, ";\n          let wCol = wIndex % ").concat(this.filterWidth, ";\n          mm_Bsub[wRow][wCol] = getW(wRow, wCol, d1, q);\n        }\n\n        workgroupBarrier();\n\n        var value = 0.0;\n        for (var wR = 0; wR < ").concat(this.filterHeight, "; wR = wR + 1) {\n          for (var wC = 0; wC < ").concat(this.filterWidth, "; wC = wC + 1) {\n            let xVal = mm_Asub[localRow + wR][localCol + wC];\n            let wVal = mm_Bsub[wR][wC];\n            value = fma(xVal, wVal, value);\n          }\n        }\n        ").concat(biasActivationSnippet(this.addBias, this.activation), "\n        if (coordsInBounds4D(coords, uniforms.outShape)) {\n          setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);\n        }\n      }\n    ");
            return userCode;
        };
        return DepthwiseConv2DNCHWSharedProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var DepthwiseConv2DVec4Program = /** @class */ (function () {
        function DepthwiseConv2DVec4Program(convInfo, addBias, activation, hasPreluActivation) {
            if (addBias === void 0) { addBias = false; }
            if (activation === void 0) { activation = null; }
            if (hasPreluActivation === void 0) { hasPreluActivation = false; }
            this.variableNames = ['x', 'W'];
            this.uniforms = 'pads : vec2<i32>, inDims : vec2<i32>, virtualWidth : i32,';
            this.workgroupSize = [64, 1, 1];
            this.workPerThread = 4;
            this.outputComponent = 4;
            this.outputShape = convInfo.outShape;
            this.virtualWidth = Math.ceil(this.outputShape[2] / this.workPerThread) *
                this.workPerThread;
            var virtualOutputShape = [
                this.outputShape[0], this.outputShape[1], this.virtualWidth,
                this.outputShape[3]
            ];
            this.dispatchLayout = flatDispatchLayout(virtualOutputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, virtualOutputShape, this.workgroupSize, [this.outputComponent * this.workPerThread, 1, 1]);
            tf.util.assert(convInfo.dataFormat === 'channelsLast', function () { return 'TODO: NCHW is unimplemented'; });
            if (addBias) {
                this.variableNames.push('bias');
            }
            if (hasPreluActivation) {
                this.variableNames.push('preluActivationWeights');
            }
            this.convInfo = convInfo;
            this.addBias = addBias;
            this.activation = activation;
            this.hasPreluActivation = hasPreluActivation;
            this.shaderKey =
                "depthwiseVec4_".concat(activation, "_").concat(this.convInfo.filterHeight, "_").concat(this.convInfo.filterWidth, "_").concat(this.convInfo.strideHeight, "_").concat(this.convInfo.strideWidth, "_").concat(this.workPerThread);
        }
        DepthwiseConv2DVec4Program.prototype.getUserCode = function () {
            var xNumber = (this.workPerThread - 1) * this.convInfo.strideWidth +
                this.convInfo.filterWidth;
            var strideHeight = this.convInfo.strideHeight;
            var strideWidth = this.convInfo.strideWidth;
            var userCode = "\n      ".concat(activationFnSnippet(this.activation, this.hasPreluActivation, true, 4), "\n      fn readX(batch : i32, row : i32, col : i32, channel : i32) -> vec4<f32> {\n        var value = vec4<f32>(0.0);\n        if (col >=0 && col < uniforms.inDims[1]) {\n          value = getX(batch, row, col, channel);\n        }\n        return value;\n      }\n\n      ").concat(getMainHeaderString('index'), " {\n        let width0 = uniforms.outShape[3] / ").concat(this.outputComponent, ";\n        let d1 = (index % width0) * ").concat(this.outputComponent, ";\n        var index1 = index / width0;\n        let width1 = uniforms.virtualWidth / ").concat(this.workPerThread, ";\n        let c = (index1 % width1) * ").concat(this.workPerThread, ";\n        index1 = index1 / width1;\n        let r = index1 % uniforms.outShape[1];\n        let batch = index1 / uniforms.outShape[1];\n\n        let xRCCorner = vec2<i32>(r, c) * vec2<i32>(").concat(strideHeight, ", ").concat(strideWidth, ") - uniforms.pads;\n\n        let xRCorner = xRCCorner.x;\n        let xCCorner = xRCCorner.y;\n        var xVals : array<vec4<f32>, ").concat(xNumber, ">;\n        var dotProd : array<vec4<f32>, ").concat(this.workPerThread, ">;\n        for (var i = 0; i < ").concat(this.workPerThread, "; i++) {\n          dotProd[i] = vec4<f32>(0.0);\n        }\n\n        // Use constant instead of uniform can give better performance.\n        for (var wR = 0; wR < ").concat(this.convInfo.filterHeight, "; wR = wR + 1) {\n          let xR = xRCorner + wR;\n          if (xR >=0 && xR < uniforms.inDims[0]) {\n            for (var i = 0; i < ").concat(xNumber, "; i++) {\n              xVals[i] = readX(batch, xR, xCCorner + i, d1);\n            }\n            for (var wC = 0; wC < ").concat(this.convInfo.filterWidth, "; wC = wC + 1) {\n              let wValue = getW(wR, wC, d1, 0);\n              for (var i = 0; i < ").concat(this.workPerThread, "; i++) {\n                dotProd[i] = fma(xVals[i * ").concat(strideWidth, " + wC], wValue, dotProd[i]);\n              }\n            }\n          }\n        }\n\n        for (var i = 0; i < ").concat(this.workPerThread, "; i = i + 1) {\n          let coords = vec4<i32>(batch, r, c + i, d1);\n          if (coordsInBounds4D(coords, uniforms.outShape)) {\n            var value = dotProd[i];\n            ").concat(biasActivationSnippet(this.addBias, this.activation), "\n            setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);\n          }\n        }\n      }\n    ");
            return userCode;
        };
        return DepthwiseConv2DVec4Program;
    }());

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var DepthwiseConv2DProgram = /** @class */ (function () {
        function DepthwiseConv2DProgram(convInfo, addBias, activation, hasPreluActivation) {
            if (addBias === void 0) { addBias = false; }
            if (activation === void 0) { activation = null; }
            if (hasPreluActivation === void 0) { hasPreluActivation = false; }
            this.variableNames = ['x', 'W'];
            this.uniforms = "pads : vec2<i32>, inDims : vec2<i32>, filterHeight : i32,\n      filterWidth : i32, strides : vec2<i32>, dilations : vec2<i32>,";
            // This is an experimental value.
            this.workgroupSize = [256, 1, 1];
            this.size = true;
            this.outputShape = convInfo.outShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.isChannelsLast = convInfo.dataFormat === 'channelsLast';
            if (addBias) {
                this.variableNames.push('bias');
            }
            if (hasPreluActivation) {
                this.variableNames.push('preluActivationWeights');
            }
            this.convInfo = convInfo;
            this.addBias = addBias;
            this.activation = activation;
            this.hasPreluActivation = hasPreluActivation;
            this.shaderKey = "depthwise_".concat(this.activation, "_").concat(this.isChannelsLast);
        }
        DepthwiseConv2DProgram.prototype.getUserCode = function () {
            var getXSnippet = this.isChannelsLast ? 'getX(batch, xR, xC, d1);' :
                'getX(batch, d1, xR, xC);';
            var userCode = "\n      ".concat(activationFnSnippet(this.activation, this.hasPreluActivation, false, 4), "\n\n      ").concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getOutputCoords();\n          let batch = coords[0];\n          let xRCCorner = vec2<i32>(coords.").concat(this.isChannelsLast ? 'yz' : 'zw', ") * uniforms.strides - uniforms.pads;\n          let d2 = coords[").concat(this.isChannelsLast ? 3 : 1, "];\n          let channelMul = uniforms.wShape[3];\n          let d1 = d2 / channelMul;\n          let q = d2 % channelMul;\n\n          let inputRowStart = xRCCorner.x;\n          let inputColStart = xRCCorner.y;\n          let inputRowEnd = inputRowStart + uniforms.filterHeight *\n              uniforms.dilations[0];\n          let inputColEnd = inputColStart + uniforms.filterWidth *\n              uniforms.dilations[1];\n\n          // Convolve x(?, ?, d1)|x(d1, ?, ?) with w(:, :, d1, q) to get\n          // y(yR, yC, d2)|y(d2, yR, yC). ? = to be determined. : = across all\n          // values in that axis. x(?, ?, d1) and y(yR, yC, d2) is for NHWC.\n          // x(d1, ?, ?) and y(d2, yR, yC) is for NCHW.\n          var value = 0.0;\n\n          // Extract if checking out of for loop for performance.\n          if (inputRowStart >= 0 && inputColStart >= 0 &&\n            inputRowEnd < uniforms.inDims[0] &&\n                inputColEnd < uniforms.inDims[1]) {\n              for (var wR = 0; wR < uniforms.filterHeight; wR = wR + 1) {\n                let xR = inputRowStart + wR * uniforms.dilations[0];\n\n                for (var wC = 0; wC < uniforms.filterWidth; wC = wC + 1) {\n                  let xC = inputColStart + wC * uniforms.dilations[1];\n\n                  let xVal = ").concat(getXSnippet, ";\n                  let wVal = getW(wR, wC, d1, q);\n                  value = value + xVal * wVal;\n                }\n              }\n            } else {\n              for (var wR = 0; wR < uniforms.filterHeight; wR = wR + 1) {\n                let xR = inputRowStart + wR * uniforms.dilations[0];\n\n                if (xR < 0 || xR >= uniforms.inDims[0]) {\n                  continue;\n                }\n\n                for (var wC = 0; wC < uniforms.filterWidth; wC = wC + 1) {\n                  let xC = inputColStart + wC * uniforms.dilations[1];\n\n                  if (xC < 0 || xC >= uniforms.inDims[1]) {\n                    continue;\n                  }\n\n                  let xVal = ").concat(getXSnippet, ";\n                  let wVal = getW(wR, wC, d1, q);\n                  value = value + xVal * wVal;\n                }\n              }\n            }\n            ").concat(biasActivationSnippet(this.addBias, this.activation), "\n          setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);\n        }\n      }\n    ");
            return userCode;
        };
        return DepthwiseConv2DProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function depthwiseConv2dNative(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, filter = inputs.filter;
        var strides = attrs.strides, pad = attrs.pad, dataFormat = attrs.dataFormat, dilations = attrs.dilations, dimRoundingMode = attrs.dimRoundingMode;
        var $dataFormat = tf.backend_util.convertConv2DDataFormat(dataFormat);
        var $dilations = dilations;
        if ($dilations == null) {
            $dilations = [1, 1];
        }
        var convInfo = tf.backend_util.computeConv2DInfo(x.shape, filter.shape, strides, $dilations, pad, dimRoundingMode, true /* depthwise */, $dataFormat);
        var dimensions = [
            { type: 'int32', data: [convInfo.padInfo.top, convInfo.padInfo.left] },
            { type: 'int32', data: [convInfo.inHeight, convInfo.inWidth] },
        ];
        var isChannelsLast = convInfo.dataFormat === 'channelsLast';
        var program;
        if (!isChannelsLast && convInfo.inHeight > 16 && convInfo.inWidth > 16 &&
            convInfo.strideHeight === 1 && convInfo.strideWidth === 1 &&
            convInfo.dilationWidth === 1 && convInfo.dilationHeight === 1 &&
            convInfo.inChannels === convInfo.outChannels) {
            program = new DepthwiseConv2DNCHWSharedProgram(convInfo.outShape, convInfo.filterHeight, convInfo.filterWidth);
        }
        else if (isChannelsLast && convInfo.outHeight > 4 && convInfo.outWidth > 4 &&
            convInfo.strideWidth <= 2 &&
            convInfo.inChannels === convInfo.outChannels &&
            convInfo.dilationHeight === 1 && convInfo.dilationWidth === 1 &&
            convInfo.inChannels % 4 === 0) {
            program = new DepthwiseConv2DVec4Program(convInfo);
            dimensions.push({ type: 'int32', data: [program.virtualWidth] });
        }
        else {
            program = new DepthwiseConv2DProgram(convInfo);
            dimensions.push({ type: 'int32', data: [convInfo.filterHeight] }, { type: 'int32', data: [convInfo.filterWidth] }, { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] }, {
                type: 'int32',
                data: [convInfo.dilationHeight, convInfo.dilationWidth]
            });
        }
        return backend.runWebGPUProgram(program, [x, filter], x.dtype, dimensions);
    }
    var depthwiseConv2dNativeConfig = {
        kernelName: tf.DepthwiseConv2dNative,
        backendName: 'webgpu',
        kernelFunc: depthwiseConv2dNative,
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var DepthwiseConv2DDerFilterProgram = /** @class */ (function () {
        function DepthwiseConv2DDerFilterProgram(convInfo) {
            this.variableNames = ['x', 'dy'];
            this.uniforms = "strides : vec2<i32>, pads : vec2<i32>, filterDims : vec2<i32>, outHeight : i32,\n      outWidth : i32, inHeight : i32, inWidth : i32, batchSize : i32, channelMul : i32,";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.filterShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "depthwise_conv2d_backprop_filter";
        }
        DepthwiseConv2DDerFilterProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let wR = coords[0];\n        let wC = coords[1];\n        let d1 = coords[2];\n        let dm = coords[3];\n        let d2 = d1 * uniforms.channelMul + dm;\n\n        var dotProd = 0.0;\n        for (var b = 0; b < uniforms.batchSize; b++) {\n          for (var yR = 0; yR < uniforms.outHeight; yR++) {\n            let xR = wR + yR * uniforms.strides[0] - uniforms.pads[0];\n\n            if (xR < 0 || xR >= uniforms.inHeight) {\n              continue;\n            }\n\n            for (var yC = 0; yC < uniforms.outWidth; yC++) {\n              let xC = wC + yC * uniforms.strides[1] - uniforms.pads[1];\n\n              if (xC < 0 || xC >= uniforms.inWidth) {\n                continue;\n              }\n\n              let dyValue = getDy(b, yR, yC, d2);\n              let xValue = getX(b, xR, xC, d1);\n              dotProd += xValue * dyValue;\n            }\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n    ");
            return userCode;
        };
        return DepthwiseConv2DDerFilterProgram;
    }());
    var DepthwiseConv2DDerInputProgram = /** @class */ (function () {
        function DepthwiseConv2DDerInputProgram(convInfo) {
            this.variableNames = ['dy', 'W'];
            this.uniforms = "strides : vec2<i32>, pads : vec2<i32>, filterDims : vec2<i32>,\n       outHeight : i32, outWidth : i32, channelMul : i32,";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.inShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "depthwise_conv2d_backprop_input";
        }
        DepthwiseConv2DDerInputProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let batch = coords[0];\n        let d1 = coords[3];\n        let dyCorner = coords.yz - uniforms.pads;\n        let dyRCorner = dyCorner.x;\n        let dyCCorner = dyCorner.y;\n\n        var dotProd = 0.0;\n        for (var wR = 0; wR < uniforms.filterDims[0]; wR++) {\n          let dyR = f32(dyRCorner + wR) / f32(uniforms.strides[0]);\n\n          if (dyR < 0.0 || dyR >= f32(uniforms.outHeight) || fract(dyR) > 0.0) {\n            continue;\n          }\n\n          let idyR = i32(dyR);\n          let wRPerm = uniforms.filterDims[0] - 1 - wR;\n\n          for (var wC = 0; wC < uniforms.filterDims[1]; wC++) {\n            let dyC = f32(dyCCorner + wC) / f32(uniforms.strides[1]);\n\n            if (dyC < 0.0 || dyC >= f32(uniforms.outWidth) || fract(dyC) > 0.0) {\n              continue;\n            }\n\n            let idyC = i32(dyC);\n            let wCPerm = uniforms.filterDims[1] - 1 - wC;\n\n            for (var dm = 0; dm < uniforms.channelMul; dm++) {\n              let d2 = d1 * uniforms.channelMul + dm;\n              let xValue = getDy(batch, idyR, idyC, d2);\n              let wValue = getW(wRPerm, wCPerm, d1, dm);\n              dotProd += xValue * wValue;\n            }\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n    ");
            return userCode;
        };
        return DepthwiseConv2DDerInputProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function depthwiseConv2dNativeBackpropFilter(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, dy = inputs.dy;
        var strides = attrs.strides, dilations = attrs.dilations, pad = attrs.pad, dimRoundingMode = attrs.dimRoundingMode, filterShape = attrs.filterShape;
        var convInfo = tf.backend_util.computeConv2DInfo(x.shape, filterShape, strides, dilations, pad, dimRoundingMode, true /* depthwise */);
        var program = new DepthwiseConv2DDerFilterProgram(convInfo);
        var uniformData = [
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] },
            { type: 'int32', data: [convInfo.padInfo.top, convInfo.padInfo.left] },
            { type: 'int32', data: [convInfo.filterHeight, convInfo.filterWidth] },
            { type: 'int32', data: [convInfo.outHeight] },
            { type: 'int32', data: [convInfo.outWidth] },
            { type: 'int32', data: [convInfo.inHeight] },
            { type: 'int32', data: [convInfo.inWidth] },
            { type: 'int32', data: [convInfo.batchSize] },
            { type: 'int32', data: [convInfo.outChannels / convInfo.inChannels] }
        ];
        return backend.runWebGPUProgram(program, [x, dy], 'float32', uniformData);
    }
    var depthwiseConv2dNativeBackpropFilterConfig = {
        kernelName: tf.DepthwiseConv2dNativeBackpropFilter,
        backendName: 'webgpu',
        kernelFunc: depthwiseConv2dNativeBackpropFilter
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function depthwiseConv2dNativeBackpropInput(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var dy = inputs.dy, filter = inputs.filter;
        var strides = attrs.strides, dilations = attrs.dilations, pad = attrs.pad, dimRoundingMode = attrs.dimRoundingMode, inputShape = attrs.inputShape;
        var convInfo = tf.backend_util.computeConv2DInfo(inputShape, filter.shape, strides, dilations, pad, dimRoundingMode, true /* depthwise */);
        var program = new DepthwiseConv2DDerInputProgram(convInfo);
        var uniformData = [
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] }, {
                type: 'int32',
                data: [
                    convInfo.filterHeight - 1 - convInfo.padInfo.top,
                    convInfo.filterWidth - 1 - convInfo.padInfo.left
                ]
            },
            { type: 'int32', data: [convInfo.filterHeight, convInfo.filterWidth] },
            { type: 'int32', data: [convInfo.outHeight] },
            { type: 'int32', data: [convInfo.outWidth] },
            { type: 'int32', data: [convInfo.outChannels / convInfo.inChannels] }
        ];
        return backend.runWebGPUProgram(program, [dy, filter], dy.dtype, uniformData);
    }
    var depthwiseConv2dNativeBackpropInputConfig = {
        kernelName: tf.DepthwiseConv2dNativeBackpropInput,
        backendName: 'webgpu',
        kernelFunc: depthwiseConv2dNativeBackpropInput
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var DiagProgram = /** @class */ (function () {
        function DiagProgram(size) {
            this.variableNames = ['x'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = [size, size];
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'diag';
        }
        DiagProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getOutputCoords();\n          let value = select(0.0, getX(coords[0]), coords[0] == coords[1]);\n          setOutputAtIndex(index, value);\n        }\n      }\n    ");
            return userCode;
        };
        return DiagProgram;
    }());

    function diag(args) {
        var inputs = args.inputs, backend = args.backend;
        var x = inputs.x;
        var outShape = __spreadArray(__spreadArray([], __read(x.shape), false), __read(x.shape), false);
        var xSize = tf.util.sizeFromShape(x.shape);
        var flat = reshape({ inputs: { x: x }, backend: backend, attrs: { shape: [xSize] } });
        var program = new DiagProgram(xSize);
        var res = backend.runWebGPUProgram(program, [flat], flat.dtype);
        var out = reshape({ inputs: { x: res }, backend: backend, attrs: { shape: outShape } });
        backend.disposeData(flat.dataId);
        backend.disposeData(res.dataId);
        return out;
    }
    var diagConfig = {
        kernelName: tf.Diag,
        backendName: 'webgpu',
        kernelFunc: diag
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var Dilation2DProgram = /** @class */ (function () {
        function Dilation2DProgram(convInfo) {
            this.variableNames = ['x', 'w'];
            this.uniforms = 'filterDims: vec2<i32>, pads: vec2<i32>, strides: vec2<i32>, dilations: vec2<i32>';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.outShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'dilation2d';
        }
        Dilation2DProgram.prototype.getUserCode = function () {
            var userCode = "\n       ".concat(getMainHeaderString('index'), " {\n         if (index < uniforms.size) {\n           let neg_infinity = -3.4e38;\n           let coords = getOutputCoords();\n           let batch = coords.x;\n           let d1 = coords.w;\n           let outTopLeftCorner = coords.yz * uniforms.strides - uniforms.pads;\n           let hBeg = outTopLeftCorner.x;\n           let wBeg = outTopLeftCorner.y;\n\n           var curVal = neg_infinity;\n           for (var h = 0; h < uniforms.filterDims[0]; h = h + 1) {\n             let hIn = hBeg + h * uniforms.dilations[0];\n\n             if (hIn >= 0 && hIn < uniforms.xShape[1]) {\n               for (var w = 0; w < uniforms.filterDims[1]; w = w + 1) {\n                 let wIn = wBeg + w * uniforms.dilations[1];\n\n                 if (wIn >= 0 && wIn < uniforms.xShape[2]) {\n                   let val = getX(batch, hIn, wIn, d1) + getW(h, w, d1);\n                   if (val > curVal) {\n                     curVal = val;\n                   }\n                 }\n               }\n             }\n           }\n\n           setOutputAtIndex(index, curVal);\n         }\n       }\n     ");
            return userCode;
        };
        return Dilation2DProgram;
    }());

    function dilation2D(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, filter = inputs.filter;
        var strides = attrs.strides, pad = attrs.pad, dilations = attrs.dilations;
        var convInfo = tf.backend_util.computeDilation2DInfo(x.shape, filter.shape, strides, pad, 'NHWC' /* dataFormat */, dilations);
        var padInfo = [convInfo.padInfo.top, convInfo.padInfo.left];
        var uniformData = [
            { type: 'int32', data: [convInfo.filterHeight, convInfo.filterWidth] },
            { type: 'int32', data: __spreadArray([], __read(padInfo), false) },
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] },
            { type: 'int32', data: [convInfo.dilationHeight, convInfo.dilationWidth] }
        ];
        var program = new Dilation2DProgram(convInfo);
        var out = backend.runWebGPUProgram(program, [x, filter], x.dtype, uniformData);
        return out;
    }
    var dilation2DConfig = {
        kernelName: tf.Dilation2D,
        backendName: 'webgpu',
        kernelFunc: dilation2D
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var Dilation2DBackpropInputProgram = /** @class */ (function () {
        function Dilation2DBackpropInputProgram(convInfo, outputDtype) {
            this.variableNames = ['x', 'w', 'dy'];
            this.uniforms = 'filterDims: vec2<i32>, pads: vec2<i32>, strides: vec2<i32>, dilations: vec2<i32>, dySize: i32,';
            this.workgroupSize = [64, 1, 1];
            this.atomic = true;
            this.outputShape = convInfo.inShape;
            this.dispatchLayout = flatDispatchLayout(convInfo.outShape);
            this.dispatch = computeDispatch(this.dispatchLayout, convInfo.outShape, this.workgroupSize);
            if (outputDtype !== 'float32' && outputDtype !== 'int32') {
                throw new Error("Dilation2DBackpropInput only supports float32 and int32\n          types, does not support ".concat(outputDtype, " type."));
            }
            this.type = outputDtype;
            this.shaderKey = 'dilation2DBackpropInput';
        }
        Dilation2DBackpropInputProgram.prototype.getUserCode = function () {
            // This implementation follows the TF c++ cuda implementation:
            // https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/kernels/dilation_ops_gpu.cu.cc
            var userCode = "\n       ".concat(getMainHeaderString('index'), " {\n         if (index < uniforms.dySize) {\n           let coords = getDyCoordsFromIndex(index);\n           let b = coords[0];\n           let r = coords[1];\n           let c = coords[2];\n           let d = coords[3];\n\n           let dyCorner = vec2<i32>(r, c) * uniforms.strides - uniforms.pads;\n           var curVal = -3.4e38;  // neg_infinity\n           var xRMax = 0;\n           var xCMax = 0;\n\n           // In the case of multiple argmax branches, we only back-propagate\n           // along the last branch, i.e., the one with largest value of\n           // 'wR * uniforms.filterDims[1] + wC', similarly to the max-pooling\n           // backward routines.\n           for (var wR = 0; wR < uniforms.filterDims[0]; wR++) {\n             let xR = dyCorner.x + wR * uniforms.dilations[0];\n\n             if (xR >= 0 && xR < uniforms.xShape[1]) {\n               for (var wC = 0; wC < uniforms.filterDims[1]; wC++) {\n                 let xC = dyCorner.y + wC * uniforms.dilations[1];\n\n                 if (xC >= 0 && xC < uniforms.xShape[2]) {\n                   let val = getX(b, xR, xC, d) + getW(wR, wC, d);\n                   if (val > curVal) {\n                     curVal = val;\n                     xRMax = xR;\n                     xCMax = xC;\n                   }\n                 }\n               }\n             }\n           }\n\n           let flatIndexIn = d + uniforms.xShape[3] *\n               (xCMax + uniforms.xShape[2] * (xRMax + uniforms.xShape[1] * b));\n           let value = getDy(b, r, c, d);\n           ").concat(atomicAddSnippet('&result[flatIndexIn]', 'value', this.type), "\n         }\n       }\n     ");
            return userCode;
        };
        return Dilation2DBackpropInputProgram;
    }());
    var Dilation2DBackpropFilterProgram = /** @class */ (function () {
        function Dilation2DBackpropFilterProgram(convInfo, shape, outputDtype) {
            this.variableNames = ['x', 'w', 'dy'];
            this.uniforms = 'filterDims: vec2<i32>, pads: vec2<i32>, strides: vec2<i32>, dilations: vec2<i32>, dySize: i32,';
            this.workgroupSize = [64, 1, 1];
            this.atomic = true;
            this.outputShape = convInfo.filterShape;
            this.dispatchLayout = flatDispatchLayout(convInfo.outShape);
            this.dispatch = computeDispatch(this.dispatchLayout, convInfo.outShape, this.workgroupSize);
            if (outputDtype !== 'float32' && outputDtype !== 'int32') {
                throw new Error("Dilation2DBackpropFilter only supports float32 and int32\n          types, does not support ".concat(outputDtype, " type."));
            }
            this.type = outputDtype;
            this.shaderKey = 'dilation2DBackpropFilter';
        }
        Dilation2DBackpropFilterProgram.prototype.getUserCode = function () {
            // This implementation follows the TF c++ cuda implementation:
            // https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/kernels/dilation_ops_gpu.cu.cc
            var userCode = "\n       ".concat(getMainHeaderString('index'), " {\n         if (index < uniforms.dySize) {\n           let coords = getDyCoordsFromIndex(index);\n           let b = coords[0];\n           let r = coords[1];\n           let c = coords[2];\n           let d = coords[3];\n\n           let dyCorner = vec2<i32>(r, c) * uniforms.strides - uniforms.pads;\n           var curVal = -3.4e38;  // neg_infinity\n           var wRMax = 0;\n           var wCMax = 0;\n\n           // In the case of multiple argmax branches, we only back-propagate\n           // along the last branch, i.e., the one with largest value of\n           // 'wR * uniforms.filterDims[1] + wC', similarly to the max-pooling\n           // backward routines.\n           for (var wR = 0; wR < uniforms.filterDims[0]; wR++) {\n             let xR = dyCorner.x + wR * uniforms.dilations[0];\n\n             if (xR >= 0 && xR < uniforms.xShape[1]) {\n               for (var wC = 0; wC < uniforms.filterDims[1]; wC++) {\n                 let xC = dyCorner.y + wC * uniforms.dilations[1];\n\n                 if (xC >= 0 && xC < uniforms.xShape[2]) {\n                   let val = getX(b, xR, xC, d) + getW(wR, wC, d);\n                   if (val > curVal) {\n                     curVal = val;\n                     wRMax = wR;\n                     wCMax = wC;\n                   }\n                 }\n               }\n             }\n           }\n\n           let flatIndexIn = d + uniforms.wShape[2] * (wCMax + wRMax * uniforms.wShape[1]);\n           let value = getDy(b, r, c, d);\n           ").concat(atomicAddSnippet('&result[flatIndexIn]', 'value', this.type), "\n         }\n       }\n     ");
            return userCode;
        };
        return Dilation2DBackpropFilterProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function dilation2DBackpropFilter(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, filter = inputs.filter, dy = inputs.dy;
        var strides = attrs.strides, pad = attrs.pad, dilations = attrs.dilations;
        var convInfo = tf.backend_util.computeDilation2DInfo(x.shape, filter.shape, strides, pad, 'NHWC' /* dataFormat */, dilations);
        var dtype = filter.dtype;
        var program = new Dilation2DBackpropFilterProgram(convInfo, filter.shape, dtype);
        var uniformData = [
            { type: 'int32', data: [convInfo.filterHeight, convInfo.filterWidth] },
            { type: 'int32', data: [convInfo.padInfo.top, convInfo.padInfo.left] },
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] },
            { type: 'int32', data: [convInfo.dilationHeight, convInfo.dilationWidth] },
            { type: 'int32', data: [tf.util.sizeFromShape(convInfo.outShape)] }
        ];
        var output = fill({ backend: backend, attrs: { shape: filter.shape, value: 0, dtype: dtype } });
        return backend.runWebGPUProgram(program, [x, filter, dy], dtype, uniformData, output);
    }
    var dilation2DBackpropFilterConfig = {
        kernelName: tf.Dilation2DBackpropFilter,
        backendName: 'webgpu',
        kernelFunc: dilation2DBackpropFilter
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function dilation2DBackpropInput(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, filter = inputs.filter, dy = inputs.dy;
        var strides = attrs.strides, pad = attrs.pad, dilations = attrs.dilations;
        var convInfo = tf.backend_util.computeDilation2DInfo(x.shape, filter.shape, strides, pad, 'NHWC' /* dataFormat */, dilations);
        var dtype = x.dtype;
        var program = new Dilation2DBackpropInputProgram(convInfo, dtype);
        var uniformData = [
            { type: 'int32', data: [convInfo.filterHeight, convInfo.filterWidth] },
            { type: 'int32', data: [convInfo.padInfo.top, convInfo.padInfo.left] },
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] },
            { type: 'int32', data: [convInfo.dilationHeight, convInfo.dilationWidth] },
            { type: 'int32', data: [tf.util.sizeFromShape(convInfo.outShape)] }
        ];
        var output = fill({ backend: backend, attrs: { shape: convInfo.inShape, value: 0, dtype: dtype } });
        return backend.runWebGPUProgram(program, [x, filter, dy], dtype, uniformData, output);
    }
    var dilation2DBackpropInputConfig = {
        kernelName: tf.Dilation2DBackpropInput,
        backendName: 'webgpu',
        kernelFunc: dilation2DBackpropInput
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var DrawProgram = /** @class */ (function () {
        function DrawProgram(outShape, type, textureFormat) {
            this.variableNames = ['Image'];
            this.uniforms = 'alpha: f32,';
            this.workgroupSize = [64, 1, 1];
            this.pixelsOpType = PixelsOpType.DRAW;
            this.size = true;
            this.outputShape = outShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.type = type;
            this.textureFormat = textureFormat;
            this.shaderKey = "draw_".concat(type, "_").concat(textureFormat);
        }
        DrawProgram.prototype.getUserCode = function () {
            var calculateResult;
            var value = this.type === 'float32' ? 'value' : 'value / 255.0';
            calculateResult = "\n      if (uniforms.numChannels == 1) {\n        rgba[0] = ".concat(value, ";\n        rgba[1] = ").concat(value, ";\n        rgba[2] = ").concat(value, ";\n      } else {\n        rgba[d] = ").concat(value, ";\n      }");
            var userCode = "\n       @group(0) @binding(0) var outImage : texture_storage_2d<".concat(this.textureFormat, ", write>;\n       ").concat(getMainHeaderString('index'), " {\n         if (index < uniforms.size) {\n           var rgba = vec4<f32>(0.0, 0.0, 0.0, uniforms.alpha);\n           for (var d = 0; d < uniforms.numChannels; d = d + 1) {\n             let value = f32(inBuf[index * uniforms.numChannels + d]);\n             ").concat(calculateResult, "\n           }\n           rgba.x = rgba.x * rgba.w;\n           rgba.y = rgba.y * rgba.w;\n           rgba.z = rgba.z * rgba.w;\n           let coords = getCoordsFromIndex(index);\n           textureStore(outImage, vec2<i32>(coords.yx), rgba);\n         }\n       }\n      ");
            return userCode;
        };
        return DrawProgram;
    }());

    function draw(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var image = inputs.image;
        var canvas = attrs.canvas, options = attrs.options;
        var _a = __read(image.shape.slice(0, 2), 2), height = _a[0], width = _a[1];
        var imageOptions = (options || {}).imageOptions;
        var alpha = (imageOptions === null || imageOptions === void 0 ? void 0 : imageOptions.alpha) || 1;
        //  'rgba8unorm' should work on macOS according to
        //  https://bugs.chromium.org/p/chromium/issues/detail?id=1298618. But
        //  failed on macOS/M2. So use 'bgra8unorm' first when available.
        var format = backend.device.features.has('bgra8unorm-storage') ?
            'bgra8unorm' :
            'rgba8unorm';
        var outShape = [height, width];
        var program = new DrawProgram(outShape, image.dtype, format);
        canvas.width = width;
        canvas.height = height;
        var backendName = 'webgpu';
        var gpuContext = canvas.getContext(backendName);
        var canvasWebGPU;
        if (!gpuContext) {
            canvasWebGPU = new OffscreenCanvas(width, height);
            gpuContext = canvasWebGPU.getContext(backendName);
        }
        var numChannels = image.shape.length === 3 ? image.shape[2] : 1;
        gpuContext.configure({
            device: backend.device,
            format: format,
            usage: GPUTextureUsage.STORAGE_BINDING,
            alphaMode: 'premultiplied'
        });
        var outputDtype = 'int32';
        var output = backend.makeTensorInfo(outShape, outputDtype);
        var info = backend.tensorMap.get(output.dataId);
        info.resource = gpuContext.getCurrentTexture();
        info.external = true;
        var uniformData = [{ type: 'uint32', data: [numChannels] }, { type: 'float32', data: [alpha] }];
        backend.runWebGPUProgram(program, [image], outputDtype, uniformData, output);
        if (canvasWebGPU) {
            var canvas2dContext = canvas.getContext('2d');
            if (!canvas2dContext) {
                throw new Error("Please make sure this canvas has only been used for 2d or webgpu context!");
            }
            canvas2dContext.drawImage(canvasWebGPU, 0, 0);
        }
        backend.disposeData(output.dataId);
        return image;
    }
    var drawConfig = {
        kernelName: tf.Draw,
        backendName: 'webgpu',
        kernelFunc: draw
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var multiplyKernelFunc = binaryKernelFunc({
        opType: BinaryOpType.MUL,
        cpuKernelImpl: multiplyImplCPU,
        supportsComplex: true
    });
    var multiplyConfig = {
        kernelName: tf.Multiply,
        backendName: 'webgpu',
        kernelFunc: multiplyKernelFunc
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function sum(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var axis = attrs.axis, keepDims = attrs.keepDims;
        return reduce(x, axis, keepDims, 'sum', backend);
    }
    var sumConfig = {
        kernelName: tf.Sum,
        backendName: 'webgpu',
        kernelFunc: sum
    };

    function einsum(args) {
        var e_1, _a, e_2, _b;
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var equation = attrs.equation;
        var tensors = inputs;
        var _c = tf.backend_util.decodeEinsumEquation(equation, tensors.length), allDims = _c.allDims, summedDims = _c.summedDims, idDims = _c.idDims;
        tf.backend_util.checkEinsumDimSizes(allDims.length, idDims, tensors);
        var _d = tf.backend_util.getEinsumComputePath(summedDims, idDims), path = _d.path, steps = _d.steps;
        var nSteps = steps.length;
        var out = null;
        var numDimsRemaining = allDims.length;
        var tensorsToDispose = [];
        for (var i = 0; i < nSteps; ++i) {
            try {
                for (var _e = (e_1 = void 0, __values(steps[i])), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var idTerm = _f.value;
                    var _g = tf.backend_util.getEinsumPermutation(numDimsRemaining, idDims[idTerm]), perm = _g.permutationIndices, dimsToExpand = _g.expandDims;
                    var x = void 0;
                    if (tf.backend_util.isIdentityPermutation(perm)) {
                        x = tensors[idTerm];
                    }
                    else {
                        x = transpose({ inputs: { x: tensors[idTerm] }, backend: backend, attrs: { perm: perm } });
                        tensorsToDispose.push(x);
                    }
                    var targetShape = x.shape.slice();
                    for (var k = 0; k < dimsToExpand.length; ++k) {
                        targetShape.splice(dimsToExpand[k], 0, 1);
                    }
                    if (!tf.util.arraysEqual(x.shape, targetShape)) {
                        x = reshape({ inputs: { x: x }, backend: backend, attrs: { shape: targetShape } });
                        tensorsToDispose.push(x);
                    }
                    if (out === null) {
                        out = x;
                    }
                    else {
                        // tslint:disable-next-line: no-unnecessary-type-assertion
                        out =
                            multiplyKernelFunc({ inputs: { a: x, b: out }, backend: backend });
                        tensorsToDispose.push(out);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (i < nSteps - 1) {
                if (path[i] >= 0) {
                    out = sum({
                        inputs: { x: out },
                        backend: backend,
                        attrs: {
                            axis: path[i] - (allDims.length - numDimsRemaining),
                            keepDims: false
                        }
                    });
                    tensorsToDispose.push(out);
                }
                numDimsRemaining--;
            }
        }
        try {
            // Clean up intermediate tensors.
            for (var tensorsToDispose_1 = __values(tensorsToDispose), tensorsToDispose_1_1 = tensorsToDispose_1.next(); !tensorsToDispose_1_1.done; tensorsToDispose_1_1 = tensorsToDispose_1.next()) {
                var tensorInfo = tensorsToDispose_1_1.value;
                if (tensorInfo === out) {
                    continue;
                }
                backend.disposeData(tensorInfo.dataId);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (tensorsToDispose_1_1 && !tensorsToDispose_1_1.done && (_b = tensorsToDispose_1.return)) _b.call(tensorsToDispose_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return out;
    }
    var einsumConfig = {
        kernelName: tf.Einsum,
        backendName: 'webgpu',
        kernelFunc: einsum
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var elu = unaryKernelFunc({ opType: UnaryOpType.ELU });
    var eluConfig = {
        kernelName: tf.Elu,
        backendName: 'webgpu',
        kernelFunc: elu
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var eluGrad = function (args) {
        var inputs = args.inputs, backend = args.backend;
        var dy = inputs.dy, y = inputs.y;
        var program = new BinaryOpProgram(BinaryOpType.ELU_DER, dy.shape, y.shape);
        return backend.runWebGPUProgram(program, [dy, y], dy.dtype);
    };
    var eluGradConfig = {
        kernelName: tf.EluGrad,
        backendName: 'webgpu',
        kernelFunc: eluGrad
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var equal = binaryKernelFunc({ opType: BinaryOpType.EQUAL, dtype: 'bool', cpuKernelImpl: equalImplCPU });
    var equalConfig = {
        kernelName: tf.Equal,
        backendName: 'webgpu',
        kernelFunc: equal
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var erf = unaryKernelFunc({ opType: UnaryOpType.ERF });
    var erfConfig = {
        kernelName: tf.Erf,
        backendName: 'webgpu',
        kernelFunc: erf
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var exp = unaryKernelFunc({
        opType: UnaryOpType.EXP,
        cpuKernelImpl: expImplCPU,
        dtype: 'float32',
    });
    var expConfig = {
        kernelName: tf.Exp,
        backendName: 'webgpu',
        kernelFunc: exp
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the License);
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an AS IS BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function expandDims(args) {
        var inputs = args.inputs, attrs = args.attrs, backend = args.backend;
        var dim = attrs.dim;
        var input = inputs.input;
        var inputRank = input.shape.length;
        var newShape = input.shape.slice();
        var $dim = dim;
        if (dim < 0) {
            // Negative value is counted from the tail of rank.
            tf.util.assert(-(inputRank + 1) <= dim, function () { return "Axis must be in the interval [".concat(-(inputRank + 1), ", ").concat(inputRank, "]"); });
            $dim = inputRank + dim + 1;
        }
        newShape.splice($dim, 0, 1);
        return reshape({ inputs: { x: input }, backend: backend, attrs: { shape: newShape } });
    }
    var expandDimsConfig = {
        kernelName: tf.ExpandDims,
        backendName: 'webgpu',
        kernelFunc: expandDims,
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var expm1 = unaryKernelFunc({ opType: UnaryOpType.EXPM1, cpuKernelImpl: expm1ImplCPU });
    var expm1Config = {
        kernelName: tf.Expm1,
        backendName: 'webgpu',
        kernelFunc: expm1
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var FFTProgram = /** @class */ (function () {
        function FFTProgram(component, shape) {
            this.variableNames = ['real', 'imag'];
            this.outputShape = [];
            this.uniforms = 'exponentMultiplier : f32, denominator: f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = shape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.component = component;
            this.shaderKey = "fft_".concat(component);
        }
        FFTProgram.prototype.getUserCode = function () {
            var opString = this.component === 'real' ?
                'return real * expR - imag * expI;' :
                'return real * expI + imag * expR;';
            var userCode = "\n    fn unaryOpComplex(real: f32, expR: f32, imag: f32, expI: f32) -> f32 {\n      ".concat(opString, "\n    }\n\n    fn mulMatDFT(batch: i32, index: i32) -> f32 {\n      let indexRatio = f32(index) / f32(uniforms.realShape[1]);\n      let exponentMultiplierTimesIndexRatio =\n          uniforms.exponentMultiplier * indexRatio;\n\n      var result = 0.0;\n\n      for (var i = 0; i < uniforms.realShape[1]; i = i + 1) {\n        // x = (-2|2 * PI / N) * index * i;\n        let x = exponentMultiplierTimesIndexRatio * f32(i);\n        let expR = cos(x);\n        let expI = sin(x);\n        let real = getReal(batch, i);\n        let imag = getImag(batch, i);\n\n        result = result +\n            unaryOpComplex(real, expR, imag, expI) / uniforms.denominator;\n      }\n\n      return result;\n    }\n\n    ").concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getOutputCoords();\n        setOutputAtIndex(index, mulMatDFT(coords[0], coords[1]));\n      }\n    }\n  ");
            return userCode;
        };
        return FFTProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function fftImpl(x, inverse, backend) {
        var xData = backend.tensorMap.get(x.dataId);
        var inputSize = tf.util.sizeFromShape(x.shape);
        // Collapse all outer dimensions to a single batch dimension.
        var innerDimensionSize = x.shape[x.shape.length - 1];
        var batch = inputSize / innerDimensionSize;
        var toDispose = [];
        var input2D = reshape({ inputs: { x: x }, backend: backend, attrs: { shape: [batch, innerDimensionSize] } });
        toDispose.push(input2D);
        var xShape = input2D.shape;
        var realProgram = new FFTProgram('real', xShape);
        var imagProgram = new FFTProgram('imag', xShape);
        var inputs = [
            {
                dataId: xData.complexTensorInfos.real.dataId,
                dtype: xData.complexTensorInfos.real.dtype,
                shape: xShape
            },
            {
                dataId: xData.complexTensorInfos.imag.dataId,
                dtype: xData.complexTensorInfos.imag.dtype,
                shape: xShape
            }
        ];
        var exponentMultiplier = inverse ? 2.0 * Math.PI : -2.0 * Math.PI;
        var denominator = inverse ? xShape[1] : 1.0;
        var uniformData = [
            { type: 'float32', data: [exponentMultiplier] },
            { type: 'float32', data: [denominator] }
        ];
        var realPart = backend.runWebGPUProgram(realProgram, inputs, 'float32', uniformData);
        toDispose.push(realPart);
        var imagPart = backend.runWebGPUProgram(imagProgram, inputs, 'float32', uniformData);
        toDispose.push(imagPart);
        var complexOutput = complex({ inputs: { real: realPart, imag: imagPart }, backend: backend });
        toDispose.push(complexOutput);
        var complexOutputReshaped = reshape({ inputs: { x: complexOutput }, backend: backend, attrs: { shape: x.shape } });
        toDispose.forEach(function (t) { return backend.disposeData(t.dataId); });
        return complexOutputReshaped;
    }

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function fft(args) {
        var inputs = args.inputs, backend = args.backend;
        var input = inputs.input;
        return fftImpl(input, false /* inverse */, backend);
    }
    var fftConfig = {
        kernelName: tf.FFT,
        backendName: 'webgpu',
        kernelFunc: fft
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var FlipLeftRightProgram = /** @class */ (function () {
        function FlipLeftRightProgram(imageShape) {
            this.outputShape = [];
            this.variableNames = ['x'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = imageShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'flipLeftRight';
        }
        FlipLeftRightProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          let coordX = uniforms.xShape[2] - coords[2] - 1;\n          let outputValue = getX(coords[0], coords[1], coordX, coords[3]);\n          setOutputAtIndex(index, outputValue);\n        }\n      }\n    ");
            return userCode;
        };
        return FlipLeftRightProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var flipLeftRightConfig = {
        kernelName: tf.FlipLeftRight,
        backendName: 'webgpu',
        kernelFunc: function (_a) {
            var inputs = _a.inputs, backend = _a.backend;
            var image = inputs.image;
            var webgpuBackend = backend;
            var program = new FlipLeftRightProgram(image.shape);
            var output = webgpuBackend.runWebGPUProgram(program, [image], image.dtype);
            return output;
        }
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var floor = unaryKernelFunc({ opType: UnaryOpType.FLOOR, cpuKernelImpl: floorImplCPU });
    var floorConfig = {
        kernelName: tf.Floor,
        backendName: 'webgpu',
        kernelFunc: floor
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var floorDiv = binaryKernelFunc({
        opType: BinaryOpType.FLOOR_DIV,
        cpuKernelImpl: floorDivImplCPU,
        dtype: 'int32'
    });
    var floorDivConfig = {
        kernelName: tf.FloorDiv,
        backendName: 'webgpu',
        kernelFunc: floorDiv
    };

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var FromPixelsProgram = /** @class */ (function () {
        function FromPixelsProgram(outputShape, numChannels, importVideo) {
            if (importVideo === void 0) { importVideo = false; }
            this.pixelsOpType = PixelsOpType.FROM_PIXELS;
            this.outputShape = [0];
            this.variableNames = [];
            this.workgroupSize = [256, 1, 1]; // The empirical value.
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [numChannels, 1, 1]);
            this.importVideo = importVideo;
            this.shaderKey = "fromPixels_".concat(this.importVideo);
        }
        FromPixelsProgram.prototype.getUserCode = function () {
            var textureLoad = this.importVideo ?
                'textureLoad(src, vec2<i32>(coords.yx));' :
                'textureLoad(src, vec2<i32>(coords.yx), 0)';
            var textureType = this.importVideo ? 'texture_external' : 'texture_2d<f32>';
            return "\n      @binding(1) @group(0) var src: ".concat(textureType, ";\n      ").concat(getMainHeaderString('index'), " {\n        let flatIndex = index * uniforms.numChannels;\n        if (flatIndex < uniforms.size) {\n          let coords = getCoordsFromIndex(flatIndex);\n          let values = ").concat(textureLoad, ";\n          for (var i = 0; i < uniforms.numChannels; i = i + 1) {\n            result[flatIndex + i] = i32(floor(255.0 * values[i]));\n          }\n        }\n      }\n  ");
        };
        return FromPixelsProgram;
    }());

    var fromPixelsConfig = {
        kernelName: tf.FromPixels,
        backendName: 'webgpu',
        kernelFunc: fromPixels,
    };
    var fromPixels2DContext;
    var willReadFrequently = tf.env().getBool('CANVAS2D_WILL_READ_FREQUENTLY_FOR_GPU');
    function fromPixels(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var pixels = inputs.pixels;
        var numChannels = attrs.numChannels;
        if (pixels == null) {
            throw new Error('pixels passed to tf.browser.fromPixels() can not be null');
        }
        var isVideo = typeof (HTMLVideoElement) !== 'undefined' &&
            pixels instanceof HTMLVideoElement;
        var isImage = typeof (HTMLImageElement) !== 'undefined' &&
            pixels instanceof HTMLImageElement;
        var isCanvas = (typeof (HTMLCanvasElement) !== 'undefined' &&
            pixels instanceof HTMLCanvasElement) ||
            (typeof (OffscreenCanvas) !== 'undefined' &&
                pixels instanceof OffscreenCanvas);
        var isImageBitmap = typeof (ImageBitmap) !== 'undefined' && pixels instanceof ImageBitmap;
        var _a = __read(isVideo ?
            [
                pixels.videoWidth,
                pixels.videoHeight
            ] :
            [pixels.width, pixels.height], 2), width = _a[0], height = _a[1];
        var outputShape = [height, width, numChannels];
        var importVideo = tf.env().getBool('WEBGPU_IMPORT_EXTERNAL_TEXTURE') && isVideo;
        var isVideoOrImage = isVideo || isImage;
        if (isImageBitmap || isCanvas || isVideoOrImage) {
            var resource = void 0;
            if (importVideo) {
                resource = backend.device.importExternalTexture({ source: pixels });
            }
            else {
                if (isVideoOrImage) {
                    var newWillReadFrequently = tf.env().getBool('CANVAS2D_WILL_READ_FREQUENTLY_FOR_GPU');
                    if (fromPixels2DContext == null ||
                        newWillReadFrequently !== willReadFrequently) {
                        willReadFrequently = newWillReadFrequently;
                        fromPixels2DContext = document.createElement('canvas').getContext('2d', { willReadFrequently: willReadFrequently });
                    }
                    fromPixels2DContext.canvas.width = width;
                    fromPixels2DContext.canvas.height = height;
                    fromPixels2DContext.drawImage(pixels, 0, 0, width, height);
                    pixels = fromPixels2DContext.canvas;
                }
                var usage = GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
                var format = 'rgba8unorm';
                var texture = backend.textureManager.acquireTexture(outputShape[1], outputShape[0], format, usage);
                backend.queue.copyExternalImageToTexture({ source: pixels }, { texture: texture }, [outputShape[1], outputShape[0]]);
                resource = texture;
            }
            var size = tf.util.sizeFromShape(outputShape);
            var strides = tf.util.computeStrides(outputShape);
            var program = new FromPixelsProgram(outputShape, numChannels, importVideo);
            var uniformData = [
                { type: 'uint32', data: [size] }, { type: 'uint32', data: [numChannels] },
                { type: 'uint32', data: __spreadArray([], __read(strides), false) }
            ];
            var input = backend.makeTensorInfo([height, width], 'int32');
            var info = backend.tensorMap.get(input.dataId);
            info.resource = resource;
            var result = backend.runWebGPUProgram(program, [input], 'int32', uniformData);
            backend.disposeData(input.dataId);
            return result;
        }
        // TODO: Encoding should happen on GPU once we no longer have to download
        // image data to the CPU.
        var imageData = pixels.data;
        var pixelArray = imageData;
        if (numChannels != null && numChannels !== 4) {
            pixelArray = new Uint8Array(pixels.width * pixels.height * numChannels);
            var dataLength = imageData.length;
            var j = 0;
            for (var i = 0; i < dataLength; i++) {
                if (i % 4 < numChannels) {
                    pixelArray[j++] = imageData[i];
                }
            }
        }
        var output = backend.makeTensorInfo(outputShape, 'int32', new Int32Array(pixelArray));
        backend.uploadToGPU(output.dataId);
        return output;
    }

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var BatchNormProgram = /** @class */ (function () {
        function BatchNormProgram(xShape, meanShape, varianceShape, offsetShape, scaleShape) {
            this.uniforms = 'varianceEpsilon : f32,';
            // This is an experimental value.
            this.workgroupSize = [128, 1, 1];
            this.size = true;
            this.variableNames = ['x', 'mean', 'variance'];
            tf.backend_util.assertAndGetBroadcastShape(xShape, meanShape);
            tf.backend_util.assertAndGetBroadcastShape(xShape, varianceShape);
            this.outputShape = xShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            if (offsetShape != null) {
                tf.backend_util.assertAndGetBroadcastShape(xShape, offsetShape);
                this.variableNames.push('offset');
            }
            if (scaleShape != null) {
                tf.backend_util.assertAndGetBroadcastShape(xShape, scaleShape);
                this.variableNames.push('scale');
            }
            this.offsetShape = offsetShape;
            this.scaleShape = scaleShape;
            this.shaderKey = 'batchNorm';
        }
        BatchNormProgram.prototype.getUserCode = function () {
            var offsetSnippet = '0.0';
            if (this.offsetShape != null) {
                offsetSnippet = 'getOffsetByOutputIndex(index)';
            }
            var scaleSnippet = '1.0';
            if (this.scaleShape != null) {
                scaleSnippet = 'getScaleByOutputIndex(index)';
            }
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size)\n        {\n          let xValue = getXByOutputIndex(index);\n          let meanValue = getMeanByOutputIndex(index);\n          let varianValue = getVarianceByOutputIndex(index);\n          let offsetValue = ").concat(offsetSnippet, ";\n          let scaleValue = ").concat(scaleSnippet, ";\n          let inv = scaleValue * inverseSqrt(varianValue + f32(uniforms.varianceEpsilon));\n          setOutputAtIndex(index,dot(vec3<f32>(xValue, -meanValue, offsetValue), vec3<f32>(inv, inv, 1.0)));\n        }\n      }\n  ");
            return userCode;
        };
        return BatchNormProgram;
    }());

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var fusedBatchNormConfig = {
        kernelName: tf.FusedBatchNorm,
        backendName: 'webgpu',
        kernelFunc: function (_a) {
            var inputs = _a.inputs, attrs = _a.attrs, backend = _a.backend;
            var x = inputs.x, scale = inputs.scale, offset = inputs.offset, mean = inputs.mean, variance = inputs.variance;
            var varianceEpsilon = attrs.varianceEpsilon;
            var webGPUBackend = backend;
            var batchNormInputs = [x, mean, variance];
            var offsetShape = null;
            if (offset != null) {
                offsetShape = offset.shape;
                batchNormInputs.push(offset);
            }
            var scaleShape = null;
            if (scale != null) {
                scaleShape = scale.shape;
                batchNormInputs.push(scale);
            }
            var program = new BatchNormProgram(x.shape, mean.shape, variance.shape, offsetShape, scaleShape);
            var uniformData = [{ type: 'float32', data: [varianceEpsilon] }];
            return webGPUBackend.runWebGPUProgram(program, batchNormInputs, x.dtype, uniformData);
        }
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function fusedConv2d(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, filter = inputs.filter, bias = inputs.bias, preluActivationWeights = inputs.preluActivationWeights;
        var strides = attrs.strides, pad = attrs.pad, dataFormat = attrs.dataFormat, dilations = attrs.dilations, dimRoundingMode = attrs.dimRoundingMode, activation = attrs.activation, leakyreluAlpha = attrs.leakyreluAlpha;
        var $dataFormat = tf.backend_util.convertConv2DDataFormat(dataFormat);
        var convInfo = tf.backend_util.computeConv2DInfo(x.shape, filter.shape, strides, dilations, pad, dimRoundingMode, false /* depthwise */, $dataFormat);
        return conv2DImpl({
            x: x,
            filter: filter,
            convInfo: convInfo,
            backend: backend,
            bias: bias,
            preluActivationWeights: preluActivationWeights,
            leakyreluAlpha: leakyreluAlpha,
            activation: activation
        });
    }
    var fusedConv2DConfig = {
        kernelName: tf.FusedConv2D,
        backendName: 'webgpu',
        kernelFunc: fusedConv2d,
    };

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function fusedDepthwiseConv2D(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, filter = inputs.filter, bias = inputs.bias, preluActivationWeights = inputs.preluActivationWeights;
        var strides = attrs.strides, pad = attrs.pad, dilations = attrs.dilations, dimRoundingMode = attrs.dimRoundingMode, activation = attrs.activation, leakyreluAlpha = attrs.leakyreluAlpha;
        var $dilations = dilations;
        if ($dilations == null) {
            $dilations = [1, 1];
        }
        tf.util.assert(tf.backend_util.eitherStridesOrDilationsAreOne(strides, $dilations), function () { return 'Error in depthwiseConv2d: Either strides or dilations must be ' +
            "1. Got strides ".concat(strides, " and dilations '").concat($dilations, "'"); });
        var convInfo = tf.backend_util.computeConv2DInfo(x.shape, filter.shape, strides, $dilations, pad, dimRoundingMode, true /* depthwise */);
        var programInputs = [x, filter];
        var hasBias = bias != null;
        var hasPreluActivationWeights = preluActivationWeights != null;
        if (hasBias) {
            programInputs.push(bias);
        }
        if (hasPreluActivationWeights) {
            programInputs.push(preluActivationWeights);
        }
        var dimensions = [
            { type: 'int32', data: [convInfo.padInfo.top, convInfo.padInfo.left] },
            { type: 'int32', data: [convInfo.inHeight, convInfo.inWidth] },
        ];
        var program;
        if (convInfo.outHeight > 4 && convInfo.outWidth > 4 &&
            convInfo.strideWidth <= 2 &&
            convInfo.inChannels === convInfo.outChannels &&
            convInfo.dilationHeight === 1 && convInfo.dilationWidth === 1 &&
            convInfo.inChannels % 4 === 0) {
            program = new DepthwiseConv2DVec4Program(convInfo, hasBias, activation, hasPreluActivationWeights);
            dimensions.push({ type: 'int32', data: [program.virtualWidth] });
        }
        else {
            program = new DepthwiseConv2DProgram(convInfo, hasBias, activation, hasPreluActivationWeights);
            dimensions.push({ type: 'int32', data: [convInfo.filterHeight] }, { type: 'int32', data: [convInfo.filterWidth] }, { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] }, {
                type: 'int32',
                data: [convInfo.dilationHeight, convInfo.dilationWidth]
            });
        }
        if (activation === 'leakyrelu') {
            dimensions.push({ type: 'float32', data: [leakyreluAlpha] });
            program.uniforms += ' alpha : f32,';
        }
        var result = backend.runWebGPUProgram(program, programInputs, 'float32', dimensions);
        return result;
    }
    var fusedDepthwiseConv2DConfig = {
        kernelName: tf.FusedDepthwiseConv2D,
        backendName: 'webgpu',
        kernelFunc: fusedDepthwiseConv2D,
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var GatherNDProgram = /** @class */ (function () {
        function GatherNDProgram(sliceDim, shape) {
            this.variableNames = ['A', 'indices'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = shape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "gathernd_".concat(sliceDim);
            this.sliceDim = sliceDim;
            this.uniforms = "sliceDim : i32, strides : ".concat(getCoordsDataType(sliceDim), ",");
        }
        GatherNDProgram.prototype.getUserCode = function () {
            var strideString;
            if (this.sliceDim > 1) {
                strideString = 'uniforms.strides[j]';
            }
            else {
                strideString = 'uniforms.strides';
            }
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          var flattenIndex = 0;\n          for (var j = 0; j < uniforms.sliceDim; j = j + 1) {\n            let indexTemp = i32(round(getIndices(coords[0], j)));\n            let strideNum = ").concat(strideString, ";\n            flattenIndex = flattenIndex + indexTemp * strideNum;\n          }\n\n          setOutputAtIndex(index, getA(flattenIndex, coords[1]));\n        }\n      }\n      ");
            return userCode;
        };
        return GatherNDProgram;
    }());

    function gatherNd(args) {
        var inputs = args.inputs, backend = args.backend;
        var params = inputs.params, indices = inputs.indices;
        var indicesShape = indices.shape;
        var sliceRank = indicesShape[indicesShape.length - 1];
        var paramsSize = tf.util.sizeFromShape(params.shape);
        var _a = __read(tf.backend_util.prepareAndValidate(params, indices), 4), resultShape = _a[0], numSlices = _a[1], sliceSize = _a[2], strides = _a[3];
        var flattenIndices = reshape({ inputs: { x: indices }, backend: backend, attrs: { shape: [numSlices, sliceRank] } });
        var flattenX = reshape({
            inputs: { x: params },
            backend: backend,
            attrs: { shape: [(tf.util.sizeFromShape(params.shape) / sliceSize), sliceSize] }
        });
        if (backend.shouldExecuteOnCPU([params, indices]) ||
            params.dtype === 'string') {
            var indicesData = backend.readSync(indices.dataId);
            var paramsBuf = backend.bufferSync(params);
            var outValue = gatherNdImplCPU(indicesData, paramsBuf, params.dtype, numSlices, sliceRank, sliceSize, strides, params.shape, paramsSize);
            return backend.makeTensorInfo(resultShape, params.dtype, outValue.values);
        }
        var program = new GatherNDProgram(sliceRank, [numSlices, sliceSize]);
        var uniformData = [{ type: 'int32', data: [sliceRank] }, { type: 'int32', data: strides }];
        var res = backend.runWebGPUProgram(program, [flattenX, flattenIndices], flattenX.dtype, uniformData);
        var reshaped = reshape({ inputs: { x: res }, backend: backend, attrs: { shape: resultShape } });
        backend.disposeData(flattenIndices.dataId);
        backend.disposeData(flattenX.dataId);
        backend.disposeData(res.dataId);
        return reshaped;
    }
    var gatherNdConfig = {
        kernelName: tf.GatherNd,
        backendName: 'webgpu',
        kernelFunc: gatherNd
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var GatherProgram = /** @class */ (function () {
        function GatherProgram(aShape, outputShape) {
            this.variableNames = ['A', 'indices'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = aShape.slice();
            this.aShape = aShape;
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "gather";
        }
        GatherProgram.prototype.getUserCode = function () {
            var sourceCoords = getSourceCoords$1(this.aShape);
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let resRC = getCoordsFromIndex(index);\n          let indexZ = i32(getIndices(resRC.x, resRC.z));\n          let inBounds = select(0.0, 1.0, indexZ >= 0 && indexZ < uniforms.aShape[2]);\n          setOutputAtIndex(index, inBounds * getA(").concat(sourceCoords, "));\n        }\n      }\n    ");
            return userCode;
        };
        return GatherProgram;
    }());
    // The input and output are always flattened into rank 4 tensors.
    function getSourceCoords$1(aShape) {
        var currentCoords = ['resRC.x', 'resRC.y', 'resRC.z', 'resRC.w'];
        var sourceCoords = [];
        for (var i = 0; i < aShape.length; i++) {
            if (i === 2) {
                sourceCoords.push('indexZ');
            }
            else {
                sourceCoords.push("".concat(currentCoords[i]));
            }
        }
        return sourceCoords.join();
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function gatherV2(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, indices = inputs.indices;
        var axis = attrs.axis, batchDims = attrs.batchDims;
        // Unlike WebGL, WebGPU won't check if index is out of bound by calling
        // backend.readSync() function in debug mode.
        var parsedAxis = tf.util.parseAxisParam(axis, x.shape)[0];
        var shapeInfo = tf.backend_util.segment_util.collectGatherOpShapeInfo(x, indices, parsedAxis, batchDims);
        var indicesSize = tf.util.sizeFromShape(indices.shape);
        var toDispose = [];
        var flattenX = reshape({
            inputs: { x: x },
            backend: backend,
            attrs: {
                shape: [
                    shapeInfo.batchSize, shapeInfo.outerSize, shapeInfo.dimSize,
                    shapeInfo.sliceSize
                ]
            }
        });
        var flattenIndex = reshape({
            inputs: { x: indices },
            backend: backend,
            attrs: { shape: [shapeInfo.batchSize, indicesSize / shapeInfo.batchSize] }
        });
        toDispose.push(flattenX);
        toDispose.push(flattenIndex);
        var flattenOutputShape = [
            shapeInfo.batchSize, shapeInfo.outerSize, indicesSize / shapeInfo.batchSize,
            shapeInfo.sliceSize
        ];
        if (backend.shouldExecuteOnCPU([x, indices])) {
            var indicesTensorData = backend.tensorMap.get(flattenIndex.dataId);
            var indicesValues = indicesTensorData.values;
            var indicesBuffer = tf.buffer(flattenIndex.shape, flattenIndex.dtype, indicesValues);
            var flattenXTensorData = backend.tensorMap.get(flattenX.dataId);
            var xValues = flattenXTensorData.values;
            var xBuffer = tf.buffer(flattenX.shape, flattenX.dtype, xValues);
            var outBuf = gatherV2ImplCPU(xBuffer, indicesBuffer, flattenOutputShape);
            toDispose.forEach(function (t) { return backend.disposeData(t.dataId); });
            return backend.makeTensorInfo(shapeInfo.outputShape, outBuf.dtype, outBuf.values);
        }
        var program = new GatherProgram(flattenX.shape, flattenOutputShape);
        var res = backend.runWebGPUProgram(program, [flattenX, flattenIndex], flattenX.dtype);
        toDispose.push(res);
        var reshaped = reshape({ inputs: { x: res }, backend: backend, attrs: { shape: shapeInfo.outputShape } });
        toDispose.forEach(function (t) { return backend.disposeData(t.dataId); });
        return reshaped;
    }
    var gatherV2Config = {
        kernelName: tf.GatherV2,
        backendName: 'webgpu',
        kernelFunc: gatherV2
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var greater = binaryKernelFunc({
        opType: BinaryOpType.GREATER,
        cpuKernelImpl: greaterImplCPU,
        dtype: 'bool',
    });
    var greaterConfig = {
        kernelName: tf.Greater,
        backendName: 'webgpu',
        kernelFunc: greater
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var greaterEqual = binaryKernelFunc({
        opType: BinaryOpType.GREATER_EQUAL,
        dtype: 'bool',
        cpuKernelImpl: greaterEqualImplCPU
    });
    var greaterEqualConfig = {
        kernelName: tf.GreaterEqual,
        backendName: 'webgpu',
        kernelFunc: greaterEqual
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function ifft(args) {
        var inputs = args.inputs, backend = args.backend;
        var input = inputs.input;
        return fftImpl(input, true /* inverse */, backend);
    }
    var ifftConfig = {
        kernelName: tf.IFFT,
        backendName: 'webgpu',
        kernelFunc: ifft
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var isFinite = unaryKernelFunc({ opType: UnaryOpType.IS_FINITE, dtype: 'bool' });
    var isFiniteConfig = {
        kernelName: tf.IsFinite,
        backendName: 'webgpu',
        kernelFunc: isFinite
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var isInf = unaryKernelFunc({ opType: UnaryOpType.IS_INF, dtype: 'bool' });
    var isInfConfig = {
        kernelName: tf.IsInf,
        backendName: 'webgpu',
        kernelFunc: isInf
    };

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var isNaN = unaryKernelFunc({ opType: UnaryOpType.IS_NAN, dtype: 'bool' });
    var isNaNConfig = {
        kernelName: tf.IsNan,
        backendName: 'webgpu',
        kernelFunc: isNaN
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function leakyRelu(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var alpha = attrs.alpha;
        var uniformData = [{ type: 'float32', data: [alpha] }];
        var program = new UnaryOpProgram(x.shape, UnaryOpType.LEAKYRELU, 'alpha : f32,');
        return backend.runWebGPUProgram(program, [x], 'float32', uniformData);
    }
    var leakyReluConfig = {
        kernelName: tf.LeakyRelu,
        backendName: 'webgpu',
        kernelFunc: leakyRelu
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var less = binaryKernelFunc({ opType: BinaryOpType.LESS, dtype: 'bool', cpuKernelImpl: lessImplCPU });
    var lessConfig = {
        kernelName: tf.Less,
        backendName: 'webgpu',
        kernelFunc: less
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var lessEqual = binaryKernelFunc({
        opType: BinaryOpType.LESS_EQUAL,
        dtype: 'bool',
        cpuKernelImpl: lessEqualImplCPU
    });
    var lessEqualConfig = {
        kernelName: tf.LessEqual,
        backendName: 'webgpu',
        kernelFunc: lessEqual
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var LinSpaceProgram = /** @class */ (function () {
        function LinSpaceProgram(shape) {
            this.variableNames = [];
            this.outputShape = [];
            this.uniforms = 'start : f32, step : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = [shape];
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'linSpace';
        }
        LinSpaceProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          setOutputAtIndex(index, uniforms.start + f32(index) * uniforms.step);\n        }\n      }\n    ");
            return userCode;
        };
        return LinSpaceProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function linSpace(args) {
        var backend = args.backend, attrs = args.attrs;
        var start = attrs.start, stop = attrs.stop, num = attrs.num;
        var step = (stop - start) / (num - 1);
        var program = new LinSpaceProgram(num);
        var uniformData = [{ type: 'float32', data: [start] }, { type: 'float32', data: [step] }];
        return backend.runWebGPUProgram(program, [], 'float32', uniformData);
    }
    var linSpaceConfig = {
        kernelName: tf.LinSpace,
        backendName: 'webgpu',
        kernelFunc: linSpace
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var log = unaryKernelFunc({ opType: UnaryOpType.LOG, cpuKernelImpl: logImplCPU });
    var logConfig = {
        kernelName: tf.Log,
        backendName: 'webgpu',
        kernelFunc: log
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var log1p = unaryKernelFunc({ opType: UnaryOpType.LOG1P });
    var log1pConfig = {
        kernelName: tf.Log1p,
        backendName: 'webgpu',
        kernelFunc: log1p
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var logicalAnd = binaryKernelFunc({ opType: BinaryOpType.LOGICAL_AND, dtype: 'bool' });
    var logicalAndConfig = {
        kernelName: tf.LogicalAnd,
        backendName: 'webgpu',
        kernelFunc: logicalAnd
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var logicalNot = unaryKernelFunc({ opType: UnaryOpType.LOGICAL_NOT });
    var logicalNotConfig = {
        kernelName: tf.LogicalNot,
        backendName: 'webgpu',
        kernelFunc: logicalNot
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var logicalOr = binaryKernelFunc({ opType: BinaryOpType.LOGICAL_OR });
    var logicalOrConfig = {
        kernelName: tf.LogicalOr,
        backendName: 'webgpu',
        kernelFunc: logicalOr
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var powOperatorSnippet = "\n  var powValue = 0.0;\n  let basis = uniforms.bias + uniforms.alpha * sum;\n  if (uniforms.beta == 0.5) {\n    powValue = inverseSqrt(basis);\n  } else if (uniforms.beta == 1.0) {\n    powValue = 1.0 / basis;\n  } else {\n    powValue = exp(log(basis) * (-uniforms.beta));\n  }\n";
    var LRNProgram = /** @class */ (function () {
        function LRNProgram(xShape) {
            this.outputShape = [];
            this.variableNames = ['x'];
            this.uniforms = 'radius : i32, bias : f32, alpha : f32, beta : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = xShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'lrn';
        }
        LRNProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getOutputCoords();\n        let b = coords[0];\n        let r = coords[1];\n        let c = coords[2];\n        let d = coords[3];\n\n        let x = getX(b, r, c, d);\n        var sum = 0.0;\n        for (var i = -uniforms.radius; i <= uniforms.radius; i = i + 1) {\n          let idx = d + i;\n          if (idx >= 0 && idx < uniforms.xShape[3]) {\n            let z = getX(b, r, c, idx);\n            sum = sum + z * z;\n          }\n        }\n        ").concat(powOperatorSnippet, "\n\n        setOutputAtIndex(index, x * powValue);\n      }\n    }\n  ");
            return userCode;
        };
        return LRNProgram;
    }());
    var LRNSharedProgram = /** @class */ (function () {
        function LRNSharedProgram(xShape, radius) {
            var _this = this;
            this.outputShape = [];
            this.variableNames = ['x'];
            this.uniforms = 'radius : i32, bias : f32, alpha : f32, beta : f32,';
            this.workgroupSize = [256, 1, 1];
            this.maxAllowRadius = 16;
            tf.util.assert(radius <= this.maxAllowRadius, function () { return "Radius must be less than or equal to ".concat(_this.maxAllowRadius, ", current radius is ").concat(radius); });
            this.outputShape = xShape;
            // The reason why not using this.workgroupSize[0] + 2 * maxAllowRadius here
            // is to make sure that there is only one time global memory load access for
            // each thread.
            this.elementsPerWorkgroup = this.workgroupSize[0] - 2 * this.maxAllowRadius;
            this.dispatchLayout = { x: [3], y: [2], z: [0, 1] };
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, [
                this.elementsPerWorkgroup, this.workgroupSize[1], this.workgroupSize[2]
            ]);
            this.shaderKey = 'lrn_shared';
        }
        LRNSharedProgram.prototype.getUserCode = function () {
            var userCode = "\n    var <workgroup>lrnSub: array<f32, ".concat(this.workgroupSize[0], ">;\n    const elementsPerWorkgroup = ").concat(this.elementsPerWorkgroup, ";\n    const maxAllowRadius = ").concat(this.maxAllowRadius, ";\n\n    ").concat(getMainHeaderString(), " {\n      let localDepth = i32(localId.x);\n      let workgroupDepth = i32(workgroupId.x) * elementsPerWorkgroup;\n      let xDepth = workgroupDepth + localDepth - maxAllowRadius;\n      let b = i32(globalId.z) / uniforms.xShape[1];\n      let r = i32(globalId.z) - b * uniforms.xShape[1];\n      let c = i32(globalId.y);\n      let d = workgroupDepth + localDepth;\n\n      var x = 0.0;\n      if (xDepth >= 0 && xDepth < uniforms.xShape[3]) {\n        x = getX(b, r, c, xDepth);\n      }\n      lrnSub[localDepth] = x;\n      workgroupBarrier();\n\n      if (localDepth < elementsPerWorkgroup && d < uniforms.outShape[3]) {\n        var sum = 0.0;\n        let index = localDepth + maxAllowRadius;\n        for (var i = -uniforms.radius; i <= uniforms.radius; i = i + 1) {\n          let z = lrnSub[index + i];\n          sum = sum + z * z;\n        }\n        ").concat(powOperatorSnippet, "\n\n        setOutputAtCoords(b, r, c, d, lrnSub[index] * powValue);\n      }\n    } ");
            return userCode;
        };
        return LRNSharedProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function lrn(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var depthRadius = attrs.depthRadius, bias = attrs.bias, alpha = attrs.alpha, beta = attrs.beta;
        // When the adjacent channels is less than or equal to 16, which could cover
        // most cases, we use shared memory version to get better performance.
        // The theoretical adjacent channels may be very large, but the shared memory
        // size of hardware is limited, so we use the naive version when the adjacent
        // channels is large.
        var program;
        if (depthRadius > 16) {
            program = new LRNProgram(x.shape);
        }
        else {
            program = new LRNSharedProgram(x.shape, depthRadius);
        }
        var uniformData = [
            { type: 'int32', data: [depthRadius] }, { type: 'float32', data: [bias] },
            { type: 'float32', data: [alpha] }, { type: 'float32', data: [beta] }
        ];
        var res = backend.runWebGPUProgram(program, [x], x.dtype, uniformData);
        return res;
    }
    var lrnConfig = {
        kernelName: tf.LRN,
        backendName: 'webgpu',
        kernelFunc: lrn
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var LRNGradProgram = /** @class */ (function () {
        function LRNGradProgram(inputShape) {
            this.outputShape = [];
            this.variableNames = ['inputImage', 'outputImage', 'dy'];
            this.uniforms = 'depthRadius : i32, bias : f32, alpha : f32, beta : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = inputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'lrn_grad';
        }
        LRNGradProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getOutputCoords();\n        let b = coords[0];\n        let r = coords[1];\n        let c = coords[2];\n\n        let MIN_DEPTH_BEGIN = 0;\n        let MAX_DEPTH_END = uniforms.outShape[3];\n        var result = 0.0;\n        for (var d = MIN_DEPTH_BEGIN; d < MAX_DEPTH_END; d++) {\n          let depthBegin = max(MIN_DEPTH_BEGIN, d - uniforms.depthRadius);\n          let depthEnd = min(MAX_DEPTH_END, d + uniforms.depthRadius + 1);\n\n          var norm = 0.0;\n          for (var k = MIN_DEPTH_BEGIN; k < MAX_DEPTH_END; k++) {\n            if (k < depthBegin) {\n              continue;\n            } else if (k >= depthBegin && k < depthEnd) {\n              norm += getInputImage(b, r, c, k) * getInputImage(b, r, c, k);\n            } else {\n              break;\n            }\n          }\n\n          norm = uniforms.alpha * norm + uniforms.bias;\n\n          for (var k = MIN_DEPTH_BEGIN; k < MAX_DEPTH_END; k++) {\n            if (k < depthBegin) {\n              continue;\n            } else if (k >= depthBegin && k < depthEnd) {\n              var dyi = -2.0 * uniforms.alpha * uniforms.beta\n                * getInputImage(b, r, c, k) * getOutputImage(b, r, c, d) / norm;\n              if (k == d) {\n                dyi += pow(norm, -1.0 * uniforms.beta);\n              }\n              if (k == coords[3]) {\n                dyi *= getDy(b, r, c, d);\n                result += dyi;\n              }\n            } else {\n              break;\n            }\n          }\n        }\n\n        setOutputAtIndex(index, result);\n      }\n    }\n  ");
            return userCode;
        };
        return LRNGradProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function lrnGrad(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, y = inputs.y, dy = inputs.dy;
        var depthRadius = attrs.depthRadius, bias = attrs.bias, alpha = attrs.alpha, beta = attrs.beta;
        var program = new LRNGradProgram(x.shape);
        var uniformData = [
            { type: 'int32', data: [depthRadius] }, { type: 'float32', data: [bias] },
            { type: 'float32', data: [alpha] }, { type: 'float32', data: [beta] }
        ];
        var res = backend.runWebGPUProgram(program, [x, y, dy], x.dtype, uniformData);
        return res;
    }
    var lrnGradConfig = {
        kernelName: tf.LRNGrad,
        backendName: 'webgpu',
        kernelFunc: lrnGrad
    };

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var maximum = binaryKernelFunc({
        opType: BinaryOpType.MAX,
        cpuKernelImpl: maximumImplCPU,
    });
    var maximumConfig = {
        kernelName: tf.Maximum,
        backendName: 'webgpu',
        kernelFunc: maximum
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function maxPool(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var filterSize = attrs.filterSize, strides = attrs.strides, pad = attrs.pad, dimRoundingMode = attrs.dimRoundingMode;
        var dilations = 1;
        var convInfo = tf.backend_util.computePool2DInfo(x.shape, filterSize, strides, dilations, pad, dimRoundingMode);
        return poolImpl(x, convInfo, 'max', backend);
    }
    var maxPoolConfig = {
        kernelName: tf.MaxPool,
        backendName: 'webgpu',
        kernelFunc: maxPool
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function maxPool3d(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var filterSize = attrs.filterSize, strides = attrs.strides, pad = attrs.pad, dataFormat = attrs.dataFormat, dimRoundingMode = attrs.dimRoundingMode;
        var dilations = [1, 1, 1];
        var convInfo = tf.backend_util.computePool3DInfo(x.shape, filterSize, strides, dilations, pad, dimRoundingMode, dataFormat);
        var maxPoolProgram = new Pool3DProgram(convInfo, 'max');
        var dimensions = [
            {
                type: 'int32',
                data: [convInfo.strideDepth, convInfo.strideHeight, convInfo.strideWidth]
            },
            {
                type: 'int32',
                data: [convInfo.padInfo.front, convInfo.padInfo.top, convInfo.padInfo.left]
            },
            {
                type: 'int32',
                data: [convInfo.inDepth, convInfo.inHeight, convInfo.inWidth]
            },
            {
                type: 'int32',
                data: [
                    convInfo.effectiveFilterDepth, convInfo.effectiveFilterHeight,
                    convInfo.effectiveFilterWidth
                ]
            }
        ];
        return backend.runWebGPUProgram(maxPoolProgram, [x], x.dtype, dimensions);
    }
    var maxPool3DConfig = {
        kernelName: tf.MaxPool3D,
        backendName: 'webgpu',
        kernelFunc: maxPool3d
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var MaxPool2DBackpropProgram = /** @class */ (function () {
        function MaxPool2DBackpropProgram(convInfo) {
            this.variableNames = ['dy', 'maxPos'];
            this.uniforms = "strides : vec2<i32>, pads : vec2<i32>, dilations : vec2<i32>, filterDims : vec2<i32>,\n       outHeight : i32, outWidth : i32";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.inShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'maxPool2DBackprop';
        }
        MaxPool2DBackpropProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let batch = coords[0];\n        let d = coords[3];\n\n        let dyRCCorner = vec2<i32>(coords.yz) - uniforms.pads;\n        let dyRCorner = dyRCCorner.x;\n        let dyCCorner = dyRCCorner.y;\n\n        // Convolve dy(?, ?, d) with pos mask(:, :, d) to get dx(xR, xC, d).\n        // ? = to be determined. : = across all values in that axis.\n        var dotProd = 0.0;\n        let lastIndex = uniforms.filterDims[0] * uniforms.filterDims[1] - 1;\n        for (var wR = 0; wR < uniforms.filterDims[0]; wR += uniforms.dilations[0]) {\n          let dyR = f32(dyRCorner + wR) / f32(uniforms.strides[0]);\n\n          if (dyR < 0.0 || dyR >= f32(uniforms.outHeight) || fract(dyR) > 0.0) {\n            continue;\n          }\n          let idyR = i32(dyR);\n\n          for (var wC = 0; wC < uniforms.filterDims[1]; wC += uniforms.dilations[1]) {\n            let dyC = f32(dyCCorner + wC) / f32(uniforms.strides[1]);\n\n            if (dyC < 0.0 || dyC >= f32(uniforms.outWidth) || fract(dyC) > 0.0) {\n              continue;\n            }\n            let idyC = i32(dyC);\n\n            let dyValue = getDy(batch, idyR, idyC, d);\n            let maxPosValue = lastIndex - i32(getMaxPos(batch, idyR, idyC, d));\n\n            // Get the current value, check it against the value from the\n            // position matrix.\n            let curPosValue = wR * uniforms.filterDims[1] + wC;\n            let mask = select(0.0, 1.0, maxPosValue == curPosValue);\n            dotProd += dyValue * mask;\n          }\n        }\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n    ");
            return userCode;
        };
        return MaxPool2DBackpropProgram;
    }());
    var MaxPool3DBackpropProgram = /** @class */ (function () {
        function MaxPool3DBackpropProgram(convInfo) {
            this.variableNames = ['dy', 'maxPos'];
            this.uniforms = "strides : vec3<i32>, pads : vec3<i32>, filterDims : vec3<i32>,\n      outDepth : i32, outHeight : i32, outWidth : i32";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = convInfo.inShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'maxPool3DBackprop';
        }
        MaxPool3DBackpropProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n        let batch = coords.x;\n        let ch = coords.u;\n\n        let dyCorner = vec3<i32>(coords.y, coords.z, coords.w) - uniforms.pads;\n        let dyDCorner = dyCorner.x;\n        let dyRCorner = dyCorner.y;\n        let dyCCorner = dyCorner.z;\n\n        // Convolve dy(?, ?, ?, ch) with pos mask(:, :, :, d) to get\n        // dx(xD, xR, xC, ch).\n        // ? = to be determined. : = across all values in that axis.\n        var dotProd = 0.0;\n        let lastIndex = uniforms.filterDims[0] * uniforms.filterDims[1] * uniforms.filterDims[2] - 1;\n\n        for (var wD = 0; wD < uniforms.filterDims[0]; wD++) {\n          let dyD = f32(dyDCorner + wD) / f32(uniforms.strides[0]);\n\n          if (dyD < 0.0 || dyD >= f32(uniforms.outDepth) || fract(dyD) > 0.0) {\n            continue;\n          }\n          let idyD = i32(dyD);\n\n          for (var wR = 0; wR < uniforms.filterDims[1]; wR++) {\n            let dyR = f32(dyRCorner + wR) / f32(uniforms.strides[1]);\n\n            if (dyR < 0.0 || dyR >= f32(uniforms.outHeight) || fract(dyR) > 0.0) {\n              continue;\n            }\n            let idyR = i32(dyR);\n\n            for (var wC = 0; wC < uniforms.filterDims[2]; wC++) {\n              let dyC = f32(dyCCorner + wC) / f32(uniforms.strides[2]);\n\n              if (dyC < 0.0 || dyC >= f32(uniforms.outWidth) || fract(dyC) > 0.0) {\n                continue;\n              }\n              let idyC = i32(dyC);\n\n              let dyValue = getDy(batch, idyD, idyR, idyC, ch);\n              let maxPosValue = lastIndex - i32(getMaxPos(batch, idyD, idyR, idyC, ch));\n\n              // Get the current value, check it against the value from the\n              // position matrix.\n              let curPosValue = wD * uniforms.filterDims[1] * uniforms.filterDims[2] + wR * uniforms.filterDims[2] + wC;\n              let mask = select(0.0, 1.0, maxPosValue == curPosValue);\n              dotProd += dyValue * mask;\n            }\n          }\n        }\n\n        setOutputAtIndex(index, dotProd);\n      }\n    }\n    ");
            return userCode;
        };
        return MaxPool3DBackpropProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function maxPool3DGrad(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var dy = inputs.dy, input = inputs.input;
        var x = input;
        var filterSize = attrs.filterSize, strides = attrs.strides, pad = attrs.pad, dimRoundingMode = attrs.dimRoundingMode;
        var dilations = [1, 1, 1];
        var convInfo = tf.backend_util.computePool3DInfo(x.shape, filterSize, strides, dilations, pad, dimRoundingMode);
        var maxPool3dPositionsProgram = new Pool3DProgram(convInfo, 'max', true /* get positions */);
        var uniformData = [
            {
                type: 'int32',
                data: [convInfo.strideDepth, convInfo.strideHeight, convInfo.strideWidth]
            },
            {
                type: 'int32',
                data: [convInfo.padInfo.front, convInfo.padInfo.top, convInfo.padInfo.left]
            },
            {
                type: 'int32',
                data: [convInfo.inDepth, convInfo.inHeight, convInfo.inWidth]
            },
            {
                type: 'int32',
                data: [
                    convInfo.effectiveFilterDepth, convInfo.effectiveFilterHeight,
                    convInfo.effectiveFilterWidth
                ]
            }
        ];
        var maxPool3dPositions = backend.runWebGPUProgram(maxPool3dPositionsProgram, [x], 'int32', uniformData);
        var maxPool3dBackpropProgram = new MaxPool3DBackpropProgram(convInfo);
        uniformData = [
            {
                type: 'int32',
                data: [convInfo.strideDepth, convInfo.strideHeight, convInfo.strideWidth]
            },
            {
                type: 'int32',
                data: [
                    convInfo.effectiveFilterDepth - 1 - convInfo.padInfo.front,
                    convInfo.effectiveFilterHeight - 1 - convInfo.padInfo.top,
                    convInfo.effectiveFilterWidth - 1 - convInfo.padInfo.left
                ]
            },
            {
                type: 'int32',
                data: [
                    convInfo.effectiveFilterDepth, convInfo.effectiveFilterHeight,
                    convInfo.effectiveFilterWidth
                ]
            },
            { type: 'int32', data: [convInfo.outDepth] },
            { type: 'int32', data: [convInfo.outHeight] },
            { type: 'int32', data: [convInfo.outWidth] }
        ];
        var result = backend.runWebGPUProgram(maxPool3dBackpropProgram, [dy, maxPool3dPositions], x.dtype, uniformData);
        backend.disposeData(maxPool3dPositions.dataId);
        return result;
    }
    var maxPool3DGradConfig = {
        kernelName: tf.MaxPool3DGrad,
        backendName: 'webgpu',
        kernelFunc: maxPool3DGrad
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function maxPoolGrad(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var dy = inputs.dy, input = inputs.input, output = inputs.output;
        var x = input;
        assertNotComplex([input, output], 'maxPoolGrad');
        var filterSize = attrs.filterSize, strides = attrs.strides, pad = attrs.pad, dimRoundingMode = attrs.dimRoundingMode;
        var convInfo = tf.backend_util.computePool2DInfo(x.shape, filterSize, strides, 1 /* dilations */, pad, dimRoundingMode);
        var maxPoolPositionsProgram = new Pool2DProgram(convInfo, 'max', true);
        var uniformData = [
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] },
            { type: 'int32', data: [convInfo.padInfo.top, convInfo.padInfo.left] },
            { type: 'int32', data: [convInfo.dilationHeight, convInfo.dilationWidth] },
            { type: 'int32', data: [convInfo.inHeight, convInfo.inWidth] }, {
                type: 'int32',
                data: [convInfo.effectiveFilterHeight, convInfo.effectiveFilterWidth]
            }
        ];
        var maxPoolPositions = backend.runWebGPUProgram(maxPoolPositionsProgram, [x], 'int32', uniformData);
        var maxPoolBackpropProgram = new MaxPool2DBackpropProgram(convInfo);
        uniformData = [
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] }, {
                type: 'int32',
                data: [
                    convInfo.effectiveFilterHeight - 1 - convInfo.padInfo.top,
                    convInfo.effectiveFilterWidth - 1 - convInfo.padInfo.left
                ]
            },
            { type: 'int32', data: [convInfo.dilationHeight, convInfo.dilationWidth] }, {
                type: 'int32',
                data: [convInfo.effectiveFilterHeight, convInfo.effectiveFilterWidth]
            },
            { type: 'int32', data: [convInfo.outHeight] },
            { type: 'int32', data: [convInfo.outWidth] }
        ];
        var result = backend.runWebGPUProgram(maxPoolBackpropProgram, [dy, maxPoolPositions], x.dtype, uniformData);
        backend.disposeData(maxPoolPositions.dataId);
        return result;
    }
    var maxPoolGradConfig = {
        kernelName: tf.MaxPoolGrad,
        backendName: 'webgpu',
        kernelFunc: maxPoolGrad
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function maxPoolWithArgmax(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var filterSize = attrs.filterSize, strides = attrs.strides, pad = attrs.pad, includeBatchInIndex = attrs.includeBatchInIndex;
        var x = inputs.x;
        tf.util.assert(x.shape.length === 4, function () { return "Error in maxPool: input must be rank 4 but got rank ".concat(x.shape.length, "."); });
        var dilations = [1, 1];
        tf.util.assert(tf.backend_util.eitherStridesOrDilationsAreOne(strides, dilations), function () { return 'Error in maxPool: Either strides or dilations must be 1. ' +
            "Got strides ".concat(strides, " and dilations '").concat(dilations, "'"); });
        var convInfo = tf.backend_util.computePool2DInfo(x.shape, filterSize, strides, dilations, pad);
        var uniformData = [
            { type: 'int32', data: [convInfo.strideHeight, convInfo.strideWidth] },
            { type: 'int32', data: [convInfo.padInfo.top, convInfo.padInfo.left] },
            { type: 'int32', data: [convInfo.dilationHeight, convInfo.dilationWidth] },
            { type: 'int32', data: [convInfo.inHeight, convInfo.inWidth] }, {
                type: 'int32',
                data: [convInfo.effectiveFilterHeight, convInfo.effectiveFilterWidth]
            }
        ];
        var program = new Pool2DProgram(convInfo, 'max', false);
        var poolOutput = backend.runWebGPUProgram(program, [x], x.dtype, uniformData);
        program = new Pool2DProgram(convInfo, 'max', true, true, includeBatchInIndex);
        var indexOutput = backend.runWebGPUProgram(program, [x], 'int32', uniformData);
        return [poolOutput, indexOutput];
    }
    var maxPoolWithArgmaxConfig = {
        kernelName: tf.MaxPoolWithArgmax,
        backendName: 'webgpu',
        kernelFunc: maxPoolWithArgmax
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function min(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var axis = attrs.axis, keepDims = attrs.keepDims;
        return reduce(x, axis, keepDims, 'min', backend);
    }
    var minConfig = {
        kernelName: tf.Min,
        backendName: 'webgpu',
        kernelFunc: min
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var minimum = binaryKernelFunc({
        opType: BinaryOpType.MIN,
        cpuKernelImpl: minimumImplCPU,
    });
    var minimumConfig = {
        kernelName: tf.Minimum,
        backendName: 'webgpu',
        kernelFunc: minimum
    };

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var MirrorPadProgram = /** @class */ (function () {
        function MirrorPadProgram(xShape, paddings, mode) {
            var _this = this;
            this.uniforms = '';
            this.variableNames = ['x'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = paddings.map(function (p, i) { return p[0] /* beforePad */ + xShape[i] + p[1]; } /* afterPad */);
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.xShape = xShape;
            paddings.map(function (_, i) {
                _this.uniforms += " pad".concat(i, " : vec2<i32>,");
            });
            this.offset = mode === 'reflect' ? 0 : 1;
            this.shaderKey = "mirrorPad_".concat(mode);
        }
        MirrorPadProgram.prototype.getUserCode = function () {
            var rank = this.xShape.length;
            // The length of paddings are same with the rank of the input tensor.
            var start = this.xShape.map(function (_, i) { return "uniforms.pad".concat(i, "[0]"); }).join(',');
            var end = this.xShape
                .map(function (_, i) { return "uniforms.pad".concat(i, "[0] + uniforms.xShape").concat(rank > 1 ? "[".concat(i, "]") : ''); })
                .join(',');
            var shaderStart = rank === 1 ? 'start' : 'start[i]';
            var shaderEnd = rank === 1 ? 'end' : 'end[i]';
            var shaderOutC = rank === 1 ? 'outC' : 'outC[i]';
            var dtype = getCoordsDataType(rank);
            var unpackedCoords = rank > 1 ?
                ['coords[0]', 'coords[1]', 'coords[2]', 'coords[3]'].slice(0, rank) :
                'coords';
            return "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let start = ").concat(dtype, "(").concat(start, ");\n          let end = ").concat(dtype, "(").concat(end, ");\n          var outC = getCoordsFromIndex(index);\n          for (var i = 0; i < ").concat(rank, "; i = i + 1) {\n            if (").concat(shaderOutC, " < ").concat(shaderStart, ") {\n              ").concat(shaderOutC, " = ").concat(shaderStart, " * 2 - ").concat(shaderOutC, " - ").concat(this.offset, ";\n            } else if(").concat(shaderOutC, " >= ").concat(shaderEnd, ") {\n              ").concat(shaderOutC, " = (").concat(shaderEnd, " - 1) * 2 - ").concat(shaderOutC, " + ").concat(this.offset, ";\n            }\n          }\n          let coords = outC - start;\n          setOutputAtIndex(index, getX(").concat(unpackedCoords, "));\n        }\n      }\n    ");
        };
        return MirrorPadProgram;
    }());

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var mirrorPadConfig = {
        kernelName: tf.MirrorPad,
        backendName: 'webgpu',
        kernelFunc: function (_a) {
            var inputs = _a.inputs, attrs = _a.attrs, backend = _a.backend;
            var x = inputs.x;
            var paddings = attrs.paddings, mode = attrs.mode;
            var webGPUBackend = backend;
            var uniformData = paddings.map(function (p) {
                return { type: 'int32', data: [p[0], p[1]] };
            });
            var program = new MirrorPadProgram(x.shape, paddings, mode);
            var output = webGPUBackend.runWebGPUProgram(program, [x], x.dtype, uniformData);
            return output;
        }
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var mod = binaryKernelFunc({ opType: BinaryOpType.MOD });
    var modConfig = {
        kernelName: tf.Mod,
        backendName: 'webgpu',
        kernelFunc: mod
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var MultinomialProgram = /** @class */ (function () {
        function MultinomialProgram(batchSize, numSamples) {
            this.variableNames = ['probs'];
            this.outputShape = [];
            this.uniforms = 'seed : f32, numOutcomes: i32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = [batchSize, numSamples];
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'multinomial';
        }
        MultinomialProgram.prototype.getUserCode = function () {
            var userCode = "\n    //Based on the work of Dave Hoskins\n    //https://www.shadertoy.com/view/4djSRW\n    fn random (seed : f32, resultUV : vec2<f32>) -> f32 {\n      let HASHSCALE1 = 443.8975;\n      let p = resultUV * seed;\n      var p3  = fract(vec3<f32>(p.xyx) * HASHSCALE1);\n      p3 = p3 + dot(p3, p3.yzx + 19.19);\n      return fract((p3.x + p3.y) * p3.z);\n    }\n\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let coords = getOutputCoords();\n        let batch = coords[0];\n\n        let resUV = vec2<f32>(f32(coords[1]) / f32(uniforms.outShape[1]),\n            f32(coords[0]) / f32(uniforms.outShape[0]));\n        let r = random(uniforms.seed, resUV);\n        var cdf = 0.0;\n        for (var i = 0; i < uniforms.numOutcomes - 1; i = i + 1) {\n          cdf = cdf + getProbs(batch, i);\n\n          if (r < cdf) {\n            setOutputAtIndexI32(index, i);\n            return;\n          }\n        }\n\n        // If no other event happened, last event happened.\n        setOutputAtIndexI32(index, uniforms.numOutcomes - 1);\n      }\n    }\n  ");
            return userCode;
        };
        return MultinomialProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var SoftmaxProgram = /** @class */ (function () {
        function SoftmaxProgram(outputShape) {
            this.variableNames = ['logits'];
            this.outputShape = outputShape; // [rows, cols]
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = [this.outputShape[0], 1, 1];
            if (this.outputShape[1] >= 4096) {
                this.workgroupSize = [256, 1, 1];
            }
            else {
                this.workgroupSize = [64, 1, 1];
            }
            this.shaderKey = 'softmax';
        }
        SoftmaxProgram.prototype.getUserCode = function () {
            var userCode = "\n    var<workgroup> buf : array<f32, ".concat(this.workgroupSize[0], ">;\n    var<workgroup> rowMaxShared : f32;\n    var<workgroup> rowSumShared : f32;\n    const blockSize = ").concat(this.workgroupSize[0], ";\n    ").concat(getMainHeaderString('index'), " {\n      let row = index / blockSize;\n      let tid = i32(localId.x);\n      let cols = uniforms.outShape[1];\n\n      var threadMax = -3.402823e+38f;\n      for (var col = tid; col < cols; col += blockSize) {\n        let value = getLogits(row, col);\n        threadMax = max(threadMax, value);\n      }\n      if (tid < cols) {\n        buf[tid] = threadMax;\n      }\n      workgroupBarrier();\n\n      var reduceSize = min(cols, blockSize);\n      for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {\n        reduceSize = currSize + (reduceSize & 1);\n        if (tid < currSize) {\n          buf[tid] = max(buf[tid], buf[tid + reduceSize]);\n        }\n        workgroupBarrier();\n      }\n\n      if (tid == 0) {\n        rowMaxShared = buf[0];\n      }\n      workgroupBarrier();\n\n      var threadSum = 0.0;\n      for (var col = tid; col < cols; col += blockSize) {\n        let subExp = exp(getLogits(row, col) - rowMaxShared);\n        threadSum += subExp;\n      }\n      buf[tid] = threadSum;\n      workgroupBarrier();\n\n      for (var currSize = blockSize >> 1;  currSize > 0; currSize = currSize >> 1) {\n        if (tid < currSize) {\n          buf[tid] = buf[tid] + buf[tid + currSize];\n        }\n        workgroupBarrier();\n      }\n\n      if (tid == 0) {\n        rowSumShared = buf[0];\n      }\n      workgroupBarrier();\n\n      for (var col = tid; col < cols; col += blockSize) {\n        let value = exp(getLogits(row, col) - rowMaxShared) / rowSumShared;\n        setOutputAtCoords(row, col, value);\n      }\n  }\n    ");
            return userCode;
        };
        return SoftmaxProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function softmax(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var logits = inputs.logits;
        var dim = attrs.dim;
        var logitsReshaped = reshape({
            inputs: { x: logits },
            backend: backend,
            attrs: {
                shape: [
                    tf.util.sizeFromShape(logits.shape) / logits.shape[dim], logits.shape[dim]
                ]
            }
        });
        var program = new SoftmaxProgram(logitsReshaped.shape);
        var res = backend.runWebGPUProgram(program, [logitsReshaped], logits.dtype);
        var resReshaped = reshape({ inputs: { x: res }, backend: backend, attrs: { shape: logits.shape } });
        backend.disposeData(logitsReshaped.dataId);
        backend.disposeData(res.dataId);
        return resReshaped;
    }
    var softmaxConfig = {
        kernelName: tf.Softmax,
        backendName: 'webgpu',
        kernelFunc: softmax
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function multinomial(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var logits = inputs.logits;
        var numSamples = attrs.numSamples, seed = attrs.seed, normalized = attrs.normalized;
        var probs = normalized ?
            logits :
            softmax({ inputs: { logits: logits }, backend: backend, attrs: { dim: logits.shape.length - 1 } });
        var batchSize = probs.shape[0];
        var numOutcomes = probs.shape[1];
        var program = new MultinomialProgram(batchSize, numSamples);
        var uniformData = [{ type: 'float32', data: [seed] }, { type: 'int32', data: [numOutcomes] }];
        var res = backend.runWebGPUProgram(program, [probs], 'int32', uniformData);
        if (!normalized) {
            backend.disposeData(probs.dataId);
        }
        return res;
    }
    var multinomialConfig = {
        kernelName: tf.Multinomial,
        backendName: 'webgpu',
        kernelFunc: multinomial
    };

    // This doesn't use unaryKernelFunc because negImplCPU is not of type
    // SimpleUnaryKernelImplCPU.
    function neg(args) {
        var inputs = args.inputs, backend = args.backend;
        var x = inputs.x;
        if (backend.shouldExecuteOnCPU([x])) {
            var xData = backend.tensorMap.get(x.dataId);
            var _a = __read(negImplCPU(xData.values, x.shape, x.dtype), 2), outValues = _a[0], newShape = _a[1];
            return backend.makeTensorInfo(newShape, x.dtype, outValues);
        }
        var program = new UnaryOpProgram(x.shape, UnaryOpType.NEG);
        return backend.runWebGPUProgram(program, [x], x.dtype);
    }
    var negConfig = {
        kernelName: tf.Neg,
        backendName: 'webgpu',
        kernelFunc: neg
    };

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function nonMaxSuppressionV3(args) {
        console.warn('tf.nonMaxSuppression() in webgpu locks the UI thread. ' +
            'Call tf.nonMaxSuppressionAsync() instead');
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var boxes = inputs.boxes, scores = inputs.scores;
        var maxOutputSize = attrs.maxOutputSize, iouThreshold = attrs.iouThreshold, scoreThreshold = attrs.scoreThreshold;
        var boxesVals = backend.readSync(boxes.dataId);
        var scoresVals = backend.readSync(scores.dataId);
        var selectedIndices = tf.kernel_impls.nonMaxSuppressionV3Impl(boxesVals, scoresVals, maxOutputSize, iouThreshold, scoreThreshold).selectedIndices;
        return backend.makeTensorInfo([selectedIndices.length], 'int32', new Int32Array(selectedIndices));
    }
    var nonMaxSuppressionV3Config = {
        kernelName: tf.NonMaxSuppressionV3,
        backendName: 'webgpu',
        kernelFunc: nonMaxSuppressionV3
    };

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function nonMaxSuppressionV5(args) {
        console.warn('tf.nonMaxSuppression() in webgpu locks the UI thread. ' +
            'Call tf.nonMaxSuppressionAsync() instead');
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var boxes = inputs.boxes, scores = inputs.scores;
        var maxOutputSize = attrs.maxOutputSize, iouThreshold = attrs.iouThreshold, scoreThreshold = attrs.scoreThreshold, softNmsSigma = attrs.softNmsSigma;
        var boxesVals = backend.readSync(boxes.dataId);
        var scoresVals = backend.readSync(scores.dataId);
        var maxOutputSizeVal = maxOutputSize;
        var iouThresholdVal = iouThreshold;
        var scoreThresholdVal = scoreThreshold;
        var softNmsSigmaVal = softNmsSigma;
        var _a = tf.kernel_impls.nonMaxSuppressionV5Impl(boxesVals, scoresVals, maxOutputSizeVal, iouThresholdVal, scoreThresholdVal, softNmsSigmaVal), selectedIndices = _a.selectedIndices, selectedScores = _a.selectedScores;
        return [
            backend.makeTensorInfo([selectedIndices.length], 'int32', new Int32Array(selectedIndices)),
            backend.makeTensorInfo([selectedScores.length], 'float32', new Float32Array(selectedScores))
        ];
    }
    var nonMaxSuppressionV5Config = {
        kernelName: tf.NonMaxSuppressionV5,
        backendName: 'webgpu',
        kernelFunc: nonMaxSuppressionV5
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var OneHotProgram = /** @class */ (function () {
        function OneHotProgram(numIndices, depth) {
            this.variableNames = ['x'];
            this.uniforms = 'onValue : f32, offValue : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = [numIndices, depth];
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'onehot';
        }
        OneHotProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if(index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          setOutputAtIndex(index, mix(uniforms.offValue, uniforms.onValue,\n                                      f32(i32(round(getX(coords.x))) == coords.y)));\n        }\n      }\n    ");
            return userCode;
        };
        return OneHotProgram;
    }());

    function oneHot(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var indices = inputs.indices;
        var dtype = attrs.dtype, depth = attrs.depth, onValue = attrs.onValue, offValue = attrs.offValue;
        var indicesSize = tf.util.sizeFromShape(indices.shape);
        var program = new OneHotProgram(indicesSize, depth);
        var reshaped = reshape({ inputs: { x: indices }, backend: backend, attrs: { shape: [indicesSize] } });
        var uniformData = [{ type: 'float32', data: [onValue] }, { type: 'float32', data: [offValue] }];
        var result = backend.runWebGPUProgram(program, [reshaped], dtype, uniformData);
        backend.disposeData(reshaped.dataId);
        var outShape = __spreadArray(__spreadArray([], __read(indices.shape), false), [depth], false);
        var out = reshape({ inputs: { x: result }, backend: backend, attrs: { shape: outShape } });
        backend.disposeData(result.dataId);
        return out;
    }
    var oneHotConfig = {
        kernelName: tf.OneHot,
        backendName: 'webgpu',
        kernelFunc: oneHot
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function zerosLike(args) {
        var inputs = args.inputs, backend = args.backend;
        var x = inputs.x;
        if (x.dtype === 'complex64') {
            var realPart = real({ inputs: { input: x }, backend: backend });
            var r = zerosLike({ inputs: { x: realPart }, backend: backend });
            var imagPart = imag({ inputs: { input: x }, backend: backend });
            var i = zerosLike({ inputs: { x: imagPart }, backend: backend });
            var result = complex({ inputs: { real: r, imag: i }, backend: backend });
            backend.disposeData(realPart.dataId);
            backend.disposeData(r.dataId);
            backend.disposeData(imagPart.dataId);
            backend.disposeData(i.dataId);
            return result;
        }
        else {
            return fill({
                attrs: {
                    shape: x.shape,
                    dtype: x.dtype,
                    value: x.dtype === 'string' ? '' : 0
                },
                backend: backend
            });
        }
    }
    var zerosLikeConfig = {
        kernelName: tf.ZerosLike,
        backendName: 'webgpu',
        kernelFunc: zerosLike
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function onesLike(args) {
        var inputs = args.inputs, backend = args.backend;
        var x = inputs.x;
        if (x.dtype === 'string') {
            throw new Error('onesLike is not supported under string dtype');
        }
        else if (x.dtype === 'complex64') {
            var realPart = real({ inputs: { input: x }, backend: backend });
            var r = onesLike({ inputs: { x: realPart }, backend: backend });
            var imagPart = imag({ inputs: { input: x }, backend: backend });
            var i = zerosLike({ inputs: { x: imagPart }, backend: backend });
            var result = complex({ inputs: { real: r, imag: i }, backend: backend });
            backend.disposeData(realPart.dataId);
            backend.disposeData(r.dataId);
            backend.disposeData(imagPart.dataId);
            backend.disposeData(i.dataId);
            return result;
        }
        else {
            return fill({ attrs: { shape: x.shape, dtype: x.dtype, value: 1 }, backend: backend });
        }
    }
    var onesLikeConfig = {
        kernelName: tf.OnesLike,
        backendName: 'webgpu',
        kernelFunc: onesLike
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function pack(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var axis = attrs.axis;
        if (inputs.length === 1) {
            return expandDims({ inputs: { input: inputs[0] }, backend: backend, attrs: { dim: axis } });
        }
        var shape = inputs[0].shape;
        var dtype = inputs[0].dtype;
        inputs.forEach(function (t) {
            tf.util.assertShapesMatch(shape, t.shape, 'All tensors passed to stack must have matching shapes');
            tf.util.assert(dtype === t.dtype, function () { return 'All tensors passed to stack must have matching dtypes'; });
        });
        var intermediateTensorInfos = [];
        var expandedTensors = inputs.map(function (t) {
            var expandedT = expandDims({ inputs: { input: t }, backend: backend, attrs: { dim: axis } });
            intermediateTensorInfos.push(expandedT);
            return expandedT;
        });
        var result = concat({ inputs: expandedTensors, backend: backend, attrs: { axis: axis } });
        intermediateTensorInfos.forEach(function (t) { return backend.disposeData(t.dataId); });
        return result;
    }
    var packConfig = {
        kernelName: tf.Pack,
        backendName: 'webgpu',
        kernelFunc: pack
    };

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function padCommon(shape, fillZero) {
        if (fillZero === void 0) { fillZero = false; }
        var rank = shape.length;
        var type = getCoordsDataType(rank);
        var start = shape.map(function (_, i) { return "uniforms.pad".concat(i, "[0]"); }).join(',');
        var end = shape
            .map(function (_, i) { return "uniforms.pad".concat(i, "[0] + uniforms.xShape").concat(rank > 1 ? "[".concat(i, "]") : ''); })
            .join(',');
        var startValue = rank > 1 ? "".concat(type, "(").concat(start, ")") : "".concat(start);
        var endValue = rank > 1 ? "".concat(type, "(").concat(end, ")") : "".concat(end);
        var leftPadCondition = rank > 1 ? "any(paddedCoords < start)" : "paddedCoords < start";
        var rightPadCondition = rank > 1 ? "any(paddedCoords >= end)" : "paddedCoords >= end";
        var unpackedCoords = rank > 1 ?
            ['coords[0]', 'coords[1]', 'coords[2]', 'coords[3]'].slice(0, rank) :
            'coords';
        return "\n        let start = ".concat(startValue, ";\n        let end = ").concat(endValue, ";\n        if (").concat(leftPadCondition, " || ").concat(rightPadCondition, ") {\n          setOutputAtIndex(index, ").concat(fillZero ? 0.0 : 'uniforms.constantValue', ");\n        } else {\n          let coords = paddedCoords - start;\n          setOutputAtIndex(index, getX(").concat(unpackedCoords, "));\n        }\n  ");
    }
    var PadProgram = /** @class */ (function () {
        function PadProgram(xShape, paddings) {
            var _this = this;
            this.variableNames = ['x'];
            this.uniforms = 'constantValue : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = paddings.map(function (p, i) { return p[0] /* beforePad */ + xShape[i] + p[1]; } /* afterPad */);
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            paddings.map(function (_, i) {
                _this.uniforms += " pad".concat(i, " : vec2<i32>,");
            });
            this.xShape = xShape;
            this.shaderKey = 'pad';
        }
        PadProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let paddedCoords = getCoordsFromIndex(index);\n          ").concat(padCommon(this.xShape), "\n        }\n      }\n    ");
            return userCode;
        };
        return PadProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var padV2 = function (args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var paddings = attrs.paddings, constantValue = attrs.constantValue;
        if (paddings.every(function (p) { return tf.util.arraysEqual(p, [0, 0]); })) {
            return identity({ inputs: { x: x }, backend: backend });
        }
        if (tf.util.sizeFromShape(x.shape) === 0) {
            // Short-circuit the computation, since x doesn't have value, only
            // the shape is used to compute output shape to pad.
            var outputShape = paddings.map(function (p, i) { return p[0] /* beforePad */ + x.shape[i] + p[1]; } /* afterPad */);
            return fill({
                backend: backend,
                attrs: { shape: outputShape, value: constantValue, dtype: x.dtype }
            });
        }
        var uniformData = [{ type: 'float32', data: [constantValue] }];
        paddings.map(function (p) { return uniformData.push({ type: 'int32', data: [p[0], p[1]] }); });
        var program = new PadProgram(x.shape, paddings);
        return backend.runWebGPUProgram(program, [x], x.dtype, uniformData);
    };
    var padV2Config = {
        kernelName: tf.PadV2,
        backendName: 'webgpu',
        kernelFunc: padV2
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var pow = binaryKernelFunc({
        opType: BinaryOpType.POW,
    });
    var powConfig = {
        kernelName: tf.Pow,
        backendName: 'webgpu',
        kernelFunc: pow
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function prelu(args) {
        var inputs = args.inputs, backend = args.backend;
        var x = inputs.x, alpha = inputs.alpha;
        var program = new BinaryOpProgram(BinaryOpType.PRELU, x.shape, alpha.shape);
        return backend.runWebGPUProgram(program, [x, alpha], 'float32');
    }
    var preluConfig = {
        kernelName: tf.Prelu,
        backendName: 'webgpu',
        kernelFunc: prelu
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function prod(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var axis = attrs.axis, keepDims = attrs.keepDims;
        return reduce(x, axis, keepDims, 'prod', backend);
    }
    var prodConfig = {
        kernelName: tf.Prod,
        backendName: 'webgpu',
        kernelFunc: prod
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var range = function (args) {
        var backend = args.backend, attrs = args.attrs;
        var start = attrs.start, stop = attrs.stop, step = attrs.step, dtype = attrs.dtype;
        var values = rangeImplCPU(start, stop, step, dtype);
        return backend.makeTensorInfo([values.length], dtype, values);
    };
    var rangeConfig = {
        kernelName: tf.Range,
        backendName: 'webgpu',
        kernelFunc: range
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var realDiv = binaryKernelFunc({ opType: BinaryOpType.DIV });
    var realDivConfig = {
        kernelName: tf.RealDiv,
        backendName: 'webgpu',
        kernelFunc: realDiv
    };

    /**
     * @license
     * Copyright 2022 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var reciprocal = unaryKernelFunc({ opType: UnaryOpType.RECIPROCAL });
    var reciprocalConfig = {
        kernelName: tf.Reciprocal,
        backendName: 'webgpu',
        kernelFunc: reciprocal
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var relu = unaryKernelFunc({ opType: UnaryOpType.RELU });
    var reluConfig = {
        kernelName: tf.Relu,
        backendName: 'webgpu',
        kernelFunc: relu
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var relu6 = unaryKernelFunc({ opType: UnaryOpType.RELU6 });
    var relu6Config = {
        kernelName: tf.Relu6,
        backendName: 'webgpu',
        kernelFunc: relu6
    };

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ResizeBilinearProgram = /** @class */ (function () {
        function ResizeBilinearProgram(inputShape, newHeight, newWidth) {
            this.variableNames = ['x'];
            this.uniforms = 'adjustHeightWidth : vec2<f32>, halfPixelCenters : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = [inputShape[0], newHeight, newWidth, inputShape[3]];
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = "resizeBilinear";
        }
        ResizeBilinearProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n        let coords = getCoordsFromIndex(index);\n          let b = coords[0];\n          let d = coords[3];\n          let rc = coords.yz;\n\n          let effectiveInSize = vec2<f32>(\n            f32(uniforms.xShape.y) - uniforms.adjustHeightWidth[0],\n            f32(uniforms.xShape.z) - uniforms.adjustHeightWidth[1]);\n\n          let effectiveOutSize = vec2<f32>(\n            f32(uniforms.outShape.y) - uniforms.adjustHeightWidth[0],\n            f32(uniforms.outShape.z) - uniforms.adjustHeightWidth[1]);\n\n          let effectiveInputOverOutputRatioRC =\n              effectiveInSize / effectiveOutSize;\n\n          // Fractional source index\n          let sourceFracIndexRC =\n            (vec2<f32>(rc) + vec2<f32>(uniforms.halfPixelCenters)) *\n            effectiveInputOverOutputRatioRC - vec2<f32>(uniforms.halfPixelCenters);\n\n          // Compute the four integer indices.\n          let sourceFloorRC = vec2<i32>(sourceFracIndexRC);\n          let sourceCeilRC = vec2<i32>(\n            min(vec2<f32>(uniforms.xShape.yz) - vec2<f32>(1.0), ceil(sourceFracIndexRC)));\n\n          let topLeft = getX(b, sourceFloorRC.x, sourceFloorRC.y, d);\n          let bottomLeft = getX(b, sourceCeilRC.x, sourceFloorRC.y, d);\n          let topRight = getX(b, sourceFloorRC.x, sourceCeilRC.y, d);\n          let bottomRight = getX(b, sourceCeilRC.x, sourceCeilRC.y, d);\n\n          let fracRC = sourceFracIndexRC - vec2<f32>(sourceFloorRC);\n\n          let top = topLeft + (topRight - topLeft) * fracRC.y;\n          let bottom = bottomLeft + (bottomRight - bottomLeft) * fracRC.y;\n          let newValue = top + (bottom - top) * fracRC.x;\n\n          setOutputAtIndex(index, newValue);\n        }\n      }\n    ");
            return userCode;
        };
        return ResizeBilinearProgram;
    }());

    function resizeBilinear(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var images = inputs.images;
        var alignCorners = attrs.alignCorners, size = attrs.size, halfPixelCenters = attrs.halfPixelCenters;
        var _a = __read(size, 2), newHeight = _a[0], newWidth = _a[1];
        var adjustHeight = alignCorners && newHeight > 1 ? 1.0 : 0.0;
        var adjustWidth = alignCorners && newWidth > 1 ? 1.0 : 0.0;
        var halfPixelCentersValue = halfPixelCenters ? 0.5 : 0.0;
        var uniformData = [
            { type: 'float32', data: [adjustHeight, adjustWidth] },
            { type: 'float32', data: [halfPixelCentersValue] }
        ];
        var program = new ResizeBilinearProgram(images.shape, newHeight, newWidth);
        return backend.runWebGPUProgram(program, [images], 'float32', uniformData);
    }
    var resizeBilinearConfig = {
        kernelName: tf.ResizeBilinear,
        backendName: 'webgpu',
        kernelFunc: resizeBilinear
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ResizeBilinearBackpropProgram = /** @class */ (function () {
        function ResizeBilinearBackpropProgram(inputShape, alignCorners) {
            this.variableNames = ['dy'];
            this.uniforms = "effectiveXSize : vec2<i32>, effectiveYSize : vec2<i32>, heightScale : f32, widthScale : f32,\n       invHeightScale : f32, invWidthScale : f32, winHeight : i32, winWidth : i32,";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = inputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.alignCorners = alignCorners;
            this.shaderKey = "resizeBilinearBackprop_".concat(alignCorners);
        }
        ResizeBilinearBackpropProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getOutputCoords();\n          let b = coords[0];\n          let d = coords[3];\n          let r = coords[1];\n          let c = coords[2];\n\n          var accumulator = 0.0;\n\n          // Compute bounds for where in dy we will look\n          let startRLerp = floor(f32(r) * uniforms.invHeightScale);\n          let startDyR = i32(startRLerp - f32(uniforms.winHeight / 2));\n\n          let startCLerp = floor(f32(c) * uniforms.invWidthScale);\n          let startDyC = i32(startCLerp - f32(uniforms.winWidth / 2));\n\n          // Loop over dy\n          for (var dyROffset = 0; dyROffset < uniforms.winHeight; dyROffset++) {\n            let dyR = startDyR + dyROffset;\n\n            // Guard against the window exceeding the bounds of dy\n            if (dyR < 0 || dyR >= uniforms.dyShape[1]) {\n              continue;\n            }\n\n            for (var dyCOffset = 0; dyCOffset < uniforms.winWidth; dyCOffset++) {\n              let dyC = startDyC + dyCOffset;\n\n              // Guard against the window exceeding the bounds of dy\n              if (dyC < 0 || dyC >= uniforms.dyShape[2]) {\n                continue;\n              }\n\n              let dxR = f32(dyR) * uniforms.heightScale;\n              let topDxRIndex = i32(floor(dxR));\n              let bottomDxRIndex = i32(min(ceil(dxR), f32(uniforms.outShape[1] - 1)));\n              let dxRLerp = dxR - f32(topDxRIndex);\n              let inverseDxRLerp = 1.0 - dxRLerp;\n\n              let dxC = f32(dyC) * uniforms.widthScale;\n              let leftDxCIndex = i32(floor(dxC));\n              let rightDxCIndex = i32(min(ceil(dxC), f32(uniforms.outShape[2] - 1)));\n              let dxCLerp = dxC - f32(leftDxCIndex);\n              let inverseDxCLerp = 1.0 - dxCLerp;\n\n              if (r == topDxRIndex && c == leftDxCIndex) {\n                // topLeft\n                accumulator +=\n                  getDy(b, dyR, dyC, d) * inverseDxRLerp * inverseDxCLerp;\n              }\n\n              if (r == topDxRIndex && c == rightDxCIndex) {\n                // topRight\n                accumulator += getDy(b, dyR, dyC, d) * inverseDxRLerp * dxCLerp;\n              }\n\n              if (r == bottomDxRIndex && c == leftDxCIndex) {\n                // bottomLeft\n                accumulator += getDy(b, dyR, dyC, d) * dxRLerp * inverseDxCLerp;\n              }\n\n              if (r == bottomDxRIndex && c == rightDxCIndex) {\n                // bottomRight\n                accumulator += getDy(b, dyR, dyC, d) * dxRLerp * dxCLerp;\n              }\n            }\n          }\n          // End loop over dy\n\n          setOutputAtIndex(index, accumulator);\n        }\n      }\n    ");
            return userCode;
        };
        return ResizeBilinearBackpropProgram;
    }());

    function resizeBilinearGrad(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var images = inputs.images, dy = inputs.dy;
        var alignCorners = attrs.alignCorners;
        var _a = __read(images.shape, 3), xHeight = _a[1], xWidth = _a[2];
        var _b = __read(dy.shape, 3), yHeight = _b[1], yWidth = _b[2];
        var effectiveXSize = [
            (alignCorners && yHeight > 1) ? xHeight - 1 : xHeight,
            (alignCorners && yWidth > 1) ? xWidth - 1 : xWidth
        ];
        var effectiveYSize = [
            (alignCorners && yHeight > 1) ? yHeight - 1 : yHeight,
            (alignCorners && yWidth > 1) ? yWidth - 1 : yWidth
        ];
        var heightScale = effectiveXSize[0] / effectiveYSize[0];
        var widthScale = effectiveXSize[1] / effectiveYSize[1];
        var invHeightScale = 1 / heightScale;
        var invWidthScale = 1 / widthScale;
        // This defines the size of the window of values around a particular
        // index in dy that we want to search for contributions to dx.
        var winHeight = (Math.ceil(invHeightScale) * 2) + 2;
        var winWidth = (Math.ceil(invWidthScale) * 2) + 2;
        var program = new ResizeBilinearBackpropProgram(images.shape, alignCorners);
        var uniformData = [
            { type: 'int32', data: effectiveXSize },
            { type: 'int32', data: effectiveYSize },
            { type: 'float32', data: [heightScale] },
            { type: 'float32', data: [widthScale] },
            { type: 'float32', data: [invHeightScale] },
            { type: 'float32', data: [invWidthScale] },
            { type: 'int32', data: [winHeight] }, { type: 'int32', data: [winWidth] }
        ];
        return backend.runWebGPUProgram(program, [dy], dy.dtype, uniformData);
    }
    var resizeBilinearGradConfig = {
        kernelName: tf.ResizeBilinearGrad,
        backendName: 'webgpu',
        kernelFunc: resizeBilinearGrad
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ResizeNearestNeighborProgram = /** @class */ (function () {
        function ResizeNearestNeighborProgram(inputShape, newHeight, newWidth, halfPixelCenters) {
            this.variableNames = ['x'];
            this.uniforms = 'adjustHeightWidth : vec2<f32>, roundBase : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = [inputShape[0], newHeight, newWidth, inputShape[3]];
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.halfPixelCenters = halfPixelCenters;
            this.shaderKey = "resizeNearest_".concat(halfPixelCenters);
        }
        ResizeNearestNeighborProgram.prototype.getUserCode = function () {
            var sourceFracIndexRC;
            if (this.halfPixelCenters) {
                sourceFracIndexRC =
                    "max((vec2<f32>(rc) + vec2<f32>(0.5)) * effectiveInputOverOutputRatioRC" +
                        ", vec2<f32>(0.0))";
            }
            else {
                sourceFracIndexRC = "vec2<f32>(rc) * effectiveInputOverOutputRatioRC";
            }
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          let b = coords[0];\n          let d = coords[3];\n          let rc = coords.yz;\n\n          let effectiveInSize = vec2<f32>(\n            f32(uniforms.xShape.y) - uniforms.adjustHeightWidth[0],\n            f32(uniforms.xShape.z) - uniforms.adjustHeightWidth[1]);\n\n          let effectiveOutSize = vec2<f32>(\n            f32(uniforms.outShape.y) - uniforms.adjustHeightWidth[0],\n            f32(uniforms.outShape.z) - uniforms.adjustHeightWidth[1]);\n\n          let effectiveInputOverOutputRatioRC =\n              effectiveInSize / effectiveOutSize;\n\n          // Fractional source index\n          let sourceFracIndexRC = ").concat(sourceFracIndexRC, ";\n\n          // Compute the coordinators of nearest neighbor point.\n          let inputShapeRC = vec2<f32>(f32(uniforms.xShape.y), f32(uniforms.xShape.z));\n          let sourceNearestRC = vec2<i32>(\n            min(inputShapeRC - 1.0, floor(sourceFracIndexRC + uniforms.roundBase)));\n          let newValue = getX(b, sourceNearestRC.x, sourceNearestRC.y, d);\n\n          setOutputAtIndex(index, newValue);\n        }\n      }\n    ");
            return userCode;
        };
        return ResizeNearestNeighborProgram;
    }());

    function resizeNearestNeighbor(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var images = inputs.images;
        var alignCorners = attrs.alignCorners, halfPixelCenters = attrs.halfPixelCenters, size = attrs.size;
        var _a = __read(size, 2), newHeight = _a[0], newWidth = _a[1];
        var adjustHeight = alignCorners && newHeight > 1 ? 1.0 : 0.0;
        var adjustWidth = alignCorners && newWidth > 1 ? 1.0 : 0.0;
        // When align corners is false, we rounds the value with floor.
        var roundBase = alignCorners ? 0.5 : 0.0;
        var uniformData = [
            { type: 'float32', data: [adjustHeight, adjustWidth] },
            { type: 'float32', data: [roundBase] }
        ];
        var program = new ResizeNearestNeighborProgram(images.shape, newHeight, newWidth, halfPixelCenters);
        return backend.runWebGPUProgram(program, [images], images.dtype, uniformData);
    }
    var resizeNearestNeighborConfig = {
        kernelName: tf.ResizeNearestNeighbor,
        backendName: 'webgpu',
        kernelFunc: resizeNearestNeighbor
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ResizeNearestNeigborBackpropProgram = /** @class */ (function () {
        function ResizeNearestNeigborBackpropProgram(inputShape, alignCorners) {
            this.variableNames = ['dy'];
            this.uniforms = "effectiveXSize : vec2<i32>, effectiveYSize : vec2<i32>, invHeightScale : f32, invWidthScale : f32,\n       winHeight : i32, winWidth : i32,";
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = inputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.alignCorners = alignCorners;
            this.shaderKey = "resizeNearestNeigborBackprop_".concat(alignCorners);
        }
        ResizeNearestNeigborBackpropProgram.prototype.getUserCode = function () {
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getOutputCoords();\n          let b = coords[0];\n          let d = coords[3];\n          let r = coords[1];\n          let c = coords[2];\n\n          var accumulator = 0.0;\n\n          // Compute bounds for where in dy we will look\n          let startRLerp = floor(f32(r) * uniforms.invHeightScale);\n          let startDyR = i32(floor(startRLerp - f32(uniforms.winHeight / 2)));\n\n          let startCLerp = floor(f32(c) * uniforms.invWidthScale);\n          let startDyC = i32(floor(startCLerp - f32(uniforms.winWidth / 2)));\n\n          // Loop over dy\n          for (var dyROffset = 0; dyROffset < uniforms.winHeight; dyROffset++) {\n            let dyR = startDyR + dyROffset;\n\n            // Guard against the window exceeding the bounds of dy\n            if (dyR < 0 || dyR >= uniforms.dyShape[1]) {\n              continue;\n            }\n\n            for (var dyCOffset = 0; dyCOffset < uniforms.winWidth; dyCOffset++) {\n              let dyC = startDyC + dyCOffset;\n\n              // Guard against the window exceeding the bounds of dy\n              if (dyC < 0 || dyC >= uniforms.dyShape[2]) {\n                continue;\n              }\n\n              let sourceFracRow = f32(uniforms.effectiveXSize[0]) *\n                  (f32(dyR) / f32(uniforms.effectiveYSize[0]));\n\n              let sourceFracCol = f32(uniforms.effectiveXSize[1]) *\n                  (f32(dyC) / f32(uniforms.effectiveYSize[1]));\n\n              let sourceNearestRow =\n                  i32(min(f32(uniforms.outShape[1] - 1),\n                  ").concat(this.alignCorners ? 'floor(sourceFracRow + 0.5)' :
                'floor(sourceFracRow)', "));\n\n              let sourceNearestCol =\n                  i32(min(f32(uniforms.outShape[2] - 1),\n                  ").concat(this.alignCorners ? 'floor(sourceFracCol + 0.5)' :
                'floor(sourceFracCol)', "));\n\n              if (r == sourceNearestRow && c == sourceNearestCol) {\n                accumulator += getDy(b, dyR, dyC, d);\n              }\n            }\n          }\n          // End loop over dy\n\n          setOutputAtIndex(index, accumulator);\n        }\n      }\n    ");
            return userCode;
        };
        return ResizeNearestNeigborBackpropProgram;
    }());

    function resizeNearestNeighborGrad(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var images = inputs.images, dy = inputs.dy;
        var alignCorners = attrs.alignCorners;
        var _a = __read(images.shape, 3), xHeight = _a[1], xWidth = _a[2];
        var _b = __read(dy.shape, 3), yHeight = _b[1], yWidth = _b[2];
        var effectiveXSize = [
            (alignCorners && yHeight > 1) ? xHeight - 1 : xHeight,
            (alignCorners && yWidth > 1) ? xWidth - 1 : xWidth
        ];
        var effectiveYSize = [
            (alignCorners && yHeight > 1) ? yHeight - 1 : yHeight,
            (alignCorners && yWidth > 1) ? yWidth - 1 : yWidth
        ];
        var heightScale = effectiveXSize[0] / effectiveYSize[0];
        var widthScale = effectiveXSize[1] / effectiveYSize[1];
        var invHeightScale = 1 / heightScale;
        var invWidthScale = 1 / widthScale;
        // This defines the size of the window of values around a particular
        // index in dy that we want to search for contributions to dx.
        var winHeight = (Math.ceil(invHeightScale) * 2) + 2;
        var winWidth = (Math.ceil(invWidthScale) * 2) + 2;
        var program = new ResizeNearestNeigborBackpropProgram(images.shape, alignCorners);
        var uniformData = [
            { type: 'int32', data: effectiveXSize },
            { type: 'int32', data: effectiveYSize },
            { type: 'float32', data: [invHeightScale] },
            { type: 'float32', data: [invWidthScale] },
            { type: 'int32', data: [winHeight] }, { type: 'int32', data: [winWidth] }
        ];
        return backend.runWebGPUProgram(program, [dy], dy.dtype, uniformData);
    }
    var resizeNearestNeighborGradConfig = {
        kernelName: tf.ResizeNearestNeighborGrad,
        backendName: 'webgpu',
        kernelFunc: resizeNearestNeighborGrad
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ReverseProgram = /** @class */ (function () {
        function ReverseProgram(xShape) {
            this.variableNames = ['x'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = xShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.uniforms = " axis : vec4<i32>,";
            this.shaderKey = 'reverse';
        }
        ReverseProgram.prototype.getUserCode = function () {
            var reverseCoordsSnippet = "\n      // Using uniform variables as judging conditions, so the function has\n      // coherent execution within all threads.\n      fn getReverseCoords(coords : vec4<i32>) -> vec4<i32> {\n        var reverseCoords = coords;\n        if (uniforms.axis[0] == 1) {\n          reverseCoords[0] = uniforms.xShape[0] - coords[0] - 1;\n        }\n        if (uniforms.axis[1] == 1) {\n          reverseCoords[1] = uniforms.xShape[1] - coords[1] - 1;\n        }\n        if (uniforms.axis[2] == 1) {\n          reverseCoords[2] = uniforms.xShape[2] - coords[2] - 1;\n        }\n        if (uniforms.axis[3] == 1) {\n          reverseCoords[3] = uniforms.xShape[3] - coords[3] - 1;\n        }\n\n        return reverseCoords;\n      }\n    ";
            var userCode = "\n      ".concat(reverseCoordsSnippet, "\n      ").concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          let reverseCoords = getReverseCoords(coords);\n          setOutputAtIndex(index, getX(reverseCoords[0],\n              reverseCoords[1], reverseCoords[2], reverseCoords[3]));\n        }\n      }\n    ");
            return userCode;
        };
        return ReverseProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function reverse(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var dims = attrs.dims;
        var xRank = x.shape.length;
        if (xRank === 0) {
            return identity({ inputs: { x: x }, backend: backend });
        }
        var xShape = x.shape;
        var xShape4D = [1, 1, 1, 1];
        xShape.forEach(function (d, i) {
            var index = i + 4 - xRank;
            xShape4D[index] = d;
        });
        var axes = tf.util.parseAxisParam(dims, x.shape);
        var dims4D = [0, 0, 0, 0];
        axes.forEach(function (ax) {
            var index = ax + 4 - xRank;
            dims4D[index] = 1;
        });
        var uniformData = [{ type: 'int32', data: dims4D }];
        var xReshaped = reshape({ inputs: { x: x }, backend: backend, attrs: { shape: xShape4D } });
        var program = new ReverseProgram(xShape4D);
        var values = backend.runWebGPUProgram(program, [xReshaped], xReshaped.dtype, uniformData);
        backend.disposeData(xReshaped.dataId);
        var result = reshape({ inputs: { x: values }, backend: backend, attrs: { shape: xShape } });
        backend.disposeData(values.dataId);
        return result;
    }
    var reverseConfig = {
        kernelName: tf.Reverse,
        backendName: 'webgpu',
        kernelFunc: reverse
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var RotateProgram = /** @class */ (function () {
        function RotateProgram(imageShape, fillValue) {
            this.outputShape = [];
            this.variableNames = ['x'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = imageShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.uniforms = "centerX : f32, centerY : f32, sinRadians : f32,\n          cosRadians : f32,";
            this.shaderKey = 'rotate';
            this.outputShape = imageShape;
            if (typeof fillValue === 'number') {
                this.uniforms += " fillValue : f32,";
                this.fillSnippet = "var outputValue = uniforms.fillValue;";
                this.shaderKey += '_float';
            }
            else {
                this.uniforms += " fillValue : vec3<f32>,";
                this.fillSnippet = "var outputValue = uniforms.fillValue[coords[3]];";
                this.shaderKey += '_vec3';
            }
        }
        RotateProgram.prototype.getUserCode = function () {
            var userCode = "\n        ".concat(getMainHeaderString('index'), " {\n          if (index < uniforms.size) {\n            let coords = getCoordsFromIndex(index);\n            let coordXFloat = (f32(coords[2]) - uniforms.centerX) *\n                uniforms.cosRadians - (f32(coords[1]) - uniforms.centerY) *\n                uniforms.sinRadians;\n            let coordYFloat = (f32(coords[2]) - uniforms.centerX) *\n                uniforms.sinRadians + (f32(coords[1]) - uniforms.centerY) *\n                uniforms.cosRadians;\n            let coordX = i32(round(coordXFloat + uniforms.centerX));\n            let coordY = i32(round(coordYFloat + uniforms.centerY));\n            ").concat(this.fillSnippet, "\n            if(coordX >= 0 && coordX < uniforms.xShape[2] && coordY >= 0 &&\n                coordY < uniforms.xShape[1]) {\n              outputValue = getX(coords[0], coordY, coordX, coords[3]);\n            }\n            setOutputAtIndex(index, outputValue);\n          }\n        }\n      ");
            return userCode;
        };
        return RotateProgram;
    }());

    var rotateWithOffsetConfig = {
        kernelName: tf.RotateWithOffset,
        backendName: 'webgpu',
        kernelFunc: function (_a) {
            var inputs = _a.inputs, attrs = _a.attrs, backend = _a.backend;
            var image = inputs.image;
            var radians = attrs.radians, fillValue = attrs.fillValue, center = attrs.center;
            var webgpuBackend = backend;
            var program = new RotateProgram(image.shape, fillValue);
            var _b = __read(tf.backend_util.getImageCenter(center, image.shape[1], image.shape[2]), 2), centerX = _b[0], centerY = _b[1];
            var uniformData = [
                { type: 'float32', data: [centerX] },
                { type: 'float32', data: [centerY] },
                { type: 'float32', data: [Math.sin(radians)] },
                { type: 'float32', data: [Math.cos(radians)] }
            ];
            if (typeof fillValue === 'number') {
                uniformData.push({ type: 'float32', data: [Number.parseFloat(fillValue.toFixed(2))] });
            }
            else {
                uniformData.push({ type: 'float32', data: fillValue });
            }
            var output = webgpuBackend.runWebGPUProgram(program, [image], image.dtype, uniformData);
            return output;
        }
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var round = unaryKernelFunc({ opType: UnaryOpType.ROUND });
    var roundConfig = {
        kernelName: tf.Round,
        backendName: 'webgpu',
        kernelFunc: round
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var rsqrt = unaryKernelFunc({ opType: UnaryOpType.RSQRT, cpuKernelImpl: rsqrtImplCPU });
    var rsqrtConfig = {
        kernelName: tf.Rsqrt,
        backendName: 'webgpu',
        kernelFunc: rsqrt
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var ScatterProgram = /** @class */ (function () {
        function ScatterProgram(flattenXShape, sliceDim, indicesRank, updatesRank, strides, shape, outputDtype, sumDupeIndices) {
            if (sumDupeIndices === void 0) { sumDupeIndices = true; }
            this.variableNames = ['updates', 'indices'];
            this.workgroupSize = [64, 1, 1];
            this.atomic = true;
            this.outputShape = shape;
            this.type = outputDtype;
            this.sumDupeIndices = sumDupeIndices;
            this.dispatchLayout = flatDispatchLayout(flattenXShape);
            // Dispatching based on |updates| shape instead of output shape.
            this.dispatch =
                computeDispatch(this.dispatchLayout, flattenXShape, this.workgroupSize);
            this.sliceDimGreaterThanOne = sliceDim > 1;
            this.shaderKey =
                "scatter_".concat(indicesRank, "_").concat(updatesRank, "_").concat(this.sliceDimGreaterThanOne, "_").concat(outputDtype, "_").concat(sumDupeIndices, "_").concat(strides.length);
            var stridesType = getCoordsDataType(strides.length);
            this.uniforms =
                "sliceDim : i32, strides: ".concat(stridesType, ", updatesSize: i32,");
            this.updatesRank = updatesRank;
            this.indicesRank = indicesRank;
        }
        ScatterProgram.prototype.getUserCode = function () {
            var indicesString = '';
            if (this.indicesRank === 1) {
                indicesString = 'coords[0]';
            }
            else if (this.indicesRank === 2) {
                indicesString = 'coords[0], j';
            }
            var indicesSnippet = "getIndices(".concat(indicesString, ")");
            var strideString = this.sliceDimGreaterThanOne ? 'uniforms.strides[j]' :
                'uniforms.strides';
            var outCoordsString = '';
            var getUpdatesCoordsFromFlatIndex = '';
            if (this.dispatchLayout.x.length === 1) {
                outCoordsString = 'flattenedIndex';
                getUpdatesCoordsFromFlatIndex = "\n      fn getUpdatesCoordsFromFlatIndex(index : i32) -> i32 {\n        return index;\n      }\n      ";
            }
            else if (this.dispatchLayout.x.length === 2) {
                outCoordsString = 'vec2<i32>(flattenedIndex, coords[1])';
                getUpdatesCoordsFromFlatIndex = "\n      fn getUpdatesCoordsFromFlatIndex(index : i32) -> vec2<i32> {\n        // N.B. |updates| could be a scalar tensor, conceptually representing a\n        // 2D tensor with all values equal to that. By design, its size must be\n        // the same as |outShape[1]| in one dimension, and |indicesShape[0]|\n        // gives the other.\n        let sliceSize = uniforms.outShape[1];\n        let d0 = index / sliceSize;\n        let d1 = index - d0 * sliceSize;\n        return vec2<i32>(d0, d1);\n      }\n      ";
            }
            var updatesString = Array.from({ length: this.updatesRank }, function (_, idx) { return "coords[".concat(idx, "]"); });
            var updatesSnippet = "getUpdates(".concat(updatesString.join(', '), ")");
            var userCode = "\n    ".concat(getUpdatesCoordsFromFlatIndex, "\n      ").concat(getMainHeaderString('index'), " {\n        if (index < uniforms.updatesSize) {\n          let coords = getUpdatesCoordsFromFlatIndex(index);\n          var flattenedIndex = 0;\n          for (var j = 0; j < uniforms.sliceDim; j = j + 1) {\n            let indexInside = i32(round(").concat(indicesSnippet, "));\n            flattenedIndex = flattenedIndex + indexInside * ").concat(strideString, ";\n          }\n          let updateValue =\n              ").concat(dataTypeToGPUType(this.type), "(").concat(updatesSnippet, ");\n          let flatIndex = getOutputIndexFromCoords(").concat(outCoordsString, ");\n\n          ").concat(this.sumDupeIndices ?
                atomicAddSnippet('&result[flatIndex]', 'updateValue', this.type) :
                "atomicStore(&result[flatIndex], bitcast<i32>(updateValue));", "\n        }\n      }");
            return userCode;
        };
        return ScatterProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function scatterNd(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var indices = inputs.indices, updates = inputs.updates;
        var shape = attrs.shape;
        var _a = tf.backend_util.calculateShapes(updates, indices, shape), sliceRank = _a.sliceRank, numUpdates = _a.numUpdates, sliceSize = _a.sliceSize, strides = _a.strides, outputSize = _a.outputSize;
        var flattenShape = [outputSize / sliceSize, sliceSize];
        if (outputSize === 0) {
            return backend.makeTensorInfo(shape, indices.dtype);
        }
        var flattenIndices = reshape({ inputs: { x: indices }, backend: backend, attrs: { shape: [numUpdates, sliceRank] } });
        var flattenX = reshape({ inputs: { x: updates }, backend: backend, attrs: { shape: [numUpdates, sliceSize] } });
        var type = flattenX.dtype;
        var output = fill({ backend: backend, attrs: { shape: flattenShape, value: 0, dtype: type } });
        var size = tf.util.sizeFromShape(flattenX.shape);
        var uniformData = [
            { type: 'int32', data: [sliceRank] }, { type: 'int32', data: strides },
            { type: 'int32', data: [size] }
        ];
        var program = new ScatterProgram(flattenX.shape, sliceRank, flattenIndices.shape.length, flattenX.shape.length, strides, flattenShape, type);
        var res = backend.runWebGPUProgram(program, [flattenX, flattenIndices], type, uniformData, output);
        var reshaped = reshape({ inputs: { x: res }, backend: backend, attrs: { shape: shape } });
        backend.disposeData(flattenIndices.dataId);
        backend.disposeData(flattenX.dataId);
        backend.disposeData(res.dataId);
        return reshaped;
    }
    var scatterNdConfig = {
        kernelName: tf.ScatterNd,
        backendName: 'webgpu',
        kernelFunc: scatterNd
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var SearchSortedProgram = /** @class */ (function () {
        function SearchSortedProgram(outputShape, side) {
            this.outputShape = [];
            this.variableNames = ['sortedSequence', 'values'];
            this.uniforms = 'numInputs : i32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.side = side;
            this.shaderKey = "search_sorted_".concat(side);
        }
        SearchSortedProgram.prototype.getUserCode = function () {
            var boundComparator = this.side === 'left' ? '<' : '<=';
            var userCode = "\n      fn findBound(batch: i32, value: f32) -> i32 {\n        var left = i32(0);\n        var right = uniforms.numInputs;\n        while (left < right) {\n          var mid = (left + right) / 2;\n          if (getSortedSequence(batch, mid) ".concat(boundComparator, " value) {\n            left = mid + 1;\n          } else {\n            right = mid;\n          }\n        }\n        return right;\n      }\n\n      ").concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          let value = getValuesByOutputIndex(index);\n          setOutputAtIndexI32(index, findBound(coords[0], value));\n        }\n      }\n    ");
            return userCode;
        };
        return SearchSortedProgram;
    }());

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function searchSorted(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var sortedSequence = inputs.sortedSequence, values = inputs.values;
        var side = attrs.side;
        var program = new SearchSortedProgram([values.shape[0], values.shape[1]], side);
        var uniformData = [{ type: 'int32', data: [sortedSequence.shape[1]] }];
        return backend.runWebGPUProgram(program, [sortedSequence, values], 'int32', uniformData);
    }
    var searchSortedConfig = {
        kernelName: tf.SearchSorted,
        backendName: 'webgpu',
        kernelFunc: searchSorted,
    };

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var SelectProgram = /** @class */ (function () {
        function SelectProgram(cRank, shape, rank) {
            this.variableNames = ['c', 'a', 'b'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = shape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.cRank = cRank;
            this.rank = rank;
            this.shaderKey = 'select';
        }
        SelectProgram.prototype.getUserCode = function () {
            // TODO(WGSL): below code can be merged with getUserCode.
            var cCoords;
            var abCoords;
            if (this.rank > 4) {
                throw Error("Where for rank ".concat(this.rank, " is not yet supported"));
            }
            if (this.rank === 1) {
                abCoords = "resRC";
                cCoords = "resRC";
            }
            else {
                var currentCoords = ['resRC.x', 'resRC.y', 'resRC.z', 'resRC.w'];
                var cCoordVars = [];
                var abCoordVars = [];
                for (var i = 0; i < this.outputShape.length; i++) {
                    abCoordVars.push("".concat(currentCoords[i]));
                    if (i < this.cRank) {
                        cCoordVars.push("".concat(currentCoords[i]));
                    }
                }
                cCoords = cCoordVars.join();
                abCoords = abCoordVars.join();
            }
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let resRC = getCoordsFromIndex(index);\n          let cVal = getC(").concat(cCoords, ");\n          if (cVal >= 1.0) {\n            setOutputAtIndex(index, getA(").concat(abCoords, "));\n          } else {\n            setOutputAtIndex(index, getB(").concat(abCoords, "));\n          }\n        }\n      }\n    ");
            return userCode;
        };
        return SelectProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function select(args) {
        var inputs = args.inputs, backend = args.backend;
        var condition = inputs.condition, t = inputs.t, e = inputs.e;
        var program = new SelectProgram(condition.shape.length, t.shape, t.shape.length);
        return backend.runWebGPUProgram(program, [condition, t, e], tf.upcastType(t.dtype, e.dtype));
    }
    var selectConfig = {
        kernelName: tf.Select,
        backendName: 'webgpu',
        kernelFunc: select
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var selu = unaryKernelFunc({ opType: UnaryOpType.SELU });
    var seluConfig = {
        kernelName: tf.Selu,
        backendName: 'webgpu',
        kernelFunc: selu
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var sigmoid = unaryKernelFunc({ opType: UnaryOpType.SIGMOID });
    var sigmoidConfig = {
        kernelName: tf.Sigmoid,
        backendName: 'webgpu',
        kernelFunc: sigmoid,
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var sign = unaryKernelFunc({ opType: UnaryOpType.SIGN });
    var signConfig = {
        kernelName: tf.Sign,
        backendName: 'webgpu',
        kernelFunc: sign
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var sin = unaryKernelFunc({ opType: UnaryOpType.SIN });
    var sinConfig = {
        kernelName: tf.Sin,
        backendName: 'webgpu',
        kernelFunc: sin
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var sinh = unaryKernelFunc({ opType: UnaryOpType.SINH });
    var sinhConfig = {
        kernelName: tf.Sinh,
        backendName: 'webgpu',
        kernelFunc: sinh
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var softplus = unaryKernelFunc({ opType: UnaryOpType.SOFTPLUS });
    var softplusConfig = {
        kernelName: tf.Softplus,
        backendName: 'webgpu',
        kernelFunc: softplus
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var SpaceToBatchNDProgram = /** @class */ (function () {
        function SpaceToBatchNDProgram(xShape, paddedXShape, paddings, reshapedPaddedXShape, newDim, paddedXShapeStridesShapeLength) {
            var _this = this;
            this.variableNames = ['x'];
            this.outputShape = [];
            this.uniforms = '';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            var outputShape = new Array(reshapedPaddedXShape.length);
            for (var i = 0; i < outputShape.length; i++) {
                outputShape[i] = reshapedPaddedXShape[newDim[i]];
            }
            this.outputShape = outputShape;
            this.newDim = newDim;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.xShape = xShape;
            this.paddedXShape = paddedXShape;
            this.uniforms += "reshapedPaddedXShape : ".concat(getCoordsDataType(reshapedPaddedXShape.length), ", paddedXShapeStrides : ").concat(getCoordsDataType(paddedXShapeStridesShapeLength), ", ");
            paddings.map(function (_, i) {
                _this.uniforms += " pad".concat(i, " : vec2<i32>,");
            });
            this.shaderKey = "spaceToBatchND_".concat(newDim);
        }
        SpaceToBatchNDProgram.prototype.getUserCode = function () {
            var dtype = getCoordsDataType(this.outputShape.length);
            var switched = getSwitchedCoords(this.newDim);
            var userCode = "\n      ".concat(getCoordsFromIndexSnippet(this.paddedXShape, 'PaddedX'), "\n      ").concat(getMainHeaderString('index'), " {\n        if(index < uniforms.size) {\n          let coords = getCoordsFromIndex(index);\n          let switchedIndex = getIndexFromCoords").concat(this.outputShape.length, "D(").concat(dtype, "(").concat(switched, "), uniforms.reshapedPaddedXShape);\n          let paddedCoords = getPaddedXCoordsFromIndex(switchedIndex);\n          ").concat(padCommon(this.xShape, true), "\n        }\n      }\n    ");
            return userCode;
        };
        return SpaceToBatchNDProgram;
    }());

    var spaceToBatchND = function (args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var blockShape = attrs.blockShape, paddings = attrs.paddings;
        tf.util.assert(x.shape.length <= 4, function () { return 'spaceToBatchND for rank > 4 with a WebGPU backend not ' +
            'implemented yet'; });
        var prod = blockShape.reduce(function (a, b) { return a * b; });
        var completePaddings = [[0, 0]];
        completePaddings.push.apply(completePaddings, __spreadArray([], __read(paddings), false));
        for (var i = 1 + blockShape.length; i < x.shape.length; ++i) {
            completePaddings.push([0, 0]);
        }
        var paddedXShape = completePaddings.map(function (p, i) { return p[0] /* beforePad */ + x.shape[i] + p[1]; } /* afterPad */);
        var reshapedPaddedShape = tf.backend_util.getReshaped(paddedXShape, blockShape, prod, false);
        var permutedReshapedPaddedPermutation = tf.backend_util.getPermuted(reshapedPaddedShape.length, blockShape.length, false);
        var flattenShape = tf.backend_util.getReshapedPermuted(paddedXShape, blockShape, prod, false);
        var paddedXShapeStrides = tf.util.computeStrides(paddedXShape);
        var program = new SpaceToBatchNDProgram(x.shape, paddedXShape, completePaddings, reshapedPaddedShape, permutedReshapedPaddedPermutation, paddedXShapeStrides.length);
        var uniformData = [
            { type: 'int32', data: reshapedPaddedShape },
            { type: 'int32', data: paddedXShapeStrides }
        ];
        completePaddings.map(function (p) { return uniformData.push({ type: 'int32', data: [p[0], p[1]] }); });
        var paddedXT = backend.runWebGPUProgram(program, [x], x.dtype, uniformData);
        var result = reshape({ inputs: { x: paddedXT }, backend: backend, attrs: { shape: flattenShape } });
        backend.disposeData(paddedXT.dataId);
        return result;
    };
    var spaceToBatchNDConfig = {
        kernelName: tf.SpaceToBatchND,
        backendName: 'webgpu',
        kernelFunc: spaceToBatchND
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var SparseSegmentSumProgram = /** @class */ (function () {
        function SparseSegmentSumProgram(outShape, sparseSize, outputDtype) {
            this.variableNames = ['input', 'indices', 'segmentIds'];
            this.outputShape = [];
            this.uniforms = 'segmentSize : i32, sparseSize : i32,';
            this.workgroupSize = [64, 1, 1];
            this.atomic = true;
            this.outputShape = outShape;
            this.type = outputDtype;
            this.dispatchLayout = flatDispatchLayout([sparseSize]);
            this.dispatch =
                computeDispatch(this.dispatchLayout, [sparseSize], this.workgroupSize);
            this.shaderKey = 'sparseSegmentSum';
        }
        SparseSegmentSumProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.sparseSize) {\n        let indexInSegmentIds = index / uniforms.segmentSize;\n        let indexInSegment = index % uniforms.segmentSize;\n        let indexInInput = indices[indexInSegmentIds];\n        let segmentId = segmentIds[indexInSegmentIds];\n\n        let value = input[indexInInput * uniforms.segmentSize + indexInSegment];\n        let outIndex = segmentId * uniforms.segmentSize + indexInSegment;\n        ").concat(atomicAddSnippet('&result[outIndex]', 'value', this.type), "\n      }\n    }\n  ");
            return userCode;
        };
        return SparseSegmentSumProgram;
    }());
    var SparseSegmentIdCountProgram = /** @class */ (function () {
        function SparseSegmentIdCountProgram(outShape, segmentIdsShape) {
            this.variableNames = ['segmentIds'];
            this.outputShape = [];
            this.workgroupSize = [64, 1, 1];
            this.atomic = true;
            this.outputShape = [outShape];
            this.dispatchLayout = flatDispatchLayout(segmentIdsShape);
            this.dispatch = computeDispatch(this.dispatchLayout, segmentIdsShape, this.workgroupSize);
            this.shaderKey = 'sparseSegmentIdCountProgram';
        }
        SparseSegmentIdCountProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.segmentIdsShape) {\n        let segmentId = segmentIds[index];\n        ").concat(atomicAddSnippet('&result[segmentId]', '1', 'int32'), "\n      }\n    }\n  ");
            return userCode;
        };
        return SparseSegmentIdCountProgram;
    }());
    var SparseSegmentMeanProgram = /** @class */ (function () {
        function SparseSegmentMeanProgram(outShape, outputDtype) {
            this.variableNames = ['segmentSum', 'sameSegmentIdCount'];
            this.outputShape = [];
            this.uniforms = 'segmentSize : i32';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = outShape;
            this.type = outputDtype;
            this.dispatchLayout = flatDispatchLayout(outShape);
            this.dispatch =
                computeDispatch(this.dispatchLayout, outShape, this.workgroupSize);
            this.shaderKey = 'sparseSegmentMean';
        }
        SparseSegmentMeanProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.size) {\n        let segmentId = index / uniforms.segmentSize;\n        let count = sameSegmentIdCount[segmentId];\n        if (count != 0) {\n          ").concat(this.type === 'float32' ?
                'setOutputAtIndex(index, segmentSum[index] / f32(count));' :
                'setOutputAtIndexI32(index, segmentSum[index] / count);', "\n        }\n      }\n    }\n  ");
            return userCode;
        };
        return SparseSegmentMeanProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function sparseSegmentReduce(input, indices, segmentIds, isSum, backend) {
        if (isSum === void 0) { isSum = false; }
        var inputSize = tf.util.sizeFromShape(input.shape);
        var segmentSize = inputSize / input.shape[0];
        var dtype = input.dtype;
        // Note that the current implementation assumes that segmentIds values are
        // sorted.
        var numIndices = tf.util.sizeFromShape(indices.shape);
        var $segmentIds = backend.readSync(segmentIds.dataId);
        var lastSegmentIdPlusOne = numIndices > 0 ? $segmentIds[numIndices - 1] + 1 : 0;
        var outputRows = lastSegmentIdPlusOne;
        var program;
        var outputShape = input.shape.slice();
        outputShape[0] = outputRows;
        var sparseSize = numIndices * segmentSize;
        var sparseSegmentSum = fill({ backend: backend, attrs: { shape: outputShape, value: 0, dtype: dtype } });
        program = new SparseSegmentSumProgram(outputShape, sparseSize, dtype);
        var uniformData = [
            { type: 'int32', data: [segmentSize] }, { type: 'int32', data: [sparseSize] }
        ];
        var $sparseSegmentSum = backend.runWebGPUProgram(program, [input, indices, segmentIds], dtype, uniformData, sparseSegmentSum);
        if (isSum) {
            return $sparseSegmentSum;
        }
        var sparseSegmentIdCount = fill({ backend: backend, attrs: { shape: [outputRows], value: 0, dtype: 'int32' } });
        program = new SparseSegmentIdCountProgram(outputRows, segmentIds.shape);
        var $sparseSegmentIdCount = backend.runWebGPUProgram(program, [segmentIds], 'int32', null, sparseSegmentIdCount);
        var sparseSegmentMean = fill({ backend: backend, attrs: { shape: outputShape, value: 0, dtype: dtype } });
        program = new SparseSegmentMeanProgram(outputShape, dtype);
        uniformData = [{ type: 'int32', data: [segmentSize] }];
        var $sparseSegmentMean = backend.runWebGPUProgram(program, [$sparseSegmentSum, $sparseSegmentIdCount], dtype, uniformData, sparseSegmentMean);
        backend.disposeData($sparseSegmentSum.dataId);
        backend.disposeData($sparseSegmentIdCount.dataId);
        return $sparseSegmentMean;
    }

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function sparseSegmentMean(args) {
        var inputs = args.inputs, backend = args.backend;
        var data = inputs.data, indices = inputs.indices, segmentIds = inputs.segmentIds;
        return sparseSegmentReduce(data, indices, segmentIds, false, backend);
    }
    var sparseSegmentMeanConfig = {
        kernelName: tf.SparseSegmentMean,
        backendName: 'webgpu',
        kernelFunc: sparseSegmentMean,
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function sparseSegmentSum(args) {
        var inputs = args.inputs, backend = args.backend;
        var data = inputs.data, indices = inputs.indices, segmentIds = inputs.segmentIds;
        return sparseSegmentReduce(data, indices, segmentIds, true, backend);
    }
    var sparseSegmentSumConfig = {
        kernelName: tf.SparseSegmentSum,
        backendName: 'webgpu',
        kernelFunc: sparseSegmentSum,
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var TileProgram = /** @class */ (function () {
        function TileProgram(aShape, reps) {
            this.variableNames = ['A'];
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            var outputShape = new Array(aShape.length);
            for (var i = 0; i < outputShape.length; i++) {
                outputShape[i] = aShape[i] * reps[i];
            }
            this.outputShape = outputShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.rank = this.outputShape.length;
            this.shaderKey = 'tile';
        }
        TileProgram.prototype.getUserCode = function () {
            var sourceCoords = getSourceCoords(this.rank, 'uniforms.');
            var userCode = "\n      ".concat(getMainHeaderString('index'), " {\n        if (index < uniforms.size) {\n          let resRC = getCoordsFromIndex(index);\n          setOutputAtIndex(index, getA(").concat(sourceCoords, "));\n        }\n      }\n    ");
            return userCode;
        };
        return TileProgram;
    }());
    function getSourceCoords(rank, uniformPrefix) {
        if (uniformPrefix === void 0) { uniformPrefix = ''; }
        if (rank >= 5) {
            throw Error("Tile for rank ".concat(rank, " is not yet supported"));
        }
        if (rank === 1) {
            return "(resRC % ".concat(uniformPrefix, "aShape)");
        }
        var currentCoords = ['resRC.x', 'resRC.y', 'resRC.z', 'resRC.w'];
        var sourceCoords = [];
        for (var i = 0; i < rank; i++) {
            sourceCoords.push("(".concat(currentCoords[i], " % ").concat(uniformPrefix, "aShape[").concat(i, "])"));
        }
        return sourceCoords.join();
    }

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function tile(params) {
        var inputs = params.inputs, backend = params.backend, attrs = params.attrs;
        var x = inputs.x;
        var reps = attrs.reps;
        // tile gpu program cannot handle rank >= 5 case.
        if (backend.shouldExecuteOnCPU([x]) || x.dtype === 'string' ||
            x.shape.length >= 5) {
            // Even thought string tensor is always on CPU, just to be consistent on how
            // to access tensor data.
            var data = backend.readSync(x.dataId);
            var value = x.dtype === 'string' ?
                data.map(function (d) { return tf.util.decodeString(d); }) :
                data;
            var buf = tf.buffer(x.shape, x.dtype, value);
            var outBuf = tileImplCPU(buf, reps);
            return backend.makeTensorInfo(outBuf.shape, outBuf.dtype, outBuf.values);
        }
        var program = new TileProgram(x.shape, reps);
        var output = backend.runWebGPUProgram(program, [x], x.dtype);
        return output;
    }
    var tileConfig = {
        kernelName: tf.Tile,
        backendName: 'webgpu',
        kernelFunc: tile,
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function sparseToDense(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var sparseIndices = inputs.sparseIndices, sparseValues = inputs.sparseValues, defaultValue = inputs.defaultValue;
        var outputShape = attrs.outputShape;
        var _a = tf.backend_util.calculateShapes(sparseValues, sparseIndices, outputShape), sliceRank = _a.sliceRank, numUpdates = _a.numUpdates, sliceSize = _a.sliceSize, strides = _a.strides, outputSize = _a.outputSize;
        var sumDupeIndices = false;
        if (sparseValues.dtype === 'string') {
            var indicesBuf = backend.bufferSync(sparseIndices);
            var updatesBuf = backend.bufferSync(sparseValues);
            var $defaultValue_1 = tf.util.decodeString(backend.readSync(defaultValue.dataId)[0]);
            var outBuf = scatterImplCPU(indicesBuf, updatesBuf, outputShape, outputSize, sliceSize, numUpdates, sliceRank, strides, $defaultValue_1, sumDupeIndices);
            return backend.makeTensorInfo(outputShape, outBuf.dtype, outBuf.values);
        }
        var flattenShape = [outputSize / sliceSize, sliceSize];
        var $sparseIndices = reshape({
            inputs: { x: sparseIndices },
            backend: backend,
            attrs: { shape: [numUpdates, sliceRank] }
        });
        var $sparseValues = sparseValues.shape.length ?
            reshape({
                inputs: { x: sparseValues },
                backend: backend,
                attrs: { shape: [numUpdates, sliceSize] }
            }) :
            identity({ inputs: { x: sparseValues }, backend: backend });
        var type = $sparseValues.dtype;
        var zero = backend.makeTensorInfo([], type, tf.util.makeZerosTypedArray(1, type));
        // Fill output tensor with the default value.
        var $defaultValue = reshape({
            inputs: { x: defaultValue },
            backend: backend,
            attrs: { shape: Array(flattenShape.length).fill(1) }
        });
        var $denseValues = tile({ inputs: { x: $defaultValue }, backend: backend, attrs: { reps: flattenShape } });
        var size = tf.util.sizeFromShape([numUpdates, sliceSize]);
        var uniformData = [
            { type: 'int32', data: [sliceRank] },
            { type: 'int32', data: strides },
            { type: 'int32', data: [size] },
        ];
        switch (numUpdates) {
            case 0:
                break;
            case 1:
                {
                    var program = new ScatterProgram([numUpdates, sliceSize], sliceRank, $sparseIndices.shape.length, $sparseValues.shape.length, strides, flattenShape, type, sumDupeIndices);
                    backend.runWebGPUProgram(program, [$sparseValues, $sparseIndices], type, uniformData, $denseValues);
                }
                break;
            default:
                {
                    // First replace the default value with 0 at indices.
                    var program = new ScatterProgram([numUpdates, sliceSize], sliceRank, $sparseIndices.shape.length, zero.shape.length, strides, flattenShape, type, sumDupeIndices);
                    backend.runWebGPUProgram(program, [zero, $sparseIndices], type, uniformData, $denseValues);
                }
                {
                    // Then replace 0 with the (sum of) sparse value(s) at indices.
                    var program = new ScatterProgram([numUpdates, sliceSize], sliceRank, $sparseIndices.shape.length, $sparseValues.shape.length, strides, flattenShape, type);
                    backend.runWebGPUProgram(program, [$sparseValues, $sparseIndices], type, uniformData, $denseValues);
                }
        }
        var denseValues = reshape({ inputs: { x: $denseValues }, backend: backend, attrs: { shape: outputShape } });
        backend.disposeData($sparseIndices.dataId);
        backend.disposeData($sparseValues.dataId);
        backend.disposeData($defaultValue.dataId);
        backend.disposeData(zero.dataId);
        backend.disposeData($denseValues.dataId);
        return denseValues;
    }
    var sparseToDenseConfig = {
        kernelName: tf.SparseToDense,
        backendName: 'webgpu',
        kernelFunc: sparseToDense
    };

    function splitV(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var numOrSizeSplits = attrs.numOrSizeSplits, axis = attrs.axis;
        var $axis = tf.util.parseAxisParam(axis, x.shape)[0];
        var splitSizes = tf.backend_util.prepareSplitSize(x, numOrSizeSplits, $axis);
        var xRank = x.shape.length;
        var begin = new Array(xRank).fill(0);
        var size = x.shape.slice();
        return splitSizes.map(function (s) {
            var sliceSize = __spreadArray([], __read(size), false);
            sliceSize[$axis] = s;
            var sliceT = slice({ inputs: { x: x }, backend: backend, attrs: { begin: begin, size: sliceSize } });
            begin[$axis] += s;
            return sliceT;
        });
    }
    var splitVConfig = {
        kernelName: tf.SplitV,
        backendName: 'webgpu',
        kernelFunc: splitV
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var sqrt = unaryKernelFunc({ opType: UnaryOpType.SQRT });
    var sqrtConfig = {
        kernelName: tf.Sqrt,
        backendName: 'webgpu',
        kernelFunc: sqrt
    };

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var squareConfig = {
        kernelName: tf.Square,
        backendName: 'webgpu',
        kernelFunc: function (_a) {
            var inputs = _a.inputs, backend = _a.backend;
            var x = inputs.x;
            var webGPUBackend = backend;
            var program = new UnaryOpProgram(x.shape, UnaryOpType.SQUARE);
            return webGPUBackend.runWebGPUProgram(program, [x], x.dtype);
        }
    };

    /**
     * @license
     * Copyright 2020 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var squaredDifference = binaryKernelFunc({
        opType: BinaryOpType.SQUARED_DIFFERENCE,
    });
    var squaredDifferenceConfig = {
        kernelName: tf.SquaredDifference,
        backendName: 'webgpu',
        kernelFunc: squaredDifference
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function step(_a) {
        var inputs = _a.inputs, attrs = _a.attrs, backend = _a.backend;
        var x = inputs.x;
        var program = new UnaryOpProgram(x.shape, UnaryOpType.STEP, 'stepAlpha : f32,');
        var uniformData = [{ type: 'float32', data: [attrs.alpha] }];
        return backend.runWebGPUProgram(program, [x], x.dtype, uniformData);
    }
    var stepConfig = {
        kernelName: tf.Step,
        backendName: 'webgpu',
        kernelFunc: step
    };

    /**
     * @license
     * Copyright 2019 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var StridedSliceProgram = /** @class */ (function () {
        function StridedSliceProgram(destSize) {
            this.variableNames = ['x'];
            // TODO(xing.xu): Increase the workPerThread.
            this.workPerThread = 1;
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = destSize;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize, [this.workPerThread, 1, 1]);
            var dtype = getCoordsDataType(this.outputShape.length);
            this.uniforms = "begin : ".concat(dtype, ",  strides : ").concat(dtype, ", ");
            this.shaderKey = 'stridedSlice';
        }
        StridedSliceProgram.prototype.getUserCode = function () {
            var _this = this;
            var rank = this.outputShape.length;
            var newCoords = '';
            if (rank === 1) {
                newCoords = 'coords * uniforms.strides + uniforms.begin';
            }
            else {
                var outputAxis_1 = 0;
                newCoords =
                    this.outputShape
                        .map(function (_, i) {
                        outputAxis_1++;
                        return _this.outputShape.length === 1 ?
                            "coords * uniforms.strides[".concat(i, "] + uniforms.begin[").concat(i, "]") :
                            "coords[".concat(outputAxis_1 - 1, "] * uniforms.strides[").concat(i, "] + uniforms.begin[").concat(i, "]");
                    })
                        .join(',');
            }
            var userCode = "\n       ".concat(getMainHeaderString('index'), " {\n         if (index < uniforms.size) {\n           let coords = getCoordsFromIndex(index);\n           setOutputAtIndex(index, getX(").concat(newCoords, "));\n         }\n       }\n     ");
            return userCode;
        };
        return StridedSliceProgram;
    }());

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function stridedSlice(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var begin = attrs.begin, end = attrs.end, strides = attrs.strides, beginMask = attrs.beginMask, endMask = attrs.endMask, ellipsisMask = attrs.ellipsisMask, newAxisMask = attrs.newAxisMask, shrinkAxisMask = attrs.shrinkAxisMask;
        var _a = tf.slice_util.sliceInfo(x.shape, begin, end, strides, beginMask, endMask, ellipsisMask, newAxisMask, shrinkAxisMask), finalShapeSparse = _a.finalShapeSparse, finalShape = _a.finalShape, isIdentity = _a.isIdentity, sliceDim0 = _a.sliceDim0, isSimpleSlice = _a.isSimpleSlice, $begin = _a.begin, $end = _a.end, $strides = _a.strides;
        var result;
        if (isIdentity) {
            // Optimization #1, slice is a no-op plus reshape
            result = reshape({ inputs: { x: x }, backend: backend, attrs: { shape: finalShape } });
        }
        else if (sliceDim0 || isSimpleSlice) {
            // Optimization #2, slice is memory contiguous (only occurs in dim 0)
            tf.util.assert(x.shape.length >= 1, function () { return "Input must have rank at least 1, got: ".concat(x.shape.length); });
            var size = tf.slice_util.computeOutShape($begin, $end, $strides);
            // To tolerate begin[0] > end[0] (a 0-output slice), we min(begin, end).
            var sliced = slice({ inputs: { x: x }, backend: backend, attrs: { begin: $begin, size: size } });
            result =
                reshape({ inputs: { x: sliced }, backend: backend, attrs: { shape: finalShape } });
            backend.disposeData(sliced.dataId);
        }
        else {
            var shouldExecuteOnCPU = backend.shouldExecuteOnCPU([x]);
            if (shouldExecuteOnCPU) {
                var values = backend.readSync(x.dataId);
                var xBuf = tf.buffer(x.shape, x.dtype, values);
                var resultValues = stridedSliceImplCPU(finalShapeSparse, xBuf, $strides, $begin);
                result = backend.makeTensorInfo(finalShape, x.dtype, resultValues.values);
            }
            else {
                var program = new StridedSliceProgram(finalShapeSparse);
                var uniformData = [{ type: 'int32', data: $begin }, { type: 'int32', data: $strides }];
                var resultValues = backend.runWebGPUProgram(program, [x], x.dtype, uniformData);
                result = reshape({ inputs: { x: resultValues }, backend: backend, attrs: { shape: finalShape } });
                backend.disposeData(resultValues.dataId);
            }
        }
        return result;
    }
    var stridedSliceConfig = {
        kernelName: tf.StridedSlice,
        backendName: 'webgpu',
        kernelFunc: stridedSlice
    };

    function stringNGrams(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var separator = attrs.separator, nGramWidths = attrs.nGramWidths, leftPad = attrs.leftPad, rightPad = attrs.rightPad, padWidth = attrs.padWidth, preserveShortSequences = attrs.preserveShortSequences;
        var data = inputs.data, dataSplits = inputs.dataSplits;
        var $data = backend.readSync(data.dataId);
        var $dataSplits = backend.readSync(dataSplits.dataId);
        var _a = __read(stringNGramsImplCPU($data, $dataSplits, separator, nGramWidths, leftPad, rightPad, padWidth, preserveShortSequences), 2), nGrams = _a[0], nGramsSplits = _a[1];
        return [
            backend.makeTensorInfo([nGrams.length], 'string', nGrams),
            backend.makeTensorInfo(dataSplits.shape, 'int32', nGramsSplits),
        ];
    }
    var stringNGramsConfig = {
        kernelName: tf.StringNGrams,
        backendName: 'webgpu',
        kernelFunc: stringNGrams,
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var sub = binaryKernelFunc({ opType: BinaryOpType.SUB, cpuKernelImpl: subImplCPU, supportsComplex: true });
    var subConfig = {
        kernelName: tf.Sub,
        backendName: 'webgpu',
        kernelFunc: sub
    };

    /**
     * @license
     * Copyright 2022 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var tan = unaryKernelFunc({ opType: UnaryOpType.TAN });
    var tanConfig = {
        kernelName: tf.Tan,
        backendName: 'webgpu',
        kernelFunc: tan
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var tanh = unaryKernelFunc({ opType: UnaryOpType.TANH });
    var tanhConfig = {
        kernelName: tf.Tanh,
        backendName: 'webgpu',
        kernelFunc: tanh
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function tensorScatterUpdate(args) {
        var inputs = args.inputs, backend = args.backend; args.attrs;
        var tensor = inputs.tensor, indices = inputs.indices, updates = inputs.updates;
        var _b = tf.backend_util.calculateShapes(updates, indices, tensor.shape), sliceRank = _b.sliceRank, numUpdates = _b.numUpdates, sliceSize = _b.sliceSize, strides = _b.strides, outputSize = _b.outputSize;
        var flattenShape = [outputSize / sliceSize, sliceSize];
        if (outputSize === 0) {
            return backend.makeTensorInfo(tensor.shape, indices.dtype);
        }
        var toDispose = [];
        var flattenIndices = reshape({ inputs: { x: indices }, backend: backend, attrs: { shape: [numUpdates, sliceRank] } });
        toDispose.push(flattenIndices);
        var flattenX = reshape({ inputs: { x: updates }, backend: backend, attrs: { shape: [numUpdates, sliceSize] } });
        toDispose.push(flattenX);
        var flattenTensor = reshape({ inputs: { x: tensor }, backend: backend, attrs: { shape: flattenShape } });
        toDispose.push(flattenTensor);
        var output = tile({
            inputs: { x: flattenTensor },
            backend: backend,
            attrs: { reps: Array(flattenShape.length).fill(1) }
        });
        var program = new ScatterProgram([numUpdates, sliceSize], sliceRank, flattenIndices.shape.length, flattenX.shape.length, strides, flattenShape, tensor.dtype, false);
        var size = tf.util.sizeFromShape([numUpdates, sliceSize]);
        var uniformData = [
            { type: 'int32', data: [sliceRank] },
            { type: 'int32', data: strides },
            { type: 'int32', data: [size] },
        ];
        var res = backend.runWebGPUProgram(program, [flattenX, flattenIndices], flattenTensor.dtype, uniformData, output);
        toDispose.push(res);
        var reshaped = reshape({ inputs: { x: res }, backend: backend, attrs: { shape: tensor.shape } });
        toDispose.forEach(function (t) { return backend.disposeData(t.dataId); });
        return reshaped;
    }
    var tensorScatterUpdateConfig = {
        kernelName: tf.TensorScatterUpdate,
        backendName: 'webgpu',
        kernelFunc: tensorScatterUpdate
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    // Based on Algorithm 2 of Bitonic Top K, ref:
    // https://anilshanbhag.in/static/papers/gputopk_sigmod18.pdf
    // The original algorithm is based on computing the top K only, however
    // since for TFJS we require the indices of the top K values as well then the
    // algorithm found here is a bit modified. Rather than producing the values
    // at each step, the indices containing the top K are generated instead.
    // The output values are not generated to reduce the number of outputs in the
    // GPU, the values can easily be retrieved from the indices using a gather
    // op.
    var SwapProgram = /** @class */ (function () {
        function SwapProgram(shape) {
            this.variableNames = ['x', 'indices'];
            this.workgroupSize = [256, 1, 1];
            this.size = true;
            this.outputShape = shape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.uniforms = "inputSize : i32, firstPass : i32, negativeInf : f32,\n        dir : i32, inc : i32,";
            this.shaderKey = 'swap';
        }
        SwapProgram.prototype.getUserCode = function () {
            var userCode = "\n        ".concat(getMainHeaderString('index'), " {\n          if (index < uniforms.size) {\n            let outC = getCoordsFromIndex(index);\n            let batch = outC[0];\n            let elemIdx = outC[1];\n            // We compare elements pair-wise within a group of size 2 * inc.\n            // The comparing rule for each group alternates between ascending\n            // and descending. Within each group, we compare each pair at\n            // positions i and i+inc. To decide whether an element at position i\n            // is x0 or x1, we mod it by 2 * inc, if the result is smaller than\n            // inc, it is in the first half of the group, we denote it as x0,\n            // otherwise we denote it as x1.\n            // For example, as shown in the Bitonic top K paper referenced\n            // above, Figure5(a) shows that element[1] is in the second half of\n            // the group when group size is 2, but it is in the first half of\n            // the group when group size is 4.\n            let isFirstInPair = elemIdx % (2 * uniforms.inc) < uniforms.inc;\n            var i = 0;\n            if (isFirstInPair) {\n              i = elemIdx;\n            } else {\n              i = elemIdx - uniforms.inc;\n            }\n\n            var i0 = 0;\n            if (uniforms.firstPass == 1) {\n              i0 = i;\n            } else {\n              i0 = i32(getIndices(batch, i));\n            }\n\n            var i1 = 0;\n            if (uniforms.firstPass == 1) {\n              i1 = i + uniforms.inc;\n            } else {\n              i1 = i32(getIndices(batch, i + uniforms.inc));\n            }\n\n            var x0 = f32(0.0);\n            var x1 = f32(0.0);\n            if (i0 < uniforms.inputSize) {\n              x0 = getX(batch, i0);\n            } else {\n              x0 = uniforms.negativeInf;\n            }\n            if (i1 < uniforms.inputSize) {\n              x1 = getX(batch, i1);\n            } else {\n              x1 = uniforms.negativeInf;\n            }\n\n            let reverse = elemIdx % (2 * uniforms.dir) >= uniforms.dir;\n            let isGreater = x0 > x1 || (x0 == x1 && i1 > i0);\n            if (reverse == isGreater) {\n              // Elements in opposite order of direction\n              let iTemp = i0;\n              i0 = i1;\n              i1 = iTemp;\n            }\n            if (isFirstInPair) {\n              setOutputAtIndex(index, f32(i0));\n            } else {\n              setOutputAtIndex(index, f32(i1));\n            }\n          }\n        }\n      ");
            return userCode;
        };
        return SwapProgram;
    }());
    var MergeProgram = /** @class */ (function () {
        function MergeProgram(shape) {
            this.variableNames = ['x', 'indices'];
            this.workgroupSize = [256, 1, 1];
            this.size = true;
            this.outputShape = shape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            // |n| Size of the original input of TopK
            // |firstPass| indicates if this is the first time swap is being used which
            // means no indices input containing the top K is present yet.
            // |k| Top k elements desired
            this.uniforms = "inputSize : i32, firstPass : i32, k : i32,";
            this.shaderKey = 'merge';
        }
        MergeProgram.prototype.getUserCode = function () {
            var userCode = "\n        ".concat(getMainHeaderString('index'), " {\n          if (index < uniforms.size) {\n            let outC = getCoordsFromIndex(index);\n            let batch = outC[0];\n            let elemIdx = outC[1];\n            // The output size is half of the previous size.\n            // If the previous sequence is | | | | _ _ _ _  | | | |  _ _ _ _\n            // (k=4), we only need to output the indices at positions |, the\n            // indices at positions _ can be thrown away, see Figure5(b) After\n            // Phase 2 (Merge phase) in the Bitonic Top K paper referenced\n            // above.\n            // For example, the paper shows we only need to output the orange\n            // bars. The output sequence should look like this | | | | | | | |.\n            // Because the sequence is halved, to map the output index back to\n            // the previous sequence to find the corresponding value, we need\n            // to double the index. When we double the index, we basically\n            // interpolate a position, so 2i looks like\n            // | _ | _ | _ | _ | _ | _ | _. We move the | to the first k\n            // position of each 2k positions by - elemIdx % k. E.g. for output\n            // at index 4,5,6,7, we want to get the corresponding element at\n            // original index 8,9,10,11, for output at index 8,9,10,11,\n            // we want to get the corresponding element at original index\n            // 16,17,18,19, so on and so forth.\n\n            var i = 0;\n            if (elemIdx < uniforms.k) {\n              i = elemIdx;\n            } else {\n              i = elemIdx * 2 - elemIdx % uniforms.k;\n            }\n            var i0 = 0;\n            if (uniforms.firstPass == 1) {\n              i0 = i;\n            } else {\n              i0 = i32(getIndices(batch, i));\n            }\n            var i1 = 0;\n            if (uniforms.firstPass == 1) {\n              i1 = i + uniforms.k;\n            } else {\n              i1 = i32(getIndices(batch, i + uniforms.k));\n            }\n\n            let x0 = getX(batch, i0);\n            var x1 = f32(0.0);\n            if (i1 < uniforms.inputSize) {\n              x1 = getX(batch, i1);\n            } else {\n              x1 = x0;\n            }\n\n            if (x0 >= x1) {\n              setOutputAtIndex(index, f32(i0));\n            } else {\n              setOutputAtIndex(index, f32(i1));\n            }\n          }\n        }\n      ");
            return userCode;
        };
        return MergeProgram;
    }());

    function disposeIntermediateTensorInfoOrNull(backend, tensorInfo) {
        if (tensorInfo !== null) {
            backend.disposeData(tensorInfo.dataId);
        }
    }
    function roundUpToPow2(num) {
        var pow2 = 1;
        while (pow2 < num) {
            pow2 *= 2;
        }
        return pow2;
    }
    // Based on Algorithm 2 of Bitonic Top K, ref:
    // https://anilshanbhag.in/static/papers/gputopk_sigmod18.pdf
    function topK(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x;
        var k = attrs.k, sorted = attrs.sorted;
        var xShape = x.shape;
        var lastDim = xShape[xShape.length - 1];
        if (backend.shouldExecuteOnCPU([x])) {
            var xVals = backend.readSync(x.dataId);
            var _a = __read(topKImplCPU(xVals, xShape, x.dtype, k, sorted), 2), allTopKVals = _a[0], allTopKIndices = _a[1];
            return [
                backend.makeTensorInfo(allTopKVals.shape, allTopKVals.dtype, allTopKVals.values),
                backend.makeTensorInfo(allTopKIndices.shape, allTopKIndices.dtype, allTopKIndices.values)
            ];
        }
        if (k === 0) {
            xShape[xShape.length - 1] = 0;
            return [
                backend.makeTensorInfo(xShape, x.dtype, []),
                backend.makeTensorInfo(xShape, 'int32', [])
            ];
        }
        if (lastDim === 1 /* firstPass */) {
            return [
                x, fill({ attrs: { shape: xShape, dtype: 'int32', value: 0 }, backend: backend })
            ];
        }
        // Reshape into a 2d tensor [batch, lastDim] and compute topk along lastDim.
        var xSize = tf.util.sizeFromShape(xShape);
        var batch = xSize / lastDim;
        var x2D = reshape({ inputs: { x: x }, attrs: { shape: [batch, lastDim] }, backend: backend });
        var kPow2 = roundUpToPow2(k);
        var lastDimPow2 = roundUpToPow2(lastDim);
        // Only the indices containing the top K are kept at every step to reduce
        // number of outputs in the GPU algorithms, so once the final set of indices
        // is computed then gather is used to grab the corresponding values
        // from the original input.
        var indices = null;
        // GPU algorithm always takes in an indices input but this input is not used
        // on the first run of a GPU algorithm, therefore if indices is null we simply
        // pass in x2D instead of it but the value will not actually be used
        var getInputs = function () { return indices === null ? [x2D, x2D] : [x2D, indices]; };
        var runSwap = function (dir, inc, shape) {
            var inputs = getInputs();
            var program = new SwapProgram(shape);
            var firstPass = indices === null ? 1 : 0;
            var uniformDataSwap = [
                { type: 'int32', data: [lastDim] },
                { type: 'int32', data: [firstPass] },
                { type: 'float32', data: [Number.NEGATIVE_INFINITY] },
                { type: 'int32', data: [dir] },
                { type: 'int32', data: [inc] }
            ];
            var prevIndices = indices;
            indices = backend.runWebGPUProgram(program, inputs, 'int32', uniformDataSwap);
            disposeIntermediateTensorInfoOrNull(backend, prevIndices);
        };
        // Step 1: local sort
        for (var len = 1; len < kPow2; len *= 2) {
            var dir = len * 2;
            for (var inc = len; inc >= 1; inc /= 2) {
                runSwap(dir, inc, [batch, lastDimPow2]);
            }
        }
        // Step 2: merge
        for (var indicesSize = lastDimPow2; indicesSize > kPow2; indicesSize /= 2) {
            var inputs_1 = getInputs();
            var mergeProgram = new MergeProgram([batch, indicesSize / 2]);
            var firstPass = indices === null ? 1 : 0;
            var uniformDataMerge = [
                { type: 'int32', data: [lastDim] },
                { type: 'int32', data: [firstPass] },
                { type: 'int32', data: [kPow2] }
            ];
            var prevIndices_1 = indices;
            indices = backend.runWebGPUProgram(mergeProgram, inputs_1, 'int32', uniformDataMerge);
            disposeIntermediateTensorInfoOrNull(backend, prevIndices_1);
            // Step 3: rebuild
            var len = kPow2 / 2;
            var dir = len * 2;
            for (var inc = len; inc >= 1; inc /= 2) {
                runSwap(dir, inc, indices.shape);
            }
        }
        // Keep only the requested top K results instead of kPow2
        var prevIndices = indices;
        indices = slice({ inputs: { x: indices }, backend: backend, attrs: { begin: 0, size: [batch, k] } });
        disposeIntermediateTensorInfoOrNull(backend, prevIndices);
        // Gather values on last dimension
        var values = gatherV2({ inputs: { x: x2D, indices: indices }, backend: backend, attrs: { axis: 1, batchDims: 1 } });
        disposeIntermediateTensorInfoOrNull(backend, x2D);
        // Reshape back to the original input shape, except that the last
        // dimension is k.
        var newShape = xShape.slice(0, -1);
        newShape.push(k);
        prevIndices = indices;
        indices = reshape({ inputs: { x: indices }, attrs: { shape: newShape }, backend: backend });
        disposeIntermediateTensorInfoOrNull(backend, prevIndices);
        var prevValues = values;
        values = reshape({ inputs: { x: values }, attrs: { shape: newShape }, backend: backend });
        disposeIntermediateTensorInfoOrNull(backend, prevValues);
        return [values, indices];
    }
    var topKConfig = {
        kernelName: tf.TopK,
        backendName: 'webgpu',
        kernelFunc: topK
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var TransformProgram = /** @class */ (function () {
        function TransformProgram(outShape) {
            this.variableNames = ['Image', 'Transforms'];
            this.uniforms = 'interpolationModeId : i32, fillModeId : i32, fillValue : f32,';
            this.workgroupSize = [64, 1, 1];
            this.size = true;
            this.outputShape = outShape;
            this.dispatchLayout = flatDispatchLayout(this.outputShape);
            this.dispatch = computeDispatch(this.dispatchLayout, this.outputShape, this.workgroupSize);
            this.shaderKey = 'transform';
        }
        TransformProgram.prototype.getUserCode = function () {
            var userCode = "\n          fn mapCoord(outCoord : f32, len : f32) -> f32{\n            var inCoord = outCoord;\n            if(uniforms.fillModeId == 2) {\n              if (inCoord < 0.0) {\n                if (len <= 1.0) {\n                  inCoord = 0.0;\n                } else {\n                  let sz2 = 2.0 * len;\n                  if (inCoord < sz2) {\n                    inCoord = sz2 * f32(i32(f32(-inCoord / sz2))) +\n                    inCoord;\n                  }\n                  if (inCoord < -len) {\n                    inCoord = inCoord + sz2;\n                  } else {\n                    inCoord = -inCoord - 1.0;\n                  }\n                }\n              } else if (inCoord > len - 1.0) {\n                if (len <= 1.0) {\n                  inCoord = 0.0;\n                } else {\n                  let sz2 = 2.0 * len;\n                  inCoord = inCoord - sz2 * f32(i32(f32(inCoord / sz2)));\n                  if (inCoord >= len) {\n                    inCoord = sz2 - inCoord - 1.0;\n                  }\n                }\n              }\n              return clamp(inCoord, 0.0, len - 1.0);\n            } else if (uniforms.fillModeId == 3) {\n              if (inCoord < 0.0) {\n                if (len <= 1.0) {\n                  inCoord = 0.0;\n                } else {\n                  let sz = len - 1.0;\n                  inCoord = inCoord + len * (f32(i32(f32(-inCoord / sz))) + 1.0);\n                }\n              } else if (inCoord > len - 1.0) {\n                if (len <= 1.0) {\n                  inCoord = 0.0;\n                } else {\n                  let sz = len - 1.0;\n                  inCoord = inCoord - len * f32(i32(f32(inCoord / sz)));\n                }\n              }\n              return clamp(inCoord, 0.0, len - 1.0);\n            } else if (uniforms.fillModeId == 4) {\n              return clamp(outCoord, 0.0, len - 1.0);\n            }\n            return outCoord;\n          }\n          fn readWithFillValue(batch : i32, coordY : i32, coordX : i32,\n            channel : i32) -> f32 {\n            var outputValue : f32;\n            if (0 <= coordY && coordY < uniforms.imageShape[1] && 0 <= coordX && coordX < uniforms.imageShape[2]) {\n                outputValue = getImage(batch, coordY, coordX, channel);\n            } else {\n              outputValue = uniforms.fillValue;\n            }\n            return outputValue;\n          }\n\n          ".concat(getMainHeaderString('index'), " {\n            if (index < uniforms.size) {\n              let coords = getCoordsFromIndex(index);\n              var outputValue : f32;\n              let batch = coords[0];\n              let x = coords[2];\n              let y = coords[1];\n              let channel = coords[3];\n              let xf = f32(x);\n              let yf = f32(y);\n              let a1 = getTransforms(batch, 0);\n              let a2 = getTransforms(batch, 1);\n              let a3 = getTransforms(batch, 2);\n              let b1 = getTransforms(batch, 3);\n              let b2 = getTransforms(batch, 4);\n              let b3 = getTransforms(batch, 5);\n              let c1 = getTransforms(batch, 6);\n              let c2 = getTransforms(batch, 7);\n              let projection = c1 * xf + c2 * yf + 1.0;\n              if (projection == 0.0) {\n                outputValue = uniforms.fillValue;\n              } else {\n                let inX = (a1 * xf + a2 * yf + a3) / projection;\n                let inY = (b1 * xf + b2 * yf + b3) / projection;\n                let mapX = mapCoord(inX, f32(uniforms.imageShape[2]));\n                let mapY = mapCoord(inY, f32(uniforms.imageShape[1]));\n\n                if (uniforms.interpolationModeId == 1) {\n                  let coordY = i32(round(mapY));\n                  let coordX = i32(round(mapX));\n                  outputValue = readWithFillValue(batch, coordY, coordX,\n                    channel);\n                } else {\n                  let yFloor = floor(mapY);\n                  let xFloor = floor(mapX);\n                  let yCeil = yFloor + 1.0;\n                  let xCeil = xFloor + 1.0;\n                  let valueYFloor = (xCeil - mapX) *\n                  readWithFillValue(batch, i32(yFloor), i32(xFloor), channel) +\n                  (mapX - xFloor) *\n                  readWithFillValue(batch, i32(yFloor), i32(xCeil), channel);\n                  let valueYCeil = (xCeil - mapX) *\n                  readWithFillValue(batch, i32(yCeil), i32(xFloor), channel) +\n                  (mapX - xFloor) *\n                  readWithFillValue(batch, i32(yCeil), i32(xCeil), channel);\n                  outputValue = (yCeil - mapY) * valueYFloor +\n                  (mapY - yFloor) * valueYCeil;\n                }\n              }\n              setOutputAtIndex(index, outputValue);\n            }\n          }\n        ");
            return userCode;
        };
        return TransformProgram;
    }());

    function transform(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var image = inputs.image, transforms = inputs.transforms;
        var interpolation = attrs.interpolation, fillMode = attrs.fillMode, fillValue = attrs.fillValue, outputShape = attrs.outputShape;
        var _a = __read(image.shape, 4), batch = _a[0], imageHeight = _a[1], imageWidth = _a[2], numChannels = _a[3];
        var _b = __read(outputShape != null ? outputShape : [imageHeight, imageWidth], 2), outHeight = _b[0], outWidth = _b[1];
        var outShape = [batch, outHeight, outWidth,
            numChannels];
        var program = new TransformProgram(outShape);
        var interpolationModeId = interpolation === 'nearest' ? 1 : 2;
        var fillModeId;
        switch (fillMode) {
            case 'constant':
                fillModeId = 1;
                break;
            case 'reflect':
                fillModeId = 2;
                break;
            case 'wrap':
                fillModeId = 3;
                break;
            case 'nearest':
                fillModeId = 4;
                break;
            default:
                fillModeId = 1;
                break;
        }
        var uniformData = [
            { type: 'int32', data: [interpolationModeId] },
            { type: 'int32', data: [fillModeId] }, { type: 'float32', data: [fillValue] }
        ];
        return backend.runWebGPUProgram(program, [image, transforms], 'float32', uniformData);
    }
    var transformConfig = {
        kernelName: tf.Transform,
        backendName: 'webgpu',
        kernelFunc: transform
    };

    /**
     * @license
     * Copyright 2021 Google LLC. All Rights Reserved.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function unpack(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var value = inputs.value;
        var axis = attrs.axis;
        if (axis < 0) {
            axis += value.shape.length;
        }
        var x = value;
        var xRank = x.shape.length;
        var num = value.shape[axis];
        var outShape = new Array(xRank - 1);
        var outIndex = 0;
        for (var i = 0; i < xRank; i++) {
            if (i !== axis) {
                outShape[outIndex++] = x.shape[i];
            }
        }
        var toDispose = [];
        var begin = new Array(xRank).fill(0);
        var size = x.shape.slice();
        size[axis] = 1;
        var res = new Array(num);
        for (var i = 0; i < res.length; i++) {
            begin[axis] = i;
            var sliced = slice({ inputs: { x: x }, backend: backend, attrs: { begin: begin, size: size } });
            var reshaped = reshape({ inputs: { x: sliced }, backend: backend, attrs: { shape: outShape } });
            res[i] = reshaped;
            toDispose.push(sliced);
        }
        toDispose.forEach(function (t) { return backend.disposeData(t.dataId); });
        return res;
    }
    var unpackConfig = {
        kernelName: tf.Unpack,
        backendName: 'webgpu',
        kernelFunc: unpack
    };

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    var UnsortedSegmentSumProgram = /** @class */ (function () {
        function UnsortedSegmentSumProgram(inShape, outShape, outputDtype) {
            this.outputShape = [];
            this.variableNames = ['x', 'segmentIds'];
            this.uniforms = 'numSegments : i32, xSize: i32,';
            this.workgroupSize = [64, 1, 1];
            this.atomic = true;
            this.outputShape = outShape;
            this.dispatchLayout = flatDispatchLayout(inShape);
            this.dispatch =
                computeDispatch(this.dispatchLayout, inShape, this.workgroupSize);
            if (outputDtype !== 'float32' && outputDtype !== 'int32') {
                throw new Error("UnsortedSegmentSum only supports float32 and int32\n              types, does not support ".concat(outputDtype, " type."));
            }
            this.type = outputDtype;
            this.shaderKey = 'unsortedSegmentSum';
        }
        UnsortedSegmentSumProgram.prototype.getUserCode = function () {
            var userCode = "\n    ".concat(getMainHeaderString('index'), " {\n      if (index < uniforms.xSize) {\n        let coords = getXCoordsFromIndex(index);\n        let b = coords[0];\n        let inCol = coords[1];\n\n        let segmentId = i32(getSegmentIds(inCol));\n        if (segmentId >= 0) {\n          let flatIndex = b * uniforms.numSegments + segmentId % uniforms.numSegments;\n          let value = getX(b, inCol);\n\n          ").concat(atomicAddSnippet('&result[flatIndex]', 'value', this.type), "\n        }\n      }\n    }\n  ");
            return userCode;
        };
        return UnsortedSegmentSumProgram;
    }());

    /**
     * @license
     * Copyright 2023 Google LLC.
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * =============================================================================
     */
    function unsortedSegmentSum(args) {
        var inputs = args.inputs, backend = args.backend, attrs = args.attrs;
        var x = inputs.x, segmentIds = inputs.segmentIds;
        var numSegments = attrs.numSegments;
        var xRank = x.shape.length;
        var toDispose = [];
        var axis = 0;
        var permutation = tf.backend_util.getAxesPermutation([axis], xRank);
        var permutedX = x;
        if (permutation != null) {
            permutedX = transpose({ inputs: { x: x }, backend: backend, attrs: { perm: permutation } });
            toDispose.push(permutedX);
            axis = tf.backend_util.getInnerMostAxes(1, xRank)[0];
        }
        var outShape = tf.backend_util.segment_util.computeOutShape(permutedX.shape, axis, numSegments);
        var inSize = tf.util.sizeFromShape([permutedX.shape[axis]]);
        var a2D = reshape({ inputs: { x: permutedX }, backend: backend, attrs: { shape: [-1, inSize] } });
        toDispose.push(a2D);
        var dtype = x.dtype;
        var shape = [a2D.shape[0], numSegments];
        var output = fill({ backend: backend, attrs: { shape: shape, value: 0, dtype: dtype } });
        var program = new UnsortedSegmentSumProgram(a2D.shape, shape, dtype);
        var uniformData = [
            { type: 'int32', data: [numSegments] },
            { type: 'int32', data: [tf.util.sizeFromShape(a2D.shape)] }
        ];
        var segResult = backend.runWebGPUProgram(program, [a2D, segmentIds], dtype, uniformData, output);
        var reshaped = reshape({ inputs: { x: segResult }, backend: backend, attrs: { shape: outShape } });
        toDispose.push(segResult);
        var result = reshaped;
        if (permutation != null) {
            toDispose.push(reshaped);
            var perm = tf.backend_util.getUndoAxesPermutation(permutation);
            result = transpose({ inputs: { x: result }, backend: backend, attrs: { perm: perm } });
        }
        toDispose.forEach(function (t) { return backend.disposeData(t.dataId); });
        return result;
    }
    var unsortedSegmentSumConfig = {
        kernelName: tf.UnsortedSegmentSum,
        backendName: 'webgpu',
        kernelFunc: unsortedSegmentSum
    };

    var e_1, _a;
    // List all kernel configs here
    var kernelConfigs = [
        _fusedMatMulConfig,
        absConfig,
        acosConfig,
        acoshConfig,
        addConfig,
        addNConfig,
        allConfig,
        anyConfig,
        argMaxConfig,
        argMinConfig,
        asinConfig,
        asinhConfig,
        atanConfig,
        atan2Config,
        atanhConfig,
        avgPoolConfig,
        avgPool3DConfig,
        avgPool3DGradConfig,
        avgPoolGradConfig,
        batchMatMulConfig,
        batchToSpaceNDConfig,
        bincountConfig,
        broadcastArgsConfig,
        castConfig,
        ceilConfig,
        clipByValueConfig,
        complexConfig,
        complexAbsConfig,
        concatConfig,
        conv2DConfig,
        conv2DBackpropFilterConfig,
        conv2DBackpropInputConfig,
        conv3DConfig,
        conv3DBackpropFilterV2Config,
        conv3DBackpropInputV2Config,
        cosConfig,
        coshConfig,
        cropAndResizeConfig,
        cumprodConfig,
        cumsumConfig,
        denseBincountConfig,
        depthToSpaceConfig,
        depthwiseConv2dNativeBackpropFilterConfig,
        depthwiseConv2dNativeBackpropInputConfig,
        depthwiseConv2dNativeConfig,
        diagConfig,
        dilation2DConfig,
        dilation2DBackpropFilterConfig,
        dilation2DBackpropInputConfig,
        drawConfig,
        einsumConfig,
        eluConfig,
        eluGradConfig,
        equalConfig,
        erfConfig,
        expConfig,
        expandDimsConfig,
        expm1Config,
        fftConfig,
        fillConfig,
        flipLeftRightConfig,
        fromPixelsConfig,
        floorConfig,
        floorDivConfig,
        fusedBatchNormConfig,
        fusedConv2DConfig,
        fusedDepthwiseConv2DConfig,
        gatherNdConfig,
        gatherV2Config,
        greaterConfig,
        greaterEqualConfig,
        identityConfig,
        ifftConfig,
        imagConfig,
        isFiniteConfig,
        isInfConfig,
        isNaNConfig,
        leakyReluConfig,
        lessConfig,
        lessEqualConfig,
        linSpaceConfig,
        log1pConfig,
        logConfig,
        logicalAndConfig,
        logicalNotConfig,
        logicalOrConfig,
        lrnConfig,
        lrnGradConfig,
        maxConfig,
        maximumConfig,
        maxPoolConfig,
        maxPoolGradConfig,
        maxPool3DConfig,
        maxPool3DGradConfig,
        maxPoolWithArgmaxConfig,
        meanConfig,
        minConfig,
        minimumConfig,
        mirrorPadConfig,
        modConfig,
        multinomialConfig,
        multiplyConfig,
        negConfig,
        nonMaxSuppressionV3Config,
        nonMaxSuppressionV5Config,
        notEqualConfig,
        oneHotConfig,
        onesLikeConfig,
        packConfig,
        padV2Config,
        powConfig,
        preluConfig,
        prodConfig,
        rangeConfig,
        realConfig,
        realDivConfig,
        reciprocalConfig,
        reluConfig,
        relu6Config,
        reshapeConfig,
        resizeBilinearConfig,
        resizeBilinearGradConfig,
        resizeNearestNeighborConfig,
        resizeNearestNeighborGradConfig,
        reverseConfig,
        rotateWithOffsetConfig,
        roundConfig,
        rsqrtConfig,
        scatterNdConfig,
        searchSortedConfig,
        selectConfig,
        seluConfig,
        sigmoidConfig,
        signConfig,
        sinConfig,
        sinhConfig,
        sliceConfig,
        stepConfig,
        stridedSliceConfig,
        stringNGramsConfig,
        softmaxConfig,
        softplusConfig,
        spaceToBatchNDConfig,
        sparseSegmentMeanConfig,
        sparseSegmentSumConfig,
        sparseToDenseConfig,
        splitVConfig,
        sqrtConfig,
        squareConfig,
        squaredDifferenceConfig,
        subConfig,
        sumConfig,
        tanConfig,
        tanhConfig,
        tensorScatterUpdateConfig,
        tileConfig,
        topKConfig,
        transformConfig,
        transposeConfig,
        unpackConfig,
        unsortedSegmentSumConfig,
        zerosLikeConfig
    ];
    try {
        for (var kernelConfigs_1 = __values(kernelConfigs), kernelConfigs_1_1 = kernelConfigs_1.next(); !kernelConfigs_1_1.done; kernelConfigs_1_1 = kernelConfigs_1.next()) {
            var kernelConfig = kernelConfigs_1_1.value;
            tf.registerKernel(kernelConfig);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (kernelConfigs_1_1 && !kernelConfigs_1_1.done && (_a = kernelConfigs_1.return)) _a.call(kernelConfigs_1);
        }
        finally { if (e_1) throw e_1.error; }
    }

    exports.WebGPUBackend = WebGPUBackend;
    exports.webgpu_util = webgpu_util;

}));
//# sourceMappingURL=tf-backend-webgpu.js.map

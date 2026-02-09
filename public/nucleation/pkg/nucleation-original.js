let wasm;

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertChar(c) {
    if (typeof(c) === 'number' && (c >= 0x110000 || (c >= 0xD800 && c < 0xE000))) throw new Error(`expected a valid Unicode scalar value, found ${c}`);
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

let WASM_VECTOR_LEN = 0;

const BlockPositionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_blockposition_free(ptr >>> 0, 1));

const BlockStateWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_blockstatewrapper_free(ptr >>> 0, 1));

const BrushWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_brushwrapper_free(ptr >>> 0, 1));

const CircuitBuilderWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_circuitbuilderwrapper_free(ptr >>> 0, 1));

const DefinitionRegionWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_definitionregionwrapper_free(ptr >>> 0, 1));

const ExecutionModeWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_executionmodewrapper_free(ptr >>> 0, 1));

const IoLayoutBuilderWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_iolayoutbuilderwrapper_free(ptr >>> 0, 1));

const IoLayoutWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_iolayoutwrapper_free(ptr >>> 0, 1));

const IoTypeWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_iotypewrapper_free(ptr >>> 0, 1));

const LayoutFunctionWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_layoutfunctionwrapper_free(ptr >>> 0, 1));

const LazyChunkIteratorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_lazychunkiterator_free(ptr >>> 0, 1));

const MchprsWorldWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_mchprsworldwrapper_free(ptr >>> 0, 1));

const OutputConditionWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_outputconditionwrapper_free(ptr >>> 0, 1));

const PaletteManagerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_palettemanager_free(ptr >>> 0, 1));

const SchematicBuilderWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_schematicbuilderwrapper_free(ptr >>> 0, 1));

const SchematicWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_schematicwrapper_free(ptr >>> 0, 1));

const ShapeWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_shapewrapper_free(ptr >>> 0, 1));

const SimulationOptionsWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_simulationoptionswrapper_free(ptr >>> 0, 1));

const SortStrategyWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sortstrategywrapper_free(ptr >>> 0, 1));

const StateModeConstantsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_statemodeconstants_free(ptr >>> 0, 1));

const TypedCircuitExecutorWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_typedcircuitexecutorwrapper_free(ptr >>> 0, 1));

const ValueWrapperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_valuewrapper_free(ptr >>> 0, 1));

const WasmBuildingToolFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmbuildingtool_free(ptr >>> 0, 1));

export class BlockPosition {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BlockPositionFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_blockposition_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_blockposition_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_blockposition_x(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_blockposition_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_blockposition_y(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_blockposition_z(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_blockposition_z(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    constructor(x, y, z) {
        const ret = wasm.blockposition_new(x, y, z);
        this.__wbg_ptr = ret >>> 0;
        BlockPositionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) BlockPosition.prototype[Symbol.dispose] = BlockPosition.prototype.free;

export class BlockStateWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BlockStateWrapper.prototype);
        obj.__wbg_ptr = ptr;
        BlockStateWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BlockStateWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_blockstatewrapper_free(ptr, 0);
    }
    /**
     * @param {string} name
     */
    constructor(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.blockstatewrapper_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        BlockStateWrapperFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} key
     * @param {string} value
     */
    with_property(key, value) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.blockstatewrapper_with_property(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    }
    /**
     * @returns {string}
     */
    name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.blockstatewrapper_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    properties() {
        const ret = wasm.blockstatewrapper_properties(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) BlockStateWrapper.prototype[Symbol.dispose] = BlockStateWrapper.prototype.free;

/**
 * A wrapper for any brush (Solid, Gradient, Shaded, etc.)
 */
export class BrushWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BrushWrapper.prototype);
        obj.__wbg_ptr = ptr;
        BrushWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BrushWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_brushwrapper_free(ptr, 0);
    }
    /**
     * Create a solid brush with a specific block
     * @param {string} block_state
     * @returns {BrushWrapper}
     */
    static solid(block_state) {
        const ptr0 = passStringToWasm0(block_state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.brushwrapper_solid(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BrushWrapper.__wrap(ret[0]);
    }
    /**
     * Create a color brush (matches closest block to RGB color)
     * Palette: optional list of block IDs to restrict matching to.
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {string[] | null} [palette_filter]
     * @returns {BrushWrapper}
     */
    static color(r, g, b, palette_filter) {
        var ptr0 = isLikeNone(palette_filter) ? 0 : passArrayJsValueToWasm0(palette_filter, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.brushwrapper_color(r, g, b, ptr0, len0);
        return BrushWrapper.__wrap(ret);
    }
    /**
     * Create a linear gradient brush
     * Space: 0 = RGB, 1 = Oklab
     * @param {number} x1
     * @param {number} y1
     * @param {number} z1
     * @param {number} r1
     * @param {number} g1
     * @param {number} b1
     * @param {number} x2
     * @param {number} y2
     * @param {number} z2
     * @param {number} r2
     * @param {number} g2
     * @param {number} b2
     * @param {number | null} [space]
     * @param {string[] | null} [palette_filter]
     * @returns {BrushWrapper}
     */
    static linear_gradient(x1, y1, z1, r1, g1, b1, x2, y2, z2, r2, g2, b2, space, palette_filter) {
        var ptr0 = isLikeNone(palette_filter) ? 0 : passArrayJsValueToWasm0(palette_filter, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.brushwrapper_linear_gradient(x1, y1, z1, r1, g1, b1, x2, y2, z2, r2, g2, b2, isLikeNone(space) ? 0xFFFFFF : space, ptr0, len0);
        return BrushWrapper.__wrap(ret);
    }
    /**
     * Create a shaded brush (Lambertian shading)
     * light_dir: [x, y, z] vector
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} lx
     * @param {number} ly
     * @param {number} lz
     * @param {string[] | null} [palette_filter]
     * @returns {BrushWrapper}
     */
    static shaded(r, g, b, lx, ly, lz, palette_filter) {
        var ptr0 = isLikeNone(palette_filter) ? 0 : passArrayJsValueToWasm0(palette_filter, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.brushwrapper_shaded(r, g, b, lx, ly, lz, ptr0, len0);
        return BrushWrapper.__wrap(ret);
    }
    /**
     * Create a bilinear gradient brush (4-corner quad)
     * @param {number} ox
     * @param {number} oy
     * @param {number} oz
     * @param {number} ux
     * @param {number} uy
     * @param {number} uz
     * @param {number} vx
     * @param {number} vy
     * @param {number} vz
     * @param {number} r00
     * @param {number} g00
     * @param {number} b00
     * @param {number} r10
     * @param {number} g10
     * @param {number} b10
     * @param {number} r01
     * @param {number} g01
     * @param {number} b01
     * @param {number} r11
     * @param {number} g11
     * @param {number} b11
     * @param {number | null} [space]
     * @param {string[] | null} [palette_filter]
     * @returns {BrushWrapper}
     */
    static bilinear_gradient(ox, oy, oz, ux, uy, uz, vx, vy, vz, r00, g00, b00, r10, g10, b10, r01, g01, b01, r11, g11, b11, space, palette_filter) {
        var ptr0 = isLikeNone(palette_filter) ? 0 : passArrayJsValueToWasm0(palette_filter, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.brushwrapper_bilinear_gradient(ox, oy, oz, ux, uy, uz, vx, vy, vz, r00, g00, b00, r10, g10, b10, r01, g01, b01, r11, g11, b11, isLikeNone(space) ? 0xFFFFFF : space, ptr0, len0);
        return BrushWrapper.__wrap(ret);
    }
    /**
     * Create a point cloud gradient brush using Inverse Distance Weighting (IDW)
     * positions: Flat array [x1, y1, z1, x2, y2, z2, ...]
     * colors: Flat array [r1, g1, b1, r2, g2, b2, ...]
     * falloff: Power parameter (default 2.0 if None)
     * @param {Int32Array} positions
     * @param {Uint8Array} colors
     * @param {number | null} [falloff]
     * @param {number | null} [space]
     * @param {string[] | null} [palette_filter]
     * @returns {BrushWrapper}
     */
    static point_gradient(positions, colors, falloff, space, palette_filter) {
        const ptr0 = passArray32ToWasm0(positions, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(colors, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(palette_filter) ? 0 : passArrayJsValueToWasm0(palette_filter, wasm.__wbindgen_malloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.brushwrapper_point_gradient(ptr0, len0, ptr1, len1, !isLikeNone(falloff), isLikeNone(falloff) ? 0 : falloff, isLikeNone(space) ? 0xFFFFFF : space, ptr2, len2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BrushWrapper.__wrap(ret[0]);
    }
}
if (Symbol.dispose) BrushWrapper.prototype[Symbol.dispose] = BrushWrapper.prototype.free;

/**
 * CircuitBuilder wrapper for JavaScript
 * Provides a fluent API for creating TypedCircuitExecutor instances
 */
export class CircuitBuilderWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CircuitBuilderWrapper.prototype);
        obj.__wbg_ptr = ptr;
        CircuitBuilderWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CircuitBuilderWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_circuitbuilderwrapper_free(ptr, 0);
    }
    /**
     * Create a new CircuitBuilder from a schematic
     * @param {SchematicWrapper} schematic
     */
    constructor(schematic) {
        _assertClass(schematic, SchematicWrapper);
        const ret = wasm.circuitbuilderwrapper_new(schematic.__wbg_ptr);
        this.__wbg_ptr = ret >>> 0;
        CircuitBuilderWrapperFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create a CircuitBuilder pre-populated from Insign annotations
     * @param {SchematicWrapper} schematic
     * @returns {CircuitBuilderWrapper}
     */
    static fromInsign(schematic) {
        _assertClass(schematic, SchematicWrapper);
        const ret = wasm.circuitbuilderwrapper_fromInsign(schematic.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an input with full control
     *
     * Uses the default sort strategy (YXZ - Y first, then X, then Z).
     * For custom ordering, use `withInputSorted`.
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {DefinitionRegionWrapper} region
     * @returns {CircuitBuilderWrapper}
     */
    withInput(name, io_type, layout, region) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        const ret = wasm.circuitbuilderwrapper_withInput(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, region.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an input with full control and custom sort strategy
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {DefinitionRegionWrapper} region
     * @param {SortStrategyWrapper} sort
     * @returns {CircuitBuilderWrapper}
     */
    withInputSorted(name, io_type, layout, region, sort) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        _assertClass(sort, SortStrategyWrapper);
        const ret = wasm.circuitbuilderwrapper_withInputSorted(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, region.__wbg_ptr, sort.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an input with automatic layout inference
     *
     * Uses the default sort strategy (YXZ - Y first, then X, then Z).
     * For custom ordering, use `withInputAutoSorted`.
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {DefinitionRegionWrapper} region
     * @returns {CircuitBuilderWrapper}
     */
    withInputAuto(name, io_type, region) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        const ret = wasm.circuitbuilderwrapper_withInputAuto(ptr, ptr0, len0, io_type.__wbg_ptr, region.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an input with automatic layout inference and custom sort strategy
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {DefinitionRegionWrapper} region
     * @param {SortStrategyWrapper} sort
     * @returns {CircuitBuilderWrapper}
     */
    withInputAutoSorted(name, io_type, region, sort) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        _assertClass(sort, SortStrategyWrapper);
        const ret = wasm.circuitbuilderwrapper_withInputAutoSorted(ptr, ptr0, len0, io_type.__wbg_ptr, region.__wbg_ptr, sort.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output with full control
     *
     * Uses the default sort strategy (YXZ - Y first, then X, then Z).
     * For custom ordering, use `withOutputSorted`.
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {DefinitionRegionWrapper} region
     * @returns {CircuitBuilderWrapper}
     */
    withOutput(name, io_type, layout, region) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        const ret = wasm.circuitbuilderwrapper_withOutput(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, region.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output with full control and custom sort strategy
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {DefinitionRegionWrapper} region
     * @param {SortStrategyWrapper} sort
     * @returns {CircuitBuilderWrapper}
     */
    withOutputSorted(name, io_type, layout, region, sort) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        _assertClass(sort, SortStrategyWrapper);
        const ret = wasm.circuitbuilderwrapper_withOutputSorted(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, region.__wbg_ptr, sort.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output with automatic layout inference
     *
     * Uses the default sort strategy (YXZ - Y first, then X, then Z).
     * For custom ordering, use `withOutputAutoSorted`.
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {DefinitionRegionWrapper} region
     * @returns {CircuitBuilderWrapper}
     */
    withOutputAuto(name, io_type, region) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        const ret = wasm.circuitbuilderwrapper_withOutputAuto(ptr, ptr0, len0, io_type.__wbg_ptr, region.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output with automatic layout inference and custom sort strategy
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {DefinitionRegionWrapper} region
     * @param {SortStrategyWrapper} sort
     * @returns {CircuitBuilderWrapper}
     */
    withOutputAutoSorted(name, io_type, region, sort) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        _assertClass(sort, SortStrategyWrapper);
        const ret = wasm.circuitbuilderwrapper_withOutputAutoSorted(ptr, ptr0, len0, io_type.__wbg_ptr, region.__wbg_ptr, sort.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Set simulation options
     * @param {SimulationOptionsWrapper} options
     * @returns {CircuitBuilderWrapper}
     */
    withOptions(options) {
        const ptr = this.__destroy_into_raw();
        _assertClass(options, SimulationOptionsWrapper);
        const ret = wasm.circuitbuilderwrapper_withOptions(ptr, options.__wbg_ptr);
        return CircuitBuilderWrapper.__wrap(ret);
    }
    /**
     * Set state mode: 'stateless', 'stateful', or 'manual'
     * @param {string} mode
     * @returns {CircuitBuilderWrapper}
     */
    withStateMode(mode) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.circuitbuilderwrapper_withStateMode(ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CircuitBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Validate the circuit configuration
     */
    validate() {
        const ret = wasm.circuitbuilderwrapper_validate(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Build the TypedCircuitExecutor
     * @returns {TypedCircuitExecutorWrapper}
     */
    build() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.circuitbuilderwrapper_build(ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TypedCircuitExecutorWrapper.__wrap(ret[0]);
    }
    /**
     * Build with validation (convenience method)
     * @returns {TypedCircuitExecutorWrapper}
     */
    buildValidated() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.circuitbuilderwrapper_buildValidated(ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TypedCircuitExecutorWrapper.__wrap(ret[0]);
    }
    /**
     * Get the current number of inputs
     * @returns {number}
     */
    inputCount() {
        const ret = wasm.circuitbuilderwrapper_inputCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the current number of outputs
     * @returns {number}
     */
    outputCount() {
        const ret = wasm.circuitbuilderwrapper_outputCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the names of defined inputs
     * @returns {string[]}
     */
    inputNames() {
        const ret = wasm.circuitbuilderwrapper_inputNames(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get the names of defined outputs
     * @returns {string[]}
     */
    outputNames() {
        const ret = wasm.circuitbuilderwrapper_outputNames(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}
if (Symbol.dispose) CircuitBuilderWrapper.prototype[Symbol.dispose] = CircuitBuilderWrapper.prototype.free;

export class DefinitionRegionWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DefinitionRegionWrapper.prototype);
        obj.__wbg_ptr = ptr;
        DefinitionRegionWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DefinitionRegionWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_definitionregionwrapper_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.definitionregionwrapper_new();
        this.__wbg_ptr = ret >>> 0;
        DefinitionRegionWrapperFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {any} min
     * @param {any} max
     * @returns {DefinitionRegionWrapper}
     */
    addBounds(min, max) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.definitionregionwrapper_addBounds(ptr, min, max);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DefinitionRegionWrapper.__wrap(ret[0]);
    }
    /**
     * @param {BlockPosition} min
     * @param {BlockPosition} max
     * @returns {DefinitionRegionWrapper}
     */
    static fromBounds(min, max) {
        _assertClass(min, BlockPosition);
        var ptr0 = min.__destroy_into_raw();
        _assertClass(max, BlockPosition);
        var ptr1 = max.__destroy_into_raw();
        const ret = wasm.definitionregionwrapper_fromBounds(ptr0, ptr1);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * @param {string} key
     * @param {string} value
     * @returns {DefinitionRegionWrapper}
     */
    setMetadata(key, value) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.definitionregionwrapper_setMetadata(ptr, ptr0, len0, ptr1, len1);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * @param {number} color
     * @returns {DefinitionRegionWrapper}
     */
    setColor(color) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.definitionregionwrapper_setColor(ptr, color);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * @param {string} filter
     * @returns {DefinitionRegionWrapper}
     */
    addFilter(filter) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(filter, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.definitionregionwrapper_addFilter(ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DefinitionRegionWrapper.__wrap(ret[0]);
    }
    /**
     * @param {string} block_name
     * @returns {DefinitionRegionWrapper}
     */
    excludeBlock(block_name) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(block_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.definitionregionwrapper_excludeBlock(ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DefinitionRegionWrapper.__wrap(ret[0]);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {DefinitionRegionWrapper}
     */
    addPoint(x, y, z) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.definitionregionwrapper_addPoint(ptr, x, y, z);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * @param {DefinitionRegionWrapper} other
     * @returns {DefinitionRegionWrapper}
     */
    merge(other) {
        const ptr = this.__destroy_into_raw();
        _assertClass(other, DefinitionRegionWrapper);
        const ret = wasm.definitionregionwrapper_merge(ptr, other.__wbg_ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * @param {SchematicWrapper} schematic
     * @param {string} block_name
     * @returns {DefinitionRegionWrapper}
     */
    filterByBlock(schematic, block_name) {
        _assertClass(schematic, SchematicWrapper);
        const ptr0 = passStringToWasm0(block_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.definitionregionwrapper_filterByBlock(this.__wbg_ptr, schematic.__wbg_ptr, ptr0, len0);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Subtract another region from this one (removes points present in `other`)
     * @param {DefinitionRegionWrapper} other
     * @returns {DefinitionRegionWrapper}
     */
    subtract(other) {
        const ptr = this.__destroy_into_raw();
        _assertClass(other, DefinitionRegionWrapper);
        const ret = wasm.definitionregionwrapper_subtract(ptr, other.__wbg_ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Keep only points present in both regions (intersection)
     * @param {DefinitionRegionWrapper} other
     * @returns {DefinitionRegionWrapper}
     */
    intersect(other) {
        const ptr = this.__destroy_into_raw();
        _assertClass(other, DefinitionRegionWrapper);
        const ret = wasm.definitionregionwrapper_intersect(ptr, other.__wbg_ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Create a new region that is the union of this region and another
     * @param {DefinitionRegionWrapper} other
     * @returns {DefinitionRegionWrapper}
     */
    union(other) {
        _assertClass(other, DefinitionRegionWrapper);
        const ret = wasm.definitionregionwrapper_union(this.__wbg_ptr, other.__wbg_ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Translate all boxes by the given offset
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {DefinitionRegionWrapper}
     */
    shift(x, y, z) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.definitionregionwrapper_shift(ptr, x, y, z);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Expand all boxes by the given amounts in each direction
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {DefinitionRegionWrapper}
     */
    expand(x, y, z) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.definitionregionwrapper_expand(ptr, x, y, z);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Contract all boxes by the given amount uniformly
     * @param {number} amount
     * @returns {DefinitionRegionWrapper}
     */
    contract(amount) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.definitionregionwrapper_contract(ptr, amount);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Get the overall bounding box encompassing all boxes in this region
     * Returns an object with {min: [x,y,z], max: [x,y,z]} or null if empty
     * @returns {any}
     */
    getBounds() {
        const ret = wasm.definitionregionwrapper_getBounds(this.__wbg_ptr);
        return ret;
    }
    /**
     * Check if all points in the region are connected (6-connectivity)
     * @returns {boolean}
     */
    isContiguous() {
        const ret = wasm.definitionregionwrapper_isContiguous(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get the number of connected components in this region
     * @returns {number}
     */
    connectedComponents() {
        const ret = wasm.definitionregionwrapper_connectedComponents(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Filter positions by block state properties (JS object)
     * Only keeps positions where the block has ALL specified properties matching
     * @param {SchematicWrapper} schematic
     * @param {any} properties
     * @returns {DefinitionRegionWrapper}
     */
    filterByProperties(schematic, properties) {
        _assertClass(schematic, SchematicWrapper);
        const ret = wasm.definitionregionwrapper_filterByProperties(this.__wbg_ptr, schematic.__wbg_ptr, properties);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DefinitionRegionWrapper.__wrap(ret[0]);
    }
    /**
     * Check if the region is empty
     * @returns {boolean}
     */
    isEmpty() {
        const ret = wasm.definitionregionwrapper_isEmpty(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if the region contains a specific point
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    contains(x, y, z) {
        const ret = wasm.definitionregionwrapper_contains(this.__wbg_ptr, x, y, z);
        return ret !== 0;
    }
    /**
     * Get total volume (number of blocks) covered by all boxes
     * @returns {number}
     */
    volume() {
        const ret = wasm.definitionregionwrapper_volume(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get a list of all positions as an array of [x, y, z] arrays
     * @returns {Array<any>}
     */
    positions() {
        const ret = wasm.definitionregionwrapper_positions(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get positions in globally sorted order (Y, then X, then Z)
     *
     * This provides **deterministic bit ordering** for circuits regardless of
     * how the region was constructed. Use this for IO bit assignment.
     * @returns {Array<any>}
     */
    positionsSorted() {
        const ret = wasm.definitionregionwrapper_positionsSorted(this.__wbg_ptr);
        return ret;
    }
    /**
     * Create a new region with points from `other` removed (immutable)
     * @param {DefinitionRegionWrapper} other
     * @returns {DefinitionRegionWrapper}
     */
    subtracted(other) {
        _assertClass(other, DefinitionRegionWrapper);
        const ret = wasm.definitionregionwrapper_subtracted(this.__wbg_ptr, other.__wbg_ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Create a new region with only points in both (immutable)
     * @param {DefinitionRegionWrapper} other
     * @returns {DefinitionRegionWrapper}
     */
    intersected(other) {
        _assertClass(other, DefinitionRegionWrapper);
        const ret = wasm.definitionregionwrapper_intersected(this.__wbg_ptr, other.__wbg_ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Add all points from another region to this one (mutating union)
     * @param {DefinitionRegionWrapper} other
     * @returns {DefinitionRegionWrapper}
     */
    unionInto(other) {
        const ptr = this.__destroy_into_raw();
        _assertClass(other, DefinitionRegionWrapper);
        const ret = wasm.definitionregionwrapper_unionInto(ptr, other.__wbg_ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Simplify the region by merging adjacent/overlapping boxes
     * @returns {DefinitionRegionWrapper}
     */
    simplify() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.definitionregionwrapper_simplify(ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Create a DefinitionRegion from multiple bounding boxes
     *
     * Takes an array of {min: [x,y,z], max: [x,y,z]} objects.
     * Unlike fromPositions which merges adjacent points, this keeps boxes as provided.
     * @param {any} boxes
     * @returns {DefinitionRegionWrapper}
     */
    static fromBoundingBoxes(boxes) {
        const ret = wasm.definitionregionwrapper_fromBoundingBoxes(boxes);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DefinitionRegionWrapper.__wrap(ret[0]);
    }
    /**
     * Create a DefinitionRegion from an array of positions
     *
     * Takes an array of [x, y, z] arrays. Adjacent points will be merged into boxes.
     * @param {any} positions
     * @returns {DefinitionRegionWrapper}
     */
    static fromPositions(positions) {
        const ret = wasm.definitionregionwrapper_fromPositions(positions);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DefinitionRegionWrapper.__wrap(ret[0]);
    }
    /**
     * Get the number of bounding boxes in this region
     * @returns {number}
     */
    boxCount() {
        const ret = wasm.definitionregionwrapper_boxCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get a specific bounding box by index
     *
     * Returns {min: [x,y,z], max: [x,y,z]} or null if index is out of bounds
     * @param {number} index
     * @returns {any}
     */
    getBox(index) {
        const ret = wasm.definitionregionwrapper_getBox(this.__wbg_ptr, index);
        return ret;
    }
    /**
     * Get all bounding boxes in this region
     *
     * Returns an array of {min: [x,y,z], max: [x,y,z]} objects.
     * Useful for rendering each box separately.
     * @returns {Array<any>}
     */
    getBoxes() {
        const ret = wasm.definitionregionwrapper_getBoxes(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get a metadata value by key
     *
     * Returns the value string or null if not found
     * @param {string} key
     * @returns {any}
     */
    getMetadata(key) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.definitionregionwrapper_getMetadata(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Get all metadata as a JS object
     * @returns {any}
     */
    getAllMetadata() {
        const ret = wasm.definitionregionwrapper_getAllMetadata(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get all metadata keys
     * @returns {Array<any>}
     */
    metadataKeys() {
        const ret = wasm.definitionregionwrapper_metadataKeys(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get the dimensions (width, height, length) of the overall bounding box
     *
     * Returns [width, height, length] or [0, 0, 0] if empty
     * @returns {Array<any>}
     */
    dimensions() {
        const ret = wasm.definitionregionwrapper_dimensions(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get the center point of the region (integer coordinates)
     *
     * Returns [x, y, z] or null if empty
     * @returns {any}
     */
    center() {
        const ret = wasm.definitionregionwrapper_center(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get the center point of the region as f32 (for rendering)
     *
     * Returns [x, y, z] as floats or null if empty
     * @returns {any}
     */
    centerF32() {
        const ret = wasm.definitionregionwrapper_centerF32(this.__wbg_ptr);
        return ret;
    }
    /**
     * Check if this region intersects with a bounding box
     *
     * Useful for frustum culling in renderers.
     * @param {number} min_x
     * @param {number} min_y
     * @param {number} min_z
     * @param {number} max_x
     * @param {number} max_y
     * @param {number} max_z
     * @returns {boolean}
     */
    intersectsBounds(min_x, min_y, min_z, max_x, max_y, max_z) {
        const ret = wasm.definitionregionwrapper_intersectsBounds(this.__wbg_ptr, min_x, min_y, min_z, max_x, max_y, max_z);
        return ret !== 0;
    }
    /**
     * Create a new region shifted by the given offset (immutable)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {DefinitionRegionWrapper}
     */
    shifted(x, y, z) {
        const ret = wasm.definitionregionwrapper_shifted(this.__wbg_ptr, x, y, z);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Create a new region expanded by the given amounts (immutable)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {DefinitionRegionWrapper}
     */
    expanded(x, y, z) {
        const ret = wasm.definitionregionwrapper_expanded(this.__wbg_ptr, x, y, z);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Create a new region contracted by the given amount (immutable)
     * @param {number} amount
     * @returns {DefinitionRegionWrapper}
     */
    contracted(amount) {
        const ret = wasm.definitionregionwrapper_contracted(this.__wbg_ptr, amount);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Create a deep copy of this region
     * @returns {DefinitionRegionWrapper}
     */
    copy() {
        const ret = wasm.definitionregionwrapper_clone(this.__wbg_ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * Clone this region (alias for copy)
     * @returns {DefinitionRegionWrapper}
     */
    clone() {
        const ret = wasm.definitionregionwrapper_clone(this.__wbg_ptr);
        return DefinitionRegionWrapper.__wrap(ret);
    }
    /**
     * @returns {Array<any>}
     */
    getBlocks() {
        const ret = wasm.definitionregionwrapper_getBlocks(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}
if (Symbol.dispose) DefinitionRegionWrapper.prototype[Symbol.dispose] = DefinitionRegionWrapper.prototype.free;

/**
 * ExecutionMode for circuit execution
 */
export class ExecutionModeWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ExecutionModeWrapper.prototype);
        obj.__wbg_ptr = ptr;
        ExecutionModeWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ExecutionModeWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_executionmodewrapper_free(ptr, 0);
    }
    /**
     * Run for a fixed number of ticks
     * @param {number} ticks
     * @returns {ExecutionModeWrapper}
     */
    static fixedTicks(ticks) {
        const ret = wasm.executionmodewrapper_fixedTicks(ticks);
        return ExecutionModeWrapper.__wrap(ret);
    }
    /**
     * Run until an output meets a condition
     * @param {string} output_name
     * @param {OutputConditionWrapper} condition
     * @param {number} max_ticks
     * @param {number} check_interval
     * @returns {ExecutionModeWrapper}
     */
    static untilCondition(output_name, condition, max_ticks, check_interval) {
        const ptr0 = passStringToWasm0(output_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(condition, OutputConditionWrapper);
        const ret = wasm.executionmodewrapper_untilCondition(ptr0, len0, condition.__wbg_ptr, max_ticks, check_interval);
        return ExecutionModeWrapper.__wrap(ret);
    }
    /**
     * Run until any output changes
     * @param {number} max_ticks
     * @param {number} check_interval
     * @returns {ExecutionModeWrapper}
     */
    static untilChange(max_ticks, check_interval) {
        const ret = wasm.executionmodewrapper_untilChange(max_ticks, check_interval);
        return ExecutionModeWrapper.__wrap(ret);
    }
    /**
     * Run until outputs are stable
     * @param {number} stable_ticks
     * @param {number} max_ticks
     * @returns {ExecutionModeWrapper}
     */
    static untilStable(stable_ticks, max_ticks) {
        const ret = wasm.executionmodewrapper_untilStable(stable_ticks, max_ticks);
        return ExecutionModeWrapper.__wrap(ret);
    }
}
if (Symbol.dispose) ExecutionModeWrapper.prototype[Symbol.dispose] = ExecutionModeWrapper.prototype.free;

/**
 * IoLayoutBuilder for JavaScript
 */
export class IoLayoutBuilderWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(IoLayoutBuilderWrapper.prototype);
        obj.__wbg_ptr = ptr;
        IoLayoutBuilderWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IoLayoutBuilderWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_iolayoutbuilderwrapper_free(ptr, 0);
    }
    /**
     * Create a new IO layout builder
     */
    constructor() {
        const ret = wasm.iolayoutbuilderwrapper_new();
        this.__wbg_ptr = ret >>> 0;
        IoLayoutBuilderWrapperFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Add an input
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {any[]} positions
     * @returns {IoLayoutBuilderWrapper}
     */
    addInput(name, io_type, layout, positions) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        const ptr1 = passArrayJsValueToWasm0(positions, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.iolayoutbuilderwrapper_addInput(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {any[]} positions
     * @returns {IoLayoutBuilderWrapper}
     */
    addOutput(name, io_type, layout, positions) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        const ptr1 = passArrayJsValueToWasm0(positions, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.iolayoutbuilderwrapper_addOutput(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an input with automatic layout inference
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {any[]} positions
     * @returns {IoLayoutBuilderWrapper}
     */
    addInputAuto(name, io_type, positions) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        const ptr1 = passArrayJsValueToWasm0(positions, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.iolayoutbuilderwrapper_addInputAuto(ptr, ptr0, len0, io_type.__wbg_ptr, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an input defined by a region (bounding box)
     * Iterates Y (layers), then X (rows), then Z (columns)
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {BlockPosition} min
     * @param {BlockPosition} max
     * @returns {IoLayoutBuilderWrapper}
     */
    addInputRegion(name, io_type, layout, min, max) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        _assertClass(min, BlockPosition);
        var ptr1 = min.__destroy_into_raw();
        _assertClass(max, BlockPosition);
        var ptr2 = max.__destroy_into_raw();
        const ret = wasm.iolayoutbuilderwrapper_addInputRegion(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, ptr1, ptr2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an input defined by a DefinitionRegion
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {DefinitionRegionWrapper} region
     * @returns {IoLayoutBuilderWrapper}
     */
    addInputFromRegion(name, io_type, layout, region) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        const ret = wasm.iolayoutbuilderwrapper_addInputFromRegion(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, region.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an input defined by a region with automatic layout inference
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {BlockPosition} min
     * @param {BlockPosition} max
     * @returns {IoLayoutBuilderWrapper}
     */
    addInputRegionAuto(name, io_type, min, max) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(min, BlockPosition);
        var ptr1 = min.__destroy_into_raw();
        _assertClass(max, BlockPosition);
        var ptr2 = max.__destroy_into_raw();
        const ret = wasm.iolayoutbuilderwrapper_addInputRegionAuto(ptr, ptr0, len0, io_type.__wbg_ptr, ptr1, ptr2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an input defined by a DefinitionRegion with automatic layout inference
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {DefinitionRegionWrapper} region
     * @returns {IoLayoutBuilderWrapper}
     */
    addInputFromRegionAuto(name, io_type, region) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        const ret = wasm.iolayoutbuilderwrapper_addInputFromRegionAuto(ptr, ptr0, len0, io_type.__wbg_ptr, region.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output with automatic layout inference
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {any[]} positions
     * @returns {IoLayoutBuilderWrapper}
     */
    addOutputAuto(name, io_type, positions) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        const ptr1 = passArrayJsValueToWasm0(positions, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.iolayoutbuilderwrapper_addOutputAuto(ptr, ptr0, len0, io_type.__wbg_ptr, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output defined by a region (bounding box)
     * Iterates Y (layers), then X (rows), then Z (columns)
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {BlockPosition} min
     * @param {BlockPosition} max
     * @returns {IoLayoutBuilderWrapper}
     */
    addOutputRegion(name, io_type, layout, min, max) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        _assertClass(min, BlockPosition);
        var ptr1 = min.__destroy_into_raw();
        _assertClass(max, BlockPosition);
        var ptr2 = max.__destroy_into_raw();
        const ret = wasm.iolayoutbuilderwrapper_addOutputRegion(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, ptr1, ptr2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output defined by a DefinitionRegion
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {LayoutFunctionWrapper} layout
     * @param {DefinitionRegionWrapper} region
     * @returns {IoLayoutBuilderWrapper}
     */
    addOutputFromRegion(name, io_type, layout, region) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(layout, LayoutFunctionWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        const ret = wasm.iolayoutbuilderwrapper_addOutputFromRegion(ptr, ptr0, len0, io_type.__wbg_ptr, layout.__wbg_ptr, region.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output defined by a region with automatic layout inference
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {BlockPosition} min
     * @param {BlockPosition} max
     * @returns {IoLayoutBuilderWrapper}
     */
    addOutputRegionAuto(name, io_type, min, max) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(min, BlockPosition);
        var ptr1 = min.__destroy_into_raw();
        _assertClass(max, BlockPosition);
        var ptr2 = max.__destroy_into_raw();
        const ret = wasm.iolayoutbuilderwrapper_addOutputRegionAuto(ptr, ptr0, len0, io_type.__wbg_ptr, ptr1, ptr2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Add an output defined by a DefinitionRegion with automatic layout inference
     * @param {string} name
     * @param {IoTypeWrapper} io_type
     * @param {DefinitionRegionWrapper} region
     * @returns {IoLayoutBuilderWrapper}
     */
    addOutputFromRegionAuto(name, io_type, region) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(io_type, IoTypeWrapper);
        _assertClass(region, DefinitionRegionWrapper);
        const ret = wasm.iolayoutbuilderwrapper_addOutputFromRegionAuto(ptr, ptr0, len0, io_type.__wbg_ptr, region.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return IoLayoutBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Build the IO layout
     * @returns {IoLayoutWrapper}
     */
    build() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.iolayoutbuilderwrapper_build(ptr);
        return IoLayoutWrapper.__wrap(ret);
    }
}
if (Symbol.dispose) IoLayoutBuilderWrapper.prototype[Symbol.dispose] = IoLayoutBuilderWrapper.prototype.free;

/**
 * IoLayout wrapper for JavaScript
 */
export class IoLayoutWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(IoLayoutWrapper.prototype);
        obj.__wbg_ptr = ptr;
        IoLayoutWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IoLayoutWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_iolayoutwrapper_free(ptr, 0);
    }
    /**
     * Get input names
     * @returns {string[]}
     */
    inputNames() {
        const ret = wasm.iolayoutwrapper_inputNames(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get output names
     * @returns {string[]}
     */
    outputNames() {
        const ret = wasm.iolayoutwrapper_outputNames(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}
if (Symbol.dispose) IoLayoutWrapper.prototype[Symbol.dispose] = IoLayoutWrapper.prototype.free;

/**
 * IoType builder for JavaScript
 */
export class IoTypeWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(IoTypeWrapper.prototype);
        obj.__wbg_ptr = ptr;
        IoTypeWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IoTypeWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_iotypewrapper_free(ptr, 0);
    }
    /**
     * Create an unsigned integer type
     * @param {number} bits
     * @returns {IoTypeWrapper}
     */
    static unsignedInt(bits) {
        const ret = wasm.iotypewrapper_unsignedInt(bits);
        return IoTypeWrapper.__wrap(ret);
    }
    /**
     * Create a signed integer type
     * @param {number} bits
     * @returns {IoTypeWrapper}
     */
    static signedInt(bits) {
        const ret = wasm.iotypewrapper_signedInt(bits);
        return IoTypeWrapper.__wrap(ret);
    }
    /**
     * Create a Float32 type
     * @returns {IoTypeWrapper}
     */
    static float32() {
        const ret = wasm.iotypewrapper_float32();
        return IoTypeWrapper.__wrap(ret);
    }
    /**
     * Create a Boolean type
     * @returns {IoTypeWrapper}
     */
    static boolean() {
        const ret = wasm.iotypewrapper_boolean();
        return IoTypeWrapper.__wrap(ret);
    }
    /**
     * Create an ASCII string type
     * @param {number} chars
     * @returns {IoTypeWrapper}
     */
    static ascii(chars) {
        const ret = wasm.iotypewrapper_ascii(chars);
        return IoTypeWrapper.__wrap(ret);
    }
}
if (Symbol.dispose) IoTypeWrapper.prototype[Symbol.dispose] = IoTypeWrapper.prototype.free;

/**
 * LayoutFunction builder for JavaScript
 */
export class LayoutFunctionWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(LayoutFunctionWrapper.prototype);
        obj.__wbg_ptr = ptr;
        LayoutFunctionWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LayoutFunctionWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_layoutfunctionwrapper_free(ptr, 0);
    }
    /**
     * One bit per position (0 or 15)
     * @returns {LayoutFunctionWrapper}
     */
    static oneToOne() {
        const ret = wasm.layoutfunctionwrapper_oneToOne();
        return LayoutFunctionWrapper.__wrap(ret);
    }
    /**
     * Four bits per position (0-15)
     * @returns {LayoutFunctionWrapper}
     */
    static packed4() {
        const ret = wasm.layoutfunctionwrapper_packed4();
        return LayoutFunctionWrapper.__wrap(ret);
    }
    /**
     * Custom bit-to-position mapping
     * @param {Uint32Array} mapping
     * @returns {LayoutFunctionWrapper}
     */
    static custom(mapping) {
        const ptr0 = passArray32ToWasm0(mapping, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.layoutfunctionwrapper_custom(ptr0, len0);
        return LayoutFunctionWrapper.__wrap(ret);
    }
    /**
     * Row-major 2D layout
     * @param {number} rows
     * @param {number} cols
     * @param {number} bits_per_element
     * @returns {LayoutFunctionWrapper}
     */
    static rowMajor(rows, cols, bits_per_element) {
        const ret = wasm.layoutfunctionwrapper_rowMajor(rows, cols, bits_per_element);
        return LayoutFunctionWrapper.__wrap(ret);
    }
    /**
     * Column-major 2D layout
     * @param {number} rows
     * @param {number} cols
     * @param {number} bits_per_element
     * @returns {LayoutFunctionWrapper}
     */
    static columnMajor(rows, cols, bits_per_element) {
        const ret = wasm.layoutfunctionwrapper_columnMajor(rows, cols, bits_per_element);
        return LayoutFunctionWrapper.__wrap(ret);
    }
    /**
     * Scanline layout for screens
     * @param {number} width
     * @param {number} height
     * @param {number} bits_per_pixel
     * @returns {LayoutFunctionWrapper}
     */
    static scanline(width, height, bits_per_pixel) {
        const ret = wasm.layoutfunctionwrapper_scanline(width, height, bits_per_pixel);
        return LayoutFunctionWrapper.__wrap(ret);
    }
}
if (Symbol.dispose) LayoutFunctionWrapper.prototype[Symbol.dispose] = LayoutFunctionWrapper.prototype.free;

export class LazyChunkIterator {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(LazyChunkIterator.prototype);
        obj.__wbg_ptr = ptr;
        LazyChunkIteratorFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LazyChunkIteratorFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_lazychunkiterator_free(ptr, 0);
    }
    /**
     * Get the next chunk on-demand (generates it fresh, doesn't store it)
     * @returns {any}
     */
    next() {
        const ret = wasm.lazychunkiterator_next(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    has_next() {
        const ret = wasm.lazychunkiterator_has_next(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    total_chunks() {
        const ret = wasm.lazychunkiterator_total_chunks(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    current_position() {
        const ret = wasm.lazychunkiterator_current_position(this.__wbg_ptr);
        return ret >>> 0;
    }
    reset() {
        wasm.lazychunkiterator_reset(this.__wbg_ptr);
    }
    /**
     * @param {number} index
     */
    skip_to(index) {
        wasm.lazychunkiterator_skip_to(this.__wbg_ptr, index);
    }
}
if (Symbol.dispose) LazyChunkIterator.prototype[Symbol.dispose] = LazyChunkIterator.prototype.free;

export class MchprsWorldWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(MchprsWorldWrapper.prototype);
        obj.__wbg_ptr = ptr;
        MchprsWorldWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MchprsWorldWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_mchprsworldwrapper_free(ptr, 0);
    }
    /**
     * @param {SchematicWrapper} schematic
     */
    constructor(schematic) {
        _assertClass(schematic, SchematicWrapper);
        const ret = wasm.mchprsworldwrapper_new(schematic.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        MchprsWorldWrapperFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Creates a simulation world with custom options
     * @param {SchematicWrapper} schematic
     * @param {SimulationOptionsWrapper} options
     * @returns {MchprsWorldWrapper}
     */
    static with_options(schematic, options) {
        _assertClass(schematic, SchematicWrapper);
        _assertClass(options, SimulationOptionsWrapper);
        const ret = wasm.mchprsworldwrapper_with_options(schematic.__wbg_ptr, options.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return MchprsWorldWrapper.__wrap(ret[0]);
    }
    /**
     * Simulates a right-click on a block (typically a lever)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    on_use_block(x, y, z) {
        wasm.mchprsworldwrapper_on_use_block(this.__wbg_ptr, x, y, z);
    }
    /**
     * Advances the simulation by the specified number of ticks
     * @param {number} number_of_ticks
     */
    tick(number_of_ticks) {
        wasm.mchprsworldwrapper_tick(this.__wbg_ptr, number_of_ticks);
    }
    /**
     * Flushes pending changes from the compiler to the world
     */
    flush() {
        wasm.mchprsworldwrapper_flush(this.__wbg_ptr);
    }
    /**
     * Checks if a redstone lamp is lit at the given position
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    is_lit(x, y, z) {
        const ret = wasm.mchprsworldwrapper_is_lit(this.__wbg_ptr, x, y, z);
        return ret !== 0;
    }
    /**
     * Gets the power state of a lever
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    get_lever_power(x, y, z) {
        const ret = wasm.mchprsworldwrapper_get_lever_power(this.__wbg_ptr, x, y, z);
        return ret !== 0;
    }
    /**
     * Gets the redstone power level at a position
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {number}
     */
    get_redstone_power(x, y, z) {
        const ret = wasm.mchprsworldwrapper_get_redstone_power(this.__wbg_ptr, x, y, z);
        return ret;
    }
    /**
     * Sets the signal strength at a specific block position (for custom IO nodes)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} strength
     */
    setSignalStrength(x, y, z, strength) {
        wasm.mchprsworldwrapper_setSignalStrength(this.__wbg_ptr, x, y, z, strength);
    }
    /**
     * Gets the signal strength at a specific block position (for custom IO nodes)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {number}
     */
    getSignalStrength(x, y, z) {
        const ret = wasm.mchprsworldwrapper_getSignalStrength(this.__wbg_ptr, x, y, z);
        return ret;
    }
    /**
     * Check for custom IO state changes and queue them
     * Call this after tick() or setSignalStrength() to detect changes
     */
    checkCustomIoChanges() {
        wasm.mchprsworldwrapper_checkCustomIoChanges(this.__wbg_ptr);
    }
    /**
     * Get and clear all custom IO changes since last poll
     * Returns an array of change objects with {x, y, z, oldPower, newPower}
     * @returns {any}
     */
    pollCustomIoChanges() {
        const ret = wasm.mchprsworldwrapper_pollCustomIoChanges(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get custom IO changes without clearing the queue
     * @returns {any}
     */
    peekCustomIoChanges() {
        const ret = wasm.mchprsworldwrapper_peekCustomIoChanges(this.__wbg_ptr);
        return ret;
    }
    /**
     * Clear all queued custom IO changes
     */
    clearCustomIoChanges() {
        wasm.mchprsworldwrapper_clearCustomIoChanges(this.__wbg_ptr);
    }
    /**
     * Generates a truth table for the circuit
     *
     * Returns an array of objects with keys like "Input 0", "Output 0", etc.
     * @returns {any}
     */
    get_truth_table() {
        const ret = wasm.mchprsworldwrapper_get_truth_table(this.__wbg_ptr);
        return ret;
    }
    /**
     * Syncs the current simulation state back to the underlying schematic
     *
     * Call this after running simulation to update block states (redstone power, lever states, etc.)
     */
    sync_to_schematic() {
        wasm.mchprsworldwrapper_sync_to_schematic(this.__wbg_ptr);
    }
    /**
     * Gets a copy of the underlying schematic
     *
     * Note: Call sync_to_schematic() first if you want the latest simulation state
     * @returns {SchematicWrapper}
     */
    get_schematic() {
        const ret = wasm.mchprsworldwrapper_get_schematic(this.__wbg_ptr);
        return SchematicWrapper.__wrap(ret);
    }
    /**
     * Consumes the simulation world and returns the schematic with simulation state
     *
     * This automatically syncs before returning
     * @returns {SchematicWrapper}
     */
    into_schematic() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.mchprsworldwrapper_into_schematic(ptr);
        return SchematicWrapper.__wrap(ret);
    }
}
if (Symbol.dispose) MchprsWorldWrapper.prototype[Symbol.dispose] = MchprsWorldWrapper.prototype.free;

/**
 * OutputCondition for conditional execution
 */
export class OutputConditionWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(OutputConditionWrapper.prototype);
        obj.__wbg_ptr = ptr;
        OutputConditionWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OutputConditionWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_outputconditionwrapper_free(ptr, 0);
    }
    /**
     * Output equals a value
     * @param {ValueWrapper} value
     * @returns {OutputConditionWrapper}
     */
    static equals(value) {
        _assertClass(value, ValueWrapper);
        const ret = wasm.outputconditionwrapper_equals(value.__wbg_ptr);
        return OutputConditionWrapper.__wrap(ret);
    }
    /**
     * Output not equals a value
     * @param {ValueWrapper} value
     * @returns {OutputConditionWrapper}
     */
    static notEquals(value) {
        _assertClass(value, ValueWrapper);
        const ret = wasm.outputconditionwrapper_notEquals(value.__wbg_ptr);
        return OutputConditionWrapper.__wrap(ret);
    }
    /**
     * Output greater than a value
     * @param {ValueWrapper} value
     * @returns {OutputConditionWrapper}
     */
    static greaterThan(value) {
        _assertClass(value, ValueWrapper);
        const ret = wasm.outputconditionwrapper_greaterThan(value.__wbg_ptr);
        return OutputConditionWrapper.__wrap(ret);
    }
    /**
     * Output less than a value
     * @param {ValueWrapper} value
     * @returns {OutputConditionWrapper}
     */
    static lessThan(value) {
        _assertClass(value, ValueWrapper);
        const ret = wasm.outputconditionwrapper_lessThan(value.__wbg_ptr);
        return OutputConditionWrapper.__wrap(ret);
    }
    /**
     * Bitwise AND with mask
     * @param {number} mask
     * @returns {OutputConditionWrapper}
     */
    static bitwiseAnd(mask) {
        const ret = wasm.outputconditionwrapper_bitwiseAnd(mask);
        return OutputConditionWrapper.__wrap(ret);
    }
}
if (Symbol.dispose) OutputConditionWrapper.prototype[Symbol.dispose] = OutputConditionWrapper.prototype.free;

export class PaletteManager {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PaletteManagerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_palettemanager_free(ptr, 0);
    }
    /**
     * Get all wool blocks
     * @returns {string[]}
     */
    static getWoolBlocks() {
        const ret = wasm.palettemanager_getWoolBlocks();
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get all concrete blocks
     * @returns {string[]}
     */
    static getConcreteBlocks() {
        const ret = wasm.palettemanager_getConcreteBlocks();
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get all terracotta blocks
     * @returns {string[]}
     */
    static getTerracottaBlocks() {
        const ret = wasm.palettemanager_getTerracottaBlocks();
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get a palette containing blocks matching ANY of the provided keywords
     * Example: `["wool", "obsidian"]` gets all wool blocks AND obsidian
     * @param {string[]} keywords
     * @returns {string[]}
     */
    static getPaletteByKeywords(keywords) {
        const ptr0 = passArrayJsValueToWasm0(keywords, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.palettemanager_getPaletteByKeywords(ptr0, len0);
        var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v2;
    }
}
if (Symbol.dispose) PaletteManager.prototype[Symbol.dispose] = PaletteManager.prototype.free;

/**
 * SchematicBuilder for creating schematics from ASCII art
 */
export class SchematicBuilderWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SchematicBuilderWrapper.prototype);
        obj.__wbg_ptr = ptr;
        SchematicBuilderWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SchematicBuilderWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_schematicbuilderwrapper_free(ptr, 0);
    }
    /**
     * Create a new schematic builder with standard palette
     */
    constructor() {
        const ret = wasm.schematicbuilderwrapper_new();
        this.__wbg_ptr = ret >>> 0;
        SchematicBuilderWrapperFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Set the name of the schematic
     * @param {string} name
     * @returns {SchematicBuilderWrapper}
     */
    name(name) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicbuilderwrapper_name(ptr, ptr0, len0);
        return SchematicBuilderWrapper.__wrap(ret);
    }
    /**
     * Map a character to a block string
     * @param {string} ch
     * @param {string} block
     * @returns {SchematicBuilderWrapper}
     */
    map(ch, block) {
        const ptr = this.__destroy_into_raw();
        const char0 = ch.codePointAt(0);
        _assertChar(char0);
        const ptr1 = passStringToWasm0(block, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.schematicbuilderwrapper_map(ptr, char0, ptr1, len1);
        return SchematicBuilderWrapper.__wrap(ret);
    }
    /**
     * Add multiple layers (array of arrays of strings)
     * @param {any} layers
     * @returns {SchematicBuilderWrapper}
     */
    layers(layers) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.schematicbuilderwrapper_layers(ptr, layers);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return SchematicBuilderWrapper.__wrap(ret[0]);
    }
    /**
     * Build the schematic
     * @returns {SchematicWrapper}
     */
    build() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.schematicbuilderwrapper_build(ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return SchematicWrapper.__wrap(ret[0]);
    }
    /**
     * Create from template string
     * @param {string} template
     * @returns {SchematicBuilderWrapper}
     */
    static fromTemplate(template) {
        const ptr0 = passStringToWasm0(template, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicbuilderwrapper_fromTemplate(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return SchematicBuilderWrapper.__wrap(ret[0]);
    }
}
if (Symbol.dispose) SchematicBuilderWrapper.prototype[Symbol.dispose] = SchematicBuilderWrapper.prototype.free;

export class SchematicWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SchematicWrapper.prototype);
        obj.__wbg_ptr = ptr;
        SchematicWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SchematicWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_schematicwrapper_free(ptr, 0);
    }
    /**
     * Creates a simulation world for this schematic with default options
     *
     * This allows you to simulate redstone circuits and interact with them.
     * @returns {MchprsWorldWrapper}
     */
    create_simulation_world() {
        const ret = wasm.schematicwrapper_create_simulation_world(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return MchprsWorldWrapper.__wrap(ret[0]);
    }
    /**
     * Creates a simulation world for this schematic with custom options
     *
     * This allows you to configure simulation behavior like wire state tracking.
     * @param {SimulationOptionsWrapper} options
     * @returns {MchprsWorldWrapper}
     */
    create_simulation_world_with_options(options) {
        _assertClass(options, SimulationOptionsWrapper);
        const ret = wasm.schematicwrapper_create_simulation_world_with_options(this.__wbg_ptr, options.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return MchprsWorldWrapper.__wrap(ret[0]);
    }
    constructor() {
        const ret = wasm.schematicwrapper_new();
        this.__wbg_ptr = ret >>> 0;
        SchematicWrapperFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} min_x
     * @param {number} min_y
     * @param {number} min_z
     * @param {number} max_x
     * @param {number} max_y
     * @param {number} max_z
     * @param {string} block_state
     */
    fillCuboid(min_x, min_y, min_z, max_x, max_y, max_z, block_state) {
        const ptr0 = passStringToWasm0(block_state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.schematicwrapper_fillCuboid(this.__wbg_ptr, min_x, min_y, min_z, max_x, max_y, max_z, ptr0, len0);
    }
    /**
     * @param {number} cx
     * @param {number} cy
     * @param {number} cz
     * @param {number} radius
     * @param {string} block_state
     */
    fillSphere(cx, cy, cz, radius, block_state) {
        const ptr0 = passStringToWasm0(block_state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.schematicwrapper_fillSphere(this.__wbg_ptr, cx, cy, cz, radius, ptr0, len0);
    }
    /**
     * @param {Uint8Array} data
     */
    from_data(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_from_data(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {Array<any>}
     */
    static get_supported_import_formats() {
        const ret = wasm.schematicwrapper_get_supported_import_formats();
        return ret;
    }
    /**
     * @returns {Array<any>}
     */
    static get_supported_export_formats() {
        const ret = wasm.schematicwrapper_get_supported_export_formats();
        return ret;
    }
    /**
     * @param {string} format
     * @returns {Array<any>}
     */
    static get_format_versions(format) {
        const ptr0 = passStringToWasm0(format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_get_format_versions(ptr0, len0);
        return ret;
    }
    /**
     * @param {string} format
     * @returns {string | undefined}
     */
    static get_default_format_version(format) {
        const ptr0 = passStringToWasm0(format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_get_default_format_version(ptr0, len0);
        let v2;
        if (ret[0] !== 0) {
            v2 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v2;
    }
    /**
     * @param {string} format
     * @param {string | null} [version]
     * @returns {Uint8Array}
     */
    save_as(format, version) {
        const ptr0 = passStringToWasm0(format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(version) ? 0 : passStringToWasm0(version, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_save_as(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v3;
    }
    /**
     * @param {Uint8Array} data
     */
    from_litematic(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_from_litematic(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    to_litematic() {
        const ret = wasm.schematicwrapper_to_litematic(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {Uint8Array} data
     */
    from_schematic(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_from_schematic(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    to_schematic() {
        const ret = wasm.schematicwrapper_to_schematic(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {Uint8Array} data
     */
    from_mcstructure(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_from_mcstructure(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    to_mcstructure() {
        const ret = wasm.schematicwrapper_to_mcstructure(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {string} version
     * @returns {Uint8Array}
     */
    to_schematic_version(version) {
        const ptr0 = passStringToWasm0(version, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_to_schematic_version(this.__wbg_ptr, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v2;
    }
    /**
     * @returns {Array<any>}
     */
    get_available_schematic_versions() {
        const ret = wasm.schematicwrapper_get_available_schematic_versions(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {any}
     */
    get_palette() {
        const ret = wasm.schematicwrapper_get_palette(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {any}
     */
    get_default_region_palette() {
        const ret = wasm.schematicwrapper_get_default_region_palette(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} region_name
     * @returns {any}
     */
    get_palette_from_region(region_name) {
        const ptr0 = passStringToWasm0(region_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_get_palette_from_region(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @returns {any}
     */
    get_bounding_box() {
        const ret = wasm.schematicwrapper_get_bounding_box(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} region_name
     * @returns {any}
     */
    get_region_bounding_box(region_name) {
        const ptr0 = passStringToWasm0(region_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_get_region_bounding_box(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} block_name
     */
    set_block(x, y, z, block_name) {
        const ptr0 = passStringToWasm0(block_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.schematicwrapper_set_block(this.__wbg_ptr, x, y, z, ptr0, len0);
    }
    /**
     * @param {string} region_name
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} block_name
     * @returns {boolean}
     */
    set_block_in_region(region_name, x, y, z, block_name) {
        const ptr0 = passStringToWasm0(region_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(block_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_set_block_in_region(this.__wbg_ptr, ptr0, len0, x, y, z, ptr1, len1);
        return ret !== 0;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} block_string
     */
    set_block_from_string(x, y, z, block_string) {
        const ptr0 = passStringToWasm0(block_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_set_block_from_string(this.__wbg_ptr, x, y, z, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {SchematicWrapper} from_schematic
     * @param {number} min_x
     * @param {number} min_y
     * @param {number} min_z
     * @param {number} max_x
     * @param {number} max_y
     * @param {number} max_z
     * @param {number} target_x
     * @param {number} target_y
     * @param {number} target_z
     * @param {any} excluded_blocks
     */
    copy_region(from_schematic, min_x, min_y, min_z, max_x, max_y, max_z, target_x, target_y, target_z, excluded_blocks) {
        _assertClass(from_schematic, SchematicWrapper);
        const ret = wasm.schematicwrapper_copy_region(this.__wbg_ptr, from_schematic.__wbg_ptr, min_x, min_y, min_z, max_x, max_y, max_z, target_x, target_y, target_z, excluded_blocks);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} block_name
     * @param {any} properties
     */
    set_block_with_properties(x, y, z, block_name, properties) {
        const ptr0 = passStringToWasm0(block_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_set_block_with_properties(this.__wbg_ptr, x, y, z, ptr0, len0, properties);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} block_name
     * @param {any} nbt_data
     */
    setBlockWithNbt(x, y, z, block_name, nbt_data) {
        const ptr0 = passStringToWasm0(block_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_setBlockWithNbt(this.__wbg_ptr, x, y, z, ptr0, len0, nbt_data);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {string | undefined}
     */
    get_block(x, y, z) {
        const ret = wasm.schematicwrapper_get_block(this.__wbg_ptr, x, y, z);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Get block as formatted string with properties (e.g., "minecraft:lever[powered=true,facing=north]")
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {string | undefined}
     */
    get_block_string(x, y, z) {
        const ret = wasm.schematicwrapper_get_block_string(this.__wbg_ptr, x, y, z);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {BlockStateWrapper | undefined}
     */
    get_block_with_properties(x, y, z) {
        const ret = wasm.schematicwrapper_get_block_with_properties(this.__wbg_ptr, x, y, z);
        return ret === 0 ? undefined : BlockStateWrapper.__wrap(ret);
    }
    /**
     * Batch set blocks at multiple positions to the same block name.
     * `positions` is a flat Int32Array of [x0,y0,z0, x1,y1,z1, ...].
     * Returns the number of blocks set.
     * @param {Int32Array} positions
     * @param {string} block_name
     * @returns {number}
     */
    set_blocks(positions, block_name) {
        const ptr0 = passArray32ToWasm0(positions, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(block_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_set_blocks(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret >>> 0;
    }
    /**
     * Batch get block names at multiple positions.
     * `positions` is a flat Int32Array of [x0,y0,z0, x1,y1,z1, ...].
     * Returns a JS Array of block name strings (null for empty/out-of-bounds).
     * @param {Int32Array} positions
     * @returns {Array<any>}
     */
    get_blocks(positions) {
        const ptr0 = passArray32ToWasm0(positions, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_get_blocks(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {any}
     */
    get_block_entity(x, y, z) {
        const ret = wasm.schematicwrapper_get_block_entity(this.__wbg_ptr, x, y, z);
        return ret;
    }
    /**
     * @returns {any}
     */
    get_all_block_entities() {
        const ret = wasm.schematicwrapper_get_all_block_entities(this.__wbg_ptr);
        return ret;
    }
    /**
     * Add or replace a block entity at a specific position.
     * `nbt_data` should be a plain JS object.
     * @param {string} id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {any} nbt_data
     */
    addBlockEntity(id, x, y, z, nbt_data) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_addBlockEntity(this.__wbg_ptr, ptr0, len0, x, y, z, nbt_data);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Place a container block and insert an item into a specific slot.
     * Useful for exporting item layouts via chest/barrel inventories.
     * @param {string} block_id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} item_id
     * @param {number} slot
     * @param {number} count
     */
    addContainerItem(block_id, x, y, z, item_id, slot, count) {
        const ptr0 = passStringToWasm0(block_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(item_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_addContainerItem(this.__wbg_ptr, ptr0, len0, x, y, z, ptr1, len1, slot, count);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Add a generic entity with optional NBT object.
     * @param {string} id
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {any} nbt_data
     */
    addEntity(id, x, y, z, nbt_data) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_addEntity(this.__wbg_ptr, ptr0, len0, x, y, z, nbt_data);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Add an item frame entity anchored to a support block position.
     * `facing` uses Minecraft directions: 0=down, 1=up, 2=north, 3=south, 4=west, 5=east.
     * @param {string} item_id
     * @param {number} support_x
     * @param {number} support_y
     * @param {number} support_z
     * @param {number} facing
     * @param {number} item_rotation
     * @param {boolean} fixed
     */
    addItemFrameEntity(item_id, support_x, support_y, support_z, facing, item_rotation, fixed) {
        const ptr0 = passStringToWasm0(item_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_addItemFrameEntity(this.__wbg_ptr, ptr0, len0, support_x, support_y, support_z, facing, item_rotation, fixed);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {any}
     */
    getAllEntities() {
        const ret = wasm.schematicwrapper_getAllEntities(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    print_schematic() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.schematicwrapper_print_schematic(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    debug_info() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.schematicwrapper_debug_info(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string | undefined}
     */
    getName() {
        const ret = wasm.schematicwrapper_getName(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {string} name
     */
    setName(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.schematicwrapper_setName(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {string | undefined}
     */
    getAuthor() {
        const ret = wasm.schematicwrapper_getAuthor(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {string} author
     */
    setAuthor(author) {
        const ptr0 = passStringToWasm0(author, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.schematicwrapper_setAuthor(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {string | undefined}
     */
    getDescription() {
        const ret = wasm.schematicwrapper_getDescription(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {string} description
     */
    setDescription(description) {
        const ptr0 = passStringToWasm0(description, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.schematicwrapper_setDescription(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {number | undefined}
     */
    getCreated() {
        const ret = wasm.schematicwrapper_getCreated(this.__wbg_ptr);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @param {number} created
     */
    setCreated(created) {
        wasm.schematicwrapper_setCreated(this.__wbg_ptr, created);
    }
    /**
     * @returns {number | undefined}
     */
    getModified() {
        const ret = wasm.schematicwrapper_getModified(this.__wbg_ptr);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @param {number} modified
     */
    setModified(modified) {
        wasm.schematicwrapper_setModified(this.__wbg_ptr, modified);
    }
    /**
     * @returns {number | undefined}
     */
    getLmVersion() {
        const ret = wasm.schematicwrapper_getLmVersion(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {number} version
     */
    setLmVersion(version) {
        wasm.schematicwrapper_setLmVersion(this.__wbg_ptr, version);
    }
    /**
     * @returns {number | undefined}
     */
    getMcVersion() {
        const ret = wasm.schematicwrapper_getMcVersion(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {number} version
     */
    setMcVersion(version) {
        wasm.schematicwrapper_setMcVersion(this.__wbg_ptr, version);
    }
    /**
     * @returns {number | undefined}
     */
    getWeVersion() {
        const ret = wasm.schematicwrapper_getWeVersion(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {number} version
     */
    setWeVersion(version) {
        wasm.schematicwrapper_setWeVersion(this.__wbg_ptr, version);
    }
    /**
     * @returns {Int32Array}
     */
    get_dimensions() {
        const ret = wasm.schematicwrapper_get_dimensions(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get the allocated dimensions (full buffer size including pre-allocated space)
     * Use this if you need to know the internal buffer size
     * @returns {Int32Array}
     */
    get_allocated_dimensions() {
        const ret = wasm.schematicwrapper_get_allocated_dimensions(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get the tight dimensions of actual block content (excluding pre-allocated space)
     * Returns [width, height, length] or [0, 0, 0] if no non-air blocks exist
     * @returns {Int32Array}
     */
    get_tight_dimensions() {
        const ret = wasm.schematicwrapper_get_tight_dimensions(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get the tight bounding box min coordinates [x, y, z]
     * Returns null if no non-air blocks have been placed
     * @returns {Int32Array | undefined}
     */
    get_tight_bounds_min() {
        const ret = wasm.schematicwrapper_get_tight_bounds_min(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        }
        return v1;
    }
    /**
     * Get the tight bounding box max coordinates [x, y, z]
     * Returns null if no non-air blocks have been placed
     * @returns {Int32Array | undefined}
     */
    get_tight_bounds_max() {
        const ret = wasm.schematicwrapper_get_tight_bounds_max(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        }
        return v1;
    }
    /**
     * @returns {number}
     */
    get_block_count() {
        const ret = wasm.schematicwrapper_get_block_count(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_volume() {
        const ret = wasm.schematicwrapper_get_volume(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string[]}
     */
    get_region_names() {
        const ret = wasm.schematicwrapper_get_region_names(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Array<any>}
     */
    blocks() {
        const ret = wasm.schematicwrapper_blocks(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} chunk_width
     * @param {number} chunk_height
     * @param {number} chunk_length
     * @returns {Array<any>}
     */
    chunks(chunk_width, chunk_height, chunk_length) {
        const ret = wasm.schematicwrapper_chunks(this.__wbg_ptr, chunk_width, chunk_height, chunk_length);
        return ret;
    }
    /**
     * @param {number} chunk_width
     * @param {number} chunk_height
     * @param {number} chunk_length
     * @param {string} strategy
     * @param {number} camera_x
     * @param {number} camera_y
     * @param {number} camera_z
     * @returns {Array<any>}
     */
    chunks_with_strategy(chunk_width, chunk_height, chunk_length, strategy, camera_x, camera_y, camera_z) {
        const ptr0 = passStringToWasm0(strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_chunks_with_strategy(this.__wbg_ptr, chunk_width, chunk_height, chunk_length, ptr0, len0, camera_x, camera_y, camera_z);
        return ret;
    }
    /**
     * @param {number} offset_x
     * @param {number} offset_y
     * @param {number} offset_z
     * @param {number} width
     * @param {number} height
     * @param {number} length
     * @returns {Array<any>}
     */
    get_chunk_blocks(offset_x, offset_y, offset_z, width, height, length) {
        const ret = wasm.schematicwrapper_get_chunk_blocks(this.__wbg_ptr, offset_x, offset_y, offset_z, width, height, length);
        return ret;
    }
    /**
     * Get all palettes once - eliminates repeated string transfers
     * Returns: { default: [BlockState], regions: { regionName: [BlockState] } }
     * @returns {any}
     */
    get_all_palettes() {
        const ret = wasm.schematicwrapper_get_all_palettes(this.__wbg_ptr);
        return ret;
    }
    /**
     * Optimized chunks iterator that returns palette indices instead of full block data
     * Returns array of: { chunk_x, chunk_y, chunk_z, blocks: [[x,y,z,palette_index],...] }
     * @param {number} chunk_width
     * @param {number} chunk_height
     * @param {number} chunk_length
     * @returns {Array<any>}
     */
    chunks_indices(chunk_width, chunk_height, chunk_length) {
        const ret = wasm.schematicwrapper_chunks_indices(this.__wbg_ptr, chunk_width, chunk_height, chunk_length);
        return ret;
    }
    /**
     * Optimized chunks with strategy - returns palette indices
     * @param {number} chunk_width
     * @param {number} chunk_height
     * @param {number} chunk_length
     * @param {string} strategy
     * @param {number} camera_x
     * @param {number} camera_y
     * @param {number} camera_z
     * @returns {Array<any>}
     */
    chunks_indices_with_strategy(chunk_width, chunk_height, chunk_length, strategy, camera_x, camera_y, camera_z) {
        const ptr0 = passStringToWasm0(strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_chunks_indices_with_strategy(this.__wbg_ptr, chunk_width, chunk_height, chunk_length, ptr0, len0, camera_x, camera_y, camera_z);
        return ret;
    }
    /**
     * Get specific chunk blocks as palette indices (for lazy loading individual chunks)
     * Returns array of [x, y, z, palette_index]
     * @param {number} offset_x
     * @param {number} offset_y
     * @param {number} offset_z
     * @param {number} width
     * @param {number} height
     * @param {number} length
     * @returns {Array<any>}
     */
    get_chunk_blocks_indices(offset_x, offset_y, offset_z, width, height, length) {
        const ret = wasm.schematicwrapper_get_chunk_blocks_indices(this.__wbg_ptr, offset_x, offset_y, offset_z, width, height, length);
        return ret;
    }
    /**
     * Get optimized chunk data including blocks and relevant tile entities
     * Returns { blocks: [[x,y,z,palette_index],...], entities: [{id, position, nbt},...] }
     * @param {number} chunk_x
     * @param {number} chunk_y
     * @param {number} chunk_z
     * @param {number} chunk_width
     * @param {number} chunk_height
     * @param {number} chunk_length
     * @returns {any}
     */
    getChunkData(chunk_x, chunk_y, chunk_z, chunk_width, chunk_height, chunk_length) {
        const ret = wasm.schematicwrapper_getChunkData(this.__wbg_ptr, chunk_x, chunk_y, chunk_z, chunk_width, chunk_height, chunk_length);
        return ret;
    }
    /**
     * All blocks as palette indices - for when you need everything at once but efficiently
     * Returns array of [x, y, z, palette_index]
     * @returns {Array<any>}
     */
    blocks_indices() {
        const ret = wasm.schematicwrapper_blocks_indices(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get optimization stats
     * @returns {any}
     */
    get_optimization_info() {
        const ret = wasm.schematicwrapper_get_optimization_info(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} chunk_width
     * @param {number} chunk_height
     * @param {number} chunk_length
     * @param {string} strategy
     * @param {number} camera_x
     * @param {number} camera_y
     * @param {number} camera_z
     * @returns {LazyChunkIterator}
     */
    create_lazy_chunk_iterator(chunk_width, chunk_height, chunk_length, strategy, camera_x, camera_y, camera_z) {
        const ptr0 = passStringToWasm0(strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_create_lazy_chunk_iterator(this.__wbg_ptr, chunk_width, chunk_height, chunk_length, ptr0, len0, camera_x, camera_y, camera_z);
        return LazyChunkIterator.__wrap(ret);
    }
    /**
     * Flip the schematic along the X axis
     */
    flip_x() {
        wasm.schematicwrapper_flip_x(this.__wbg_ptr);
    }
    /**
     * Flip the schematic along the Y axis
     */
    flip_y() {
        wasm.schematicwrapper_flip_y(this.__wbg_ptr);
    }
    /**
     * Flip the schematic along the Z axis
     */
    flip_z() {
        wasm.schematicwrapper_flip_z(this.__wbg_ptr);
    }
    /**
     * Rotate the schematic around the Y axis (horizontal plane)
     * Degrees must be 90, 180, or 270
     * @param {number} degrees
     */
    rotate_y(degrees) {
        wasm.schematicwrapper_rotate_y(this.__wbg_ptr, degrees);
    }
    /**
     * Rotate the schematic around the X axis
     * Degrees must be 90, 180, or 270
     * @param {number} degrees
     */
    rotate_x(degrees) {
        wasm.schematicwrapper_rotate_x(this.__wbg_ptr, degrees);
    }
    /**
     * Rotate the schematic around the Z axis
     * Degrees must be 90, 180, or 270
     * @param {number} degrees
     */
    rotate_z(degrees) {
        wasm.schematicwrapper_rotate_z(this.__wbg_ptr, degrees);
    }
    /**
     * Flip a specific region along the X axis
     * @param {string} region_name
     */
    flip_region_x(region_name) {
        const ptr0 = passStringToWasm0(region_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_flip_region_x(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Flip a specific region along the Y axis
     * @param {string} region_name
     */
    flip_region_y(region_name) {
        const ptr0 = passStringToWasm0(region_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_flip_region_y(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Flip a specific region along the Z axis
     * @param {string} region_name
     */
    flip_region_z(region_name) {
        const ptr0 = passStringToWasm0(region_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_flip_region_z(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Rotate a specific region around the Y axis
     * @param {string} region_name
     * @param {number} degrees
     */
    rotate_region_y(region_name, degrees) {
        const ptr0 = passStringToWasm0(region_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_rotate_region_y(this.__wbg_ptr, ptr0, len0, degrees);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Rotate a specific region around the X axis
     * @param {string} region_name
     * @param {number} degrees
     */
    rotate_region_x(region_name, degrees) {
        const ptr0 = passStringToWasm0(region_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_rotate_region_x(this.__wbg_ptr, ptr0, len0, degrees);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Rotate a specific region around the Z axis
     * @param {string} region_name
     * @param {number} degrees
     */
    rotate_region_z(region_name, degrees) {
        const ptr0 = passStringToWasm0(region_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_rotate_region_z(this.__wbg_ptr, ptr0, len0, degrees);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} name
     * @param {DefinitionRegionWrapper} region
     */
    addDefinitionRegion(name, region) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(region, DefinitionRegionWrapper);
        wasm.schematicwrapper_addDefinitionRegion(this.__wbg_ptr, ptr0, len0, region.__wbg_ptr);
    }
    /**
     * @param {string} name
     * @returns {DefinitionRegionWrapper}
     */
    getDefinitionRegion(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_getDefinitionRegion(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DefinitionRegionWrapper.__wrap(ret[0]);
    }
    /**
     * @param {string} name
     * @returns {boolean}
     */
    removeDefinitionRegion(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_removeDefinitionRegion(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @returns {Array<any>}
     */
    getDefinitionRegionNames() {
        const ret = wasm.schematicwrapper_getDefinitionRegionNames(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} name
     */
    createDefinitionRegion(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.schematicwrapper_createDefinitionRegion(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {string} name
     * @param {BlockPosition} min
     * @param {BlockPosition} max
     */
    definitionRegionAddBounds(name, min, max) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(min, BlockPosition);
        var ptr1 = min.__destroy_into_raw();
        _assertClass(max, BlockPosition);
        var ptr2 = max.__destroy_into_raw();
        const ret = wasm.schematicwrapper_definitionRegionAddBounds(this.__wbg_ptr, ptr0, len0, ptr1, ptr2);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} name
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    definitionRegionAddPoint(name, x, y, z) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_definitionRegionAddPoint(this.__wbg_ptr, ptr0, len0, x, y, z);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} name
     * @param {string} key
     * @param {string} value
     */
    definitionRegionSetMetadata(name, key, value) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_definitionRegionSetMetadata(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} name
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    definitionRegionShift(name, x, y, z) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_definitionRegionShift(this.__wbg_ptr, ptr0, len0, x, y, z);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} name
     * @param {any} min
     * @param {any} max
     * @returns {DefinitionRegionWrapper}
     */
    createRegion(name, min, max) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schematicwrapper_createRegion(this.__wbg_ptr, ptr0, len0, min, max);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DefinitionRegionWrapper.__wrap(ret[0]);
    }
    /**
     * @param {string} name
     * @param {DefinitionRegionWrapper} region
     */
    updateRegion(name, region) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(region, DefinitionRegionWrapper);
        wasm.schematicwrapper_addDefinitionRegion(this.__wbg_ptr, ptr0, len0, region.__wbg_ptr);
    }
    /**
     * @param {string} name
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    createDefinitionRegionFromPoint(name, x, y, z) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.schematicwrapper_createDefinitionRegionFromPoint(this.__wbg_ptr, ptr0, len0, x, y, z);
    }
    /**
     * @param {string} name
     * @param {BlockPosition} min
     * @param {BlockPosition} max
     */
    createDefinitionRegionFromBounds(name, min, max) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(min, BlockPosition);
        var ptr1 = min.__destroy_into_raw();
        _assertClass(max, BlockPosition);
        var ptr2 = max.__destroy_into_raw();
        wasm.schematicwrapper_createDefinitionRegionFromBounds(this.__wbg_ptr, ptr0, len0, ptr1, ptr2);
    }
    /**
     * @returns {CircuitBuilderWrapper}
     */
    createCircuitBuilder() {
        const ret = wasm.schematicwrapper_createCircuitBuilder(this.__wbg_ptr);
        return CircuitBuilderWrapper.__wrap(ret);
    }
    /**
     * @param {any} inputs
     * @param {any} outputs
     * @returns {TypedCircuitExecutorWrapper}
     */
    createCircuit(inputs, outputs) {
        const ret = wasm.schematicwrapper_createCircuit(this.__wbg_ptr, inputs, outputs);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TypedCircuitExecutorWrapper.__wrap(ret[0]);
    }
    /**
     * @param {any} config
     * @returns {TypedCircuitExecutorWrapper}
     */
    buildExecutor(config) {
        const ret = wasm.schematicwrapper_buildExecutor(this.__wbg_ptr, config);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TypedCircuitExecutorWrapper.__wrap(ret[0]);
    }
    /**
     * Extract all sign text from the schematic
     * Returns a JavaScript array of objects: [{pos: [x,y,z], text: "..."}]
     * @returns {any}
     */
    extractSigns() {
        const ret = wasm.schematicwrapper_extractSigns(this.__wbg_ptr);
        return ret;
    }
    /**
     * Compile Insign annotations from the schematic's signs
     * Returns a JavaScript object with compiled region metadata
     * This returns raw Insign data - interpretation is up to the consumer
     * @returns {any}
     */
    compileInsign() {
        const ret = wasm.schematicwrapper_compileInsign(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}
if (Symbol.dispose) SchematicWrapper.prototype[Symbol.dispose] = SchematicWrapper.prototype.free;

/**
 * A wrapper for any shape (Sphere, Cuboid, etc.)
 */
export class ShapeWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ShapeWrapper.prototype);
        obj.__wbg_ptr = ptr;
        ShapeWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ShapeWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_shapewrapper_free(ptr, 0);
    }
    /**
     * Create a new Sphere shape
     * @param {number} cx
     * @param {number} cy
     * @param {number} cz
     * @param {number} radius
     * @returns {ShapeWrapper}
     */
    static sphere(cx, cy, cz, radius) {
        const ret = wasm.shapewrapper_sphere(cx, cy, cz, radius);
        return ShapeWrapper.__wrap(ret);
    }
    /**
     * Create a new Cuboid shape
     * @param {number} min_x
     * @param {number} min_y
     * @param {number} min_z
     * @param {number} max_x
     * @param {number} max_y
     * @param {number} max_z
     * @returns {ShapeWrapper}
     */
    static cuboid(min_x, min_y, min_z, max_x, max_y, max_z) {
        const ret = wasm.shapewrapper_cuboid(min_x, min_y, min_z, max_x, max_y, max_z);
        return ShapeWrapper.__wrap(ret);
    }
}
if (Symbol.dispose) ShapeWrapper.prototype[Symbol.dispose] = ShapeWrapper.prototype.free;

export class SimulationOptionsWrapper {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SimulationOptionsWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_simulationoptionswrapper_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.simulationoptionswrapper_new();
        this.__wbg_ptr = ret >>> 0;
        SimulationOptionsWrapperFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {boolean}
     */
    get optimize() {
        const ret = wasm.simulationoptionswrapper_optimize(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} value
     */
    set optimize(value) {
        wasm.simulationoptionswrapper_set_optimize(this.__wbg_ptr, value);
    }
    /**
     * @returns {boolean}
     */
    get io_only() {
        const ret = wasm.simulationoptionswrapper_io_only(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} value
     */
    set io_only(value) {
        wasm.simulationoptionswrapper_set_io_only(this.__wbg_ptr, value);
    }
    /**
     * Adds a position to the custom IO list
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    addCustomIo(x, y, z) {
        wasm.simulationoptionswrapper_addCustomIo(this.__wbg_ptr, x, y, z);
    }
    /**
     * Clears the custom IO list
     */
    clearCustomIo() {
        wasm.simulationoptionswrapper_clearCustomIo(this.__wbg_ptr);
    }
}
if (Symbol.dispose) SimulationOptionsWrapper.prototype[Symbol.dispose] = SimulationOptionsWrapper.prototype.free;

/**
 * Sort strategy for ordering positions in IO layouts
 *
 * Controls how positions are ordered when assigned to bits.
 * Position 0 corresponds to bit 0 (LSB), position 1 to bit 1, etc.
 */
export class SortStrategyWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SortStrategyWrapper.prototype);
        obj.__wbg_ptr = ptr;
        SortStrategyWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SortStrategyWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sortstrategywrapper_free(ptr, 0);
    }
    /**
     * Sort by Y first (ascending), then X, then Z
     * Standard Minecraft layer-based ordering. This is the default.
     * @returns {SortStrategyWrapper}
     */
    static yxz() {
        const ret = wasm.sortstrategywrapper_yxz();
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Sort by X first (ascending), then Y, then Z
     * @returns {SortStrategyWrapper}
     */
    static xyz() {
        const ret = wasm.sortstrategywrapper_xyz();
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Sort by Z first (ascending), then Y, then X
     * @returns {SortStrategyWrapper}
     */
    static zyx() {
        const ret = wasm.iotypewrapper_float32();
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Sort by Y first (descending), then X ascending, then Z ascending
     * @returns {SortStrategyWrapper}
     */
    static yDescXZ() {
        const ret = wasm.iotypewrapper_boolean();
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Sort by X first (descending), then Y ascending, then Z ascending
     * @returns {SortStrategyWrapper}
     */
    static xDescYZ() {
        const ret = wasm.sortstrategywrapper_xDescYZ();
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Sort by Z first (descending), then Y ascending, then X ascending
     * @returns {SortStrategyWrapper}
     */
    static zDescYX() {
        const ret = wasm.sortstrategywrapper_zDescYX();
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Sort by Y descending, then X descending, then Z descending
     * @returns {SortStrategyWrapper}
     */
    static descending() {
        const ret = wasm.sortstrategywrapper_descending();
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Sort by Euclidean distance from a reference point (ascending)
     * Closest positions first. Useful for radial layouts.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {SortStrategyWrapper}
     */
    static distanceFrom(x, y, z) {
        const ret = wasm.sortstrategywrapper_distanceFrom(x, y, z);
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Sort by Euclidean distance from a reference point (descending)
     * Farthest positions first.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {SortStrategyWrapper}
     */
    static distanceFromDesc(x, y, z) {
        const ret = wasm.sortstrategywrapper_distanceFromDesc(x, y, z);
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Preserve the order positions were added (no sorting)
     * Useful when you've manually ordered positions or are using `fromBoundingBoxes`
     * where box order matters.
     * @returns {SortStrategyWrapper}
     */
    static preserve() {
        const ret = wasm.sortstrategywrapper_preserve();
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Reverse of whatever order positions were added
     * @returns {SortStrategyWrapper}
     */
    static reverse() {
        const ret = wasm.sortstrategywrapper_reverse();
        return SortStrategyWrapper.__wrap(ret);
    }
    /**
     * Parse sort strategy from string
     *
     * Accepts: "yxz", "xyz", "zyx", "y_desc", "x_desc", "z_desc",
     *          "descending", "preserve", "reverse"
     * @param {string} s
     * @returns {SortStrategyWrapper}
     */
    static fromString(s) {
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sortstrategywrapper_fromString(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return SortStrategyWrapper.__wrap(ret[0]);
    }
    /**
     * Get the name of this strategy
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.sortstrategywrapper_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) SortStrategyWrapper.prototype[Symbol.dispose] = SortStrategyWrapper.prototype.free;

/**
 * State mode constants for JavaScript
 */
export class StateModeConstants {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        StateModeConstantsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_statemodeconstants_free(ptr, 0);
    }
    /**
     * Always reset before execution (default)
     * @returns {string}
     */
    static get STATELESS() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.statemodeconstants_stateless();
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Preserve state between executions
     * @returns {string}
     */
    static get STATEFUL() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.statemodeconstants_stateful();
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Manual state control
     * @returns {string}
     */
    static get MANUAL() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.statemodeconstants_manual();
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) StateModeConstants.prototype[Symbol.dispose] = StateModeConstants.prototype.free;

/**
 * TypedCircuitExecutor wrapper for JavaScript
 */
export class TypedCircuitExecutorWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TypedCircuitExecutorWrapper.prototype);
        obj.__wbg_ptr = ptr;
        TypedCircuitExecutorWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TypedCircuitExecutorWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_typedcircuitexecutorwrapper_free(ptr, 0);
    }
    /**
     * Create executor from world and layout
     * @param {MchprsWorldWrapper} world
     * @param {IoLayoutWrapper} layout
     * @returns {TypedCircuitExecutorWrapper}
     */
    static fromLayout(world, layout) {
        _assertClass(world, MchprsWorldWrapper);
        var ptr0 = world.__destroy_into_raw();
        _assertClass(layout, IoLayoutWrapper);
        var ptr1 = layout.__destroy_into_raw();
        const ret = wasm.typedcircuitexecutorwrapper_fromLayout(ptr0, ptr1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TypedCircuitExecutorWrapper.__wrap(ret[0]);
    }
    /**
     * Create executor from world, layout, and options
     * @param {MchprsWorldWrapper} world
     * @param {IoLayoutWrapper} layout
     * @param {SimulationOptionsWrapper} options
     * @returns {TypedCircuitExecutorWrapper}
     */
    static fromLayoutWithOptions(world, layout, options) {
        _assertClass(world, MchprsWorldWrapper);
        var ptr0 = world.__destroy_into_raw();
        _assertClass(layout, IoLayoutWrapper);
        var ptr1 = layout.__destroy_into_raw();
        _assertClass(options, SimulationOptionsWrapper);
        const ret = wasm.typedcircuitexecutorwrapper_fromLayoutWithOptions(ptr0, ptr1, options.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TypedCircuitExecutorWrapper.__wrap(ret[0]);
    }
    /**
     * Create executor from Insign annotations in schematic
     * @param {SchematicWrapper} schematic
     * @returns {TypedCircuitExecutorWrapper}
     */
    static fromInsign(schematic) {
        _assertClass(schematic, SchematicWrapper);
        const ret = wasm.typedcircuitexecutorwrapper_fromInsign(schematic.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TypedCircuitExecutorWrapper.__wrap(ret[0]);
    }
    /**
     * Create executor from Insign annotations with custom simulation options
     * @param {SchematicWrapper} schematic
     * @param {SimulationOptionsWrapper} options
     * @returns {TypedCircuitExecutorWrapper}
     */
    static fromInsignWithOptions(schematic, options) {
        _assertClass(schematic, SchematicWrapper);
        _assertClass(options, SimulationOptionsWrapper);
        const ret = wasm.typedcircuitexecutorwrapper_fromInsignWithOptions(schematic.__wbg_ptr, options.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TypedCircuitExecutorWrapper.__wrap(ret[0]);
    }
    /**
     * Set state mode
     * @param {string} mode
     */
    setStateMode(mode) {
        const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.typedcircuitexecutorwrapper_setStateMode(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Reset the simulation
     */
    reset() {
        const ret = wasm.typedcircuitexecutorwrapper_reset(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Run the circuit with simplified arguments
     * @param {any} inputs
     * @param {number} limit
     * @param {string} mode
     * @returns {any}
     */
    run(inputs, limit, mode) {
        const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.typedcircuitexecutorwrapper_run(this.__wbg_ptr, inputs, limit, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Execute the circuit
     * @param {any} inputs
     * @param {ExecutionModeWrapper} mode
     * @returns {any}
     */
    execute(inputs, mode) {
        _assertClass(mode, ExecutionModeWrapper);
        const ret = wasm.typedcircuitexecutorwrapper_execute(this.__wbg_ptr, inputs, mode.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Sync the simulation state back to the schematic
     *
     * Call this after execute() to update the schematic with the current simulation state.
     * Returns the updated schematic.
     * @returns {SchematicWrapper}
     */
    syncToSchematic() {
        const ret = wasm.typedcircuitexecutorwrapper_syncToSchematic(this.__wbg_ptr);
        return SchematicWrapper.__wrap(ret);
    }
    /**
     * Manually advance the simulation by a specified number of ticks
     *
     * This is useful for manual state control when using 'manual' state mode.
     * Unlike execute(), this does not set any inputs or read outputs.
     * @param {number} ticks
     */
    tick(ticks) {
        wasm.typedcircuitexecutorwrapper_tick(this.__wbg_ptr, ticks);
    }
    /**
     * Manually flush the simulation state
     *
     * Ensures all pending changes are propagated through the redstone network.
     */
    flush() {
        wasm.typedcircuitexecutorwrapper_flush(this.__wbg_ptr);
    }
    /**
     * Set a single input value without executing
     * @param {string} name
     * @param {ValueWrapper} value
     */
    setInput(name, value) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(value, ValueWrapper);
        const ret = wasm.typedcircuitexecutorwrapper_setInput(this.__wbg_ptr, ptr0, len0, value.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Read a single output value without executing
     * @param {string} name
     * @returns {ValueWrapper}
     */
    readOutput(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.typedcircuitexecutorwrapper_readOutput(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ValueWrapper.__wrap(ret[0]);
    }
    /**
     * Get all input names
     * @returns {string[]}
     */
    inputNames() {
        const ret = wasm.typedcircuitexecutorwrapper_inputNames(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get all output names
     * @returns {string[]}
     */
    outputNames() {
        const ret = wasm.typedcircuitexecutorwrapper_outputNames(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get detailed layout information for debugging and visualization
     *
     * Returns a JS object with the structure:
     * ```javascript
     * {
     *   inputs: {
     *     "name": {
     *       ioType: "UnsignedInt { bits: 8 }",
     *       positions: [[x, y, z], ...],  // In bit order (LSB first)
     *       bitCount: 8
     *     }
     *   },
     *   outputs: { ... }
     * }
     * ```
     * @returns {any}
     */
    getLayoutInfo() {
        const ret = wasm.typedcircuitexecutorwrapper_getLayoutInfo(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) TypedCircuitExecutorWrapper.prototype[Symbol.dispose] = TypedCircuitExecutorWrapper.prototype.free;

export class ValueWrapper {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ValueWrapper.prototype);
        obj.__wbg_ptr = ptr;
        ValueWrapperFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ValueWrapperFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_valuewrapper_free(ptr, 0);
    }
    /**
     * Create a U32 value
     * @param {number} value
     * @returns {ValueWrapper}
     */
    static fromU32(value) {
        const ret = wasm.valuewrapper_fromU32(value);
        return ValueWrapper.__wrap(ret);
    }
    /**
     * Create an I32 value
     * @param {number} value
     * @returns {ValueWrapper}
     */
    static fromI32(value) {
        const ret = wasm.valuewrapper_fromI32(value);
        return ValueWrapper.__wrap(ret);
    }
    /**
     * Create an F32 value
     * @param {number} value
     * @returns {ValueWrapper}
     */
    static fromF32(value) {
        const ret = wasm.valuewrapper_fromF32(value);
        return ValueWrapper.__wrap(ret);
    }
    /**
     * Create a Bool value
     * @param {boolean} value
     * @returns {ValueWrapper}
     */
    static fromBool(value) {
        const ret = wasm.valuewrapper_fromBool(value);
        return ValueWrapper.__wrap(ret);
    }
    /**
     * Create a String value
     * @param {string} value
     * @returns {ValueWrapper}
     */
    static fromString(value) {
        const ptr0 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.valuewrapper_fromString(ptr0, len0);
        return ValueWrapper.__wrap(ret);
    }
    /**
     * Convert to JavaScript value
     * @returns {any}
     */
    toJs() {
        const ret = wasm.valuewrapper_toJs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get type name
     * @returns {string}
     */
    typeName() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.valuewrapper_typeName(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) ValueWrapper.prototype[Symbol.dispose] = ValueWrapper.prototype.free;

export class WasmBuildingTool {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmBuildingToolFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmbuildingtool_free(ptr, 0);
    }
    /**
     * Apply a brush to a shape on the given schematic
     * @param {SchematicWrapper} schematic
     * @param {ShapeWrapper} shape
     * @param {BrushWrapper} brush
     */
    static fill(schematic, shape, brush) {
        _assertClass(schematic, SchematicWrapper);
        _assertClass(shape, ShapeWrapper);
        _assertClass(brush, BrushWrapper);
        wasm.wasmbuildingtool_fill(schematic.__wbg_ptr, shape.__wbg_ptr, brush.__wbg_ptr);
    }
}
if (Symbol.dispose) WasmBuildingTool.prototype[Symbol.dispose] = WasmBuildingTool.prototype.free;

/**
 * @param {SchematicWrapper} schematic
 * @returns {string}
 */
export function debug_json_schematic(schematic) {
    let deferred1_0;
    let deferred1_1;
    try {
        _assertClass(schematic, SchematicWrapper);
        const ret = wasm.debug_json_schematic(schematic.__wbg_ptr);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {SchematicWrapper} schematic
 * @returns {string}
 */
export function debug_schematic(schematic) {
    let deferred1_0;
    let deferred1_1;
    try {
        _assertClass(schematic, SchematicWrapper);
        const ret = wasm.debug_schematic(schematic.__wbg_ptr);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {string} start_block_id
 * @param {string} end_block_id
 * @param {number} steps
 * @param {string} color_space
 * @param {string} easing
 * @returns {any}
 */
export function generate_gradient_between_blocks(start_block_id, end_block_id, steps, color_space, easing) {
    const ptr0 = passStringToWasm0(start_block_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(end_block_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(color_space, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passStringToWasm0(easing, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.generate_gradient_between_blocks(ptr0, len0, ptr1, len1, steps, ptr2, len2, ptr3, len3);
    return ret;
}

/**
 * @param {number} start_r
 * @param {number} start_g
 * @param {number} start_b
 * @param {number} end_r
 * @param {number} end_g
 * @param {number} end_b
 * @param {number} steps
 * @param {string} color_space
 * @param {string} easing
 * @returns {any}
 */
export function generate_gradient_between_colors(start_r, start_g, start_b, end_r, end_g, end_b, steps, color_space, easing) {
    const ptr0 = passStringToWasm0(color_space, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(easing, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.generate_gradient_between_colors(start_r, start_g, start_b, end_r, end_g, end_b, steps, ptr0, len0, ptr1, len1);
    return ret;
}

/**
 * @returns {any}
 */
export function get_all_colored_blocks() {
    const ret = wasm.get_all_colored_blocks();
    return ret;
}

/**
 * @param {string} block_id
 * @returns {any}
 */
export function get_block_info(block_id) {
    const ptr0 = passStringToWasm0(block_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.get_block_info(ptr0, len0);
    return ret;
}

/**
 * @returns {any}
 */
export function get_color_spaces() {
    const ret = wasm.get_color_spaces();
    return ret;
}

/**
 * @returns {any}
 */
export function get_easing_functions() {
    const ret = wasm.get_easing_functions();
    return ret;
}

/**
 * @param {string[]} block_ids
 * @returns {any}
 */
export function sort_blocks_by_color_gradient(block_ids) {
    const ptr0 = passArrayJsValueToWasm0(block_ids, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.sort_blocks_by_color_gradient(ptr0, len0);
    return ret;
}

/**
 * Initialize WASM module with panic hook for better error messages
 */
export function start() {
    wasm.start();
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_Error_52673b7de5a0ca89 = function(arg0, arg1) {
        const ret = Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_String_fed4d24b68977888 = function(arg0, arg1) {
        const ret = String(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_boolean_get_dea25b33882b895b = function(arg0) {
        const v = arg0;
        const ret = typeof(v) === 'boolean' ? v : undefined;
        return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
    };
    imports.wbg.__wbg___wbindgen_debug_string_adfb662ae34724b6 = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_is_null_dfda7d66506c95b5 = function(arg0) {
        const ret = arg0 === null;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_object_ce774f3490692386 = function(arg0) {
        const val = arg0;
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_string_704ef9c8fc131030 = function(arg0) {
        const ret = typeof(arg0) === 'string';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_undefined_f6b95eab589e0269 = function(arg0) {
        const ret = arg0 === undefined;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_number_get_9619185a74197f95 = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbg___wbindgen_string_get_a2a31e16edf96e42 = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_entries_83c79938054e065f = function(arg0) {
        const ret = Object.entries(arg0);
        return ret;
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_error_7bc7d576a6aaf855 = function(arg0) {
        console.error(arg0);
    };
    imports.wbg.__wbg_from_29a8414a7a7cd19d = function(arg0) {
        const ret = Array.from(arg0);
        return ret;
    };
    imports.wbg.__wbg_get_6b7bd52aca3f9671 = function(arg0, arg1) {
        const ret = arg0[arg1 >>> 0];
        return ret;
    };
    imports.wbg.__wbg_get_af9dab7e9603ea93 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(arg0, arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_instanceof_Object_577e21051f7bcb79 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof Object;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_isArray_51fd9e6422c0a395 = function(arg0) {
        const ret = Array.isArray(arg0);
        return ret;
    };
    imports.wbg.__wbg_keys_f5c6002ff150fc6c = function(arg0) {
        const ret = Object.keys(arg0);
        return ret;
    };
    imports.wbg.__wbg_length_d45040a40c570362 = function(arg0) {
        const ret = arg0.length;
        return ret;
    };
    imports.wbg.__wbg_log_1d990106d99dacb7 = function(arg0) {
        console.log(arg0);
    };
    imports.wbg.__wbg_new_1ba21ce319a06297 = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_25f239778d6112b9 = function() {
        const ret = new Array();
        return ret;
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_new_b546ae120718850e = function() {
        const ret = new Map();
        return ret;
    };
    imports.wbg.__wbg_new_from_slice_e6bd3cfb5a35313d = function(arg0, arg1) {
        const ret = new Int32Array(getArrayI32FromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_with_length_12c6de4fac33117a = function(arg0) {
        const ret = new Array(arg0 >>> 0);
        return ret;
    };
    imports.wbg.__wbg_now_69d776cd24f5215b = function() {
        const ret = Date.now();
        return ret;
    };
    imports.wbg.__wbg_of_7779827fa663eec8 = function(arg0, arg1, arg2) {
        const ret = Array.of(arg0, arg1, arg2);
        return ret;
    };
    imports.wbg.__wbg_push_7d9be8f38fc13975 = function(arg0, arg1) {
        const ret = arg0.push(arg1);
        return ret;
    };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    };
    imports.wbg.__wbg_set_3fda3bac07393de4 = function(arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    };
    imports.wbg.__wbg_set_781438a03c0c3c81 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(arg0, arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_set_7df433eea03a5c14 = function(arg0, arg1, arg2) {
        arg0[arg1 >>> 0] = arg2;
    };
    imports.wbg.__wbg_set_efaaf145b9377369 = function(arg0, arg1, arg2) {
        const ret = arg0.set(arg1, arg2);
        return ret;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_warn_6e567d0d926ff881 = function(arg0) {
        console.warn(arg0);
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_cast_4625c577ab2ec9ee = function(arg0) {
        // Cast intrinsic for `U64 -> Externref`.
        const ret = BigInt.asUintN(64, arg0);
        return ret;
    };
    imports.wbg.__wbindgen_cast_9ae0607507abb057 = function(arg0) {
        // Cast intrinsic for `I64 -> Externref`.
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_cast_d6cd19b81560fd6e = function(arg0) {
        // Cast intrinsic for `F64 -> Externref`.
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('nucleation_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;

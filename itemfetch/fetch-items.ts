import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import { parseBlocks, parseItems } from "./src/parser";
import { loadJavaSources } from "./src/source-loader";
import type { BlockLootBehavior, ParsedItem } from "./src/types";
import { pathExists, runExec } from "./src/utils";

type ItemIndex = Record<string, Record<string, unknown>>;

type ModelFile = {
  parent?: string;
  textures?: Record<string, string>;
};

type Candidate = {
  kind: "model" | "texture";
  ref: string;
};

type OutputItem = {
  id: string;
  texturePath: string | null;
  sourceTexture: string | null;
  sourceModel: string | null;
  registration: ParsedItem["registration"] | null;
  blockField: string | null;
  itemFactory: string | null;
  propertiesExpression: string | null;
  maxStackSize: number | null;
  maxDamage: number | null;
  rarity: string | null;
  fireResistant: boolean | null;
  foodReference: string | null;
  propertyCalls: Array<{ name: string; args: string[] }>;
  blockLoot: BlockLootBehavior | null;
};

type ParsedPng = {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  compressionMethod: number;
  filterMethod: number;
  interlaceMethod: number;
  chunks: Array<{ type: string; data: Buffer }>;
  idatData: Buffer;
};

type AnimationMeta = {
  animation?: {
    width?: number;
    height?: number;
    frames?: Array<number | { index?: number }>;
  };
};

const LOCAL_ASSETS_ROOT_OVERRIDE = process.env.ITEMFETCH_ASSETS_LOCAL_DIR
  ? path.resolve(process.cwd(), process.env.ITEMFETCH_ASSETS_LOCAL_DIR)
  : null;
let activeAssetsRoot: string | null = LOCAL_ASSETS_ROOT_OVERRIDE;

const ITEM_INDEX_ASSET_PATH = "assets/minecraft/items/_all.json";
const ITEMS_DIRECTORY_ASSET_PATH = "assets/minecraft/items";

const OUTPUT_ROOT = path.resolve(process.cwd(), "public/items");
const OUTPUT_TEXTURE_ROOT = path.join(OUTPUT_ROOT, "textures");
const OUTPUT_INDEX_PATH = path.join(OUTPUT_ROOT, "items.json");

const ITEM_LIMIT = Number(process.env.ITEMFETCH_LIMIT ?? "0");
const CONCURRENCY = Number(process.env.ITEMFETCH_CONCURRENCY ?? "24");

const PREFERRED_TEXTURE_KEYS = [
  "layer0",
  "layer1",
  "layer2",
  "all",
  "front",
  "top",
  "side",
  "back",
  "end",
  "bottom",
  "particle",
];

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const modelCache = new Map<string, Promise<ModelFile | null>>();
const textureMapCache = new Map<string, Promise<Record<string, string>>>();
const textureBufferCache = new Map<string, Promise<Buffer | null>>();
const textureMetaCache = new Map<string, Promise<AnimationMeta | null>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNamespacedRef(
  ref: string,
  defaultNamespace = "minecraft",
): { namespace: string; assetPath: string } {
  const separatorIndex = ref.indexOf(":");
  if (separatorIndex === -1) {
    return {
      namespace: defaultNamespace,
      assetPath: ref.replace(/^\/+/, ""),
    };
  }

  return {
    namespace: ref.slice(0, separatorIndex),
    assetPath: ref.slice(separatorIndex + 1).replace(/^\/+/, ""),
  };
}

function modelRefToAssetPath(modelRef: string): string {
  const parsed = parseNamespacedRef(modelRef);
  return `assets/${parsed.namespace}/models/${parsed.assetPath}.json`;
}

function textureRefToAssetPath(textureRef: string): string {
  const parsed = parseNamespacedRef(textureRef);
  const withTextureDir = parsed.assetPath.startsWith("textures/")
    ? parsed.assetPath
    : `textures/${parsed.assetPath}`;
  const withExtension = withTextureDir.endsWith(".png")
    ? withTextureDir
    : `${withTextureDir}.png`;
  return `assets/${parsed.namespace}/${withExtension}`;
}

async function readTextAssetOptional(assetPath: string): Promise<string | null> {
  if (!activeAssetsRoot) {
    throw new Error("Asset root is not initialized");
  }

  const absolutePath = path.join(activeAssetsRoot, assetPath);
  try {
    return await readFile(absolutePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
    }
    throw error;
  }
}

async function readBinaryAssetOptional(assetPath: string): Promise<Buffer | null> {
  if (!activeAssetsRoot) {
    throw new Error("Asset root is not initialized");
  }

  const absolutePath = path.join(activeAssetsRoot, assetPath);
  try {
    return await readFile(absolutePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
    }
    throw error;
  }
}

async function readRequiredTextAsset(assetPath: string): Promise<string> {
  const text = await readTextAssetOptional(assetPath);
  if (text === null) {
    throw new Error(`Required asset is missing: ${assetPath}`);
  }
  return text;
}

function textureRefToMcmetaAssetPath(textureRef: string): string {
  return `${textureRefToAssetPath(textureRef)}.mcmeta`;
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encodePngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function parsePng(bytes: Buffer): ParsedPng | null {
  if (bytes.length < PNG_SIGNATURE.length + 12) {
    return null;
  }

  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return null;
  }

  let offset = PNG_SIGNATURE.length;
  let width = -1;
  let height = -1;
  let bitDepth = -1;
  let colorType = -1;
  let compressionMethod = -1;
  let filterMethod = -1;
  let interlaceMethod = -1;

  const chunks: Array<{ type: string; data: Buffer }> = [];
  const idatParts: Buffer[] = [];

  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    offset += 4;

    const type = bytes.toString("ascii", offset, offset + 4);
    offset += 4;

    if (offset + length + 4 > bytes.length) {
      return null;
    }

    const chunkData = bytes.subarray(offset, offset + length);
    offset += length;

    // CRC (read but not validated)
    offset += 4;

    chunks.push({ type, data: Buffer.from(chunkData) });

    if (type === "IHDR") {
      if (length !== 13) {
        return null;
      }
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData.readUInt8(8);
      colorType = chunkData.readUInt8(9);
      compressionMethod = chunkData.readUInt8(10);
      filterMethod = chunkData.readUInt8(11);
      interlaceMethod = chunkData.readUInt8(12);
    } else if (type === "IDAT") {
      idatParts.push(chunkData);
    } else if (type === "IEND") {
      break;
    }
  }

  if (
    width <= 0 ||
    height <= 0 ||
    bitDepth < 0 ||
    colorType < 0 ||
    compressionMethod < 0 ||
    filterMethod < 0 ||
    interlaceMethod < 0
  ) {
    return null;
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    compressionMethod,
    filterMethod,
    interlaceMethod,
    chunks,
    idatData: Buffer.concat(idatParts),
  };
}

function bitsPerPixelForPng(colorType: number, bitDepth: number): number | null {
  let channels = 0;
  switch (colorType) {
    case 0:
      channels = 1;
      break;
    case 2:
      channels = 3;
      break;
    case 3:
      channels = 1;
      break;
    case 4:
      channels = 2;
      break;
    case 6:
      channels = 4;
      break;
    default:
      return null;
  }
  return channels * bitDepth;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  if (pb <= pc) {
    return b;
  }
  return c;
}

function decodePngScanlines(
  inflated: Buffer,
  rowByteLength: number,
  rowCount: number,
  bytesPerPixel: number,
): Buffer | null {
  const expectedLength = rowCount * (rowByteLength + 1);
  if (inflated.length !== expectedLength) {
    return null;
  }

  const decoded = Buffer.alloc(rowCount * rowByteLength);

  for (let row = 0; row < rowCount; row += 1) {
    const srcStart = row * (rowByteLength + 1);
    const filterType = inflated[srcStart];
    const srcRow = inflated.subarray(srcStart + 1, srcStart + 1 + rowByteLength);
    const dstStart = row * rowByteLength;

    switch (filterType) {
      case 0: {
        srcRow.copy(decoded, dstStart);
        break;
      }
      case 1: {
        for (let i = 0; i < rowByteLength; i += 1) {
          const left = i >= bytesPerPixel ? decoded[dstStart + i - bytesPerPixel] : 0;
          decoded[dstStart + i] = (srcRow[i] + left) & 0xff;
        }
        break;
      }
      case 2: {
        const prevStart = row > 0 ? (row - 1) * rowByteLength : -1;
        for (let i = 0; i < rowByteLength; i += 1) {
          const up = prevStart >= 0 ? decoded[prevStart + i] : 0;
          decoded[dstStart + i] = (srcRow[i] + up) & 0xff;
        }
        break;
      }
      case 3: {
        const prevStart = row > 0 ? (row - 1) * rowByteLength : -1;
        for (let i = 0; i < rowByteLength; i += 1) {
          const left = i >= bytesPerPixel ? decoded[dstStart + i - bytesPerPixel] : 0;
          const up = prevStart >= 0 ? decoded[prevStart + i] : 0;
          const avg = Math.floor((left + up) / 2);
          decoded[dstStart + i] = (srcRow[i] + avg) & 0xff;
        }
        break;
      }
      case 4: {
        const prevStart = row > 0 ? (row - 1) * rowByteLength : -1;
        for (let i = 0; i < rowByteLength; i += 1) {
          const left = i >= bytesPerPixel ? decoded[dstStart + i - bytesPerPixel] : 0;
          const up = prevStart >= 0 ? decoded[prevStart + i] : 0;
          const upLeft =
            prevStart >= 0 && i >= bytesPerPixel
              ? decoded[prevStart + i - bytesPerPixel]
              : 0;
          const predictor = paethPredictor(left, up, upLeft);
          decoded[dstStart + i] = (srcRow[i] + predictor) & 0xff;
        }
        break;
      }
      default:
        return null;
    }
  }

  return decoded;
}

function encodePngRowsWithFilterNone(rows: Buffer, rowByteLength: number): Buffer {
  if (rowByteLength <= 0 || rows.length % rowByteLength !== 0) {
    return Buffer.alloc(0);
  }

  const rowCount = rows.length / rowByteLength;
  const encoded = Buffer.alloc(rowCount * (rowByteLength + 1));
  for (let row = 0; row < rowCount; row += 1) {
    const dstStart = row * (rowByteLength + 1);
    encoded[dstStart] = 0;
    rows.copy(
      encoded,
      dstStart + 1,
      row * rowByteLength,
      row * rowByteLength + rowByteLength,
    );
  }
  return encoded;
}

function buildPngWithUpdatedImageData(
  parsed: ParsedPng,
  newHeight: number,
  compressedIdat: Buffer,
): Buffer {
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(parsed.width, 0);
  ihdrData.writeUInt32BE(newHeight, 4);
  ihdrData.writeUInt8(parsed.bitDepth, 8);
  ihdrData.writeUInt8(parsed.colorType, 9);
  ihdrData.writeUInt8(parsed.compressionMethod, 10);
  ihdrData.writeUInt8(parsed.filterMethod, 11);
  ihdrData.writeUInt8(parsed.interlaceMethod, 12);

  const parts: Buffer[] = [PNG_SIGNATURE, encodePngChunk("IHDR", ihdrData)];

  let insertedIdat = false;
  for (const chunk of parsed.chunks) {
    if (chunk.type === "IHDR" || chunk.type === "IEND") {
      continue;
    }

    if (chunk.type === "IDAT") {
      if (!insertedIdat) {
        parts.push(encodePngChunk("IDAT", compressedIdat));
        insertedIdat = true;
      }
      continue;
    }

    parts.push(encodePngChunk(chunk.type, chunk.data));
  }

  if (!insertedIdat) {
    parts.push(encodePngChunk("IDAT", compressedIdat));
  }

  parts.push(encodePngChunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const int = Math.trunc(value);
  return int > 0 ? int : null;
}

function getFirstAnimationFrameIndex(meta: AnimationMeta): number {
  const frames = meta.animation?.frames;
  if (!Array.isArray(frames) || frames.length === 0) {
    return 0;
  }

  const firstFrame = frames[0];
  if (typeof firstFrame === "number" && Number.isFinite(firstFrame)) {
    return Math.max(0, Math.trunc(firstFrame));
  }

  if (isRecord(firstFrame)) {
    const index = firstFrame.index;
    if (typeof index === "number" && Number.isFinite(index)) {
      return Math.max(0, Math.trunc(index));
    }
  }

  return 0;
}

function cropAnimatedPngToSingleFrame(
  textureBytes: Buffer,
  animationMeta: AnimationMeta,
): Buffer {
  const parsed = parsePng(textureBytes);
  if (!parsed || !animationMeta.animation) {
    return textureBytes;
  }

  if (
    parsed.compressionMethod !== 0 ||
    parsed.filterMethod !== 0 ||
    parsed.interlaceMethod !== 0
  ) {
    return textureBytes;
  }

  const frameWidth = toPositiveInteger(animationMeta.animation.width) ?? parsed.width;
  const frameHeight =
    toPositiveInteger(animationMeta.animation.height) ??
    toPositiveInteger(animationMeta.animation.width) ??
    parsed.width;

  // Keep complex atlas layouts untouched; this handles the common vertical strip case.
  if (frameWidth !== parsed.width) {
    return textureBytes;
  }
  if (frameHeight <= 0 || frameHeight >= parsed.height) {
    return textureBytes;
  }

  const frameCount = Math.floor(parsed.height / frameHeight);
  if (frameCount <= 1) {
    return textureBytes;
  }

  const firstFrameIndex = Math.min(getFirstAnimationFrameIndex(animationMeta), frameCount - 1);
  const firstFrameRow = firstFrameIndex * frameHeight;

  const bitsPerPixel = bitsPerPixelForPng(parsed.colorType, parsed.bitDepth);
  if (!bitsPerPixel) {
    return textureBytes;
  }

  const rowByteLength = Math.ceil((parsed.width * bitsPerPixel) / 8);
  const bytesPerPixelForFilter = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const inflated = inflateSync(parsed.idatData);
  const decodedRows = decodePngScanlines(
    inflated,
    rowByteLength,
    parsed.height,
    bytesPerPixelForFilter,
  );
  if (!decodedRows) {
    return textureBytes;
  }

  const frameRows = Buffer.alloc(rowByteLength * frameHeight);
  for (let row = 0; row < frameHeight; row += 1) {
    const sourceOffset = (firstFrameRow + row) * rowByteLength;
    const destinationOffset = row * rowByteLength;
    decodedRows.copy(frameRows, destinationOffset, sourceOffset, sourceOffset + rowByteLength);
  }

  const encodedFrameRows = encodePngRowsWithFilterNone(frameRows, rowByteLength);
  const compressedFrameRows = deflateSync(encodedFrameRows);

  return buildPngWithUpdatedImageData(parsed, frameHeight, compressedFrameRows);
}

async function loadTextureAnimationMeta(textureRef: string): Promise<AnimationMeta | null> {
  const cached = textureMetaCache.get(textureRef);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const raw = await readTextAssetOptional(textureRefToMcmetaAssetPath(textureRef));
    if (raw === null) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) {
        return null;
      }
      return parsed as AnimationMeta;
    } catch {
      return null;
    }
  })();

  textureMetaCache.set(textureRef, promise);
  return promise;
}

async function normalizeTextureBytes(textureRef: string, textureBytes: Buffer): Promise<Buffer> {
  const meta = await loadTextureAnimationMeta(textureRef);
  if (!meta?.animation) {
    return textureBytes;
  }

  try {
    return cropAnimatedPngToSingleFrame(textureBytes, meta);
  } catch {
    return textureBytes;
  }
}

async function fetchItemIndex(): Promise<ItemIndex> {
  const aggregatedRaw = await readTextAssetOptional(ITEM_INDEX_ASSET_PATH);
  if (aggregatedRaw !== null) {
    const parsed: unknown = JSON.parse(aggregatedRaw);
    if (!isRecord(parsed)) {
      throw new Error("Item index did not decode to an object");
    }
    return parsed as ItemIndex;
  }

  if (!activeAssetsRoot) {
    throw new Error("Asset root is not initialized");
  }

  const itemsDirectoryPath = path.join(activeAssetsRoot, ITEMS_DIRECTORY_ASSET_PATH);
  const entries = await readdir(itemsDirectoryPath, { withFileTypes: true });

  const itemIndex: ItemIndex = {};
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const itemId = entry.name.slice(0, -".json".length);
    const jsonPath = path.join(ITEMS_DIRECTORY_ASSET_PATH, entry.name);
    const raw = await readRequiredTextAsset(jsonPath);
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      continue;
    }
    itemIndex[itemId] = parsed;
  }

  if (Object.keys(itemIndex).length === 0) {
    throw new Error(`No item definitions were found in ${itemsDirectoryPath}`);
  }

  return itemIndex;
}

function collectCandidates(node: unknown, out: Candidate[]): void {
  if (Array.isArray(node)) {
    for (const value of node) {
      collectCandidates(value, out);
    }
    return;
  }

  if (!isRecord(node)) {
    return;
  }

  const typeValue = typeof node.type === "string" ? node.type : null;
  if (typeValue === "minecraft:model" && typeof node.model === "string") {
    out.push({ kind: "model", ref: node.model });
  }
  if (typeValue === "minecraft:special" && typeof node.base === "string") {
    out.push({ kind: "model", ref: node.base });
  }
  if (typeof node.texture === "string") {
    out.push({ kind: "texture", ref: node.texture });
  }

  const preferredKeyOrder = [
    "fallback",
    "on_false",
    "model",
    "on_true",
    "cases",
    "entries",
    "models",
  ];
  const traversedKeys = new Set<string>();

  for (const key of preferredKeyOrder) {
    if (key in node) {
      traversedKeys.add(key);
      collectCandidates(node[key], out);
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (traversedKeys.has(key) || key === "type" || key === "texture") {
      continue;
    }
    collectCandidates(value, out);
  }
}

function dedupeCandidates(candidates: Candidate[]): Candidate[] {
  const deduped: Candidate[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const signature = `${candidate.kind}:${candidate.ref}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(candidate);
  }

  return deduped;
}

async function loadModel(modelRef: string): Promise<ModelFile | null> {
  const cached = modelCache.get(modelRef);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const raw = await readTextAssetOptional(modelRefToAssetPath(modelRef));
    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }

    return parsed as ModelFile;
  })();

  modelCache.set(modelRef, promise);
  return promise;
}

async function loadMergedTextureMap(
  modelRef: string,
  stack = new Set<string>(),
): Promise<Record<string, string>> {
  if (stack.has(modelRef)) {
    return {};
  }

  const cached = textureMapCache.get(modelRef);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const nextStack = new Set(stack);
    nextStack.add(modelRef);

    const model = await loadModel(modelRef);
    if (!model) {
      return {};
    }

    let inheritedTextures: Record<string, string> = {};
    if (typeof model.parent === "string") {
      inheritedTextures = await loadMergedTextureMap(model.parent, nextStack);
    }

    const ownTextures: Record<string, string> = {};
    if (isRecord(model.textures)) {
      for (const [key, value] of Object.entries(model.textures)) {
        if (typeof value === "string") {
          ownTextures[key] = value;
        }
      }
    }

    return { ...inheritedTextures, ...ownTextures };
  })();

  textureMapCache.set(modelRef, promise);
  return promise;
}

function resolveTextureAlias(
  textureMap: Record<string, string>,
  rawTextureValue: string,
): string | null {
  let current = rawTextureValue;
  const visitedKeys = new Set<string>();

  while (current.startsWith("#")) {
    const key = current.slice(1);
    if (visitedKeys.has(key)) {
      return null;
    }
    visitedKeys.add(key);

    const nextValue = textureMap[key];
    if (typeof nextValue !== "string") {
      return null;
    }
    current = nextValue;
  }

  return current;
}

function pickTextureFromMap(textureMap: Record<string, string>): string | null {
  for (const key of PREFERRED_TEXTURE_KEYS) {
    const value = textureMap[key];
    if (typeof value !== "string") {
      continue;
    }

    const resolved = resolveTextureAlias(textureMap, value);
    if (resolved) {
      return resolved;
    }
  }

  for (const value of Object.values(textureMap)) {
    if (typeof value !== "string") {
      continue;
    }

    const resolved = resolveTextureAlias(textureMap, value);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

async function resolveTextureFromModel(modelRef: string): Promise<string | null> {
  const textureMap = await loadMergedTextureMap(modelRef);
  return pickTextureFromMap(textureMap);
}

async function readTextureBuffer(textureRef: string): Promise<Buffer | null> {
  const cached = textureBufferCache.get(textureRef);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const rawBytes = await readBinaryAssetOptional(textureRefToAssetPath(textureRef));
    if (!rawBytes) {
      return null;
    }
    return normalizeTextureBytes(textureRef, rawBytes);
  })();
  textureBufferCache.set(textureRef, promise);
  return promise;
}

async function resolveItemTexture(
  itemId: string,
  itemDefinition: Record<string, unknown>,
): Promise<{ textureRef: string; sourceModel: string | null; bytes: Buffer } | null> {
  const rawCandidates: Candidate[] = [];
  collectCandidates(itemDefinition.model, rawCandidates);
  const candidates = dedupeCandidates(rawCandidates);

  for (const candidate of candidates) {
    if (candidate.kind === "texture") {
      const bytes = await readTextureBuffer(candidate.ref);
      if (bytes) {
        return { textureRef: candidate.ref, sourceModel: null, bytes };
      }
      continue;
    }

    const resolvedTexture = await resolveTextureFromModel(candidate.ref);
    if (!resolvedTexture) {
      continue;
    }

    const bytes = await readTextureBuffer(resolvedTexture);
    if (bytes) {
      return {
        textureRef: resolvedTexture,
        sourceModel: candidate.ref,
        bytes,
      };
    }
  }

  const fallbackTextureRef = `minecraft:item/${itemId}`;
  const fallbackBytes = await readTextureBuffer(fallbackTextureRef);
  if (fallbackBytes) {
    return {
      textureRef: fallbackTextureRef,
      sourceModel: null,
      bytes: fallbackBytes,
    };
  }

  return null;
}

async function mapWithConcurrency<T>(
  values: T[],
  limit: number,
  worker: (value: T, index: number) => Promise<void>,
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(limit, values.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;

        if (index >= values.length) {
          return;
        }

        await worker(values[index], index);
      }
    }),
  );
}

async function ensureAssetsExtractedFromJar(
  jarPath: string,
  cacheVersionRoot: string,
): Promise<string> {
  const assetsRoot = path.join(cacheVersionRoot, "assets-extracted");
  const extractedItemsDirectoryPath = path.join(assetsRoot, ITEMS_DIRECTORY_ASSET_PATH);

  if (await pathExists(extractedItemsDirectoryPath)) {
    return assetsRoot;
  }

  await mkdir(assetsRoot, { recursive: true });
  console.log(`Extracting assets/ from ${jarPath}...`);
  await runExec("jar", ["xf", jarPath, "assets"], {
    cwd: assetsRoot,
    maxBuffer: 256 * 1024 * 1024,
  });

  if (!(await pathExists(extractedItemsDirectoryPath))) {
    throw new Error(
      `Assets were extracted, but ${ITEMS_DIRECTORY_ASSET_PATH} was not found in ${assetsRoot}`,
    );
  }

  return assetsRoot;
}

function toOutputItem(
  itemId: string,
  texture: { texturePath: string | null; sourceTexture: string | null; sourceModel: string | null },
  parsedItem: ParsedItem | null,
): OutputItem {
  return {
    id: itemId,
    texturePath: texture.texturePath,
    sourceTexture: texture.sourceTexture,
    sourceModel: texture.sourceModel,
    registration: parsedItem?.registration ?? null,
    blockField: parsedItem?.blockField ?? null,
    itemFactory: parsedItem?.itemFactory ?? null,
    propertiesExpression: parsedItem?.propertiesExpression ?? null,
    maxStackSize: parsedItem?.maxStackSize ?? null,
    maxDamage: parsedItem?.maxDamage ?? null,
    rarity: parsedItem?.rarity ?? null,
    fireResistant: parsedItem?.fireResistant ?? null,
    foodReference: parsedItem?.foodReference ?? null,
    propertyCalls: parsedItem?.propertyCalls ?? [],
    blockLoot: parsedItem?.blockLoot ?? null,
  };
}

async function main(): Promise<void> {
  const { itemsJavaSource, blocksJavaSource, sourceInfo, jarPath, cacheVersionRoot } =
    await loadJavaSources();

  if (!activeAssetsRoot) {
    if (!jarPath || !cacheVersionRoot) {
      throw new Error(
        "Jar-backed asset extraction requires decompiled source mode (local Java overrides are unsupported for fetch:items).",
      );
    }
    activeAssetsRoot = await ensureAssetsExtractedFromJar(jarPath, cacheVersionRoot);
  }

  console.log(`Using local assets from ${activeAssetsRoot}`);

  const parsedBlocks = parseBlocks(blocksJavaSource);
  const blockMap = new Map(parsedBlocks.map((block) => [block.fieldName, block]));
  const parsedItems = parseItems(itemsJavaSource, blockMap);
  const parsedItemById = new Map(parsedItems.map((item) => [item.id, item]));

  const itemIndex = await fetchItemIndex();
  const itemIdsSet = new Set<string>([
    ...Object.keys(itemIndex),
    ...parsedItemById.keys(),
  ]);
  let itemIds = Array.from(itemIdsSet).sort();
  if (ITEM_LIMIT > 0) {
    itemIds = itemIds.slice(0, ITEM_LIMIT);
  }

  await mkdir(OUTPUT_ROOT, { recursive: true });
  await rm(OUTPUT_TEXTURE_ROOT, { recursive: true, force: true });
  await mkdir(OUTPUT_TEXTURE_ROOT, { recursive: true });

  const outputItems: OutputItem[] = new Array(itemIds.length);
  const missingTextureItems: string[] = [];

  let processedCount = 0;
  let texturedCount = 0;

  await mapWithConcurrency(itemIds, CONCURRENCY, async (itemId, index) => {
    const definition = itemIndex[itemId] ?? {};
    const resolved = await resolveItemTexture(itemId, definition);
    const parsedItem = parsedItemById.get(itemId) ?? null;

    if (resolved) {
      const textureFilename = `${itemId}.png`;
      await writeFile(path.join(OUTPUT_TEXTURE_ROOT, textureFilename), resolved.bytes);

      outputItems[index] = toOutputItem(
        itemId,
        {
          texturePath: `/items/textures/${textureFilename}`,
          sourceTexture: resolved.textureRef,
          sourceModel: resolved.sourceModel,
        },
        parsedItem,
      );
      texturedCount += 1;
    } else {
      outputItems[index] = toOutputItem(
        itemId,
        {
          texturePath: null,
          sourceTexture: null,
          sourceModel: null,
        },
        parsedItem,
      );
      missingTextureItems.push(itemId);
    }

    processedCount += 1;
    if (processedCount % 100 === 0 || processedCount === itemIds.length) {
      console.log(`Processed ${processedCount}/${itemIds.length} items...`);
    }
  });

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      ...sourceInfo,
      mode: "official-jar",
      assetRoot: activeAssetsRoot,
      itemIndexAssetPath: ITEM_INDEX_ASSET_PATH,
      itemDefinitionsDirectoryAssetPath: ITEMS_DIRECTORY_ASSET_PATH,
    },
    counts: {
      itemCount: itemIds.length,
      texturedItemCount: texturedCount,
      missingTextureItemCount: missingTextureItems.length,
      codeItemCount: parsedItems.length,
      itemsWithCodeDataCount: outputItems.filter((item) => item.registration !== null).length,
      blockCount: parsedBlocks.length,
      noLootTableBlockCount: parsedBlocks.filter((block) => block.loot.noLootTable).length,
      overrideLootTableBlockCount: parsedBlocks.filter(
        (block) => block.loot.overrideLootTable !== null,
      ).length,
    },
    items: outputItems,
  };

  await writeFile(OUTPUT_INDEX_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUTPUT_INDEX_PATH}`);
  console.log(`Wrote ${texturedCount} textures to ${OUTPUT_TEXTURE_ROOT}`);

  if (missingTextureItems.length > 0) {
    const sample = missingTextureItems.slice(0, 12).join(", ");
    const suffix = missingTextureItems.length > 12 ? ", ..." : "";
    console.warn(
      `Missing texture for ${missingTextureItems.length} items: ${sample}${suffix}`,
    );
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

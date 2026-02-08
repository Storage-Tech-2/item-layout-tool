import { withBasePath } from "../base-path";
import type { CatalogItem, HallConfig, HallId } from "../types";
import { buildSlotCenters } from "./layoutGeometry";

export type LayoutExportMode = "containers" | "item_frames" | "blocks_and_frames";

export type LayoutExportOption = {
  mode: LayoutExportMode;
  label: string;
  description: string;
  fileSuffix: string;
};

export const LITEMATIC_EXPORT_OPTIONS: readonly LayoutExportOption[] = [
  {
    mode: "containers",
    label: "Litematic: Containers",
    description: "Each slot is a barrel containing the assigned item.",
    fileSuffix: "containers",
  },
  {
    mode: "item_frames",
    label: "Litematic: Item Frames",
    description: "Each slot is shown as an item frame on a support block.",
    fileSuffix: "item-frames",
  },
  {
    mode: "blocks_and_frames",
    label: "Litematic: Blocks + Frames",
    description: "Place block items as blocks, and non-blocks as item frames.",
    fileSuffix: "blocks-and-frames",
  },
] as const;

type LayoutLitematicExportInput = {
  mode: LayoutExportMode;
  layoutName: string;
  hallConfigs: Record<HallId, HallConfig>;
  slotAssignments: Record<string, string>;
  itemById: Map<string, CatalogItem>;
};

type LayoutLitematicExportResult = {
  bytes: Uint8Array;
  option: LayoutExportOption;
};

type ExportSlotEntry = {
  slotId: string;
  itemId: string;
  isBlock: boolean;
  x: number;
  z: number;
  misGroupKey: string | null;
  misSlotIndex: number | null;
};

type NucleationSchematicWrapper = {
  setName?: (name: string) => void;
  setAuthor?: (author: string) => void;
  setDescription?: (description: string) => void;
  setCreated?: (created: number) => void;
  setModified?: (modified: number) => void;
  set_block?: (x: number, y: number, z: number, blockName: string) => void;
  set_block_from_string?: (x: number, y: number, z: number, blockState: string) => void;
  addContainerItem?: (
    blockId: string,
    x: number,
    y: number,
    z: number,
    itemId: string,
    slot: number,
    count: number,
  ) => void;
  addItemFrameEntity?: (
    itemId: string,
    supportX: number,
    supportY: number,
    supportZ: number,
    facing: number,
    itemRotation: number,
    fixed: boolean,
  ) => void;
  addEntity?: (id: string, x: number, y: number, z: number, nbt: unknown) => void;
  addBlockEntity?: (id: string, x: number, y: number, z: number, nbt: unknown) => void;
  to_litematic?: () => Uint8Array | number[];
};

type NucleationModule = {
  default: () => Promise<unknown>;
  SchematicWrapper: new () => NucleationSchematicWrapper;
};

let nucleationModulePromise: Promise<NucleationModule> | null = null;

export async function exportLayoutAsLitematic(
  input: LayoutLitematicExportInput,
): Promise<LayoutLitematicExportResult> {
  const option = resolveExportOption(input.mode);
  const slotEntries = buildExportSlotEntries(input.hallConfigs, input.slotAssignments, input.itemById);
  if (slotEntries.length === 0) {
    throw new Error("No assigned items found to export.");
  }

  const nucleationModule = await loadNucleationModule();
  if (typeof nucleationModule.SchematicWrapper !== "function") {
    throw new Error("Nucleation module loaded, but SchematicWrapper is unavailable.");
  }

  const schematic = new nucleationModule.SchematicWrapper();
  applyMetadata(schematic, input.layoutName, option);

  switch (input.mode) {
    case "containers":
      writeContainerLayout(schematic, slotEntries);
      break;
    case "item_frames":
      writeItemFrameLayout(schematic, slotEntries);
      break;
    case "blocks_and_frames":
      writeBlocksAndFramesLayout(schematic, slotEntries);
      break;
    default:
      throw new Error("Unknown litematic export mode.");
  }

  const rawBytes = schematic.to_litematic?.();
  if (!rawBytes) {
    throw new Error("Nucleation SchematicWrapper is missing to_litematic().");
  }

  return {
    bytes: rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes),
    option,
  };
}

async function loadNucleationModule(): Promise<NucleationModule> {
  if (!nucleationModulePromise) {
    nucleationModulePromise = loadNucleationModuleInternal().catch((error) => {
      nucleationModulePromise = null;
      throw error;
    });
  }
  return nucleationModulePromise;
}

async function loadNucleationModuleInternal(): Promise<NucleationModule> {
  if (typeof window === "undefined") {
    throw new Error("Litematic export is only available in the browser.");
  }

  const candidatePaths = [
    withBasePath("/nucleation/pkg/nucleation.js"),
    "/nucleation/pkg/nucleation.js",
  ];

  let lastError: unknown = null;

  for (const candidatePath of candidatePaths) {
    const moduleUrl = new URL(candidatePath, window.location.origin).toString();
    try {
      const loadedModule = (await import(/* webpackIgnore: true */ moduleUrl)) as NucleationModule;
      await loadedModule.default();
      return loadedModule;
    } catch (error) {
      lastError = error;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown");
  throw new Error(
    `Could not load Nucleation WASM module (${detail}). Build Nucleation and copy the generated pkg directory to public/nucleation/pkg.`,
  );
}

function resolveExportOption(mode: LayoutExportMode): LayoutExportOption {
  const option = LITEMATIC_EXPORT_OPTIONS.find((entry) => entry.mode === mode);
  if (!option) {
    throw new Error(`Unsupported export mode: ${mode}`);
  }
  return option;
}

function applyMetadata(
  schematic: NucleationSchematicWrapper,
  layoutName: string,
  option: LayoutExportOption,
): void {
  const now = Date.now();
  const resolvedName = layoutName.trim().length > 0 ? layoutName.trim() : "Untitled Layout";
  schematic.setName?.(resolvedName);
  schematic.setAuthor?.("Storage Catalog");
  schematic.setDescription?.(option.description);
  schematic.setCreated?.(now);
  schematic.setModified?.(now);
}

function writeContainerLayout(
  schematic: NucleationSchematicWrapper,
  entries: ExportSlotEntry[],
): void {
  const nonMisEntries = writeMisAsDoubleChests(schematic, entries);
  for (const entry of nonMisEntries) {
    setBlockState(schematic, entry.x, 0, entry.z, "minecraft:barrel[facing=up]");

    if (typeof schematic.addContainerItem !== "function") {
      throw new Error("Nucleation module is missing addContainerItem(). Rebuild your WASM package.");
    }
    schematic.addContainerItem("minecraft:barrel", entry.x, 0, entry.z, toMinecraftId(entry.itemId), 0, 1);
  }
}

function writeItemFrameLayout(
  schematic: NucleationSchematicWrapper,
  entries: ExportSlotEntry[],
): void {
  const nonMisEntries = writeMisAsDoubleChests(schematic, entries);
  for (const entry of nonMisEntries) {
    placeItemFrameSlot(schematic, entry.x, 0, entry.z, entry.itemId);
  }
}

function writeBlocksAndFramesLayout(
  schematic: NucleationSchematicWrapper,
  entries: ExportSlotEntry[],
): void {
  const nonMisEntries = writeMisAsDoubleChests(schematic, entries);
  for (const entry of nonMisEntries) {
    if (entry.isBlock) {
      try {
        setBlockState(schematic, entry.x, 0, entry.z, toMinecraftId(entry.itemId));
        continue;
      } catch {
        // Fall back to item-frame export if the block state is not placeable.
      }
    }

    placeItemFrameSlot(schematic, entry.x, 0, entry.z, entry.itemId);
  }
}

function placeItemFrameSlot(
  schematic: NucleationSchematicWrapper,
  x: number,
  y: number,
  z: number,
  itemId: string,
): void {
  if (! schematic.addItemFrameEntity) {
    throw new Error("Nucleation module is missing addItemFrameEntity(). Rebuild your WASM package.");
  }
  schematic.addItemFrameEntity(toMinecraftId(itemId), x, y, z, 1, 0, true);
}

function setBlockState(
  schematic: NucleationSchematicWrapper,
  x: number,
  y: number,
  z: number,
  blockState: string,
): void {
  if (typeof schematic.set_block_from_string === "function") {
    schematic.set_block_from_string(x, y, z, blockState);
    return;
  }
  if (typeof schematic.set_block === "function") {
    schematic.set_block(x, y, z, blockState);
    return;
  }
  throw new Error("Nucleation SchematicWrapper is missing block placement APIs.");
}

function writeMisAsDoubleChests(
  schematic: NucleationSchematicWrapper,
  entries: ExportSlotEntry[],
): ExportSlotEntry[] {
  const misGroups = new Map<string, ExportSlotEntry[]>();
  const nonMisEntries: ExportSlotEntry[] = [];

  for (const entry of entries) {
    if (!entry.misGroupKey || entry.misSlotIndex === null) {
      nonMisEntries.push(entry);
      continue;
    }
    const current = misGroups.get(entry.misGroupKey);
    if (current) {
      current.push(entry);
    } else {
      misGroups.set(entry.misGroupKey, [entry]);
    }
  }

  for (const groupEntries of misGroups.values()) {
    placeMisGroupAsDoubleChests(schematic, groupEntries);
  }

  return nonMisEntries;
}

function placeMisGroupAsDoubleChests(
  schematic: NucleationSchematicWrapper,
  entries: ExportSlotEntry[],
): void {
  if (entries.length === 0) {
    return;
  }

  const anchorX = Math.min(...entries.map((entry) => entry.x));
  const anchorZ = Math.min(...entries.map((entry) => entry.z));
  const sorted = [...entries].sort((a, b) => {
    const aSlot = a.misSlotIndex ?? 0;
    const bSlot = b.misSlotIndex ?? 0;
    return aSlot - bSlot;
  });

  type ChestItems = Array<{ id: string; slot: number }>;
  const chestItems = new Map<string, ChestItems>();

  for (const entry of sorted) {
    const logicalSlot = entry.misSlotIndex ?? 0;
    const pairIndex = Math.floor(logicalSlot / 54);
    const pairSlot = logicalSlot % 54;
    const chestX = anchorX;
    const chestZ = anchorZ + pairIndex * 2;

    // Double chest (east-west): left at chestX, right at chestX+1
    setBlockState(
      schematic,
      chestX,
      0,
      chestZ,
      "minecraft:chest[facing=north,type=left,waterlogged=false]",
    );
    setBlockState(
      schematic,
      chestX + 1,
      0,
      chestZ,
      "minecraft:chest[facing=north,type=right,waterlogged=false]",
    );

    if (pairSlot < 27) {
      const key = `${chestX},${chestZ}`;
      const current = chestItems.get(key) ?? [];
      current.push({ id: toMinecraftId(entry.itemId), slot: pairSlot });
      chestItems.set(key, current);
    } else {
      const key = `${chestX + 1},${chestZ}`;
      const current = chestItems.get(key) ?? [];
      current.push({ id: toMinecraftId(entry.itemId), slot: pairSlot - 27 });
      chestItems.set(key, current);
    }
  }

  if (typeof schematic.addBlockEntity === "function") {
    for (const [key, items] of chestItems.entries()) {
      const [rawX, rawZ] = key.split(",");
      const x = Number(rawX);
      const z = Number(rawZ);
      schematic.addBlockEntity("minecraft:chest", x, 0, z, {
        Items: items.map((item) => ({
          id: item.id,
          count: 1,
          Slot: item.slot,
        })),
      });
      console.log(`Placed chest at (${x}, 0, ${z}) with items:`, items);
    }
    return;
  }

  throw new Error(
    "Nucleation module is missing addBlockEntity()/addContainerItem(). Rebuild your WASM package.",
  );
}

function toMinecraftId(itemId: string): string {
  return itemId.includes(":") ? itemId : `minecraft:${itemId}`;
}

function parseMisSlotMetadata(slotId: string): { groupKey: string; slotIndex: number } | null {
  const parts = slotId.split(":");
  // MIS format: hallId:m:slice:side:misUnit:index
  if (parts.length !== 6 || parts[1] !== "m") {
    return null;
  }

  const slotIndex = Number(parts[5]);
  if (!Number.isInteger(slotIndex) || slotIndex < 0) {
    return null;
  }

  return {
    groupKey: `${parts[0]}:m:${parts[2]}:${parts[3]}:${parts[4]}`,
    slotIndex,
  };
}

function buildExportSlotEntries(
  hallConfigs: Record<HallId, HallConfig>,
  slotAssignments: Record<string, string>,
  itemById: Map<string, CatalogItem>,
): ExportSlotEntry[] {
  const slotCenters = buildSlotCenters(hallConfigs);
  const raw: Array<{
    slotId: string;
    itemId: string;
    xKey: number;
    yKey: number;
    isBlock: boolean;
  }> = [];

  for (const [slotId, itemId] of Object.entries(slotAssignments)) {
    if (!itemId) {
      continue;
    }
    const center = slotCenters.get(slotId);
    if (!center) {
      continue;
    }

    const xKey = Math.round(center.x * 1000);
    const yKey = Math.round(center.y * 1000);
    const catalogItem = itemById.get(itemId);
    const misMetadata = parseMisSlotMetadata(slotId);
    raw.push({
      slotId,
      itemId,
      xKey,
      yKey,
      isBlock: catalogItem?.registration === "block",
      misGroupKey: misMetadata?.groupKey ?? null,
      misSlotIndex: misMetadata?.slotIndex ?? null,
    });
  }

  if (raw.length === 0) {
    return [];
  }

  // Build the coordinate grid from all planner slots (not only assigned ones)
  // so empty user gaps remain empty in the exported schematic.
  const allSlotCenters = Array.from(slotCenters.values());
  const xKeys = Array.from(new Set(allSlotCenters.map((center) => Math.round(center.x * 1000)))).sort(
    (a, b) => a - b,
  );
  const yKeys = Array.from(new Set(allSlotCenters.map((center) => Math.round(center.y * 1000)))).sort(
    (a, b) => a - b,
  );
  const xIndex = new Map(xKeys.map((value, index) => [value, index]));
  const yIndex = new Map(yKeys.map((value, index) => [value, index]));

  const spacing = 1;

  return raw
    .map((entry) => ({
      slotId: entry.slotId,
      itemId: entry.itemId,
      isBlock: entry.isBlock,
      x: (xIndex.get(entry.xKey) ?? 0) * spacing,
      z: (yIndex.get(entry.yKey) ?? 0) * spacing,
      misGroupKey: entry.misGroupKey,
      misSlotIndex: entry.misSlotIndex,
    }))
    .sort((a, b) => (a.z === b.z ? a.x - b.x : a.z - b.z));
}

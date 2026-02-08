import {
  AISLE_GAP,
  COLOR_INDEX,
  COLOR_PREFIXES,
  HALL_ORDER,
  MIS_CROSS,
  SLOT_GAP,
  SLOT_SIZE,
  WOOD_INDEX,
  WOOD_PREFIXES,
} from "./constants";
import type {
  CatalogItem,
  Category,
  DragPayload,
  FillDirection,
  HallConfig,
  HallId,
  HallOrientation,
  HallSideConfig,
} from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function toTitle(input: string): string {
  return input
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function startsWithVariantPrefix(
  id: string,
  prefixes: readonly string[],
): string | null {
  const ordered = [...prefixes].sort((a, b) => b.length - a.length);
  for (const prefix of ordered) {
    if (id === prefix || id.startsWith(`${prefix}_`)) {
      return prefix;
    }
  }
  return null;
}

type CustomCategoryMatch = {
  id: string;
  label: string;
  dragLabel: string;
};

function matchCustomMaterialCategory(itemId: string): CustomCategoryMatch | null {
  if (/(^|_)nether_brick(s)?($|_)/.test(itemId)) {
    return {
      id: "collection:nether_bricks",
      label: "Nether Brick",
      dragLabel: "nether brick set",
    };
  }

  if (/(^|_)sandstone($|_)/.test(itemId)) {
    return {
      id: "collection:sandstone",
      label: "Sandstone",
      dragLabel: "sandstone set",
    };
  }

  if (/(^|_)ice($|_)/.test(itemId)) {
    return {
      id: "collection:ice",
      label: "Ice",
      dragLabel: "ice set",
    };
  }

  if (/(^|_)bamboo($|_)/.test(itemId)) {
    return {
      id: "collection:bamboo",
      label: "Bamboo",
      dragLabel: "bamboo set",
    };
  }

  if (/(^|_)copper($|_)/.test(itemId)) {
    return {
      id: "collection:copper",
      label: "Copper",
      dragLabel: "copper set",
    };
  }

  if (/(^|_)ore(s)?($|_)/.test(itemId)) {
    return {
      id: "collection:ores",
      label: "Ore",
      dragLabel: "ore set",
    };
  }

  if (/(^|_)dead_.*coral(s)?($|_)/.test(itemId)) {
    return {
      id: "collection:dead_coral",
      label: "Dead Coral",
      dragLabel: "dead coral set",
    };
  }

  if (/(^|_)coral(s)?($|_)/.test(itemId)) {
    return {
      id: "collection:coral",
      label: "Coral",
      dragLabel: "coral set",
    };
  }

  if (/(^|_)flowering_azalea($|_)/.test(itemId)) {
    return {
      id: "collection:flowering_azalea",
      label: "Flowering Azalea",
      dragLabel: "flowering azalea set",
    };
  }

  if (/(^|_)azalea($|_)/.test(itemId)) {
    return {
      id: "collection:azalea",
      label: "Azalea",
      dragLabel: "azalea set",
    };
  }

  return null;
}

function resolvePrimaryCreativeTab(item: CatalogItem): string {
  if (item.id.endsWith("sculk_sensor") && item.creativeTabs.includes("redstone_blocks")) {
    return "redstone_blocks";
  }

  return item.creativeTabs[0] ?? "uncategorized";
}

export function nonMisSlotId(
  hallId: HallId,
  slice: number,
  side: 0 | 1,
  row: number,
): string {
  return `${hallId}:g:${slice}:${side}:${row}`;
}

export function misSlotId(
  hallId: HallId,
  slice: number,
  side: 0 | 1,
  misUnit: number,
  index: number,
): string {
  return `${hallId}:m:${slice}:${side}:${misUnit}:${index}`;
}

export type HallSliceDescriptor = {
  globalSlice: number;
  sectionIndex: number;
  sectionSlice: number;
  mainStart: number;
  mainSize: number;
  sideLeft: HallSideConfig;
  sideRight: HallSideConfig;
};

function sideDepthPx(side: HallSideConfig): number {
  if (side.type === "mis") {
    return side.misUnitsPerSlice * MIS_CROSS + Math.max(0, side.misUnitsPerSlice - 1) * SLOT_GAP;
  }
  return side.rowsPerSlice * SLOT_SIZE + Math.max(0, side.rowsPerSlice - 1) * SLOT_GAP;
}

function sliceMainSize(): number {
  // Keep per-slice main width constant; MIS spans multiple slices via misWidth.
  return SLOT_SIZE;
}

export function resolveHallSlices(config: HallConfig): HallSliceDescriptor[] {
  const slices: HallSliceDescriptor[] = [];
  let mainCursor = 0;
  let globalSlice = 0;

  for (const [sectionIndex, section] of config.sections.entries()) {
    for (let sectionSlice = 0; sectionSlice < section.slices; sectionSlice += 1) {
      const mainSize = sliceMainSize();
      slices.push({
        globalSlice,
        sectionIndex,
        sectionSlice,
        mainStart: mainCursor,
        mainSize,
        sideLeft: section.sideLeft,
        sideRight: section.sideRight,
      });
      mainCursor += mainSize + SLOT_GAP;
      globalSlice += 1;
    }
  }

  return slices;
}

export function getHallSize(
  config: HallConfig,
  orientation: HallOrientation,
): { width: number; height: number } {
  const slices = resolveHallSlices(config);
  const main =
    slices.length === 0
      ? SLOT_SIZE
      : slices[slices.length - 1].mainStart + slices[slices.length - 1].mainSize;

  let maxLeftDepth = 0;
  let maxRightDepth = 0;
  for (const slice of slices) {
    maxLeftDepth = Math.max(maxLeftDepth, sideDepthPx(slice.sideLeft));
    maxRightDepth = Math.max(maxRightDepth, sideDepthPx(slice.sideRight));
  }
  const cross = maxLeftDepth + AISLE_GAP + maxRightDepth;

  if (orientation === "horizontal") {
    return { width: main, height: cross };
  }
  return { width: cross, height: main };
}

export function buildOrderedSlotIds(
  configs: Record<HallId, HallConfig>,
  fillDirection: FillDirection = "column",
): string[] {
  const ordered: string[] = [];

  for (const hallId of HALL_ORDER) {
    const hall = configs[hallId];
    const slices = resolveHallSlices(hall);

    for (const side of [0, 1] as const) {
      if (fillDirection === "row") {
        const nonMisSlices = slices
          .map((slice) => ({
            slice,
            sideConfig: side === 0 ? slice.sideLeft : slice.sideRight,
          }))
          .filter((entry) => entry.sideConfig.type !== "mis");
        const maxRows = nonMisSlices.reduce(
          (max, entry) => Math.max(max, entry.sideConfig.rowsPerSlice),
          0,
        );
        for (let row = 0; row < maxRows; row += 1) {
          for (const entry of nonMisSlices) {
            if (row >= entry.sideConfig.rowsPerSlice) {
              continue;
            }
            ordered.push(nonMisSlotId(hallId, entry.slice.globalSlice, side, row));
          }
        }
      } else {
        for (const slice of slices) {
          const sideConfig = side === 0 ? slice.sideLeft : slice.sideRight;
          if (sideConfig.type === "mis") {
            continue;
          }
          for (let row = 0; row < sideConfig.rowsPerSlice; row += 1) {
            ordered.push(nonMisSlotId(hallId, slice.globalSlice, side, row));
          }
        }
      }

      const seenMisSlices = new Set<number>();
      for (const slice of slices) {
        const sideConfig = side === 0 ? slice.sideLeft : slice.sideRight;
        if (sideConfig.type !== "mis") {
          continue;
        }
        const misWidth = Math.max(1, sideConfig.misWidth);
        const misSlice = slice.globalSlice - (slice.sectionSlice % misWidth);
        if (seenMisSlices.has(misSlice)) {
          continue;
        }
        seenMisSlices.add(misSlice);
        for (let misUnit = 0; misUnit < sideConfig.misUnitsPerSlice; misUnit += 1) {
          for (let index = 0; index < sideConfig.misSlotsPerSlice; index += 1) {
            ordered.push(misSlotId(hallId, misSlice, side, misUnit, index));
          }
        }
      }
    }
  }

  return ordered;
}

export function parseDragPayload(rawPayload: string): DragPayload | null {
  if (!rawPayload) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawPayload);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("kind" in parsed) ||
      !("itemIds" in parsed) ||
      !Array.isArray((parsed as { itemIds?: unknown }).itemIds)
    ) {
      return null;
    }

    const payload = parsed as DragPayload;
    if (payload.kind !== "item" && payload.kind !== "category") {
      return null;
    }

    const itemIds = payload.itemIds.filter(
      (entry): entry is string => typeof entry === "string",
    );

    if (itemIds.length === 0) {
      return null;
    }

    return {
      kind: payload.kind,
      itemIds,
      source:
        payload.source === "layout" || payload.source === "catalog"
          ? payload.source
          : "catalog",
      originSlotId:
        typeof payload.originSlotId === "string" ? payload.originSlotId : undefined,
      sourceSlotIds: Array.isArray(payload.sourceSlotIds)
        ? payload.sourceSlotIds.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : undefined,
    };
  } catch {
    return null;
  }
}

export function buildCategories(items: CatalogItem[]): Category[] {
  const grouped = new Map<
    string,
    {
      label: string;
      dragLabel: string;
      items: CatalogItem[];
      sortMode: "color" | "wood" | "alpha";
    }
  >();

  const groupedItemIds = new Set<string>();

  for (const item of items) {
    const customCategory = matchCustomMaterialCategory(item.id);
    if (customCategory) {
      if (!grouped.has(customCategory.id)) {
        grouped.set(customCategory.id, {
          label: customCategory.label,
          dragLabel: customCategory.dragLabel,
          items: [],
          sortMode: "alpha",
        });
      }
      grouped.get(customCategory.id)?.items.push(item);
      groupedItemIds.add(item.id);
      continue;
    }

    const colorPrefix = startsWithVariantPrefix(item.id, COLOR_PREFIXES);
    if (colorPrefix) {
      const base = item.id.slice(colorPrefix.length + 1);
      const key = `color:${base}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          label: `${toTitle(base)} Colors`,
          dragLabel: `${toTitle(base)} color set`,
          items: [],
          sortMode: "color",
        });
      }
      grouped.get(key)?.items.push(item);
      groupedItemIds.add(item.id);
      continue;
    }

    const woodPrefix = startsWithVariantPrefix(item.id, WOOD_PREFIXES);
    if (woodPrefix) {
      const base = item.id.slice(woodPrefix.length + 1);
      const key = `wood:${base}`;
      const baseTitle = toTitle(base);
      const label = baseTitle === "Wood" ? "Wood Variants" : `${baseTitle} Wood Variants`;
      const dragLabel = baseTitle === "Wood" ? "wood set" : `${baseTitle.toLowerCase()} wood set`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          label,
          dragLabel,
          items: [],
          sortMode: "wood",
        });
      }
      grouped.get(key)?.items.push(item);
      groupedItemIds.add(item.id);
      continue;
    }

  }

  const categories: Category[] = [];

  for (const [id, bucket] of grouped.entries()) {
    if (bucket.sortMode === "color") {
      bucket.items.sort((a, b) => {
        const aPrefix = startsWithVariantPrefix(a.id, COLOR_PREFIXES) ?? "";
        const bPrefix = startsWithVariantPrefix(b.id, COLOR_PREFIXES) ?? "";
        return (COLOR_INDEX.get(aPrefix) ?? 999) - (COLOR_INDEX.get(bPrefix) ?? 999);
      });
    } else if (bucket.sortMode === "wood") {
      bucket.items.sort((a, b) => {
        const aPrefix = startsWithVariantPrefix(a.id, WOOD_PREFIXES) ?? "";
        const bPrefix = startsWithVariantPrefix(b.id, WOOD_PREFIXES) ?? "";
        return (WOOD_INDEX.get(aPrefix) ?? 999) - (WOOD_INDEX.get(bPrefix) ?? 999);
      });
    } else {
      bucket.items.sort((a, b) => a.id.localeCompare(b.id));
    }

    categories.push({
      id,
      label: bucket.label,
      items: bucket.items,
      dragLabel: bucket.dragLabel,
    });
  }

  const singlesByCreativeTab = new Map<string, CatalogItem[]>();
  for (const item of items) {
    if (groupedItemIds.has(item.id)) {
      continue;
    }

    const primaryCreativeTab = resolvePrimaryCreativeTab(item);
    if (!singlesByCreativeTab.has(primaryCreativeTab)) {
      singlesByCreativeTab.set(primaryCreativeTab, []);
    }
    singlesByCreativeTab.get(primaryCreativeTab)?.push(item);
  }

  const singleCategories: Category[] = [];
  for (const [tabId, tabItems] of singlesByCreativeTab.entries()) {
    tabItems.sort((a, b) => a.id.localeCompare(b.id));
    const tabLabel = tabId === "uncategorized" ? "Uncategorized" : toTitle(tabId);
    singleCategories.push({
      id: `tab:${tabId}`,
      label: tabLabel,
      items: tabItems,
      dragLabel: tabLabel,
    });
  }

  categories.sort((a, b) => a.label.localeCompare(b.label));
  singleCategories.sort((a, b) => a.label.localeCompare(b.label));

  return [...categories, ...singleCategories];
}

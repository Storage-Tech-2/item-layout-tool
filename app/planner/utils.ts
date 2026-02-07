import {
  AISLE_GAP,
  COLOR_INDEX,
  COLOR_PREFIXES,
  HALL_ORDER,
  MIS_CROSS,
  MIS_SLICE_MAIN,
  SLOT_GAP,
  SLOT_SIZE,
  WOOD_INDEX,
  WOOD_PREFIXES,
} from "./constants";
import type {
  CatalogItem,
  Category,
  DragPayload,
  HallConfig,
  HallId,
  HallOrientation,
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
  for (const prefix of prefixes) {
    if (id.startsWith(`${prefix}_`)) {
      return prefix;
    }
  }
  return null;
}

export function nonMisSlotId(
  hallId: HallId,
  slice: number,
  side: 0 | 1,
  row: number,
): string {
  return `${hallId}:g:${slice}:${side}:${row}`;
}

export function misSlotId(hallId: HallId, slice: number, index: number): string {
  return `${hallId}:m:${slice}:${index}`;
}

export function getHallSize(
  config: HallConfig,
  orientation: HallOrientation,
): { width: number; height: number } {
  if (config.type === "mis") {
    const main =
      config.slices * MIS_SLICE_MAIN + Math.max(0, config.slices - 1) * SLOT_GAP;
    if (orientation === "horizontal") {
      return { width: main, height: MIS_CROSS };
    }
    return { width: MIS_CROSS, height: main };
  }

  const main = config.slices * SLOT_SIZE + Math.max(0, config.slices - 1) * SLOT_GAP;
  const depth =
    config.rowsPerSide * SLOT_SIZE + Math.max(0, config.rowsPerSide - 1) * SLOT_GAP;

  if (orientation === "horizontal") {
    return { width: main, height: depth * 2 + AISLE_GAP };
  }

  return { width: depth * 2 + AISLE_GAP, height: main };
}

export function buildOrderedSlotIds(configs: Record<HallId, HallConfig>): string[] {
  const ordered: string[] = [];

  for (const hallId of HALL_ORDER) {
    const hall = configs[hallId];

    if (hall.type === "mis") {
      for (let slice = 0; slice < hall.slices; slice += 1) {
        for (let index = 0; index < hall.misSlotsPerSlice; index += 1) {
          ordered.push(misSlotId(hallId, slice, index));
        }
      }
      continue;
    }

    for (let slice = 0; slice < hall.slices; slice += 1) {
      for (const side of [0, 1] as const) {
        for (let row = 0; row < hall.rowsPerSide; row += 1) {
          ordered.push(nonMisSlotId(hallId, slice, side, row));
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
      if (!grouped.has(key)) {
        grouped.set(key, {
          label: `${toTitle(base)} Wood Variants`,
          dragLabel: `${toTitle(base)} wood set`,
          items: [],
          sortMode: "wood",
        });
      }
      grouped.get(key)?.items.push(item);
      groupedItemIds.add(item.id);
      continue;
    }

    if (item.id.endsWith("_spawn_egg")) {
      const key = "collection:spawn_eggs";
      if (!grouped.has(key)) {
        grouped.set(key, {
          label: "Spawn Eggs",
          dragLabel: "spawn eggs",
          items: [],
          sortMode: "alpha",
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

  const singlesByLetter = new Map<string, CatalogItem[]>();
  for (const item of items) {
    if (groupedItemIds.has(item.id)) {
      continue;
    }

    const letter = item.id.charAt(0).toUpperCase();
    const bucket = /^[A-Z]$/.test(letter) ? letter : "#";
    if (!singlesByLetter.has(bucket)) {
      singlesByLetter.set(bucket, []);
    }
    singlesByLetter.get(bucket)?.push(item);
  }

  const singleCategories: Category[] = [];
  for (const [letter, letterItems] of singlesByLetter.entries()) {
    letterItems.sort((a, b) => a.id.localeCompare(b.id));
    singleCategories.push({
      id: `letter:${letter}`,
      label: `Other ${letter}`,
      items: letterItems,
      dragLabel: `Other ${letter}`,
    });
  }

  categories.sort((a, b) => a.label.localeCompare(b.label));
  singleCategories.sort((a, b) => a.label.localeCompare(b.label));

  return [...categories, ...singleCategories];
}

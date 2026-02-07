"use client";

import Image from "next/image";
import {
  type DragEvent,
  type PointerEvent,
  type WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type HallId = "north" | "east" | "south" | "west";
type HallType = "bulk" | "chest" | "mis";
type HallOrientation = "horizontal" | "vertical";

type HallConfig = {
  type: HallType;
  slices: number;
  rowsPerSide: number;
  misSlotsPerSlice: number;
};

type CatalogItem = {
  id: string;
  texturePath: string;
};

type RawCatalogItem = {
  id: string;
  texturePath: string | null;
};

type CatalogResponse = {
  items: RawCatalogItem[];
};

type Category = {
  id: string;
  label: string;
  items: CatalogItem[];
  dragLabel: string;
};

type DragPayload = {
  kind: "item" | "category";
  itemIds: string[];
};

const HALL_ORDER: HallId[] = ["north", "east", "south", "west"];

const HALL_LABELS: Record<HallId, string> = {
  north: "North Hall",
  east: "East Hall",
  south: "South Hall",
  west: "West Hall",
};

const HALL_ORIENTATION: Record<HallId, HallOrientation> = {
  north: "vertical",
  east: "horizontal",
  south: "vertical",
  west: "horizontal",
};

const HALL_TYPE_DEFAULTS: Record<HallType, Pick<HallConfig, "rowsPerSide" | "misSlotsPerSlice">> = {
  bulk: {
    rowsPerSide: 1,
    misSlotsPerSlice: 54,
  },
  chest: {
    rowsPerSide: 4,
    misSlotsPerSlice: 54,
  },
  mis: {
    rowsPerSide: 4,
    misSlotsPerSlice: 54,
  },
};

const DEFAULT_HALLS: Record<HallId, HallConfig> = {
  north: {
    type: "bulk",
    slices: 10,
    rowsPerSide: 1,
    misSlotsPerSlice: 54,
  },
  east: {
    type: "chest",
    slices: 12,
    rowsPerSide: 4,
    misSlotsPerSlice: 54,
  },
  south: {
    type: "mis",
    slices: 4,
    rowsPerSide: 4,
    misSlotsPerSlice: 54,
  },
  west: {
    type: "chest",
    slices: 10,
    rowsPerSide: 4,
    misSlotsPerSlice: 54,
  },
};

const DRAG_DATA_KEY = "application/x-item-layout";

const STAGE_SIZE = 2200;
const CORE_SIZE = 170;
const HALL_GAP = 42;
const SLOT_SIZE = 34;
const SLOT_GAP = 4;
const AISLE_GAP = 20;
const MIS_SLICE_MAIN = 74;
const MIS_CROSS = 112;

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.8;

const COLOR_PREFIXES = [
  "light_blue",
  "light_gray",
  "white",
  "orange",
  "magenta",
  "yellow",
  "lime",
  "pink",
  "gray",
  "cyan",
  "purple",
  "blue",
  "brown",
  "green",
  "red",
  "black",
] as const;

const WOOD_PREFIXES = [
  "pale_oak",
  "dark_oak",
  "mangrove",
  "acacia",
  "spruce",
  "jungle",
  "cherry",
  "bamboo",
  "crimson",
  "warped",
  "birch",
  "oak",
] as const;

const COLOR_INDEX = new Map<string, number>(COLOR_PREFIXES.map((prefix, index) => [prefix, index]));
const WOOD_INDEX = new Map<string, number>(WOOD_PREFIXES.map((prefix, index) => [prefix, index]));

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toTitle(input: string): string {
  return input
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function startsWithVariantPrefix(id: string, prefixes: readonly string[]): string | null {
  for (const prefix of prefixes) {
    if (id.startsWith(`${prefix}_`)) {
      return prefix;
    }
  }
  return null;
}

function nonMisSlotId(hallId: HallId, slice: number, side: 0 | 1, row: number): string {
  return `${hallId}:g:${slice}:${side}:${row}`;
}

function misSlotId(hallId: HallId, slice: number, index: number): string {
  return `${hallId}:m:${slice}:${index}`;
}

function getHallSize(config: HallConfig, orientation: HallOrientation): { width: number; height: number } {
  if (config.type === "mis") {
    const main = config.slices * MIS_SLICE_MAIN + Math.max(0, config.slices - 1) * SLOT_GAP;
    if (orientation === "horizontal") {
      return { width: main, height: MIS_CROSS };
    }
    return { width: MIS_CROSS, height: main };
  }

  const main = config.slices * SLOT_SIZE + Math.max(0, config.slices - 1) * SLOT_GAP;
  const depth = config.rowsPerSide * SLOT_SIZE + Math.max(0, config.rowsPerSide - 1) * SLOT_GAP;

  if (orientation === "horizontal") {
    return { width: main, height: depth * 2 + AISLE_GAP };
  }
  return { width: depth * 2 + AISLE_GAP, height: main };
}

function buildOrderedSlotIds(configs: Record<HallId, HallConfig>): string[] {
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

function parseDragPayload(event: DragEvent<HTMLElement>): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_DATA_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "kind" in parsed &&
      "itemIds" in parsed &&
      (parsed as { kind?: unknown }).kind &&
      Array.isArray((parsed as { itemIds?: unknown }).itemIds)
    ) {
      const payload = parsed as DragPayload;
      if (payload.kind !== "item" && payload.kind !== "category") {
        return null;
      }

      const itemIds = payload.itemIds.filter((entry): entry is string => typeof entry === "string");
      if (itemIds.length === 0) {
        return null;
      }

      return {
        kind: payload.kind,
        itemIds,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function buildCategories(items: CatalogItem[]): Category[] {
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

export default function Home() {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [hallConfigs, setHallConfigs] = useState<Record<HallId, HallConfig>>(DEFAULT_HALLS);
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const didInitializePan = useRef(false);
  const panSessionRef = useRef<
    | {
        pointerId: number;
        lastX: number;
        lastY: number;
      }
    | null
  >(null);

  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 160, y: 110 });

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog(): Promise<void> {
      try {
        setIsLoadingCatalog(true);
        setCatalogError(null);

        const catalogUrls = ["/items/items.json", "/nextjs-github-pages/items/items.json"];
        let response: Response | null = null;

        for (const url of catalogUrls) {
          const attempt = await fetch(url);
          if (attempt.ok) {
            response = attempt;
            break;
          }
        }

        if (!response) {
          throw new Error("Failed to load item catalog from known paths");
        }

        const parsed: unknown = await response.json();
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !("items" in parsed) ||
          !Array.isArray((parsed as CatalogResponse).items)
        ) {
          throw new Error("Item catalog format is invalid");
        }

        const items = (parsed as CatalogResponse).items
          .filter((item) => typeof item.id === "string" && typeof item.texturePath === "string")
          .map((item) => ({
            id: item.id,
            texturePath: item.texturePath as string,
          }))
          .sort((a, b) => a.id.localeCompare(b.id));

        if (!cancelled) {
          setCatalogItems(items);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown catalog loading error";
          setCatalogError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCatalog(false);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (didInitializePan.current || !viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const centeredPan = {
      x: rect.width / 2 - (STAGE_SIZE / 2) * zoom,
      y: rect.height / 2 - (STAGE_SIZE / 2) * zoom,
    };

    setPan(centeredPan);
    didInitializePan.current = true;
  }, [zoom]);

  const orderedSlotIds = useMemo(() => buildOrderedSlotIds(hallConfigs), [hallConfigs]);

  const orderedSlotIdSet = useMemo(() => new Set(orderedSlotIds), [orderedSlotIds]);

  useEffect(() => {
    setSlotAssignments((current) => {
      let changed = false;
      const next: Record<string, string> = {};

      for (const [slotId, itemId] of Object.entries(current)) {
        if (orderedSlotIdSet.has(slotId)) {
          next[slotId] = itemId;
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [orderedSlotIdSet]);

  const itemById = useMemo(() => {
    return new Map(catalogItems.map((item) => [item.id, item]));
  }, [catalogItems]);

  const usedItemIds = useMemo(() => {
    const used = new Set<string>();
    for (const itemId of Object.values(slotAssignments)) {
      if (itemId) {
        used.add(itemId);
      }
    }
    return used;
  }, [slotAssignments]);

  const availableItems = useMemo(() => {
    return catalogItems.filter((item) => !usedItemIds.has(item.id));
  }, [catalogItems, usedItemIds]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    if (!normalizedSearch) {
      return availableItems;
    }

    return availableItems.filter((item) => {
      const label = toTitle(item.id).toLowerCase();
      return item.id.includes(normalizedSearch) || label.includes(normalizedSearch);
    });
  }, [availableItems, normalizedSearch]);

  const categories = useMemo(() => buildCategories(visibleItems), [visibleItems]);

  useEffect(() => {
    setCollapsedCategories((current) => {
      const next = { ...current };
      let changed = false;

      for (const category of categories) {
        if (!(category.id in next)) {
          next[category.id] = category.items.length > 20;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [categories]);

  function setHallType(hallId: HallId, nextType: HallType): void {
    setHallConfigs((current) => {
      const prev = current[hallId];
      const defaults = HALL_TYPE_DEFAULTS[nextType];
      return {
        ...current,
        [hallId]: {
          ...prev,
          type: nextType,
          rowsPerSide:
            nextType === "mis"
              ? prev.rowsPerSide
              : defaults.rowsPerSide,
          misSlotsPerSlice:
            nextType === "mis"
              ? Math.max(10, prev.misSlotsPerSlice)
              : prev.misSlotsPerSlice,
        },
      };
    });
  }

  function setHallSlices(hallId: HallId, rawValue: string): void {
    const nextValue = clamp(Number(rawValue) || 1, 1, 72);
    setHallConfigs((current) => ({
      ...current,
      [hallId]: {
        ...current[hallId],
        slices: nextValue,
      },
    }));
  }

  function setHallRowsPerSide(hallId: HallId, rawValue: string): void {
    const nextValue = clamp(Number(rawValue) || 1, 1, 9);
    setHallConfigs((current) => ({
      ...current,
      [hallId]: {
        ...current[hallId],
        rowsPerSide: nextValue,
      },
    }));
  }

  function setHallMisCapacity(hallId: HallId, rawValue: string): void {
    const nextValue = clamp(Number(rawValue) || 10, 10, 200);
    setHallConfigs((current) => ({
      ...current,
      [hallId]: {
        ...current[hallId],
        misSlotsPerSlice: nextValue,
      },
    }));
  }

  function applyHallPreset(type: HallType): void {
    setHallConfigs((current) => {
      const next: Record<HallId, HallConfig> = { ...current };
      for (const hallId of HALL_ORDER) {
        next[hallId] = {
          ...next[hallId],
          type,
          rowsPerSide: type === "mis" ? next[hallId].rowsPerSide : HALL_TYPE_DEFAULTS[type].rowsPerSide,
          misSlotsPerSlice:
            type === "mis"
              ? Math.max(10, next[hallId].misSlotsPerSlice)
              : next[hallId].misSlotsPerSlice,
        };
      }
      return next;
    });
  }

  function clearLayout(): void {
    setSlotAssignments({});
  }

  function beginItemDrag(event: DragEvent<HTMLElement>, itemId: string): void {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      DRAG_DATA_KEY,
      JSON.stringify({ kind: "item", itemIds: [itemId] } satisfies DragPayload),
    );
  }

  function beginCategoryDrag(event: DragEvent<HTMLElement>, itemIds: string[]): void {
    if (itemIds.length === 0) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      DRAG_DATA_KEY,
      JSON.stringify({ kind: "category", itemIds } satisfies DragPayload),
    );
  }

  function placePayload(anchorSlotId: string, payload: DragPayload): void {
    const anchorIndex = orderedSlotIds.indexOf(anchorSlotId);
    if (anchorIndex === -1) {
      return;
    }

    setSlotAssignments((current) => {
      const next = { ...current };
      const incoming = payload.itemIds.filter((itemId) => itemById.has(itemId));

      if (incoming.length === 0) {
        return current;
      }

      for (const [slotId, itemId] of Object.entries(next)) {
        if (incoming.includes(itemId)) {
          delete next[slotId];
        }
      }

      if (payload.kind === "item") {
        next[anchorSlotId] = incoming[0];
        return next;
      }

      let cursor = anchorIndex;

      for (const itemId of incoming) {
        while (cursor < orderedSlotIds.length && next[orderedSlotIds[cursor]]) {
          cursor += 1;
        }

        if (cursor >= orderedSlotIds.length) {
          break;
        }

        next[orderedSlotIds[cursor]] = itemId;
        cursor += 1;
      }

      return next;
    });
  }

  function handleSlotDrop(event: DragEvent<HTMLElement>, anchorSlotId: string): void {
    event.preventDefault();
    const payload = parseDragPayload(event);
    if (!payload) {
      return;
    }
    placePayload(anchorSlotId, payload);
  }

  function handleDropOver(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function clearSlot(slotId: string): void {
    setSlotAssignments((current) => {
      if (!(slotId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[slotId];
      return next;
    });
  }

  function adjustZoom(delta: number): void {
    if (!viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const cursorX = rect.width / 2;
    const cursorY = rect.height / 2;

    setZoom((currentZoom) => {
      const nextZoom = clamp(currentZoom + delta, MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === currentZoom) {
        return currentZoom;
      }

      setPan((currentPan) => {
        const worldX = (cursorX - currentPan.x) / currentZoom;
        const worldY = (cursorY - currentPan.y) / currentZoom;
        return {
          x: cursorX - worldX * nextZoom,
          y: cursorY - worldY * nextZoom,
        };
      });

      return nextZoom;
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>): void {
    event.preventDefault();

    if (!viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    const zoomScale = Math.exp(-event.deltaY * 0.0022);

    setZoom((currentZoom) => {
      const nextZoom = clamp(currentZoom * zoomScale, MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === currentZoom) {
        return currentZoom;
      }

      setPan((currentPan) => {
        const worldX = (cursorX - currentPan.x) / currentZoom;
        const worldY = (cursorY - currentPan.y) / currentZoom;
        return {
          x: cursorX - worldX * nextZoom,
          y: cursorY - worldY * nextZoom,
        };
      });

      return nextZoom;
    });
  }

  function handleViewportPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("[data-slot]") || target.closest("[data-no-pan]")) {
      return;
    }

    panSessionRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleViewportPointerMove(event: PointerEvent<HTMLDivElement>): void {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - session.lastX;
    const dy = event.clientY - session.lastY;

    session.lastX = event.clientX;
    session.lastY = event.clientY;

    setPan((current) => ({
      x: current.x + dx,
      y: current.y + dy,
    }));
  }

  function endViewportPan(event: PointerEvent<HTMLDivElement>): void {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    panSessionRef.current = null;
  }

  const center = STAGE_SIZE / 2;

  const hallPlacement = useMemo(() => {
    const positions: Record<HallId, { left: number; top: number; transform: string; width: number; height: number }> =
      {
        north: { left: 0, top: 0, transform: "", width: 0, height: 0 },
        east: { left: 0, top: 0, transform: "", width: 0, height: 0 },
        south: { left: 0, top: 0, transform: "", width: 0, height: 0 },
        west: { left: 0, top: 0, transform: "", width: 0, height: 0 },
      };

    for (const hallId of HALL_ORDER) {
      const config = hallConfigs[hallId];
      const orientation = HALL_ORIENTATION[hallId];
      const { width, height } = getHallSize(config, orientation);

      if (hallId === "north") {
        positions[hallId] = {
          left: center,
          top: center - CORE_SIZE / 2 - HALL_GAP,
          transform: "translate(-50%, -100%)",
          width,
          height,
        };
      } else if (hallId === "south") {
        positions[hallId] = {
          left: center,
          top: center + CORE_SIZE / 2 + HALL_GAP,
          transform: "translate(-50%, 0%)",
          width,
          height,
        };
      } else if (hallId === "east") {
        positions[hallId] = {
          left: center + CORE_SIZE / 2 + HALL_GAP,
          top: center,
          transform: "translate(0%, -50%)",
          width,
          height,
        };
      } else {
        positions[hallId] = {
          left: center - CORE_SIZE / 2 - HALL_GAP,
          top: center,
          transform: "translate(-100%, -50%)",
          width,
          height,
        };
      }
    }

    return positions;
  }, [center, hallConfigs]);

  function renderSlot(slotId: string): React.ReactNode {
    const assignedItemId = slotAssignments[slotId];
    const assignedItem = assignedItemId ? itemById.get(assignedItemId) : undefined;

    return (
      <button
        key={slotId}
        type="button"
        className={`slot-cell ${assignedItem ? "slot-cell-filled" : "slot-cell-empty"}`}
        onDragOver={handleDropOver}
        onDrop={(event) => handleSlotDrop(event, slotId)}
        onContextMenu={(event) => {
          event.preventDefault();
          clearSlot(slotId);
        }}
        data-slot
        title={assignedItem ? `${toTitle(assignedItem.id)} (right click to clear)` : "Drop item here"}
      >
        {assignedItem ? (
          <Image
            src={assignedItem.texturePath}
            alt={assignedItem.id}
            width={22}
            height={22}
            className="pointer-events-none"
            draggable={false}
            unoptimized
          />
        ) : null}
      </button>
    );
  }

  function renderNonMisHall(hallId: HallId, config: HallConfig, orientation: HallOrientation): React.ReactNode {
    const sideDepth = config.rowsPerSide;
    const mainSlices = config.slices;

    if (orientation === "horizontal") {
      return (
        <>
          <div
            className="absolute top-0 left-0 grid"
            style={{
              gridTemplateColumns: `repeat(${mainSlices}, ${SLOT_SIZE}px)`,
              gridTemplateRows: `repeat(${sideDepth}, ${SLOT_SIZE}px)`,
              gap: `${SLOT_GAP}px`,
            }}
          >
            {Array.from({ length: sideDepth }, (_, row) =>
              Array.from({ length: mainSlices }, (_, slice) => renderSlot(nonMisSlotId(hallId, slice, 0, row))),
            )}
          </div>

          <div
            className="absolute bottom-0 left-0 grid"
            style={{
              gridTemplateColumns: `repeat(${mainSlices}, ${SLOT_SIZE}px)`,
              gridTemplateRows: `repeat(${sideDepth}, ${SLOT_SIZE}px)`,
              gap: `${SLOT_GAP}px`,
            }}
          >
            {Array.from({ length: sideDepth }, (_, row) =>
              Array.from({ length: mainSlices }, (_, slice) => renderSlot(nonMisSlotId(hallId, slice, 1, row))),
            )}
          </div>

          <div className="hall-aisle horizontal" />
        </>
      );
    }

    return (
      <>
        <div
          className="absolute top-0 left-0 grid"
          style={{
            gridTemplateColumns: `repeat(${sideDepth}, ${SLOT_SIZE}px)`,
            gridTemplateRows: `repeat(${mainSlices}, ${SLOT_SIZE}px)`,
            gap: `${SLOT_GAP}px`,
          }}
        >
          {Array.from({ length: mainSlices }, (_, slice) =>
            Array.from({ length: sideDepth }, (_, row) => renderSlot(nonMisSlotId(hallId, slice, 0, row))),
          )}
        </div>

        <div
          className="absolute top-0 right-0 grid"
          style={{
            gridTemplateColumns: `repeat(${sideDepth}, ${SLOT_SIZE}px)`,
            gridTemplateRows: `repeat(${mainSlices}, ${SLOT_SIZE}px)`,
            gap: `${SLOT_GAP}px`,
          }}
        >
          {Array.from({ length: mainSlices }, (_, slice) =>
            Array.from({ length: sideDepth }, (_, row) => renderSlot(nonMisSlotId(hallId, slice, 1, row))),
          )}
        </div>

        <div className="hall-aisle vertical" />
      </>
    );
  }

  function renderMisHall(hallId: HallId, config: HallConfig, orientation: HallOrientation): React.ReactNode {
    const directionClass = orientation === "horizontal" ? "mis-track-horizontal" : "mis-track-vertical";

    return (
      <div className={`mis-track ${directionClass}`}>
        {Array.from({ length: config.slices }, (_, slice) => {
          const slotIds = Array.from({ length: config.misSlotsPerSlice }, (_, index) => misSlotId(hallId, slice, index));
          const assignedItemIds = slotIds.map((slotId) => slotAssignments[slotId]).filter((itemId): itemId is string => Boolean(itemId));
          const previewIds = assignedItemIds.slice(0, 6);
          const firstSlot = slotIds[0];

          return (
            <div
              key={`${hallId}-mis-${slice}`}
              className="mis-slice"
              onDragOver={handleDropOver}
              onDrop={(event) => handleSlotDrop(event, firstSlot)}
              title={`Slice ${slice + 1} • ${assignedItemIds.length}/${config.misSlotsPerSlice}`}
              data-slot
            >
              <div className="mis-slice-label">Slice {slice + 1}</div>
              <div className="mis-slice-count">
                {assignedItemIds.length}/{config.misSlotsPerSlice}
              </div>
              <div className="mis-preview-grid">
                {previewIds.map((itemId) => {
                  const item = itemById.get(itemId);
                  if (!item) {
                    return null;
                  }
                  return (
                    <div key={`${hallId}-mis-${slice}-${itemId}`} className="mis-preview-cell">
                      <Image
                        src={item.texturePath}
                        alt={item.id}
                        width={16}
                        height={16}
                        draggable={false}
                        unoptimized
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="planner-root">
      <section className="planner-layout-panel">
        <div className="layout-toolbar" data-no-pan>
          <div className="layout-toolbar-title-wrap">
            <h1 className="layout-title">Storage Layout Planner</h1>
            <p className="layout-subtitle">Drag items from the right list into slots on the left blueprint.</p>
          </div>

          <div className="layout-toolbar-actions">
            <button type="button" onClick={() => applyHallPreset("chest")} className="toolbar-button">
              All Chest
            </button>
            <button type="button" onClick={() => applyHallPreset("bulk")} className="toolbar-button">
              All Bulk
            </button>
            <button type="button" onClick={() => applyHallPreset("mis")} className="toolbar-button">
              All MIS
            </button>
            <button type="button" onClick={clearLayout} className="toolbar-button toolbar-button-danger">
              Clear Layout
            </button>
          </div>
        </div>

        <div className="hall-config-grid" data-no-pan>
          {HALL_ORDER.map((hallId) => {
            const hall = hallConfigs[hallId];
            return (
              <fieldset key={hallId} className="hall-config-card">
                <legend>{HALL_LABELS[hallId]}</legend>

                <label className="hall-config-field">
                  <span>Type</span>
                  <select
                    value={hall.type}
                    onChange={(event) => setHallType(hallId, event.target.value as HallType)}
                  >
                    <option value="bulk">Bulk</option>
                    <option value="chest">Chest</option>
                    <option value="mis">MIS</option>
                  </select>
                </label>

                <label className="hall-config-field">
                  <span>Slices</span>
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={hall.slices}
                    onChange={(event) => setHallSlices(hallId, event.target.value)}
                  />
                </label>

                {hall.type === "mis" ? (
                  <label className="hall-config-field">
                    <span>Slots / Slice</span>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={hall.misSlotsPerSlice}
                      onChange={(event) => setHallMisCapacity(hallId, event.target.value)}
                    />
                  </label>
                ) : (
                  <label className="hall-config-field">
                    <span>Rows / Side</span>
                    <input
                      type="number"
                      min={1}
                      max={9}
                      value={hall.rowsPerSide}
                      onChange={(event) => setHallRowsPerSide(hallId, event.target.value)}
                    />
                  </label>
                )}
              </fieldset>
            );
          })}
        </div>

        <div
          ref={viewportRef}
          className="layout-viewport"
          onWheel={handleWheel}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={endViewportPan}
          onPointerCancel={endViewportPan}
        >
          <div className="viewport-help" data-no-pan>
            <div>Mouse wheel to zoom</div>
            <div>Drag empty space to pan</div>
            <div>Right-click a placed slot to clear</div>
          </div>

          <div className="zoom-controls" data-no-pan>
            <button type="button" onClick={() => adjustZoom(0.2)}>
              +
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => adjustZoom(-0.2)}>
              -
            </button>
          </div>

          <div
            className="layout-stage"
            style={{
              width: `${STAGE_SIZE}px`,
              height: `${STAGE_SIZE}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <div
              className="layout-core"
              style={{
                width: `${CORE_SIZE}px`,
                height: `${CORE_SIZE}px`,
                left: `${center - CORE_SIZE / 2}px`,
                top: `${center - CORE_SIZE / 2}px`,
              }}
            >
              Core
            </div>

            {HALL_ORDER.map((hallId) => {
              const hall = hallConfigs[hallId];
              const orientation = HALL_ORIENTATION[hallId];
              const placement = hallPlacement[hallId];

              const hallFirstSlot =
                hall.type === "mis"
                  ? misSlotId(hallId, 0, 0)
                  : nonMisSlotId(hallId, 0, 0, 0);

              return (
                <section
                  key={hallId}
                  className="hall-shell"
                  style={{
                    left: `${placement.left}px`,
                    top: `${placement.top}px`,
                    transform: placement.transform,
                    width: `${placement.width}px`,
                    height: `${placement.height}px`,
                  }}
                  onDragOver={handleDropOver}
                  onDrop={(event) => handleSlotDrop(event, hallFirstSlot)}
                >
                  <div className="hall-heading">{HALL_LABELS[hallId]} • {hall.type.toUpperCase()}</div>

                  {hall.type === "mis"
                    ? renderMisHall(hallId, hall, orientation)
                    : renderNonMisHall(hallId, hall, orientation)}
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="planner-item-panel">
        <div className="item-panel-header">
          <h2>Item Library</h2>
          <p>
            {usedItemIds.size} placed / {catalogItems.length} total
          </p>

          <label className="item-search-wrap">
            <span>Search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="diamond, concrete, chest..."
            />
          </label>
        </div>

        {isLoadingCatalog ? <div className="item-panel-message">Loading item catalog...</div> : null}
        {catalogError ? <div className="item-panel-error">{catalogError}</div> : null}

        {!isLoadingCatalog && !catalogError ? (
          <div className="item-category-list">
            {categories.map((category) => {
              const isCollapsed = normalizedSearch ? false : (collapsedCategories[category.id] ?? false);
              const categoryItemIds = category.items.map((item) => item.id);

              return (
                <section key={category.id} className="item-category">
                  <div
                    className="item-category-header"
                    draggable={category.items.length > 0}
                    onDragStart={(event) => beginCategoryDrag(event, categoryItemIds)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCollapsedCategories((current) => ({
                          ...current,
                          [category.id]: !isCollapsed,
                        }));
                      }}
                    >
                      {isCollapsed ? "▸" : "▾"}
                    </button>

                    <div className="item-category-title-wrap">
                      <div className="item-category-title">{category.label}</div>
                      <div className="item-category-meta">{category.items.length} available</div>
                    </div>

                    <span className="category-drag-tip">Drag category</span>
                  </div>

                  {!isCollapsed ? (
                    <div className="item-grid">
                      {category.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="item-chip"
                          draggable
                          onDragStart={(event) => beginItemDrag(event, item.id)}
                          title={`Drag ${toTitle(item.id)}`}
                        >
                          <Image
                            src={item.texturePath}
                            alt={item.id}
                            width={22}
                            height={22}
                            className="pointer-events-none"
                            draggable={false}
                            unoptimized
                          />
                          <span>{toTitle(item.id)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}

            {categories.length === 0 ? (
              <div className="item-panel-message">No items match your search.</div>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

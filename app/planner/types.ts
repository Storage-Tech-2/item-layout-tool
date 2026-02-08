export type HallId = number;
export type FillDirection = "row" | "column";

export type HallType = "bulk" | "chest" | "mis";

export type HallOrientation = "horizontal" | "vertical";

export type HallSideConfig = {
  type: HallType;
  rowsPerSlice: number;
  misSlotsPerSlice: number;
  misUnitsPerSlice: number;
  misWidth: number;
};

export type HallSectionConfig = {
  slices: number;
  sideLeft: HallSideConfig;
  sideRight: HallSideConfig;
};

export type HallConfig = {
  name?: string;
  sections: HallSectionConfig[];
};

export type PlannerLabelNames = {
  layoutName: string;
  hallNames: Record<HallId, string>;
  sectionNames: Record<string, string>;
  misNames: Record<string, string>;
};

export type LegacyHallConfig = {
  type: HallType;
  slices: number;
  rowsPerSide: number;
  misSlotsPerSlice: number;
  misUnitsPerSlice: number;
  misWidth?: number;
};

export type CatalogItem = {
  id: string;
  texturePath: string;
  creativeTabs: string[];
  registration: "block" | "item" | "unknown";
  maxStackSize: number;
};

export type RawCatalogItem = {
  id: string;
  texturePath: string | null;
  registration?: unknown;
  maxStackSize?: unknown;
  blockLoot?: unknown;
  creativeTabs?: unknown;
};

export type CatalogResponse = {
  items: RawCatalogItem[];
};

export type Category = {
  id: string;
  label: string;
  items: CatalogItem[];
  dragLabel: string;
};

export type DragPayload = {
  kind: "item" | "category";
  itemIds: string[];
  source?: "catalog" | "layout";
  originSlotId?: string;
  sourceSlotIds?: string[];
};

export type SlotPoint = {
  x: number;
  y: number;
};

export type IncomingEntry = {
  itemId: string;
  sourceSlotId?: string;
};

export type PreviewPlacement = {
  slotId: string;
  itemId: string;
  kind: "place" | "swap";
};

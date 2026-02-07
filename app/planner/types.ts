export type HallId = "north" | "east" | "south" | "west";

export type HallType = "bulk" | "chest" | "mis";

export type HallOrientation = "horizontal" | "vertical";

export type HallConfig = {
  type: HallType;
  slices: number;
  rowsPerSide: number;
  misSlotsPerSlice: number;
};

export type CatalogItem = {
  id: string;
  texturePath: string;
};

export type RawCatalogItem = {
  id: string;
  texturePath: string | null;
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
};

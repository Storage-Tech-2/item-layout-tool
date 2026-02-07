import type { HallConfig, HallId, HallOrientation, HallType } from "./types";

export const HALL_ORDER: HallId[] = ["north", "east", "south", "west"];

export const HALL_LABELS: Record<HallId, string> = {
  north: "North Hall",
  east: "East Hall",
  south: "South Hall",
  west: "West Hall",
};

export const HALL_ORIENTATION: Record<HallId, HallOrientation> = {
  north: "vertical",
  east: "horizontal",
  south: "vertical",
  west: "horizontal",
};

export const HALL_TYPE_DEFAULTS: Record<
  HallType,
  Pick<HallConfig, "rowsPerSide" | "misSlotsPerSlice">
> = {
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

export const DEFAULT_HALLS: Record<HallId, HallConfig> = {
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

export const DRAG_DATA_KEY = "application/x-item-layout";

export const STAGE_SIZE = 2200;
export const CORE_SIZE = 170;
export const HALL_GAP = 42;
export const SLOT_SIZE = 34;
export const SLOT_GAP = 4;
export const AISLE_GAP = 20;
export const MIS_SLICE_MAIN = 74;
export const MIS_CROSS = 112;

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 2.8;

export const COLOR_PREFIXES = [
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

export const WOOD_PREFIXES = [
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

export const COLOR_INDEX = new Map<string, number>(
  COLOR_PREFIXES.map((prefix, index) => [prefix, index]),
);

export const WOOD_INDEX = new Map<string, number>(
  WOOD_PREFIXES.map((prefix, index) => [prefix, index]),
);

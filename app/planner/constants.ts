export const DRAG_DATA_KEY = "application/x-item-layout";

export const STAGE_SIZE = 2200;
export const CORE_SIZE = 250;
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

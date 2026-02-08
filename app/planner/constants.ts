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
  "petrified_oak",
  "mangrove",
  "acacia",
  "spruce",
  "jungle",
  "cherry",
  "crimson",
  "warped",
  "birch",
  "oak",
  "bamboo",
  "bamboo_mosaic"
] as const;

export const STONE_PREFIXES = [
  "andesite",
  "blackstone",
  "cobbled_deepslate",
  "cobblestone",
  "dark_prismarine",
  "deepslate",
  "deepslate_tile",
  "diorite",
  "granite",
  "mossy_cobblestone",
  "polished_andesite",
  "polished_blackstone",
  "polished_deepslate",
  "polished_diorite",
  "polished_granite",
  "polished_tuff",
  "prismarine",
  "purpur",
  "quartz",
  "purpur_block",
  "quartz_block",
  "smooth_quartz",
  "stone",
  "smooth_stone",
  "tuff"
] as const;

export const BRICK_PREFIXES = [
  "brick",
  "bricks",
  "nether_brick",
  "nether_bricks",
  "red_nether_bricks",
  "deepslate_brick",
  "red_nether_brick",
  "prismarine_brick",
  "stone_brick",
  "mossy_stone_brick",
  "cracked_stone_brick",
  "chiseled_stone_brick",
  "cracked_stone_bricks",
  "chiseled_stone_bricks",
  "quartz_brick",
  "chiseled_nether_brick",
  "chiseled_resin_brick",
  "chiseled_tuff_brick",
  "chiseled_nether_bricks",
  "chiseled_resin_bricks",
  "chiseled_tuff_bricks",
  "cracked_nether_brick",
  "cracked_deepslate_brick",
  "cracked_nether_bricks",
  "cracked_deepslate_bricks",
  "cracked_polished_blackstone_brick",
  "cracked_polished_blackstone_bricks",
  "end_stone_brick",
  "mossy_stone_brick",
  "mud_brick",
  "resin_brick",
  "end_stone_bricks",
  "mossy_stone_bricks",
  "mud_bricks",
  "resin_bricks",
  "infested_chiseled_stone_bricks",
  "infested_cracked_stone_bricks",
  "infested_stone_bricks",
  "infested_mossy_stone_bricks",
] as const;

export const COLOR_INDEX = new Map<string, number>(
  COLOR_PREFIXES.map((prefix, index) => [prefix, index]),
);

export const WOOD_INDEX = new Map<string, number>(
  WOOD_PREFIXES.map((prefix, index) => [prefix, index]),
);

export const STONE_INDEX = new Map<string, number>(
  STONE_PREFIXES.map((prefix, index) => [prefix, index]),
);

export const BRICK_INDEX = new Map<string, number>(
  BRICK_PREFIXES.map((prefix, index) => [prefix, index]),
);

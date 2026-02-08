import type { StorageLayoutPreset } from "../layoutConfig";
import type {
  FillDirection,
  HallConfig,
  HallId,
  HallSideConfig,
  HallType,
  PlannerLabelNames,
} from "../types";
import { clamp } from "../utils";

const STORAGE_LAYOUT_PRESETS: StorageLayoutPreset[] = ["cross", "h", "hcross", "octa"];
const FILL_DIRECTIONS: FillDirection[] = ["row", "column"];
const HALL_TYPES: HallType[] = ["bulk", "chest", "mis"];

export const SAVE_FILE_VERSION = 1;

export type PlannerSnapshot = {
  storageLayoutPreset: StorageLayoutPreset;
  fillDirection: FillDirection;
  hallConfigs: Record<HallId, HallConfig>;
  slotAssignments: Record<string, string>;
  labelNames: PlannerLabelNames;
};

export type PlannerSaveFile = PlannerSnapshot & {
  version: number;
  savedAt: string;
};

export function sectionNameKey(hallId: HallId, sectionIndex: number): string {
  return `${hallId}:${sectionIndex}`;
}

export function misNameKey(
  hallId: HallId,
  slice: number,
  side: 0 | 1,
  misUnit: number,
): string {
  return `${hallId}:${slice}:${side}:${misUnit}`;
}

export function createEmptyPlannerLabelNames(): PlannerLabelNames {
  return {
    hallNames: {},
    sectionNames: {},
    misNames: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function defaultSideConfig(type: HallType): HallSideConfig {
  switch (type) {
    case "bulk":
      return {
        type: "bulk",
        rowsPerSlice: 1,
        misSlotsPerSlice: 54,
        misUnitsPerSlice: 1,
        misWidth: 1,
      };
    case "chest":
      return {
        type: "chest",
        rowsPerSlice: 4,
        misSlotsPerSlice: 54,
        misUnitsPerSlice: 1,
        misWidth: 1,
      };
    case "mis":
      return {
        type: "mis",
        rowsPerSlice: 4,
        misSlotsPerSlice: 54,
        misUnitsPerSlice: 1,
        misWidth: 2,
      };
  }
}

export function cloneHallConfigs(hallConfigs: Record<HallId, HallConfig>): Record<HallId, HallConfig> {
  const normalized: Record<HallId, HallConfig> = {};
  const entries = Object.entries(hallConfigs).sort((a, b) => Number(a[0]) - Number(b[0]));
  for (const [hallIdRaw, hallConfig] of entries) {
    const hallId = Number(hallIdRaw);
    const nextConfig: HallConfig = {
      sections: hallConfig.sections.map((section) => ({
        slices: section.slices,
        sideLeft: { ...section.sideLeft },
        sideRight: { ...section.sideRight },
      })),
    };
    if (typeof hallConfig.name === "string") {
      nextConfig.name = hallConfig.name;
    }
    normalized[hallId] = nextConfig;
  }
  return normalized;
}

export function cloneSlotAssignments(slotAssignments: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(slotAssignments)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .sort((a, b) => a[0].localeCompare(b[0])),
  );
}

function cloneHallNames(hallNames: Record<HallId, string>): Record<HallId, string> {
  const normalized: Record<HallId, string> = {};
  const entries = Object.entries(hallNames)
    .map(([hallIdRaw, hallName]) => [Number(hallIdRaw), hallName] as const)
    .filter(
      (entry): entry is [HallId, string] =>
        Number.isInteger(entry[0]) &&
        entry[0] > 0 &&
        typeof entry[1] === "string" &&
        entry[1].trim().length > 0,
    )
    .sort((a, b) => a[0] - b[0]);
  for (const [hallId, hallName] of entries) {
    normalized[hallId] = hallName.trim();
  }
  return normalized;
}

function cloneNameMap(nameMap: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(nameMap)
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" &&
          entry[0].trim().length > 0 &&
          typeof entry[1] === "string" &&
          entry[1].trim().length > 0,
      )
      .map(([key, value]) => [key, value.trim()] as const)
      .sort((a, b) => a[0].localeCompare(b[0])),
  );
}

export function clonePlannerLabelNames(labelNames: PlannerLabelNames): PlannerLabelNames {
  return {
    hallNames: cloneHallNames(labelNames.hallNames),
    sectionNames: cloneNameMap(labelNames.sectionNames),
    misNames: cloneNameMap(labelNames.misNames),
  };
}

export function buildPlannerSnapshot(input: PlannerSnapshot): PlannerSnapshot {
  return {
    storageLayoutPreset: input.storageLayoutPreset,
    fillDirection: input.fillDirection,
    hallConfigs: cloneHallConfigs(input.hallConfigs),
    slotAssignments: cloneSlotAssignments(input.slotAssignments),
    labelNames: clonePlannerLabelNames(input.labelNames),
  };
}

export function snapshotToKey(snapshot: PlannerSnapshot): string {
  return JSON.stringify(snapshot);
}

function parseStorageLayoutPreset(value: unknown): StorageLayoutPreset | null {
  if (typeof value !== "string") {
    return null;
  }
  return STORAGE_LAYOUT_PRESETS.includes(value as StorageLayoutPreset)
    ? (value as StorageLayoutPreset)
    : null;
}

function parseFillDirection(value: unknown): FillDirection | null {
  if (typeof value !== "string") {
    return null;
  }
  return FILL_DIRECTIONS.includes(value as FillDirection) ? (value as FillDirection) : null;
}

function parseHallType(value: unknown): HallType | null {
  if (typeof value !== "string") {
    return null;
  }
  return HALL_TYPES.includes(value as HallType) ? (value as HallType) : null;
}

function parseHallSideConfig(value: unknown): HallSideConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = parseHallType(value.type);
  if (!type) {
    return null;
  }

  const defaults = defaultSideConfig(type);
  return {
    type,
    rowsPerSlice: clamp(toFiniteNumber(value.rowsPerSlice, defaults.rowsPerSlice), 1, 9),
    misSlotsPerSlice: clamp(
      toFiniteNumber(value.misSlotsPerSlice, defaults.misSlotsPerSlice),
      1,
      200,
    ),
    misUnitsPerSlice: clamp(
      toFiniteNumber(value.misUnitsPerSlice, defaults.misUnitsPerSlice),
      1,
      8,
    ),
    misWidth: clamp(toFiniteNumber(value.misWidth, defaults.misWidth), 1, 16),
  };
}

function parseHallConfig(value: unknown): HallConfig | null {
  if (!isRecord(value) || !Array.isArray(value.sections) || value.sections.length === 0) {
    return null;
  }

  const sections = value.sections.map((sectionValue) => {
    if (!isRecord(sectionValue)) {
      return null;
    }

    const sideLeft = parseHallSideConfig(sectionValue.sideLeft);
    const sideRight = parseHallSideConfig(sectionValue.sideRight);
    if (!sideLeft || !sideRight) {
      return null;
    }

    return {
      slices: clamp(toFiniteNumber(sectionValue.slices, 1), 1, 200),
      sideLeft,
      sideRight,
    };
  });

  if (sections.some((section) => section === null)) {
    return null;
  }

  const hallConfig: HallConfig = {
    sections: sections.filter((section): section is HallConfig["sections"][number] => Boolean(section)),
  };
  if (typeof value.name === "string") {
    hallConfig.name = value.name;
  }
  return hallConfig;
}

function parseHallConfigs(value: unknown): Record<HallId, HallConfig> | null {
  if (!isRecord(value)) {
    return null;
  }

  const entries: Array<[HallId, HallConfig]> = [];
  for (const [hallIdRaw, hallConfigValue] of Object.entries(value)) {
    const hallId = Number(hallIdRaw);
    if (!Number.isInteger(hallId) || hallId <= 0) {
      return null;
    }

    const hallConfig = parseHallConfig(hallConfigValue);
    if (!hallConfig) {
      return null;
    }

    entries.push([hallId, hallConfig]);
  }

  if (entries.length === 0) {
    return null;
  }

  entries.sort((a, b) => a[0] - b[0]);
  const normalized: Record<HallId, HallConfig> = {};
  for (const [hallId, hallConfig] of entries) {
    normalized[hallId] = hallConfig;
  }
  return normalized;
}

function parseSlotAssignments(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const entries = Object.entries(value)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        entry[0].trim().length > 0 &&
        typeof entry[1] === "string" &&
        entry[1].trim().length > 0,
    )
    .sort((a, b) => a[0].localeCompare(b[0]));

  return Object.fromEntries(entries);
}

function parseHallNames(value: unknown): Record<HallId, string> {
  if (!isRecord(value)) {
    return {};
  }

  const entries = Object.entries(value)
    .map(([hallIdRaw, hallName]) => [Number(hallIdRaw), hallName] as const)
    .filter(
      (entry): entry is [HallId, string] =>
        Number.isInteger(entry[0]) &&
        entry[0] > 0 &&
        typeof entry[1] === "string" &&
        entry[1].trim().length > 0,
    )
    .sort((a, b) => a[0] - b[0]);

  const normalized: Record<HallId, string> = {};
  for (const [hallId, hallName] of entries) {
    normalized[hallId] = hallName.trim();
  }
  return normalized;
}

function parseNameMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const entries = Object.entries(value)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        entry[0].trim().length > 0 &&
        typeof entry[1] === "string" &&
        entry[1].trim().length > 0,
    )
    .map(([key, name]) => [key, name.trim()] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return Object.fromEntries(entries);
}

function parsePlannerLabelNames(value: unknown): PlannerLabelNames {
  if (!isRecord(value)) {
    return createEmptyPlannerLabelNames();
  }

  return {
    hallNames: parseHallNames(value.hallNames),
    sectionNames: parseNameMap(value.sectionNames),
    misNames: parseNameMap(value.misNames),
  };
}

export function parsePlannerSnapshot(value: unknown): PlannerSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  if ("version" in value && value.version !== SAVE_FILE_VERSION) {
    return null;
  }

  const storageLayoutPreset = parseStorageLayoutPreset(value.storageLayoutPreset);
  const fillDirection = parseFillDirection(value.fillDirection);
  const hallConfigs = parseHallConfigs(value.hallConfigs);

  if (!storageLayoutPreset || !fillDirection || !hallConfigs) {
    return null;
  }

  const labelNames =
    "labelNames" in value
      ? parsePlannerLabelNames(value.labelNames)
      : parsePlannerLabelNames({
          hallNames: value.hallNames,
          sectionNames: value.sectionNames,
          misNames: value.misNames,
        });

  return {
    storageLayoutPreset,
    fillDirection,
    hallConfigs,
    slotAssignments: parseSlotAssignments(value.slotAssignments),
    labelNames,
  };
}

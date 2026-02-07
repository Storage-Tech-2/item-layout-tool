import { useState } from "react";
import {
  DEFAULT_HALLS,
  HALL_ORDER,
  HALL_TYPE_DEFAULTS,
} from "../constants";
import type { HallConfig, HallId, HallType } from "../types";
import { clamp } from "../utils";

type UseHallConfigsResult = {
  hallConfigs: Record<HallId, HallConfig>;
  setHallType: (hallId: HallId, nextType: HallType) => void;
  setHallSlices: (hallId: HallId, rawValue: string) => void;
  setHallRowsPerSide: (hallId: HallId, rawValue: string) => void;
  setHallMisCapacity: (hallId: HallId, rawValue: string) => void;
  applyHallPreset: (type: HallType) => void;
};

export function nextConfigsForHallType(
  current: Record<HallId, HallConfig>,
  hallId: HallId,
  nextType: HallType,
): Record<HallId, HallConfig> {
  const previousConfig = current[hallId];
  const defaults = HALL_TYPE_DEFAULTS[nextType];
  return {
    ...current,
    [hallId]: {
      ...previousConfig,
      type: nextType,
      rowsPerSide: nextType === "mis" ? previousConfig.rowsPerSide : defaults.rowsPerSide,
      misSlotsPerSlice:
        nextType === "mis"
          ? Math.max(10, previousConfig.misSlotsPerSlice)
          : previousConfig.misSlotsPerSlice,
    },
  };
}

export function nextConfigsForHallSlices(
  current: Record<HallId, HallConfig>,
  hallId: HallId,
  rawValue: string,
): Record<HallId, HallConfig> {
  const slices = clamp(Number(rawValue) || 1, 1, 72);
  return {
    ...current,
    [hallId]: {
      ...current[hallId],
      slices,
    },
  };
}

export function nextConfigsForHallRows(
  current: Record<HallId, HallConfig>,
  hallId: HallId,
  rawValue: string,
): Record<HallId, HallConfig> {
  const rowsPerSide = clamp(Number(rawValue) || 1, 1, 9);
  return {
    ...current,
    [hallId]: {
      ...current[hallId],
      rowsPerSide,
    },
  };
}

export function nextConfigsForHallMisCapacity(
  current: Record<HallId, HallConfig>,
  hallId: HallId,
  rawValue: string,
): Record<HallId, HallConfig> {
  const misSlotsPerSlice = clamp(Number(rawValue) || 10, 10, 200);
  return {
    ...current,
    [hallId]: {
      ...current[hallId],
      misSlotsPerSlice,
    },
  };
}

export function nextConfigsForPreset(
  current: Record<HallId, HallConfig>,
  type: HallType,
): Record<HallId, HallConfig> {
  const next: Record<HallId, HallConfig> = { ...current };
  for (const hallId of HALL_ORDER) {
    next[hallId] = {
      ...next[hallId],
      type,
      rowsPerSide:
        type === "mis" ? next[hallId].rowsPerSide : HALL_TYPE_DEFAULTS[type].rowsPerSide,
      misSlotsPerSlice:
        type === "mis"
          ? Math.max(10, next[hallId].misSlotsPerSlice)
          : next[hallId].misSlotsPerSlice,
    };
  }
  return next;
}

export function useHallConfigs(): UseHallConfigsResult {
  const [hallConfigs, setHallConfigs] = useState<Record<HallId, HallConfig>>(
    DEFAULT_HALLS,
  );

  function setHallType(hallId: HallId, nextType: HallType): void {
    setHallConfigs((current) => nextConfigsForHallType(current, hallId, nextType));
  }

  function setHallSlices(hallId: HallId, rawValue: string): void {
    setHallConfigs((current) => nextConfigsForHallSlices(current, hallId, rawValue));
  }

  function setHallRowsPerSide(hallId: HallId, rawValue: string): void {
    setHallConfigs((current) => nextConfigsForHallRows(current, hallId, rawValue));
  }

  function setHallMisCapacity(hallId: HallId, rawValue: string): void {
    setHallConfigs((current) =>
      nextConfigsForHallMisCapacity(current, hallId, rawValue),
    );
  }

  function applyHallPreset(type: HallType): void {
    setHallConfigs((current) => nextConfigsForPreset(current, type));
  }

  return {
    hallConfigs,
    setHallType,
    setHallSlices,
    setHallRowsPerSide,
    setHallMisCapacity,
    applyHallPreset,
  };
}

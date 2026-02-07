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

export function useHallConfigs(): UseHallConfigsResult {
  const [hallConfigs, setHallConfigs] = useState<Record<HallId, HallConfig>>(
    DEFAULT_HALLS,
  );

  function setHallType(hallId: HallId, nextType: HallType): void {
    setHallConfigs((current) => {
      const previousConfig = current[hallId];
      const defaults = HALL_TYPE_DEFAULTS[nextType];
      return {
        ...current,
        [hallId]: {
          ...previousConfig,
          type: nextType,
          rowsPerSide:
            nextType === "mis" ? previousConfig.rowsPerSide : defaults.rowsPerSide,
          misSlotsPerSlice:
            nextType === "mis"
              ? Math.max(10, previousConfig.misSlotsPerSlice)
              : previousConfig.misSlotsPerSlice,
        },
      };
    });
  }

  function setHallSlices(hallId: HallId, rawValue: string): void {
    const slices = clamp(Number(rawValue) || 1, 1, 72);
    setHallConfigs((current) => ({
      ...current,
      [hallId]: {
        ...current[hallId],
        slices,
      },
    }));
  }

  function setHallRowsPerSide(hallId: HallId, rawValue: string): void {
    const rowsPerSide = clamp(Number(rawValue) || 1, 1, 9);
    setHallConfigs((current) => ({
      ...current,
      [hallId]: {
        ...current[hallId],
        rowsPerSide,
      },
    }));
  }

  function setHallMisCapacity(hallId: HallId, rawValue: string): void {
    const misSlotsPerSlice = clamp(Number(rawValue) || 10, 10, 200);
    setHallConfigs((current) => ({
      ...current,
      [hallId]: {
        ...current[hallId],
        misSlotsPerSlice,
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
          rowsPerSide:
            type === "mis"
              ? next[hallId].rowsPerSide
              : HALL_TYPE_DEFAULTS[type].rowsPerSide,
          misSlotsPerSlice:
            type === "mis"
              ? Math.max(10, next[hallId].misSlotsPerSlice)
              : next[hallId].misSlotsPerSlice,
        };
      }
      return next;
    });
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

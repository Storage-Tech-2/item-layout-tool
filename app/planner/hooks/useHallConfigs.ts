import { useState } from "react";
import {
  buildInitialHallConfigs,
  type StorageLayoutPreset,
} from "../layoutConfig";
import type {
  HallConfig,
  HallId,
  HallSectionConfig,
  HallSideConfig,
  HallType,
} from "../types";
import { clamp } from "../utils";

export type HallSideKey = "left" | "right";

type UseHallConfigsResult = {
  storageLayoutPreset: StorageLayoutPreset;
  hallConfigs: Record<HallId, HallConfig>;
  applyLayoutPreset: (preset: StorageLayoutPreset) => void;
  setSectionSlices: (hallId: HallId, sectionIndex: number, rawValue: string) => void;
  setSectionSideType: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    type: HallType,
  ) => void;
  setSectionSideRows: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    rawValue: string,
  ) => void;
  setSectionSideMisCapacity: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    rawValue: string,
  ) => void;
  setSectionSideMisUnits: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    rawValue: string,
  ) => void;
  setSectionSideMisWidth: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    rawValue: string,
  ) => void;
  addHallSection: (hallId: HallId) => void;
  removeHallSection: (hallId: HallId, sectionIndex: number) => void;
};

function hallTypeDefaults(type: HallType): HallSideConfig {
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

function cloneSections(config: HallConfig): HallSectionConfig[] {
  return config.sections.map((section) => ({
    slices: section.slices,
    sideLeft: { ...section.sideLeft },
    sideRight: { ...section.sideRight },
  }));
}

function sideAt(section: HallSectionConfig, side: HallSideKey): HallSideConfig {
  return side === "left" ? section.sideLeft : section.sideRight;
}

function replaceSide(
  section: HallSectionConfig,
  side: HallSideKey,
  next: HallSideConfig,
): HallSectionConfig {
  return side === "left"
    ? { ...section, sideLeft: next }
    : { ...section, sideRight: next };
}

function updateSection(
  current: Record<HallId, HallConfig>,
  hallId: HallId,
  sectionIndex: number,
  updater: (section: HallSectionConfig) => HallSectionConfig,
): Record<HallId, HallConfig> {
  const hall = current[hallId];
  if (!hall || sectionIndex < 0 || sectionIndex >= hall.sections.length) {
    return current;
  }
  const sections = cloneSections(hall);
  sections[sectionIndex] = updater(sections[sectionIndex]);
  return {
    ...current,
    [hallId]: {
      ...hall,
      sections,
    },
  };
}

export function useHallConfigs(): UseHallConfigsResult {
  const [storageLayoutPreset, setStorageLayoutPreset] = useState<StorageLayoutPreset>("cross");
  const [hallConfigs, setHallConfigs] = useState<Record<HallId, HallConfig>>(() =>
    buildInitialHallConfigs("cross"),
  );

  function applyLayoutPreset(preset: StorageLayoutPreset): void {
    setStorageLayoutPreset(preset);
    setHallConfigs(buildInitialHallConfigs(preset));
  }

  function setSectionSlices(hallId: HallId, sectionIndex: number, rawValue: string): void {
    const slices = clamp(Number(rawValue) || 1, 1, 200);
    setHallConfigs((current) =>
      updateSection(current, hallId, sectionIndex, (section) => ({
        ...section,
        slices,
      })),
    );
  }

  function setSectionSideType(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    type: HallType,
  ): void {
    setHallConfigs((current) =>
      updateSection(current, hallId, sectionIndex, (section) => {
        const currentSide = sideAt(section, side);
        const defaults = hallTypeDefaults(type);
        const nextSide: HallSideConfig = {
          ...currentSide,
          ...defaults,
          type,
        };
        return replaceSide(section, side, nextSide);
      }),
    );
  }

  function setSectionSideRows(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    rawValue: string,
  ): void {
    const rowsPerSlice = clamp(Number(rawValue) || 1, 1, 9);
    setHallConfigs((current) =>
      updateSection(current, hallId, sectionIndex, (section) => {
        const currentSide = sideAt(section, side);
        return replaceSide(section, side, {
          ...currentSide,
          rowsPerSlice,
        });
      }),
    );
  }

  function setSectionSideMisCapacity(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    rawValue: string,
  ): void {
    const misSlotsPerSlice = clamp(Number(rawValue) || 1, 1, 200);
    setHallConfigs((current) =>
      updateSection(current, hallId, sectionIndex, (section) => {
        const currentSide = sideAt(section, side);
        return replaceSide(section, side, {
          ...currentSide,
          misSlotsPerSlice,
        });
      }),
    );
  }

  function setSectionSideMisUnits(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    rawValue: string,
  ): void {
    const misUnitsPerSlice = clamp(Number(rawValue) || 1, 1, 8);
    setHallConfigs((current) =>
      updateSection(current, hallId, sectionIndex, (section) => {
        const currentSide = sideAt(section, side);
        return replaceSide(section, side, {
          ...currentSide,
          misUnitsPerSlice,
        });
      }),
    );
  }

  function setSectionSideMisWidth(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    rawValue: string,
  ): void {
    const misWidth = clamp(Number(rawValue) || 1, 1, 16);
    setHallConfigs((current) =>
      updateSection(current, hallId, sectionIndex, (section) => {
        const currentSide = sideAt(section, side);
        return replaceSide(section, side, {
          ...currentSide,
          misWidth,
        });
      }),
    );
  }

  function addHallSection(hallId: HallId): void {
    setHallConfigs((current) => {
      const hall = current[hallId];
      if (!hall) {
        return current;
      }
      const template = hall.sections[hall.sections.length - 1] ?? {
        slices: 8,
        sideLeft: hallTypeDefaults("bulk"),
        sideRight: hallTypeDefaults("bulk"),
      };
      const nextSection: HallSectionConfig = {
        slices: template.slices,
        sideLeft: { ...template.sideLeft },
        sideRight: { ...template.sideRight },
      };
      return {
        ...current,
        [hallId]: {
          ...hall,
          sections: [...cloneSections(hall), nextSection],
        },
      };
    });
  }

  function removeHallSection(hallId: HallId, sectionIndex: number): void {
    setHallConfigs((current) => {
      const hall = current[hallId];
      if (!hall || hall.sections.length <= 1) {
        return current;
      }
      if (sectionIndex < 0 || sectionIndex >= hall.sections.length) {
        return current;
      }
      const nextSections = cloneSections(hall).filter((_, index) => index !== sectionIndex);
      return {
        ...current,
        [hallId]: {
          ...hall,
          sections: nextSections,
        },
      };
    });
  }

  return {
    storageLayoutPreset,
    hallConfigs,
    applyLayoutPreset,
    setSectionSlices,
    setSectionSideType,
    setSectionSideRows,
    setSectionSideMisCapacity,
    setSectionSideMisUnits,
    setSectionSideMisWidth,
    addHallSection,
    removeHallSection,
  };
}

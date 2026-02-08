"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ItemLibraryPanel } from "./components/ItemLibraryPanel";
import { LayoutViewport } from "./components/LayoutViewport";
import { useCatalog } from "./hooks/useCatalog";
import { useHallConfigs, type HallSideKey } from "./hooks/useHallConfigs";
import { useLayoutAssignments } from "./hooks/useLayoutAssignments";
import { useViewportNavigation } from "./hooks/useViewportNavigation";
import type {
  FillDirection,
  HallConfig,
  HallId,
  HallSideConfig,
  HallType,
  PlannerLabelNames,
} from "./types";
import { buildInitialHallConfigs, type StorageLayoutPreset } from "./layoutConfig";
import { buildOrderedSlotIds, clamp } from "./utils";

const STORAGE_LAYOUT_PRESETS: StorageLayoutPreset[] = ["cross", "h", "hcross", "octa"];
const FILL_DIRECTIONS: FillDirection[] = ["row", "column"];
const HALL_TYPES: HallType[] = ["bulk", "chest", "mis"];
const SAVE_FILE_VERSION = 1;
const TOOLBAR_BUTTON_CLASS =
  "rounded-[0.45rem] border border-[rgba(122,99,66,0.45)] bg-[rgba(255,255,255,0.9)] px-[0.72rem] py-[0.32rem] text-[0.74rem] font-semibold text-[#3b2f22] shadow-[0_1px_0_rgba(255,255,255,0.55)] disabled:cursor-not-allowed disabled:opacity-45";

function sectionNameKey(hallId: HallId, sectionIndex: number): string {
  return `${hallId}:${sectionIndex}`;
}

function misNameKey(
  hallId: HallId,
  slice: number,
  side: 0 | 1,
  misUnit: number,
): string {
  return `${hallId}:${slice}:${side}:${misUnit}`;
}

function createEmptyPlannerLabelNames(): PlannerLabelNames {
  return {
    hallNames: {},
    sectionNames: {},
    misNames: {},
  };
}

type PlannerSnapshot = {
  storageLayoutPreset: StorageLayoutPreset;
  fillDirection: FillDirection;
  hallConfigs: Record<HallId, HallConfig>;
  slotAssignments: Record<string, string>;
  labelNames: PlannerLabelNames;
};

type PlannerSaveFile = PlannerSnapshot & {
  version: number;
  savedAt: string;
};

type PlannerHistoryEntry = {
  snapshot: PlannerSnapshot;
  key: string;
};

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

function cloneHallConfigs(hallConfigs: Record<HallId, HallConfig>): Record<HallId, HallConfig> {
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

function cloneSlotAssignments(slotAssignments: Record<string, string>): Record<string, string> {
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

function clonePlannerLabelNames(labelNames: PlannerLabelNames): PlannerLabelNames {
  return {
    hallNames: cloneHallNames(labelNames.hallNames),
    sectionNames: cloneNameMap(labelNames.sectionNames),
    misNames: cloneNameMap(labelNames.misNames),
  };
}

function buildPlannerSnapshot(input: PlannerSnapshot): PlannerSnapshot {
  return {
    storageLayoutPreset: input.storageLayoutPreset,
    fillDirection: input.fillDirection,
    hallConfigs: cloneHallConfigs(input.hallConfigs),
    slotAssignments: cloneSlotAssignments(input.slotAssignments),
    labelNames: clonePlannerLabelNames(input.labelNames),
  };
}

function snapshotToKey(snapshot: PlannerSnapshot): string {
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

function parsePlannerSnapshot(value: unknown): PlannerSnapshot | null {
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

export function PlannerApp() {
  const { catalogItems, isLoadingCatalog, catalogError } = useCatalog();
  const {
    storageLayoutPreset,
    hallConfigs,
    applyLayoutPreset,
    setLayoutState,
    setSectionSlices,
    setSectionSideType,
    setSectionSideRows,
    setSectionSideMisCapacity,
    setSectionSideMisUnits,
    setSectionSideMisWidth,
    addHallSection,
    removeHallSection,
  } = useHallConfigs();
  const [fillDirection, setFillDirection] = useState<FillDirection>("row");
  const {
    itemById,
    activeSlotAssignments,
    usedItemIds,
    selectedSlotIdSet,
    draggedSourceSlotIdSet,
    dragPreviews,
    clearDragState,
    beginItemDrag,
    beginCategoryDrag,
    beginSlotItemDrag,
    beginSlotGroupDrag,
    handleSlotDragOver,
    handleSlotDrop,
    handleViewportDropFallback,
    handleLibraryDragOver,
    handleLibraryDrop,
    preserveAssignmentsForConfigChange,
    replaceSlotAssignments,
    clearSlot,
    setSelectedSlotIds,
  } = useLayoutAssignments({
    catalogItems,
    hallConfigs,
    fillDirection,
  });

  const {
    viewportRef,
    zoom,
    pan,
    adjustZoom,
    fitViewportToBounds,
    recenterViewport,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  } = useViewportNavigation();
  const [pendingLayoutChange, setPendingLayoutChange] = useState<{
    preset: StorageLayoutPreset;
    removedCount: number;
  } | null>(null);
  const [labelNames, setLabelNames] = useState<PlannerLabelNames>(() =>
    createEmptyPlannerLabelNames(),
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const openFileInputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<PlannerHistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);

  const plannerSnapshot = useMemo(
    () =>
      buildPlannerSnapshot({
        storageLayoutPreset,
        fillDirection,
        hallConfigs,
        slotAssignments: activeSlotAssignments,
        labelNames,
      }),
    [activeSlotAssignments, fillDirection, hallConfigs, labelNames, storageLayoutPreset],
  );

  useEffect(() => {
    const key = snapshotToKey(plannerSnapshot);
    const history = historyRef.current;
    const index = historyIndexRef.current;

    if (index >= 0 && history[index]?.key === key) {
      setCanUndo(index > 0);
      setCanRedo(index >= 0 && index < history.length - 1);
      return;
    }

    if (index < history.length - 1) {
      history.splice(index + 1);
    }

    history.push({ snapshot: plannerSnapshot, key });
    const nextIndex = history.length - 1;
    historyIndexRef.current = nextIndex;
    setCanUndo(nextIndex > 0);
    setCanRedo(false);
  }, [plannerSnapshot]);

  function applySnapshot(snapshot: PlannerSnapshot): void {
    setPendingLayoutChange(null);
    clearDragState();
    setSelectedSlotIds([]);
    setFillDirection(snapshot.fillDirection);
    setLayoutState(snapshot.storageLayoutPreset, cloneHallConfigs(snapshot.hallConfigs));
    replaceSlotAssignments(cloneSlotAssignments(snapshot.slotAssignments));
    setLabelNames(clonePlannerLabelNames(snapshot.labelNames));
    recenterViewport();
  }

  function handleHallNameChange(hallId: HallId, rawName: string): void {
    const trimmed = rawName.trim();
    setLabelNames((current) => {
      if (trimmed.length === 0) {
        if (!(hallId in current.hallNames)) {
          return current;
        }
        const nextHallNames = { ...current.hallNames };
        delete nextHallNames[hallId];
        return {
          ...current,
          hallNames: nextHallNames,
        };
      }
      if (current.hallNames[hallId] === trimmed) {
        return current;
      }
      return {
        ...current,
        hallNames: {
          ...current.hallNames,
          [hallId]: trimmed,
        },
      };
    });
  }

  function handleSectionNameChange(hallId: HallId, sectionIndex: number, rawName: string): void {
    const key = sectionNameKey(hallId, sectionIndex);
    const trimmed = rawName.trim();
    setLabelNames((current) => {
      if (trimmed.length === 0) {
        if (!(key in current.sectionNames)) {
          return current;
        }
        const nextSectionNames = { ...current.sectionNames };
        delete nextSectionNames[key];
        return {
          ...current,
          sectionNames: nextSectionNames,
        };
      }
      if (current.sectionNames[key] === trimmed) {
        return current;
      }
      return {
        ...current,
        sectionNames: {
          ...current.sectionNames,
          [key]: trimmed,
        },
      };
    });
  }

  function handleMisNameChange(
    hallId: HallId,
    slice: number,
    side: 0 | 1,
    misUnit: number,
    rawName: string,
  ): void {
    const key = misNameKey(hallId, slice, side, misUnit);
    const trimmed = rawName.trim();
    setLabelNames((current) => {
      if (trimmed.length === 0) {
        if (!(key in current.misNames)) {
          return current;
        }
        const nextMisNames = { ...current.misNames };
        delete nextMisNames[key];
        return {
          ...current,
          misNames: nextMisNames,
        };
      }
      if (current.misNames[key] === trimmed) {
        return current;
      }
      return {
        ...current,
        misNames: {
          ...current.misNames,
          [key]: trimmed,
        },
      };
    });
  }

  function handleOpenClick(): void {
    openFileInputRef.current?.click();
  }

  async function handleOpenFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const parsed = parsePlannerSnapshot(JSON.parse(await file.text()) as unknown);
      if (!parsed) {
        window.alert("Could not open file. Expected a planner save JSON file.");
        return;
      }
      applySnapshot(parsed);
    } catch {
      window.alert("Could not open file. The selected file is not valid JSON.");
    }
  }

  function handleSaveClick(): void {
    const saveFile: PlannerSaveFile = {
      version: SAVE_FILE_VERSION,
      savedAt: new Date().toISOString(),
      ...plannerSnapshot,
    };

    const blob = new Blob([`${JSON.stringify(saveFile, null, 2)}\n`], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `planner-layout-${saveFile.savedAt.replace(/[:]/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  function handleUndoClick(): void {
    const history = historyRef.current;
    const nextIndex = historyIndexRef.current - 1;
    if (nextIndex < 0 || nextIndex >= history.length) {
      return;
    }

    historyIndexRef.current = nextIndex;
    setCanUndo(nextIndex > 0);
    setCanRedo(nextIndex < history.length - 1);
    applySnapshot(history[nextIndex].snapshot);
  }

  function handleRedoClick(): void {
    const history = historyRef.current;
    const nextIndex = historyIndexRef.current + 1;
    if (nextIndex < 0 || nextIndex >= history.length) {
      return;
    }

    historyIndexRef.current = nextIndex;
    setCanUndo(nextIndex > 0);
    setCanRedo(nextIndex < history.length - 1);
    applySnapshot(history[nextIndex].snapshot);
  }

  function handleSectionSlicesChange(hallId: HallId, sectionIndex: number, value: string): void {
    setSectionSlices(hallId, sectionIndex, value);
  }

  function handleSectionSideTypeChange(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    type: HallType,
  ): void {
    setSectionSideType(hallId, sectionIndex, side, type);
  }

  function handleSectionSideRowsChange(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ): void {
    setSectionSideRows(hallId, sectionIndex, side, value);
  }

  function handleSectionSideMisCapacityChange(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ): void {
    setSectionSideMisCapacity(hallId, sectionIndex, side, value);
  }

  function handleSectionSideMisUnitsChange(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ): void {
    setSectionSideMisUnits(hallId, sectionIndex, side, value);
  }

  function handleSectionSideMisWidthChange(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ): void {
    setSectionSideMisWidth(hallId, sectionIndex, side, value);
  }

  function handleAddSection(hallId: HallId): void {
    addHallSection(hallId);
  }

  function handleRemoveSection(hallId: HallId, sectionIndex: number): void {
    removeHallSection(hallId, sectionIndex);
  }

  function applyPresetChange(nextPreset: StorageLayoutPreset): void {
    if (nextPreset === storageLayoutPreset) {
      return;
    }

    const nextHallConfigs = buildInitialHallConfigs(nextPreset);
    const nextSlotCount = buildOrderedSlotIds(nextHallConfigs, fillDirection).length;
    const assignedCount = Object.keys(activeSlotAssignments).length;
    const removedCount = Math.max(0, assignedCount - nextSlotCount);

    if (removedCount > 0) {
      setPendingLayoutChange({
        preset: nextPreset,
        removedCount,
      });
      return;
    }

    preserveAssignmentsForConfigChange(hallConfigs, nextHallConfigs);
    applyLayoutPreset(nextPreset);
    recenterViewport();
  }

  function confirmPendingLayoutChange(): void {
    if (!pendingLayoutChange) {
      return;
    }

    const nextHallConfigs = buildInitialHallConfigs(pendingLayoutChange.preset);
    preserveAssignmentsForConfigChange(hallConfigs, nextHallConfigs);
    applyLayoutPreset(pendingLayoutChange.preset);
    setPendingLayoutChange(null);
    recenterViewport();
  }

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_12%,#fff8e8_0%,rgba(255,248,232,0)_35%),radial-gradient(circle_at_88%_8%,#e2f1ee_0%,rgba(226,241,238,0)_30%),linear-gradient(180deg,#f9f4ea_0%,#f2eadd_100%)] text-[#1f1a16] max-[1200px]:h-auto max-[1200px]:overflow-auto">
      <header className="flex shrink-0 items-center justify-between border-b border-b-[rgba(114,88,46,0.28)] bg-[linear-gradient(180deg,rgba(255,252,245,0.94)_0%,rgba(249,241,226,0.9)_100%)] px-4 py-[0.55rem]">
        <div className="flex items-center gap-[0.45rem]">
          <input
            ref={openFileInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={handleOpenFileChange}
          />
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={handleOpenClick}
          >
            Open
          </button>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={handleSaveClick}
          >
            Save
          </button>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
          >
            Export
          </button>
        </div>
        <div className="flex items-center gap-[0.45rem]">
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={handleUndoClick}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={handleRedoClick}
            disabled={!canRedo}
          >
            Redo
          </button>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden max-[1200px]:flex-col">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-r-[rgba(114,88,46,0.24)] max-[1200px]:min-h-[62vh] max-[1200px]:border-r-0 max-[1200px]:border-b max-[1200px]:border-b-[rgba(114,88,46,0.24)]">
          <LayoutViewport
            storageLayoutPreset={storageLayoutPreset}
            onStorageLayoutPresetChange={applyPresetChange}
            hallConfigs={hallConfigs}
            slotAssignments={activeSlotAssignments}
            itemById={itemById}
            hallNames={labelNames.hallNames}
            sectionNames={labelNames.sectionNames}
            misNames={labelNames.misNames}
            viewportRef={viewportRef}
            zoom={zoom}
            pan={pan}
            onAdjustZoom={adjustZoom}
            onFitViewportToBounds={fitViewportToBounds}
            onRecenterViewport={recenterViewport}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerEnd={handlePointerEnd}
            onSlotDragOver={handleSlotDragOver}
            onSlotDrop={handleSlotDrop}
            onViewportDropFallback={handleViewportDropFallback}
            onSectionSlicesChange={handleSectionSlicesChange}
            onSectionSideTypeChange={handleSectionSideTypeChange}
            onSectionSideRowsChange={handleSectionSideRowsChange}
            onSectionSideMisCapacityChange={handleSectionSideMisCapacityChange}
            onSectionSideMisUnitsChange={handleSectionSideMisUnitsChange}
            onSectionSideMisWidthChange={handleSectionSideMisWidthChange}
            onHallNameChange={handleHallNameChange}
            onSectionNameChange={handleSectionNameChange}
            onMisNameChange={handleMisNameChange}
            onAddSection={handleAddSection}
            onRemoveSection={handleRemoveSection}
            onSlotItemDragStart={beginSlotItemDrag}
            onSlotGroupDragStart={beginSlotGroupDrag}
            onAnyDragEnd={clearDragState}
            onClearSlot={clearSlot}
            draggedSourceSlotIds={draggedSourceSlotIdSet}
            dragPreviewPlacements={dragPreviews}
            selectedSlotIds={selectedSlotIdSet}
            onSelectionChange={setSelectedSlotIds}
          />
        </section>

        <ItemLibraryPanel
          catalogItems={catalogItems}
          isLoadingCatalog={isLoadingCatalog}
          catalogError={catalogError}
          usedItemIds={usedItemIds}
          fillDirection={fillDirection}
          onFillDirectionChange={setFillDirection}
          onItemDragStart={beginItemDrag}
          onCategoryDragStart={beginCategoryDrag}
          onLibraryDragOver={handleLibraryDragOver}
          onLibraryDrop={handleLibraryDrop}
          onAnyDragEnd={clearDragState}
        />
      </div>

      {pendingLayoutChange ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(27,22,16,0.42)] px-4">
          <div className="w-full max-w-md rounded-[0.9rem] border border-[rgba(137,107,67,0.45)] bg-[linear-gradient(180deg,rgba(255,251,241,0.98)_0%,rgba(248,238,220,0.98)_100%)] p-4 shadow-[0_16px_42px_rgba(23,19,13,0.34)]">
            <h3 className="m-0 text-[1rem] font-bold text-[#3b3126]">Confirm Layout Change</h3>
            <p className="mt-2 text-[0.85rem] leading-[1.35] text-[#5f5446]">
              Switching to this layout will remove{" "}
              <span className="font-semibold text-[#8a2f22]">
                {pendingLayoutChange.removedCount}
              </span>{" "}
              placed item{pendingLayoutChange.removedCount === 1 ? "" : "s"} because the new
              layout has fewer slots.
            </p>
            <p className="mt-1 text-[0.78rem] text-[#6c5f4e]">
              Do you want to continue?
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-[0.45rem] border border-[rgba(122,99,66,0.45)] bg-[rgba(255,255,255,0.88)] px-3 py-[0.34rem] text-[0.78rem] font-semibold text-[#3b2f22]"
                onClick={() => setPendingLayoutChange(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-[0.45rem] border border-[rgba(156,55,42,0.52)] bg-[rgba(255,235,231,0.95)] px-3 py-[0.34rem] text-[0.78rem] font-semibold text-[#7c2217]"
                onClick={confirmPendingLayoutChange}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

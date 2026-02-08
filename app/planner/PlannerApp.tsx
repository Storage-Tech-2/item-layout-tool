"use client";

import { type ChangeEvent, useCallback, useMemo, useRef, useState } from "react";
import { ItemLibraryPanel } from "./components/ItemLibraryPanel";
import { LayoutViewport } from "./components/LayoutViewport";
import {
  type PlannerSaveFile,
  type PlannerSnapshot,
  SAVE_FILE_VERSION,
  buildPlannerSnapshot,
  cloneHallConfigs,
  cloneSlotAssignments,
  parsePlannerSnapshot,
  snapshotToKey,
} from "./lib/plannerSnapshot";
import { useCatalog } from "./hooks/useCatalog";
import { useHallConfigs, type HallSideKey } from "./hooks/useHallConfigs";
import { useLayoutAssignments } from "./hooks/useLayoutAssignments";
import { usePlannerHistory } from "./hooks/usePlannerHistory";
import { usePlannerLabelNames } from "./hooks/usePlannerLabelNames";
import { useViewportNavigation } from "./hooks/useViewportNavigation";
import type { FillDirection, HallId, HallType } from "./types";
import { buildInitialHallConfigs, type StorageLayoutPreset } from "./layoutConfig";
import { buildOrderedSlotIds } from "./utils";

const TOOLBAR_BUTTON_CLASS =
  "rounded-[0.45rem] border border-[rgba(122,99,66,0.45)] bg-[rgba(255,255,255,0.9)] px-[0.72rem] py-[0.32rem] text-[0.74rem] font-semibold text-[#3b2f22] shadow-[0_1px_0_rgba(255,255,255,0.55)] disabled:cursor-not-allowed disabled:opacity-45";

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
    labelNames,
    replaceLabelNames,
    handleHallNameChange,
    handleSectionNameChange,
    handleMisNameChange,
  } = usePlannerLabelNames();
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
  const openFileInputRef = useRef<HTMLInputElement | null>(null);

  const plannerSnapshot = useMemo<PlannerSnapshot>(
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
  const plannerSnapshotKey = useMemo(
    () => snapshotToKey(plannerSnapshot),
    [plannerSnapshot],
  );

  const applySnapshot = useCallback(
    (snapshot: PlannerSnapshot) => {
      setPendingLayoutChange(null);
      clearDragState();
      setSelectedSlotIds([]);
      setFillDirection(snapshot.fillDirection);
      setLayoutState(snapshot.storageLayoutPreset, cloneHallConfigs(snapshot.hallConfigs));
      replaceSlotAssignments(cloneSlotAssignments(snapshot.slotAssignments));
      replaceLabelNames(snapshot.labelNames);
      recenterViewport();
    },
    [
      clearDragState,
      recenterViewport,
      replaceLabelNames,
      replaceSlotAssignments,
      setLayoutState,
      setSelectedSlotIds,
    ],
  );

  const { canUndo, canRedo, undo, redo } = usePlannerHistory({
    snapshot: plannerSnapshot,
    snapshotKey: plannerSnapshotKey,
    onApplySnapshot: applySnapshot,
  });

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
            onClick={undo}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={redo}
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

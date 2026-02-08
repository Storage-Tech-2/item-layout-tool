"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  type PlannerAutosaveDraft,
  clearPlannerAutosaveDraft,
  loadPlannerAutosaveDraft,
  savePlannerAutosaveDraft,
} from "./lib/plannerDraftStore";
import type { FillDirection, HallId, HallType } from "./types";
import { buildInitialHallConfigs, type StorageLayoutPreset } from "./layoutConfig";
import { buildOrderedSlotIds } from "./utils";

const TOOLBAR_BUTTON_CLASS =
  "rounded-[0.45rem] border border-[rgba(122,99,66,0.45)] bg-[rgba(255,255,255,0.9)] px-[0.72rem] py-[0.32rem] text-[0.74rem] font-semibold text-[#3b2f22] shadow-[0_1px_0_rgba(255,255,255,0.55)] disabled:cursor-not-allowed disabled:opacity-45";
const AUTOSAVE_DEBOUNCE_MS = 800;

function shouldIgnoreHistoryHotkeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function formatAutosaveTimestamp(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isFinite(date.getTime())) {
    return date.toLocaleString();
  }
  return savedAt;
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
    cursorSlotId,
    cursorMovementHint,
    selectedSlotIdSet,
    draggedSourceSlotIdSet,
    dragPreviews,
    clearDragState,
    setCursorSlot,
    setCursorMisUnit,
    placeLibraryItemAtCursor,
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
    handleLayoutNameChange,
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
  const [pendingAutosaveRestore, setPendingAutosaveRestore] = useState<PlannerAutosaveDraft | null>(
    null,
  );
  const [isAutosaveRestoreResolved, setIsAutosaveRestoreResolved] = useState(false);
  const openFileInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  type ApplySnapshotOptions = {
    recenter?: boolean;
  };

  const applySnapshot = useCallback(
    (snapshot: PlannerSnapshot, options?: ApplySnapshotOptions) => {
      setPendingLayoutChange(null);
      clearDragState();
      setSelectedSlotIds([]);
      setFillDirection(snapshot.fillDirection);
      setLayoutState(snapshot.storageLayoutPreset, cloneHallConfigs(snapshot.hallConfigs));
      replaceSlotAssignments(cloneSlotAssignments(snapshot.slotAssignments));
      replaceLabelNames(snapshot.labelNames);
      if (options?.recenter ?? true) {
        recenterViewport();
      }
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

  const applyHistorySnapshot = useCallback(
    (snapshot: PlannerSnapshot) => {
      applySnapshot(snapshot, { recenter: false });
    },
    [applySnapshot],
  );

  const { canUndo, canRedo, undo, redo, getHistoryState, restoreHistoryState } = usePlannerHistory({
    snapshot: plannerSnapshot,
    snapshotKey: plannerSnapshotKey,
    onApplySnapshot: applyHistorySnapshot,
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() !== "z") {
        return;
      }
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }
      if (shouldIgnoreHistoryHotkeys(event.target)) {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        if (canRedo) {
          redo();
        }
        return;
      }

      if (canUndo) {
        undo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canRedo, canUndo, redo, undo]);

  useEffect(() => {
    let isCancelled = false;
    void (async () => {
      try {
        const draft = await loadPlannerAutosaveDraft();
        if (isCancelled) {
          return;
        }
        if (draft && draft.history.entries.length > 0) {
          setPendingAutosaveRestore(draft);
        } else {
          if (draft) {
            void clearPlannerAutosaveDraft().catch(() => {
              // Ignore clear failures and continue without prompting.
            });
          }
          setIsAutosaveRestoreResolved(true);
        }
      } catch {
        if (!isCancelled) {
          setIsAutosaveRestoreResolved(true);
        }
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current !== null) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAutosaveRestoreResolved || pendingAutosaveRestore) {
      return;
    }

    const historyState = getHistoryState();
    if (!historyState) {
      return;
    }
    if (historyState.entries.length === 0) {
      return;
    }

    if (autosaveTimeoutRef.current !== null) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      autosaveTimeoutRef.current = null;
      void savePlannerAutosaveDraft({
        savedAt: new Date().toISOString(),
        snapshot: plannerSnapshot,
        history: getHistoryState() ?? historyState,
      }).catch(() => {
        // Ignore autosave failures (storage can be unavailable in some browser modes).
      });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimeoutRef.current !== null) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [
    getHistoryState,
    isAutosaveRestoreResolved,
    pendingAutosaveRestore,
    plannerSnapshot,
    plannerSnapshotKey,
  ]);

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

  function handleRestoreAutosaveClick(): void {
    if (!pendingAutosaveRestore) {
      return;
    }

    restoreHistoryState(pendingAutosaveRestore.history);
    applySnapshot(pendingAutosaveRestore.history.currentSnapshot);
    setPendingAutosaveRestore(null);
    setIsAutosaveRestoreResolved(true);
  }

  async function handleDiscardAutosaveClick(): Promise<void> {
    setPendingAutosaveRestore(null);
    setIsAutosaveRestoreResolved(true);
    try {
      await clearPlannerAutosaveDraft();
    } catch {
      // Ignore draft-clear failures and continue with a fresh session.
    }
  }

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_12%,#fff8e8_0%,rgba(255,248,232,0)_35%),radial-gradient(circle_at_88%_8%,#e2f1ee_0%,rgba(226,241,238,0)_30%),linear-gradient(180deg,#f9f4ea_0%,#f2eadd_100%)] text-[#1f1a16] max-[1200px]:h-auto max-[1200px]:overflow-auto">
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-b-[rgba(114,88,46,0.28)] bg-[linear-gradient(180deg,rgba(255,252,245,0.94)_0%,rgba(249,241,226,0.9)_100%)] px-4 py-[0.55rem]">
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
        <div className="justify-self-center">
          <input
            type="text"
            className="min-w-[10rem] max-w-[38vw] rounded-[0.38rem] border border-[rgba(126,100,66,0.28)] bg-[rgba(255,250,239,0.85)] px-[0.62rem] py-[0.2rem] text-center text-[0.82rem] font-semibold tracking-[0.01em] text-[#4b3a24] placeholder:text-[#8a7a63] focus:bg-[rgba(255,255,255,0.94)] focus:outline-none"
            title="Click to rename layout"
            placeholder="Untitled Layout"
            value={labelNames.layoutName}
            onChange={(event) => handleLayoutNameChange(event.target.value)}
          />
        </div>
        <div className="flex items-center justify-self-end gap-[0.45rem]">
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
            cursorSlotId={cursorSlotId}
            cursorMovementHint={cursorMovementHint}
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
            onCursorSlotChange={setCursorSlot}
            onCursorMisChange={setCursorMisUnit}
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
          onItemContextPlace={placeLibraryItemAtCursor}
          onItemDragStart={beginItemDrag}
          onCategoryDragStart={beginCategoryDrag}
          onLibraryDragOver={handleLibraryDragOver}
          onLibraryDrop={handleLibraryDrop}
          onAnyDragEnd={clearDragState}
        />
      </div>

      {pendingAutosaveRestore ? (
        <div className="fixed inset-0 z-70 grid place-items-center bg-[rgba(19,15,10,0.45)] px-4">
          <div className="w-full max-w-md rounded-[0.9rem] border border-[rgba(126,101,67,0.46)] bg-[linear-gradient(180deg,rgba(255,252,244,0.98)_0%,rgba(247,236,217,0.98)_100%)] p-4 shadow-[0_16px_42px_rgba(23,19,13,0.35)]">
            <h3 className="m-0 text-[1rem] font-bold text-[#3b3126]">Restore Autosave?</h3>
            <p className="mt-2 text-[0.84rem] leading-[1.35] text-[#5f5446]">
              A local autosave from{" "}
              <span className="font-semibold text-[#3b2f22]">
                {formatAutosaveTimestamp(pendingAutosaveRestore.savedAt)}
              </span>{" "}
              was found.
            </p>
            <p className="mt-1 text-[0.78rem] text-[#6c5f4e]">
              Restore the autosaved layout and history?
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-[0.45rem] border border-[rgba(122,99,66,0.45)] bg-[rgba(255,255,255,0.88)] px-3 py-[0.34rem] text-[0.78rem] font-semibold text-[#3b2f22]"
                onClick={() => {
                  void handleDiscardAutosaveClick();
                }}
              >
                Start Fresh
              </button>
              <button
                type="button"
                className="rounded-[0.45rem] border border-[rgba(61,116,87,0.52)] bg-[rgba(231,250,238,0.95)] px-3 py-[0.34rem] text-[0.78rem] font-semibold text-[#204b35]"
                onClick={handleRestoreAutosaveClick}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

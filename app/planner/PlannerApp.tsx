"use client";

import { ItemLibraryPanel } from "./components/ItemLibraryPanel";
import { LayoutViewport } from "./components/LayoutViewport";
import { useCatalog } from "./hooks/useCatalog";
import {
  nextConfigsForHallMisCapacity,
  nextConfigsForHallMisUnitsPerSlice,
  nextConfigsForHallRows,
  nextConfigsForHallSlices,
  nextConfigsForHallType,
  nextConfigsForPreset,
  useHallConfigs,
} from "./hooks/useHallConfigs";
import { useLayoutAssignments } from "./hooks/useLayoutAssignments";
import { useViewportNavigation } from "./hooks/useViewportNavigation";
import type { HallId, HallType } from "./types";

export function PlannerApp() {
  const { catalogItems, isLoadingCatalog, catalogError } = useCatalog();
  const {
    hallConfigs,
    setHallType,
    setHallSlices,
    setHallRowsPerSide,
    setHallMisCapacity,
    setHallMisUnitsPerSlice,
    applyHallPreset,
  } = useHallConfigs();
  const {
    itemById,
    activeSlotAssignments,
    usedItemIds,
    selectedSlotIdSet,
    draggedSourceSlotIdSet,
    dragPreviews,
    clearLayout,
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
    clearSlot,
    setSelectedSlotIds,
  } = useLayoutAssignments({
    catalogItems,
    hallConfigs,
  });

  const {
    viewportRef,
    zoom,
    pan,
    adjustZoom,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  } = useViewportNavigation();

  function handleHallTypeChange(hallId: HallId, nextType: HallType): void {
    const nextConfigs = nextConfigsForHallType(hallConfigs, hallId, nextType);
    preserveAssignmentsForConfigChange(hallConfigs, nextConfigs);
    setHallType(hallId, nextType);
  }

  function handleHallSlicesChange(hallId: HallId, value: string): void {
    const nextConfigs = nextConfigsForHallSlices(hallConfigs, hallId, value);
    preserveAssignmentsForConfigChange(hallConfigs, nextConfigs);
    setHallSlices(hallId, value);
  }

  function handleHallRowsChange(hallId: HallId, value: string): void {
    const nextConfigs = nextConfigsForHallRows(hallConfigs, hallId, value);
    preserveAssignmentsForConfigChange(hallConfigs, nextConfigs);
    setHallRowsPerSide(hallId, value);
  }

  function handleHallMisCapacityChange(hallId: HallId, value: string): void {
    const nextConfigs = nextConfigsForHallMisCapacity(hallConfigs, hallId, value);
    preserveAssignmentsForConfigChange(hallConfigs, nextConfigs);
    setHallMisCapacity(hallId, value);
  }

  function handleHallMisUnitsPerSliceChange(hallId: HallId, value: string): void {
    const nextConfigs = nextConfigsForHallMisUnitsPerSlice(hallConfigs, hallId, value);
    preserveAssignmentsForConfigChange(hallConfigs, nextConfigs);
    setHallMisUnitsPerSlice(hallId, value);
  }

  function handleApplyPreset(type: HallType): void {
    const nextConfigs = nextConfigsForPreset(hallConfigs, type);
    preserveAssignmentsForConfigChange(hallConfigs, nextConfigs);
    applyHallPreset(type);
  }

  return (
    <div className="flex h-screen min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_12%,#fff8e8_0%,rgba(255,248,232,0)_35%),radial-gradient(circle_at_88%_8%,#e2f1ee_0%,rgba(226,241,238,0)_30%),linear-gradient(180deg,#f9f4ea_0%,#f2eadd_100%)] text-[#1f1a16] max-[1200px]:h-auto max-[1200px]:flex-col max-[1200px]:overflow-auto">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-r-[rgba(114,88,46,0.24)] max-[1200px]:min-h-[62vh] max-[1200px]:border-r-0 max-[1200px]:border-b max-[1200px]:border-b-[rgba(114,88,46,0.24)]">
        <LayoutViewport
          hallConfigs={hallConfigs}
          slotAssignments={activeSlotAssignments}
          itemById={itemById}
          viewportRef={viewportRef}
          zoom={zoom}
          pan={pan}
          onAdjustZoom={adjustZoom}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerEnd={handlePointerEnd}
          onSlotDragOver={handleSlotDragOver}
          onSlotDrop={handleSlotDrop}
          onViewportDropFallback={handleViewportDropFallback}
          onApplyPreset={handleApplyPreset}
          onClearLayout={clearLayout}
          onHallTypeChange={handleHallTypeChange}
          onHallSlicesChange={handleHallSlicesChange}
          onHallRowsChange={handleHallRowsChange}
          onHallMisCapacityChange={handleHallMisCapacityChange}
          onHallMisUnitsChange={handleHallMisUnitsPerSliceChange}
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
        onItemDragStart={beginItemDrag}
        onCategoryDragStart={beginCategoryDrag}
        onLibraryDragOver={handleLibraryDragOver}
        onLibraryDrop={handleLibraryDrop}
        onAnyDragEnd={clearDragState}
      />
    </div>
  );
}

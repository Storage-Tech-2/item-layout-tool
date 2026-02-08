"use client";

import { useState } from "react";
import { ItemLibraryPanel } from "./components/ItemLibraryPanel";
import { LayoutViewport } from "./components/LayoutViewport";
import { useCatalog } from "./hooks/useCatalog";
import { useHallConfigs, type HallSideKey } from "./hooks/useHallConfigs";
import { useLayoutAssignments } from "./hooks/useLayoutAssignments";
import { useViewportNavigation } from "./hooks/useViewportNavigation";
import type { FillDirection, HallId, HallType } from "./types";

export function PlannerApp() {
  const { catalogItems, isLoadingCatalog, catalogError } = useCatalog();
  const {
    hallConfigs,
    setSectionSlices,
    setSectionSideType,
    setSectionSideRows,
    setSectionSideMisCapacity,
    setSectionSideMisUnits,
    setSectionSideMisWidth,
    addHallSection,
    removeHallSection,
  } = useHallConfigs();
  const [fillDirection, setFillDirection] = useState<FillDirection>("column");
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
    recenterViewport,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  } = useViewportNavigation();

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
          fillDirection={fillDirection}
          onAdjustZoom={adjustZoom}
          onFillDirectionChange={setFillDirection}
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
        onItemDragStart={beginItemDrag}
        onCategoryDragStart={beginCategoryDrag}
        onLibraryDragOver={handleLibraryDragOver}
        onLibraryDrop={handleLibraryDrop}
        onAnyDragEnd={clearDragState}
      />
    </div>
  );
}

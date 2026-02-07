"use client";

import { ItemLibraryPanel } from "./components/ItemLibraryPanel";
import { LayoutControls } from "./components/LayoutControls";
import { LayoutViewport } from "./components/LayoutViewport";
import { useCatalog } from "./hooks/useCatalog";
import { useHallConfigs } from "./hooks/useHallConfigs";
import { useLayoutAssignments } from "./hooks/useLayoutAssignments";
import { useViewportNavigation } from "./hooks/useViewportNavigation";

export function PlannerApp() {
  const { catalogItems, isLoadingCatalog, catalogError } = useCatalog();
  const {
    hallConfigs,
    setHallType,
    setHallSlices,
    setHallRowsPerSide,
    setHallMisCapacity,
    applyHallPreset,
  } = useHallConfigs();
  const {
    itemById,
    activeSlotAssignments,
    usedItemIds,
    selectedSlotIdSet,
    dragPreviews,
    clearLayout,
    clearDragState,
    beginItemDrag,
    beginCategoryDrag,
    beginSlotItemDrag,
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

  return (
    <div className="flex h-screen min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_12%,#fff8e8_0%,rgba(255,248,232,0)_35%),radial-gradient(circle_at_88%_8%,#e2f1ee_0%,rgba(226,241,238,0)_30%),linear-gradient(180deg,#f9f4ea_0%,#f2eadd_100%)] text-[#1f1a16] max-[1200px]:h-auto max-[1200px]:flex-col max-[1200px]:overflow-auto">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-r-[rgba(114,88,46,0.24)] max-[1200px]:min-h-[62vh] max-[1200px]:border-r-0 max-[1200px]:border-b max-[1200px]:border-b-[rgba(114,88,46,0.24)]">
        <LayoutControls
          hallConfigs={hallConfigs}
          onApplyPreset={applyHallPreset}
          onClearLayout={clearLayout}
          onHallTypeChange={setHallType}
          onHallSlicesChange={setHallSlices}
          onHallRowsChange={setHallRowsPerSide}
          onHallMisCapacityChange={setHallMisCapacity}
        />

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
          onSlotItemDragStart={beginSlotItemDrag}
          onAnyDragEnd={clearDragState}
          onClearSlot={clearSlot}
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

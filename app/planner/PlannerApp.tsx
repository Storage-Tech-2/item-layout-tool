"use client";

import { type DragEvent, useMemo, useState } from "react";
import {
  DEFAULT_HALLS,
  DRAG_DATA_KEY,
  HALL_ORDER,
  HALL_TYPE_DEFAULTS,
} from "./constants";
import { useCatalog } from "./hooks/useCatalog";
import { useViewportNavigation } from "./hooks/useViewportNavigation";
import type { DragPayload, HallConfig, HallId, HallType } from "./types";
import { buildOrderedSlotIds, clamp, parseDragPayload } from "./utils";
import { LayoutControls } from "./components/LayoutControls";
import { LayoutViewport } from "./components/LayoutViewport";
import { ItemLibraryPanel } from "./components/ItemLibraryPanel";

type PreviewPlacement = {
  slotId: string;
  itemId: string;
};

function retainValidAssignments(
  assignments: Record<string, string>,
  validSlotIds: Set<string>,
): Record<string, string> {
  const next: Record<string, string> = {};

  for (const [slotId, itemId] of Object.entries(assignments)) {
    if (validSlotIds.has(slotId)) {
      next[slotId] = itemId;
    }
  }

  return next;
}

export function PlannerApp() {
  const { catalogItems, isLoadingCatalog, catalogError } = useCatalog();

  const [hallConfigs, setHallConfigs] = useState<Record<HallId, HallConfig>>(DEFAULT_HALLS);
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [activeDragPayload, setActiveDragPayload] = useState<DragPayload | null>(
    null,
  );
  const [dragPreviews, setDragPreviews] = useState<PreviewPlacement[]>([]);

  const {
    viewportRef,
    zoom,
    pan,
    adjustZoom,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  } = useViewportNavigation();

  const orderedSlotIds = useMemo(() => buildOrderedSlotIds(hallConfigs), [hallConfigs]);

  const orderedSlotIdSet = useMemo(() => new Set(orderedSlotIds), [orderedSlotIds]);

  const activeSlotAssignments = useMemo(
    () => retainValidAssignments(slotAssignments, orderedSlotIdSet),
    [orderedSlotIdSet, slotAssignments],
  );

  const itemById = useMemo(
    () => new Map(catalogItems.map((item) => [item.id, item])),
    [catalogItems],
  );

  const usedItemIds = useMemo(() => {
    const used = new Set<string>();
    for (const itemId of Object.values(activeSlotAssignments)) {
      if (itemId) {
        used.add(itemId);
      }
    }
    return used;
  }, [activeSlotAssignments]);

  const selectedSlotIdSet = useMemo(
    () => new Set(selectedSlotIds),
    [selectedSlotIds],
  );

  const selectedSlotsInOrder = useMemo(
    () =>
      orderedSlotIds.filter(
        (slotId) => selectedSlotIdSet.has(slotId) && Boolean(activeSlotAssignments[slotId]),
      ),
    [activeSlotAssignments, orderedSlotIds, selectedSlotIdSet],
  );

  function setHallType(hallId: HallId, nextType: HallType): void {
    setHallConfigs((current) => {
      const prev = current[hallId];
      const defaults = HALL_TYPE_DEFAULTS[nextType];
      return {
        ...current,
        [hallId]: {
          ...prev,
          type: nextType,
          rowsPerSide: nextType === "mis" ? prev.rowsPerSide : defaults.rowsPerSide,
          misSlotsPerSlice:
            nextType === "mis"
              ? Math.max(10, prev.misSlotsPerSlice)
              : prev.misSlotsPerSlice,
        },
      };
    });
  }

  function setHallSlices(hallId: HallId, rawValue: string): void {
    const nextValue = clamp(Number(rawValue) || 1, 1, 72);
    setHallConfigs((current) => ({
      ...current,
      [hallId]: {
        ...current[hallId],
        slices: nextValue,
      },
    }));
  }

  function setHallRowsPerSide(hallId: HallId, rawValue: string): void {
    const nextValue = clamp(Number(rawValue) || 1, 1, 9);
    setHallConfigs((current) => ({
      ...current,
      [hallId]: {
        ...current[hallId],
        rowsPerSide: nextValue,
      },
    }));
  }

  function setHallMisCapacity(hallId: HallId, rawValue: string): void {
    const nextValue = clamp(Number(rawValue) || 10, 10, 200);
    setHallConfigs((current) => ({
      ...current,
      [hallId]: {
        ...current[hallId],
        misSlotsPerSlice: nextValue,
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

  function clearLayout(): void {
    setSlotAssignments({});
    setSelectedSlotIds([]);
  }

  function beginItemDrag(event: DragEvent<HTMLElement>, itemId: string): void {
    const payload: DragPayload = {
      kind: "item",
      itemIds: [itemId],
      source: "catalog",
    };
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      DRAG_DATA_KEY,
      JSON.stringify(payload),
    );
    setActiveDragPayload(payload);
    setDragPreviews([]);
  }

  function beginCategoryDrag(
    event: DragEvent<HTMLElement>,
    itemIds: string[],
  ): void {
    if (itemIds.length === 0) {
      event.preventDefault();
      return;
    }

    const payload: DragPayload = {
      kind: "category",
      itemIds,
      source: "catalog",
    };
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      DRAG_DATA_KEY,
      JSON.stringify(payload),
    );
    setActiveDragPayload(payload);
    setDragPreviews([]);
  }

  function beginSlotItemDrag(
    event: DragEvent<HTMLElement>,
    slotId: string,
    itemId: string,
  ): void {
    const isMultiMove =
      selectedSlotIdSet.has(slotId) && selectedSlotsInOrder.length > 1;
    const selectedItemIds = selectedSlotsInOrder
      .map((selectedSlotId) => activeSlotAssignments[selectedSlotId])
      .filter((selectedItemId): selectedItemId is string => Boolean(selectedItemId));

    const dragItemIds = isMultiMove ? selectedItemIds : [itemId];

    const payload: DragPayload = {
      kind: dragItemIds.length > 1 ? "category" : "item",
      itemIds: dragItemIds,
      source: "layout",
      originSlotId: slotId,
    };

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_DATA_KEY, JSON.stringify(payload));
    setActiveDragPayload(payload);
    if (isMultiMove) {
      setDragPreviews(
        selectedSlotsInOrder.map((selectedSlotId, index) => ({
          slotId: selectedSlotId,
          itemId: selectedItemIds[index] ?? itemId,
        })),
      );
    } else {
      setDragPreviews([{ slotId, itemId }]);
      setSelectedSlotIds([slotId]);
    }
  }

  function clearDragState(): void {
    setActiveDragPayload(null);
    setDragPreviews([]);
  }

  function buildPlacements(
    anchorSlotId: string,
    payload: DragPayload,
    assignments: Record<string, string>,
  ): PreviewPlacement[] {
    const anchorIndex = orderedSlotIds.indexOf(anchorSlotId);
    if (anchorIndex === -1) {
      return [];
    }

    const incoming = payload.itemIds.filter((itemId) => itemById.has(itemId));
    if (incoming.length === 0) {
      return [];
    }

    const working = retainValidAssignments(assignments, orderedSlotIdSet);
    const incomingSet = new Set(incoming);

    for (const [slotId, itemId] of Object.entries(working)) {
      if (incomingSet.has(itemId)) {
        delete working[slotId];
      }
    }

    if (payload.kind === "item") {
      return [
        {
          slotId: anchorSlotId,
          itemId: incoming[0],
        },
      ];
    }

    const previews: PreviewPlacement[] = [];
    let cursor = anchorIndex;

    for (const itemId of incoming) {
      while (cursor < orderedSlotIds.length && working[orderedSlotIds[cursor]]) {
        cursor += 1;
      }

      if (cursor >= orderedSlotIds.length) {
        break;
      }

      const slotId = orderedSlotIds[cursor];
      previews.push({ slotId, itemId });
      working[slotId] = itemId;
      cursor += 1;
    }

    return previews;
  }

  function arePreviewsEqual(
    current: PreviewPlacement[],
    next: PreviewPlacement[],
  ): boolean {
    if (current.length !== next.length) {
      return false;
    }

    for (let index = 0; index < current.length; index += 1) {
      const currentPlacement = current[index];
      const nextPlacement = next[index];
      if (
        currentPlacement.slotId !== nextPlacement.slotId ||
        currentPlacement.itemId !== nextPlacement.itemId
      ) {
        return false;
      }
    }

    return true;
  }

  function handleSlotDragOver(event: DragEvent<HTMLElement>, slotId: string): void {
    event.preventDefault();

    const payload =
      parseDragPayload(event.dataTransfer.getData(DRAG_DATA_KEY)) ?? activeDragPayload;

    if (!payload) {
      setDragPreviews([]);
      return;
    }

    event.dataTransfer.dropEffect =
      payload.source === "layout" ? "move" : "copy";

    setActiveDragPayload(payload);

    const nextPreviews = buildPlacements(slotId, payload, activeSlotAssignments);
    setDragPreviews((current) =>
      arePreviewsEqual(current, nextPreviews) ? current : nextPreviews,
    );
  }

  function placePayload(anchorSlotId: string, payload: DragPayload): void {
    const anchorIndex = orderedSlotIds.indexOf(anchorSlotId);
    if (anchorIndex === -1) {
      return;
    }

    setSlotAssignments((current) => {
      const next = retainValidAssignments(current, orderedSlotIdSet);
      const incoming = payload.itemIds.filter((itemId) => itemById.has(itemId));

      if (incoming.length === 0) {
        return current;
      }

      const incomingSet = new Set(incoming);
      for (const [slotId, itemId] of Object.entries(next)) {
        if (incomingSet.has(itemId)) {
          delete next[slotId];
        }
      }

      const placements = buildPlacements(anchorSlotId, payload, current);
      if (placements.length === 0) {
        return current;
      }

      for (const placement of placements) {
        next[placement.slotId] = placement.itemId;
      }

      return next;
    });
  }

  function handleSlotDrop(event: DragEvent<HTMLElement>, anchorSlotId: string): void {
    event.preventDefault();
    const payload =
      parseDragPayload(event.dataTransfer.getData(DRAG_DATA_KEY)) ?? activeDragPayload;
    if (!payload) {
      clearDragState();
      return;
    }

    const placements = buildPlacements(anchorSlotId, payload, activeSlotAssignments);
    placePayload(anchorSlotId, payload);
    if (payload.source === "layout") {
      setSelectedSlotIds(placements.map((placement) => placement.slotId));
    }
    clearDragState();
  }

  function handleLibraryDragOver(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect =
      activeDragPayload?.source === "layout" ? "move" : "copy";

    if (dragPreviews.length > 0) {
      setDragPreviews([]);
    }
  }

  function handleLibraryDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();

    const payload =
      parseDragPayload(event.dataTransfer.getData(DRAG_DATA_KEY)) ?? activeDragPayload;
    if (!payload) {
      clearDragState();
      return;
    }

    if (payload.source === "layout") {
      const incomingSet = new Set(payload.itemIds);
      setSlotAssignments((current) => {
        const next = retainValidAssignments(current, orderedSlotIdSet);
        for (const [slotId, itemId] of Object.entries(next)) {
          if (incomingSet.has(itemId)) {
            delete next[slotId];
          }
        }
        return next;
      });
      setSelectedSlotIds([]);
    }

    clearDragState();
  }

  function clearSlot(slotId: string): void {
    setSlotAssignments((current) => {
      if (!(slotId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[slotId];
      return next;
    });

    setSelectedSlotIds((current) => current.filter((entry) => entry !== slotId));
  }

  function handleSelectionChange(nextSelection: string[]): void {
    setSelectedSlotIds(nextSelection);
  }

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
          onSlotItemDragStart={beginSlotItemDrag}
          onAnyDragEnd={clearDragState}
          onClearSlot={clearSlot}
          dragPreviewPlacements={dragPreviews}
          selectedSlotIds={selectedSlotIdSet}
          onSelectionChange={handleSelectionChange}
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

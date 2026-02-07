import { type DragEvent, useMemo, useState } from "react";
import { DRAG_DATA_KEY } from "../constants";
import { retainValidAssignments } from "../lib/layoutAssignments";
import { buildSlotCenters, toPointKey } from "../lib/layoutGeometry";
import {
  arePreviewsEqual,
  buildPlacements,
  buildSwapPlacements,
  getIncomingEntries,
} from "../lib/placementEngine";
import type {
  CatalogItem,
  DragPayload,
  HallConfig,
  HallId,
  PreviewPlacement,
} from "../types";
import { buildOrderedSlotIds, parseDragPayload } from "../utils";

type UseLayoutAssignmentsInput = {
  catalogItems: CatalogItem[];
  hallConfigs: Record<HallId, HallConfig>;
};

type UseLayoutAssignmentsResult = {
  itemById: Map<string, CatalogItem>;
  activeSlotAssignments: Record<string, string>;
  usedItemIds: Set<string>;
  selectedSlotIdSet: Set<string>;
  draggedSourceSlotIdSet: Set<string>;
  dragPreviews: PreviewPlacement[];
  clearLayout: () => void;
  clearDragState: () => void;
  beginItemDrag: (event: DragEvent<HTMLElement>, itemId: string) => void;
  beginCategoryDrag: (event: DragEvent<HTMLElement>, itemIds: string[]) => void;
  beginSlotItemDrag: (
    event: DragEvent<HTMLElement>,
    slotId: string,
    itemId: string,
  ) => void;
  handleSlotDragOver: (event: DragEvent<HTMLElement>, slotId: string) => void;
  handleSlotDrop: (event: DragEvent<HTMLElement>, slotId: string) => void;
  handleViewportDropFallback: (event: DragEvent<HTMLElement>) => void;
  handleLibraryDragOver: (event: DragEvent<HTMLElement>) => void;
  handleLibraryDrop: (event: DragEvent<HTMLElement>) => void;
  clearSlot: (slotId: string) => void;
  setSelectedSlotIds: (slotIds: string[]) => void;
};

export function useLayoutAssignments({
  catalogItems,
  hallConfigs,
}: UseLayoutAssignmentsInput): UseLayoutAssignmentsResult {
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});
  const [selectedSlotIds, setSelectedSlotIdsState] = useState<string[]>([]);
  const [activeDragPayload, setActiveDragPayload] = useState<DragPayload | null>(null);
  const [dragPreviews, setDragPreviews] = useState<PreviewPlacement[]>([]);

  const orderedSlotIds = useMemo(() => buildOrderedSlotIds(hallConfigs), [hallConfigs]);
  const orderedSlotIdSet = useMemo(() => new Set(orderedSlotIds), [orderedSlotIds]);

  const slotCenterById = useMemo(() => buildSlotCenters(hallConfigs), [hallConfigs]);
  const slotIdByPointKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const [slotId, point] of slotCenterById.entries()) {
      map.set(toPointKey(point), slotId);
    }
    return map;
  }, [slotCenterById]);

  const placementContext = useMemo(
    () => ({
      orderedSlotIds,
      orderedSlotIdSet,
      itemById: new Map(catalogItems.map((item) => [item.id, item])),
      slotCenterById,
      slotIdByPointKey,
    }),
    [catalogItems, orderedSlotIds, orderedSlotIdSet, slotCenterById, slotIdByPointKey],
  );
  const itemById = placementContext.itemById;

  const activeSlotAssignments = useMemo(
    () => retainValidAssignments(slotAssignments, orderedSlotIdSet),
    [orderedSlotIdSet, slotAssignments],
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

  const selectedSlotIdSet = useMemo(() => new Set(selectedSlotIds), [selectedSlotIds]);
  const draggedSourceSlotIdSet = useMemo(() => {
    if (activeDragPayload?.source !== "layout") {
      return new Set<string>();
    }

    const slotIds = activeDragPayload.sourceSlotIds ?? [];
    if (slotIds.length === 0 && activeDragPayload.originSlotId) {
      return orderedSlotIdSet.has(activeDragPayload.originSlotId)
        ? new Set([activeDragPayload.originSlotId])
        : new Set<string>();
    }

    const next = new Set<string>();
    for (const slotId of slotIds) {
      if (orderedSlotIdSet.has(slotId)) {
        next.add(slotId);
      }
    }
    return next;
  }, [activeDragPayload, orderedSlotIdSet]);

  const selectedSlotsInOrder = useMemo(
    () =>
      orderedSlotIds.filter(
        (slotId) => selectedSlotIdSet.has(slotId) && Boolean(activeSlotAssignments[slotId]),
      ),
    [activeSlotAssignments, orderedSlotIds, selectedSlotIdSet],
  );

  function clearLayout(): void {
    setSlotAssignments({});
    setSelectedSlotIdsState([]);
  }

  function clearDragState(): void {
    setActiveDragPayload(null);
    setDragPreviews([]);
  }

  function beginItemDrag(event: DragEvent<HTMLElement>, itemId: string): void {
    const payload: DragPayload = {
      kind: "item",
      itemIds: [itemId],
      source: "catalog",
    };

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(DRAG_DATA_KEY, JSON.stringify(payload));
    setActiveDragPayload(payload);
    setDragPreviews([]);
  }

  function beginCategoryDrag(event: DragEvent<HTMLElement>, itemIds: string[]): void {
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
    event.dataTransfer.setData(DRAG_DATA_KEY, JSON.stringify(payload));
    setActiveDragPayload(payload);
    setDragPreviews([]);
  }

  function beginSlotItemDrag(
    event: DragEvent<HTMLElement>,
    slotId: string,
    itemId: string,
  ): void {
    const isMultiMove = selectedSlotIdSet.has(slotId) && selectedSlotsInOrder.length > 1;
    const selectedItemIds = selectedSlotsInOrder
      .map((selectedSlotId) => activeSlotAssignments[selectedSlotId])
      .filter((selectedItemId): selectedItemId is string => Boolean(selectedItemId));

    const dragItemIds = isMultiMove ? selectedItemIds : [itemId];
    const payload: DragPayload = {
      kind: dragItemIds.length > 1 ? "category" : "item",
      itemIds: dragItemIds,
      source: "layout",
      originSlotId: slotId,
      sourceSlotIds: isMultiMove ? selectedSlotsInOrder : [slotId],
    };

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_DATA_KEY, JSON.stringify(payload));
    setActiveDragPayload(payload);
    setDragPreviews([]);
    if (!isMultiMove) {
      setSelectedSlotIdsState([slotId]);
    }
  }

  function buildPreviewSet(anchorSlotId: string, payload: DragPayload): PreviewPlacement[] {
    const placements = buildPlacements({
      anchorSlotId,
      payload,
      assignments: activeSlotAssignments,
      context: placementContext,
    });

    const incomingEntries = getIncomingEntries(payload, itemById);
    const swapPreviews = buildSwapPlacements({
      payload,
      incomingEntries,
      placements,
      assignments: activeSlotAssignments,
      orderedSlotIdSet,
    });

    return swapPreviews === null ? placements : [...placements, ...swapPreviews];
  }

  function getPayloadFromDragEvent(event: DragEvent<HTMLElement>): DragPayload | null {
    return parseDragPayload(event.dataTransfer.getData(DRAG_DATA_KEY)) ?? activeDragPayload;
  }

  function handleSlotDragOver(event: DragEvent<HTMLElement>, slotId: string): void {
    event.preventDefault();

    const payload = getPayloadFromDragEvent(event);
    if (!payload) {
      setDragPreviews([]);
      return;
    }

    event.dataTransfer.dropEffect = payload.source === "layout" ? "move" : "copy";
    setActiveDragPayload(payload);

    const nextPreviews = buildPreviewSet(slotId, payload);
    setDragPreviews((current) =>
      arePreviewsEqual(current, nextPreviews) ? current : nextPreviews,
    );
  }

  function placePayload(anchorSlotId: string, payload: DragPayload): void {
    if (!orderedSlotIdSet.has(anchorSlotId)) {
      return;
    }

    setSlotAssignments((current) => {
      const next = retainValidAssignments(current, orderedSlotIdSet);
      const incomingEntries = getIncomingEntries(payload, itemById);
      const incoming = incomingEntries.map((entry) => entry.itemId);

      if (incoming.length === 0) {
        return current;
      }

      const placements = buildPlacements({
        anchorSlotId,
        payload,
        assignments: current,
        context: placementContext,
      });
      if (placements.length === 0) {
        return current;
      }

      const swapPlacements = buildSwapPlacements({
        payload,
        incomingEntries,
        placements,
        assignments: current,
        orderedSlotIdSet,
      });
      if (swapPlacements === null) {
        return current;
      }

      const incomingSet = new Set(incoming);
      for (const [slotId, itemId] of Object.entries(next)) {
        if (incomingSet.has(itemId)) {
          delete next[slotId];
        }
      }

      for (const placement of placements) {
        next[placement.slotId] = placement.itemId;
      }

      for (const swapPlacement of swapPlacements) {
        next[swapPlacement.slotId] = swapPlacement.itemId;
      }

      return next;
    });
  }

  function handleSlotDrop(event: DragEvent<HTMLElement>, anchorSlotId: string): void {
    event.preventDefault();

    const payload = getPayloadFromDragEvent(event);
    if (!payload) {
      clearDragState();
      return;
    }

    const placements = buildPlacements({
      anchorSlotId,
      payload,
      assignments: activeSlotAssignments,
      context: placementContext,
    });

    placePayload(anchorSlotId, payload);
    if (payload.source === "layout") {
      setSelectedSlotIdsState(placements.map((placement) => placement.slotId));
    }
    clearDragState();
  }

  function handleViewportDropFallback(event: DragEvent<HTMLElement>): void {
    event.preventDefault();

    const payload = getPayloadFromDragEvent(event);
    if (!payload) {
      clearDragState();
      return;
    }

    const anchorSlotId = dragPreviews.find((placement) => placement.kind === "place")?.slotId;
    if (!anchorSlotId) {
      clearDragState();
      return;
    }

    const placements = buildPlacements({
      anchorSlotId,
      payload,
      assignments: activeSlotAssignments,
      context: placementContext,
    });

    if (placements.length === 0) {
      clearDragState();
      return;
    }

    placePayload(anchorSlotId, payload);
    if (payload.source === "layout") {
      setSelectedSlotIdsState(placements.map((placement) => placement.slotId));
    }
    clearDragState();
  }

  function handleLibraryDragOver(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = activeDragPayload?.source === "layout" ? "move" : "copy";

    if (dragPreviews.length > 0) {
      setDragPreviews([]);
    }
  }

  function handleLibraryDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();

    const payload = getPayloadFromDragEvent(event);
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
      setSelectedSlotIdsState([]);
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

    setSelectedSlotIdsState((current) => current.filter((entry) => entry !== slotId));
  }

  function setSelectedSlotIds(slotIds: string[]): void {
    setSelectedSlotIdsState(slotIds);
  }

  return {
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
    handleSlotDragOver,
    handleSlotDrop,
    handleViewportDropFallback,
    handleLibraryDragOver,
    handleLibraryDrop,
    clearSlot,
    setSelectedSlotIds,
  };
}

import { type DragEvent, useMemo, useState } from "react";
import { DRAG_DATA_KEY, HALL_ORDER } from "../constants";
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
  beginSlotGroupDrag: (
    event: DragEvent<HTMLElement>,
    slotIds: string[],
    originSlotId?: string,
  ) => void;
  handleSlotDragOver: (event: DragEvent<HTMLElement>, slotId: string) => void;
  handleSlotDrop: (event: DragEvent<HTMLElement>, slotId: string) => void;
  handleViewportDropFallback: (event: DragEvent<HTMLElement>) => void;
  handleLibraryDragOver: (event: DragEvent<HTMLElement>) => void;
  handleLibraryDrop: (event: DragEvent<HTMLElement>) => void;
  preserveAssignmentsForConfigChange: (
    previousConfigs: Record<HallId, HallConfig>,
    nextConfigs: Record<HallId, HallConfig>,
  ) => void;
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

  function beginSlotGroupDrag(
    event: DragEvent<HTMLElement>,
    slotIds: string[],
    originSlotId?: string,
  ): void {
    const normalizedSlotIds: string[] = [];
    const seen = new Set<string>();
    for (const slotId of slotIds) {
      if (!orderedSlotIdSet.has(slotId) || seen.has(slotId)) {
        continue;
      }
      normalizedSlotIds.push(slotId);
      seen.add(slotId);
    }

    const entries = normalizedSlotIds
      .map((slotId) => ({
        slotId,
        itemId: activeSlotAssignments[slotId],
      }))
      .filter((entry): entry is { slotId: string; itemId: string } => Boolean(entry.itemId));

    if (entries.length === 0) {
      event.preventDefault();
      return;
    }

    const nextOriginSlotId =
      originSlotId && entries.some((entry) => entry.slotId === originSlotId)
        ? originSlotId
        : entries[0].slotId;

    const payload: DragPayload = {
      kind: entries.length > 1 ? "category" : "item",
      itemIds: entries.map((entry) => entry.itemId),
      source: "layout",
      originSlotId: nextOriginSlotId,
      sourceSlotIds: entries.map((entry) => entry.slotId),
    };

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_DATA_KEY, JSON.stringify(payload));
    setActiveDragPayload(payload);
    setDragPreviews([]);
    setSelectedSlotIdsState(entries.map((entry) => entry.slotId));
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

  function preserveAssignmentsForConfigChange(
    previousConfigs: Record<HallId, HallConfig>,
    nextConfigs: Record<HallId, HallConfig>,
  ): void {
    const previousOrderedSlotIds = buildOrderedSlotIds(previousConfigs);
    const nextOrderedSlotIds = buildOrderedSlotIds(nextConfigs);
    const previousValidSlotIdSet = new Set(previousOrderedSlotIds);
    const nextOrderIndex = new Map(
      nextOrderedSlotIds.map((slotId, index) => [slotId, index]),
    );
    const previousOrderIndex = new Map(
      previousOrderedSlotIds.map((slotId, index) => [slotId, index]),
    );
    const previousCenterBySlotId = buildSlotCenters(previousConfigs);
    const nextCenterBySlotId = buildSlotCenters(nextConfigs);

    const parseHallId = (slotId: string): HallId | null => {
      const hallId = slotId.split(":")[0];
      if (hallId === "north" || hallId === "east" || hallId === "south" || hallId === "west") {
        return hallId;
      }
      return null;
    };

    const pickNearestSlot = (
      targetPoint: { x: number; y: number } | undefined,
      candidates: Set<string>,
    ): string | null => {
      let bestSlotId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      let bestOrder = Number.POSITIVE_INFINITY;

      for (const candidateSlotId of candidates) {
        const center = nextCenterBySlotId.get(candidateSlotId);
        const order = nextOrderIndex.get(candidateSlotId) ?? Number.POSITIVE_INFINITY;
        const distance = targetPoint
          ? ((center?.x ?? Number.POSITIVE_INFINITY) - targetPoint.x) ** 2 +
            ((center?.y ?? Number.POSITIVE_INFINITY) - targetPoint.y) ** 2
          : Number.POSITIVE_INFINITY;

        if (
          distance < bestDistance ||
          (distance === bestDistance && order < bestOrder)
        ) {
          bestDistance = distance;
          bestOrder = order;
          bestSlotId = candidateSlotId;
        }
      }

      if (!bestSlotId && candidates.size > 0) {
        bestSlotId = Array.from(candidates).sort((a, b) => {
          return (nextOrderIndex.get(a) ?? Number.POSITIVE_INFINITY) -
            (nextOrderIndex.get(b) ?? Number.POSITIVE_INFINITY);
        })[0] ?? null;
      }

      return bestSlotId;
    };

    setSlotAssignments((current) => {
      const currentFromPrevious = retainValidAssignments(current, previousValidSlotIdSet);
      const entries = Object.entries(currentFromPrevious)
        .map(([slotId, itemId]) => ({
          slotId,
          itemId,
          hallId: parseHallId(slotId),
          point: previousCenterBySlotId.get(slotId),
        }))
        .sort((a, b) => {
          return (previousOrderIndex.get(a.slotId) ?? Number.POSITIVE_INFINITY) -
            (previousOrderIndex.get(b.slotId) ?? Number.POSITIVE_INFINITY);
        });

      if (entries.length === 0) {
        return {};
      }

      const unassignedGlobal = new Set(nextOrderedSlotIds);
      const unassignedByHall = new Map<HallId, Set<string>>();
      for (const hallId of HALL_ORDER) {
        const hallSlots = nextOrderedSlotIds.filter((slotId) => slotId.startsWith(`${hallId}:`));
        unassignedByHall.set(hallId, new Set(hallSlots));
      }

      const remapped: Record<string, string> = {};

      for (const entry of entries) {
        let targetSlotId: string | null = null;

        if (entry.hallId) {
          const hallCandidates = unassignedByHall.get(entry.hallId);
          if (hallCandidates && hallCandidates.size > 0) {
            targetSlotId = pickNearestSlot(entry.point, hallCandidates);
          }
        }

        if (!targetSlotId && unassignedGlobal.size > 0) {
          targetSlotId = pickNearestSlot(entry.point, unassignedGlobal);
        }

        if (!targetSlotId) {
          continue;
        }

        remapped[targetSlotId] = entry.itemId;
        unassignedGlobal.delete(targetSlotId);
        const targetHallId = parseHallId(targetSlotId);
        if (targetHallId) {
          unassignedByHall.get(targetHallId)?.delete(targetSlotId);
        }
      }

      return remapped;
    });

    setSelectedSlotIdsState([]);
    clearDragState();
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
    beginSlotGroupDrag,
    handleSlotDragOver,
    handleSlotDrop,
    handleViewportDropFallback,
    handleLibraryDragOver,
    handleLibraryDrop,
    preserveAssignmentsForConfigChange,
    clearSlot,
    setSelectedSlotIds,
  };
}

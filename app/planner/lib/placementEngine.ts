import type {
  CatalogItem,
  DragPayload,
  IncomingEntry,
  PreviewPlacement,
  SlotPoint,
} from "../types";
import { retainValidAssignments } from "./layoutAssignments";
import { toPointKey } from "./layoutGeometry";

type PlacementContext = {
  orderedSlotIds: string[];
  orderedSlotIdSet: Set<string>;
  itemById: Map<string, CatalogItem>;
  slotCenterById: Map<string, SlotPoint>;
  slotIdByPointKey: Map<string, string>;
};

type BuildPlacementsInput = {
  anchorSlotId: string;
  payload: DragPayload;
  assignments: Record<string, string>;
  context: PlacementContext;
};

type BuildSwapPlacementsInput = {
  payload: DragPayload;
  incomingEntries: IncomingEntry[];
  placements: PreviewPlacement[];
  assignments: Record<string, string>;
  orderedSlotIdSet: Set<string>;
};

export function getIncomingEntries(
  payload: DragPayload,
  itemById: Map<string, CatalogItem>,
): IncomingEntry[] {
  return payload.itemIds
    .map((itemId, index) => ({
      itemId,
      sourceSlotId: payload.sourceSlotIds?.[index],
    }))
    .filter((entry) => itemById.has(entry.itemId));
}

export function buildPlacements({
  anchorSlotId,
  payload,
  assignments,
  context,
}: BuildPlacementsInput): PreviewPlacement[] {
  const {
    orderedSlotIds,
    orderedSlotIdSet,
    itemById,
    slotCenterById,
    slotIdByPointKey,
  } = context;

  const anchorIndex = orderedSlotIds.indexOf(anchorSlotId);
  if (anchorIndex === -1) {
    return [];
  }

  const incomingEntries = getIncomingEntries(payload, itemById);
  const incoming = incomingEntries.map((entry) => entry.itemId);
  if (incoming.length === 0) {
    return [];
  }

  const allowOccupiedTargets = payload.source === "layout";
  const working = retainValidAssignments(assignments, orderedSlotIdSet);
  const incomingSet = new Set(incoming);

  for (const [slotId, itemId] of Object.entries(working)) {
    if (incomingSet.has(itemId)) {
      delete working[slotId];
    }
  }

  const canTryShapePlacement =
    payload.source === "layout" &&
    payload.kind === "category" &&
    Boolean(payload.originSlotId) &&
    Array.isArray(payload.sourceSlotIds) &&
    payload.sourceSlotIds.length === payload.itemIds.length;

  if (canTryShapePlacement) {
    const originSlotId = payload.originSlotId as string;
    const originPoint = slotCenterById.get(originSlotId);
    const anchorPoint = slotCenterById.get(anchorSlotId);

    if (originPoint && anchorPoint) {
      const delta = {
        x: anchorPoint.x - originPoint.x,
        y: anchorPoint.y - originPoint.y,
      };

      const shapePlacements: PreviewPlacement[] = [];
      const usedTargetSlots = new Set<string>();

      for (const entry of incomingEntries) {
        if (!entry.sourceSlotId) {
          continue;
        }

        const sourcePoint = slotCenterById.get(entry.sourceSlotId);
        if (!sourcePoint) {
          continue;
        }

        const targetPoint = {
          x: sourcePoint.x + delta.x,
          y: sourcePoint.y + delta.y,
        };
        const targetSlotId = slotIdByPointKey.get(toPointKey(targetPoint));

        if (!targetSlotId) {
          continue;
        }

        if (usedTargetSlots.has(targetSlotId)) {
          continue;
        }

        if (!allowOccupiedTargets && working[targetSlotId]) {
          continue;
        }

        shapePlacements.push({
          slotId: targetSlotId,
          itemId: entry.itemId,
          kind: "place",
        });
        usedTargetSlots.add(targetSlotId);
        working[targetSlotId] = entry.itemId;
      }

      if (shapePlacements.length === incomingEntries.length) {
        return shapePlacements;
      }
    }
  }

  if (payload.kind === "item") {
    return [
      {
        slotId: anchorSlotId,
        itemId: incoming[0],
        kind: "place",
      },
    ];
  }

  const previews: PreviewPlacement[] = [];
  let cursor = anchorIndex;

  for (const itemId of incoming) {
    if (!allowOccupiedTargets) {
      while (cursor < orderedSlotIds.length && working[orderedSlotIds[cursor]]) {
        cursor += 1;
      }
    }

    if (cursor >= orderedSlotIds.length) {
      break;
    }

    const slotId = orderedSlotIds[cursor];
    previews.push({ slotId, itemId, kind: "place" });
    working[slotId] = itemId;
    cursor += 1;
  }

  return previews;
}

export function buildSwapPlacements({
  payload,
  incomingEntries,
  placements,
  assignments,
  orderedSlotIdSet,
}: BuildSwapPlacementsInput): PreviewPlacement[] | null {
  if (payload.source !== "layout" || placements.length === 0) {
    return [];
  }

  const incomingSet = new Set(incomingEntries.map((entry) => entry.itemId));
  const displaced: Array<{ itemId: string; preferredSlotId?: string }> = [];

  for (const [index, placement] of placements.entries()) {
    const existingItemId = assignments[placement.slotId];
    if (existingItemId && !incomingSet.has(existingItemId)) {
      displaced.push({
        itemId: existingItemId,
        preferredSlotId: incomingEntries[index]?.sourceSlotId,
      });
    }
  }

  if (displaced.length === 0) {
    return [];
  }

  const next = retainValidAssignments(assignments, orderedSlotIdSet);
  for (const [slotId, itemId] of Object.entries(next)) {
    if (incomingSet.has(itemId)) {
      delete next[slotId];
    }
  }
  for (const placement of placements) {
    next[placement.slotId] = placement.itemId;
  }

  const targetSlots = new Set(placements.map((placement) => placement.slotId));
  const sourceSlots: string[] = [];
  const sourceSlotSet = new Set<string>();

  for (const entry of incomingEntries) {
    if (
      entry.sourceSlotId &&
      orderedSlotIdSet.has(entry.sourceSlotId) &&
      !sourceSlotSet.has(entry.sourceSlotId)
    ) {
      sourceSlots.push(entry.sourceSlotId);
      sourceSlotSet.add(entry.sourceSlotId);
    }
  }

  const candidateSwapSlots = sourceSlots.filter(
    (slotId) => !targetSlots.has(slotId) && !next[slotId],
  );

  if (candidateSwapSlots.length < displaced.length) {
    return null;
  }

  const swapPlacements: PreviewPlacement[] = [];
  const usedSwapSlots = new Set<string>();
  const remaining: string[] = [];

  for (const item of displaced) {
    const preferred = item.preferredSlotId;
    if (
      preferred &&
      candidateSwapSlots.includes(preferred) &&
      !usedSwapSlots.has(preferred)
    ) {
      swapPlacements.push({
        slotId: preferred,
        itemId: item.itemId,
        kind: "swap",
      });
      usedSwapSlots.add(preferred);
      continue;
    }

    remaining.push(item.itemId);
  }

  let cursor = 0;
  for (const itemId of remaining) {
    while (
      cursor < candidateSwapSlots.length &&
      usedSwapSlots.has(candidateSwapSlots[cursor])
    ) {
      cursor += 1;
    }

    if (cursor >= candidateSwapSlots.length) {
      return null;
    }

    const slotId = candidateSwapSlots[cursor];
    swapPlacements.push({
      slotId,
      itemId,
      kind: "swap",
    });
    usedSwapSlots.add(slotId);
    cursor += 1;
  }

  return swapPlacements;
}

export function arePreviewsEqual(
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
      currentPlacement.itemId !== nextPlacement.itemId ||
      currentPlacement.kind !== nextPlacement.kind
    ) {
      return false;
    }
  }

  return true;
}

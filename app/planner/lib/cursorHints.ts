import type { CursorMovementHint } from "../components/layoutViewport/types";
import type { FillDirection, HallId } from "../types";

export type CursorHintMode = "layout" | "popup";

type ParsedMisSlotId = {
  hallId: HallId;
  slice: number;
  side: 0 | 1;
  misUnit: number;
  index: number;
};

type ParsedSlotMeta = {
  hallId: HallId;
  kind: "g" | "m";
  slice: number;
  side: 0 | 1;
  row?: number;
  misUnit?: number;
  index?: number;
};

export function parseMisSlotIdValue(slotId: string): ParsedMisSlotId | null {
  const parts = slotId.split(":");
  if (parts.length !== 6 || parts[1] !== "m") {
    return null;
  }
  const hallId = Number(parts[0]);
  const slice = Number(parts[2]);
  const side = Number(parts[3]);
  const misUnit = Number(parts[4]);
  const index = Number(parts[5]);
  if (
    !Number.isFinite(hallId) ||
    !Number.isFinite(slice) ||
    (side !== 0 && side !== 1) ||
    !Number.isFinite(misUnit) ||
    !Number.isFinite(index)
  ) {
    return null;
  }
  return { hallId, slice, side, misUnit, index };
}

function parseSlotMeta(slotId: string): ParsedSlotMeta | null {
  const parts = slotId.split(":");
  if (parts.length < 5) {
    return null;
  }

  const hallId = Number(parts[0]);
  const kind = parts[1];
  const slice = Number(parts[2]);
  const side = Number(parts[3]) as 0 | 1;
  if (
    !Number.isFinite(hallId) ||
    !Number.isFinite(slice) ||
    (side !== 0 && side !== 1)
  ) {
    return null;
  }

  if (kind === "g" && parts.length >= 5) {
    const row = Number(parts[4]);
    if (!Number.isFinite(row)) {
      return null;
    }
    return {
      hallId,
      kind: "g",
      slice,
      side,
      row,
    };
  }

  if (kind === "m" && parts.length >= 6) {
    const misUnit = Number(parts[4]);
    const index = Number(parts[5]);
    if (!Number.isFinite(misUnit) || !Number.isFinite(index)) {
      return null;
    }
    return {
      hallId,
      kind: "m",
      slice,
      side,
      misUnit,
      index,
    };
  }

  return null;
}

export function buildCursorMovementHint(
  fromSlotId: string,
  toSlotId: string,
  fillDirection: FillDirection,
  mode: CursorHintMode,
): CursorMovementHint | null {
  if (!fromSlotId || !toSlotId || fromSlotId === toSlotId) {
    return null;
  }

  const fromMeta = parseSlotMeta(fromSlotId);
  const toMeta = parseSlotMeta(toSlotId);
  if (!fromMeta || !toMeta) {
    return null;
  }

  if (fromMeta.slice === toMeta.slice) {
    return null;
  }

  if (fromMeta.hallId !== toMeta.hallId) {
    return {
      fromSlotId,
      toSlotId,
      style: "hall-jump",
      direction: "right",
    };
  }

  if (fromMeta.side !== toMeta.side) {
    return {
      fromSlotId,
      toSlotId,
      style: "turn",
      direction: toMeta.side > fromMeta.side ? "down" : "up",
      turnToDirection: toMeta.slice >= fromMeta.slice ? "right" : "left",
    };
  }

  const fromRow = fromMeta.row ?? fromMeta.misUnit ?? 0;
  const toRow = toMeta.row ?? toMeta.misUnit ?? 0;

  if (fillDirection === "row") {
    if (fromRow !== toRow) {
      return {
        fromSlotId,
        toSlotId,
        style: "turn",
        direction: toRow >= fromRow ? "down" : "up",
        turnToDirection: toMeta.slice >= fromMeta.slice ? "right" : "left",
      };
    }
    return {
      fromSlotId,
      toSlotId,
      style: "straight",
      direction: toMeta.slice >= fromMeta.slice ? "right" : "left",
    };
  }

  if (fromMeta.slice !== toMeta.slice) {
    return {
      fromSlotId,
      toSlotId,
      style: "turn",
      direction: toMeta.slice >= fromMeta.slice ? "right" : "left",
      turnToDirection: toRow >= fromRow ? "down" : "up",
    };
  }
  return {
    fromSlotId,
    toSlotId,
    style: "straight",
    direction: toRow >= fromRow ? "down" : "up",
  };
}

export function buildPopupCursorHint(
 fromSlotId: string,
  toSlotId: string,
  fillDirection: FillDirection,
  mode: CursorHintMode,
  popupColumnsBySlotId: Map<string, number>,
): CursorMovementHint | null {
  const columns = popupColumnsBySlotId.get(slotId);
  if (!columns || columns <= 1) {
    return hint;
  }
  const fromMeta = parseMisSlotIdValue(hint.fromSlotId);
  const toMeta = parseMisSlotIdValue(hint.toSlotId);
  if (!fromMeta || !toMeta) {
    return hint;
  }
  const sameMisUnit =
    fromMeta.hallId === toMeta.hallId &&
    fromMeta.slice === toMeta.slice &&
    fromMeta.side === toMeta.side &&
    fromMeta.misUnit === toMeta.misUnit;
  const atEndOfRow = (fromMeta.index + 1) % columns === 0;

  if (!atEndOfRow) {
    return {
      ...hint,
      style: "straight",
      direction: "right",
      turnToDirection: undefined,
    };
  }

  const hasAnotherRowInSameUnit =
    sameMisUnit &&
    toMeta.index > fromMeta.index &&
    Math.floor(toMeta.index / columns) > Math.floor(fromMeta.index / columns);

  if (hasAnotherRowInSameUnit) {
    return {
      ...hint,
      style: "turn",
      direction: "down",
      turnToDirection: "left",
    };
  }

  return {
    ...hint,
    style: "hall-jump",
    direction: "down",
    turnToDirection: undefined,
  };
}

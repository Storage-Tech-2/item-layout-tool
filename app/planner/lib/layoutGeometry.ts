import {
  CORE_SIZE,
  HALL_GAP,
  HALL_ORIENTATION,
  HALL_ORDER,
  MIS_CROSS,
  MIS_SLICE_MAIN,
  SLOT_GAP,
  SLOT_SIZE,
  STAGE_SIZE,
} from "../constants";
import type { HallConfig, HallId, SlotPoint } from "../types";
import { getHallSize } from "../utils";

export function toPointKey(point: SlotPoint): string {
  return `${Math.round(point.x * 1000)}:${Math.round(point.y * 1000)}`;
}

export function getHallTopLeft(
  hallId: HallId,
  hallWidth: number,
  hallHeight: number,
): SlotPoint {
  const center = STAGE_SIZE / 2;
  if (hallId === "north") {
    return {
      x: center - hallWidth / 2,
      y: center - CORE_SIZE / 2 - HALL_GAP - hallHeight,
    };
  }

  if (hallId === "south") {
    return {
      x: center - hallWidth / 2,
      y: center + CORE_SIZE / 2 + HALL_GAP,
    };
  }

  if (hallId === "east") {
    return {
      x: center + CORE_SIZE / 2 + HALL_GAP,
      y: center - hallHeight / 2,
    };
  }

  return {
    x: center - CORE_SIZE / 2 - HALL_GAP - hallWidth,
    y: center - hallHeight / 2,
  };
}

export function buildSlotCenters(
  hallConfigs: Record<HallId, HallConfig>,
): Map<string, SlotPoint> {
  const slotCenters = new Map<string, SlotPoint>();

  for (const hallId of HALL_ORDER) {
    const config = hallConfigs[hallId];

    const orientation = HALL_ORIENTATION[hallId];
    const { width, height } = getHallSize(config, orientation);
    const hallTopLeft = getHallTopLeft(hallId, width, height);
    if (config.type === "mis") {
      for (let slice = 0; slice < config.slices; slice += 1) {
        const sliceLeft =
          orientation === "horizontal"
            ? hallTopLeft.x + slice * (MIS_SLICE_MAIN + SLOT_GAP)
            : hallTopLeft.x;
        const sliceTop =
          orientation === "horizontal"
            ? hallTopLeft.y
            : hallTopLeft.y + slice * (MIS_SLICE_MAIN + SLOT_GAP);
        const sliceWidth = orientation === "horizontal" ? MIS_SLICE_MAIN : MIS_CROSS;
        const sliceHeight = orientation === "horizontal" ? MIS_CROSS : MIS_SLICE_MAIN;
        const columns =
          config.misSlotsPerSlice % 9 === 0
            ? 9
            : Math.min(12, Math.max(6, Math.ceil(Math.sqrt(config.misSlotsPerSlice))));
        const rows = Math.max(1, Math.ceil(config.misSlotsPerSlice / columns));
        const cellWidth = sliceWidth / columns;
        const cellHeight = sliceHeight / rows;

        for (let index = 0; index < config.misSlotsPerSlice; index += 1) {
          const column = index % columns;
          const row = Math.floor(index / columns);
          slotCenters.set(`${hallId}:m:${slice}:${index}`, {
            x: sliceLeft + (column + 0.5) * cellWidth,
            y: sliceTop + (row + 0.5) * cellHeight,
          });
        }
      }
      continue;
    }

    const step = SLOT_SIZE + SLOT_GAP;
    const sideDepthPx =
      config.rowsPerSide * SLOT_SIZE + Math.max(0, config.rowsPerSide - 1) * SLOT_GAP;

    if (orientation === "horizontal") {
      const topGridTop = hallTopLeft.y;
      const bottomGridTop = hallTopLeft.y + height - sideDepthPx;

      for (let slice = 0; slice < config.slices; slice += 1) {
        for (let row = 0; row < config.rowsPerSide; row += 1) {
          const x = hallTopLeft.x + slice * step + SLOT_SIZE / 2;
          const topY = topGridTop + row * step + SLOT_SIZE / 2;
          const bottomY = bottomGridTop + row * step + SLOT_SIZE / 2;

          slotCenters.set(`${hallId}:g:${slice}:0:${row}`, { x, y: topY });
          slotCenters.set(`${hallId}:g:${slice}:1:${row}`, { x, y: bottomY });
        }
      }
      continue;
    }

    const leftGridLeft = hallTopLeft.x;
    const rightGridLeft = hallTopLeft.x + width - sideDepthPx;

    for (let slice = 0; slice < config.slices; slice += 1) {
      for (let row = 0; row < config.rowsPerSide; row += 1) {
        const y = hallTopLeft.y + slice * step + SLOT_SIZE / 2;
        const leftX = leftGridLeft + row * step + SLOT_SIZE / 2;
        const rightX = rightGridLeft + row * step + SLOT_SIZE / 2;

        slotCenters.set(`${hallId}:g:${slice}:0:${row}`, { x: leftX, y });
        slotCenters.set(`${hallId}:g:${slice}:1:${row}`, { x: rightX, y });
      }
    }
  }

  return slotCenters;
}

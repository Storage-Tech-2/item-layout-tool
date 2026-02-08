import Image from "next/image";
import {
  type DragEvent,
  type PointerEvent,
  type RefObject,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CORE_SIZE,
  HALL_GAP,
  HALL_LABELS,
  HALL_ORIENTATION,
  HALL_ORDER,
  SLOT_GAP,
  SLOT_SIZE,
  STAGE_SIZE,
} from "../constants";
import type {
  CatalogItem,
  HallConfig,
  HallId,
  HallType,
  PreviewPlacement,
} from "../types";
import { getHallSize, misSlotId, nonMisSlotId, toTitle } from "../utils";

type LayoutViewportProps = {
  hallConfigs: Record<HallId, HallConfig>;
  slotAssignments: Record<string, string>;
  itemById: Map<string, CatalogItem>;
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  onAdjustZoom: (delta: number) => void;
  onRecenterViewport: (focusPoint?: { x: number; y: number }) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => boolean;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onSlotDragOver: (event: DragEvent<HTMLElement>, slotId: string) => void;
  onSlotDrop: (event: DragEvent<HTMLElement>, slotId: string) => void;
  onViewportDropFallback: (event: DragEvent<HTMLElement>) => void;
  onApplyPreset: (type: HallType) => void;
  onClearLayout: () => void;
  onHallTypeChange: (hallId: HallId, type: HallType) => void;
  onHallSlicesChange: (hallId: HallId, value: string) => void;
  onHallRowsChange: (hallId: HallId, value: string) => void;
  onHallMisCapacityChange: (hallId: HallId, value: string) => void;
  onHallMisUnitsChange: (hallId: HallId, value: string) => void;
  onSlotItemDragStart: (
    event: DragEvent<HTMLElement>,
    slotId: string,
    itemId: string,
  ) => void;
  onSlotGroupDragStart: (
    event: DragEvent<HTMLElement>,
    slotIds: string[],
    originSlotId?: string,
  ) => void;
  onAnyDragEnd: () => void;
  onClearSlot: (slotId: string) => void;
  draggedSourceSlotIds: Set<string>;
  dragPreviewPlacements: PreviewPlacement[];
  selectedSlotIds: Set<string>;
  onSelectionChange: (slotIds: string[]) => void;
};

type DeferredNumberInputProps = {
  value: number;
  min: number;
  max: number;
  className: string;
  onCommit: (value: string) => void;
};

type ExpandedMisTarget = {
  hallId: HallId;
  slice: number;
  misUnit: number;
};

type ExpandedMisEntry = {
  target: ExpandedMisTarget;
  config: HallConfig;
  slotIds: string[];
  columns: number;
  colorIndex: number;
};

type LayoutViewMode = "storage" | "flat";

type FlatLayoutMetrics = {
  dimensions: Array<{ hallId: HallId; width: number; height: number }>;
  totalHeight: number;
  maxWidth: number;
  left: number;
  top: number;
};

function toExpandedMisKey(target: ExpandedMisTarget): string {
  return `${target.hallId}:${target.slice}:${target.misUnit}`;
}

const MIS_OPEN_CARD_CLASSES = [
  "border-[rgba(24,120,92,0.88)] bg-[linear-gradient(180deg,rgba(228,248,241,0.98)_0%,rgba(202,232,220,0.98)_100%)] shadow-[0_0_0_2px_rgba(16,185,129,0.33)]",
  "border-[rgba(176,93,26,0.88)] bg-[linear-gradient(180deg,rgba(255,245,222,0.98)_0%,rgba(247,226,178,0.98)_100%)] shadow-[0_0_0_2px_rgba(245,158,11,0.32)]",
] as const;

const MIS_OPEN_PANEL_CLASSES = [
  "border-[rgba(58,90,74,0.55)] bg-[linear-gradient(180deg,rgba(244,250,240,0.97)_0%,rgba(223,236,216,0.97)_100%)]",
  "border-[rgba(139,88,31,0.55)] bg-[linear-gradient(180deg,rgba(255,248,233,0.97)_0%,rgba(245,229,198,0.97)_100%)]",
] as const;

function getVisualSliceOrder(
  hallId: HallId,
  slices: number,
  viewMode: LayoutViewMode,
): number[] {
  const order = Array.from({ length: slices }, (_, index) => index);
  if (viewMode === "storage" && (hallId === "north" || hallId === "west")) {
    order.reverse();
  }
  return order;
}

function buildFlatLayoutMetrics(
  hallConfigs: Record<HallId, HallConfig>,
  center: number,
): FlatLayoutMetrics {
  const verticalGap = 34;
  const dimensions = HALL_ORDER.map((hallId) => {
    const config = hallConfigs[hallId];
    const orientation: "horizontal" | "vertical" = "horizontal";
    const { width, height } = getHallSize(config, orientation);
    return { hallId, width, height };
  });
  const totalHeight =
    dimensions.reduce((sum, hall) => sum + hall.height, 0) +
    Math.max(0, dimensions.length - 1) * verticalGap;
  const maxWidth = dimensions.reduce((max, hall) => Math.max(max, hall.width), 0);
  return {
    dimensions,
    totalHeight,
    maxWidth,
    left: center - maxWidth / 2,
    top: center - totalHeight / 2,
  };
}

function DeferredNumberInput({
  value,
  min,
  max,
  className,
  onCommit,
}: DeferredNumberInputProps) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  return (
    <input
      className={className}
      type="number"
      min={min}
      max={max}
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={() => onCommit(draftValue)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export function LayoutViewport({
  hallConfigs,
  slotAssignments,
  itemById,
  viewportRef,
  zoom,
  pan,
  onAdjustZoom,
  onRecenterViewport,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onSlotDragOver,
  onSlotDrop,
  onViewportDropFallback,
  onApplyPreset,
  onClearLayout,
  onHallTypeChange,
  onHallSlicesChange,
  onHallRowsChange,
  onHallMisCapacityChange,
  onHallMisUnitsChange,
  onSlotItemDragStart,
  onSlotGroupDragStart,
  onAnyDragEnd,
  onClearSlot,
  draggedSourceSlotIds,
  dragPreviewPlacements,
  selectedSlotIds,
  onSelectionChange,
}: LayoutViewportProps) {
  const center = STAGE_SIZE / 2;
  const selectionPointerId = useRef<number | null>(null);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [expandedMisSlices, setExpandedMisSlices] = useState<ExpandedMisTarget[]>([]);
  const [viewMode, setViewMode] = useState<LayoutViewMode>("storage");

  const viewportBackgroundStyle = useMemo(
    () => ({
      backgroundImage:
        "linear-gradient(90deg, rgba(124, 98, 61, 0.12) 1px, transparent 1px), linear-gradient(rgba(124, 98, 61, 0.12) 1px, transparent 1px), radial-gradient(circle at 20% 16%, rgba(255, 251, 240, 0.75) 0%, rgba(255, 251, 240, 0) 40%), #f6eddf",
      backgroundSize: "24px 24px, 24px 24px, auto, auto",
    }),
    [],
  );

  const previewBySlot = useMemo(() => {
    const map = new Map<string, { itemId: string; kind: "place" | "swap" }>();
    for (const placement of dragPreviewPlacements) {
      map.set(placement.slotId, {
        itemId: placement.itemId,
        kind: placement.kind,
      });
    }
    return map;
  }, [dragPreviewPlacements]);

  const collectSelectionWithinRect = useCallback(
    (left: number, top: number, right: number, bottom: number): string[] => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return [];
      }

      const viewportRect = viewport.getBoundingClientRect();
      const slots = viewport.querySelectorAll<HTMLElement>("[data-slot-id]");
      const selected: string[] = [];

      for (const slot of slots) {
        const slotId = slot.dataset.slotId;
        if (!slotId || !slotAssignments[slotId]) {
          continue;
        }

        const slotRect = slot.getBoundingClientRect();
        const slotLeft = slotRect.left - viewportRect.left;
        const slotTop = slotRect.top - viewportRect.top;
        const slotRight = slotLeft + slotRect.width;
        const slotBottom = slotTop + slotRect.height;

        const intersects =
          slotRight >= left &&
          slotLeft <= right &&
          slotBottom >= top &&
          slotTop <= bottom;

        if (intersects) {
          selected.push(slotId);
        }
      }

      return selected;
    },
    [slotAssignments, viewportRef],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const preventContextMenu = (event: MouseEvent): void => {
      event.preventDefault();
    };

    viewport.addEventListener("contextmenu", preventContextMenu);
    return () => {
      viewport.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [viewportRef]);

  const validExpandedMisSlices = useMemo(() => {
    const deduped = new Map<string, ExpandedMisTarget>();
    for (const target of expandedMisSlices) {
      deduped.set(toExpandedMisKey(target), target);
    }

    const validTargets: ExpandedMisTarget[] = [];
    for (const target of deduped.values()) {
      const config = hallConfigs[target.hallId];
      if (
        config.type !== "mis" ||
        target.slice >= config.slices ||
        target.misUnit >= config.misUnitsPerSlice
      ) {
        continue;
      }
      validTargets.push(target);
    }

    return validTargets.slice(-2);
  }, [expandedMisSlices, hallConfigs]);

  const toggleExpandedMisSlice = useCallback((target: ExpandedMisTarget): void => {
    const targetKey = toExpandedMisKey(target);
    setExpandedMisSlices((current) => {
      const existingIndex = current.findIndex(
        (entry) => toExpandedMisKey(entry) === targetKey,
      );
      if (existingIndex !== -1) {
        return current.filter((entry) => toExpandedMisKey(entry) !== targetKey);
      }

      const next = [...current, target];
      return next.slice(-2);
    });
  }, []);

  const hallPlacement = useMemo(() => {
    const positions: Record<
      HallId,
      { left: number; top: number; transform: string; width: number; height: number }
    > = {
      north: { left: 0, top: 0, transform: "", width: 0, height: 0 },
      east: { left: 0, top: 0, transform: "", width: 0, height: 0 },
      south: { left: 0, top: 0, transform: "", width: 0, height: 0 },
      west: { left: 0, top: 0, transform: "", width: 0, height: 0 },
    };

    if (viewMode === "flat") {
      const verticalGap = 34;
      const flatLayout = buildFlatLayoutMetrics(hallConfigs, center);
      let currentTop = flatLayout.top;
      const leftAlignedX = flatLayout.left;

      for (const hallId of HALL_ORDER) {
        const hall = flatLayout.dimensions.find((entry) => entry.hallId === hallId);
        if (!hall) {
          continue;
        }
        positions[hallId] = {
          left: leftAlignedX,
          top: currentTop,
          transform: "translate(0, 0)",
          width: hall.width,
          height: hall.height,
        };
        currentTop += hall.height + verticalGap;
      }
      return positions;
    }

    for (const hallId of HALL_ORDER) {
      const config = hallConfigs[hallId];
      const orientation = HALL_ORIENTATION[hallId];
      const { width, height } = getHallSize(config, orientation);

      if (hallId === "north") {
        positions[hallId] = {
          left: center,
          top: center - CORE_SIZE / 2 - HALL_GAP,
          transform: "translate(-50%, -100%)",
          width,
          height,
        };
      } else if (hallId === "south") {
        positions[hallId] = {
          left: center,
          top: center + CORE_SIZE / 2 + HALL_GAP,
          transform: "translate(-50%, 0%)",
          width,
          height,
        };
      } else if (hallId === "east") {
        positions[hallId] = {
          left: center + CORE_SIZE / 2 + HALL_GAP,
          top: center,
          transform: "translate(0%, -50%)",
          width,
          height,
        };
      } else {
        positions[hallId] = {
          left: center - CORE_SIZE / 2 - HALL_GAP,
          top: center,
          transform: "translate(-100%, -50%)",
          width,
          height,
        };
      }
    }

    return positions;
  }, [center, hallConfigs, viewMode]);

  function renderSlot(slotId: string): ReactNode {
    const assignedItemId = slotAssignments[slotId];
    const assignedItem = assignedItemId ? itemById.get(assignedItemId) : undefined;
    const isDraggedSource = draggedSourceSlotIds.has(slotId);
    const preview = previewBySlot.get(slotId);
    const previewItemId = preview?.itemId;
    const previewItem = previewItemId ? itemById.get(previewItemId) : undefined;
    const showPreviewItem = Boolean(previewItem);
    const isDropTarget = showPreviewItem;
    const isSwapPreview = preview?.kind === "swap";
    const showAssignedItem = Boolean(assignedItem) && !showPreviewItem && !isDraggedSource;
    const isSelected = selectedSlotIds.has(slotId) && Boolean(assignedItem);

    return (
      <button
        key={slotId}
        type="button"
        className={`relative grid h-[34px] w-[34px] cursor-pointer place-items-center overflow-hidden rounded-[0.45rem] border p-0 transition hover:-translate-y-px ${
          isSelected
            ? "hover:shadow-[0_0_0_2px_rgba(37,99,235,0.55)]"
            : "hover:shadow-[0_3px_8px_rgba(57,47,30,0.22)]"
        } ${
          assignedItem
            ? "border-[rgba(40,102,110,0.62)] bg-[linear-gradient(145deg,rgba(237,253,249,0.95)_0%,rgba(205,235,226,0.95)_100%)]"
            : "border-[rgba(108,89,62,0.35)] bg-[linear-gradient(145deg,rgba(245,233,216,0.95)_0%,rgba(231,212,184,0.95)_100%)]"
        } ${
          isDropTarget
            ? isSwapPreview
              ? "border-[rgba(194,65,12,0.92)] shadow-[0_0_0_2px_rgba(251,146,60,0.45)]"
              : "border-[rgba(22,132,120,0.92)] shadow-[0_0_0_2px_rgba(85,204,178,0.38)]"
            : ""
        } ${isSelected ? "shadow-[0_0_0_2px_rgba(37,99,235,0.55)]" : ""}`}
        draggable={Boolean(assignedItem)}
        onPointerDown={(event) => {
          if (event.shiftKey) {
            event.preventDefault();
            return;
          }

          if (event.button === 2) {
            event.preventDefault();
            event.stopPropagation();
            onClearSlot(slotId);
          }
        }}
        onPointerEnter={(event) => {
          if ((event.buttons & 2) === 2) {
            event.preventDefault();
            onClearSlot(slotId);
          }
        }}
        onDragStart={(event) => {
          if (event.shiftKey || !assignedItemId) {
            event.preventDefault();
            return;
          }
          onSlotItemDragStart(event, slotId, assignedItemId);
        }}
        onClick={(event) => {
          if (event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          if (selectedSlotIds.size === 0) {
            return;
          }

          if (isSelected) {
            const nextSelection = Array.from(selectedSlotIds).filter(
              (selectedSlotId) => selectedSlotId !== slotId,
            );
            onSelectionChange(nextSelection);
          } else {
            onSelectionChange([]);
          }

          event.stopPropagation();
        }}
        onDragEnd={onAnyDragEnd}
        onDragOver={(event) => {
          event.stopPropagation();
          onSlotDragOver(event, slotId);
        }}
        onDrop={(event) => {
          event.stopPropagation();
          onSlotDrop(event, slotId);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onClearSlot(slotId);
        }}
        data-slot
        data-slot-id={slotId}
        title={
          assignedItem
            ? `${toTitle(assignedItem.id)} (right click to clear)`
            : "Drop item here"
        }
      >
        {showAssignedItem && assignedItem ? (
          <Image
            src={assignedItem.texturePath}
            alt={assignedItem.id}
            width={22}
            height={22}
            className="pointer-events-none relative z-[1]"
            style={{ imageRendering: "pixelated" }}
            draggable={false}
            unoptimized
          />
        ) : null}
        {showPreviewItem && previewItem ? (
          <Image
            src={previewItem.texturePath}
            alt={previewItem.id}
            width={22}
            height={22}
            className={`pointer-events-none absolute inset-0 z-[2] m-auto ${
              showAssignedItem ? "opacity-40" : "opacity-[0.72]"
            }`}
            style={{ imageRendering: "pixelated" }}
            draggable={false}
            unoptimized
          />
        ) : null}
      </button>
    );
  }

  function renderNonMisHall(
    hallId: HallId,
    config: HallConfig,
    orientation: "horizontal" | "vertical",
  ): ReactNode {
    const sideDepth = config.rowsPerSide;
    const mainSlices = config.slices;
    const sliceOrder = getVisualSliceOrder(hallId, mainSlices, viewMode);

    if (orientation === "horizontal") {
      return (
        <>
          <div
            className="absolute left-0 top-0 grid"
            style={{
              gridTemplateColumns: `repeat(${mainSlices}, ${SLOT_SIZE}px)`,
              gridTemplateRows: `repeat(${sideDepth}, ${SLOT_SIZE}px)`,
              gap: `${SLOT_GAP}px`,
            }}
          >
            {Array.from({ length: sideDepth }, (_, row) =>
              sliceOrder.map((slice) =>
                renderSlot(nonMisSlotId(hallId, slice, 0, row)),
              ),
            )}
          </div>

          <div
            className="absolute bottom-0 left-0 grid"
            style={{
              gridTemplateColumns: `repeat(${mainSlices}, ${SLOT_SIZE}px)`,
              gridTemplateRows: `repeat(${sideDepth}, ${SLOT_SIZE}px)`,
              gap: `${SLOT_GAP}px`,
            }}
          >
            {Array.from({ length: sideDepth }, (_, row) =>
              sliceOrder.map((slice) =>
                renderSlot(nonMisSlotId(hallId, slice, 1, row)),
              ),
            )}
          </div>

          <div className="absolute left-0 right-0 top-1/2 h-[18px] -translate-y-1/2 rounded-[99px] bg-[linear-gradient(180deg,rgba(45,119,127,0.18)_0%,rgba(45,119,127,0.08)_100%)]" />
        </>
      );
    }

    return (
      <>
        <div
          className="absolute left-0 top-0 grid"
          style={{
            gridTemplateColumns: `repeat(${sideDepth}, ${SLOT_SIZE}px)`,
            gridTemplateRows: `repeat(${mainSlices}, ${SLOT_SIZE}px)`,
            gap: `${SLOT_GAP}px`,
          }}
        >
          {sliceOrder.map((slice) =>
            Array.from({ length: sideDepth }, (_, row) =>
              renderSlot(nonMisSlotId(hallId, slice, 0, row)),
            ),
          )}
        </div>

        <div
          className="absolute right-0 top-0 grid"
          style={{
            gridTemplateColumns: `repeat(${sideDepth}, ${SLOT_SIZE}px)`,
            gridTemplateRows: `repeat(${mainSlices}, ${SLOT_SIZE}px)`,
            gap: `${SLOT_GAP}px`,
          }}
        >
          {sliceOrder.map((slice) =>
            Array.from({ length: sideDepth }, (_, row) =>
              renderSlot(nonMisSlotId(hallId, slice, 1, row)),
            ),
          )}
        </div>

        <div className="absolute bottom-0 left-1/2 top-0 w-[18px] -translate-x-1/2 rounded-[99px] bg-[linear-gradient(180deg,rgba(45,119,127,0.18)_0%,rgba(45,119,127,0.08)_100%)]" />
      </>
    );
  }

  function renderMisHall(
    hallId: HallId,
    config: HallConfig,
    orientation: "horizontal" | "vertical",
  ): ReactNode {
    const directionClass =
      orientation === "horizontal" ? "flex-row" : "flex-col";
    const sliceOrder = getVisualSliceOrder(hallId, config.slices, viewMode);

    return (
      <div className={`absolute inset-0 flex gap-1 ${directionClass}`}>
        {sliceOrder.map((slice) => {
          return (
            <div
              key={`${hallId}-mis-${slice}`}
              className="grid min-w-0 flex-1 gap-1"
              style={{
                gridTemplateRows:
                  orientation === "horizontal"
                    ? `repeat(${config.misUnitsPerSlice}, minmax(0, 1fr))`
                    : "none",
                gridTemplateColumns:
                  orientation === "vertical"
                    ? `repeat(${config.misUnitsPerSlice}, minmax(0, 1fr))`
                    : "none",
              }}
            >
              {Array.from({ length: config.misUnitsPerSlice }, (_, misUnit) => {
                const slotIds = Array.from(
                  { length: config.misSlotsPerSlice },
                  (_, index) => misSlotId(hallId, slice, misUnit, index),
                );
                const openIndex = validExpandedMisSlices.findIndex(
                  (entry) =>
                    entry.hallId === hallId &&
                    entry.slice === slice &&
                    entry.misUnit === misUnit,
                );

                const assignedItemIds = slotIds
                  .map((slotId) => slotAssignments[slotId])
                  .filter((itemId): itemId is string => Boolean(itemId));
                const hasAssignedItems = assignedItemIds.length > 0;

                const previewIds = assignedItemIds.slice(0, 6);
                const firstSlot = slotIds[0];

                return (
                  <div
                    key={`${hallId}-mis-${slice}-${misUnit}`}
                    className={`grid min-w-0 grid-rows-[auto_auto_1fr] gap-[0.22rem] rounded-[0.65rem] border p-[0.32rem] ${
                      openIndex === -1
                        ? "border-[rgba(73,97,78,0.45)] bg-[linear-gradient(180deg,rgba(244,250,240,0.95)_0%,rgba(221,235,212,0.95)_100%)]"
                        : MIS_OPEN_CARD_CLASSES[openIndex % MIS_OPEN_CARD_CLASSES.length]
                    }`}
                    draggable={hasAssignedItems}
                    onDragStart={(event) => {
                      if (event.shiftKey || !hasAssignedItems) {
                        event.preventDefault();
                        return;
                      }

                      event.stopPropagation();
                      onSlotGroupDragStart(event, slotIds, firstSlot);
                    }}
                    onDragEnd={onAnyDragEnd}
                    onDragOver={(event) => onSlotDragOver(event, firstSlot)}
                    onDrop={(event) => onSlotDrop(event, firstSlot)}
                    onClick={(event) => {
                      if (event.shiftKey) {
                        event.preventDefault();
                        return;
                      }

                      event.stopPropagation();
                      toggleExpandedMisSlice({ hallId, slice, misUnit });
                    }}
                    title={`Slice ${slice + 1} • MIS ${misUnit + 1} • ${assignedItemIds.length}/${config.misSlotsPerSlice}`}
                    data-slot
                  >
                    <div className="text-[0.6rem] font-bold uppercase tracking-[0.04em] text-[#355039]">
                      Slice {slice + 1} • MIS {misUnit + 1}
                    </div>
                    <div className="text-[0.65rem] font-bold text-[#33524f]">
                      {assignedItemIds.length}/{config.misSlotsPerSlice}
                    </div>
                    <div className="grid content-start grid-cols-3 gap-[2px]">
                      {previewIds.map((itemId) => {
                        const item = itemById.get(itemId);
                        if (!item) {
                          return null;
                        }

                        return (
                          <div
                            key={`${hallId}-mis-${slice}-${misUnit}-${itemId}`}
                            className="grid aspect-square place-items-center overflow-hidden rounded-[0.25rem] border border-[rgba(56,89,84,0.28)] bg-[rgba(236,249,245,0.8)]"
                          >
                            <Image
                              src={item.texturePath}
                              alt={item.id}
                              width={16}
                              height={16}
                              style={{ imageRendering: "pixelated" }}
                              draggable={false}
                              unoptimized
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const expandedMisEntries = useMemo<ExpandedMisEntry[]>(() => {
    const entries: ExpandedMisEntry[] = [];
    for (const [colorIndex, target] of validExpandedMisSlices.entries()) {
      const config = hallConfigs[target.hallId];
      if (config.type !== "mis") {
        continue;
      }

      const slotIds = Array.from(
        { length: config.misSlotsPerSlice },
        (_, index) => misSlotId(target.hallId, target.slice, target.misUnit, index),
      );
      const columns =
        config.misSlotsPerSlice % 9 === 0
          ? 9
          : Math.min(12, Math.max(6, Math.ceil(Math.sqrt(config.misSlotsPerSlice))));

      entries.push({
        target,
        config,
        slotIds,
        columns,
        colorIndex,
      });
    }
    return entries;
  }, [hallConfigs, validExpandedMisSlices]);

  return (
    <div
      ref={viewportRef}
      className="relative min-h-0 flex-1 cursor-grab select-none overflow-hidden touch-none active:cursor-grabbing"
      style={viewportBackgroundStyle}
      onClickCapture={(event) => {
        if (event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onClick={(event) => {
        if (event.shiftKey || selectedSlotIds.size === 0) {
          return;
        }

        const target = event.target as HTMLElement;
        if (target.closest("[data-slot-id]")) {
          return;
        }

        onSelectionChange([]);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        onViewportDropFallback(event);
      }}
      onPointerDown={(event) => {
        const didStartPan = onPointerDown(event);
        if (didStartPan || event.button !== 0 || !event.shiftKey) {
          return;
        }

        const target = event.target as HTMLElement;
        if (target.closest("[data-no-pan]")) {
          return;
        }

        if (!viewportRef.current) {
          return;
        }

        const viewportRect = viewportRef.current.getBoundingClientRect();
        const x = event.clientX - viewportRect.left;
        const y = event.clientY - viewportRect.top;

        selectionPointerId.current = event.pointerId;
        selectionStart.current = { x, y };
        setSelectionBox({ left: x, top: y, width: 0, height: 0 });
        onSelectionChange([]);

        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        onPointerMove(event);

        if (
          selectionPointerId.current === null ||
          selectionPointerId.current !== event.pointerId ||
          !selectionStart.current ||
          !viewportRef.current
        ) {
          return;
        }

        const viewportRect = viewportRef.current.getBoundingClientRect();
        const x = event.clientX - viewportRect.left;
        const y = event.clientY - viewportRect.top;
        const left = Math.min(selectionStart.current.x, x);
        const top = Math.min(selectionStart.current.y, y);
        const right = Math.max(selectionStart.current.x, x);
        const bottom = Math.max(selectionStart.current.y, y);

        setSelectionBox({
          left,
          top,
          width: right - left,
          height: bottom - top,
        });

        const nextSelection = collectSelectionWithinRect(left, top, right, bottom);
        onSelectionChange(nextSelection);
      }}
      onPointerUp={(event) => {
        onPointerEnd(event);

        if (
          selectionPointerId.current !== null &&
          selectionPointerId.current === event.pointerId
        ) {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          selectionPointerId.current = null;
          selectionStart.current = null;
          setSelectionBox(null);
        }
      }}
      onPointerCancel={(event) => {
        onPointerEnd(event);

        if (
          selectionPointerId.current !== null &&
          selectionPointerId.current === event.pointerId
        ) {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          selectionPointerId.current = null;
          selectionStart.current = null;
          setSelectionBox(null);
        }
      }}
    >
      <div
        className="absolute bottom-4 left-4 z-20 grid gap-[0.1rem] rounded-[0.55rem] border border-[rgba(134,105,67,0.35)] bg-[rgba(255,252,245,0.92)] px-[0.55rem] py-[0.45rem] text-[0.72rem] leading-[1.3] text-[#6d6256]"
        data-no-pan
      >
        <div>Mouse wheel to zoom</div>
        <div>Drag to pan</div>
        <div>Shift + drag to box-select slots</div>
        <div>Right-click a placed slot to clear</div>
      </div>

      <div
        className="absolute left-4 top-4 z-20 grid gap-[0.35rem] rounded-[0.65rem] border border-[rgba(121,96,62,0.35)] bg-[rgba(255,250,239,0.92)] p-[0.45rem]"
        data-no-pan
      >
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[#5e513f]">
          Layout Controls
        </div>
        <div className="flex flex-wrap gap-[0.28rem]">
          <button
            type="button"
            className="rounded-[0.4rem] border border-[rgba(123,98,66,0.48)] bg-[rgba(255,255,255,0.92)] px-[0.42rem] py-[0.2rem] text-[0.7rem] font-semibold text-[#3b2f22]"
            onClick={() => onApplyPreset("chest")}
          >
            All Chest
          </button>
          <button
            type="button"
            className="rounded-[0.4rem] border border-[rgba(123,98,66,0.48)] bg-[rgba(255,255,255,0.92)] px-[0.42rem] py-[0.2rem] text-[0.7rem] font-semibold text-[#3b2f22]"
            onClick={() => onApplyPreset("bulk")}
          >
            All Bulk
          </button>
          <button
            type="button"
            className="rounded-[0.4rem] border border-[rgba(123,98,66,0.48)] bg-[rgba(255,255,255,0.92)] px-[0.42rem] py-[0.2rem] text-[0.7rem] font-semibold text-[#3b2f22]"
            onClick={() => onApplyPreset("mis")}
          >
            All MIS
          </button>
          <button
            type="button"
            className="rounded-[0.4rem] border border-[rgba(153,53,40,0.48)] bg-[rgba(255,237,232,0.98)] px-[0.42rem] py-[0.2rem] text-[0.7rem] font-semibold text-[#7a2318]"
            onClick={onClearLayout}
          >
            Clear Layout
          </button>
        </div>
        <div className="flex items-center gap-[0.25rem]">
          <button
            type="button"
            className={`rounded-[0.4rem] border px-[0.42rem] py-[0.2rem] text-[0.68rem] font-semibold ${
              viewMode === "storage"
                ? "border-[rgba(33,114,82,0.58)] bg-[rgba(226,253,239,0.96)] text-[#245342]"
                : "border-[rgba(123,98,66,0.48)] bg-[rgba(255,255,255,0.92)] text-[#3b2f22]"
            }`}
            onClick={() => {
              if (viewMode === "storage") {
                return;
              }
              setViewMode("storage");
              onRecenterViewport();
            }}
          >
            Storage View
          </button>
          <button
            type="button"
            className={`rounded-[0.4rem] border px-[0.42rem] py-[0.2rem] text-[0.68rem] font-semibold ${
              viewMode === "flat"
                ? "border-[rgba(33,114,82,0.58)] bg-[rgba(226,253,239,0.96)] text-[#245342]"
                : "border-[rgba(123,98,66,0.48)] bg-[rgba(255,255,255,0.92)] text-[#3b2f22]"
            }`}
            onClick={() => {
              if (viewMode === "flat") {
                return;
              }
              const flatLayout = buildFlatLayoutMetrics(hallConfigs, center);
              setViewMode("flat");
              const controlAnchorX = flatLayout.left + Math.min(180, flatLayout.maxWidth * 0.22);
              onRecenterViewport({
                x: controlAnchorX,
                y: flatLayout.top + flatLayout.totalHeight / 2,
              });
            }}
          >
            Flat View
          </button>
        </div>
      </div>

      <div
        className="absolute right-4 top-4 z-20 flex items-center gap-[0.45rem] rounded-full border border-[rgba(134,105,67,0.35)] bg-[rgba(255,250,239,0.92)] px-[0.45rem] py-[0.25rem]"
        data-no-pan
      >
        <button
          type="button"
          className="h-[1.6rem] w-[1.6rem] cursor-pointer rounded-full border border-[rgba(132,101,64,0.5)] bg-white text-[1rem] leading-none text-[#2b2b2b]"
          onClick={() => onAdjustZoom(0.2)}
        >
          +
        </button>
        <span className="min-w-[2.8rem] text-center text-[0.76rem] font-bold text-[#6d6256]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="h-[1.6rem] w-[1.6rem] cursor-pointer rounded-full border border-[rgba(132,101,64,0.5)] bg-white text-[1rem] leading-none text-[#2b2b2b]"
          onClick={() => onAdjustZoom(-0.2)}
        >
          -
        </button>
      </div>

      {expandedMisEntries.length > 0 ? (
        <div
          className="absolute left-1/2 top-5 z-30 flex max-w-[92vw] -translate-x-1/2 gap-3 max-[980px]:grid max-[980px]:w-[92vw]"
          data-no-pan
          onClick={(event) => event.stopPropagation()}
        >
          {expandedMisEntries.map((entry) => {
            const palette = MIS_OPEN_PANEL_CLASSES[entry.colorIndex % MIS_OPEN_PANEL_CLASSES.length];
            const targetKey = toExpandedMisKey(entry.target);
            return (
              <section
                key={targetKey}
                className={`w-[min(38vw,400px)] overflow-hidden rounded-[0.85rem] border shadow-[0_12px_34px_rgba(38,48,33,0.28)] max-[980px]:w-full ${palette}`}
              >
                <header
                  className="flex items-center justify-between border-b border-[rgba(63,88,72,0.28)] px-3 py-2"
                  draggable={entry.slotIds.some((slotId) => Boolean(slotAssignments[slotId]))}
                  onDragStart={(event) => {
                    if (event.shiftKey) {
                      event.preventDefault();
                      return;
                    }

                    onSlotGroupDragStart(event, entry.slotIds, entry.slotIds[0]);
                  }}
                  onDragEnd={onAnyDragEnd}
                >
                  <div className="grid gap-[0.08rem] text-[#2e5042]">
                    <div className="text-[0.78rem] font-bold uppercase tracking-[0.05em]">
                      {HALL_LABELS[entry.target.hallId]} MIS Slice {entry.target.slice + 1} • MIS{" "}
                      {entry.target.misUnit + 1}
                    </div>
                    <div className="text-[0.68rem] text-[#3e6455]">
                      {entry.slotIds.filter((slotId) => Boolean(slotAssignments[slotId])).length}/
                      {entry.config.misSlotsPerSlice} assigned
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-[0.4rem] border border-[rgba(82,104,88,0.45)] bg-[rgba(253,255,252,0.92)] px-[0.5rem] py-[0.2rem] text-[0.72rem] font-semibold text-[#2f4b3f]"
                    onClick={() => {
                      setExpandedMisSlices((current) =>
                        current.filter(
                          (expanded) => toExpandedMisKey(expanded) !== toExpandedMisKey(entry.target),
                        ),
                      );
                    }}
                  >
                    Close
                  </button>
                </header>
                <div className="max-h-[64vh] overflow-auto p-3">
                  <div
                    className="grid content-start gap-[4px]"
                    style={{
                      gridTemplateColumns: `repeat(${entry.columns}, ${SLOT_SIZE}px)`,
                    }}
                  >
                    {entry.slotIds.map((slotId) => renderSlot(slotId))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: `${STAGE_SIZE}px`,
            height: `${STAGE_SIZE}px`,
            transform: `scale(${zoom})`,
          }}
        >
          {viewMode === "storage" ? (
            <div
              className="absolute grid place-items-center rounded-[1.1rem] border-2 border-dashed border-[rgba(41,86,92,0.7)] bg-[repeating-linear-gradient(-45deg,rgba(186,225,222,0.45)_0,rgba(186,225,222,0.45)_8px,rgba(210,234,231,0.6)_8px,rgba(210,234,231,0.6)_16px)] text-[0.875rem] font-bold uppercase tracking-[0.08em] text-[#18444c]"
              style={{
                width: `${CORE_SIZE}px`,
                height: `${CORE_SIZE}px`,
                left: `${center - CORE_SIZE / 2}px`,
                top: `${center - CORE_SIZE / 2}px`,
              }}
            >
              Core
            </div>
          ) : null}

          {HALL_ORDER.map((hallId) => {
            const hall = hallConfigs[hallId];
            const orientation =
              viewMode === "flat" ? "horizontal" : HALL_ORIENTATION[hallId];
            const placement = hallPlacement[hallId];
            const controlAnchorStyle =
              viewMode === "flat"
                ? { left: "0", top: "-0.36rem", transform: "translate(0, -100%)" }
                : hallId === "north"
                ? { left: "50%", top: "-0.36rem", transform: "translate(-50%, -100%)" }
                : hallId === "south"
                  ? { left: "50%", bottom: "-0.36rem", transform: "translate(-50%, 100%)" }
                  : hallId === "east"
                    ? { right: "0", top: "-0.36rem", transform: "translate(0, -100%)" }
                    : { left: "0", top: "-0.36rem", transform: "translate(0, -100%)" };

            const hallFirstSlot =
              hall.type === "mis"
                ? misSlotId(
                    hallId,
                    getVisualSliceOrder(hallId, hall.slices, viewMode)[0] ?? 0,
                    0,
                    0,
                  )
                : nonMisSlotId(
                    hallId,
                    getVisualSliceOrder(hallId, hall.slices, viewMode)[0] ?? 0,
                    0,
                    0,
                  );

            return (
              <section
                key={hallId}
                className="absolute rounded-[0.85rem] border border-[rgba(72,64,52,0.4)] bg-[rgba(255,250,240,0.8)] shadow-[0_5px_15px_rgba(42,34,20,0.12)]"
                style={{
                  left: `${placement.left}px`,
                  top: `${placement.top}px`,
                  transform: placement.transform,
                  width: `${placement.width}px`,
                  height: `${placement.height}px`,
                }}
                onDragOver={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }
                  event.stopPropagation();
                  onSlotDragOver(event, hallFirstSlot);
                }}
                onDrop={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }
                  event.stopPropagation();
                  onSlotDrop(event, hallFirstSlot);
                }}
              >
                <div
                  className="absolute z-10"
                  style={controlAnchorStyle}
                  data-no-pan
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <div className="flex items-center gap-[0.2rem] rounded-[0.55rem] border border-[rgba(132,100,63,0.4)] bg-[rgba(255,244,223,0.96)] px-[0.32rem] py-[0.2rem] text-[#5f4c33]">
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.04em]">
                      {HALL_LABELS[hallId]}
                    </span>
                    <select
                      className="rounded-[0.35rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.24rem] py-[0.1rem] text-[0.62rem] font-semibold text-[#2b251f]"
                      value={hall.type}
                      onChange={(event) =>
                        onHallTypeChange(hallId, event.target.value as HallType)
                      }
                    >
                      <option value="bulk">Bulk</option>
                      <option value="chest">Chest</option>
                      <option value="mis">MIS</option>
                    </select>
                    <label className="flex items-center gap-[0.12rem] text-[0.6rem] font-semibold">
                      <span>S</span>
                      <DeferredNumberInput
                        className="w-[3.1rem] rounded-[0.3rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.14rem] py-[0.08rem] text-[0.62rem]"
                        min={1}
                        max={200}
                        value={hall.slices}
                        onCommit={(nextValue) => onHallSlicesChange(hallId, nextValue)}
                      />
                    </label>
                    {hall.type === "mis" ? (
                      <label className="flex items-center gap-[0.12rem] text-[0.6rem] font-semibold">
                        <span>C</span>
                        <DeferredNumberInput
                          className="w-[3.3rem] rounded-[0.3rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.14rem] py-[0.08rem] text-[0.62rem]"
                          min={1}
                          max={200}
                          value={hall.misSlotsPerSlice}
                          onCommit={(nextValue) =>
                            onHallMisCapacityChange(hallId, nextValue)
                          }
                        />
                      </label>
                    ) : (
                      <label className="flex items-center gap-[0.12rem] text-[0.6rem] font-semibold">
                        <span>R</span>
                        <DeferredNumberInput
                          className="w-[2.8rem] rounded-[0.3rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.14rem] py-[0.08rem] text-[0.62rem]"
                          min={1}
                          max={9}
                          value={hall.rowsPerSide}
                          onCommit={(nextValue) => onHallRowsChange(hallId, nextValue)}
                        />
                      </label>
                    )}
                    {hall.type === "mis" ? (
                      <label className="flex items-center gap-[0.12rem] text-[0.6rem] font-semibold">
                        <span>M</span>
                        <DeferredNumberInput
                          className="w-[2.8rem] rounded-[0.3rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.14rem] py-[0.08rem] text-[0.62rem]"
                          min={1}
                          max={8}
                          value={hall.misUnitsPerSlice}
                          onCommit={(nextValue) => onHallMisUnitsChange(hallId, nextValue)}
                        />
                      </label>
                    ) : null}
                  </div>
                </div>

                {hall.type === "mis"
                  ? renderMisHall(hallId, hall, orientation)
                  : renderNonMisHall(hallId, hall, orientation)}
              </section>
            );
          })}
        </div>
      </div>

      {selectionBox ? (
        <div
          className="pointer-events-none absolute border border-[rgba(37,99,235,0.9)] bg-[rgba(37,99,235,0.18)]"
          style={{
            left: `${selectionBox.left}px`,
            top: `${selectionBox.top}px`,
            width: `${selectionBox.width}px`,
            height: `${selectionBox.height}px`,
          }}
        />
      ) : null}
    </div>
  );
}

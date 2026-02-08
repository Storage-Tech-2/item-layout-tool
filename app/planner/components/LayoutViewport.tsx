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
  HALL_ORDER,
  SLOT_GAP,
  SLOT_SIZE,
  STAGE_SIZE,
} from "../constants";
import {
  directionOrientation,
  directionReverseSlices,
  resolveStorageLayout,
  type HallDirection,
  type StorageLayoutPreset,
} from "../layoutConfig";
import type { HallSideKey } from "../hooks/useHallConfigs";
import type {
  CatalogItem,
  FillDirection,
  HallConfig,
  HallId,
  HallSideConfig,
  HallType,
  PreviewPlacement,
} from "../types";
import { getHallSize, misSlotId, nonMisSlotId, resolveHallSlices, toTitle } from "../utils";

type LayoutViewportProps = {
  hallConfigs: Record<HallId, HallConfig>;
  slotAssignments: Record<string, string>;
  itemById: Map<string, CatalogItem>;
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  fillDirection: FillDirection;
  onAdjustZoom: (delta: number) => void;
  onFillDirectionChange: (direction: FillDirection) => void;
  onRecenterViewport: (focusPoint?: { x: number; y: number }) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => boolean;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onSlotDragOver: (event: DragEvent<HTMLElement>, slotId: string) => void;
  onSlotDrop: (event: DragEvent<HTMLElement>, slotId: string) => void;
  onViewportDropFallback: (event: DragEvent<HTMLElement>) => void;
  onSectionSlicesChange: (hallId: HallId, sectionIndex: number, value: string) => void;
  onSectionSideTypeChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    type: HallType,
  ) => void;
  onSectionSideRowsChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ) => void;
  onSectionSideMisCapacityChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ) => void;
  onSectionSideMisUnitsChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ) => void;
  onSectionSideMisWidthChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ) => void;
  onAddSection: (hallId: HallId) => void;
  onRemoveSection: (hallId: HallId, sectionIndex: number) => void;
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

type LayoutViewMode = "storage" | "flat";

type HallPlacement = {
  left: number;
  top: number;
  transform: string;
  width: number;
  height: number;
};

type FlatLayoutMetrics = {
  dimensions: Array<{ hallId: HallId; width: number; height: number }>;
  totalHeight: number;
  maxWidth: number;
  left: number;
  top: number;
};

const FLAT_VIEW_HALL_GAP = 56;

type HallLayoutState = {
  positions: Record<HallId, HallPlacement>;
  directions: Record<HallId, HallDirection>;
  core: { left: number; top: number; width: number; height: number; label: string } | null;
};

type ExpandedMisTarget = {
  hallId: HallId;
  slice: number;
  side: 0 | 1;
  misUnit: number;
};

type ExpandedMisPanel = ExpandedMisTarget & {
  slotIds: string[];
  columns: number;
  capacity: number;
};

function defaultHallLabel(hallId: HallId): string {
  switch (hallId) {
    case "north":
      return "North Hall";
    case "east":
      return "East Hall";
    case "south":
      return "South Hall";
    case "west":
      return "West Hall";
  }
}

function expandedMisKey(target: ExpandedMisTarget): string {
  return `${target.hallId}:${target.slice}:${target.side}:${target.misUnit}`;
}

function getVisualSliceOrder(
  slices: number,
  reverseSlices: boolean,
): number[] {
  const order = Array.from({ length: slices }, (_, index) => index);
  if (reverseSlices) {
    order.reverse();
  }
  return order;
}

function misPreviewLayout(cardWidth: number, cardHeight: number): { columns: number; maxItems: number } {
  const tile = 16;
  const gap = 2;
  const usableWidth = Math.max(16, Math.floor(cardWidth) - 4);
  const columns = Math.max(1, Math.min(6, Math.floor((usableWidth + gap) / (tile + gap))));

  // Card layout is [title][count][preview-grid]; reserve compact header space.
  const usableHeight = Math.max(16, Math.floor(cardHeight) - 24);
  const rows = Math.max(1, Math.floor((usableHeight + gap) / (tile + gap)));
  return { columns, maxItems: columns * rows };
}

function sideDepthPx(side: HallSideConfig): number {
  if (side.type === "mis") {
    return side.misUnitsPerSlice * 112 + Math.max(0, side.misUnitsPerSlice - 1) * SLOT_GAP;
  }
  return side.rowsPerSlice * SLOT_SIZE + Math.max(0, side.rowsPerSlice - 1) * SLOT_GAP;
}

function emptyHallPlacements(): Record<HallId, HallPlacement> {
  return {
    north: { left: 0, top: 0, transform: "", width: 0, height: 0 },
    east: { left: 0, top: 0, transform: "", width: 0, height: 0 },
    south: { left: 0, top: 0, transform: "", width: 0, height: 0 },
    west: { left: 0, top: 0, transform: "", width: 0, height: 0 },
  };
}

function buildFlatLayoutMetrics(
  hallConfigs: Record<HallId, HallConfig>,
  center: number,
): FlatLayoutMetrics {
  const dimensions = HALL_ORDER.map((hallId) => {
    const config = hallConfigs[hallId];
    const orientation: "horizontal" | "vertical" = "horizontal";
    const { width, height } = getHallSize(config, orientation);
    return { hallId, width, height };
  });
  const totalHeight =
    dimensions.reduce((sum, hall) => sum + hall.height, 0) +
    Math.max(0, dimensions.length - 1) * FLAT_VIEW_HALL_GAP;
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
  fillDirection,
  onAdjustZoom,
  onFillDirectionChange,
  onRecenterViewport,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onSlotDragOver,
  onSlotDrop,
  onViewportDropFallback,
  onSectionSlicesChange,
  onSectionSideTypeChange,
  onSectionSideRowsChange,
  onSectionSideMisCapacityChange,
  onSectionSideMisUnitsChange,
  onSectionSideMisWidthChange,
  onAddSection,
  onRemoveSection,
  onSlotItemDragStart,
  onSlotGroupDragStart,
  onAnyDragEnd,
  onClearSlot,
  draggedSourceSlotIds,
  dragPreviewPlacements,
  selectedSlotIds,
  onSelectionChange,
}: LayoutViewportProps) {
  function blurLayoutConfigIfNeeded(target: EventTarget | null): void {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return;
    }

    const activeInConfig = Boolean(active.closest("[data-layout-config]"));
    const clickInConfig = Boolean(target.closest("[data-layout-config]"));
    if (activeInConfig && !clickInConfig) {
      active.blur();
    }
  }

  const center = STAGE_SIZE / 2;
  const selectionPointerId = useRef<number | null>(null);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<LayoutViewMode>("storage");
  const [storageLayoutPreset, setStorageLayoutPreset] = useState<StorageLayoutPreset>("cross");
  const [expandedMisTargets, setExpandedMisTargets] = useState<ExpandedMisTarget[]>([]);
  const [hallNames, setHallNames] = useState<Record<HallId, string>>({
    north: defaultHallLabel("north"),
    east: defaultHallLabel("east"),
    south: defaultHallLabel("south"),
    west: defaultHallLabel("west"),
  });

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
      const popupPanels = Array.from(
        viewport.querySelectorAll<HTMLElement>("[data-mis-panel]"),
      );
      const intersectsAnyPopup = popupPanels.some((panel) => {
        const panelRect = panel.getBoundingClientRect();
        const panelLeft = panelRect.left - viewportRect.left;
        const panelTop = panelRect.top - viewportRect.top;
        const panelRight = panelLeft + panelRect.width;
        const panelBottom = panelTop + panelRect.height;
        return (
          panelRight >= left &&
          panelLeft <= right &&
          panelBottom >= top &&
          panelTop <= bottom
        );
      });

      for (const slot of slots) {
        const slotId = slot.dataset.slotId;
        if (!slotId || !slotAssignments[slotId]) {
          continue;
        }

        const slotPanel = slot.closest("[data-mis-panel]");
        if (intersectsAnyPopup && !slotPanel) {
          continue;
        }
        if (!intersectsAnyPopup && slotPanel) {
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

  const updateHallName = useCallback((hallId: HallId, rawName: string): void => {
    const trimmed = rawName.trim();
    setHallNames((current) => ({
      ...current,
      [hallId]: trimmed.length > 0 ? trimmed : defaultHallLabel(hallId),
    }));
  }, []);

  function renderSideEditor(
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    label: string,
    sideConfig: HallSideConfig,
  ): ReactNode {
    return (
      <div className="flex items-center gap-[0.12rem] rounded-[0.35rem] border border-[rgba(124,96,61,0.35)] bg-[rgba(255,255,255,0.85)] px-[0.18rem] py-[0.1rem]">
        <span className="text-[0.58rem] font-bold text-[#5f4c33]">{label}</span>
        <select
          className="rounded-[0.3rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.14rem] py-[0.06rem] text-[0.58rem] font-semibold text-[#2b251f]"
          value={sideConfig.type}
          onChange={(event) =>
            onSectionSideTypeChange(hallId, sectionIndex, side, event.target.value as HallType)
          }
        >
          <option value="bulk">Bulk</option>
          <option value="chest">Chest</option>
          <option value="mis">MIS</option>
        </select>
        {sideConfig.type === "mis" ? (
          <>
            <span className="text-[0.54rem] font-semibold">C</span>
            <DeferredNumberInput
              className="w-[2.8rem] rounded-[0.25rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
              min={1}
              max={200}
              value={sideConfig.misSlotsPerSlice}
              onCommit={(value) => onSectionSideMisCapacityChange(hallId, sectionIndex, side, value)}
            />
            <span className="text-[0.54rem] font-semibold">U</span>
            <DeferredNumberInput
              className="w-[2.2rem] rounded-[0.25rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
              min={1}
              max={8}
              value={sideConfig.misUnitsPerSlice}
              onCommit={(value) => onSectionSideMisUnitsChange(hallId, sectionIndex, side, value)}
            />
            <span className="text-[0.54rem] font-semibold">W</span>
            <DeferredNumberInput
              className="w-[2.1rem] rounded-[0.25rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
              min={1}
              max={16}
              value={sideConfig.misWidth}
              onCommit={(value) => onSectionSideMisWidthChange(hallId, sectionIndex, side, value)}
            />
          </>
        ) : (
          <>
            <span className="text-[0.54rem] font-semibold">R</span>
            <DeferredNumberInput
              className="w-[2.2rem] rounded-[0.25rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
              min={1}
              max={9}
              value={sideConfig.rowsPerSlice}
              onCommit={(value) => onSectionSideRowsChange(hallId, sectionIndex, side, value)}
            />
          </>
        )}
      </div>
    );
  }

  const hallLayout = useMemo<HallLayoutState>(() => {
    if (viewMode === "flat") {
      const positions = emptyHallPlacements();
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
        currentTop += hall.height + FLAT_VIEW_HALL_GAP;
      }

      return {
        positions,
        directions: {
          north: "north",
          east: "east",
          south: "south",
          west: "west",
        },
        core: null,
      };
    }
    const resolved = resolveStorageLayout(storageLayoutPreset, hallConfigs, center);
    return {
      positions: resolved.positions,
      directions: resolved.directions,
      core: resolved.core,
    };
  }, [center, hallConfigs, storageLayoutPreset, viewMode]);

  const expandedMisPanels = useMemo<ExpandedMisPanel[]>(() => {
    return expandedMisTargets
      .map((target) => {
        const hall = hallConfigs[target.hallId];
        if (!hall) {
          return null;
        }
        const slice = resolveHallSlices(hall).find((entry) => entry.globalSlice === target.slice);
        if (!slice) {
          return null;
        }
        const sideConfig = target.side === 0 ? slice.sideLeft : slice.sideRight;
        if (sideConfig.type !== "mis" || target.misUnit >= sideConfig.misUnitsPerSlice) {
          return null;
        }
        const slotIds = Array.from(
          { length: sideConfig.misSlotsPerSlice },
          (_, index) => misSlotId(target.hallId, target.slice, target.side, target.misUnit, index),
        );
        const columns =
          sideConfig.misSlotsPerSlice % 9 === 0
            ? 9
            : Math.min(12, Math.max(6, Math.ceil(Math.sqrt(sideConfig.misSlotsPerSlice))));
        return {
          ...target,
          slotIds,
          columns,
          capacity: sideConfig.misSlotsPerSlice,
        };
      })
      .filter((panel): panel is ExpandedMisPanel => panel !== null);
  }, [expandedMisTargets, hallConfigs]);

  const toggleExpandedMis = useCallback((target: ExpandedMisTarget): void => {
    const targetKey = expandedMisKey(target);
    setExpandedMisTargets((current) => {
      const existingIndex = current.findIndex(
        (entry) => expandedMisKey(entry) === targetKey,
      );
      if (existingIndex >= 0) {
        return current.filter((_, index) => index !== existingIndex);
      }
      if (current.length < 2) {
        return [...current, target];
      }
      return [current[1], target];
    });
  }, []);

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

  function renderHallContent(
    hallId: HallId,
    config: HallConfig,
    orientation: "horizontal" | "vertical",
    reverseSlices: boolean,
    hallWidth: number,
    hallHeight: number,
  ): ReactNode {
    const slices = resolveHallSlices(config);
    const visualSlices = getVisualSliceOrder(slices.length, reverseSlices).map(
      (index) => slices[index],
    );

    let maxLeftDepth = 0;
    let maxRightDepth = 0;
    for (const slice of slices) {
      maxLeftDepth = Math.max(maxLeftDepth, sideDepthPx(slice.sideLeft));
      maxRightDepth = Math.max(maxRightDepth, sideDepthPx(slice.sideRight));
    }
    const aisleSpan = Math.max(8, hallWidth - maxLeftDepth - maxRightDepth);
    const aisleCenterX = maxLeftDepth + aisleSpan / 2;
    const sectionRanges = config.sections
      .map((section, sectionIndex) => {
        const sectionSlices = slices.filter((slice) => slice.sectionIndex === sectionIndex);
        if (sectionSlices.length === 0) {
          return null;
        }
        const first = sectionSlices[0];
        const last = sectionSlices[sectionSlices.length - 1];
        return {
          name: `Section ${sectionIndex + 1}`,
          start: first.mainStart,
          end: last.mainStart + last.mainSize,
        };
      })
      .filter(
        (entry): entry is { name: string; start: number; end: number } =>
          entry !== null,
      );

    const slots: ReactNode[] = [];
    for (const slice of visualSlices) {
      for (const side of [0, 1] as const) {
        const sideConfig = side === 0 ? slice.sideLeft : slice.sideRight;
        const sideDepth = sideDepthPx(sideConfig);

        if (sideConfig.type === "mis") {
          const misWidth = Math.max(1, sideConfig.misWidth);
          const groupStartSectionSlice = Math.floor(slice.sectionSlice / misWidth) * misWidth;
          if (slice.sectionSlice !== groupStartSectionSlice) {
            continue;
          }
          const groupSlices = slices.filter(
            (entry) =>
              entry.sectionIndex === slice.sectionIndex &&
              entry.sectionSlice >= groupStartSectionSlice &&
              entry.sectionSlice < groupStartSectionSlice + misWidth,
          );
          const groupFirstSlice = groupSlices[0] ?? slice;
          const groupLastSlice = groupSlices[groupSlices.length - 1] ?? slice;
          const misSlice = groupFirstSlice.globalSlice;
          const misMainStart = groupFirstSlice.mainStart;
          const misMainSize = groupLastSlice.mainStart + groupLastSlice.mainSize - groupFirstSlice.mainStart;
          const misGroupNumber = Math.floor(groupStartSectionSlice / misWidth) + 1;
          Array.from({ length: sideConfig.misUnitsPerSlice }, (_, misUnit) => {
            const unitSlotIds = Array.from(
              { length: sideConfig.misSlotsPerSlice },
              (_, index) => misSlotId(hallId, misSlice, side, misUnit, index),
            );
            const assignedIds = unitSlotIds
              .map((slotId) => slotAssignments[slotId])
              .filter((itemId): itemId is string => Boolean(itemId));
            const hasAssigned = assignedIds.length > 0;
            const firstSlot = unitSlotIds[0];
            const nextEmptySlot =
              unitSlotIds.find((slotId) => !slotAssignments[slotId]) ?? firstSlot;
            const expandedIndex = expandedMisTargets.findIndex(
              (entry) =>
                entry.hallId === hallId &&
                entry.slice === misSlice &&
                entry.side === side &&
                entry.misUnit === misUnit,
            );
            const misCardSurfaceClass =
              expandedIndex === 0
                ? "border-[rgba(18,125,87,0.95)] bg-[linear-gradient(180deg,rgba(209,247,229,0.98)_0%,rgba(180,237,213,0.98)_100%)]"
                : expandedIndex === 1
                  ? "border-[rgba(50,91,168,0.95)] bg-[linear-gradient(180deg,rgba(220,235,255,0.98)_0%,rgba(193,218,250,0.98)_100%)]"
                  : "border-[rgba(73,97,78,0.45)] bg-[linear-gradient(180deg,rgba(244,250,240,0.95)_0%,rgba(221,235,212,0.95)_100%)]";

            if (orientation === "horizontal") {
              const unitCrossSize = 112;
              const baseTop = side === 0 ? 0 : hallHeight - sideDepth;
              const x = misMainStart + 2;
              const y = baseTop + misUnit * (unitCrossSize + SLOT_GAP) + 2;
              const cardWidth = Math.max(12, misMainSize - 4);
              const cardHeight = Math.max(42, unitCrossSize - 4);
              const previewLayout = misPreviewLayout(cardWidth, cardHeight);
              const previewColumns = previewLayout.columns;
              const previewIds = assignedIds.slice(0, previewLayout.maxItems);
              slots.push(
                <div
                  key={`${hallId}:mcard:${slice.globalSlice}:${side}:${misUnit}`}
                  className={`absolute grid grid-rows-[auto_auto_1fr] gap-[0.04rem] overflow-hidden rounded-[0.45rem] border p-[0.16rem] ${misCardSurfaceClass}`}
                  style={{ left: x, top: y, width: cardWidth, height: cardHeight }}
                  data-no-pan
                  data-mis-card
                  draggable={hasAssigned}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDragStart={(event) => {
                    if (event.shiftKey || !hasAssigned) {
                      event.preventDefault();
                      return;
                    }
                    event.stopPropagation();
                    onSlotGroupDragStart(event, unitSlotIds, firstSlot);
                  }}
                  onDragEnd={onAnyDragEnd}
                  onDragOver={(event) => onSlotDragOver(event, nextEmptySlot)}
                  onDrop={(event) => onSlotDrop(event, nextEmptySlot)}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpandedMis({
                      hallId,
                      slice: misSlice,
                      side,
                      misUnit,
                    });
                  }}
                >
                  <div className="leading-[1] text-[0.5rem] font-bold uppercase tracking-[0.02em] text-[#355039]">
                    MIS {misGroupNumber}
                  </div>
                  <div className="leading-[1] text-[0.48rem] font-semibold text-[#33524f]">
                    {assignedIds.length}/{sideConfig.misSlotsPerSlice}
                  </div>
                  <div
                    className="grid content-start gap-[2px]"
                    style={{ gridTemplateColumns: `repeat(${previewColumns}, 16px)` }}
                  >
                    {previewIds.map((itemId) => {
                      const item = itemById.get(itemId);
                      if (!item) {
                        return null;
                      }
                      return (
                        <div
                          key={`${hallId}-mis-preview-${slice.globalSlice}-${side}-${misUnit}-${itemId}`}
                          className="grid h-[16px] w-[16px] place-items-center overflow-hidden rounded-[0.2rem] border border-[rgba(56,89,84,0.28)] bg-[rgba(236,249,245,0.8)]"
                        >
                          <Image
                            src={item.texturePath}
                            alt={item.id}
                            width={14}
                            height={14}
                            style={{ imageRendering: "pixelated" }}
                            draggable={false}
                            unoptimized
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>,
              );
            } else {
              const unitCrossSize = 112;
              const baseLeft = side === 0 ? 0 : hallWidth - sideDepth;
              const x = baseLeft + misUnit * (unitCrossSize + SLOT_GAP) + 2;
              const y = misMainStart + 2;
              const cardWidth = Math.max(42, unitCrossSize - 4);
              const cardHeight = Math.max(12, misMainSize - 4);
              const previewLayout = misPreviewLayout(cardWidth, cardHeight);
              const previewColumns = previewLayout.columns;
              const previewIds = assignedIds.slice(0, previewLayout.maxItems);
              slots.push(
                <div
                  key={`${hallId}:mcard:${slice.globalSlice}:${side}:${misUnit}`}
                  className={`absolute grid grid-rows-[auto_auto_1fr] gap-[0.04rem] overflow-hidden rounded-[0.45rem] border p-[0.16rem] ${misCardSurfaceClass}`}
                  style={{ left: x, top: y, width: cardWidth, height: cardHeight }}
                  data-no-pan
                  data-mis-card
                  draggable={hasAssigned}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDragStart={(event) => {
                    if (event.shiftKey || !hasAssigned) {
                      event.preventDefault();
                      return;
                    }
                    event.stopPropagation();
                    onSlotGroupDragStart(event, unitSlotIds, firstSlot);
                  }}
                  onDragEnd={onAnyDragEnd}
                  onDragOver={(event) => onSlotDragOver(event, nextEmptySlot)}
                  onDrop={(event) => onSlotDrop(event, nextEmptySlot)}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpandedMis({
                      hallId,
                      slice: misSlice,
                      side,
                      misUnit,
                    });
                  }}
                >
                  <div className="leading-[1] text-[0.5rem] font-bold uppercase tracking-[0.02em] text-[#355039]">
                    MIS {misGroupNumber}
                  </div>
                  <div className="leading-[1] text-[0.48rem] font-semibold text-[#33524f]">
                    {assignedIds.length}/{sideConfig.misSlotsPerSlice}
                  </div>
                  <div
                    className="grid content-start gap-[2px]"
                    style={{ gridTemplateColumns: `repeat(${previewColumns}, 16px)` }}
                  >
                    {previewIds.map((itemId) => {
                      const item = itemById.get(itemId);
                      if (!item) {
                        return null;
                      }
                      return (
                        <div
                          key={`${hallId}-mis-preview-${slice.globalSlice}-${side}-${misUnit}-${itemId}`}
                          className="grid h-[16px] w-[16px] place-items-center overflow-hidden rounded-[0.2rem] border border-[rgba(56,89,84,0.28)] bg-[rgba(236,249,245,0.8)]"
                        >
                          <Image
                            src={item.texturePath}
                            alt={item.id}
                            width={14}
                            height={14}
                            style={{ imageRendering: "pixelated" }}
                            draggable={false}
                            unoptimized
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>,
              );
            }
          });
          continue;
        }

        for (let row = 0; row < sideConfig.rowsPerSlice; row += 1) {
          const slotKey = nonMisSlotId(hallId, slice.globalSlice, side, row);
          if (orientation === "horizontal") {
            const baseTop = side === 0 ? 0 : hallHeight - sideDepth;
            const x = slice.mainStart + (slice.mainSize - SLOT_SIZE) / 2;
            const y = baseTop + row * (SLOT_SIZE + SLOT_GAP);
            slots.push(
              <div key={slotKey} className="absolute" style={{ left: x, top: y }}>
                {renderSlot(slotKey)}
              </div>,
            );
          } else {
            const baseLeft = side === 0 ? 0 : hallWidth - sideDepth;
            const x = baseLeft + row * (SLOT_SIZE + SLOT_GAP);
            const y = slice.mainStart + (slice.mainSize - SLOT_SIZE) / 2;
            slots.push(
              <div key={slotKey} className="absolute" style={{ left: x, top: y }}>
                {renderSlot(slotKey)}
              </div>,
            );
          }
        }
      }
    }

    return (
      <>
        {orientation === "horizontal" ? (
          <div
            className="absolute left-0 right-0 rounded-[99px] bg-[linear-gradient(180deg,rgba(45,119,127,0.18)_0%,rgba(45,119,127,0.08)_100%)]"
            style={{ top: maxLeftDepth, height: Math.max(8, hallHeight - maxLeftDepth - maxRightDepth) }}
          />
        ) : (
          <div
            className="absolute top-0 bottom-0 rounded-[99px] bg-[linear-gradient(180deg,rgba(45,119,127,0.18)_0%,rgba(45,119,127,0.08)_100%)]"
            style={{ left: maxLeftDepth, width: Math.max(8, hallWidth - maxLeftDepth - maxRightDepth) }}
          />
        )}
        {sectionRanges.length > 1 ? sectionRanges.map((section, index) => {
          const center = section.start + (section.end - section.start) / 2;
          const boundary = index > 0 ? section.start - SLOT_GAP / 2 : null;
          if (orientation === "horizontal") {
            return (
              <div key={`${hallId}:section:${index}`} className="pointer-events-none absolute inset-0">
                {boundary !== null ? (
                  <div
                    className="absolute w-px bg-[rgba(64,50,27,0.35)]"
                    style={{ left: boundary, top: 0, height: hallHeight }}
                  />
                ) : null}
                <div
                  className="absolute -translate-x-1/2 rounded-[0.3rem] border border-[rgba(64,50,27,0.26)] bg-[rgba(255,246,227,0.9)] px-[0.2rem] py-[0.04rem] text-[0.5rem] font-bold uppercase tracking-[0.03em] text-[rgba(72,56,33,0.8)]"
                  style={{ left: center, top: maxLeftDepth + 2 }}
                >
                  {section.name}
                </div>
              </div>
            );
          }
          return (
            <div key={`${hallId}:section:${index}`} className="pointer-events-none absolute inset-0">
              {boundary !== null ? (
                <div
                  className="absolute h-px bg-[rgba(64,50,27,0.35)]"
                  style={{ left: 0, top: boundary, width: hallWidth }}
                />
              ) : null}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 -rotate-90 rounded-[0.3rem] border border-[rgba(64,50,27,0.26)] bg-[rgba(255,246,227,0.9)] px-[0.2rem] py-[0.04rem] text-[0.5rem] font-bold uppercase tracking-[0.03em] text-[rgba(72,56,33,0.8)]"
                style={{ left: aisleCenterX, top: center }}
              >
                {section.name}
              </div>
            </div>
          );
        }) : null}
        {slots}
      </>
    );
  }

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
        const target = event.target as HTMLElement;
        const clickedStorageBackground =
          viewMode === "storage" &&
          !target.closest("[data-mis-panel]") &&
          !target.closest("[data-mis-card]") &&
          !target.closest("[data-no-pan]");
        if (clickedStorageBackground) {
          setExpandedMisTargets([]);
        }

        if (event.shiftKey || selectedSlotIds.size === 0) {
          return;
        }
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
        blurLayoutConfigIfNeeded(event.target);

        const didStartPan = onPointerDown(event);
        if (didStartPan || event.button !== 0 || !event.shiftKey) {
          return;
        }

        const target = event.target as HTMLElement;
        const inNoPanArea = Boolean(target.closest("[data-no-pan]"));
        const inMisPanel = Boolean(target.closest("[data-mis-panel]"));
        if (inNoPanArea && !inMisPanel) {
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
          View Controls
        </div>
        <div className="flex flex-wrap gap-[0.28rem]">
        </div>
        <div className="flex items-center gap-[0.25rem]">
          <button
            type="button"
            className={`rounded-[0.4rem] border px-[0.42rem] py-[0.2rem] text-[0.68rem] font-semibold ${
              fillDirection === "row"
                ? "border-[rgba(33,114,82,0.58)] bg-[rgba(226,253,239,0.96)] text-[#245342]"
                : "border-[rgba(123,98,66,0.48)] bg-[rgba(255,255,255,0.92)] text-[#3b2f22]"
            }`}
            onClick={() => onFillDirectionChange("row")}
          >
            Fill Row First
          </button>
          <button
            type="button"
            className={`rounded-[0.4rem] border px-[0.42rem] py-[0.2rem] text-[0.68rem] font-semibold ${
              fillDirection === "column"
                ? "border-[rgba(33,114,82,0.58)] bg-[rgba(226,253,239,0.96)] text-[#245342]"
                : "border-[rgba(123,98,66,0.48)] bg-[rgba(255,255,255,0.92)] text-[#3b2f22]"
            }`}
            onClick={() => onFillDirectionChange("column")}
          >
            Fill Column First
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
        <div className="flex items-center gap-[0.25rem]">
          <button
            type="button"
            className={`rounded-[0.4rem] border px-[0.42rem] py-[0.2rem] text-[0.68rem] font-semibold ${
              storageLayoutPreset === "cross"
                ? "border-[rgba(33,114,82,0.58)] bg-[rgba(226,253,239,0.96)] text-[#245342]"
                : "border-[rgba(123,98,66,0.48)] bg-[rgba(255,255,255,0.92)] text-[#3b2f22]"
            }`}
            onClick={() => {
              setStorageLayoutPreset("cross");
              if (viewMode === "storage") {
                onRecenterViewport();
              }
            }}
          >
            Cross Layout
          </button>
          <button
            type="button"
            className={`rounded-[0.4rem] border px-[0.42rem] py-[0.2rem] text-[0.68rem] font-semibold ${
              storageLayoutPreset === "h"
                ? "border-[rgba(33,114,82,0.58)] bg-[rgba(226,253,239,0.96)] text-[#245342]"
                : "border-[rgba(123,98,66,0.48)] bg-[rgba(255,255,255,0.92)] text-[#3b2f22]"
            }`}
            onClick={() => {
              setStorageLayoutPreset("h");
              if (viewMode === "storage") {
                onRecenterViewport();
              }
            }}
          >
            H Layout
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

      {expandedMisPanels.length > 0 ? (
        <div
          className="absolute left-1/2 top-5 z-30 flex max-w-[96vw] -translate-x-1/2 items-start gap-3"
          data-no-pan
          onClick={(event) => event.stopPropagation()}
        >
          {expandedMisPanels.map((panel, index) => {
            const isPrimary = index === 0;
            const frameClass = isPrimary
              ? "border-[rgba(58,90,74,0.55)] bg-[linear-gradient(180deg,rgba(244,250,240,0.97)_0%,rgba(223,236,216,0.97)_100%)]"
              : "border-[rgba(64,78,112,0.55)] bg-[linear-gradient(180deg,rgba(240,246,255,0.97)_0%,rgba(217,228,246,0.97)_100%)]";
            const headerClass = isPrimary
              ? "border-[rgba(63,88,72,0.28)] text-[#2e5042]"
              : "border-[rgba(64,82,108,0.28)] text-[#2d4464]";
            const subTextClass = isPrimary ? "text-[#3e6455]" : "text-[#45608a]";
            const closeClass = isPrimary
              ? "border-[rgba(82,104,88,0.45)] bg-[rgba(253,255,252,0.92)] text-[#2f4b3f]"
              : "border-[rgba(86,100,130,0.45)] bg-[rgba(252,254,255,0.92)] text-[#334d70]";
            const panelKey = expandedMisKey(panel);
            return (
              <div
                key={panelKey}
                className={`w-[min(30vw,360px)] overflow-hidden rounded-[0.85rem] border shadow-[0_12px_34px_rgba(38,48,33,0.28)] max-[980px]:w-[78vw] ${frameClass}`}
                data-mis-panel
              >
                <header
                  className={`flex items-center justify-between border-b px-3 py-2 ${headerClass}`}
                  draggable={panel.slotIds.some((slotId) => Boolean(slotAssignments[slotId]))}
                  onDragStart={(event) => {
                    if (event.shiftKey) {
                      event.preventDefault();
                      return;
                    }
                    onSlotGroupDragStart(event, panel.slotIds, panel.slotIds[0]);
                  }}
                  onDragEnd={onAnyDragEnd}
                >
                  <div className="grid gap-[0.08rem]">
                    <div className="text-[0.78rem] font-bold uppercase tracking-[0.05em]">
                      {hallNames[panel.hallId]} Slice {panel.slice + 1} •{" "}
                      {panel.side === 0 ? "Left" : "Right"} MIS {panel.misUnit + 1}
                    </div>
                    <div className={`text-[0.68rem] ${subTextClass}`}>
                      {panel.slotIds.filter((slotId) => Boolean(slotAssignments[slotId])).length}/
                      {panel.capacity} assigned
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`rounded-[0.4rem] border px-[0.5rem] py-[0.2rem] text-[0.72rem] font-semibold ${closeClass}`}
                    onClick={() =>
                      setExpandedMisTargets((current) =>
                        current.filter(
                          (entry) =>
                            expandedMisKey(entry) !== panelKey,
                        ),
                      )
                    }
                  >
                    Close
                  </button>
                </header>
                <div className="max-h-[64vh] overflow-auto p-3">
                  <div
                    className="grid content-start gap-[4px]"
                    style={{
                      gridTemplateColumns: `repeat(${panel.columns}, ${SLOT_SIZE}px)`,
                    }}
                  >
                    {panel.slotIds.map((slotId) => renderSlot(slotId))}
                  </div>
                </div>
              </div>
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
          data-storage-canvas
        >
          {viewMode === "storage" && hallLayout.core ? (
            <div
              className="absolute grid place-items-center rounded-[1.1rem] border-2 border-dashed border-[rgba(41,86,92,0.7)] bg-[repeating-linear-gradient(-45deg,rgba(186,225,222,0.45)_0,rgba(186,225,222,0.45)_8px,rgba(210,234,231,0.6)_8px,rgba(210,234,231,0.6)_16px)] text-[0.875rem] font-bold uppercase tracking-[0.08em] text-[#18444c]"
              style={{
                width: `${hallLayout.core.width}px`,
                height: `${hallLayout.core.height}px`,
                left: `${hallLayout.core.left}px`,
                top: `${hallLayout.core.top}px`,
              }}
            >
              {hallLayout.core.label}
            </div>
          ) : null}

          {HALL_ORDER.map((hallId) => {
            const hall = hallConfigs[hallId];
            const orientation =
              viewMode === "flat"
                ? "horizontal"
                : directionOrientation(hallLayout.directions[hallId]);
            const reverseSlices =
              viewMode === "flat"
                ? false
                : directionReverseSlices(hallLayout.directions[hallId]);
            const placement = hallLayout.positions[hallId];
            const layoutDirection = hallLayout.directions[hallId];
            const controlAnchorStyle = (() => {
              if (viewMode === "flat") {
                return { left: "-0.36rem", top: "50%", transform: "translate(-100%, -50%)" };
              }
              switch (layoutDirection) {
                case "south":
                  return { left: "50%", bottom: "-0.36rem", transform: "translate(-50%, 100%)" };
                case "north":
                  return { left: "50%", top: "-0.36rem", transform: "translate(-50%, -100%)" };
                case "east":
                  return { right: "0", top: "-0.36rem", transform: "translate(0, -100%)" };
                case "west":
                default:
                  return { left: "0", top: "-0.36rem", transform: "translate(0, -100%)" };
              }
            })();

            return (
              <section
                key={hallId}
                className="absolute rounded-[0.85rem] border border-[rgba(72,64,52,0.4)] bg-[rgba(255,250,240,0.8)] shadow-[0_5px_15px_rgba(42,34,20,0.12)]"
                data-hall-section
                style={{
                  left: `${placement.left}px`,
                  top: `${placement.top}px`,
                  transform: placement.transform,
                  width: `${placement.width}px`,
                  height: `${placement.height}px`,
                }}
                onDrop={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <div
                  className="absolute z-10"
                  style={controlAnchorStyle}
                  data-no-pan
                  data-layout-config
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <div className="grid gap-[0.16rem] rounded-[0.55rem] border border-[rgba(132,100,63,0.4)] bg-[rgba(255,244,223,0.96)] px-[0.32rem] py-[0.2rem] text-[#5f4c33]">
                    <div className="flex items-center gap-[0.2rem]">
                    <span
                      className="cursor-text rounded-[0.2rem] px-[0.08rem] text-[0.62rem] font-bold uppercase tracking-[0.04em] hover:text-[#2d6a4f] focus:bg-white focus:text-[#2d6a4f] focus:outline-none"
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      tabIndex={0}
                      onBlur={(event) =>
                        updateHallName(hallId, event.currentTarget.textContent ?? "")
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      title="Click to rename hall"
                    >
                      {hallNames[hallId]}
                    </span>
                      <button
                        type="button"
                        className="rounded-[0.32rem] border border-[rgba(66,127,90,0.45)] bg-[rgba(233,255,243,0.9)] px-[0.2rem] py-[0.08rem] text-[0.56rem] font-semibold text-[#2f5b43]"
                        onClick={() => onAddSection(hallId)}
                      >
                        + Section
                      </button>
                    </div>
                    {hall.sections.map((section, sectionIndex) => (
                      <div key={`${hallId}-section-${sectionIndex}`} className="flex items-center gap-[0.16rem]">
                        <span className="text-[0.56rem] font-semibold">#{sectionIndex + 1}</span>
                        <span className="text-[0.54rem] font-semibold">S</span>
                        <DeferredNumberInput
                          className="w-[2.7rem] rounded-[0.25rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
                          min={1}
                          max={200}
                          value={section.slices}
                          onCommit={(value) => onSectionSlicesChange(hallId, sectionIndex, value)}
                        />
                        {renderSideEditor(hallId, sectionIndex, "left", "L", section.sideLeft)}
                        {renderSideEditor(hallId, sectionIndex, "right", "R", section.sideRight)}
                        {hall.sections.length > 1 ? (
                          <button
                            type="button"
                            className="rounded-[0.28rem] border border-[rgba(153,53,40,0.4)] bg-[rgba(255,237,232,0.95)] px-[0.18rem] py-[0.06rem] text-[0.56rem] font-semibold text-[#7a2318]"
                            onClick={() => onRemoveSection(hallId, sectionIndex)}
                          >
                            x
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {renderHallContent(
                  hallId,
                  hall,
                  orientation,
                  reverseSlices,
                  placement.width,
                  placement.height,
                )}
              </section>
            );
          })}
        </div>
      </div>

      {selectionBox ? (
        <div
          className="pointer-events-none absolute z-40 border border-[rgba(37,99,235,0.9)] bg-[rgba(37,99,235,0.18)]"
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

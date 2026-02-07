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
import type { CatalogItem, HallConfig, HallId, PreviewPlacement } from "../types";
import { getHallSize, misSlotId, nonMisSlotId, toTitle } from "../utils";

type LayoutViewportProps = {
  hallConfigs: Record<HallId, HallConfig>;
  slotAssignments: Record<string, string>;
  itemById: Map<string, CatalogItem>;
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  onAdjustZoom: (delta: number) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => boolean;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onSlotDragOver: (event: DragEvent<HTMLElement>, slotId: string) => void;
  onSlotDrop: (event: DragEvent<HTMLElement>, slotId: string) => void;
  onSlotItemDragStart: (
    event: DragEvent<HTMLElement>,
    slotId: string,
    itemId: string,
  ) => void;
  onAnyDragEnd: () => void;
  onClearSlot: (slotId: string) => void;
  dragPreviewPlacements: PreviewPlacement[];
  selectedSlotIds: Set<string>;
  onSelectionChange: (slotIds: string[]) => void;
};

export function LayoutViewport({
  hallConfigs,
  slotAssignments,
  itemById,
  viewportRef,
  zoom,
  pan,
  onAdjustZoom,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onSlotDragOver,
  onSlotDrop,
  onSlotItemDragStart,
  onAnyDragEnd,
  onClearSlot,
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
  }, [center, hallConfigs]);

  function renderSlot(slotId: string): ReactNode {
    const assignedItemId = slotAssignments[slotId];
    const assignedItem = assignedItemId ? itemById.get(assignedItemId) : undefined;
    const preview = previewBySlot.get(slotId);
    const previewItemId = preview?.itemId;
    const previewItem = previewItemId ? itemById.get(previewItemId) : undefined;
    const isDropTarget = Boolean(previewItem);
    const isSwapPreview = preview?.kind === "swap";
    const showAssignedItem = Boolean(assignedItem) && !previewItem;
    const isSelected = selectedSlotIds.has(slotId) && Boolean(assignedItem);

    return (
      <button
        key={slotId}
        type="button"
        className={`relative grid h-[34px] w-[34px] cursor-pointer place-items-center overflow-hidden rounded-[0.45rem] border p-0 transition hover:-translate-y-px hover:shadow-[0_3px_8px_rgba(57,47,30,0.22)] ${
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
          if (!assignedItemId) {
            event.preventDefault();
            return;
          }
          onSlotItemDragStart(event, slotId, assignedItemId);
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
            draggable={false}
            unoptimized
          />
        ) : null}
        {previewItem ? (
          <Image
            src={previewItem.texturePath}
            alt={previewItem.id}
            width={22}
            height={22}
            className={`pointer-events-none absolute inset-0 z-[2] m-auto ${
              showAssignedItem ? "opacity-40" : "opacity-[0.72]"
            }`}
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
              Array.from({ length: mainSlices }, (_, slice) =>
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
              Array.from({ length: mainSlices }, (_, slice) =>
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
          {Array.from({ length: mainSlices }, (_, slice) =>
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
          {Array.from({ length: mainSlices }, (_, slice) =>
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

    return (
      <div className={`absolute inset-0 flex gap-1 ${directionClass}`}>
        {Array.from({ length: config.slices }, (_, slice) => {
          const slotIds = Array.from(
            { length: config.misSlotsPerSlice },
            (_, index) => misSlotId(hallId, slice, index),
          );

          const assignedItemIds = slotIds
            .map((slotId) => slotAssignments[slotId])
            .filter((itemId): itemId is string => Boolean(itemId));

          const previewIds = assignedItemIds.slice(0, 6);
          const firstSlot = slotIds[0];

          return (
            <div
              key={`${hallId}-mis-${slice}`}
              className="grid min-w-0 flex-1 grid-rows-[auto_auto_1fr] gap-[0.22rem] rounded-[0.65rem] border border-[rgba(73,97,78,0.45)] bg-[linear-gradient(180deg,rgba(244,250,240,0.95)_0%,rgba(221,235,212,0.95)_100%)] p-[0.32rem]"
              onDragOver={(event) => onSlotDragOver(event, firstSlot)}
              onDrop={(event) => onSlotDrop(event, firstSlot)}
              title={`Slice ${slice + 1} • ${assignedItemIds.length}/${config.misSlotsPerSlice}`}
              data-slot
            >
              <div className="text-[0.6rem] font-bold uppercase tracking-[0.04em] text-[#355039]">
                Slice {slice + 1}
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
                      key={`${hallId}-mis-${slice}-${itemId}`}
                      className="grid aspect-square place-items-center overflow-hidden rounded-[0.25rem] border border-[rgba(56,89,84,0.28)] bg-[rgba(236,249,245,0.8)]"
                    >
                      <Image
                        src={item.texturePath}
                        alt={item.id}
                        width={16}
                        height={16}
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
  }

  return (
    <div
      ref={viewportRef}
      className="relative min-h-0 flex-1 cursor-grab select-none overflow-hidden touch-none active:cursor-grabbing"
      style={viewportBackgroundStyle}
      onPointerDown={(event) => {
        const didStartPan = onPointerDown(event);
        if (didStartPan || event.button !== 0 || event.shiftKey) {
          return;
        }

        const target = event.target as HTMLElement;
        if (target.closest("[data-slot]") || target.closest("[data-no-pan]")) {
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
        <div>Shift + drag to pan</div>
        <div>Drag to box-select slots</div>
        <div>Right-click a placed slot to clear</div>
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

          {HALL_ORDER.map((hallId) => {
            const hall = hallConfigs[hallId];
            const orientation = HALL_ORIENTATION[hallId];
            const placement = hallPlacement[hallId];

            const hallFirstSlot =
              hall.type === "mis"
                ? misSlotId(hallId, 0, 0)
                : nonMisSlotId(hallId, 0, 0, 0);

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
                  onSlotDragOver(event, hallFirstSlot);
                }}
                onDrop={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }
                  onSlotDrop(event, hallFirstSlot);
                }}
              >
                <div className="pointer-events-none absolute left-[0.45rem] top-[-1.3rem] rounded-full border border-[rgba(132,100,63,0.4)] bg-[#fff4df] px-[0.4rem] py-[0.1rem] text-[0.65rem] font-bold uppercase tracking-[0.04em] text-[#5f4c33]">
                  {HALL_LABELS[hallId]} • {hall.type.toUpperCase()}
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

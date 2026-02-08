import Image from "next/image";
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogItem } from "../types";
import { buildCategories, toTitle } from "../utils";

type ItemLibraryPanelProps = {
  catalogItems: CatalogItem[];
  isLoadingCatalog: boolean;
  catalogError: string | null;
  usedItemIds: Set<string>;
  onItemDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
  onCategoryDragStart: (
    event: DragEvent<HTMLElement>,
    itemIds: string[],
  ) => void;
  onLibraryDragOver: (event: DragEvent<HTMLElement>) => void;
  onLibraryDrop: (event: DragEvent<HTMLElement>) => void;
  onAnyDragEnd: () => void;
};

export function ItemLibraryPanel({
  catalogItems,
  isLoadingCatalog,
  catalogError,
  usedItemIds,
  onItemDragStart,
  onCategoryDragStart,
  onLibraryDragOver,
  onLibraryDrop,
  onAnyDragEnd,
}: ItemLibraryPanelProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedOverrides, setCollapsedOverrides] = useState<
    Record<string, boolean>
  >({});
  const [scrollTop, setScrollTop] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const [listWidth, setListWidth] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const defaultCollapseThreshold = 48;
  const listOverscan = 520;
  const sectionGap = 10;

  const availableItems = useMemo(
    () => catalogItems.filter((item) => !usedItemIds.has(item.id)),
    [catalogItems, usedItemIds],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    if (!normalizedSearch) {
      return availableItems;
    }

    return availableItems.filter((item) => {
      const label = toTitle(item.id).toLowerCase();
      return item.id.includes(normalizedSearch) || label.includes(normalizedSearch);
    });
  }, [availableItems, normalizedSearch]);

  const categories = useMemo(() => buildCategories(visibleItems), [visibleItems]);
  const categoryColumns = listWidth <= 860 ? 1 : 2;

  useEffect(() => {
    const element = listRef.current;
    if (!element) {
      return;
    }

    const syncMetrics = (): void => {
      setListHeight(element.clientHeight);
      setListWidth(element.clientWidth);
    };
    syncMetrics();

    const onScroll = (): void => {
      setScrollTop(element.scrollTop);
    };

    const observer = new ResizeObserver(() => {
      syncMetrics();
    });
    observer.observe(element);
    element.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", onScroll);
    };
  }, []);

  const categoryMeta = useMemo(() => {
    return categories.map((category) => {
      const isCollapsed = normalizedSearch
        ? false
        : (collapsedOverrides[category.id] ??
          (category.items.length > defaultCollapseThreshold));
      const estimatedHeight = (() => {
        const headerHeight = 56;
        if (isCollapsed) {
          return headerHeight;
        }
        const rows = Math.max(1, Math.ceil(category.items.length / Math.max(1, categoryColumns)));
        const gridHeight = rows * 44 + Math.max(0, rows - 1) * 6 + 16;
        return headerHeight + gridHeight;
      })();
      return { category, isCollapsed, estimatedHeight };
    });
  }, [
    categories,
    categoryColumns,
    collapsedOverrides,
    defaultCollapseThreshold,
    normalizedSearch,
  ]);

  const virtualizedList = useMemo(() => {
    if (categoryMeta.length === 0) {
      return {
        totalHeight: 0,
        startIndex: 0,
        endIndex: -1,
        topSpacer: 0,
        bottomSpacer: 0,
      };
    }

    const heights = categoryMeta.map((entry) => measuredHeights[entry.category.id] ?? entry.estimatedHeight);
    const offsets: number[] = new Array(heights.length);
    let cursor = 0;
    for (let index = 0; index < heights.length; index += 1) {
      offsets[index] = cursor;
      cursor += heights[index] + (index < heights.length - 1 ? sectionGap : 0);
    }
    const totalHeight = cursor;
    const maxScrollTop = Math.max(0, totalHeight - Math.max(0, listHeight));
    const safeScrollTop = Math.min(Math.max(0, scrollTop), maxScrollTop);

    const minY = Math.max(0, safeScrollTop - listOverscan);
    const maxY = safeScrollTop + Math.max(0, listHeight) + listOverscan;

    let startIndex = 0;
    while (
      startIndex < heights.length &&
      offsets[startIndex] + heights[startIndex] < minY
    ) {
      startIndex += 1;
    }
    if (startIndex >= heights.length) {
      startIndex = heights.length - 1;
    }

    let endIndex = startIndex;
    while (endIndex < heights.length && offsets[endIndex] <= maxY) {
      endIndex += 1;
    }
    endIndex = Math.min(heights.length - 1, Math.max(startIndex, endIndex - 1));

    const topSpacer = startIndex > 0 ? offsets[startIndex] : 0;
    const visibleBottom =
      endIndex >= startIndex ? offsets[endIndex] + heights[endIndex] : topSpacer;
    const bottomSpacer = Math.max(0, totalHeight - visibleBottom);

    return {
      totalHeight,
      startIndex,
      endIndex,
      topSpacer,
      bottomSpacer,
    };
  }, [categoryMeta, listHeight, listOverscan, measuredHeights, scrollTop]);

  function updateMeasuredHeight(categoryId: string, nextHeight: number): void {
    setMeasuredHeights((current) => {
      if (current[categoryId] === nextHeight) {
        return current;
      }
      return { ...current, [categoryId]: nextHeight };
    });
  }

  return (
    <aside
      className="flex min-h-0 w-[min(420px,36vw)] min-w-[300px] max-w-[500px] flex-col overflow-hidden bg-gradient-to-b from-[#fff7e7] to-[#feecd2] max-[1200px]:min-h-[38vh] max-[1200px]:w-full max-[1200px]:min-w-0 max-[1200px]:max-w-none"
      onDragOver={onLibraryDragOver}
      onDrop={onLibraryDrop}
      data-no-pan
    >
      <div className="grid gap-[0.4rem] border-b border-b-[rgba(134,106,67,0.3)] px-[0.95rem] pb-[0.9rem] pt-4">
        <h2 className="m-0 text-[1.1rem] tracking-[0.02em]">Item Library</h2>
        <p className="m-0 text-[0.78rem] text-[#6d6256]">
          {usedItemIds.size} placed / {catalogItems.length} total
        </p>
        <p className="m-0 mt-[-0.1rem] text-[0.72rem] text-[#4a6a5f]">
          Drop a placed layout item here to return it to the list.
        </p>

        <label className="grid gap-[0.22rem]">
          <span className="text-[0.74rem] text-[#6d6256]">Search</span>
          <input
            className="rounded-[0.45rem] border border-[rgba(127,99,62,0.4)] bg-[#fffdf8] px-[0.5rem] py-[0.42rem] text-[0.84rem] outline-none"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="diamond, concrete, chest..."
          />
        </label>
      </div>

      {isLoadingCatalog ? (
        <div className="mx-[0.95rem] my-[0.8rem] rounded-[0.6rem] border border-[rgba(122,99,66,0.32)] bg-[rgba(255,252,245,0.85)] px-[0.75rem] py-[0.65rem] text-[0.84rem] text-[#6d6256]">
          Loading item catalog...
        </div>
      ) : null}

      {catalogError ? (
        <div className="mx-[0.95rem] my-[0.8rem] rounded-[0.6rem] border border-[rgba(156,55,42,0.48)] bg-[rgba(255,234,230,0.95)] px-[0.75rem] py-[0.65rem] text-[0.84rem] text-[#7c2217]">
          {catalogError}
        </div>
      ) : null}

      {!isLoadingCatalog && !catalogError ? (
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overscroll-contain px-[0.8rem] pb-[0.8rem] pt-[0.6rem]"
        >
          {categories.length > 0 ? (
            <div style={{ minHeight: `${Math.ceil(virtualizedList.totalHeight)}px` }}>
              {virtualizedList.topSpacer > 0 ? (
                <div style={{ height: `${Math.ceil(virtualizedList.topSpacer)}px` }} />
              ) : null}

              {categoryMeta
                .slice(virtualizedList.startIndex, virtualizedList.endIndex + 1)
                .map(({ category, isCollapsed }, visibleIndex, visibleArray) => {
                  const categoryLabel = category.label || toTitle(category.id) || "Category";
                  const categoryItemIds = category.items.map((item) => item.id);
                  const isLastVisible = visibleIndex === visibleArray.length - 1;

                  return (
                    <section
                      key={category.id}
                      ref={(element) => {
                        if (!element) {
                          return;
                        }
                        updateMeasuredHeight(category.id, element.offsetHeight);
                      }}
                      className={`overflow-hidden rounded-[0.68rem] border border-[rgba(137,107,67,0.35)] bg-[rgba(255,251,241,0.9)] ${
                        !isLastVisible ? "mb-[0.6rem]" : ""
                      }`}
                    >
                <div className="grid min-h-[2.35rem] grid-cols-[auto_1fr_auto] items-center gap-[0.4rem] border-b border-b-[rgba(145,114,73,0.22)] bg-[rgba(255,245,226,0.98)] px-[0.5rem] py-[0.5rem]">
                  <button
                    type="button"
                    className="h-[1.4rem] w-[1.4rem] cursor-pointer rounded-[0.32rem] border border-[rgba(114,87,52,0.38)] bg-[#fffcf5] p-0 text-[#4f3c23]"
                    onClick={() => {
                      setCollapsedOverrides((current) => ({
                        ...current,
                        [category.id]: !isCollapsed,
                      }));
                    }}
                  >
                    {isCollapsed ? "▸" : "▾"}
                  </button>

                  <div className="grid gap-[0.1rem]">
                    <div className="text-[0.8rem] font-bold text-[#3f3327]">
                      {categoryLabel}
                    </div>
                    <div className="text-[0.68rem] text-[#6d6256]">
                      {category.items.length} available
                    </div>
                  </div>

                  <button
                    type="button"
                    className="cursor-grab rounded-full border border-dashed border-[rgba(114,87,52,0.42)] bg-[#fff7e7] px-[0.36rem] py-[0.14rem] text-[0.66rem] font-bold text-[#5a4934] hover:border-[rgba(40,111,88,0.5)] hover:bg-[#f2fff9]"
                    draggable={category.items.length > 0}
                    onDragStart={(event) => onCategoryDragStart(event, categoryItemIds)}
                    onDragEnd={onAnyDragEnd}
                    title={`Drag ${categoryLabel}`}
                  >
                    Drag
                  </button>
                </div>

                {!isCollapsed ? (
                  <div className="grid grid-cols-2 gap-[0.34rem] p-[0.5rem] max-[860px]:grid-cols-1">
                    {category.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex min-h-[2rem] cursor-grab items-center gap-[0.4rem] rounded-[0.5rem] border border-[rgba(116,92,59,0.36)] bg-[rgba(255,253,247,0.95)] px-[0.4rem] py-[0.3rem] text-left text-[#342b21] hover:border-[rgba(38,109,88,0.5)] hover:bg-[#f0fff8]"
                        draggable
                        onDragStart={(event) => onItemDragStart(event, item.id)}
                        onDragEnd={onAnyDragEnd}
                        title={`Drag ${toTitle(item.id)}`}
                      >
                        <Image
                          src={item.texturePath}
                          alt={item.id}
                          width={22}
                          height={22}
                          className="pointer-events-none"
                          style={{ imageRendering: "pixelated" }}
                          draggable={false}
                          unoptimized
                        />
                        <span className="text-[0.74rem] leading-[1.2]">
                          {toTitle(item.id)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                    </section>
                  );
                })}

              {virtualizedList.bottomSpacer > 0 ? (
                <div style={{ height: `${Math.ceil(virtualizedList.bottomSpacer)}px` }} />
              ) : null}
            </div>
          ) : null}

          {categories.length === 0 ? (
            <div className="mx-[0.95rem] my-[0.8rem] rounded-[0.6rem] border border-[rgba(122,99,66,0.32)] bg-[rgba(255,252,245,0.85)] px-[0.75rem] py-[0.65rem] text-[0.84rem] text-[#6d6256]">
              No items match your search.
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

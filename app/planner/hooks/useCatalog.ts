import { useEffect, useState } from "react";
import { withBasePath } from "../base-path";
import type { CatalogItem, CatalogResponse } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasNoLootTableFlag(rawBlockLoot: unknown): boolean {
  if (!isRecord(rawBlockLoot)) {
    return false;
  }
  return rawBlockLoot.noLootTable === true;
}

function parseCreativeTabs(rawCreativeTabs: unknown): string[] {
  if (!Array.isArray(rawCreativeTabs)) {
    return [];
  }
  return rawCreativeTabs.filter((entry): entry is string => typeof entry === "string");
}

function getCatalogCandidateUrls(): string[] {
  return Array.from(
    new Set([
      withBasePath("/items/items.json"),
      "/items/items.json",
    ]),
  );
}

export function useCatalog(): {
  catalogItems: CatalogItem[];
  isLoadingCatalog: boolean;
  catalogError: string | null;
} {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog(): Promise<void> {
      try {
        setIsLoadingCatalog(true);
        setCatalogError(null);

        let response: Response | null = null;

        for (const url of getCatalogCandidateUrls()) {
          const attempt = await fetch(url);
          if (attempt.ok) {
            response = attempt;
            break;
          }
        }

        if (!response) {
          throw new Error("Failed to load item catalog from known paths");
        }

        const parsed: unknown = await response.json();
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !("items" in parsed) ||
          !Array.isArray((parsed as CatalogResponse).items)
        ) {
          throw new Error("Item catalog format is invalid");
        }

        const items = (parsed as CatalogResponse).items
          .filter(
            (item) => typeof item.id === "string" && typeof item.texturePath === "string",
          )
          .filter((item) => item.maxStackSize !== 1)
          .filter((item) => !hasNoLootTableFlag(item.blockLoot))
          .map((item) => ({
            id: item.id,
            texturePath: withBasePath(item.texturePath as string),
            creativeTabs: parseCreativeTabs(item.creativeTabs),
          }))
          .filter((item) => !item.creativeTabs.includes("spawn_eggs"))
          .sort((a, b) => a.id.localeCompare(b.id));

        if (!cancelled) {
          setCatalogItems(items);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unknown catalog loading error";
          setCatalogError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCatalog(false);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    catalogItems,
    isLoadingCatalog,
    catalogError,
  };
}

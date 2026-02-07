import { useEffect, useState } from "react";
import type { CatalogItem, CatalogResponse } from "../types";

function getCatalogCandidateUrls(): string[] {
  const candidates: string[] = [];

  if (typeof window !== "undefined") {
    const segments = window.location.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      candidates.push(`/${segments[0]}/items/items.json`);
    }
  }

  candidates.push("/items/items.json");

  return Array.from(new Set(candidates));
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
          .map((item) => ({
            id: item.id,
            texturePath: item.texturePath as string,
          }))
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

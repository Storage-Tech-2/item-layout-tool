import {
  type PlannerHistoryEntry,
  type PlannerHistoryState,
  type PlannerSnapshot,
  type PlannerSnapshotDelta,
  buildPlannerSnapshot,
  parsePlannerSnapshot,
} from "./plannerSnapshot";

const DRAFT_DB_NAME = "item-layout-tool";
const DRAFT_DB_VERSION = 1;
const DRAFT_STORE_NAME = "plannerDrafts";
const DRAFT_RECORD_KEY = "autosave";
const DRAFT_FORMAT_VERSION = 1;

export type PlannerAutosaveDraft = {
  version: number;
  savedAt: string;
  snapshot: PlannerSnapshot;
  history: PlannerHistoryState;
};

type SavePlannerAutosaveDraftInput = {
  savedAt: string;
  snapshot: PlannerSnapshot;
  history: PlannerHistoryState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneSnapshotDelta(delta: PlannerSnapshotDelta): PlannerSnapshotDelta {
  if (typeof structuredClone === "function") {
    return structuredClone(delta);
  }
  return JSON.parse(JSON.stringify(delta)) as PlannerSnapshotDelta;
}

function cloneHistoryEntry(entry: PlannerHistoryEntry): PlannerHistoryEntry {
  return {
    key: entry.key,
    forward: cloneSnapshotDelta(entry.forward),
    backward: cloneSnapshotDelta(entry.backward),
  };
}

function cloneHistoryState(history: PlannerHistoryState): PlannerHistoryState {
  const entries = history.entries.map(cloneHistoryEntry);
  const clampedIndex = Math.min(
    Math.max(0, Number.isInteger(history.index) ? history.index : 0),
    entries.length,
  );
  return {
    entries,
    index: clampedIndex,
    currentSnapshot: buildPlannerSnapshot(history.currentSnapshot),
  };
}

function parsePlannerHistoryState(value: unknown): PlannerHistoryState | null {
  if (!isRecord(value) || !Array.isArray(value.entries)) {
    return null;
  }

  const parsedEntries: PlannerHistoryEntry[] = [];
  for (const entry of value.entries) {
    if (!isRecord(entry) || typeof entry.key !== "string") {
      return null;
    }
    if (!isRecord(entry.forward) || !isRecord(entry.backward)) {
      return null;
    }
    parsedEntries.push({
      key: entry.key,
      forward: entry.forward as PlannerSnapshotDelta,
      backward: entry.backward as PlannerSnapshotDelta,
    });
  }

  const currentSnapshot = parsePlannerSnapshot(value.currentSnapshot);
  if (!currentSnapshot) {
    return null;
  }

  const numericIndex = Number(value.index);
  const index = Number.isInteger(numericIndex)
    ? Math.min(Math.max(0, numericIndex), parsedEntries.length)
    : 0;

  return {
    entries: parsedEntries,
    index,
    currentSnapshot,
  };
}

function openPlannerDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    const request = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        database.createObjectStore(DRAFT_STORE_NAME);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open draft database"));
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB request failed"));
    };
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    };
  });
}

export async function loadPlannerAutosaveDraft(): Promise<PlannerAutosaveDraft | null> {
  const database = await openPlannerDraftDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readonly");
    const store = transaction.objectStore(DRAFT_STORE_NAME);
    const rawValue = await requestToPromise(store.get(DRAFT_RECORD_KEY));
    await transactionDone(transaction);

    if (!isRecord(rawValue) || rawValue.version !== DRAFT_FORMAT_VERSION) {
      return null;
    }
    if (typeof rawValue.savedAt !== "string") {
      return null;
    }

    const snapshot = parsePlannerSnapshot(rawValue.snapshot);
    const history = parsePlannerHistoryState(rawValue.history);
    if (!snapshot || !history) {
      return null;
    }

    return {
      version: DRAFT_FORMAT_VERSION,
      savedAt: rawValue.savedAt,
      snapshot: buildPlannerSnapshot(snapshot),
      history: cloneHistoryState(history),
    };
  } finally {
    database.close();
  }
}

export async function savePlannerAutosaveDraft(
  input: SavePlannerAutosaveDraftInput,
): Promise<void> {
  const database = await openPlannerDraftDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(DRAFT_STORE_NAME);

    const snapshot = buildPlannerSnapshot(input.snapshot);
    const history = cloneHistoryState(input.history);
    const record: PlannerAutosaveDraft = {
      version: DRAFT_FORMAT_VERSION,
      savedAt: input.savedAt,
      snapshot,
      history,
    };

    store.put(record, DRAFT_RECORD_KEY);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function clearPlannerAutosaveDraft(): Promise<void> {
  const database = await openPlannerDraftDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(DRAFT_STORE_NAME);
    store.delete(DRAFT_RECORD_KEY);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

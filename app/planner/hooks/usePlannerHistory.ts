import { useCallback, useEffect, useRef, useState } from "react";
import type { PlannerSnapshot } from "../lib/plannerSnapshot";

type PlannerHistoryEntry = {
  snapshot: PlannerSnapshot;
  key: string;
};

type UsePlannerHistoryInput = {
  snapshot: PlannerSnapshot;
  snapshotKey: string;
  onApplySnapshot: (snapshot: PlannerSnapshot) => void;
};

type UsePlannerHistoryResult = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
};

export function usePlannerHistory({
  snapshot,
  snapshotKey,
  onApplySnapshot,
}: UsePlannerHistoryInput): UsePlannerHistoryResult {
  const historyRef = useRef<PlannerHistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const history = historyRef.current;
    const index = historyIndexRef.current;

    if (index >= 0 && history[index]?.key === snapshotKey) {
      setCanUndo(index > 0);
      setCanRedo(index >= 0 && index < history.length - 1);
      return;
    }

    if (index < history.length - 1) {
      history.splice(index + 1);
    }

    history.push({ snapshot, key: snapshotKey });
    const nextIndex = history.length - 1;
    historyIndexRef.current = nextIndex;
    setCanUndo(nextIndex > 0);
    setCanRedo(false);
  }, [snapshot, snapshotKey]);

  const undo = useCallback(() => {
    const history = historyRef.current;
    const nextIndex = historyIndexRef.current - 1;
    if (nextIndex < 0 || nextIndex >= history.length) {
      return;
    }

    historyIndexRef.current = nextIndex;
    setCanUndo(nextIndex > 0);
    setCanRedo(nextIndex < history.length - 1);
    onApplySnapshot(history[nextIndex].snapshot);
  }, [onApplySnapshot]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const nextIndex = historyIndexRef.current + 1;
    if (nextIndex < 0 || nextIndex >= history.length) {
      return;
    }

    historyIndexRef.current = nextIndex;
    setCanUndo(nextIndex > 0);
    setCanRedo(nextIndex < history.length - 1);
    onApplySnapshot(history[nextIndex].snapshot);
  }, [onApplySnapshot]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
  };
}

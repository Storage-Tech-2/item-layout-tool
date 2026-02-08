import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PlannerSnapshot,
  type PlannerSnapshotDelta,
  applyPlannerSnapshotDelta,
  diffPlannerSnapshot,
  snapshotToKey,
} from "../lib/plannerSnapshot";

type PlannerHistoryEntry = {
  forward: PlannerSnapshotDelta;
  backward: PlannerSnapshotDelta;
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
  const historyIndexRef = useRef(0);
  const currentSnapshotRef = useRef<PlannerSnapshot | null>(null);
  const currentSnapshotKeyRef = useRef<string | null>(null);
  const pendingFlagTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const applyFlags = useCallback((index: number, historyLength: number): void => {
    const nextCanUndo = index > 0;
    const nextCanRedo = index < historyLength;
    setCanUndo((previous) => (previous === nextCanUndo ? previous : nextCanUndo));
    setCanRedo((previous) => (previous === nextCanRedo ? previous : nextCanRedo));
  }, []);

  const scheduleFlags = useCallback(
    (index: number, historyLength: number): void => {
      if (pendingFlagTimeoutRef.current !== null) {
        clearTimeout(pendingFlagTimeoutRef.current);
      }
      pendingFlagTimeoutRef.current = setTimeout(() => {
        pendingFlagTimeoutRef.current = null;
        applyFlags(index, historyLength);
      }, 0);
    },
    [applyFlags],
  );

  useEffect(() => {
    return () => {
      if (pendingFlagTimeoutRef.current !== null) {
        clearTimeout(pendingFlagTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const history = historyRef.current;
    const index = historyIndexRef.current;
    const currentSnapshot = currentSnapshotRef.current;
    const currentSnapshotKey = currentSnapshotKeyRef.current;

    if (!currentSnapshot || currentSnapshotKey === null) {
      currentSnapshotRef.current = snapshot;
      currentSnapshotKeyRef.current = snapshotKey;
      history.length = 0;
      historyIndexRef.current = 0;
      scheduleFlags(0, 0);
      return;
    }

    if (currentSnapshotKey === snapshotKey) {
      scheduleFlags(index, history.length);
      return;
    }

    if (index < history.length) {
      history.splice(index);
    }

    const forward = diffPlannerSnapshot(currentSnapshot, snapshot);
    const backward = diffPlannerSnapshot(snapshot, currentSnapshot);
    if (!forward || !backward) {
      currentSnapshotRef.current = snapshot;
      currentSnapshotKeyRef.current = snapshotKey;
      scheduleFlags(index, history.length);
      return;
    }

    history.push({
      forward,
      backward,
      key: snapshotKey,
    });
    const nextIndex = index + 1;
    historyIndexRef.current = nextIndex;
    currentSnapshotRef.current = snapshot;
    currentSnapshotKeyRef.current = snapshotKey;
    scheduleFlags(nextIndex, history.length);
  }, [snapshot, snapshotKey, scheduleFlags]);

  const undo = useCallback(() => {
    const history = historyRef.current;
    const index = historyIndexRef.current;
    const currentSnapshot = currentSnapshotRef.current;
    if (index <= 0 || !currentSnapshot) {
      return;
    }

    const entry = history[index - 1];
    const previousSnapshot = applyPlannerSnapshotDelta(currentSnapshot, entry.backward);
    const nextIndex = index - 1;
    historyIndexRef.current = nextIndex;
    currentSnapshotRef.current = previousSnapshot;
    currentSnapshotKeyRef.current = snapshotToKey(previousSnapshot);
    scheduleFlags(nextIndex, history.length);
    onApplySnapshot(previousSnapshot);
  }, [onApplySnapshot, scheduleFlags]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const index = historyIndexRef.current;
    const currentSnapshot = currentSnapshotRef.current;
    if (index >= history.length || !currentSnapshot) {
      return;
    }

    const entry = history[index];
    const nextSnapshot = applyPlannerSnapshotDelta(currentSnapshot, entry.forward);
    const nextIndex = index + 1;
    historyIndexRef.current = nextIndex;
    currentSnapshotRef.current = nextSnapshot;
    currentSnapshotKeyRef.current = entry.key;
    scheduleFlags(nextIndex, history.length);
    onApplySnapshot(nextSnapshot);
  }, [onApplySnapshot, scheduleFlags]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
  };
}

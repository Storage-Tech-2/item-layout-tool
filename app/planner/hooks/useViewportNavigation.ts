import {
  useCallback,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { MAX_ZOOM, MIN_ZOOM, STAGE_SIZE } from "../constants";
import { clamp } from "../utils";

type PanSession = {
  pointerId: number;
  lastX: number;
  lastY: number;
};

type ViewportState = {
  zoom: number;
  pan: { x: number; y: number };
};

export function useViewportNavigation(): {
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  adjustZoom: (delta: number) => void;
  recenterViewport: () => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => boolean;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
} {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const didInitializePan = useRef(false);
  const panSessionRef = useRef<PanSession | null>(null);
  const previousBodyUserSelect = useRef("");

  const [state, setState] = useState<ViewportState>({
    zoom: 0.6,
    pan: { x: 160, y: 110 },
  });

  useEffect(() => {
    if (didInitializePan.current || !viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    setState((current) => ({
      ...current,
      pan: {
        x: rect.width / 2 - (STAGE_SIZE / 2) * current.zoom,
        y: rect.height / 2 - (STAGE_SIZE / 2) * current.zoom,
      },
    }));
    didInitializePan.current = true;
  }, []);

  useEffect(() => {
    return () => {
      if (panSessionRef.current) {
        document.body.style.userSelect = previousBodyUserSelect.current;
        panSessionRef.current = null;
      }
    };
  }, []);

  const applyZoomAt = useCallback(
    (
      viewportX: number,
      viewportY: number,
      getNextZoom: (currentZoom: number) => number,
    ): void => {
      setState((current) => {
        const nextZoom = clamp(getNextZoom(current.zoom), MIN_ZOOM, MAX_ZOOM);
        if (nextZoom === current.zoom) {
          return current;
        }

        const zoomFactor = nextZoom / current.zoom;

        return {
          zoom: nextZoom,
          pan: {
            x: viewportX - (viewportX - current.pan.x) * zoomFactor,
            y: viewportY - (viewportY - current.pan.y) * zoomFactor,
          },
        };
      });
    },
    [],
  );

  function adjustZoom(delta: number): void {
    if (!viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    applyZoomAt(rect.width / 2, rect.height / 2, (currentZoom) => currentZoom + delta);
  }

  const recenterViewport = useCallback((): void => {
    if (!viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    setState((current) => ({
      ...current,
      pan: {
        x: rect.width / 2 - (STAGE_SIZE / 2) * current.zoom,
        y: rect.height / 2 - (STAGE_SIZE / 2) * current.zoom,
      },
    }));
  }, []);

  const handleWheelFromViewport = useCallback((
    clientX: number,
    clientY: number,
    deltaY: number,
  ): void => {
    if (!viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const fallbackX = rect.width / 2;
    const fallbackY = rect.height / 2;
    const viewportX =
      Number.isFinite(rawX) && rawX >= 0 && rawX <= rect.width ? rawX : fallbackX;
    const viewportY =
      Number.isFinite(rawY) && rawY >= 0 && rawY <= rect.height ? rawY : fallbackY;

    const zoomScale = Math.exp(-deltaY * 0.0022);
    applyZoomAt(viewportX, viewportY, (currentZoom) => currentZoom * zoomScale);
  }, [applyZoomAt]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const handleNativeWheel = (event: globalThis.WheelEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      handleWheelFromViewport(event.clientX, event.clientY, event.deltaY);
    };

    element.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleNativeWheel);
    };
  }, [handleWheelFromViewport]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): boolean {
    if (event.button !== 0) {
      return false;
    }

    const target = event.target as HTMLElement;
    if (target.closest("[data-slot]") || target.closest("[data-no-pan]")) {
      return false;
    }

    if (event.shiftKey) {
      return false;
    }

    panSessionRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };

    previousBodyUserSelect.current = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    return true;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - session.lastX;
    const dy = event.clientY - session.lastY;

    session.lastX = event.clientX;
    session.lastY = event.clientY;

    setState((current) => ({
      ...current,
      pan: {
        x: current.pan.x + dx,
        y: current.pan.y + dy,
      },
    }));
    event.preventDefault();
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>): void {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    document.body.style.userSelect = previousBodyUserSelect.current;
    panSessionRef.current = null;
  }

  return {
    viewportRef,
    zoom: state.zoom,
    pan: state.pan,
    adjustZoom,
    recenterViewport,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
}

import {
  type PointerEvent,
  type RefObject,
  type WheelEvent,
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

type ZoomTarget = {
  viewportX: number;
  viewportY: number;
};

export function useViewportNavigation(): {
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  adjustZoom: (delta: number) => void;
  handleWheel: (event: WheelEvent<HTMLDivElement>) => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
} {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const didInitializePan = useRef(false);
  const panSessionRef = useRef<PanSession | null>(null);
  const previousBodyUserSelect = useRef("");

  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 160, y: 110 });

  useEffect(() => {
    if (didInitializePan.current || !viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    setPan({
      x: rect.width / 2 - (STAGE_SIZE / 2) * zoom,
      y: rect.height / 2 - (STAGE_SIZE / 2) * zoom,
    });
    didInitializePan.current = true;
  }, [zoom]);

  useEffect(() => {
    return () => {
      if (panSessionRef.current) {
        document.body.style.userSelect = previousBodyUserSelect.current;
        panSessionRef.current = null;
      }
    };
  }, []);

  function resolveZoomTarget(
    rect: DOMRect,
    rawX: number,
    rawY: number,
  ): ZoomTarget {
    const fallbackX = rect.width / 2;
    const fallbackY = rect.height / 2;

    const viewportX =
      Number.isFinite(rawX) && rawX >= 0 && rawX <= rect.width ? rawX : fallbackX;
    const viewportY =
      Number.isFinite(rawY) && rawY >= 0 && rawY <= rect.height ? rawY : fallbackY;

    return { viewportX, viewportY };
  }

  function zoomWithTarget(
    target: ZoomTarget,
    getNextZoom: (currentZoom: number) => number,
  ): void {
    setZoom((currentZoom) => {
      const nextZoom = clamp(getNextZoom(currentZoom), MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === currentZoom) {
        return currentZoom;
      }

      const zoomFactor = nextZoom / currentZoom;

      setPan((currentPan) => ({
        x: target.viewportX - (target.viewportX - currentPan.x) * zoomFactor,
        y: target.viewportY - (target.viewportY - currentPan.y) * zoomFactor,
      }));

      return nextZoom;
    });
  }

  function adjustZoom(delta: number): void {
    if (!viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const target = resolveZoomTarget(rect, rect.width / 2, rect.height / 2);
    zoomWithTarget(target, (currentZoom) => currentZoom + delta);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>): void {
    event.preventDefault();

    if (!viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const target = resolveZoomTarget(
      rect,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );

    const zoomScale = Math.exp(-event.deltaY * 0.0022);
    zoomWithTarget(target, (currentZoom) => currentZoom * zoomScale);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("[data-slot]") || target.closest("[data-no-pan]")) {
      return;
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

    setPan((current) => ({
      x: current.x + dx,
      y: current.y + dy,
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
    zoom,
    pan,
    adjustZoom,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
}

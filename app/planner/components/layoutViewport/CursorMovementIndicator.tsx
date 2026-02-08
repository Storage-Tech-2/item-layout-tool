import type { CSSProperties } from "react";
import type { HallDirection } from "../../layoutConfig";
import type { HallId } from "../../types";
import type { CursorMovementHint } from "./types";

type CardinalDirection = CursorMovementHint["direction"];

type CursorMovementIndicatorProps = {
  hint: CursorMovementHint;
  hallDirections: Record<HallId, HallDirection>;
};

function parseHallIdFromSlotId(slotId: string): HallId | null {
  const [hallPart] = slotId.split(":");
  const hallId = Number(hallPart);
  if (!Number.isFinite(hallId)) {
    return null;
  }
  return hallId;
}

function directionVector(direction: CardinalDirection): { x: number; y: number } {
  switch (direction) {
    case "left":
      return { x: -1, y: 0 };
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "right":
    default:
      return { x: 1, y: 0 };
  }
}

function vectorDirection(x: number, y: number): CardinalDirection {
  if (Math.abs(x) >= Math.abs(y)) {
    return x >= 0 ? "right" : "left";
  }
  return y >= 0 ? "down" : "up";
}

function mapLogicalDirectionToHall(
  direction: CardinalDirection,
  hallDirection: HallDirection,
): CardinalDirection {
  const vector = directionVector(direction);
  switch (hallDirection) {
    case "west":
      return vectorDirection(-vector.x, -vector.y);
    case "north":
      return vectorDirection(vector.y, -vector.x);
    case "south":
      return vectorDirection(-vector.y, vector.x);
    case "east":
    default:
      return direction;
  }
}

function arrowHeadPoints(
  endX: number,
  endY: number,
  direction: CardinalDirection,
): string {
  switch (direction) {
    case "left":
      return `${endX + 2.8},${endY - 2.2} ${endX},${endY} ${endX + 2.8},${endY + 2.2}`;
    case "up":
      return `${endX - 2.2},${endY + 2.8} ${endX},${endY} ${endX + 2.2},${endY + 2.8}`;
    case "down":
      return `${endX - 2.2},${endY - 2.8} ${endX},${endY} ${endX + 2.2},${endY - 2.8}`;
    case "right":
    default:
      return `${endX - 2.8},${endY - 2.2} ${endX},${endY} ${endX - 2.8},${endY + 2.2}`;
  }
}

function indicatorAnchorStyle(direction: CardinalDirection): CSSProperties {
  switch (direction) {
    case "left":
      return { left: "-1.12rem", top: "50%", transform: "translateY(-50%)" };
    case "up":
      return { top: "-1.12rem", left: "50%", transform: "translateX(-50%)" };
    case "down":
      return { bottom: "-1.12rem", left: "50%", transform: "translateX(-50%)" };
    case "right":
    default:
      return { right: "-1.12rem", top: "50%", transform: "translateY(-50%)" };
  }
}

export function CursorMovementIndicator({
  hint,
  hallDirections,
}: CursorMovementIndicatorProps) {
  const hallId = parseHallIdFromSlotId(hint.fromSlotId);
  const hallDirection = hallId === null ? "east" : (hallDirections[hallId] ?? "east");
  const primaryDirection = mapLogicalDirectionToHall(hint.direction, hallDirection);
  const secondaryDirection = hint.turnToDirection
    ? mapLogicalDirectionToHall(hint.turnToDirection, hallDirection)
    : null;
  const anchorStyle = indicatorAnchorStyle(primaryDirection);

  const indicatorSize = 26;
  const start = { x: 13, y: 13 };
  const primaryVector = directionVector(primaryDirection);
  const first = {
    x: start.x + primaryVector.x * 5,
    y: start.y + primaryVector.y * 5,
  };

  if (hint.style === "hall-jump") {
    const circleCenter = {
      x: first.x + primaryVector.x * 4,
      y: first.y + primaryVector.y * 4,
    };
    const circleRadius = 2.6;
    const end = {
      x: circleCenter.x - primaryVector.x * (circleRadius + 1.4),
      y: circleCenter.y - primaryVector.y * (circleRadius + 1.4),
    };
    return (
      <span className="pointer-events-none absolute z-30" style={anchorStyle}>
        <svg width={indicatorSize} height={indicatorSize} viewBox={`0 0 ${indicatorSize} ${indicatorSize}`} aria-hidden="true">
          <path
            d={`M${start.x} ${start.y} L${end.x} ${end.y}`}
            fill="none"
            stroke="rgba(146,64,14,0.95)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <polyline
            points={arrowHeadPoints(end.x, end.y, primaryDirection)}
            fill="none"
            stroke="rgba(146,64,14,0.95)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={circleCenter.x}
            cy={circleCenter.y}
            r={circleRadius}
            fill="none"
            stroke="rgba(146,64,14,0.95)"
            strokeWidth="1.4"
          />
        </svg>
      </span>
    );
  }

  if (hint.style === "turn" && secondaryDirection) {
    const secondaryVector = directionVector(secondaryDirection);
    const end = {
      x: first.x + secondaryVector.x * 6.4,
      y: first.y + secondaryVector.y * 6.4,
    };
    return (
      <span className="pointer-events-none absolute z-30" style={anchorStyle}>
        <svg width={indicatorSize} height={indicatorSize} viewBox={`0 0 ${indicatorSize} ${indicatorSize}`} aria-hidden="true">
          <path
            d={`M${start.x} ${start.y} L${first.x} ${first.y} L${end.x} ${end.y}`}
            fill="none"
            stroke="rgba(146,64,14,0.95)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={arrowHeadPoints(end.x, end.y, secondaryDirection)}
            fill="none"
            stroke="rgba(146,64,14,0.95)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  const end = {
    x: first.x + primaryVector.x * 4,
    y: first.y + primaryVector.y * 4,
  };
  return (
    <span className="pointer-events-none absolute z-30" style={anchorStyle}>
      <svg width={indicatorSize} height={indicatorSize} viewBox={`0 0 ${indicatorSize} ${indicatorSize}`} aria-hidden="true">
        <path
          d={`M${start.x} ${start.y} L${end.x} ${end.y}`}
          fill="none"
          stroke="rgba(146,64,14,0.95)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <polyline
          points={arrowHeadPoints(end.x, end.y, primaryDirection)}
          fill="none"
          stroke="rgba(146,64,14,0.95)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

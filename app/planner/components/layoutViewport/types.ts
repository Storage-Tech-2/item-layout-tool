export type CursorMovementHint = {
  fromSlotId: string;
  toSlotId: string;
  style: "straight" | "turn" | "hall-jump";
  direction: "right" | "left" | "up" | "down";
  turnToDirection?: "right" | "left" | "up" | "down";
};

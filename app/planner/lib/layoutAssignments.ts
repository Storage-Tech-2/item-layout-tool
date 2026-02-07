export function retainValidAssignments(
  assignments: Record<string, string>,
  validSlotIds: Set<string>,
): Record<string, string> {
  const next: Record<string, string> = {};

  for (const [slotId, itemId] of Object.entries(assignments)) {
    if (validSlotIds.has(slotId)) {
      next[slotId] = itemId;
    }
  }

  return next;
}

import type { Assignment, CellAddress } from '../types';

export function serializeCellAddress(cell: CellAddress): string {
  let key = `${cell.date}::${cell.shiftId}::${cell.positionId}`;
  if (cell.halfSlot) key += `:h${cell.halfSlot}`;
  if (cell.isOncall) key += ':oc';
  return key;
}

export function deserializeCellAddress(key: string): CellAddress {
  const [date, shiftId, rest] = key.split('::');
  // rest may be "positionId", "positionId:h1", "positionId:h2", or "positionId:oc"
  const parts = rest.split(':');
  const positionId = parts[0];
  const suffix = parts[1] as string | undefined;
  const halfSlot = suffix === 'h1' ? 1 : suffix === 'h2' ? 2 : undefined;
  const isOncall = suffix === 'oc' ? true : undefined;
  return { date, shiftId, positionId, halfSlot, isOncall };
}

/** Returns true if the given assignment matches the given cell address exactly (including halfSlot and isOncall). */
export function matchesCellAddress(a: Assignment, cell: CellAddress): boolean {
  return (
    a.date === cell.date &&
    a.shiftId === cell.shiftId &&
    a.positionId === cell.positionId &&
    (a.halfSlot ?? undefined) === (cell.halfSlot ?? undefined) &&
    !!(a.isOncall) === !!(cell.isOncall)
  );
}

import type { CellAddress } from '../types';

export function serializeCellAddress(cell: CellAddress): string {
  const halfSuffix = cell.half !== undefined ? `::${cell.half}` : '';
  return `${cell.date}::${cell.shiftId}::${cell.positionId}${halfSuffix}`;
}

export function deserializeCellAddress(key: string): CellAddress {
  const [date, shiftId, positionId, halfStr] = key.split('::');
  const half = halfStr ? (parseInt(halfStr) as 1 | 2) : undefined;
  return { date, shiftId, positionId, ...(half !== undefined ? { half } : {}) };
}

/** Returns true if an assignment matches a cell address (including half). */
export function assignmentMatchesCell(
  a: { date: string; shiftId: string; positionId: string; half?: 1 | 2 },
  cell: CellAddress,
): boolean {
  return (
    a.date === cell.date &&
    a.shiftId === cell.shiftId &&
    a.positionId === cell.positionId &&
    (a.half ?? undefined) === (cell.half ?? undefined)
  );
}

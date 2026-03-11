import type { CellAddress } from '../types';

export function serializeCellAddress(cell: CellAddress): string {
  return `${cell.date}::${cell.shiftId}::${cell.positionId}`;
}

export function deserializeCellAddress(key: string): CellAddress {
  const [date, shiftId, positionId] = key.split('::');
  return { date, shiftId, positionId };
}

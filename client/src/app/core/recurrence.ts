import { NodeResponse } from './models';

/** True when a Node's `recurrenceRule` repeats every other week (`INTERVAL=2`). */
export function isBiweekly(entry: Pick<NodeResponse, 'recurrenceRule'>): boolean {
  return !!entry.recurrenceRule?.includes('INTERVAL=2');
}

/** The `UNTIL=YYYYMMDD` date a Node's `recurrenceRule` ends on, as `YYYY-MM-DD`, or null if it doesn't end. */
export function endsOn(entry: Pick<NodeResponse, 'recurrenceRule'>): string | null {
  const match = entry.recurrenceRule?.match(/UNTIL=(\d{8})/);
  if (!match) return null;
  const raw = match[1];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

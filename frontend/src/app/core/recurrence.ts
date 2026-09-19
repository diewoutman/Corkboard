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

export type RepeatPreset = 'never' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RepeatUnit = 'day' | 'week' | 'month' | 'year';
/** RFC 5545 weekday codes, Monday first. */
export const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

/** Form-friendly view of a RRULE. `extra` carries parts the form doesn't edit (UNTIL, COUNT, …) so saving never drops them. */
export interface RepeatSpec {
  preset: RepeatPreset;
  interval: number;
  unit: RepeatUnit;
  /** Weekly custom rules: which weekdays. Empty = the due date's weekday. */
  weekdays: WeekdayCode[];
  /** Monthly custom rules: same day of the month, or "the 3rd Friday" (derived from the due date). */
  monthlyMode: 'date' | 'nthWeekday';
  extra: string[];
}

export function emptyRepeat(): RepeatSpec {
  return { preset: 'never', interval: 1, unit: 'week', weekdays: [], monthlyMode: 'date', extra: [] };
}

const UNIT_FREQ: Record<RepeatUnit, string> = { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY' };
const FREQ_UNIT: Record<string, RepeatUnit> = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' };
const WORKDAYS: WeekdayCode[] = ['MO', 'TU', 'WE', 'TH', 'FR'];

/** "3FR" for the 3rd Friday of the month containing `date`; the 5th occurrence becomes "-1FR" (the last one). */
export function nthWeekdayCode(date: Date): string {
  const nth = Math.ceil(date.getDate() / 7);
  const code = WEEKDAY_CODES[(date.getDay() + 6) % 7];
  return `${nth === 5 ? -1 : nth}${code}`;
}

/** Builds the RRULE for a spec, or null for "never". `due` anchors "nth weekday" monthly rules. */
export function buildRule(spec: RepeatSpec, due: Date | null): string | null {
  const parts: string[] = [];
  switch (spec.preset) {
    case 'never':
      return null;
    case 'daily':
      parts.push('FREQ=DAILY');
      break;
    case 'weekdays':
      parts.push('FREQ=WEEKLY', `BYDAY=${WORKDAYS.join(',')}`);
      break;
    case 'weekly':
      parts.push('FREQ=WEEKLY');
      break;
    case 'monthly':
      parts.push('FREQ=MONTHLY');
      break;
    case 'yearly':
      parts.push('FREQ=YEARLY');
      break;
    case 'custom': {
      parts.push(`FREQ=${UNIT_FREQ[spec.unit]}`);
      const interval = Math.max(1, Math.floor(spec.interval) || 1);
      if (interval > 1) parts.push(`INTERVAL=${interval}`);
      if (spec.unit === 'week' && spec.weekdays.length > 0) {
        const sorted = WEEKDAY_CODES.filter((d) => spec.weekdays.includes(d));
        parts.push(`BYDAY=${sorted.join(',')}`);
      }
      if (spec.unit === 'month' && spec.monthlyMode === 'nthWeekday' && due) {
        parts.push(`BYDAY=${nthWeekdayCode(due)}`);
      }
      break;
    }
  }
  return [...parts, ...spec.extra].join(';');
}

/** Reads a RRULE into a spec. Simple rules map to a preset, everything else to "custom". */
export function parseRule(rule: string | null): RepeatSpec {
  if (!rule) return emptyRepeat();
  const fields = new Map<string, string>();
  const extra: string[] = [];
  for (const part of rule.split(';')) {
    const [key, value] = part.split('=');
    if (['FREQ', 'INTERVAL', 'BYDAY'].includes(key)) fields.set(key, value ?? '');
    else if (part) extra.push(part);
  }

  const unit = FREQ_UNIT[fields.get('FREQ') ?? ''];
  if (!unit) return { ...emptyRepeat(), extra };
  const interval = Number(fields.get('INTERVAL') ?? 1) || 1;
  const byDay = fields.get('BYDAY');
  const base: RepeatSpec = { ...emptyRepeat(), unit, interval, extra };

  if (interval === 1 && !byDay) {
    const preset = ({ day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' } as const)[unit];
    return { ...base, preset };
  }
  if (unit === 'week' && interval === 1 && byDay === WORKDAYS.join(',')) return { ...base, preset: 'weekdays' };

  if (unit === 'week' && byDay) {
    return { ...base, preset: 'custom', weekdays: byDay.split(',').filter((d): d is WeekdayCode => (WEEKDAY_CODES as readonly string[]).includes(d)) };
  }
  if (unit === 'month' && byDay) return { ...base, preset: 'custom', monthlyMode: 'nthWeekday' };
  return { ...base, preset: 'custom' };
}

/** A due date has a time of day unless it sits exactly on local (or, for older data, UTC) midnight. */
export function hasTimeOfDay(iso: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  const localMidnight = date.getHours() === 0 && date.getMinutes() === 0;
  const utcMidnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
  return !localMidnight && !utcMidnight;
}

/** yyyy-MM-dd and HH:mm (local) of a due date, for the form's date and time inputs. */
export function splitDue(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  // Older date-only tasks were stored as UTC midnight, so their calendar day is the UTC one.
  const legacyDateOnly = !hasTimeOfDay(iso) && d.getHours() !== 0;
  const date = legacyDateOnly ? iso.slice(0, 10) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { date, time: hasTimeOfDay(iso) ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '' };
}

/** Combines the form's date and optional time into the ISO due timestamp (date only = local midnight). */
export function joinDue(date: string, time: string): string | null {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time ? time.split(':').map(Number) : [0, 0];
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

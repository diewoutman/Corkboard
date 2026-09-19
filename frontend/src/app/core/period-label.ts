export type PeriodViewMode = 'month' | 'week' | 'day';

/**
 * The calendar header's label for the visible period ("September 2026", "Sep 14 – 20, 2026"),
 * formatted for `locale` — Intl rather than date-fns `format`, which is English-only without a locale object.
 * `days` are the visible week's days (Mon-first), used for the week range.
 */
export function periodLabel(mode: PeriodViewMode, viewDate: Date, days: Date[], locale: string): string {
  if (mode === 'month') return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewDate);
  if (mode === 'day') return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(viewDate);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).formatRange(days[0], days[6]);
}

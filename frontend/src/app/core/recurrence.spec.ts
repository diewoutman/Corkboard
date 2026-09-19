import { describe, expect, it } from 'vitest';
import { buildRule, emptyRepeat, hasTimeOfDay, joinDue, nthWeekdayCode, parseRule, splitDue } from './recurrence';

describe('recurrence rules', () => {
  it('round-trips the simple presets', () => {
    for (const rule of ['FREQ=DAILY', 'FREQ=WEEKLY', 'FREQ=MONTHLY', 'FREQ=YEARLY', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR']) {
      expect(buildRule(parseRule(rule), null)).toBe(rule);
    }
  });

  it('builds custom intervals and weekdays', () => {
    const spec = { ...emptyRepeat(), preset: 'custom' as const, unit: 'week' as const, interval: 2, weekdays: ['FR' as const, 'MO' as const] };
    expect(buildRule(spec, null)).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR');
  });

  it('builds "every 3rd Friday" from the due date', () => {
    const spec = { ...emptyRepeat(), preset: 'custom' as const, unit: 'month' as const, monthlyMode: 'nthWeekday' as const };
    expect(nthWeekdayCode(new Date(2026, 8, 18))).toBe('3FR');
    expect(buildRule(spec, new Date(2026, 8, 18))).toBe('FREQ=MONTHLY;BYDAY=3FR');
    expect(nthWeekdayCode(new Date(2026, 9, 30))).toBe('-1FR');
  });

  it('keeps UNTIL and COUNT when the form re-saves a rule', () => {
    expect(buildRule(parseRule('FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231'), null)).toBe('FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231');
    expect(parseRule('FREQ=DAILY;COUNT=5').preset).toBe('daily');
  });

  it('parses an every-N rule as custom', () => {
    const spec = parseRule('FREQ=DAILY;INTERVAL=3');
    expect(spec).toMatchObject({ preset: 'custom', unit: 'day', interval: 3 });
  });
});

describe('due date and time', () => {
  it('joins a date and time into local time and splits it back', () => {
    const iso = joinDue('2026-09-19', '17:30')!;
    expect(splitDue(iso)).toEqual({ date: '2026-09-19', time: '17:30' });
    expect(hasTimeOfDay(iso)).toBe(true);
  });

  it('treats a date without a time as local midnight with no time', () => {
    const iso = joinDue('2026-09-19', '')!;
    expect(hasTimeOfDay(iso)).toBe(false);
    expect(splitDue(iso)).toEqual({ date: '2026-09-19', time: '' });
    expect(joinDue('', '10:00')).toBeNull();
  });

  it('reads older UTC-midnight due dates as date-only', () => {
    expect(splitDue('2026-09-19T00:00:00.000Z')).toEqual({ date: '2026-09-19', time: '' });
  });
});

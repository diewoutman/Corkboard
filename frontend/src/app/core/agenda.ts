import { FamilyMemberResponse, NodeResponse, OccurrenceResponse } from './models';

/** A Task or Calendar occurrence, normalized to one shape for the Today/Upcoming views. */
export interface AgendaItem {
  key: string;
  kind: 'task' | 'event';
  title: string;
  /** ISO due/start time, or null for an all-day event / a task due with no specific time. */
  time: string | null;
  overdue: boolean;
  assignedFamilyMemberIds: string[];
  /** yyyy-MM-dd, local calendar day this item falls on. */
  dayKey: string;
  task?: NodeResponse;
}

export function dayKeyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function taskToAgendaItem(task: NodeResponse, now: Date): AgendaItem {
  const due = new Date(task.until!);
  return {
    key: `task-${task.id}`,
    kind: 'task',
    title: task.title,
    time: task.until,
    overdue: due < now,
    assignedFamilyMemberIds: task.assignedFamilyMemberIds,
    dayKey: dayKeyOf(due),
    task,
  };
}

export function occurrenceToAgendaItem(occurrence: OccurrenceResponse): AgendaItem {
  return {
    key: `event-${occurrence.appointmentId}-${occurrence.originalDate}`,
    kind: 'event',
    title: occurrence.title,
    time: occurrence.allDay ? null : occurrence.from,
    overdue: false,
    assignedFamilyMemberIds: occurrence.assignedFamilyMemberIds,
    dayKey: occurrence.originalDate,
  };
}

/** Incomplete Tasks due on or before endExclusive — used for both "due today" (Today) and "overdue" (Upcoming). */
export function dueTasks(tasks: NodeResponse[], endExclusive: Date): NodeResponse[] {
  return tasks.filter((t) => !t.isCompleted && t.until && new Date(t.until) < endExclusive);
}

const byTime = (a: AgendaItem, b: AgendaItem) => (a.time ?? '').localeCompare(b.time ?? '');

export interface MemberGroup {
  member: FamilyMemberResponse | null;
  items: AgendaItem[];
}

/** Groups items by assigned FamilyMember — an item assigned to more than one person appears under each. Unassigned items get their own trailing group. */
export function groupByMember(items: AgendaItem[], members: FamilyMemberResponse[]): MemberGroup[] {
  const byMemberId = new Map<string, AgendaItem[]>();
  const unassigned: AgendaItem[] = [];

  for (const item of items) {
    if (item.assignedFamilyMemberIds.length === 0) {
      unassigned.push(item);
      continue;
    }
    for (const id of item.assignedFamilyMemberIds) {
      byMemberId.set(id, [...(byMemberId.get(id) ?? []), item]);
    }
  }

  const groups: MemberGroup[] = members
    .filter((m) => byMemberId.has(m.id))
    .map((member) => ({ member, items: [...byMemberId.get(member.id)!].sort(byTime) }));

  if (unassigned.length > 0) groups.push({ member: null, items: unassigned.sort(byTime) });
  return groups;
}

export interface DayGroup {
  dayKey: string;
  date: Date;
  items: AgendaItem[];
}

/** Groups items into one bucket per day in `days`, in that order — days with no items still appear (empty). */
export function groupByDay(items: AgendaItem[], days: Date[]): DayGroup[] {
  const byDayKey = new Map<string, AgendaItem[]>();
  for (const item of items) {
    byDayKey.set(item.dayKey, [...(byDayKey.get(item.dayKey) ?? []), item]);
  }

  return days.map((date) => {
    const key = dayKeyOf(date);
    return { dayKey: key, date, items: (byDayKey.get(key) ?? []).sort(byTime) };
  });
}

/** A quarter of the day the Timeline widget buckets items into, instead of an hour-by-hour grid. */
export interface TimelineSegment {
  key: string;
  label: string;
  /** Translation key, for the named segments (dayparts, "All day"); the hourly slots use `label` (a locale-formatted hour). */
  labelKey?: string;
  items: AgendaItem[];
}

/** Chronological from midnight, covering the full day — end hours are exclusive. */
const DAY_SEGMENTS: { key: string; label: string; startHour: number; endHour: number }[] = [
  { key: 'night', label: 'Night', startHour: 0, endHour: 6 },
  { key: 'morning', label: 'Morning', startHour: 6, endHour: 12 },
  { key: 'afternoon', label: 'Afternoon', startHour: 12, endHour: 18 },
  { key: 'evening', label: 'Evening', startHour: 18, endHour: 24 },
];

function segmentKeyForHour(hour: number): string {
  return DAY_SEGMENTS.find((s) => hour >= s.startHour && hour < s.endHour)!.key;
}

/** Which DAY_SEGMENTS key `date`'s hour falls into — used to scroll/highlight the Timeline widget's current segment. */
export function currentSegmentKeyFor(date: Date): string {
  return segmentKeyForHour(date.getHours());
}

/**
 * Buckets items into the four dayparts, in chronological order, each always present (even empty)
 * so the widget shows the day's full shape. Items with no specific time (all-day events; a task
 * always has one, via its due date) get a leading "All day" bucket instead, shown only if non-empty.
 */
export function groupBySegment(items: AgendaItem[]): TimelineSegment[] {
  const anytime: AgendaItem[] = [];
  const byKey = new Map(DAY_SEGMENTS.map((s) => [s.key, [] as AgendaItem[]]));

  for (const item of items) {
    if (!item.time) {
      anytime.push(item);
      continue;
    }
    byKey.get(segmentKeyForHour(new Date(item.time).getHours()))!.push(item);
  }

  const segments: TimelineSegment[] = DAY_SEGMENTS.map((s) => ({ key: s.key, label: s.label, labelKey: `timeline.segments.${s.key}`, items: byKey.get(s.key)!.sort(byTime) }));
  if (anytime.length > 0) segments.unshift({ key: 'anytime', label: 'All day', labelKey: 'timeline.segments.anytime', items: anytime.sort(byTime) });
  return segments;
}

function hourLabel(hour: number): string {
  // <html lang> is kept in sync with the app language (see Language.init), so this follows the language picker.
  return new Date(2020, 0, 1, hour).toLocaleTimeString(document.documentElement.lang || [], { hour: 'numeric' });
}

/** Which hour-of-day slot key `date` falls into — used to scroll/highlight the Timeline widget's current hour. */
export function currentHourKeyFor(date: Date): string {
  return `hour-${date.getHours()}`;
}

/**
 * Same shape as groupBySegment, but one slot per hour (0-23) instead of one per daypart — the
 * Timeline widget's alternate "hour by hour" layout. Items with no specific time get the same
 * leading "All day" bucket.
 */
export function groupByHour(items: AgendaItem[]): TimelineSegment[] {
  const anytime: AgendaItem[] = [];
  const byHour = new Map<number, AgendaItem[]>(Array.from({ length: 24 }, (_, h) => [h, []]));

  for (const item of items) {
    if (!item.time) {
      anytime.push(item);
      continue;
    }
    byHour.get(new Date(item.time).getHours())!.push(item);
  }

  const slots: TimelineSegment[] = Array.from({ length: 24 }, (_, h) => ({
    key: `hour-${h}`,
    label: hourLabel(h),
    items: byHour.get(h)!.sort(byTime),
  }));
  if (anytime.length > 0) slots.unshift({ key: 'anytime', label: 'All day', labelKey: 'timeline.segments.anytime', items: anytime.sort(byTime) });
  return slots;
}

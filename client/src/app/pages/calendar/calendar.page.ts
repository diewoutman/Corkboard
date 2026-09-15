import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin, Observable, switchMap } from 'rxjs';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { CalendarApi } from '../../core/calendar';
import { Collections, NULL_HOUSEHOLD_FIELDS } from '../../core/collections';
import { extractErrorMessage } from '../../core/http-error';
import { FamilyMembers } from '../../core/family-members';
import { CollectionResponse, FamilyMemberResponse, OccurrenceResponse } from '../../core/models';
import { NULL_CONTACT_FIELDS, NULL_NOTE_FIELDS, Nodes } from '../../core/nodes';
import { parseQuickAdd } from '../../core/quick-add';

interface DayCell {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  occurrences: OccurrenceResponse[];
}

type Repeat = 'never' | 'daily' | 'weekly' | 'monthly';
type ViewMode = 'month' | 'week' | 'day';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: false,
})
export class CalendarPage implements OnInit {
  viewMode: ViewMode = 'month';
  viewDate = startOfDay(new Date());
  weeks: DayCell[][] = [];

  calendars: CollectionResponse[] = [];
  hiddenCalendarIds = new Set<string>();
  members: FamilyMemberResponse[] = [];
  occurrences: OccurrenceResponse[] = [];

  loading = true;
  errorMessage: string | null = null;

  selectedDayKey: string | null = null;
  quickAddText = '';

  showNewCalendarForm = false;
  newCalendarName = '';
  newCalendarColor = '#4c6ef5';
  newCalendarType: 'Calendar' | 'Schedule' = 'Calendar';

  showNewEventForm = false;
  newEvent = this.emptyNewEvent();

  importingCalendarId: string | null = null;
  feedUrlByCalendarId: Record<string, string> = {};

  constructor(
    private readonly calendarApi: CalendarApi,
    private readonly collectionsApi: Collections,
    private readonly membersApi: FamilyMembers,
    private readonly nodesApi: Nodes,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.membersApi.list().subscribe((members) => {
      this.members = members;
      this.cdr.markForCheck();
    });
    this.loadCalendars();
  }

  get monthStart(): Date {
    return startOfMonth(this.viewDate);
  }

  get weekDays(): Date[] {
    const start = startOfWeek(this.viewDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }

  get dayViewDays(): Date[] {
    return [this.viewDate];
  }

  get visibleOccurrences(): OccurrenceResponse[] {
    return this.occurrences.filter((o) => !this.hiddenCalendarIds.has(o.collectionId));
  }

  get visibleOccurrencesByDay(): Map<string, OccurrenceResponse[]> {
    const map = new Map<string, OccurrenceResponse[]>();
    for (const o of this.visibleOccurrences) {
      const list = map.get(o.originalDate) ?? [];
      list.push(o);
      map.set(o.originalDate, list);
    }
    return map;
  }

  get selectedDayOccurrences(): OccurrenceResponse[] {
    if (!this.selectedDayKey) return [];
    return (this.visibleOccurrencesByDay.get(this.selectedDayKey) ?? []).sort((a, b) => a.from.localeCompare(b.from));
  }

  calendarName(id: string): string {
    return this.calendars.find((c) => c.id === id)?.name ?? '?';
  }

  calendarColor(id: string): string {
    return this.calendars.find((c) => c.id === id)?.color ?? '#999';
  }

  memberName(id: string): string {
    return this.members.find((m) => m.id === id)?.displayName ?? '?';
  }

  memberColor(id: string): string {
    return this.members.find((m) => m.id === id)?.color ?? '#999';
  }

  /** Both Calendars and Schedules are shown as togglable layers in the same grid — see CONCEPT.md. */
  loadCalendars() {
    forkJoin({
      calendars: this.collectionsApi.list({ type: 'Calendar' }),
      schedules: this.collectionsApi.list({ type: 'Schedule' }),
    }).subscribe({
      next: ({ calendars, schedules }) => {
        this.calendars = [...calendars, ...schedules].sort((a, b) => a.name.localeCompare(b.name));
        const plainCalendars = calendars;
        if (!this.newEvent.calendarId && plainCalendars.length > 0) {
          this.newEvent.calendarId = plainCalendars[0].id;
        }
        this.loadOccurrences();
      },
      error: () => {
        this.errorMessage = 'Could not load your calendars.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Only plain Calendars, not Schedules — schedules are authored via their own weekly editor, not the "add event" form. */
  get eventableCalendars(): CollectionResponse[] {
    return this.calendars.filter((c) => c.type === 'Calendar');
  }

  /** Sidebar's "Calendars" section — same set as eventableCalendars, named for template clarity. */
  get plainCalendars(): CollectionResponse[] {
    return this.eventableCalendars;
  }

  /** Sidebar's "Schedules" section. */
  get schedules(): CollectionResponse[] {
    return this.calendars.filter((c) => c.type === 'Schedule');
  }

  /** The queried/displayed date range for the current viewMode — month always loads/shows a full 7-day-aligned grid. */
  private currentRange(): { rangeStart: Date; rangeEnd: Date } {
    if (this.viewMode === 'month') {
      return {
        rangeStart: startOfWeek(this.monthStart, { weekStartsOn: 1 }),
        rangeEnd: endOfWeek(endOfMonth(this.monthStart), { weekStartsOn: 1 }),
      };
    }
    if (this.viewMode === 'week') {
      return { rangeStart: startOfWeek(this.viewDate, { weekStartsOn: 1 }), rangeEnd: endOfWeek(this.viewDate, { weekStartsOn: 1 }) };
    }
    return { rangeStart: startOfDay(this.viewDate), rangeEnd: endOfDay(this.viewDate) };
  }

  loadOccurrences() {
    this.loading = true;
    this.errorMessage = null;

    const { rangeStart, rangeEnd } = this.currentRange();

    this.calendarApi.occurrences({ from: rangeStart.toISOString(), until: rangeEnd.toISOString() }).subscribe({
      next: (occurrences) => {
        this.occurrences = occurrences;
        if (this.viewMode === 'month') this.buildGrid(rangeStart, rangeEnd);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load your calendar. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private buildGrid(gridStart: Date, gridEnd: Date) {
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const byDay = this.visibleOccurrencesByDay;

    const cells: DayCell[] = days.map((date) => {
      const key = format(date, 'yyyy-MM-dd');
      return {
        date,
        key,
        inCurrentMonth: isSameMonth(date, this.monthStart),
        isToday: isToday(date),
        occurrences: (byDay.get(key) ?? []).sort((a, b) => a.from.localeCompare(b.from)),
      };
    });

    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      this.weeks.push(cells.slice(i, i + 7));
    }
  }

  setViewMode(mode: ViewMode) {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.selectedDayKey = null;
    this.loadOccurrences();
  }

  previousPeriod() {
    if (this.viewMode === 'month') this.viewDate = startOfMonth(subMonths(this.viewDate, 1));
    else if (this.viewMode === 'week') this.viewDate = subDays(this.viewDate, 7);
    else this.viewDate = subDays(this.viewDate, 1);
    this.selectedDayKey = null;
    this.loadOccurrences();
  }

  nextPeriod() {
    if (this.viewMode === 'month') this.viewDate = addMonths(this.viewDate, 1);
    else if (this.viewMode === 'week') this.viewDate = addDays(this.viewDate, 7);
    else this.viewDate = addDays(this.viewDate, 1);
    this.selectedDayKey = null;
    this.loadOccurrences();
  }

  goToToday() {
    this.viewDate = startOfDay(new Date());
    this.selectedDayKey = null;
    this.loadOccurrences();
  }

  get periodLabel(): string {
    if (this.viewMode === 'month') return format(this.viewDate, 'MMMM yyyy');
    if (this.viewMode === 'day') return format(this.viewDate, 'EEEE, MMMM d');
    const start = this.weekDays[0];
    const lastDay = this.weekDays[6];
    return isSameMonth(start, lastDay)
      ? `${format(start, 'MMM d')} – ${format(lastDay, 'd, yyyy')}`
      : `${format(start, 'MMM d')} – ${format(lastDay, 'MMM d, yyyy')}`;
  }

  selectDay(cell: DayCell) {
    this.selectedDayKey = this.selectedDayKey === cell.key ? null : cell.key;
  }

  /** For the Week/Day time grid, which emits the picked Date rather than a DayCell. */
  onGridSelectDay(date: Date) {
    const key = format(date, 'yyyy-MM-dd');
    this.selectedDayKey = this.selectedDayKey === key ? null : key;
  }

  toggleCalendarVisibility(id: string) {
    if (this.hiddenCalendarIds.has(id)) {
      this.hiddenCalendarIds.delete(id);
    } else {
      this.hiddenCalendarIds.add(id);
    }
    if (this.viewMode === 'month') {
      const { rangeStart, rangeEnd } = this.currentRange();
      this.buildGrid(rangeStart, rangeEnd);
    }
  }

  openNewCalendarForm(type: 'Calendar' | 'Schedule') {
    this.newCalendarType = type;
    this.showNewCalendarForm = true;
  }

  submitNewCalendar() {
    if (!this.newCalendarName) return;

    this.collectionsApi
      .create({
        name: this.newCalendarName,
        type: this.newCalendarType,
        color: this.newCalendarColor,
        parentCollectionId: null,
        ...NULL_HOUSEHOLD_FIELDS,
      })
      .subscribe({
        next: (created) => {
          this.calendars = [...this.calendars, created].sort((a, b) => a.name.localeCompare(b.name));
          if (created.type === 'Calendar' && !this.newEvent.calendarId) this.newEvent.calendarId = created.id;
          this.newCalendarName = '';
          this.newCalendarColor = '#4c6ef5';
          this.newCalendarType = 'Calendar';
          this.showNewCalendarForm = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that calendar.');
          this.cdr.markForCheck();
        },
      });
  }

  getFeedUrl(calendar: CollectionResponse) {
    this.collectionsApi.rotateFeedToken(calendar.id).subscribe({
      next: (updated) => {
        this.calendars = this.calendars.map((c) => (c.id === updated.id ? updated : c));
        if (updated.feedUrl) this.feedUrlByCalendarId[calendar.id] = updated.feedUrl;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not get a subscribe link for that calendar.';
        this.cdr.markForCheck();
      },
    });
  }

  startImport(calendarId: string) {
    this.importingCalendarId = calendarId;
  }

  onImportFileSelected(event: Event, calendarId: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.importingCalendarId = null;
    if (!file) return;

    this.calendarApi.importIcs(calendarId, file).subscribe({
      next: () => this.loadOccurrences(),
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, 'Could not import that file.');
        this.cdr.markForCheck();
      },
    });
  }

  toggleAssignee(memberId: string) {
    const ids = this.newEvent.assignedFamilyMemberIds;
    this.newEvent.assignedFamilyMemberIds = ids.includes(memberId)
      ? ids.filter((id) => id !== memberId)
      : [...ids, memberId];
  }

  openNewEventForm(dayKey?: string) {
    this.newEvent = this.emptyNewEvent();
    if (this.eventableCalendars.length > 0) this.newEvent.calendarId = this.eventableCalendars[0].id;
    if (dayKey) {
      this.newEvent.start = `${dayKey}T09:00`;
    }
    this.showNewEventForm = true;
  }

  /** Click-drag on the Week/Day time grid to create an event — pre-fills the same form the "+ Add event" button opens. */
  onGridCreateRange({ start, end }: { date: Date; start: Date; end: Date }) {
    this.newEvent = this.emptyNewEvent();
    if (this.eventableCalendars.length > 0) this.newEvent.calendarId = this.eventableCalendars[0].id;
    this.newEvent.start = toDatetimeLocalValue(start);
    this.newEvent.end = toDatetimeLocalValue(end);
    this.showNewEventForm = true;
  }

  /** Drag an existing block on the Week/Day time grid to reschedule it — one occurrence (via an exception) if recurring, the Appointment itself otherwise. */
  onGridReschedule({ occurrence, newStart, newEnd }: { occurrence: OccurrenceResponse; newStart: Date; newEnd: Date | null }) {
    const request$: Observable<unknown> = occurrence.isRecurring
      ? this.calendarApi.setOccurrenceException(occurrence.appointmentId, occurrence.originalDate, {
          isSkipped: false,
          overrideTitle: null,
          overrideLocation: null,
          overrideFrom: newStart.toISOString(),
          overrideUntil: newEnd ? newEnd.toISOString() : null,
        })
      : this.nodesApi.get(occurrence.appointmentId).pipe(
          switchMap((node) =>
            this.nodesApi.update(node.id, {
              title: node.title,
              description: node.description,
              from: newStart.toISOString(),
              until: newEnd ? newEnd.toISOString() : null,
              assignedFamilyMemberIds: node.assignedFamilyMemberIds,
              collectionId: node.collectionId,
              isImportant: null,
              isCompleted: null,
              priority: null,
              category: null,
              location: node.location,
              allDay: node.allDay,
              recurrenceRule: node.recurrenceRule,
              ...NULL_CONTACT_FIELDS,
            }),
          ),
        );

    request$.subscribe({
      next: () => this.loadOccurrences(),
      error: () => {
        this.errorMessage = 'Could not reschedule that event.';
        this.cdr.markForCheck();
      },
    });
  }

  /** Todoist/Google-Calendar-style fast capture: "Dentist tomorrow 3pm" — parsed client-side, same create call as the full form. */
  submitQuickAdd() {
    const parsed = parseQuickAdd(this.quickAddText);
    const calendarId = this.eventableCalendars[0]?.id;
    if (!parsed.title || !calendarId) return;

    if (!parsed.start) {
      this.errorMessage = `Couldn't find a date/time in "${this.quickAddText}" — try e.g. "tomorrow 5pm".`;
      this.cdr.markForCheck();
      return;
    }

    this.nodesApi
      .create({
        type: 'Appointment',
        title: parsed.title,
        description: null,
        from: parsed.start.toISOString(),
        until: parsed.end ? parsed.end.toISOString() : null,
        assignedFamilyMemberIds: [],
        collectionId: calendarId,
        priority: null,
        category: null,
        location: null,
        allDay: !parsed.hasTime,
        recurrenceRule: null,
        ...NULL_CONTACT_FIELDS,
        ...NULL_NOTE_FIELDS,
      })
      .subscribe({
        next: () => {
          this.quickAddText = '';
          this.loadOccurrences();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that event.');
          this.cdr.markForCheck();
        },
      });
  }

  submitNewEvent() {
    if (!this.newEvent.title || !this.newEvent.start || !this.newEvent.calendarId) return;

    this.nodesApi
      .create({
        type: 'Appointment',
        title: this.newEvent.title,
        description: this.newEvent.description || null,
        from: new Date(this.newEvent.start).toISOString(),
        until: this.newEvent.end ? new Date(this.newEvent.end).toISOString() : null,
        assignedFamilyMemberIds: this.newEvent.assignedFamilyMemberIds,
        collectionId: this.newEvent.calendarId,
        priority: null,
        category: null,
        location: this.newEvent.location || null,
        allDay: this.newEvent.allDay,
        recurrenceRule: this.toRecurrenceRule(this.newEvent.repeat),
        ...NULL_CONTACT_FIELDS,
        ...NULL_NOTE_FIELDS,
      })
      .subscribe({
        next: () => {
          this.showNewEventForm = false;
          this.loadOccurrences();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that event.');
          this.cdr.markForCheck();
        },
      });
  }

  private toRecurrenceRule(repeat: Repeat): string | null {
    switch (repeat) {
      case 'daily':
        return 'FREQ=DAILY';
      case 'weekly':
        return 'FREQ=WEEKLY';
      case 'monthly':
        return 'FREQ=MONTHLY';
      default:
        return null;
    }
  }

  /**
   * A recurring occurrence is skipped (just this one instance); a one-off
   * Appointment is deleted outright. Deleting a whole recurring series isn't
   * wired up in this view yet — only skipping individual occurrences.
   */
  deleteOccurrence(occurrence: OccurrenceResponse) {
    const request$ = occurrence.isRecurring
      ? this.calendarApi.skipOccurrence(occurrence.appointmentId, occurrence.originalDate)
      : this.nodesApi.delete(occurrence.appointmentId);

    request$.subscribe({
      next: () => this.loadOccurrences(),
      error: () => {
        this.errorMessage = 'Could not remove that event.';
        this.cdr.markForCheck();
      },
    });
  }

  private emptyNewEvent() {
    return {
      calendarId: '',
      title: '',
      description: '',
      location: '',
      start: '',
      end: '',
      allDay: false,
      repeat: 'never' as Repeat,
      assignedFamilyMemberIds: [] as string[],
    };
  }
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

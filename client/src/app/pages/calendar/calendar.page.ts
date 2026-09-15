import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { CalendarApi } from '../../core/calendar';
import { Collections, NULL_HOUSEHOLD_FIELDS } from '../../core/collections';
import { extractErrorMessage } from '../../core/http-error';
import { FamilyMembers } from '../../core/family-members';
import { CollectionResponse, FamilyMemberResponse, OccurrenceResponse } from '../../core/models';
import { NULL_CONTACT_FIELDS, NULL_NOTE_FIELDS, Nodes } from '../../core/nodes';

interface DayCell {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  occurrences: OccurrenceResponse[];
}

type Repeat = 'never' | 'daily' | 'weekly' | 'monthly';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: false,
})
export class CalendarPage implements OnInit {
  monthStart = startOfMonth(new Date());
  weeks: DayCell[][] = [];

  calendars: CollectionResponse[] = [];
  hiddenCalendarIds = new Set<string>();
  members: FamilyMemberResponse[] = [];
  occurrences: OccurrenceResponse[] = [];

  loading = true;
  errorMessage: string | null = null;
  showCalendarsPanel = false;

  selectedDayKey: string | null = null;

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

  get visibleOccurrencesByDay(): Map<string, OccurrenceResponse[]> {
    const map = new Map<string, OccurrenceResponse[]>();
    for (const o of this.occurrences) {
      if (this.hiddenCalendarIds.has(o.collectionId)) continue;
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

  loadOccurrences() {
    this.loading = true;
    this.errorMessage = null;

    const gridStart = startOfWeek(this.monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(this.monthStart), { weekStartsOn: 1 });

    this.calendarApi.occurrences({ from: gridStart.toISOString(), until: gridEnd.toISOString() }).subscribe({
      next: (occurrences) => {
        this.occurrences = occurrences;
        this.buildGrid(gridStart, gridEnd);
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

  previousMonth() {
    this.monthStart = subMonths(this.monthStart, 1);
    this.selectedDayKey = null;
    this.loadOccurrences();
  }

  nextMonth() {
    this.monthStart = addMonths(this.monthStart, 1);
    this.selectedDayKey = null;
    this.loadOccurrences();
  }

  goToToday() {
    this.monthStart = startOfMonth(new Date());
    this.selectedDayKey = null;
    this.loadOccurrences();
  }

  get monthLabel(): string {
    return format(this.monthStart, 'MMMM yyyy');
  }

  selectDay(cell: DayCell) {
    this.selectedDayKey = this.selectedDayKey === cell.key ? null : cell.key;
  }

  toggleCalendarVisibility(id: string) {
    if (this.hiddenCalendarIds.has(id)) {
      this.hiddenCalendarIds.delete(id);
    } else {
      this.hiddenCalendarIds.add(id);
    }
    this.buildGrid(startOfWeek(this.monthStart, { weekStartsOn: 1 }), endOfWeek(endOfMonth(this.monthStart), { weekStartsOn: 1 }));
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

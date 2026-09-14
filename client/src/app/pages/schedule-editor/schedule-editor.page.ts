import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { addDays, format, getDay, startOfWeek } from 'date-fns';
import { Collections } from '../../core/collections';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, FamilyMemberResponse, NodeResponse } from '../../core/models';
import { NULL_CONTACT_FIELDS, Nodes } from '../../core/nodes';

const WEEKDAYS: { label: string; byDay: string }[] = [
  { label: 'Monday', byDay: 'MO' },
  { label: 'Tuesday', byDay: 'TU' },
  { label: 'Wednesday', byDay: 'WE' },
  { label: 'Thursday', byDay: 'TH' },
  { label: 'Friday', byDay: 'FR' },
  { label: 'Saturday', byDay: 'SA' },
  { label: 'Sunday', byDay: 'SU' },
];

/** date-fns getDay() is 0=Sun..6=Sat; WEEKDAYS above is Mon-first, so remap. */
function weekdayIndexOf(date: Date): number {
  const dow = getDay(date);
  return dow === 0 ? 6 : dow - 1;
}

@Component({
  selector: 'app-schedule-editor',
  templateUrl: './schedule-editor.page.html',
  styleUrls: ['./schedule-editor.page.scss'],
  standalone: false,
})
export class ScheduleEditorPage implements OnInit {
  readonly weekdays = WEEKDAYS;

  scheduleId!: string;
  schedule: CollectionResponse | null = null;
  members: FamilyMemberResponse[] = [];
  entries: NodeResponse[] = [];

  loading = true;
  errorMessage: string | null = null;

  showNewEntryForm = false;
  newEntry = this.emptyNewEntry();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.scheduleId = this.route.snapshot.paramMap.get('id')!;
    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    forkJoin({
      schedule: this.collectionsApi.get(this.scheduleId),
      members: this.membersApi.list(),
      entries: this.nodesApi.list({ type: 'Appointment', collectionId: this.scheduleId }),
    }).subscribe({
      next: ({ schedule, members, entries }) => {
        this.schedule = schedule;
        this.members = members;
        this.entries = entries;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load this schedule. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  entriesForDay(dayIndex: number): NodeResponse[] {
    return this.entries
      .filter((e) => e.from && weekdayIndexOf(new Date(e.from)) === dayIndex)
      .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''));
  }

  isBiweekly(entry: NodeResponse): boolean {
    return !!entry.recurrenceRule?.includes('INTERVAL=2');
  }

  endsOn(entry: NodeResponse): string | null {
    const match = entry.recurrenceRule?.match(/UNTIL=(\d{8})/);
    if (!match) return null;
    const raw = match[1];
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  memberName(id: string): string {
    return this.members.find((m) => m.id === id)?.displayName ?? '?';
  }

  toggleAssignee(memberId: string) {
    const ids = this.newEntry.assignedFamilyMemberIds;
    this.newEntry.assignedFamilyMemberIds = ids.includes(memberId)
      ? ids.filter((id) => id !== memberId)
      : [...ids, memberId];
  }

  submitNewEntry() {
    if (!this.newEntry.title || !this.newEntry.startTime) return;

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const anchorDate = addDays(weekStart, this.newEntry.dayIndex);
    const anchorKey = format(anchorDate, 'yyyy-MM-dd');

    const from = `${anchorKey}T${this.newEntry.startTime}`;
    const until = this.newEntry.endTime ? `${anchorKey}T${this.newEntry.endTime}` : null;

    this.nodesApi
      .create({
        type: 'Appointment',
        title: this.newEntry.title,
        description: null,
        from: new Date(from).toISOString(),
        until: until ? new Date(until).toISOString() : null,
        assignedFamilyMemberIds: this.newEntry.assignedFamilyMemberIds,
        collectionId: this.scheduleId,
        priority: null,
        location: this.newEntry.location || null,
        allDay: false,
        recurrenceRule: this.toRecurrenceRule(),
        ...NULL_CONTACT_FIELDS,
      })
      .subscribe({
        next: (created) => {
          this.entries = [...this.entries, created];
          this.newEntry = this.emptyNewEntry();
          this.showNewEntryForm = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not add that entry.');
          this.cdr.markForCheck();
        },
      });
  }

  deleteEntry(entry: NodeResponse) {
    this.nodesApi.delete(entry.id).subscribe({
      next: () => {
        this.entries = this.entries.filter((e) => e.id !== entry.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not remove that entry.';
        this.cdr.markForCheck();
      },
    });
  }

  private toRecurrenceRule(): string {
    const byDay = WEEKDAYS[this.newEntry.dayIndex].byDay;
    let rule = `FREQ=WEEKLY;BYDAY=${byDay}`;
    if (this.newEntry.everyOtherWeek) rule += ';INTERVAL=2';
    if (this.newEntry.endsOn) rule += `;UNTIL=${this.toIcsUntil(this.newEntry.endsOn)}`;
    return rule;
  }

  /** RFC 5545: UNTIL must match DTSTART's form — our appointments carry a time, so UNTIL needs a UTC date-time too. */
  private toIcsUntil(dateStr: string): string {
    const endOfDay = new Date(`${dateStr}T23:59:59`);
    return endOfDay.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private emptyNewEntry() {
    return {
      dayIndex: 0,
      title: '',
      location: '',
      startTime: '',
      endTime: '',
      everyOtherWeek: false,
      endsOn: '',
      assignedFamilyMemberIds: [] as string[],
    };
  }
}

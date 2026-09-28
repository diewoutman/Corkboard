import { CreateFab } from '../../core/create-fab';
import { SubmitGuard } from '../../core/submit-guard';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { addDays, format, getDay, startOfWeek } from 'date-fns';
import { Collections } from '../../core/collections';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, FamilyMemberResponse, NodeResponse } from '../../core/models';
import { NULL_CONTACT_FIELDS, NULL_MEAL_FIELDS, NULL_NOTE_FIELDS, NULL_RECIPE_FIELDS, NULL_SHOPPING_FIELDS, Nodes } from '../../core/nodes';
import { endsOn, isBiweekly } from '../../core/recurrence';

/** `labelKey` is a translation key. */
const WEEKDAYS: { labelKey: string; byDay: string }[] = [
  { labelKey: 'weekdays.mo', byDay: 'MO' },
  { labelKey: 'weekdays.tu', byDay: 'TU' },
  { labelKey: 'weekdays.we', byDay: 'WE' },
  { labelKey: 'weekdays.th', byDay: 'TH' },
  { labelKey: 'weekdays.fr', byDay: 'FR' },
  { labelKey: 'weekdays.sa', byDay: 'SA' },
  { labelKey: 'weekdays.su', byDay: 'SU' },
];

/** date-fns getDay() is 0=Sun..6=Sat; WEEKDAYS above is Mon-first, so remap. */
function weekdayIndexOf(date: Date): number {
  const dow = getDay(date);
  return dow === 0 ? 6 : dow - 1;
}

/** A Node's `from`/`until` as a `<input type="time">` value, in local time. */
function toTimeInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

@Component({
  selector: 'app-schedule-editor',
  templateUrl: './schedule-editor.page.html',
  styleUrls: ['./schedule-editor.page.scss'],
  standalone: false,
})
export class ScheduleEditorPage implements OnInit, OnDestroy {
  private readonly createFab = inject(CreateFab);
  private unregisterFab?: () => void;
  /** Ignores a repeated click on delete while that item's request is still in flight. */
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  /** Blocks a second submit (double click, Enter twice) while a create/save request is in flight. */
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));
  readonly weekdays = WEEKDAYS;

  scheduleId!: string;
  schedule: CollectionResponse | null = null;
  members: FamilyMemberResponse[] = [];
  entries: NodeResponse[] = [];

  loading = true;
  errorMessage: string | null = null;

  showNewEntryForm = false;
  editingEntry: NodeResponse | null = null;
  newEntry = this.emptyNewEntry();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  /** Makes the app's "+" button open this page's editor. */
  private registerFab() {
    this.unregisterFab?.();
    this.unregisterFab = this.createFab.register({
      kind: null,
      open: () => {
        this.openAddEntryForm();
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy() {
    this.unregisterFab?.();
  }

  ngOnInit() {
    this.registerFab();
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
        this.errorMessage = this.transloco.translate('schedule.errors.load');
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

  toggleAssignee(memberId: string) {
    const ids = this.newEntry.assignedFamilyMemberIds;
    this.newEntry.assignedFamilyMemberIds = ids.includes(memberId)
      ? ids.filter((id) => id !== memberId)
      : [...ids, memberId];
  }

  openAddEntryForm() {
    this.editingEntry = null;
    this.newEntry = this.emptyNewEntry();
    this.showNewEntryForm = true;
  }

  openEditEntryForm(entry: NodeResponse) {
    this.editingEntry = entry;
    this.newEntry = {
      dayIndex: entry.from ? weekdayIndexOf(new Date(entry.from)) : 0,
      title: entry.title,
      location: entry.location ?? '',
      startTime: entry.from ? toTimeInputValue(entry.from) : '',
      endTime: entry.until ? toTimeInputValue(entry.until) : '',
      everyOtherWeek: isBiweekly(entry),
      endsOn: endsOn(entry) ?? '',
      assignedFamilyMemberIds: [...entry.assignedFamilyMemberIds],
    };
    this.showNewEntryForm = true;
  }

  closeEntryForm() {
    this.showNewEntryForm = false;
    this.editingEntry = null;
  }

  submitEntryForm() {
    if (!this.newEntry.title || !this.newEntry.startTime) return;

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const anchorDate = addDays(weekStart, this.newEntry.dayIndex);
    const anchorKey = format(anchorDate, 'yyyy-MM-dd');

    const from = `${anchorKey}T${this.newEntry.startTime}`;
    const until = this.newEntry.endTime ? `${anchorKey}T${this.newEntry.endTime}` : null;

    const payload = {
      title: this.newEntry.title,
      description: null,
      from: new Date(from).toISOString(),
      until: until ? new Date(until).toISOString() : null,
      assignedFamilyMemberIds: this.newEntry.assignedFamilyMemberIds,
      location: this.newEntry.location || null,
      recurrenceRule: this.toRecurrenceRule(),
    };

    const request$ = this.editingEntry
      ? this.nodesApi.update(this.editingEntry.id, {
          ...payload,
          collectionId: this.scheduleId,
          isImportant: null,
          isCompleted: null,
          priority: null,
          sectionId: null,
          allDay: false,
          ...NULL_CONTACT_FIELDS,
          ...NULL_RECIPE_FIELDS,
          ...NULL_MEAL_FIELDS,
          ...NULL_SHOPPING_FIELDS,
        })
      : this.nodesApi.create({
          type: 'Appointment',
          ...payload,
          collectionId: this.scheduleId,
          priority: null,
          sectionId: null,
          allDay: false,
          ...NULL_CONTACT_FIELDS,
          ...NULL_RECIPE_FIELDS,
          ...NULL_MEAL_FIELDS,
          ...NULL_SHOPPING_FIELDS,
          ...NULL_NOTE_FIELDS,
        });

    const wasEditing = !!this.editingEntry;
    this.submit.run(request$).subscribe({
      next: (saved) => {
        this.entries = wasEditing ? this.entries.map((e) => (e.id === saved.id ? saved : e)) : [...this.entries, saved];
        this.closeEntryForm();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(wasEditing ? 'schedule.errors.save' : 'schedule.errors.add'));
        this.cdr.markForCheck();
      },
    });
  }

  deleteEntry(entry: NodeResponse) {
    this.removing.run(this.nodesApi.delete(entry.id), entry.id).subscribe({
      next: () => {
        this.entries = this.entries.filter((e) => e.id !== entry.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('schedule.errors.remove');
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

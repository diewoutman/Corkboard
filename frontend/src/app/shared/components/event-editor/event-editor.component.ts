import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Collections } from '../../../core/collections';
import { FamilyMembers } from '../../../core/family-members';
import { extractErrorMessage } from '../../../core/http-error';
import { CollectionResponse, FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { NULL_CONTACT_FIELDS, NULL_NOTE_FIELDS, Nodes } from '../../../core/nodes';
import { SubmitGuard } from '../../../core/submit-guard';
import { AssigneeChipGroupComponent } from '../assignee-chip-group/assignee-chip-group.component';
import { ErrorBannerComponent } from '../error-banner/error-banner.component';

type Repeat = 'never' | 'daily' | 'weekly' | 'monthly';

/**
 * The full event form (create or edit), without a surrounding modal — hosted by the Calendar page and by the app's
 * "+" sheet. Loads the calendars and family members itself. The start and end presets are `datetime-local` values
 * (or a date for an all-day event).
 */
@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, AssigneeChipGroupComponent, ErrorBannerComponent],
  template: `
    <form (ngSubmit)="save()" #form="ngForm" class="space-y-3">
      <h2 *ngIf="showTitle" class="font-heading text-lg font-bold text-ink">{{ (event ? 'calendar.edit_event' : 'calendar.add_event') | transloco }}</h2>
      <app-error-banner [message]="errorMessage" />
      <div>
        <label for="eventTitle" class="block text-sm font-bold text-ink">{{ 'calendar.event' | transloco }}</label>
        <input
          id="eventTitle"
          name="eventTitle"
          [(ngModel)]="model.title"
          required
          class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
      </div>
      <div *ngIf="calendars.length > 1">
        <label for="calendarId" class="block text-sm font-bold text-ink">{{ 'nav.calendar' | transloco }}</label>
        <select
          id="calendarId"
          name="calendarId"
          [(ngModel)]="model.calendarId"
          required
          class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        >
          <option *ngFor="let calendar of calendars" [ngValue]="calendar.id">{{ calendar.name }}</option>
        </select>
      </div>
      <label class="flex items-center gap-2 text-sm font-semibold text-ink-muted">
        <input type="checkbox" name="allDay" [(ngModel)]="model.allDay" class="rounded-md accent-coral" />
        {{ 'timeline.segments.anytime' | transloco }}
      </label>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="eventStart" class="block text-sm font-bold text-ink">{{ 'calendar.start' | transloco }}</label>
          <input
            id="eventStart"
            [type]="model.allDay ? 'date' : 'datetime-local'"
            name="eventStart"
            [(ngModel)]="model.start"
            required
            class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>
        <div>
          <label for="eventEnd" class="block text-sm font-bold text-ink">{{ 'calendar.end' | transloco }}</label>
          <input
            id="eventEnd"
            [type]="model.allDay ? 'date' : 'datetime-local'"
            name="eventEnd"
            [(ngModel)]="model.end"
            class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>
      </div>
      <app-assignee-chip-group [members]="members" [selectedIds]="model.assignedFamilyMemberIds" (toggled)="toggleAssignee($event)" />
      <button type="button" (click)="showAdvanced = !showAdvanced" [attr.aria-expanded]="showAdvanced" class="text-sm font-extrabold text-coral hover:text-coral-strong">
        {{ (showAdvanced ? 'task_list.fewer_options' : 'task_list.more_options') | transloco }}
      </button>
      <div *ngIf="showAdvanced" class="space-y-3">
        <div>
          <label for="eventRepeat" class="block text-sm font-bold text-ink">{{ 'task_list.repeat' | transloco }}</label>
          <select
            id="eventRepeat"
            name="repeat"
            [(ngModel)]="model.repeat"
            class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          >
            <option value="never">{{ 'task_list.repeats.never' | transloco }}</option>
            <option value="daily">{{ 'task_list.repeats.daily' | transloco }}</option>
            <option value="weekly">{{ 'task_list.repeats.weekly' | transloco }}</option>
            <option value="monthly">{{ 'task_list.repeats.monthly' | transloco }}</option>
          </select>
        </div>
        <div>
          <label for="eventLocation" class="block text-sm font-bold text-ink">{{ 'schedule.location' | transloco }}</label>
          <input
            id="eventLocation"
            name="eventLocation"
            [(ngModel)]="model.location"
            class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>
        <div>
          <label for="eventDescription" class="block text-sm font-bold text-ink">{{ 'task_list.notes' | transloco }}</label>
          <textarea
            id="eventDescription"
            name="eventDescription"
            [(ngModel)]="model.description"
            rows="2"
            class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          ></textarea>
        </div>
      </div>

      <div class="flex gap-2 pt-1">
        <button type="submit" [disabled]="form.invalid || !model.calendarId || submit.busy" class="flex-1 rounded-full bg-coral px-4 py-2 text-sm font-extrabold text-white shadow-button hover:bg-coral-strong disabled:cursor-not-allowed disabled:opacity-50">
          {{ (event ? 'common.save_changes' : 'calendar.add_event') | transloco }}
        </button>
        <button type="button" (click)="cancelled.emit()" class="rounded-full px-4 py-2 text-sm font-bold text-ink-muted hover:bg-cork">
          {{ 'common.cancel' | transloco }}
        </button>
      </div>
    </form>
  `,
})
export class EventEditorComponent implements OnInit {
  /** The event (Appointment node) being edited; null to create one. */
  @Input() event: NodeResponse | null = null;
  @Input() showTitle = true;
  /** Presets for a new event, e.g. from a click-drag on the time grid or a tapped day. */
  @Input() presetStart = '';
  @Input() presetEnd = '';
  @Output() saved = new EventEmitter<NodeResponse>();
  @Output() cancelled = new EventEmitter<void>();

  calendars: CollectionResponse[] = [];
  members: FamilyMemberResponse[] = [];
  errorMessage: string | null = null;
  showAdvanced = false;
  model = {
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
  /** Blocks a second submit (double click, Enter twice) while the request is in flight. */
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));

  private readonly nodesApi = inject(Nodes);
  private readonly collectionsApi = inject(Collections);
  private readonly membersApi = inject(FamilyMembers);
  private readonly transloco = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    const event = this.event;
    if (event) {
      this.model = {
        calendarId: event.collectionId ?? '',
        title: event.title,
        description: event.description ?? '',
        location: event.location ?? '',
        start: event.from ? (event.allDay ? event.from.slice(0, 10) : toDatetimeLocalValue(new Date(event.from))) : '',
        end: event.until ? (event.allDay ? event.until.slice(0, 10) : toDatetimeLocalValue(new Date(event.until))) : '',
        allDay: !!event.allDay,
        repeat: repeatFromRule(event.recurrenceRule),
        assignedFamilyMemberIds: [...event.assignedFamilyMemberIds],
      };
      this.showAdvanced = event.recurrenceRule != null || !!event.location || !!event.description;
    } else {
      this.model.start = this.presetStart;
      this.model.end = this.presetEnd;
    }

    this.membersApi.list().subscribe((members) => {
      this.members = members;
      this.cdr.markForCheck();
    });
    // Only plain Calendars, not Schedules — schedules are authored via their own weekly editor.
    this.collectionsApi.list({ type: 'Calendar' }).subscribe((calendars) => {
      this.calendars = calendars;
      if (!this.model.calendarId && calendars.length > 0) this.model.calendarId = calendars[0].id;
      this.cdr.markForCheck();
    });
  }

  toggleAssignee(memberId: string) {
    const ids = this.model.assignedFamilyMemberIds;
    this.model.assignedFamilyMemberIds = ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId];
  }

  save() {
    if (!this.model.title || !this.model.start || !this.model.calendarId) return;

    const editing = this.event;
    const from = new Date(this.model.start).toISOString();
    const until = this.model.end ? new Date(this.model.end).toISOString() : null;
    const recurrenceRule = toRecurrenceRule(this.model.repeat);

    const request$ = editing
      ? this.nodesApi.update(editing.id, {
          title: this.model.title,
          description: this.model.description || null,
          from,
          until,
          assignedFamilyMemberIds: this.model.assignedFamilyMemberIds,
          collectionId: this.model.calendarId,
          isImportant: null,
          isCompleted: null,
          priority: null,
          sectionId: null,
          location: this.model.location || null,
          allDay: this.model.allDay,
          recurrenceRule,
          ...NULL_CONTACT_FIELDS,
        })
      : this.nodesApi.create({
          type: 'Appointment',
          title: this.model.title,
          description: this.model.description || null,
          from,
          until,
          assignedFamilyMemberIds: this.model.assignedFamilyMemberIds,
          collectionId: this.model.calendarId,
          priority: null,
          sectionId: null,
          location: this.model.location || null,
          allDay: this.model.allDay,
          recurrenceRule,
          ...NULL_CONTACT_FIELDS,
          ...NULL_NOTE_FIELDS,
        });

    this.submit.run(request$).subscribe({
      next: (saved) => this.saved.emit(saved),
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(editing ? 'calendar.errors.save_event' : 'calendar.errors.create_event'));
        this.cdr.markForCheck();
      },
    });
  }
}

function toRecurrenceRule(repeat: Repeat): string | null {
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

function repeatFromRule(rule: string | null): Repeat {
  if (rule?.includes('FREQ=DAILY')) return 'daily';
  if (rule?.includes('FREQ=WEEKLY')) return 'weekly';
  if (rule?.includes('FREQ=MONTHLY')) return 'monthly';
  return 'never';
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

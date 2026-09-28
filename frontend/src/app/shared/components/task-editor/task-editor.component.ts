import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { Collections } from '../../../core/collections';
import { FamilyMembers } from '../../../core/family-members';
import { extractErrorMessage } from '../../../core/http-error';
import { CollectionResponse, CollectionScope, FamilyMemberResponse, NodeResponse, SectionResponse } from '../../../core/models';
import { NULL_CONTACT_FIELDS, NULL_MEAL_FIELDS, NULL_NOTE_FIELDS, NULL_RECIPE_FIELDS, NULL_SHOPPING_FIELDS, Nodes, toUpdateRequest } from '../../../core/nodes';
import { RepeatSpec, WEEKDAY_CODES, WeekdayCode, buildRule, emptyRepeat, joinDue, parseRule, splitDue } from '../../../core/recurrence';
import { SubmitGuard } from '../../../core/submit-guard';
import { AssigneeChipGroupComponent } from '../assignee-chip-group/assignee-chip-group.component';
import { ErrorBannerComponent } from '../error-banner/error-banner.component';

export interface TaskSaved {
  task: NodeResponse;
  editing: boolean;
  /** A section name was typed, so the list's sections may have changed. */
  sectionTyped: boolean;
}

/**
 * The full task form (create or edit), without a surrounding modal — hosted by the task list page and by the app's
 * "+" sheet. Starts with title, due date and assignees; the rest sits behind "More options". Loads the lists, family
 * members and the chosen list's sections itself.
 */
@Component({
  selector: 'app-task-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, AssigneeChipGroupComponent, ErrorBannerComponent],
  template: `
    <form (ngSubmit)="save()" #form="ngForm" class="space-y-3">
      <h2 *ngIf="showTitle" class="font-heading text-lg font-bold text-ink">{{ (task ? 'task_list.edit' : 'task_list.add') | transloco }}</h2>
      <app-error-banner [message]="errorMessage" />
      <div>
        <label for="title" class="block text-sm font-bold text-ink">{{ 'task_list.task' | transloco }}</label>
        <input
          id="title"
          name="title"
          [(ngModel)]="model.title"
          required
          class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
      </div>
        <div>
          <label for="dueDate" class="block text-sm font-bold text-ink">{{ 'task_list.due_date' | transloco }}</label>
          <input id="dueDate" type="date" name="dueDate" [(ngModel)]="model.dueDate" class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral" />
        </div>
      <div *ngIf="model.dueDate">
        <label for="dueTime" class="block text-sm font-bold text-ink">{{ 'task_list.due_time' | transloco }} <span class="font-semibold text-ink-muted">{{ 'task_list.due_time_hint' | transloco }}</span></label>
        <input id="dueTime" type="time" name="dueTime" [(ngModel)]="model.dueTime" class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral" />
      </div>
      <app-assignee-chip-group [members]="members" [selectedIds]="model.assignedFamilyMemberIds" (toggled)="toggleAssignee($event)" />
      <button type="button" (click)="showAdvanced = !showAdvanced" [attr.aria-expanded]="showAdvanced" class="text-sm font-extrabold text-coral hover:text-coral-strong">
        {{ (showAdvanced ? 'task_list.fewer_options' : 'task_list.more_options') | transloco }}
      </button>
      <div *ngIf="showAdvanced" class="space-y-3">
      <div>
        <label for="description" class="block text-sm font-bold text-ink">{{ 'task_list.notes' | transloco }}</label>
        <textarea
          id="description"
          name="description"
          [(ngModel)]="model.description"
          rows="2"
          class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        ></textarea>
      </div>
        <div>
          <label for="priority" class="block text-sm font-bold text-ink">{{ 'task_list.priority' | transloco }}</label>
          <select
            id="priority"
            name="priority"
            [(ngModel)]="model.priority"
            class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          >
            <option [ngValue]="null">{{ 'task_list.priorities.none' | transloco }}</option>
            <option [ngValue]="1">{{ 'task_list.priorities.low' | transloco }}</option>
            <option [ngValue]="2">{{ 'task_list.priorities.medium' | transloco }}</option>
            <option [ngValue]="3">{{ 'task_list.priorities.high' | transloco }}</option>
          </select>
        </div>
      <div>
        <label for="collectionId" class="block text-sm font-bold text-ink">{{ 'task_list.list' | transloco }}</label>
        <select id="collectionId" name="collectionId" [(ngModel)]="model.collectionId" (ngModelChange)="onFormListChange()" required class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral">
          <ng-container *ngFor="let scope of scopes">
            <optgroup *ngIf="listsInScope(scope).length > 0" [label]="'tasks.scopes.' + scope | transloco">
              <option *ngFor="let l of listsInScope(scope)" [ngValue]="l.id">{{ listLabel(l) }}</option>
            </optgroup>
          </ng-container>
        </select>
      </div>
      <div>
        <label for="section" class="block text-sm font-bold text-ink">{{ 'task_list.section' | transloco }} <span class="font-semibold text-ink-muted">{{ 'task_list.section_hint' | transloco }}</span></label>
        <input
          id="section"
          name="section"
          list="knownSections"
          [placeholder]="'task_list.section_placeholder' | transloco"
          [(ngModel)]="model.section"
          class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
        <datalist id="knownSections">
          <option *ngFor="let section of formSections" [value]="section.name"></option>
        </datalist>
      </div>
      <div>
        <label for="repeat" class="block text-sm font-bold text-ink">{{ 'task_list.repeat' | transloco }} <span class="font-semibold text-ink-muted">{{ 'task_list.repeat_hint' | transloco }}</span></label>
        <select id="repeat" name="repeat" [(ngModel)]="model.repeat.preset" class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral">
          <option value="never">{{ 'task_list.repeats.never' | transloco }}</option>
          <option value="daily">{{ 'task_list.repeats.daily' | transloco }}</option>
          <option value="weekdays">{{ 'task_list.repeats.weekdays' | transloco }}</option>
          <option value="weekly">{{ 'task_list.repeats.weekly' | transloco }}</option>
          <option value="monthly">{{ 'task_list.repeats.monthly' | transloco }}</option>
          <option value="yearly">{{ 'task_list.repeats.yearly' | transloco }}</option>
          <option value="custom">{{ 'task_list.repeats.custom' | transloco }}</option>
        </select>
        <div *ngIf="model.repeat.preset === 'custom'" class="mt-2 space-y-2">
          <div class="flex items-center gap-2 text-sm font-bold text-ink">
            {{ 'task_list.repeat_every' | transloco }}
            <input type="number" min="1" name="repeatInterval" [(ngModel)]="model.repeat.interval" [attr.aria-label]="'task_list.repeat_every' | transloco" class="w-20 rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral" />
            <select name="repeatUnit" [(ngModel)]="model.repeat.unit" [attr.aria-label]="'task_list.repeat_unit' | transloco" class="rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral">
              <option value="day">{{ 'task_list.units.day' | transloco }}</option>
              <option value="week">{{ 'task_list.units.week' | transloco }}</option>
              <option value="month">{{ 'task_list.units.month' | transloco }}</option>
              <option value="year">{{ 'task_list.units.year' | transloco }}</option>
            </select>
          </div>
          <div *ngIf="model.repeat.unit === 'week'" class="flex flex-wrap gap-1.5" role="group" [attr.aria-label]="'task_list.repeat_weekdays' | transloco">
            <button
              *ngFor="let code of weekdayCodes"
              type="button"
              (click)="toggleWeekday(code)"
              [attr.aria-pressed]="model.repeat.weekdays.includes(code)"
              class="rounded-full border-2 px-3 py-1 text-xs font-extrabold"
              [class]="model.repeat.weekdays.includes(code) ? 'border-coral bg-coral text-white' : 'border-border-soft text-ink-muted hover:bg-cork'"
            >
              {{ 'task_list.weekdays.' + code | transloco }}
            </button>
          </div>
          <select *ngIf="model.repeat.unit === 'month'" name="monthlyMode" [(ngModel)]="model.repeat.monthlyMode" class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral">
            <option value="date">{{ 'task_list.monthly_modes.date' | transloco }}</option>
            <option value="nthWeekday">{{ 'task_list.monthly_modes.nth_weekday' | transloco }}</option>
          </select>
        </div>
      </div>
      </div>

      <div class="flex gap-2 pt-1">
        <button type="submit" [disabled]="form.invalid || submit.busy" class="flex-1 rounded-full bg-coral px-4 py-2 text-sm font-extrabold text-white shadow-button hover:bg-coral-strong disabled:cursor-not-allowed disabled:opacity-50">
          {{ (task ? 'common.save_changes' : 'task_list.add') | transloco }}
        </button>
        <button type="button" (click)="cancelled.emit()" class="rounded-full px-4 py-2 text-sm font-bold text-ink-muted hover:bg-cork">
          {{ 'common.cancel' | transloco }}
        </button>
      </div>
    </form>
  `,
})
export class TaskEditorComponent implements OnInit {
  /** The task being edited; null to create one. */
  @Input() task: NodeResponse | null = null;
  @Input() showTitle = true;
  /** The list a new task starts in (defaults to the Personal Inbox). */
  @Input() defaultCollectionId: string | null = null;
  @Output() saved = new EventEmitter<TaskSaved>();
  @Output() cancelled = new EventEmitter<void>();

  readonly scopes: CollectionScope[] = ['Family', 'Personal'];
  readonly weekdayCodes = WEEKDAY_CODES;
  lists: CollectionResponse[] = [];
  members: FamilyMemberResponse[] = [];
  formSections: SectionResponse[] = [];
  errorMessage: string | null = null;
  /** Starts with just title, due date and assignees; the rest sits behind "More options". */
  showAdvanced = false;
  model = {
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: null as number | null,
    section: '',
    collectionId: null as string | null,
    repeat: emptyRepeat() as RepeatSpec,
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
    const task = this.task;
    if (task) {
      this.model = {
        title: task.title,
        description: task.description ?? '',
        dueDate: splitDue(task.until).date,
        dueTime: splitDue(task.until).time,
        priority: task.priority,
        section: '',
        collectionId: task.collectionId,
        repeat: parseRule(task.recurrenceRule),
        assignedFamilyMemberIds: [...task.assignedFamilyMemberIds],
      };
      this.showAdvanced = !!(task.description || task.priority || task.sectionId || task.recurrenceRule);
    }

    forkJoin({ lists: this.collectionsApi.list({ type: 'TaskList' }), members: this.membersApi.list() }).subscribe(({ lists, members }) => {
      // Personal Inbox first: it is where a thought is captured.
      this.lists = lists
        .filter((l) => !l.isSystemManaged)
        .sort((a, b) => Number(b.isInbox) - Number(a.isInbox) || a.name.localeCompare(b.name));
      this.members = members;
      if (!task) {
        const personalInbox = this.lists.find((l) => l.isInbox && l.scope === 'Personal') ?? this.lists.find((l) => l.isInbox);
        this.model.collectionId = this.lists.find((l) => l.id === this.defaultCollectionId)?.id ?? personalInbox?.id ?? null;
      }
      this.showAdvanced ||= !this.model.collectionId;
      this.loadFormSections(task?.sectionId ?? null);
      this.cdr.markForCheck();
    });
  }

  /** The "List" options for one scope; the Personal Inbox comes first. */
  listsInScope(scope: CollectionScope): CollectionResponse[] {
    return this.lists.filter((l) => l.scope === scope);
  }

  /** Display name of a list in the "List" dropdown — the Inboxes are named after their scope, not "Inbox". */
  listLabel(list: CollectionResponse): string {
    if (!list.isInbox) return list.name;
    return this.transloco.translate(list.scope === 'Personal' ? 'tasks.inbox_personal' : 'tasks.inbox_family');
  }

  /** The list picker changed: the section names on offer come from the newly chosen list. */
  onFormListChange() {
    this.model.section = '';
    this.loadFormSections();
  }

  /** Loads the section names offered by the chosen list; `selectId` pre-fills the section field (editing a task). */
  private loadFormSections(selectId: string | null = null) {
    const target = this.model.collectionId;
    this.formSections = [];
    if (!target) return;
    this.collectionsApi.sections(target).subscribe((sections) => {
      if (this.model.collectionId !== target) return;
      this.formSections = sections;
      if (selectId) this.model.section = sections.find((s) => s.id === selectId)?.name ?? '';
      this.cdr.markForCheck();
    });
  }

  toggleAssignee(memberId: string) {
    const ids = this.model.assignedFamilyMemberIds;
    this.model.assignedFamilyMemberIds = ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId];
  }

  toggleWeekday(code: WeekdayCode) {
    const days = this.model.repeat.weekdays;
    this.model.repeat.weekdays = days.includes(code) ? days.filter((d) => d !== code) : [...days, code];
  }

  save() {
    if (!this.model.title || !this.model.collectionId) return;

    const editing = this.task;
    const until = joinDue(this.model.dueDate, this.model.dueTime);
    const recurrenceRule = buildRule(this.model.repeat, until ? new Date(until) : null);
    const collectionId = this.model.collectionId;
    const sectionTyped = !!this.model.section.trim();

    const request$ = this.resolveSection(collectionId, this.model.section).pipe(
      switchMap((sectionId) =>
        editing
          ? this.nodesApi.update(
              editing.id,
              toUpdateRequest(editing, {
                title: this.model.title,
                description: this.model.description || null,
                until,
                assignedFamilyMemberIds: this.model.assignedFamilyMemberIds,
                collectionId,
                priority: this.model.priority,
                sectionId,
                recurrenceRule,
              }),
            )
          : this.nodesApi.create({
              type: 'Task',
              title: this.model.title,
              description: this.model.description || null,
              from: null,
              until,
              assignedFamilyMemberIds: this.model.assignedFamilyMemberIds,
              collectionId,
              priority: this.model.priority,
              sectionId,
              location: null,
              allDay: null,
              recurrenceRule,
              ...NULL_CONTACT_FIELDS,
              ...NULL_RECIPE_FIELDS,
              ...NULL_MEAL_FIELDS,
              ...NULL_SHOPPING_FIELDS,
              ...NULL_NOTE_FIELDS,
            }),
      ),
    );

    this.submit.run(request$).subscribe({
      next: (task) => this.saved.emit({ task, editing: !!editing, sectionTyped }),
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(editing ? 'task_list.errors.save' : 'task_list.errors.create'));
        this.cdr.markForCheck();
      },
    });
  }

  /** Turns a typed section name into an id in the given list: the existing section (any casing), a newly created one, or none. */
  private resolveSection(collectionId: string, name: string): Observable<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return of(null);
    const known = this.formSections.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (known) return of(known.id);
    return this.collectionsApi.createSection(collectionId, trimmed).pipe(switchMap((section) => of(section.id)));
  }
}

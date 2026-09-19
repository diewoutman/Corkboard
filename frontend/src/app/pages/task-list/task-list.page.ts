import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute } from '@angular/router';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { Collections } from '../../core/collections';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, FamilyMemberResponse, NodeResponse, SectionResponse, UpdateNodeRequest } from '../../core/models';
import { NULL_CONTACT_FIELDS, NULL_NOTE_FIELDS, Nodes } from '../../core/nodes';
import { parseQuickAdd } from '../../core/quick-add';
import { RepeatSpec, WEEKDAY_CODES, WeekdayCode, buildRule, emptyRepeat, joinDue, parseRule, splitDue } from '../../core/recurrence';

interface TaskGroup {
  key: string;
  title: string | null;
  sectionId: string | null;
  tasks: NodeResponse[];
}

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.page.html',
  styleUrls: ['./task-list.page.scss'],
  standalone: false,
})
export class TaskListPage implements OnInit {
  listId!: string;
  /** True for the combined Family + Personal Inbox at /tasks/inbox, which has no single list of its own. */
  isInboxView = false;
  list: CollectionResponse | null = null;
  /** Both Inboxes, in the combined view. */
  inboxes: CollectionResponse[] = [];
  /** Every list a task can live in (for moving tasks), Inboxes first. */
  allLists: CollectionResponse[] = [];
  sections: SectionResponse[] = [];
  /** Sections of the list currently picked in the task form (differs from `sections` after choosing another list). */
  formSections: SectionResponse[] = [];
  /** Which Inbox quick-add drops into, in the combined view. */
  quickAddTargetId: string | null = null;
  members: FamilyMemberResponse[] = [];
  tasks: NodeResponse[] = [];
  showCompleted = false;
  loading = true;
  errorMessage: string | null = null;

  showNewTaskForm = false;
  editingTask: NodeResponse | null = null;
  newTask = this.emptyNewTask();
  readonly weekdayCodes = WEEKDAY_CODES;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  ngOnInit() {
    this.listId = this.route.snapshot.paramMap.get('id')!;
    this.isInboxView = this.listId === 'inbox';
    this.reload();
  }

  get visibleTasks(): NodeResponse[] {
    return this.showCompleted ? this.tasks : this.tasks.filter((t) => !t.isCompleted);
  }

  /**
   * Groups visibleTasks by Section (in the list's own order), unsectioned tasks last under "Other" — a sectioned
   * list doubles as a shopping-mode view. The combined Inbox groups by which Inbox a task sits in instead.
   */
  get groupedTasks(): TaskGroup[] {
    if (this.isInboxView) {
      return this.inboxes
        .map((inbox) => ({
          key: inbox.id,
          title: this.transloco.translate(inbox.scope === 'Personal' ? 'tasks.inbox_personal' : 'tasks.inbox_family'),
          sectionId: null,
          tasks: this.visibleTasks.filter((t) => t.collectionId === inbox.id),
        }))
        .filter((g) => g.tasks.length > 0);
    }

    const groups: TaskGroup[] = this.sections
      .map((section) => ({ key: section.id, title: section.name, sectionId: section.id, tasks: this.visibleTasks.filter((t) => t.sectionId === section.id) }))
      .filter((g) => g.tasks.length > 0);
    const known = new Set(this.sections.map((s) => s.id));
    const other = this.visibleTasks.filter((t) => !t.sectionId || !known.has(t.sectionId));
    if (other.length > 0) groups.push({ key: 'other', title: null, sectionId: null, tasks: other });
    return groups;
  }

  trackGroup(_: number, group: { key: string }) {
    return group.key;
  }

  /** Name of the Inbox a task sits in, shown on its row in the combined view. */
  originOf(task: NodeResponse): string | null {
    if (!this.isInboxView) return null;
    const inbox = this.inboxes.find((i) => i.id === task.collectionId);
    return inbox ? this.transloco.translate(inbox.scope === 'Personal' ? 'tasks.inbox_personal' : 'tasks.inbox_family') : null;
  }

    reload(quiet = false) {
    this.loading = !quiet;
    this.errorMessage = null;

    const load$ = this.isInboxView ? this.loadInbox() : this.loadList();
    load$.subscribe({
      next: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('task_list.errors.load');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadList(): Observable<void> {
    return forkJoin({
      list: this.collectionsApi.get(this.listId),
      lists: this.collectionsApi.list({ type: 'TaskList' }),
      members: this.membersApi.list(),
      tasks: this.nodesApi.list({ type: 'Task', collectionId: this.listId }),
      sections: this.collectionsApi.sections(this.listId),
    }).pipe(
      switchMap(({ list, lists, members, tasks, sections }) => {
        this.list = list;
        this.allLists = this.movableLists(lists);
        this.members = members;
        this.tasks = this.sortTasks(tasks);
        this.sections = sections;
        return of(undefined);
      }),
    );
  }

  private loadInbox(): Observable<void> {
    return forkJoin({ lists: this.collectionsApi.list({ type: 'TaskList' }), members: this.membersApi.list() }).pipe(
      switchMap(({ lists, members }) => {
        this.allLists = this.movableLists(lists);
        this.inboxes = this.allLists.filter((l) => l.isInbox);
        this.members = members;
        // Personal first: an Inbox is for capturing things, and nobody else needs to see a half-formed thought.
        this.quickAddTargetId ??= (this.inboxes.find((i) => i.scope === 'Personal') ?? this.inboxes[0])?.id ?? null;
        return forkJoin(this.inboxes.map((inbox) => this.nodesApi.list({ type: 'Task', collectionId: inbox.id }))).pipe(
          switchMap((perInbox) => {
            this.tasks = this.sortTasks(perInbox.flat());
            return of(undefined);
          }),
        );
      }),
    );
  }

  private movableLists(lists: CollectionResponse[]): CollectionResponse[] {
    return lists.filter((l) => !l.isSystemManaged).sort((a, b) => Number(b.isInbox) - Number(a.isInbox) || a.name.localeCompare(b.name));
  }

  /** Display name of a list in the "List" dropdown — the Inboxes are named after their scope, not "Inbox". */
  listLabel(list: CollectionResponse): string {
    if (!list.isInbox) return `${list.name}${list.scope === 'Personal' ? ' 🔒' : ''}`;
    return this.transloco.translate(list.scope === 'Personal' ? 'tasks.inbox_personal' : 'tasks.inbox_family');
  }

  deleteSection(sectionId: string) {
    this.collectionsApi.deleteSection(sectionId).subscribe({
      next: () => {
        this.sections = this.sections.filter((s) => s.id !== sectionId);
        this.tasks = this.tasks.map((t) => (t.sectionId === sectionId ? { ...t, sectionId: null } : t));
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('task_list.errors.section');
        this.cdr.markForCheck();
      },
    });
  }

  /** The form's list picker changed: its section names come from the newly chosen list. */
  onFormListChange() {
    this.newTask.section = '';
    this.loadFormSections();
  }

  /** Loads the section names offered by the form's list; `selectId` pre-fills the section field (editing a task). */
  private loadFormSections(selectId: string | null = null) {
    const target = this.newTask.collectionId;
    const apply = (sections: SectionResponse[]) => {
      this.formSections = sections;
      if (selectId) this.newTask.section = sections.find((s) => s.id === selectId)?.name ?? '';
      this.cdr.markForCheck();
    };

    if (target === this.list?.id) return apply(this.sections);
    this.formSections = [];
    if (!target) return;
    this.collectionsApi.sections(target).subscribe((sections) => {
      if (this.newTask.collectionId === target) apply(sections);
    });
  }

  toggleAssignee(memberId: string) {
    const ids = this.newTask.assignedFamilyMemberIds;
    this.newTask.assignedFamilyMemberIds = ids.includes(memberId)
      ? ids.filter((id) => id !== memberId)
      : [...ids, memberId];
  }

  toggleWeekday(code: WeekdayCode) {
    const days = this.newTask.repeat.weekdays;
    this.newTask.repeat.weekdays = days.includes(code) ? days.filter((d) => d !== code) : [...days, code];
  }

  toggleDone(task: NodeResponse) {
    this.nodesApi.update(task.id, this.toUpdateRequest(task, { isCompleted: !task.isCompleted })).subscribe({
      next: (updated) => {
        this.tasks = this.sortTasks(this.tasks.map((t) => (t.id === updated.id ? updated : t)));
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('task_list.errors.update');
        this.cdr.markForCheck();
      },
    });
  }

  deleteTask(task: NodeResponse) {
    this.nodesApi.delete(task.id).subscribe({
      next: () => {
        this.tasks = this.tasks.filter((t) => t.id !== task.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('task_list.errors.delete');
        this.cdr.markForCheck();
      },
    });
  }

  openAddTaskForm() {
    this.editingTask = null;
    this.newTask = this.emptyNewTask();
    this.newTask.collectionId = this.isInboxView ? this.quickAddTargetId : this.listId;
    this.loadFormSections();
    this.showNewTaskForm = true;
  }

  openEditTaskForm(task: NodeResponse) {
    this.editingTask = task;
    this.newTask = {
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
    this.loadFormSections(task.sectionId);
    this.showNewTaskForm = true;
  }

  closeTaskForm() {
    this.showNewTaskForm = false;
    this.editingTask = null;
  }

  submitTaskForm() {
    if (!this.newTask.title || !this.newTask.collectionId) return;

    const until = joinDue(this.newTask.dueDate, this.newTask.dueTime);
    const recurrenceRule = buildRule(this.newTask.repeat, until ? new Date(until) : null);
    const collectionId = this.newTask.collectionId;
    const editing = this.editingTask;

    this.resolveSection(collectionId, this.newTask.section)
      .pipe(
        switchMap((sectionId) =>
          editing
            ? this.nodesApi.update(
                editing.id,
                this.toUpdateRequest(editing, {
                  title: this.newTask.title,
                  description: this.newTask.description || null,
                  until,
                  assignedFamilyMemberIds: this.newTask.assignedFamilyMemberIds,
                  collectionId,
                  priority: this.newTask.priority,
                  sectionId,
                  recurrenceRule,
                }),
              )
            : this.nodesApi.create({
                type: 'Task',
                title: this.newTask.title,
                description: this.newTask.description || null,
                from: null,
                until,
                assignedFamilyMemberIds: this.newTask.assignedFamilyMemberIds,
                collectionId,
                priority: this.newTask.priority,
                sectionId,
                location: null,
                allDay: null,
                recurrenceRule,
                ...NULL_CONTACT_FIELDS,
                ...NULL_NOTE_FIELDS,
              }),
        ),
      )
      .subscribe({
        next: () => {
          this.closeTaskForm();
          // A new section may have been created, or the task moved to another list — refetch rather than patch by hand.
          this.reload(true);
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, this.transloco.translate(editing ? 'task_list.errors.save' : 'task_list.errors.create'));
          this.cdr.markForCheck();
        },
      });
  }

  /** Todoist-style fast capture: "Buy milk tomorrow 5pm #Groceries" — parsed client-side, same create call as the full form. */
  submitQuickAdd(text: string) {
    const parsed = parseQuickAdd(text);
    if (!parsed.title) return;

    // The combined Inbox is for unsorted capture, so a "#tag" is ignored there.
    const target = this.isInboxView ? this.quickAddTargetId : this.listId;
    if (!target) return;

    this.resolveSection(target, this.isInboxView ? '' : (parsed.category ?? ''))
      .pipe(
        switchMap((sectionId) =>
          this.nodesApi.create({
            type: 'Task',
            title: parsed.title,
            description: null,
            from: null,
            until: parsed.start ? this.quickAddDue(parsed.start, parsed.hasTime) : null,
            assignedFamilyMemberIds: [],
            collectionId: target,
            priority: null,
            sectionId,
            location: null,
            allDay: null,
            recurrenceRule: null,
            ...NULL_CONTACT_FIELDS,
            ...NULL_NOTE_FIELDS,
          }),
        ),
      )
      .subscribe({
        next: () => this.reload(true),
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, this.transloco.translate('task_list.errors.create'));
          this.cdr.markForCheck();
        },
      });
  }

  /** Turns a typed section name into an id in the given list: the existing section (any casing), a newly created one, or none. */
  private resolveSection(collectionId: string, name: string): Observable<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return of(null);
    const known = (collectionId === this.list?.id ? this.sections : this.formSections).find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (known) return of(known.id);
    return this.collectionsApi.createSection(collectionId, trimmed).pipe(switchMap((section) => of(section.id)));
  }

  private toUpdateRequest(task: NodeResponse, overrides: Partial<UpdateNodeRequest>): UpdateNodeRequest {
    return {
      title: task.title,
      description: task.description,
      from: task.from,
      until: task.until,
      assignedFamilyMemberIds: task.assignedFamilyMemberIds,
      collectionId: task.collectionId,
      isImportant: task.isImportant,
      isCompleted: task.isCompleted,
      priority: task.priority,
      sectionId: task.sectionId,
      location: task.location,
      allDay: task.allDay,
      recurrenceRule: task.recurrenceRule,
      firstName: task.firstName,
      lastName: task.lastName,
      dateOfBirth: task.dateOfBirth,
      street: task.street,
      city: task.city,
      postalCode: task.postalCode,
      country: task.country,
      phoneNumbers: task.phoneNumbers,
      emails: task.emails,
      ...overrides,
    };
  }

  private sortTasks(tasks: NodeResponse[]): NodeResponse[] {
    return [...tasks].sort((a, b) => {
      if (!!a.isCompleted !== !!b.isCompleted) return a.isCompleted ? 1 : -1;
      return (a.until ?? a.createdAt).localeCompare(b.until ?? b.createdAt);
    });
  }

  private emptyNewTask() {
    return {
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
  }

  /** Quick-add without a time of day means "due that day", not chrono's default noon. */
  private quickAddDue(start: Date, hasTime: boolean): string {
    if (hasTime) return start.toISOString();
    return new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
  }
}

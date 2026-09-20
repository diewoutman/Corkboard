import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { Collections } from '../../core/collections';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { Page } from '../../core/paging';
import { SubmitGuard } from '../../core/submit-guard';
import { CollectionResponse, CollectionScope, FamilyMemberResponse, NodeResponse, SectionResponse, UpdateNodeRequest } from '../../core/models';
import { NULL_CONTACT_FIELDS, NULL_NOTE_FIELDS, Nodes, toUpdateRequest } from '../../core/nodes';
import { TaskEvents } from '../../core/task-events';
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
export class TaskListPage implements OnInit, OnDestroy {
  /** Ignores a repeated click on delete while that item's request is still in flight. */
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  private moveSub?: Subscription;
  listId!: string;
  /** True for the combined Family + Personal Inbox at /tasks/inbox, which has no single list of its own. */
  isInboxView = false;
  /** True for /tasks/all: every task from every list you can see, grouped by list. */
  isAllView = false;
  /** The lists whose tasks a combined view (Inbox or All) shows. */
  viewLists: CollectionResponse[] = [];
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
  /** Combined views load from the server a page at a time; how many tasks matched in all. */
  total = 0;
  private page = 1;
  loadingMore = false;
  private static readonly PAGE_SIZE = 50;
  loading = true;
  errorMessage: string | null = null;

  /** Guards the task form against a double submit. */
  readonly submit: SubmitGuard;
  /** Quick-added tasks whose request is still in flight, shown dimmed until the server answers. */
  pending: { id: number; title: string }[] = [];
  private pendingSeq = 0;

  showNewTaskForm = false;
  editingTask: NodeResponse | null = null;
  newTask = this.emptyNewTask();
  readonly weekdayCodes = WEEKDAY_CODES;
  readonly scopes: CollectionScope[] = ['Family', 'Personal'];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
    private readonly events: TaskEvents,
  ) {
    this.submit = new SubmitGuard(cdr);
  }

  ngOnInit() {
    this.moveSub = this.events.moved.subscribe(() => this.refreshTasks());
    // The shell reuses this component when another list is picked in the sidebar, so follow the param.
    this.route.paramMap.subscribe((params) => {
      this.listId = params.get('id')!;
      this.isInboxView = this.listId === 'inbox';
      this.isAllView = this.listId === 'all';
      this.list = null;
      this.tasks = [];
      this.sections = [];
      this.quickAddTargetId = null;
      this.reload();
    });
  }

  /** Views that span several lists have no single list of their own. */
  ngOnDestroy() {
    this.moveSub?.unsubscribe();
  }

  get isCombinedView(): boolean {
    return this.isInboxView || this.isAllView;
  }

  get visibleTasks(): NodeResponse[] {
    return this.showCompleted ? this.tasks : this.tasks.filter((t) => !t.isCompleted);
  }

  /**
   * Groups visibleTasks by Section (in the list's own order), unsectioned tasks last under "Other" — a sectioned
   * list doubles as a shopping-mode view. The combined Inbox groups by which Inbox a task sits in instead.
   */
  get groupedTasks(): TaskGroup[] {
    if (this.isCombinedView) {
      return this.viewLists
        .map((list) => ({
          key: list.id,
          title: this.listLabel(list),
          sectionId: null,
          tasks: this.visibleTasks.filter((t) => t.collectionId === list.id),
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

  /** Name of the Inbox a task sits in, shown on its row when the Inbox view combines several (it is normally just the Personal one). */
  originOf(task: NodeResponse): string | null {
    if (!this.isInboxView || this.inboxes.length < 2) return null;
    const inbox = this.inboxes.find((i) => i.id === task.collectionId);
    return inbox ? this.transloco.translate(inbox.scope === 'Personal' ? 'tasks.inbox_personal' : 'tasks.inbox_family') : null;
  }

    reload(quiet = false) {
    this.loading = !quiet;
    this.errorMessage = null;

    const load$ = this.isCombinedView ? this.loadCombined() : this.loadList();
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

  /** Everything the page needs in one round: the tasks are requested alongside the list metadata, not after it. */
  private loadList(): Observable<void> {
    return forkJoin({
      lists: this.collectionsApi.list({ type: 'TaskList' }),
      members: this.membersApi.list(),
      sections: this.collectionsApi.sections(this.listId),
      tasks: this.requestTaskPage(1),
    }).pipe(
      map(({ lists, members, sections, tasks }) => {
        const list = lists.find((l) => l.id === this.listId);
        if (!list) throw new Error('List not found');
        this.list = list;
        this.allLists = this.movableLists(lists);
        this.members = members;
        this.sections = sections;
        this.applyTaskPage(1, tasks);
      }),
    );
  }

  private loadCombined(): Observable<void> {
    // Only the Inbox view needs the lists first (to learn the Inbox's id); All can fetch its tasks straight away.
    return forkJoin({
      lists: this.collectionsApi.list({ type: 'TaskList' }),
      members: this.membersApi.list(),
      tasks: this.isAllView ? this.requestTaskPage(1) : of(null),
    }).pipe(
      switchMap(({ lists, members, tasks }) => {
        this.allLists = this.movableLists(lists);
        this.inboxes = this.allLists.filter((l) => l.isInbox);
        this.members = members;
        // Personal first: an Inbox is for capturing things, and nobody else needs to see a half-formed thought.
        this.quickAddTargetId ??= (this.inboxes.find((i) => i.scope === 'Personal') ?? this.inboxes[0])?.id ?? null;
        this.viewLists = this.isAllView ? this.allLists : this.inboxes;
        if (tasks) {
          this.applyTaskPage(1, tasks);
          return of(undefined);
        }
        return this.fetchTaskPage(1);
      }),
    );
  }

  /** Server-side filter + sort + paging: open tasks by due date, or every task when "show completed" is on. Used by every view. */
  private requestTaskPage(page: number): Observable<Page<NodeResponse>> {
    const inboxId = this.inboxes[0]?.id;
    if (this.isInboxView && !inboxId) return of({ items: [], total: 0 });

    return this.nodesApi.listPage({
      type: 'Task',
      collectionId: this.isInboxView ? inboxId : this.isAllView ? undefined : this.listId,
      isCompleted: this.showCompleted ? undefined : false,
      sort: 'due',
      page,
      pageSize: TaskListPage.PAGE_SIZE,
    });
  }

  private applyTaskPage(page: number, { items, total }: Page<NodeResponse>) {
    this.page = page;
    this.total = total;
    this.tasks = page === 1 ? items : [...this.tasks, ...items];
  }

  private fetchTaskPage(page: number): Observable<void> {
    return this.requestTaskPage(page).pipe(map((result) => this.applyTaskPage(page, result)));
  }

  /** Re-fetches only the first page of tasks — the lists, members and sections haven't changed. */
  private refreshTasks() {
    this.fetchTaskPage(1).subscribe({
      next: () => this.cdr.markForCheck(),
      error: () => {
        this.errorMessage = this.transloco.translate('task_list.errors.load');
        this.cdr.markForCheck();
      },
    });
  }

  private refreshSections() {
    if (this.isCombinedView) return;
    this.collectionsApi.sections(this.listId).subscribe((sections) => {
      this.sections = sections;
      this.cdr.markForCheck();
    });
  }

  /** Puts a just-created task into the visible list without a refetch; falls back to one when the local view can't place it. */
  private insertCreated(created: NodeResponse) {
    const placeable = !this.hasMore && (!created.sectionId || this.sections.some((s) => s.id === created.sectionId) || this.isCombinedView);
    if (!placeable) {
      this.refreshTasks();
      if (created.sectionId) this.refreshSections();
      return;
    }
    this.tasks = this.sortTasks([...this.tasks, created]);
    this.cdr.markForCheck();
  }

  get hasMore(): boolean {
    return this.tasks.length < this.total;
  }

  loadMore() {
    this.loadingMore = true;
    this.fetchTaskPage(this.page + 1).subscribe({
      next: () => {
        this.loadingMore = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('task_list.errors.load');
        this.loadingMore = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Completed tasks are only fetched on demand, so toggling needs a reload. */
  onShowCompletedChange() {
    this.refreshTasks();
  }

  /** The task form's "List" options for one scope; the Personal Inbox comes first (allLists is sorted that way). */
  listsInScope(scope: CollectionScope): CollectionResponse[] {
    return this.allLists.filter((l) => l.scope === scope);
  }

  private movableLists(lists: CollectionResponse[]): CollectionResponse[] {
    return lists.filter((l) => !l.isSystemManaged).sort((a, b) => Number(b.isInbox) - Number(a.isInbox) || a.name.localeCompare(b.name));
  }

  /** Display name of a list in the "List" dropdown — the Inboxes are named after their scope, not "Inbox". */
  listLabel(list: CollectionResponse): string {
    if (!list.isInbox) return list.name;
    return this.transloco.translate(list.scope === 'Personal' ? 'tasks.inbox_personal' : 'tasks.inbox_family');
  }

  deleteSection(sectionId: string) {
    this.removing.run(this.collectionsApi.deleteSection(sectionId), sectionId).subscribe({
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
    this.nodesApi.update(task.id, toUpdateRequest(task, { isCompleted: !task.isCompleted })).subscribe({
      next: (updated) => {
        // With more pages still on the server, a changed task shifts every later page: start over from page 1.
        if (this.hasMore) return this.refreshTasks();
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
    this.removing.run(this.nodesApi.delete(task.id), task.id).subscribe({
      next: () => {
        if (this.hasMore) return this.refreshTasks();
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
    this.newTask.collectionId = this.isCombinedView ? this.quickAddTargetId : this.listId;
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
    const typedSection = this.newTask.section.trim();

    this.submit
      .run(this.resolveSection(collectionId, this.newTask.section)
      .pipe(
        switchMap((sectionId) =>
          editing
            ? this.nodesApi.update(
                editing.id,
                toUpdateRequest(editing, {
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
      ))
      .subscribe({
        next: (saved) => {
          this.closeTaskForm();
          if (editing) {
            // Moved lists, changed section or due date: the order and grouping may differ, so ask the server once.
            this.refreshTasks();
            if (typedSection) this.refreshSections();
          } else if (this.isCombinedView) {
            this.refreshTasks();
          } else if (collectionId === this.listId) {
            this.insertCreated(saved);
          }
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

    // The combined views are for unsorted capture, so a "#tag" is ignored there.
    const target = this.isCombinedView ? this.quickAddTargetId : this.listId;
    if (!target) return;

    const pending = { id: ++this.pendingSeq, title: parsed.title };
    this.pending = [...this.pending, pending];
    const typedSection = this.isCombinedView ? '' : (parsed.category ?? '').trim();

    this.resolveSection(target, typedSection)
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
        finalize(() => {
          this.pending = this.pending.filter((p) => p.id !== pending.id);
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (created) => {
          this.insertCreated(created);
        },
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

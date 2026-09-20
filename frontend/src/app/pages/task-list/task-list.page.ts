import { CreateFab } from '../../core/create-fab';
import { SubmitGuard } from '../../core/submit-guard';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { Collections } from '../../core/collections';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { Page } from '../../core/paging';
import { CollectionResponse, CollectionScope, FamilyMemberResponse, NodeResponse, SectionResponse, UpdateNodeRequest } from '../../core/models';
import { NULL_CONTACT_FIELDS, NULL_NOTE_FIELDS, Nodes, toUpdateRequest } from '../../core/nodes';
import { TaskEvents } from '../../core/task-events';
import { parseQuickAdd } from '../../core/quick-add';
import { TaskSaved } from '../../shared/components/task-editor/task-editor.component';

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
  /** Ignores a repeated click while that item's update is still in flight (a recurring task would otherwise roll forward twice). */
  readonly updating = new SubmitGuard(inject(ChangeDetectorRef));
  /** Ignores a repeated click on delete while that item's request is still in flight. */
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  private moveSub?: Subscription;
  private readonly createFab = inject(CreateFab);
  private unregisterFab?: () => void;
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

  /** Quick-added tasks whose request is still in flight, shown dimmed until the server answers. */
  pending: { id: number; title: string }[] = [];
  /** The task being edited in the editor sheet (new tasks come from the app's "+" sheet). */
  editingTask: NodeResponse | null = null;
  private pendingSeq = 0;


  constructor(
    private readonly route: ActivatedRoute,
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
    private readonly events: TaskEvents,
  ) {
  }

  ngOnInit() {
    this.moveSub = this.events.moved.subscribe(() => this.refreshTasks());
    // A task made from the app's "+" sheet: show it here.
    this.moveSub.add(this.createFab.created.subscribe((kind) => kind === 'task' && this.refreshTasks()));
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
    this.unregisterFab?.();
  }

  /** Tells the app's "+" sheet to start on the task editor, in this list — once the lists are known. */
  private registerFab() {
    this.unregisterFab?.();
    this.unregisterFab = this.createFab.register({ kind: 'task', taskListId: this.isCombinedView ? this.quickAddTargetId : this.listId });
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
        this.registerFab();
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

  toggleDone(task: NodeResponse) {
    this.updating.run(this.nodesApi.update(task.id, toUpdateRequest(task, { isCompleted: !task.isCompleted })), task.id).subscribe({
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

  openEditTaskForm(task: NodeResponse) {
    this.editingTask = task;
  }

  closeTaskForm() {
    this.editingTask = null;
  }

  /** A task was edited in the sheet: moved lists, changed section or due date, so the order and grouping may differ — ask the server once. */
  onTaskSaved(saved: TaskSaved) {
    this.closeTaskForm();
    this.refreshTasks();
    if (saved.sectionTyped) this.refreshSections();
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
    const known = this.sections.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (known) return of(known.id);
    return this.collectionsApi.createSection(collectionId, trimmed).pipe(switchMap((section) => of(section.id)));
  }

  private sortTasks(tasks: NodeResponse[]): NodeResponse[] {
    return [...tasks].sort((a, b) => {
      if (!!a.isCompleted !== !!b.isCompleted) return a.isCompleted ? 1 : -1;
      return (a.until ?? a.createdAt).localeCompare(b.until ?? b.createdAt);
    });
  }

  /** Quick-add without a time of day means "due that day", not chrono's default noon. */
  private quickAddDue(start: Date, hasTime: boolean): string {
    if (hasTime) return start.toISOString();
    return new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
  }
}

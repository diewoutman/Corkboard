import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Collections } from '../../core/collections';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, FamilyMemberResponse, NodeResponse, UpdateNodeRequest } from '../../core/models';
import { NULL_CONTACT_FIELDS, NULL_NOTE_FIELDS, Nodes } from '../../core/nodes';
import { parseQuickAdd } from '../../core/quick-add';
import { RepeatSpec, WEEKDAY_CODES, WeekdayCode, buildRule, emptyRepeat, joinDue, parseRule, splitDue } from '../../core/recurrence';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.page.html',
  styleUrls: ['./task-list.page.scss'],
  standalone: false,
})
export class TaskListPage implements OnInit {
  listId!: string;
  list: CollectionResponse | null = null;
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
    this.reload();
  }

  get visibleTasks(): NodeResponse[] {
    return this.showCompleted ? this.tasks : this.tasks.filter((t) => !t.isCompleted);
  }

  /** Groups visibleTasks by Category (in first-seen order), uncategorized tasks last under "Other" — a categorized list doubles as a shopping-mode view. */
  get groupedTasks(): { category: string | null; tasks: NodeResponse[] }[] {
    const groups = new Map<string | null, NodeResponse[]>();
    for (const task of this.visibleTasks) {
      const key = task.category;
      groups.set(key, [...(groups.get(key) ?? []), task]);
    }
    const entries = [...groups.entries()].map(([category, tasks]) => ({ category, tasks }));
    entries.sort((a, b) => {
      if (a.category === null) return 1;
      if (b.category === null) return -1;
      return a.category.localeCompare(b.category);
    });
    return entries;
  }

  /** Previously used categories in this list, for the "Category" field's suggestion list. */
  get knownCategories(): string[] {
    return [...new Set(this.tasks.map((t) => t.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b));
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    forkJoin({
      list: this.collectionsApi.get(this.listId),
      members: this.membersApi.list(),
      tasks: this.nodesApi.list({ type: 'Task', collectionId: this.listId }),
    }).subscribe({
      next: ({ list, members, tasks }) => {
        this.list = list;
        this.members = members;
        this.tasks = this.sortTasks(tasks);
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
      category: task.category ?? '',
      repeat: parseRule(task.recurrenceRule),
      assignedFamilyMemberIds: [...task.assignedFamilyMemberIds],
    };
    this.showNewTaskForm = true;
  }

  closeTaskForm() {
    this.showNewTaskForm = false;
    this.editingTask = null;
  }

  submitTaskForm() {
    if (!this.newTask.title) return;

    const until = joinDue(this.newTask.dueDate, this.newTask.dueTime);
    const recurrenceRule = buildRule(this.newTask.repeat, until ? new Date(until) : null);

    const request$ = this.editingTask
      ? this.nodesApi.update(
          this.editingTask.id,
          this.toUpdateRequest(this.editingTask, {
            title: this.newTask.title,
            description: this.newTask.description || null,
            until,
            assignedFamilyMemberIds: this.newTask.assignedFamilyMemberIds,
            priority: this.newTask.priority,
            category: this.newTask.category || null,
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
          collectionId: this.listId,
          priority: this.newTask.priority,
          category: this.newTask.category || null,
          location: null,
          allDay: null,
          recurrenceRule,
          ...NULL_CONTACT_FIELDS,
          ...NULL_NOTE_FIELDS,
        });

    const wasEditing = !!this.editingTask;
    request$.subscribe({
      next: (saved) => {
        this.tasks = this.sortTasks(wasEditing ? this.tasks.map((t) => (t.id === saved.id ? saved : t)) : [...this.tasks, saved]);
        this.closeTaskForm();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(wasEditing ? 'task_list.errors.save' : 'task_list.errors.create'));
        this.cdr.markForCheck();
      },
    });
  }

  /** Todoist-style fast capture: "Buy milk tomorrow 5pm #Groceries" — parsed client-side, same create call as the full form. */
  submitQuickAdd(text: string) {
    const parsed = parseQuickAdd(text);
    if (!parsed.title) return;

    this.nodesApi
      .create({
        type: 'Task',
        title: parsed.title,
        description: null,
        from: null,
        until: parsed.start ? this.quickAddDue(parsed.start, parsed.hasTime) : null,
        assignedFamilyMemberIds: [],
        collectionId: this.listId,
        priority: null,
        category: parsed.category,
        location: null,
        allDay: null,
        recurrenceRule: null,
        ...NULL_CONTACT_FIELDS,
        ...NULL_NOTE_FIELDS,
      })
      .subscribe({
        next: (created) => {
          this.tasks = this.sortTasks([...this.tasks, created]);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, this.transloco.translate('task_list.errors.create'));
          this.cdr.markForCheck();
        },
      });
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
      category: task.category,
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
      category: '',
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

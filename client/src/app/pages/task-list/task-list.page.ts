import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Collections } from '../../core/collections';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, FamilyMemberResponse, NodeResponse, UpdateNodeRequest } from '../../core/models';
import { NULL_CONTACT_FIELDS, NULL_NOTE_FIELDS, Nodes } from '../../core/nodes';

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
  newTask = this.emptyNewTask();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.listId = this.route.snapshot.paramMap.get('id')!;
    this.reload();
  }

  get visibleTasks(): NodeResponse[] {
    return this.showCompleted ? this.tasks : this.tasks.filter((t) => !t.isCompleted);
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
        this.errorMessage = 'Could not load this list. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  memberName(id: string): string {
    return this.members.find((m) => m.id === id)?.displayName ?? '?';
  }

  memberColor(id: string): string {
    return this.members.find((m) => m.id === id)?.color ?? '#999';
  }

  toggleAssignee(memberId: string) {
    const ids = this.newTask.assignedFamilyMemberIds;
    this.newTask.assignedFamilyMemberIds = ids.includes(memberId)
      ? ids.filter((id) => id !== memberId)
      : [...ids, memberId];
  }

  toggleDone(task: NodeResponse) {
    this.nodesApi.update(task.id, this.toUpdateRequest(task, { isCompleted: !task.isCompleted })).subscribe({
      next: (updated) => {
        this.tasks = this.sortTasks(this.tasks.map((t) => (t.id === updated.id ? updated : t)));
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not update that task.';
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
        this.errorMessage = 'Could not delete that task.';
        this.cdr.markForCheck();
      },
    });
  }

  submitNewTask() {
    if (!this.newTask.title) return;

    this.nodesApi
      .create({
        type: 'Task',
        title: this.newTask.title,
        description: this.newTask.description || null,
        from: null,
        until: this.newTask.dueDate ? new Date(this.newTask.dueDate).toISOString() : null,
        assignedFamilyMemberIds: this.newTask.assignedFamilyMemberIds,
        collectionId: this.listId,
        priority: this.newTask.priority,
        location: null,
        allDay: null,
        recurrenceRule: null,
        ...NULL_CONTACT_FIELDS,
        ...NULL_NOTE_FIELDS,
      })
      .subscribe({
        next: (created) => {
          this.tasks = this.sortTasks([...this.tasks, created]);
          this.newTask = this.emptyNewTask();
          this.showNewTaskForm = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that task.');
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
      priority: null as number | null,
      assignedFamilyMemberIds: [] as string[],
    };
  }
}

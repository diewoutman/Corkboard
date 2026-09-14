import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { FamilyMemberResponse, NodeResponse, UpdateNodeRequest } from '../../core/models';
import { Nodes } from '../../core/nodes';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false,
})
export class TasksPage implements OnInit {
  members: FamilyMemberResponse[] = [];
  tasks: NodeResponse[] = [];
  showCompleted = false;
  loading = true;
  errorMessage: string | null = null;

  showNewTaskForm = false;
  newTask = this.emptyNewTask();

  constructor(
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.reload();
  }

  get visibleTasks(): NodeResponse[] {
    return this.showCompleted ? this.tasks : this.tasks.filter((t) => !t.isCompleted);
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    forkJoin({
      members: this.membersApi.list(),
      tasks: this.nodesApi.list({ type: 'Task' }),
    }).subscribe({
      next: ({ members, tasks }) => {
        this.members = members;
        this.tasks = this.sortTasks(tasks);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load your tasks. Pull to refresh to try again.';
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

  toggleAssignee(memberId: string) {
    const ids = this.newTask.assignedFamilyMemberIds;
    this.newTask.assignedFamilyMemberIds = ids.includes(memberId)
      ? ids.filter((id) => id !== memberId)
      : [...ids, memberId];
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
        priority: this.newTask.priority,
        location: null,
        allDay: null,
        recurrenceRule: null,
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
      isCompleted: task.isCompleted,
      priority: task.priority,
      location: task.location,
      allDay: task.allDay,
      recurrenceRule: task.recurrenceRule,
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

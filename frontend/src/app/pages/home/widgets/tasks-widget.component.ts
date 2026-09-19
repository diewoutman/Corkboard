import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { Auth } from '../../../core/auth';
import { Collections } from '../../../core/collections';
import { FamilyMembers } from '../../../core/family-members';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { Nodes, toggleTaskCompletionRequest } from '../../../core/nodes';

const MAX_TASKS_SHOWN = 8;

@Component({
  selector: 'app-tasks-widget',
  templateUrl: './tasks-widget.component.html',
  standalone: false,
})
export class TasksWidgetComponent implements OnInit {
  @Input() collectionId: string | null = null;
  @Input() assignedToMeOnly: boolean | null = null;

  tasks: NodeResponse[] = [];
  members: FamilyMemberResponse[] = [];
  listName: string | null = null;
  loading = true;

  constructor(
    private readonly auth: Auth,
    private readonly nodesApi: Nodes,
    private readonly familyMembersApi: FamilyMembers,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const listName$ = this.collectionId ? this.collectionsApi.get(this.collectionId) : of(null);

    const assignedTo$ =
      this.assignedToMeOnly && !this.collectionId
        ? this.familyMembersApi.list().pipe(
            switchMap((members) => {
              const mine = members.find((m) => m.linkedUserId === this.auth.current()?.userId);
              return of(mine?.id ?? null);
            }),
          )
        : of(null);

    forkJoin({ list: listName$, assignedTo: assignedTo$, members: this.familyMembersApi.list() }).subscribe({
      next: ({ list, assignedTo, members }) => {
        this.listName = list?.name ?? null;
        this.members = members;
        // The server filters and sorts; one page of exactly what the widget shows.
        this.nodesApi
          .listPage({
            type: 'Task',
            collectionId: this.collectionId ?? undefined,
            assignedTo: assignedTo ?? undefined,
            isCompleted: false,
            sort: 'due',
            pageSize: MAX_TASKS_SHOWN,
          })
          .subscribe({
            next: ({ items }) => {
              this.tasks = items;
              this.loading = false;
              this.cdr.markForCheck();
            },
            error: () => {
              this.loading = false;
              this.cdr.markForCheck();
            },
          });
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Overdue in red, due today/tomorrow in amber — matches task-list.page's dueClass(). */
  dueClass(task: NodeResponse): string {
    if (!task.until) return 'font-semibold text-ink-muted';
    const until = new Date(task.until);
    const now = new Date();
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    if (until < now) return 'font-extrabold text-danger';
    if (until < endOfTomorrow) return 'font-extrabold text-lotte';
    return 'font-semibold text-ink-muted';
  }

  toggleDone(task: NodeResponse) {
    this.nodesApi.update(task.id, toggleTaskCompletionRequest(task, true)).subscribe({
      next: () => {
        this.tasks = this.tasks.filter((t) => t.id !== task.id);
        this.cdr.markForCheck();
      },
    });
  }
}

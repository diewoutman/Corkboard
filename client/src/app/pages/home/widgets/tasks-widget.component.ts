import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { Auth } from '../../../core/auth';
import { Collections } from '../../../core/collections';
import { FamilyMembers } from '../../../core/family-members';
import { FamilyMemberResponse, NodeResponse, UpdateNodeRequest } from '../../../core/models';
import { Nodes } from '../../../core/nodes';

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
        this.nodesApi
          .list({ type: 'Task', collectionId: this.collectionId ?? undefined, assignedTo: assignedTo ?? undefined })
          .subscribe({
            next: (tasks) => {
              this.tasks = tasks
                .filter((t) => !t.isCompleted)
                .sort((a, b) => (a.until ?? a.createdAt).localeCompare(b.until ?? b.createdAt))
                .slice(0, MAX_TASKS_SHOWN);
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

  toggleDone(task: NodeResponse) {
    const request: UpdateNodeRequest = {
      title: task.title,
      description: task.description,
      from: task.from,
      until: task.until,
      assignedFamilyMemberIds: task.assignedFamilyMemberIds,
      collectionId: task.collectionId,
      isImportant: null,
      isCompleted: true,
      priority: task.priority,
      location: null,
      allDay: null,
      recurrenceRule: null,
      firstName: null,
      lastName: null,
      dateOfBirth: null,
      street: null,
      city: null,
      postalCode: null,
      country: null,
      phoneNumbers: null,
      emails: null,
    };

    this.nodesApi.update(task.id, request).subscribe({
      next: () => {
        this.tasks = this.tasks.filter((t) => t.id !== task.id);
        this.cdr.markForCheck();
      },
    });
  }
}

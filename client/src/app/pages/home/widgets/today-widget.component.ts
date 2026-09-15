import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CalendarApi } from '../../../core/calendar';
import { FamilyMembers } from '../../../core/family-members';
import { FamilyMemberResponse, NodeResponse, OccurrenceResponse, UpdateNodeRequest } from '../../../core/models';
import { Nodes } from '../../../core/nodes';

interface TodayItem {
  key: string;
  kind: 'task' | 'event';
  title: string;
  time: string | null;
  task?: NodeResponse;
}

interface MemberGroup {
  member: FamilyMemberResponse | null;
  items: TodayItem[];
}

@Component({
  selector: 'app-today-widget',
  templateUrl: './today-widget.component.html',
  standalone: false,
})
export class TodayWidgetComponent implements OnInit {
  loading = true;
  groups: MemberGroup[] = [];

  constructor(
    private readonly nodesApi: Nodes,
    private readonly calendarApi: CalendarApi,
    private readonly familyMembersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    forkJoin({
      tasks: this.nodesApi.list({ type: 'Task' }),
      occurrences: this.calendarApi.occurrences({ from: startOfToday.toISOString(), until: endOfToday.toISOString() }),
      members: this.familyMembersApi.list(),
    }).subscribe({
      next: ({ tasks, occurrences, members }) => {
        this.groups = this.buildGroups(tasks, occurrences, members, endOfToday);
        this.loading = false;
        this.cdr.markForCheck();
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
      category: task.category,
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
        for (const group of this.groups) {
          group.items = group.items.filter((i) => i.task?.id !== task.id);
        }
        this.groups = this.groups.filter((g) => g.items.length > 0);
        this.cdr.markForCheck();
      },
    });
  }

  private buildGroups(
    tasks: NodeResponse[],
    occurrences: OccurrenceResponse[],
    members: FamilyMemberResponse[],
    endOfToday: Date,
  ): MemberGroup[] {
    const dueTasks = tasks.filter((t) => !t.isCompleted && t.until && new Date(t.until) < endOfToday);

    const itemsByMemberId = new Map<string, TodayItem[]>();
    const unassigned: TodayItem[] = [];

    const assign = (assignedIds: string[], item: TodayItem) => {
      if (assignedIds.length === 0) {
        unassigned.push(item);
        return;
      }
      for (const id of assignedIds) {
        itemsByMemberId.set(id, [...(itemsByMemberId.get(id) ?? []), item]);
      }
    };

    for (const task of dueTasks) {
      assign(task.assignedFamilyMemberIds, { key: `task-${task.id}`, kind: 'task', title: task.title, time: task.until, task });
    }
    for (const occurrence of occurrences) {
      assign(occurrence.assignedFamilyMemberIds, {
        key: `event-${occurrence.appointmentId}-${occurrence.originalDate}`,
        kind: 'event',
        title: occurrence.title,
        time: occurrence.allDay ? null : occurrence.from,
      });
    }

    const byTime = (a: TodayItem, b: TodayItem) => (a.time ?? '').localeCompare(b.time ?? '');

    const groups: MemberGroup[] = members
      .filter((m) => itemsByMemberId.has(m.id))
      .map((member) => ({ member, items: [...itemsByMemberId.get(member.id)!].sort(byTime) }));

    if (unassigned.length > 0) {
      groups.push({ member: null, items: unassigned.sort(byTime) });
    }

    return groups;
  }
}

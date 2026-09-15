import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { dueTasks, groupByMember, MemberGroup, occurrenceToAgendaItem, taskToAgendaItem } from '../../core/agenda';
import { CalendarApi } from '../../core/calendar';
import { FamilyMembers } from '../../core/family-members';
import { NodeResponse } from '../../core/models';
import { Nodes, toggleTaskCompletionRequest } from '../../core/nodes';

@Component({
  selector: 'app-today',
  templateUrl: './today.page.html',
  standalone: false,
})
export class TodayPage implements OnInit {
  loading = true;
  groups: MemberGroup[] = [];
  todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

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
        const items = [...dueTasks(tasks, endOfToday).map((t) => taskToAgendaItem(t, now)), ...occurrences.map(occurrenceToAgendaItem)];
        this.groups = groupByMember(items, members);
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
    this.nodesApi.update(task.id, toggleTaskCompletionRequest(task, true)).subscribe({
      next: () => {
        for (const group of this.groups) {
          group.items = group.items.filter((i) => i.task?.id !== task.id);
        }
        this.groups = this.groups.filter((g) => g.items.length > 0);
        this.cdr.markForCheck();
      },
    });
  }
}

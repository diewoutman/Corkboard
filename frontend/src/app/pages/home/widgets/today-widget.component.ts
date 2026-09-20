import { SubmitGuard } from '../../../core/submit-guard';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { dueTasks, groupByMember, MemberGroup, occurrenceToAgendaItem, taskToAgendaItem } from '../../../core/agenda';
import { CalendarApi } from '../../../core/calendar';
import { FamilyMembers } from '../../../core/family-members';
import { NodeResponse } from '../../../core/models';
import { Nodes, toggleTaskCompletionRequest } from '../../../core/nodes';

@Component({
  selector: 'app-today-widget',
  templateUrl: './today-widget.component.html',
  standalone: false,
})
export class TodayWidgetComponent implements OnInit {
  /** Ignores a repeated click while that item's update is still in flight (a recurring task would otherwise roll forward twice). */
  readonly updating = new SubmitGuard(inject(ChangeDetectorRef));
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
      tasks: this.nodesApi.list({ type: 'Task', isCompleted: false, dueUntil: endOfToday.toISOString() }),
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
    this.updating.run(this.nodesApi.update(task.id, toggleTaskCompletionRequest(task, true)), task.id).subscribe({
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

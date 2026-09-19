import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AgendaItem, groupByDay, occurrenceToAgendaItem, taskToAgendaItem } from '../../../core/agenda';
import { CalendarApi } from '../../../core/calendar';
import { FamilyMembers } from '../../../core/family-members';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { Nodes, toggleTaskCompletionRequest } from '../../../core/nodes';

const DAYS_AHEAD = 7;

interface DayView {
  dayKey: string;
  date: Date;
  label: string;
  items: AgendaItem[];
}

@Component({
  selector: 'app-upcoming-widget',
  templateUrl: './upcoming-widget.component.html',
  standalone: false,
})
export class UpcomingWidgetComponent implements OnInit {
  loading = true;
  members: FamilyMemberResponse[] = [];
  overdue: AgendaItem[] = [];
  days: DayView[] = [];

  constructor(
    private readonly nodesApi: Nodes,
    private readonly calendarApi: CalendarApi,
    private readonly familyMembersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeEnd = new Date(startOfToday.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

    forkJoin({
      tasks: this.nodesApi.list({ type: 'Task' }),
      occurrences: this.calendarApi.occurrences({ from: startOfToday.toISOString(), until: rangeEnd.toISOString() }),
      members: this.familyMembersApi.list(),
    }).subscribe({
      next: ({ tasks, occurrences, members }) => {
        this.members = members;

        const overdueTasks = tasks.filter((t) => !t.isCompleted && t.until && new Date(t.until) < startOfToday);
        const upcomingTasks = tasks.filter(
          (t) => !t.isCompleted && t.until && new Date(t.until) >= startOfToday && new Date(t.until) < rangeEnd,
        );

        this.overdue = overdueTasks
          .map((t) => taskToAgendaItem(t, now))
          .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

        const items = [...upcomingTasks.map((t) => taskToAgendaItem(t, now)), ...occurrences.map(occurrenceToAgendaItem)];
        const dayDates = Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(startOfToday.getTime() + i * 24 * 60 * 60 * 1000));
        this.days = groupByDay(items, dayDates).map((group) => ({ ...group, label: this.dayLabel(group.date) }));

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
        this.overdue = this.overdue.filter((i) => i.task?.id !== task.id);
        this.days = this.days.map((day) => ({ ...day, items: day.items.filter((i) => i.task?.id !== task.id) }));
        this.cdr.markForCheck();
      },
    });
  }

  private dayLabel(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }
}

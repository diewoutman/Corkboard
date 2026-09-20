import { SubmitGuard } from '../../../core/submit-guard';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
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
  /** Ignores a repeated click while that item's update is still in flight (a recurring task would otherwise roll forward twice). */
  readonly updating = new SubmitGuard(inject(ChangeDetectorRef));
  loading = true;
  members: FamilyMemberResponse[] = [];
  overdue: AgendaItem[] = [];
  days: DayView[] = [];

  constructor(
    private readonly nodesApi: Nodes,
    private readonly calendarApi: CalendarApi,
    private readonly familyMembersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  ngOnInit() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeEnd = new Date(startOfToday.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

    forkJoin({
      tasks: this.nodesApi.list({ type: 'Task', isCompleted: false, dueUntil: rangeEnd.toISOString() }),
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
    this.updating.run(this.nodesApi.update(task.id, toggleTaskCompletionRequest(task, true)), task.id).subscribe({
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
    if (diffDays === 0) return this.transloco.translate('home.upcoming.today');
    if (diffDays === 1) return this.transloco.translate('home.upcoming.tomorrow');
    return date.toLocaleDateString(this.transloco.getActiveLang(), { weekday: 'long' });
  }
}

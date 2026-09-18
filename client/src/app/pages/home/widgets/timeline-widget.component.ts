import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnInit } from '@angular/core';
import { of, switchMap } from 'rxjs';
import {
  currentHourKeyFor,
  currentSegmentKeyFor,
  dueTasks,
  groupByHour,
  groupBySegment,
  occurrenceToAgendaItem,
  taskToAgendaItem,
  TimelineSegment,
} from '../../../core/agenda';
import { Auth } from '../../../core/auth';
import { CalendarApi } from '../../../core/calendar';
import { FamilyMembers } from '../../../core/family-members';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { Nodes, toggleTaskCompletionRequest } from '../../../core/nodes';

/**
 * Today's Tasks and Calendar occurrences as one scrollable timeline. Two layouts share the same
 * TimelineSegment shape (see core/agenda.ts): dayparts (night/morning/afternoon/evening, the
 * default — a widget-sized card has no room for 24 rows read at a glance) or hour-by-hour, both
 * configurable per widget. On load it scrolls straight to the slot containing the current hour.
 */
@Component({
  selector: 'app-timeline-widget',
  templateUrl: './timeline-widget.component.html',
  standalone: false,
})
export class TimelineWidgetComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() assignedToMeOnly: boolean | null = null;
  @Input() hourlyLayout: boolean | null = null;

  loading = true;
  segments: TimelineSegment[] = [];
  members: FamilyMemberResponse[] = [];
  currentKey = '';
  private hasScrolledToCurrentSegment = false;

  constructor(
    private readonly auth: Auth,
    private readonly nodesApi: Nodes,
    private readonly calendarApi: CalendarApi,
    private readonly familyMembersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
    private readonly el: ElementRef<HTMLElement>,
  ) {}

  ngOnInit() {
    this.load();
  }

  /** The layout is fixed once loaded (re-grouping doesn't need a refetch), but the scope does. */
  ngOnChanges() {
    if (!this.loading) this.load();
  }

  private load() {
    this.loading = true;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    this.currentKey = this.hourlyLayout ? currentHourKeyFor(now) : currentSegmentKeyFor(now);
    this.hasScrolledToCurrentSegment = false;

    this.familyMembersApi
      .list()
      .pipe(
        switchMap((members) => {
          const assignedTo = this.assignedToMeOnly ? members.find((m) => m.linkedUserId === this.auth.current()?.userId)?.id : undefined;
          return this.nodesApi.list({ type: 'Task', assignedTo }).pipe(
            switchMap((tasks) =>
              this.calendarApi
                .occurrences({ from: startOfToday.toISOString(), until: endOfToday.toISOString() })
                .pipe(switchMap((occurrences) => of({ tasks, occurrences, members, assignedTo }))),
            ),
          );
        }),
      )
      .subscribe({
        next: ({ tasks, occurrences, members, assignedTo }) => {
          const relevantOccurrences = assignedTo ? occurrences.filter((o) => o.assignedFamilyMemberIds.includes(assignedTo)) : occurrences;
          const items = [
            ...dueTasks(tasks, endOfToday).map((t) => taskToAgendaItem(t, now)),
            ...relevantOccurrences.map(occurrenceToAgendaItem),
          ];
          this.segments = this.hourlyLayout ? groupByHour(items) : groupBySegment(items);
          this.members = members;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Scrolls the timeline to the current segment once, the first time it's actually rendered — the
   * loading indicator swap means it isn't there yet on the initial AfterViewInit, so this checks on
   * every CD cycle (cheap: a no-op once `hasScrolledToCurrentSegment` flips) until it is.
   */
  ngAfterViewChecked() {
    if (this.hasScrolledToCurrentSegment || this.loading) return;
    if (this.isEmpty) {
      this.hasScrolledToCurrentSegment = true;
      return;
    }
    const container = this.el.nativeElement.querySelector<HTMLElement>('[data-scroll-container]');
    const target = this.el.nativeElement.querySelector<HTMLElement>(`[data-segment="${this.currentKey}"]`);
    if (!container || !target) return;
    container.scrollTop = target.offsetTop;
    this.hasScrolledToCurrentSegment = true;
  }

  get isEmpty(): boolean {
    return this.segments.every((s) => s.items.length === 0);
  }

  toggleDone(task: NodeResponse) {
    this.nodesApi.update(task.id, toggleTaskCompletionRequest(task, true)).subscribe({
      next: () => {
        this.segments = this.segments.map((s) => ({ ...s, items: s.items.filter((i) => i.task?.id !== task.id) }));
        this.cdr.markForCheck();
      },
    });
  }
}

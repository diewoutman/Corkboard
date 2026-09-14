import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { FamilyMemberResponse, NodeResponse } from '../../core/models';
import { Nodes } from '../../core/nodes';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: false,
})
export class CalendarPage implements OnInit {
  members: FamilyMemberResponse[] = [];
  events: NodeResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  showNewEventForm = false;
  newEvent = this.emptyNewEvent();

  constructor(
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    forkJoin({
      members: this.membersApi.list(),
      events: this.nodesApi.list({ type: 'Appointment' }),
    }).subscribe({
      next: ({ members, events }) => {
        this.members = members;
        this.events = this.sortEvents(events);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load your calendar. Pull to refresh to try again.';
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
    const ids = this.newEvent.assignedFamilyMemberIds;
    this.newEvent.assignedFamilyMemberIds = ids.includes(memberId)
      ? ids.filter((id) => id !== memberId)
      : [...ids, memberId];
  }

  deleteEvent(event: NodeResponse) {
    this.nodesApi.delete(event.id).subscribe({
      next: () => {
        this.events = this.events.filter((e) => e.id !== event.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not delete that event.';
        this.cdr.markForCheck();
      },
    });
  }

  submitNewEvent() {
    if (!this.newEvent.title || !this.newEvent.start) return;

    this.nodesApi
      .create({
        type: 'Appointment',
        title: this.newEvent.title,
        description: this.newEvent.description || null,
        from: new Date(this.newEvent.start).toISOString(),
        until: this.newEvent.end ? new Date(this.newEvent.end).toISOString() : null,
        assignedFamilyMemberIds: this.newEvent.assignedFamilyMemberIds,
        priority: null,
        location: this.newEvent.location || null,
        allDay: this.newEvent.allDay,
        recurrenceRule: null,
      })
      .subscribe({
        next: (created) => {
          this.events = this.sortEvents([...this.events, created]);
          this.newEvent = this.emptyNewEvent();
          this.showNewEventForm = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that event.');
          this.cdr.markForCheck();
        },
      });
  }

  private sortEvents(events: NodeResponse[]): NodeResponse[] {
    return [...events].sort((a, b) => (a.from ?? a.createdAt).localeCompare(b.from ?? b.createdAt));
  }

  private emptyNewEvent() {
    return {
      title: '',
      description: '',
      location: '',
      start: '',
      end: '',
      allDay: false,
      assignedFamilyMemberIds: [] as string[],
    };
  }
}

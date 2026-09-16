import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { ScheduleEntryRowComponent } from './schedule-entry-row.component';

/** One weekday column in Schedule-editor's 7-column grid. */
@Component({
  selector: 'app-schedule-day-column',
  standalone: true,
  imports: [ScheduleEntryRowComponent],
  template: `
    <div class="rounded-2xl border-2 border-border-soft bg-white p-3 shadow-sticker-sm">
      <h2 class="text-sm font-bold text-ink">{{ label }}</h2>
      <ul class="mt-2 flex flex-col gap-2">
        @for (entry of entries; track entry.id) {
          <app-schedule-entry-row [entry]="entry" [members]="members" (delete)="deleteEntry.emit(entry)" />
        }
        @if (entries.length === 0) {
          <li class="text-xs text-ink-muted">Nothing yet.</li>
        }
      </ul>
    </div>
  `,
})
export class ScheduleDayColumnComponent {
  @Input() label = '';
  @Input() entries: NodeResponse[] = [];
  @Input() members: FamilyMemberResponse[] = [];
  @Output() deleteEntry = new EventEmitter<NodeResponse>();
}

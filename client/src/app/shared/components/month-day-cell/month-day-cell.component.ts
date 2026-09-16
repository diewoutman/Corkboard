import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OccurrenceResponse } from '../../../core/models';

/**
 * A single day cell in Calendar's month grid: date number, up to 3 occurrence chips, "+N more".
 * Router/service-agnostic — `calendarColor` is a resolver function passed in by the page (same
 * pattern `time-grid.component.ts` already uses for the same problem), not a DI'd service.
 *
 * `host: display:contents`: the month grid is a CSS grid, and a grid blockifies (and stretches)
 * whatever element is its *direct* child — that's this component's own `<app-month-day-cell>`
 * tag, not the `<button>` inside it. A bare `<button>` defaults to `display: inline-block` and
 * shrinks to fit its content, so without `contents` here every cell collapsed to the width of its
 * date number and only looked right once an event's `w-full` span happened to be present.
 */
@Component({
  selector: 'app-month-day-cell',
  standalone: true,
  host: { class: 'contents' },
  template: `
    <button
      type="button"
      (click)="daySelected.emit()"
      class="flex min-h-20 flex-col items-start gap-0.5 rounded-xl bg-white p-1.5 text-left shadow-sticker-sm hover:brightness-[0.98]"
      [class.bg-pastel-coral]="selected"
      [class.opacity-40]="!inCurrentMonth"
      [class.ring-2]="isToday"
      [class.ring-coral]="isToday"
    >
      <span class="text-xs font-extrabold text-ink" [class.text-coral]="isToday">{{ date.getDate() }}</span>
      @for (o of occurrences.slice(0, 3); track o.appointmentId + o.originalDate) {
        <span class="w-full truncate rounded-md px-1 text-[10px] font-bold text-white" [style.background]="calendarColor(o.collectionId)">{{ o.title }}</span>
      }
      @if (occurrences.length > 3) {
        <span class="text-[10px] font-bold text-ink-muted">+{{ occurrences.length - 3 }} more</span>
      }
    </button>
  `,
})
export class MonthDayCellComponent {
  @Input({ required: true }) date!: Date;
  @Input() inCurrentMonth = true;
  @Input() isToday = false;
  @Input() selected = false;
  @Input() occurrences: OccurrenceResponse[] = [];
  @Input({ required: true }) calendarColor!: (collectionId: string) => string;
  @Output() daySelected = new EventEmitter<void>();
}

import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * One calendar/schedule row in Calendar's sidebar: visibility checkbox, color dot, name, an
 * actions row, and an optional read-only feed-url field. Calendars and Schedules render this
 * with the same markup today except for which action links/extra content follow — those come in
 * via content projection (`[sourceRowActions]` for the action-link row, the default slot for
 * anything else, e.g. the Calendar-only ".ics" file input) so this component stays agnostic of
 * `routerLink` (the Schedule list's "Edit schedule" link), same reasoning as `ListCardComponent`
 * staying router-agnostic.
 */
@Component({
  selector: 'app-calendar-source-row',
  standalone: true,
  host: { class: 'contents' },
  template: `
    <li class="rounded-2xl bg-white p-2.5 shadow-sticker-sm">
      <div class="flex flex-wrap items-center gap-2">
        <label class="flex flex-1 items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" [checked]="!hidden" (change)="visibilityToggled.emit()" class="rounded-md accent-coral" />
          <span class="h-3 w-3 shrink-0 rounded-full" [style.background]="color"></span>
          <span class="truncate">{{ name }}</span>
        </label>
      </div>
      <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 pl-5 text-xs">
        <ng-content select="[sourceRowActions]"></ng-content>
      </div>
      <ng-content></ng-content>
      @if (feedUrl) {
        <input
          type="text"
          readonly
          [value]="feedUrl"
          onclick="this.select()"
          class="mt-1 ml-5 w-[calc(100%-1.25rem)] rounded-lg border-2 border-border-soft px-2 py-1 text-xs font-semibold text-ink-muted"
        />
      }
    </li>
  `,
})
export class CalendarSourceRowComponent {
  @Input({ required: true }) name!: string;
  @Input({ required: true }) color!: string;
  @Input() hidden = false;
  @Input() feedUrl: string | null | undefined = null;
  @Output() visibilityToggled = new EventEmitter<void>();
}

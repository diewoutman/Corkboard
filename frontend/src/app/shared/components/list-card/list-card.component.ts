import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { isLightColor } from '../../../core/colors';

/**
 * A Lists-page tile: name, progress bar (or "Empty"), text contrast picked from the list's own
 * (user-editable) Color. Router-agnostic on purpose — the page wraps it in
 * `<a [routerLink]="[...]" class="contents">`, since a routerLink directive needs `Router` via DI
 * and this component is meant to render with no injected services.
 */
@Component({
  selector: 'app-list-card',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div
      [style.background]="color"
      [class.text-white]="!isLight"
      [class.text-ink]="isLight"
      class="relative flex min-h-[92px] flex-col justify-between gap-2 rounded-3xl p-5 shadow-sticker transition hover:brightness-105"
    >
      @if (editable) {
        <button
          type="button"
          (click)="$event.preventDefault(); $event.stopPropagation(); edit.emit()"
          class="absolute right-3 top-3 opacity-60 hover:opacity-100"
          [attr.aria-label]="'tasks.edit_list' | transloco"
        >✎</button>
      }
      <span class="pr-6 font-heading text-lg font-bold">{{ name }}</span>
      @if (nodeCount > 0) {
        <div>
          <span class="text-sm font-extrabold" [class.opacity-95]="!isLight" [class.opacity-80]="isLight">{{ 'shared.list_left' | transloco: { left: incompleteCount ?? 0, total: nodeCount } }}</span>
          <div class="mt-1.5 h-1.5 overflow-hidden rounded-full" [class.bg-white/30]="!isLight" [class.bg-ink/15]="isLight">
            <div
              class="h-full rounded-full"
              [class.bg-white]="!isLight"
              [class.bg-ink]="isLight"
              [style.width.%]="((nodeCount - (incompleteCount ?? 0)) / nodeCount) * 100"
            ></div>
          </div>
        </div>
      } @else {
        <span class="text-sm font-extrabold" [class.opacity-90]="!isLight" [class.opacity-70]="isLight">{{ 'shared.empty' | transloco }}</span>
      }
    </div>
  `,
})
export class ListCardComponent {
  @Input() name = '';
  /** Hidden for tiles that aren't a list of their own to edit (the combined Inbox). */
  @Input() editable = true;
  @Input() color = '';
  @Input() nodeCount = 0;
  @Input() incompleteCount: number | null = 0;
  @Output() edit = new EventEmitter<void>();

  get isLight(): boolean {
    return isLightColor(this.color);
  }
}

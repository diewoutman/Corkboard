import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** "Load more" button under a paged list; renders nothing once everything is loaded. */
@Component({
  selector: 'app-load-more',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    @if (visible) {
      <button
        type="button"
        (click)="more.emit()"
        [disabled]="loading"
        class="w-full rounded-full border-2 border-border-soft px-4 py-2 text-sm font-extrabold text-ink-muted hover:bg-cork disabled:opacity-50"
      >
        {{ 'common.load_more' | transloco }}
      </button>
    }
  `,
})
export class LoadMoreComponent {
  @Input() visible = false;
  @Input() loading = false;
  @Output() more = new EventEmitter<void>();
}

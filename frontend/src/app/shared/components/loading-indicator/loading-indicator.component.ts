import { Component, Input } from '@angular/core';

/** The "Loading…" line used while a page's initial data fetch is in flight. */
@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  host: { class: 'block text-center text-sm font-semibold text-ink-muted' },
  template: `{{ text }}`,
})
export class LoadingIndicatorComponent {
  @Input() text = 'Loading…';
}

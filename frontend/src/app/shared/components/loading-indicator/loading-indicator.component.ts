import { Component, Input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** The "Loading…" line used while a page's initial data fetch is in flight. */
@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [TranslocoPipe],
  host: { class: 'block text-center text-sm font-semibold text-ink-muted' },
  template: `{{ text || ('common.loading' | transloco) }}`,
})
export class LoadingIndicatorComponent {
  /** Overrides the default "Loading…" text. */
  @Input() text = '';
}

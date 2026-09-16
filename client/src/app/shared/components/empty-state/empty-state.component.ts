import { Component } from '@angular/core';

/** The dashed empty-state box shown when a list/collection has nothing in it yet. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  host: {
    class:
      'block rounded-3xl border-2 border-dashed border-border-soft px-4 py-8 text-center text-sm font-semibold text-ink-muted',
  },
  template: `<ng-content></ng-content>`,
})
export class EmptyStateComponent {}

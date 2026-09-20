import { ChangeDetectorRef } from '@angular/core';
import { EMPTY, Observable, defer, finalize } from 'rxjs';

/**
 * Stops a create/save action from running twice at once. Wrap the request in run(): while one is in flight a
 * second run() (double click, Enter twice) does nothing, and `busy` drives the disabled state of the submit button.
 * Give each form or action its own guard.
 */
export class SubmitGuard {
  busy = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  run<T>(source$: Observable<T>): Observable<T> {
    return defer(() => {
      if (this.busy) return EMPTY;
      this.busy = true;
      this.cdr.markForCheck();
      return source$.pipe(
        finalize(() => {
          this.busy = false;
          this.cdr.markForCheck();
        }),
      );
    });
  }
}

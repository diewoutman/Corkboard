import { ChangeDetectorRef } from '@angular/core';
import { EMPTY, Observable, defer, finalize } from 'rxjs';

const WHOLE = Symbol('whole');

/**
 * Stops a create/save action from running twice at once. Wrap the request in run(): while one is in flight a
 * second run() (double click, Enter twice) does nothing, and `busy` drives the disabled state of the submit button.
 * Give each form or action its own guard.
 */
export class SubmitGuard {
  private readonly running = new Set<string | typeof WHOLE>();

  constructor(private readonly cdr: ChangeDetectorRef) {}

  /** True while anything is in flight — drives a form's submit button. */
  get busy(): boolean {
    return this.running.size > 0;
  }

  /** True while the action for this key (e.g. an item id being deleted) is in flight. */
  isBusy(key: string): boolean {
    return this.running.has(key);
  }

  /**
   * Without a key the whole guard is exclusive (one form, one request). With a key only a repeat of the same key is
   * ignored, so deleting item A twice is blocked while deleting A and B at once still works.
   */
  run<T>(source$: Observable<T>, key?: string): Observable<T> {
    const slot = key ?? WHOLE;
    return defer(() => {
      if (key === undefined ? this.busy : this.running.has(slot)) return EMPTY;
      this.running.add(slot);
      this.cdr.markForCheck();
      return source$.pipe(
        finalize(() => {
          this.running.delete(slot);
          this.cdr.markForCheck();
        }),
      );
    });
  }
}

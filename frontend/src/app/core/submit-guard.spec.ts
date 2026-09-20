import { ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { SubmitGuard } from './submit-guard';

describe('SubmitGuard', () => {
  const cdr = { markForCheck: () => {} } as ChangeDetectorRef;

  it('runs a second request only after the first has finished', () => {
    const guard = new SubmitGuard(cdr);
    const first = new Subject<string>();
    const results: string[] = [];

    guard.run(first).subscribe((v) => results.push(v));
    expect(guard.busy).toBe(true);

    const second = new Subject<string>();
    guard.run(second).subscribe();
    expect(second.observed).toBe(false);

    first.next('done');
    first.complete();
    expect(results).toEqual(['done']);
    expect(guard.busy).toBe(false);
  });

  it('is released when the request errors', () => {
    const guard = new SubmitGuard(cdr);
    const source = new Subject<void>();
    guard.run(source).subscribe({ error: () => {} });
    source.error(new Error('boom'));
    expect(guard.busy).toBe(false);
  });

  it('a rejected duplicate does not release the guard early', () => {
    const guard = new SubmitGuard(cdr);
    const first = new Subject<void>();
    guard.run(first).subscribe();
    guard.run(new Subject<void>()).subscribe();
    expect(guard.busy).toBe(true);
    first.complete();
    expect(guard.busy).toBe(false);
  });

  it('with a key only blocks a repeat of the same key', () => {
    const guard = new SubmitGuard(cdr);
    const a = new Subject<void>();
    const b = new Subject<void>();
    const repeat = new Subject<void>();

    guard.run(a, 'a').subscribe();
    guard.run(repeat, 'a').subscribe();
    guard.run(b, 'b').subscribe();

    expect(repeat.observed).toBe(false);
    expect(b.observed).toBe(true);
    expect(guard.isBusy('a')).toBe(true);

    a.complete();
    expect(guard.isBusy('a')).toBe(false);
    expect(guard.isBusy('b')).toBe(true);
  });
});

import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from './auth';

/**
 * One Idempotency-Key per request object, so a retry of the very same request (the `retry` operator, a
 * re-subscribe) reuses it and the API can answer with the first result instead of creating a second row.
 * Two separate user actions are separate request objects and never share a key.
 */
const idempotencyKeys = new WeakMap<HttpRequest<unknown>, string>();

/** crypto.randomUUID() only exists in secure contexts, and a NAS is often reached over plain http on the LAN. */
function newKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

function idempotencyKey(req: HttpRequest<unknown>): string {
  let key = idempotencyKeys.get(req);
  if (!key) {
    key = newKey();
    idempotencyKeys.set(req, key);
  }
  return key;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(Auth).token;
  if (!token) return next(req);

  const setHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (req.method === 'POST') setHeaders['Idempotency-Key'] = idempotencyKey(req);
  return next(req.clone({ setHeaders }));
};

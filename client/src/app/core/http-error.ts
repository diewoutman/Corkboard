import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extracts a readable message from an API error response. Handles both a
 * plain ProblemDetails body ({title, detail}) and ASP.NET Core's
 * ValidationProblem shape ({title, errors: {field: [messages]}}), where the
 * title alone ("One or more validation errors occurred.") is useless on its
 * own — the actual reason lives in `errors`.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const body = err instanceof HttpErrorResponse ? err.error : (err as { error?: unknown })?.error;
  if (!body || typeof body !== 'object') return fallback;

  const { title, detail, errors } = body as { title?: string; detail?: string; errors?: Record<string, string[]> };

  if (errors && typeof errors === 'object') {
    const messages = Object.values(errors).flat();
    if (messages.length > 0) return messages.join(' ');
  }

  return detail ?? title ?? fallback;
}

import { NodeResponse } from './models';

/** Overdue in red, due today/tomorrow in amber — a due date shouldn't read the same whether it's next month or yesterday. */
export function dueClass(task: Pick<NodeResponse, 'isCompleted' | 'until'>): string {
  if (task.isCompleted || !task.until) return 'font-semibold text-ink-muted';
  const until = new Date(task.until);
  const now = new Date();
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  if (until < now) return 'font-extrabold text-danger';
  if (until < endOfTomorrow) return 'font-extrabold text-lotte';
  return 'font-semibold text-ink-muted';
}

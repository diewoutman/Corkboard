import { Service, inject } from '@angular/core';
import { map } from 'rxjs';
import { Nodes } from './nodes';

@Service()
export class DueSummary {
  private readonly nodesApi = inject(Nodes);

  /** Count of incomplete Tasks due today or earlier — the nagging badge the app doesn't otherwise have (no push/email infra exists yet). */
  dueTodayCount() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return this.nodesApi
      .list({ type: 'Task' })
      .pipe(map((tasks) => tasks.filter((t) => !t.isCompleted && t.until && new Date(t.until) <= endOfToday).length));
  }
}

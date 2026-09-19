import { Service, inject } from '@angular/core';
import { map } from 'rxjs';
import { Nodes } from './nodes';

@Service()
export class DueSummary {
  private readonly nodesApi = inject(Nodes);

  /** Count of incomplete Tasks due today or earlier — the nagging badge the app doesn't otherwise have (no push/email infra exists yet). */
  dueTodayCount() {
    const startOfTomorrow = new Date();
    startOfTomorrow.setHours(24, 0, 0, 0);
    // Only the total matters, so ask for a page of one and read the count from the header.
    return this.nodesApi
      .listPage({ type: 'Task', isCompleted: false, dueUntil: startOfTomorrow.toISOString(), pageSize: 1 })
      .pipe(map((page) => page.total));
  }
}

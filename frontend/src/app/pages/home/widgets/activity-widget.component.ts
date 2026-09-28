import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivityApi } from '../../../core/activity';
import { ActivityResponse } from '../../../core/models';

@Component({
  selector: 'app-activity-widget',
  templateUrl: './activity-widget.component.html',
  standalone: false,
})
export class ActivityWidgetComponent implements OnInit {
  activities: ActivityResponse[] = [];
  loading = true;

  constructor(private readonly activityApi: ActivityApi, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.activityApi.list().subscribe({
      next: ({ items }) => {
        this.activities = items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  subjectRoute(activity: ActivityResponse): string {
    return activity.subjectType === 'Note' ? '/notes' : activity.subjectType === 'Task' ? '/tasks' : '/calendar';
  }
}

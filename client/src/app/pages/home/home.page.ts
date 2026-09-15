import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Collections } from '../../core/collections';
import { Dashboard } from '../../core/dashboard';
import { Families } from '../../core/families';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, DashboardWidgetResponse, DashboardWidgetType } from '../../core/models';
import { TILE_DEFS } from './tile-defs';

interface WidgetFormState {
  type: DashboardWidgetType;
  tileOrder: string[];
  importantOnly: boolean;
  taskMode: 'list' | 'assignedToMe';
  collectionId: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  /** Fixed number of grid columns the dashboard lays widgets out in — mirrors DashboardController.ColumnCount. */
  static readonly COLUMN_COUNT = 3;

  familyName: string | null = null;

  widgets: DashboardWidgetResponse[] = [];
  taskLists: CollectionResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  showWidgetForm = false;
  editingWidgetId: string | null = null;
  widgetForm = this.emptyWidgetForm();

  constructor(
    private readonly familiesApi: Families,
    private readonly dashboardApi: Dashboard,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.familiesApi.mine().subscribe({
      next: (family) => {
        this.familyName = family.name;
        this.cdr.markForCheck();
      },
      error: () => {},
    });

    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    forkJoin({
      widgets: this.dashboardApi.list(),
      taskLists: this.collectionsApi.list({ type: 'TaskList' }),
    }).subscribe({
      next: ({ widgets, taskLists }) => {
        this.widgets = [...widgets].sort((a, b) => a.sortOrder - b.sortOrder);
        this.taskLists = taskLists;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load your dashboard. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  tileTitle(key: string): string {
    return TILE_DEFS.find((t) => t.key === key)?.title ?? key;
  }

  widgetTitle(widget: DashboardWidgetResponse): string {
    switch (widget.type) {
      case 'Navigation':
        return 'Navigation';
      case 'Notes':
        return widget.importantOnly ? 'Important notes' : 'Notes';
      case 'Tasks':
        return widget.collectionId ? this.taskLists.find((l) => l.id === widget.collectionId)?.name ?? 'Tasks' : 'My tasks';
      case 'Today':
        return 'Today';
    }
  }

  drop(event: CdkDragDrop<DashboardWidgetResponse[]>) {
    moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);
    this.dashboardApi.reorder({ orderedWidgetIds: this.widgets.map((w) => w.id) }).subscribe({
      error: () => {
        this.errorMessage = 'Could not save the new widget order.';
        this.reload();
      },
    });
  }

  /** Tailwind's grid column-span scale is fixed at build time, so spell each step out literally for the content scanner to find. */
  widgetSpanClass(widget: DashboardWidgetResponse): string {
    switch (widget.span) {
      case 3:
        return 'col-span-1 sm:col-span-3';
      case 2:
        return 'col-span-1 sm:col-span-2';
      default:
        return 'col-span-1';
    }
  }

  /** Cycles a widget's width: 1/3 → 2/3 → full width → back to 1/3. */
  cycleWidgetWidth(widget: DashboardWidgetResponse) {
    const nextSpan = (widget.span % HomePage.COLUMN_COUNT) + 1;
    const previousSpan = widget.span;
    widget.span = nextSpan;
    this.dashboardApi.updateSpan(widget.id, { span: nextSpan }).subscribe({
      error: () => {
        widget.span = previousSpan;
        this.errorMessage = 'Could not resize that widget.';
        this.cdr.markForCheck();
      },
    });
  }

  dropTile(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.widgetForm.tileOrder, event.previousIndex, event.currentIndex);
  }

  openAddWidgetForm() {
    this.editingWidgetId = null;
    this.widgetForm = this.emptyWidgetForm();
    this.showWidgetForm = true;
  }

  openEditWidgetForm(widget: DashboardWidgetResponse) {
    this.editingWidgetId = widget.id;
    this.widgetForm = {
      type: widget.type,
      tileOrder: widget.tileOrder && widget.tileOrder.length > 0 ? widget.tileOrder : TILE_DEFS.map((t) => t.key),
      importantOnly: widget.importantOnly ?? false,
      taskMode: widget.collectionId ? 'list' : 'assignedToMe',
      collectionId: widget.collectionId ?? '',
    };
    this.showWidgetForm = true;
  }

  cancelWidgetForm() {
    this.showWidgetForm = false;
    this.editingWidgetId = null;
  }

  submitWidgetForm() {
    const isTasksList = this.widgetForm.type === 'Tasks' && this.widgetForm.taskMode === 'list';

    const config = {
      tileOrder: this.widgetForm.type === 'Navigation' ? this.widgetForm.tileOrder : null,
      importantOnly: this.widgetForm.type === 'Notes' ? this.widgetForm.importantOnly : null,
      collectionId: isTasksList ? this.widgetForm.collectionId || null : null,
      assignedToMeOnly: this.widgetForm.type === 'Tasks' ? !isTasksList : null,
    };

    const request$ = this.editingWidgetId
      ? this.dashboardApi.update(this.editingWidgetId, config)
      : this.dashboardApi.create({ type: this.widgetForm.type, ...config });

    request$.subscribe({
      next: (saved) => {
        this.widgets = this.editingWidgetId
          ? this.widgets.map((w) => (w.id === saved.id ? saved : w))
          : [...this.widgets, saved];
        this.showWidgetForm = false;
        this.editingWidgetId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, 'Could not save that widget.');
        this.cdr.markForCheck();
      },
    });
  }

  removeWidget(widget: DashboardWidgetResponse) {
    this.dashboardApi.delete(widget.id).subscribe({
      next: () => {
        this.widgets = this.widgets.filter((w) => w.id !== widget.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not remove that widget.';
        this.cdr.markForCheck();
      },
    });
  }

  private emptyWidgetForm(): WidgetFormState {
    return {
      type: 'Notes',
      tileOrder: TILE_DEFS.map((t) => t.key),
      importantOnly: false,
      taskMode: 'assignedToMe',
      collectionId: '',
    };
  }
}

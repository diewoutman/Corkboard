import { SubmitGuard } from '../../core/submit-guard';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { Auth } from '../../core/auth';
import { Collections } from '../../core/collections';
import { Dashboard } from '../../core/dashboard';
import { Families } from '../../core/families';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, DashboardWidgetResponse, DashboardWidgetScope, DashboardWidgetType } from '../../core/models';
import { SegmentedControlOption } from '../../shared/components/segmented-control/segmented-control.component';
import { TILE_DEFS } from './tile-defs';

interface WidgetFormState {
  type: DashboardWidgetType;
  showPanel: boolean;
  tileOrder: string[];
  tileKey: string;
  importantOnly: boolean;
  taskMode: 'list' | 'assignedToMe';
  collectionId: string;
  timelineScope: 'family' | 'assignedToMe';
  timelineLayout: 'segments' | 'hourly';
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  /** Ignores a repeated click on delete while that item's request is still in flight. */
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  /** Blocks a second submit (double click, Enter twice) while a create/save request is in flight. */
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));
  /** Fixed number of grid columns the dashboard lays widgets out in — mirrors DashboardController.ColumnCount. */
  static readonly COLUMN_COUNT = 3;

  readonly tileDefs = TILE_DEFS;

  readonly dashboardOptions: SegmentedControlOption[] = [
    { value: 'Family', label: this.transloco.translate('home.scope.family') },
    { value: 'Personal', label: this.transloco.translate('home.scope.personal') },
  ];

  familyName: string | null = null;

  dashboardScope: DashboardWidgetScope = 'Personal';
  widgets: DashboardWidgetResponse[] = [];
  taskLists: CollectionResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  showWidgetForm = false;
  editingWidgetId: string | null = null;
  widgetForm = this.emptyWidgetForm();

  constructor(
    readonly auth: Auth,
    private readonly familiesApi: Families,
    private readonly dashboardApi: Dashboard,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  /** Personal is always editable by its owner; Family only by an Owner/Adult admin. */
  get editableDashboard(): boolean {
    return this.dashboardScope === 'Personal' || this.auth.isAdmin();
  }

  switchDashboard(scope: string) {
    this.dashboardScope = scope as DashboardWidgetScope;
    this.reload();
  }

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
      widgets: this.dashboardApi.list(this.dashboardScope),
      taskLists: this.collectionsApi.list({ type: 'TaskList' }),
    }).subscribe({
      next: ({ widgets, taskLists }) => {
        this.widgets = [...widgets].sort((a, b) => a.sortOrder - b.sortOrder);
        this.taskLists = taskLists;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('home.errors.load');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  tileTitle(key: string): string {
    const tile = TILE_DEFS.find((t) => t.key === key);
    return tile ? this.transloco.translate(tile.titleKey) : key;
  }

  widgetTitle(widget: DashboardWidgetResponse): string {
    switch (widget.type) {
      case 'Navigation':
        return this.transloco.translate('home.widget_titles.navigation');
      case 'Notes':
        return this.transloco.translate(widget.importantOnly ? 'home.widget_titles.important_notes' : 'home.widget_titles.notes');
      case 'Tasks':
        return widget.collectionId
          ? this.taskLists.find((l) => l.id === widget.collectionId)?.name ?? this.transloco.translate('home.widget_titles.tasks')
          : this.transloco.translate('home.widget_titles.my_tasks');
      case 'Today':
        return this.transloco.translate('home.widget_titles.today');
      case 'Upcoming':
        return this.transloco.translate('home.widget_titles.upcoming');
      case 'Shortcut':
        return this.tileTitle(widget.tileKey ?? '');
      case 'Timeline':
        return this.transloco.translate('home.widget_titles.timeline');
    }
  }

  drop(event: CdkDragDrop<DashboardWidgetResponse[]>) {
    moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);
    this.dashboardApi.reorder(this.dashboardScope, { orderedWidgetIds: this.widgets.map((w) => w.id) }).subscribe({
      error: () => {
        this.errorMessage = this.transloco.translate('home.errors.reorder');
        this.reload();
      },
    });
  }

  /**
   * The grid is 12 columns wide (finer than the 3 logical columns Span is expressed in) so a
   * Shortcut's small fixed span can sit next to another one on the same row instead of claiming a
   * full 1/3-width track. Tailwind's grid column-span scale is fixed at build time, so spell each
   * step out literally for the content scanner to find.
   */
  widgetSpanClass(widget: DashboardWidgetResponse): string {
    if (widget.type === 'Shortcut') {
      return 'col-span-6 sm:col-span-4 lg:col-span-2';
    }
    switch (widget.span) {
      case 3:
        return 'col-span-12';
      case 2:
        return 'col-span-12 lg:col-span-8';
      default:
        return 'col-span-12 sm:col-span-6 lg:col-span-4';
    }
  }

  /** Resize (↔) only makes sense for span-driven widgets — a Shortcut's size is fixed. */
  isResizable(widget: DashboardWidgetResponse): boolean {
    return widget.type !== 'Shortcut';
  }

  /** Cycles a widget's width: 1/3 → 2/3 → full width → back to 1/3. */
  cycleWidgetWidth(widget: DashboardWidgetResponse) {
    const nextSpan = (widget.span % HomePage.COLUMN_COUNT) + 1;
    const previousSpan = widget.span;
    widget.span = nextSpan;
    this.dashboardApi.updateSpan(widget.id, { span: nextSpan }).subscribe({
      error: () => {
        widget.span = previousSpan;
        this.errorMessage = this.transloco.translate('home.errors.resize');
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
      showPanel: widget.showPanel,
      tileOrder: widget.tileOrder && widget.tileOrder.length > 0 ? widget.tileOrder : TILE_DEFS.map((t) => t.key),
      tileKey: widget.tileKey ?? TILE_DEFS[0].key,
      importantOnly: widget.importantOnly ?? false,
      taskMode: widget.collectionId ? 'list' : 'assignedToMe',
      collectionId: widget.collectionId ?? '',
      timelineScope: widget.assignedToMeOnly ? 'assignedToMe' : 'family',
      timelineLayout: widget.hourlyLayout ? 'hourly' : 'segments',
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
      showPanel: this.widgetForm.showPanel,
      tileOrder: this.widgetForm.type === 'Navigation' ? this.widgetForm.tileOrder : null,
      tileKey: this.widgetForm.type === 'Shortcut' ? this.widgetForm.tileKey : null,
      importantOnly: this.widgetForm.type === 'Notes' ? this.widgetForm.importantOnly : null,
      collectionId: isTasksList ? this.widgetForm.collectionId || null : null,
      assignedToMeOnly:
        this.widgetForm.type === 'Tasks'
          ? !isTasksList
          : this.widgetForm.type === 'Timeline'
            ? this.widgetForm.timelineScope === 'assignedToMe'
            : null,
      hourlyLayout: this.widgetForm.type === 'Timeline' ? this.widgetForm.timelineLayout === 'hourly' : null,
    };

    const request$ = this.editingWidgetId
      ? this.dashboardApi.update(this.editingWidgetId, config)
      : this.dashboardApi.create({ type: this.widgetForm.type, scope: this.dashboardScope, ...config });

    this.submit.run(request$).subscribe({
      next: (saved) => {
        this.widgets = this.editingWidgetId
          ? this.widgets.map((w) => (w.id === saved.id ? saved : w))
          : [...this.widgets, saved];
        this.showWidgetForm = false;
        this.editingWidgetId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('home.errors.save'));
        this.cdr.markForCheck();
      },
    });
  }

  removeWidget(widget: DashboardWidgetResponse) {
    this.removing.run(this.dashboardApi.delete(widget.id), widget.id).subscribe({
      next: () => {
        this.widgets = this.widgets.filter((w) => w.id !== widget.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('home.errors.remove');
        this.cdr.markForCheck();
      },
    });
  }

  private emptyWidgetForm(): WidgetFormState {
    return {
      type: 'Notes',
      showPanel: true,
      tileOrder: TILE_DEFS.map((t) => t.key),
      tileKey: TILE_DEFS[0].key,
      importantOnly: false,
      taskMode: 'assignedToMe',
      collectionId: '',
      timelineScope: 'family',
      timelineLayout: 'segments',
    };
  }
}

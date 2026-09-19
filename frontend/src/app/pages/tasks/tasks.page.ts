import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { Collections, NULL_HOUSEHOLD_FIELDS } from '../../core/collections';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, CollectionScope } from '../../core/models';
import { PALETTE } from '../../core/colors';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false,
})
export class TasksPage implements OnInit, OnDestroy {
  readonly scopes: CollectionScope[] = ['Family', 'Personal'];
  lists: CollectionResponse[] = [];
  loading = true;
  /** A list is open in the right-hand pane; on phones the pane then replaces the sidebar. */
  hasSelection = false;
  errorMessage: string | null = null;

  showNewListForm = false;
  editingList: CollectionResponse | null = null;
  newListName = '';
  newListColor = PALETTE[0];
  newListScope: CollectionScope = 'Family';
  submitting = false;

  constructor(
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
    private readonly router: Router,
  ) {}

  private navSub?: Subscription;

  ngOnInit() {
    this.reload();
    // Wide screens always show a list next to the sidebar, so a bare /tasks lands on the Inbox.
    this.navSub = this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      const path = e.urlAfterRedirects.split(/[?#]/)[0];
      if (path === '/tasks' && window.matchMedia('(min-width: 768px)').matches) {
        this.router.navigate(['/tasks/all'], { replaceUrl: true });
      }
    });
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }

  onSelectionChange(active: boolean) {
    this.hasSelection = active;
    // Counts in the sidebar go stale as tasks are checked off in the pane; refresh quietly on each navigation.
    if (active) this.reload(true);
    this.cdr.markForCheck();
  }

  /** The Family and Personal Inbox, shown as one combined tile. */
  get inboxes(): CollectionResponse[] {
    return this.lists.filter((l) => l.isInbox);
  }

  /** Open tasks across every list in the sidebar, for the "All" entry. */
  get totalIncompleteCount(): number {
    return this.lists.filter((l) => !l.isSystemManaged).reduce((sum, l) => sum + (l.incompleteCount ?? 0), 0);
  }

  get inboxNodeCount(): number {
    return this.inboxes.reduce((sum, l) => sum + l.nodeCount, 0);
  }

  get inboxIncompleteCount(): number {
    return this.inboxes.reduce((sum, l) => sum + (l.incompleteCount ?? 0), 0);
  }

  /** Lists you can open in the tasks UI — system-managed lists and the Inboxes are shown elsewhere or not at all. */
  listsIn(scope: CollectionScope): CollectionResponse[] {
    return this.lists.filter((l) => l.scope === scope && !l.isInbox && !l.isSystemManaged);
  }

  reload(quiet = false) {
    this.loading = !quiet;
    this.errorMessage = null;
    this.collectionsApi.list({ type: 'TaskList' }).subscribe({
      next: (lists) => {
        this.lists = lists;
        this.newListColor = PALETTE[lists.length % PALETTE.length];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('tasks.errors.load');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openAddListForm() {
    this.editingList = null;
    this.newListName = '';
    this.newListScope = 'Family';
    this.newListColor = PALETTE[this.lists.length % PALETTE.length];
    this.showNewListForm = true;
  }

  openEditListForm(list: CollectionResponse) {
    this.editingList = list;
    this.newListName = list.name;
    this.newListColor = list.color;
    this.showNewListForm = true;
  }

  closeListForm() {
    this.showNewListForm = false;
    this.editingList = null;
  }

  submitListForm() {
    if (!this.newListName) return;

    this.submitting = true;
    const request$ = this.editingList
      ? this.collectionsApi.update(this.editingList.id, { name: this.newListName, color: this.newListColor, ...NULL_HOUSEHOLD_FIELDS })
      : this.collectionsApi.create({ name: this.newListName, type: 'TaskList', color: this.newListColor, parentCollectionId: null, scope: this.newListScope, ...NULL_HOUSEHOLD_FIELDS });

    const wasEditing = !!this.editingList;
    request$.subscribe({
      next: (saved) => {
        this.lists = (wasEditing ? this.lists.map((l) => (l.id === saved.id ? saved : l)) : [...this.lists, saved]).sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        this.newListColor = PALETTE[this.lists.length % PALETTE.length];
        this.closeListForm();
        this.submitting = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(wasEditing ? 'tasks.errors.save' : 'tasks.errors.create'));
        this.submitting = false;
        this.cdr.markForCheck();
      },
    });
  }
}

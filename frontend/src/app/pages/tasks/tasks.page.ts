import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
export class TasksPage implements OnInit {
  readonly scopes: CollectionScope[] = ['Family', 'Personal'];
  lists: CollectionResponse[] = [];
  loading = true;
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
  ) {}

  ngOnInit() {
    this.reload();
  }

  /** The Family and Personal Inbox, shown as one combined tile. */
  get inboxes(): CollectionResponse[] {
    return this.lists.filter((l) => l.isInbox);
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

  reload() {
    this.loading = true;
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

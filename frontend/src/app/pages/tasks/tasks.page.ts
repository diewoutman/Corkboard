import { SubmitGuard } from '../../core/submit-guard';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { Collections, NULL_HOUSEHOLD_FIELDS } from '../../core/collections';
import { Nodes, toUpdateRequest } from '../../core/nodes';
import { TaskEvents } from '../../core/task-events';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, CollectionScope, NodeResponse } from '../../core/models';
import { TASK_DRAG_TYPE } from '../../shared/components/task-row/task-row.component';
import { PALETTE } from '../../core/colors';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false,
})
export class TasksPage implements OnInit, OnDestroy {
  /** Ignores a repeated click on delete while that item's request is still in flight. */
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  readonly scopes: CollectionScope[] = ['Family', 'Personal'];
  lists: CollectionResponse[] = [];
  loading = true;
  /** A list is open in the right-hand pane; on phones the pane then replaces the sidebar. */
  hasSelection = false;
  /** The list a dragged task is currently hovering over. */
  dropTargetId: string | null = null;
  confirmingDelete = false;
  private moveSub?: Subscription;
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
    private readonly nodesApi: Nodes,
    private readonly events: TaskEvents,
  ) {}

  ngOnInit() {
    this.reload();
    this.moveSub = this.events.moved.subscribe(() => this.reload(true));
  }

  ngOnDestroy() {
    this.moveSub?.unsubscribe();
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
    this.confirmingDelete = false;
  }

  /** Deleting a list deletes its tasks with it, so the modal asks twice (the second time with the count). */
  deleteList() {
    const list = this.editingList;
    if (!list) return;

    this.removing.run(this.collectionsApi.delete(list.id), list.id).subscribe({
      next: () => {
        this.lists = this.lists.filter((l) => l.id !== list.id);
        this.closeListForm();
        if (this.router.url.split(/[?#]/)[0] === `/tasks/${list.id}`) this.router.navigate(['/tasks/all'], { replaceUrl: true });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('tasks.errors.delete'));
        this.closeListForm();
        this.cdr.markForCheck();
      },
    });
  }

  // --- Drag a task onto a list in the sidebar to move it there ---

  /** Where a dropped task goes: a list itself, or the Personal Inbox for the combined Inbox entry. */
  canAcceptDrop(event: DragEvent): boolean {
    return !!event.dataTransfer?.types.includes(TASK_DRAG_TYPE);
  }

  onDragOver(event: DragEvent, targetId: string) {
    if (!this.canAcceptDrop(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dropTargetId = targetId;
  }

  onDragLeave(targetId: string) {
    if (this.dropTargetId === targetId) this.dropTargetId = null;
  }

  onDrop(event: DragEvent, targetId: string) {
    this.dropTargetId = null;
    const raw = event.dataTransfer?.getData(TASK_DRAG_TYPE);
    if (!raw) return;
    event.preventDefault();

    const task = JSON.parse(raw) as NodeResponse;
    if (task.collectionId === targetId) return;

    // The task's Section belongs to its old list, so it lands unsectioned in the new one.
    this.nodesApi.update(task.id, toUpdateRequest(task, { collectionId: targetId, sectionId: null })).subscribe({
      next: () => {
        this.events.moved.next();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('task_list.errors.update');
        this.cdr.markForCheck();
      },
    });
  }

  submitListForm() {
    if (!this.newListName || this.submitting) return;

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

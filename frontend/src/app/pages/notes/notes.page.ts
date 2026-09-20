import { CreateFab } from '../../core/create-fab';
import { SubmitGuard } from '../../core/submit-guard';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Subscription, forkJoin } from 'rxjs';
import { FamilyMembers } from '../../core/family-members';
import { FamilyMemberResponse, NodeResponse } from '../../core/models';
import { Nodes, toUpdateRequest } from '../../core/nodes';
import { PagedList } from '../../core/paging';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss'],
  standalone: false,
})
export class NotesPage implements OnInit, OnDestroy {
  private readonly createFab = inject(CreateFab);
  private unregisterFab?: () => void;
  private createdSub?: Subscription;
  /** Ignores a repeated click while that item's update is still in flight (a recurring task would otherwise roll forward twice). */
  readonly updating = new SubmitGuard(inject(ChangeDetectorRef));
  /** Ignores a repeated click on delete while that item's request is still in flight. */
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  members: FamilyMemberResponse[] = [];
  readonly noteList = new PagedList<NodeResponse>((page) => this.nodesApi.listPage({ type: 'Note', sort: '-important', page }));
  loading = true;
  errorMessage: string | null = null;

  /** The note being edited in the editor sheet (new notes come from the app's "+" sheet). */
  editingNote: NodeResponse | null = null;

  constructor(
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  /** Makes the app's "+" button open this page's editor. */
  private registerFab() {
    this.unregisterFab?.();
    this.unregisterFab = this.createFab.register({ kind: 'note' });
  }

  ngOnDestroy() {
    this.unregisterFab?.();
    this.createdSub?.unsubscribe();
  }

  ngOnInit() {
    this.registerFab();
    // A note made from the app's "+" sheet: show it here.
    this.createdSub = this.createFab.created.subscribe((kind) => kind === 'note' && this.reload(true));
    this.reload();
  }

  get notes(): NodeResponse[] {
    return this.noteList.items;
  }

  reload(quiet = false) {
    this.loading = !quiet;
    this.errorMessage = null;
    forkJoin({
      members: this.membersApi.list(),
      notes: this.noteList.first(),
    }).subscribe({
      next: ({ members }) => {
        this.members = members;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('notes.errors.load');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleImportant(note: NodeResponse) {
    this.updating.run(this.nodesApi.update(note.id, toUpdateRequest(note, { isImportant: !note.isImportant })), note.id).subscribe({
      next: () => this.reload(true),
      error: () => {
        this.errorMessage = this.transloco.translate('notes.errors.update');
        this.cdr.markForCheck();
      },
    });
  }

  deleteNote(note: NodeResponse) {
    this.removing.run(this.nodesApi.delete(note.id), note.id).subscribe({
      next: () => this.reload(true),
      error: () => {
        this.errorMessage = this.transloco.translate('notes.errors.delete');
        this.cdr.markForCheck();
      },
    });
  }

  openEditNoteForm(note: NodeResponse) {
    this.editingNote = note;
  }

  closeNoteForm() {
    this.editingNote = null;
  }

  onNoteSaved() {
    this.closeNoteForm();
    this.reload(true);
  }

  loadMore() {
    this.noteList.loadingMore = true;
    this.noteList.more().subscribe({
      next: () => this.finishLoadMore(),
      error: () => {
        this.errorMessage = this.transloco.translate('notes.errors.load');
        this.finishLoadMore();
      },
    });
  }

  private finishLoadMore() {
    this.noteList.loadingMore = false;
    this.cdr.markForCheck();
  }
}

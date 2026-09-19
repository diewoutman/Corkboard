import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { FamilyMemberResponse, NodeResponse, UpdateNodeRequest } from '../../core/models';
import { NULL_CONTACT_FIELDS, Nodes } from '../../core/nodes';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss'],
  standalone: false,
})
export class NotesPage implements OnInit {
  members: FamilyMemberResponse[] = [];
  notes: NodeResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  showNewNoteForm = false;
  editingNote: NodeResponse | null = null;
  newNote = this.emptyNewNote();

  constructor(
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    forkJoin({
      members: this.membersApi.list(),
      notes: this.nodesApi.list({ type: 'Note' }),
    }).subscribe({
      next: ({ members, notes }) => {
        this.members = members;
        this.notes = this.sortNotes(notes);
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

  toggleAssignee(memberId: string) {
    const ids = this.newNote.assignedFamilyMemberIds;
    this.newNote.assignedFamilyMemberIds = ids.includes(memberId)
      ? ids.filter((id) => id !== memberId)
      : [...ids, memberId];
  }

  toggleImportant(note: NodeResponse) {
    this.nodesApi.update(note.id, this.toUpdateRequest(note, { isImportant: !note.isImportant })).subscribe({
      next: (updated) => {
        this.notes = this.sortNotes(this.notes.map((n) => (n.id === updated.id ? updated : n)));
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('notes.errors.update');
        this.cdr.markForCheck();
      },
    });
  }

  deleteNote(note: NodeResponse) {
    this.nodesApi.delete(note.id).subscribe({
      next: () => {
        this.notes = this.notes.filter((n) => n.id !== note.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('notes.errors.delete');
        this.cdr.markForCheck();
      },
    });
  }

  openAddNoteForm() {
    this.editingNote = null;
    this.newNote = this.emptyNewNote();
    this.showNewNoteForm = true;
  }

  openEditNoteForm(note: NodeResponse) {
    this.editingNote = note;
    this.newNote = {
      title: note.title,
      description: note.description ?? '',
      assignedFamilyMemberIds: [...note.assignedFamilyMemberIds],
      isImportant: !!note.isImportant,
    };
    this.showNewNoteForm = true;
  }

  closeNoteForm() {
    this.showNewNoteForm = false;
    this.editingNote = null;
  }

  submitNoteForm() {
    if (!this.newNote.title) return;

    const request$ = this.editingNote
      ? this.nodesApi.update(
          this.editingNote.id,
          this.toUpdateRequest(this.editingNote, {
            title: this.newNote.title,
            description: this.newNote.description || null,
            assignedFamilyMemberIds: this.newNote.assignedFamilyMemberIds,
            isImportant: this.newNote.isImportant,
          }),
        )
      : this.nodesApi.create({
          type: 'Note',
          title: this.newNote.title,
          description: this.newNote.description || null,
          from: null,
          until: null,
          assignedFamilyMemberIds: this.newNote.assignedFamilyMemberIds,
          collectionId: null,
          isImportant: this.newNote.isImportant,
          priority: null,
          category: null,
          location: null,
          allDay: null,
          recurrenceRule: null,
          ...NULL_CONTACT_FIELDS,
        });

    const wasEditing = !!this.editingNote;
    request$.subscribe({
      next: (saved) => {
        this.notes = this.sortNotes(wasEditing ? this.notes.map((n) => (n.id === saved.id ? saved : n)) : [...this.notes, saved]);
        this.closeNoteForm();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(wasEditing ? 'notes.errors.save' : 'notes.errors.create'));
        this.cdr.markForCheck();
      },
    });
  }

  private toUpdateRequest(note: NodeResponse, overrides: Partial<UpdateNodeRequest>): UpdateNodeRequest {
    return {
      title: note.title,
      description: note.description,
      from: note.from,
      until: note.until,
      assignedFamilyMemberIds: note.assignedFamilyMemberIds,
      collectionId: note.collectionId,
      isImportant: note.isImportant,
      isCompleted: null,
      priority: null,
      category: null,
      location: null,
      allDay: null,
      recurrenceRule: null,
      firstName: null,
      lastName: null,
      dateOfBirth: null,
      street: null,
      city: null,
      postalCode: null,
      country: null,
      phoneNumbers: null,
      emails: null,
      ...overrides,
    };
  }

  private sortNotes(notes: NodeResponse[]): NodeResponse[] {
    return [...notes].sort((a, b) => {
      if (!!a.isImportant !== !!b.isImportant) return a.isImportant ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  private emptyNewNote() {
    return {
      title: '',
      description: '',
      assignedFamilyMemberIds: [] as string[],
      isImportant: false,
    };
  }
}

import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { FamilyMemberResponse, NodeResponse } from '../../core/models';
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
  newNote = this.emptyNewNote();

  constructor(
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
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
        this.errorMessage = 'Could not load your notes. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  memberName(id: string): string {
    return this.members.find((m) => m.id === id)?.displayName ?? '?';
  }

  memberColor(id: string): string {
    return this.members.find((m) => m.id === id)?.color ?? '#999';
  }

  toggleAssignee(memberId: string) {
    const ids = this.newNote.assignedFamilyMemberIds;
    this.newNote.assignedFamilyMemberIds = ids.includes(memberId)
      ? ids.filter((id) => id !== memberId)
      : [...ids, memberId];
  }

  deleteNote(note: NodeResponse) {
    this.nodesApi.delete(note.id).subscribe({
      next: () => {
        this.notes = this.notes.filter((n) => n.id !== note.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not delete that note.';
        this.cdr.markForCheck();
      },
    });
  }

  submitNewNote() {
    if (!this.newNote.title) return;

    this.nodesApi
      .create({
        type: 'Note',
        title: this.newNote.title,
        description: this.newNote.description || null,
        from: null,
        until: null,
        assignedFamilyMemberIds: this.newNote.assignedFamilyMemberIds,
        collectionId: null,
        priority: null,
        location: null,
        allDay: null,
        recurrenceRule: null,
        ...NULL_CONTACT_FIELDS,
      })
      .subscribe({
        next: (created) => {
          this.notes = this.sortNotes([...this.notes, created]);
          this.newNote = this.emptyNewNote();
          this.showNewNoteForm = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that note.');
          this.cdr.markForCheck();
        },
      });
  }

  private sortNotes(notes: NodeResponse[]): NodeResponse[] {
    return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private emptyNewNote() {
    return {
      title: '',
      description: '',
      assignedFamilyMemberIds: [] as string[],
    };
  }
}

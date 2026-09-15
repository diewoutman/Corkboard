import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FamilyMembers } from '../../../core/family-members';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { Nodes } from '../../../core/nodes';

const MAX_NOTES_SHOWN = 5;
const NOTE_COLORS = ['bg-pastel-amber', 'bg-pastel-teal', 'bg-pastel-green', 'bg-pastel-purple', 'bg-pastel-coral'];
const NOTE_ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-[0.5deg]', 'rotate-[1.5deg]', 'rotate-0'];

@Component({
  selector: 'app-notes-widget',
  templateUrl: './notes-widget.component.html',
  standalone: false,
})
export class NotesWidgetComponent implements OnInit {
  @Input() importantOnly: boolean | null = null;

  notes: NodeResponse[] = [];
  members: FamilyMemberResponse[] = [];
  loading = true;

  constructor(
    private readonly nodesApi: Nodes,
    private readonly familyMembersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    forkJoin({ notes: this.nodesApi.list({ type: 'Note' }), members: this.familyMembersApi.list() }).subscribe({
      next: ({ notes, members }) => {
        this.members = members;
        const filtered = this.importantOnly ? notes.filter((n) => n.isImportant) : notes;
        this.notes = [...filtered]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, MAX_NOTES_SHOWN);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  noteColor(index: number): string {
    return NOTE_COLORS[index % NOTE_COLORS.length];
  }

  noteRotation(index: number): string {
    return NOTE_ROTATIONS[index % NOTE_ROTATIONS.length];
  }
}

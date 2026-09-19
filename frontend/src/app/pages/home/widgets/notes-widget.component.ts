import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FamilyMembers } from '../../../core/family-members';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { Nodes } from '../../../core/nodes';

const MAX_NOTES_SHOWN = 5;

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
    forkJoin({
      notes: this.nodesApi.listPage({ type: 'Note', isImportant: this.importantOnly ? true : undefined, sort: '-createdAt', pageSize: MAX_NOTES_SHOWN }),
      members: this.familyMembersApi.list(),
    }).subscribe({
      next: ({ notes, members }) => {
        this.members = members;
        this.notes = notes.items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}

import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { NodeResponse } from '../../../core/models';
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
  loading = true;

  constructor(
    private readonly nodesApi: Nodes,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.nodesApi.list({ type: 'Note' }).subscribe({
      next: (notes) => {
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
}

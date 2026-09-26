import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FamilyMembers } from '../../../core/family-members';
import { extractErrorMessage } from '../../../core/http-error';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { NULL_CONTACT_FIELDS, NULL_MEAL_FIELDS, NULL_RECIPE_FIELDS, NULL_SHOPPING_FIELDS, Nodes, toUpdateRequest } from '../../../core/nodes';
import { SubmitGuard } from '../../../core/submit-guard';
import { AssigneeChipGroupComponent } from '../assignee-chip-group/assignee-chip-group.component';
import { ErrorBannerComponent } from '../error-banner/error-banner.component';

/** The full note form (create or edit), without a surrounding modal — hosted by the Notes page and by the app's "+" sheet. */
@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe, AssigneeChipGroupComponent, ErrorBannerComponent],
  template: `
    <form (ngSubmit)="save()" #form="ngForm" class="space-y-3">
      <h2 *ngIf="showTitle" class="font-heading text-lg font-bold text-ink">{{ (note ? 'notes.edit' : 'notes.add') | transloco }}</h2>
      <app-error-banner [message]="errorMessage" />
      <div>
        <label for="noteTitle" class="block text-sm font-bold text-ink">{{ 'common.title' | transloco }}</label>
        <input
          id="noteTitle"
          name="title"
          [(ngModel)]="model.title"
          required
          class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
      </div>
      <div>
        <label for="noteBody" class="block text-sm font-bold text-ink">{{ 'notes.note' | transloco }}</label>
        <textarea
          id="noteBody"
          name="description"
          [(ngModel)]="model.description"
          rows="4"
          class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        ></textarea>
      </div>
      <app-assignee-chip-group [members]="members" [selectedIds]="model.assignedFamilyMemberIds" (toggled)="toggleAssignee($event)" />

      <label class="flex items-center gap-2 text-sm font-semibold text-ink-muted">
        <input type="checkbox" name="isImportant" [(ngModel)]="model.isImportant" class="rounded-md accent-coral" />
        {{ 'shared.mark_important' | transloco }}
      </label>

      <div class="flex gap-2 pt-1">
        <button type="submit" [disabled]="form.invalid || submit.busy" class="flex-1 rounded-full bg-coral px-4 py-2 text-sm font-extrabold text-white shadow-button hover:bg-coral-strong disabled:cursor-not-allowed disabled:opacity-50">
          {{ (note ? 'common.save_changes' : 'notes.add') | transloco }}
        </button>
        <button type="button" (click)="cancelled.emit()" class="rounded-full px-4 py-2 text-sm font-bold text-ink-muted hover:bg-cork">
          {{ 'common.cancel' | transloco }}
        </button>
      </div>
    </form>
  `,
})
export class NoteEditorComponent implements OnInit {
  /** The note being edited; null to create one. */
  @Input() note: NodeResponse | null = null;
  @Input() showTitle = true;
  @Output() saved = new EventEmitter<NodeResponse>();
  @Output() cancelled = new EventEmitter<void>();

  members: FamilyMemberResponse[] = [];
  errorMessage: string | null = null;
  model = { title: '', description: '', assignedFamilyMemberIds: [] as string[], isImportant: false };
  /** Blocks a second submit (double click, Enter twice) while the request is in flight. */
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));

  private readonly nodesApi = inject(Nodes);
  private readonly membersApi = inject(FamilyMembers);
  private readonly transloco = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (this.note) {
      this.model = {
        title: this.note.title,
        description: this.note.description ?? '',
        assignedFamilyMemberIds: [...this.note.assignedFamilyMemberIds],
        isImportant: !!this.note.isImportant,
      };
    }
    this.membersApi.list().subscribe((members) => {
      this.members = members;
      this.cdr.markForCheck();
    });
  }

  toggleAssignee(memberId: string) {
    const ids = this.model.assignedFamilyMemberIds;
    this.model.assignedFamilyMemberIds = ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId];
  }

  save() {
    if (!this.model.title) return;
    const editing = this.note;

    const request$ = editing
      ? this.nodesApi.update(
          editing.id,
          toUpdateRequest(editing, {
            title: this.model.title,
            description: this.model.description || null,
            assignedFamilyMemberIds: this.model.assignedFamilyMemberIds,
            isImportant: this.model.isImportant,
          }),
        )
      : this.nodesApi.create({
          type: 'Note',
          title: this.model.title,
          description: this.model.description || null,
          from: null,
          until: null,
          assignedFamilyMemberIds: this.model.assignedFamilyMemberIds,
          collectionId: null,
          isImportant: this.model.isImportant,
          priority: null,
          sectionId: null,
          location: null,
          allDay: null,
          recurrenceRule: null,
          ...NULL_CONTACT_FIELDS,
          ...NULL_RECIPE_FIELDS,
          ...NULL_MEAL_FIELDS,
          ...NULL_SHOPPING_FIELDS,
        });

    this.submit.run(request$).subscribe({
      next: (saved) => this.saved.emit(saved),
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(editing ? 'notes.errors.save' : 'notes.errors.create'));
        this.cdr.markForCheck();
      },
    });
  }
}

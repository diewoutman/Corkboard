import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FamilyMemberResponse } from '../../../core/models';

/**
 * The "Assigned to" checkbox-chip group in the new-task/new-event/new-note forms — byte-identical
 * markup in Notes, Calendar and Task-list before this extraction (Schedule-editor has a 4th,
 * visually inconsistent copy still using the old gray/blue classes).
 */
@Component({
  selector: 'app-assignee-chip-group',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div>
      <label class="block text-sm font-bold text-ink">{{ 'shared.assigned_to' | transloco }}</label>
      <div class="mt-1 flex flex-wrap gap-2">
        @for (member of members; track member.id) {
          <label class="flex items-center gap-1.5 rounded-full border-2 border-border-soft px-2.5 py-1 text-xs font-bold text-ink has-checked:border-coral has-checked:bg-pastel-coral">
            <input
              type="checkbox"
              [checked]="selectedIds.includes(member.id)"
              (change)="toggled.emit(member.id)"
              class="h-3.5 w-3.5 rounded-md accent-coral"
            />
            {{ member.displayName }}
          </label>
        }
      </div>
    </div>
  `,
})
export class AssigneeChipGroupComponent {
  @Input() members: FamilyMemberResponse[] = [];
  @Input() selectedIds: string[] = [];
  @Output() toggled = new EventEmitter<string>();
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { memberColor, memberName } from '../../../core/member-lookup';
import { MemberBadgeComponent } from '../member-badge/member-badge.component';

const NOTE_COLORS = ['bg-pastel-amber', 'bg-pastel-teal', 'bg-pastel-green', 'bg-pastel-purple', 'bg-pastel-coral', 'bg-pastel-gold'];
const NOTE_ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-[0.5deg]', 'rotate-[1.5deg]', 'rotate-0', 'rotate-[0.75deg]'];

/** A single note card on the Notes page — pastel color and slight rotation cycle by `index` so the board doesn't look uniform. */
@Component({
  selector: 'app-sticky-note-card',
  standalone: true,
  imports: [MemberBadgeComponent],
  template: `
    <div [class]="colorClass + ' ' + rotationClass" class="relative rounded-2xl p-4 shadow-[0_5px_0_0_rgba(0,0,0,0.06)]">
      <div class="absolute right-3 top-3 flex items-center gap-2">
        <button
          type="button"
          (click)="toggleImportant.emit()"
          [class.text-coral]="note.isImportant"
          [class.opacity-100]="note.isImportant"
          [class.text-ink]="!note.isImportant"
          class="opacity-60 hover:text-coral hover:opacity-100"
          [attr.aria-label]="note.isImportant ? 'Unmark as important' : 'Mark as important'"
        >★</button>
        <button type="button" (click)="delete.emit()" class="text-ink opacity-50 hover:text-danger hover:opacity-100" aria-label="Delete">✕</button>
      </div>
      <p class="pr-14 font-heading font-bold text-ink">{{ note.title }}</p>
      @if (note.description) {
        <p class="mt-1 whitespace-pre-line text-sm font-semibold text-ink/80">{{ note.description }}</p>
      }
      <div class="mt-2 flex flex-wrap gap-2">
        @for (memberId of note.assignedFamilyMemberIds; track memberId) {
          <app-member-badge [name]="memberName(members, memberId)" [color]="memberColor(members, memberId)" />
        }
      </div>
    </div>
  `,
})
export class StickyNoteCardComponent {
  @Input({ required: true }) note!: NodeResponse;
  @Input() members: FamilyMemberResponse[] = [];
  @Input() index = 0;
  @Output() toggleImportant = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  protected readonly memberName = memberName;
  protected readonly memberColor = memberColor;

  get colorClass(): string {
    return NOTE_COLORS[this.index % NOTE_COLORS.length];
  }

  get rotationClass(): string {
    return NOTE_ROTATIONS[this.index % NOTE_ROTATIONS.length];
  }
}

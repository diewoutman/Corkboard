import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FamilyMemberResponse } from '../core/models';

/**
 * Compact, color-coded avatar bubbles for a Node's assigned FamilyMembers —
 * initials on the member's own Color, so who's-assigned is scannable without
 * reading names. Standalone so it can be dropped into any NgModule's
 * `imports` without a wrapping module.
 */
@Component({
  selector: 'app-member-avatars',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="flex items-center -space-x-1.5" *ngIf="assignedMembers.length > 0">
      <span
        *ngFor="let member of assignedMembers"
        class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white text-[10px] font-semibold text-white"
        [style.background]="member.color"
        [title]="member.displayName"
      >{{ initial(member.displayName) }}</span>
    </span>
  `,
})
export class MemberAvatarsComponent {
  @Input() members: FamilyMemberResponse[] = [];
  @Input() assignedIds: string[] = [];

  get assignedMembers(): FamilyMemberResponse[] {
    return this.members.filter((m) => this.assignedIds.includes(m.id));
  }

  initial(displayName: string): string {
    return displayName.trim().charAt(0).toUpperCase();
  }
}

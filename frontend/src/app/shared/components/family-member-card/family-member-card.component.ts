import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FamilyMemberResponse } from '../../../core/models';
import { MemberAvatarComponent } from '../member-avatar/member-avatar.component';
import { RoleBadgeComponent } from '../role-badge/role-badge.component';

/**
 * The Family page's member card header (avatar, name, edit/delete, birthday, login status).
 * The "Create login" sub-form (its own multi-field, validated form with local state) is out of
 * scope here — project it in via `<ng-content>` when `member.linkedUserEmail` is absent, same as
 * the page does today.
 */
@Component({
  selector: 'app-family-member-card',
  standalone: true,
  imports: [DatePipe, MemberAvatarComponent, RoleBadgeComponent, TranslocoPipe],
  template: `
    <div class="rounded-3xl bg-white p-4 shadow-sticker">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-3">
          <app-member-avatar [name]="member.displayName" [color]="member.color" size="lg" />
          <p class="font-heading font-bold text-ink">{{ member.displayName }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" (click)="edit.emit()" class="text-xs font-extrabold text-coral hover:text-coral-strong">✏️ {{ 'common.edit' | transloco }}</button>
          <button type="button" (click)="remove.emit()" class="text-ink-muted hover:text-danger" [attr.aria-label]="'common.delete' | transloco">✕</button>
        </div>
      </div>

      @if (member.dateOfBirth) {
        <p class="mt-2 text-xs font-semibold text-ink-muted">🎂 {{ member.dateOfBirth | date: 'longDate' }}</p>
      }

      @if (member.linkedUserEmail) {
        <p class="mt-1.5 flex items-center gap-2 text-xs font-semibold text-ink-muted">
          Has a login: {{ member.linkedUserEmail }}
          <app-role-badge [role]="member.linkedUserRole ?? 'Member'" />
        </p>
      } @else {
        <ng-content></ng-content>
      }
    </div>
  `,
})
export class FamilyMemberCardComponent {
  @Input({ required: true }) member!: FamilyMemberResponse;
  @Output() edit = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
}

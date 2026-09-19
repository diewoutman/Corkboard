import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MemberAvatarComponent, MemberAvatarSize } from '../member-avatar/member-avatar.component';

/**
 * The avatar + name + edit/delete row at the top of an entity detail panel — Contacts' detail
 * view today. `avatarName` drives the avatar's initial (Contacts uses first name only, distinct
 * from the full `displayName` heading), matching `contactInitial()`'s behavior.
 */
@Component({
  selector: 'app-entity-detail-header',
  standalone: true,
  imports: [MemberAvatarComponent],
  template: `
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-3">
        <app-member-avatar [name]="avatarName" [color]="color" [size]="avatarSize" />
        <h2 class="font-heading text-lg font-bold text-ink">{{ displayName }}</h2>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <button type="button" (click)="edit.emit()" class="text-xs font-extrabold text-coral hover:text-coral-strong">{{ editLabel }}</button>
        <button type="button" (click)="remove.emit()" class="text-ink-muted hover:text-danger" aria-label="Delete">✕</button>
      </div>
    </div>
  `,
})
export class EntityDetailHeaderComponent {
  @Input() avatarName = '';
  @Input() displayName = '';
  @Input() color = '';
  @Input() avatarSize: MemberAvatarSize = 'xl';
  @Input() editLabel = 'Edit';
  @Output() edit = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MemberAvatarComponent } from '../member-avatar/member-avatar.component';

/** A single row in Contacts' list panel: avatar, name, optional household badge, selected-state highlight. */
@Component({
  selector: 'app-contact-list-row',
  standalone: true,
  imports: [MemberAvatarComponent],
  template: `
    <button
      type="button"
      (click)="rowSelected.emit()"
      class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-pastel-coral"
      [class.bg-pastel-coral]="selected"
    >
      <app-member-avatar [name]="firstName || '?'" [color]="color" size="md" />
      <span class="min-w-0 flex-1 truncate text-sm font-bold text-ink">{{ fullName }}</span>
      @if (householdName) {
        <span class="shrink-0 rounded-full bg-badge-bg px-2 py-0.5 text-[10px] font-extrabold text-badge-text">{{ householdName }}</span>
      }
    </button>
  `,
})
export class ContactListRowComponent {
  @Input() firstName = '';
  @Input() lastName: string | null = null;
  @Input() color = '';
  @Input() householdName: string | null = null;
  @Input() selected = false;
  @Output() rowSelected = new EventEmitter<void>();

  get fullName(): string {
    return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
  }
}

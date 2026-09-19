import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CollectionResponse } from '../../../core/models';

/**
 * One row in Contacts' households panel: name plus the address, joined with commas only where
 * both sides of the join are actually present (street/postal+city/country can each be blank).
 */
@Component({
  selector: 'app-household-row',
  standalone: true,
  host: { class: 'contents' },
  template: `
    <li class="flex items-start justify-between gap-2 rounded-2xl bg-cork px-3 py-2">
      <div>
        <p class="text-sm font-bold text-ink">{{ household.name }}</p>
        @if (household.street || household.city) {
          <p class="text-xs font-semibold text-ink-muted">
            {{ household.street
            }}@if (household.street && (household.city || household.postalCode)) {<span>, </span>}{{ household.postalCode }} {{ household.city
            }}@if (household.country) {<span>, {{ household.country }}</span>}
          </p>
        }
      </div>
      <button type="button" (click)="edit.emit()" class="shrink-0 text-xs font-extrabold text-coral hover:text-coral-strong">Edit</button>
    </li>
  `,
})
export class HouseholdRowComponent {
  @Input({ required: true }) household!: CollectionResponse;
  @Output() edit = new EventEmitter<void>();
}

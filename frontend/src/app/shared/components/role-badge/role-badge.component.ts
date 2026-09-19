import { Component, Input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FamilyRole } from '../../../core/models';

/**
 * The small role pill next to a family member's linked login. Only Owner gets its own color —
 * Adult and Member currently share the same "adult" styling, matching `family.page.ts`'s access model
 * (only Owner has extra permissions today).
 */
@Component({
  selector: 'app-role-badge',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <span
      class="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
      [class]="role === 'Owner' ? 'bg-owner-bg text-owner-text' : 'bg-adult-bg text-adult-text'"
    >{{ ('roles.' + role) | transloco }}</span>
  `,
})
export class RoleBadgeComponent {
  @Input({ required: true }) role!: FamilyRole;
}

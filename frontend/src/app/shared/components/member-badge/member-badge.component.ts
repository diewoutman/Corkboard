import { Component, Input } from '@angular/core';

/** A single member's name on their own Color, as a small pill — used next to items assigned to one member. */
@Component({
  selector: 'app-member-badge',
  standalone: true,
  template: `
    <span
      class="rounded-full px-2 py-0.5 font-extrabold text-white"
      [class]="sizeClass"
      [style.background]="color"
    >{{ name }}</span>
  `,
})
export class MemberBadgeComponent {
  @Input() name = '';
  @Input() color = '';
  /** 'sm' (text-xs) matches Notes/Tasks; 'xs' (text-[10px]) matches Calendar's tighter agenda rows. */
  @Input() size: 'xs' | 'sm' = 'sm';

  get sizeClass(): string {
    return this.size === 'xs' ? 'text-[10px]' : 'text-xs';
  }
}

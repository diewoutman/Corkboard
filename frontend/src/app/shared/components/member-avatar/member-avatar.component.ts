import { Component, Input } from '@angular/core';

const SIZE_CLASSES = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-lg',
} as const;

export type MemberAvatarSize = keyof typeof SIZE_CLASSES;

/**
 * A single member's initial on their own Color, as a circle. Sibling to `MemberAvatarsComponent`
 * (which renders a whole assigned-members row) for the many places that show just one member —
 * an agenda group's owner, a contact's household member, a family-member card.
 */
@Component({
  selector: 'app-member-avatar',
  standalone: true,
  template: `
    <span
      class="flex shrink-0 items-center justify-center rounded-full font-extrabold text-white"
      [class]="sizeClass"
      [style.background]="color"
      [title]="name"
    >{{ initial }}</span>
  `,
})
export class MemberAvatarComponent {
  @Input() name = '';
  @Input() color = '';
  @Input() size: MemberAvatarSize = 'md';

  get sizeClass(): string {
    return SIZE_CLASSES[this.size];
  }

  get initial(): string {
    return this.name.trim().charAt(0).toUpperCase();
  }
}

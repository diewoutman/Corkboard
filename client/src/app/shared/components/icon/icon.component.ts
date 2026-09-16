import { Component, Input } from '@angular/core';

/**
 * The `stroke="currentColor"` outline-icon wrapper repeated across the bottom nav
 * (`app.component.html`) and the home screen's navigation tiles — takes an SVG path's `d` data
 * (see `pages/home/tile-defs.ts`'s `TILE_DEFS`) so the icon set has one place to change stroke width,
 * viewBox, etc.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg [class]="sizeClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="path" />
    </svg>
  `,
})
export class IconComponent {
  @Input({ required: true }) path!: string;
  /** Tailwind size classes, e.g. "h-5 w-5" (bottom nav) or "h-6 w-6" (navigation tiles). */
  @Input() sizeClass = 'h-5 w-5';
}

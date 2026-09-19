import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TileDef } from '../tile-defs';

/** Small pill button (icon + label) linking to a page — the Navigation widget's bar and the standalone Shortcut widget both render one of these per tile. */
@Component({
  selector: 'app-tile-pill',
  standalone: true,
  imports: [RouterModule],
  template: `
    <a
      [routerLink]="tile.route"
      class="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-extrabold text-ink shadow-sticker-sm transition hover:brightness-105"
    >
      <svg class="h-4 w-4 shrink-0 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="tile.icon" />
      </svg>
      {{ tile.title }}
    </a>
  `,
})
export class TilePillComponent {
  @Input({ required: true }) tile!: TileDef;
}

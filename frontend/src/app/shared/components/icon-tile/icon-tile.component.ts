import { Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * The colored icon+label tile used by the home screen's navigation widget (`tile-defs.ts`'s
 * `TILE_DEFS`). Router-agnostic like `ListCardComponent` — wrap it in `<a [routerLink]="..."
 * class="contents">` at the call site instead of building the link in here.
 */
@Component({
  selector: 'app-icon-tile',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div [class]="'flex flex-col items-center gap-1.5 rounded-2xl p-4 text-center shadow-sticker-sm transition hover:brightness-105 ' + colorClass">
      <app-icon [path]="icon" sizeClass="h-6 w-6 text-white" />
      <p class="text-xs font-extrabold text-white">{{ title }}</p>
    </div>
  `,
})
export class IconTileComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) title!: string;
  /** One of the app's tile background classes, e.g. "bg-coral", "bg-wouter". */
  @Input() colorClass = 'bg-coral';
}

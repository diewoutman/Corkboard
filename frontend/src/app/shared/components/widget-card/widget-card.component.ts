import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Home dashboard's per-widget chrome: title row with resize (↔) / configure (⚙) / remove (✕)
 * buttons, and a body slot for whichever widget is active. CDK drag-and-drop
 * (`cdkDrag`/`cdkDragHandle`) is applied by the page directly on `<app-widget-card>` and on the
 * `[widgetCardTitle]`-projected title, not written in here — same reasoning as
 * `ListCardComponent` staying router-agnostic and letting the page supply the interactive
 * wrapper: this component has no CDK dependency of its own and renders fine in Storybook alone.
 *
 * The resize/configure/remove buttons only reveal on hover (`group`/`group-hover`, same pattern as
 * CalendarEventBlockComponent's hover-reveal edit/delete) — kept out of the way until the widget is
 * actually being interacted with.
 *
 * When `showPanel` is false, the card chrome (background/padding/shadow) drops away — the widget
 * sits bare on the board — but the title row and resize/configure/remove buttons stay, just
 * without the card styling around them, so those affordances survive without a panel to live in.
 *
 * The two `<ng-content>` outlets (title, body) are each written exactly once, unconditionally —
 * Angular's `@if`/`@else` control flow silently drops a catch-all `<ng-content>` projection when
 * it's duplicated across branches (each branch resolving its own, seemingly identical, projection
 * bucket), so only the surrounding chrome varies by `showPanel`, never the projection points
 * themselves.
 */
@Component({
  selector: 'app-widget-card',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div [class]="showPanel ? 'mb-2 flex items-center justify-between gap-2' : 'mb-1 flex items-center gap-2'">
      <ng-content select="[widgetCardTitle]"></ng-content>
      @if (editable) {
        <div [class]="showPanel ? 'hidden items-center gap-2.5 group-hover:flex' : 'ml-auto hidden items-center gap-2.5 group-hover:flex'">
          @if (resizable) {
            <button type="button" (click)="resized.emit()" class="text-ink-muted hover:text-coral" [attr.aria-label]="'shared.widget_resize' | transloco" [title]="'shared.widget_resize' | transloco">↔</button>
          }
          <button type="button" (click)="configure.emit()" class="text-xs font-bold text-coral hover:text-coral-strong" [attr.aria-label]="'shared.widget_configure' | transloco" [title]="'shared.widget_configure' | transloco">⚙</button>
          <button type="button" (click)="remove.emit()" class="text-ink-muted hover:text-danger" [attr.aria-label]="'shared.widget_remove' | transloco" [title]="'shared.widget_remove' | transloco">✕</button>
        </div>
      }
    </div>
    <ng-content></ng-content>
  `,
})
export class WidgetCardComponent {
  /** False on the Family dashboard for non-admins — hides resize/configure/remove. */
  @Input() editable = true;
  /** Whether this widget renders inside the card chrome, or bare on the board. */
  @Input() showPanel = true;
  /** False for widgets whose size isn't span-driven (a Shortcut pill) — hides the resize control. */
  @Input() resizable = true;
  @Output() resized = new EventEmitter<void>();
  @Output() configure = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  @HostBinding('class') get hostClass(): string {
    return this.showPanel
      ? 'group block rounded-3xl bg-white p-4 shadow-sticker'
      : 'group relative block';
  }
}

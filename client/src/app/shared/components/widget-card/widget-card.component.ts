import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Home dashboard's per-widget chrome: title row with resize (↔) / configure (⚙) / remove (✕)
 * buttons, and a body slot for whichever widget is active. CDK drag-and-drop
 * (`cdkDrag`/`cdkDragHandle`) is applied by the page directly on `<app-widget-card>` and on the
 * `[widgetCardTitle]`-projected title, not written in here — same reasoning as
 * `ListCardComponent` staying router-agnostic and letting the page supply the interactive
 * wrapper: this component has no CDK dependency of its own and renders fine in Storybook alone.
 */
@Component({
  selector: 'app-widget-card',
  standalone: true,
  host: { class: 'block rounded-3xl bg-white p-4 shadow-sticker' },
  template: `
    <div class="mb-2 flex items-center justify-between gap-2">
      <ng-content select="[widgetCardTitle]"></ng-content>
      @if (editable) {
        <div class="flex items-center gap-2.5">
          <button type="button" (click)="resized.emit()" class="text-ink-muted hover:text-coral" aria-label="Resize widget" title="Resize widget">↔</button>
          <button type="button" (click)="configure.emit()" class="text-xs font-bold text-coral hover:text-coral-strong" aria-label="Configure widget" title="Configure widget">⚙</button>
          <button type="button" (click)="remove.emit()" class="text-ink-muted hover:text-danger" aria-label="Remove widget" title="Remove widget">✕</button>
        </div>
      }
    </div>
    <ng-content></ng-content>
  `,
})
export class WidgetCardComponent {
  /** False on the Family dashboard for non-admins — hides resize/configure/remove. */
  @Input() editable = true;
  @Output() resized = new EventEmitter<void>();
  @Output() configure = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
}

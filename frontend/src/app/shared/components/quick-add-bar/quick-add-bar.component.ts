import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** The natural-language "Add a task…"/"Add an event…" input bar at the top of Calendar and Tasks-list. */
@Component({
  selector: 'app-quick-add-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoPipe],
  template: `
    <form (ngSubmit)="onSubmit()" class="flex gap-2">
      <input
        name="quickAddText"
        [(ngModel)]="text"
        [placeholder]="placeholder"
        class="block w-full rounded-full border-2 border-border-soft bg-white px-4 py-2 text-sm font-semibold shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
      />
      <button
        type="submit"
        [disabled]="busy || !text.trim()"
        class="shrink-0 rounded-full bg-coral px-5 py-2 text-sm font-extrabold text-white shadow-button hover:bg-coral-strong disabled:cursor-not-allowed disabled:opacity-50"
      >{{ 'common.add' | transloco }}</button>
    </form>
  `,
})
export class QuickAddBarComponent {
  @Input() placeholder = '';
  /** True while the previous submit is still being saved — the button stays disabled until the server has answered. */
  @Input() busy = false;
  @Output() submitted = new EventEmitter<string>();

  text = '';

  onSubmit() {
    const trimmed = this.text.trim();
    if (!trimmed || this.busy) return;
    this.submitted.emit(trimmed);
    this.text = '';
  }
}

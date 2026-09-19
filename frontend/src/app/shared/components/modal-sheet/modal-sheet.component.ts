import { Component, EventEmitter, Output } from '@angular/core';

/**
 * Generic modal shell: a dimmed backdrop behind a panel that slides up from the bottom on small
 * screens and centers on larger ones. Clicking the backdrop emits `dismissed`; clicking inside the
 * panel does not (the panel stops the click from bubbling to the backdrop itself).
 */
@Component({
  selector: 'app-modal-sheet',
  standalone: true,
  host: {
    class: 'fixed inset-0 z-20 flex items-end justify-center bg-ink/30 sm:items-center',
    '(click)': 'dismissed.emit()',
  },
  template: `
    <div class="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 shadow-sticker sm:rounded-3xl" (click)="$event.stopPropagation()">
      <ng-content></ng-content>
    </div>
  `,
})
export class ModalSheetComponent {
  @Output() dismissed = new EventEmitter<void>();
}

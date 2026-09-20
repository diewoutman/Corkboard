import { Component, EventEmitter, Input, Output } from '@angular/core';

/** The floating "+" button pinned to the bottom-right of the screen. */
@Component({
  selector: 'app-fab-button',
  standalone: true,
  template: `
    <button
      type="button"
      class="fixed bottom-20 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-coral text-2xl text-white shadow-button hover:bg-coral-strong sm:bottom-6"
      [attr.aria-label]="label"
      (click)="clicked.emit()"
    >+</button>
  `,
})
export class FabButtonComponent {
  @Input() label = 'Add';
  @Output() clicked = new EventEmitter<void>();
}

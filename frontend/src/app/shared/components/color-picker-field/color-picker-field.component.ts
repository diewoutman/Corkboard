import { Component, EventEmitter, Input, Output } from '@angular/core';

let nextId = 0;

/**
 * A labeled color swatch input — Tasks' and Calendar's "new list/calendar/schedule" forms each
 * render this natively today, with a `<label>` missing on the Calendar copy. Standardizes on always
 * showing the label (it's also the input's accessible name).
 */
@Component({
  selector: 'app-color-picker-field',
  standalone: true,
  template: `
    <div>
      <label [for]="id" class="block text-sm font-bold text-ink">{{ label }}</label>
      <input
        [id]="id"
        type="color"
        [value]="value"
        (input)="valueChange.emit($any($event.target).value)"
        class="mt-1 shrink-0 rounded-xl border-2 border-border-soft"
        [class.h-9]="size === 'sm'"
        [class.w-10]="size === 'sm'"
        [class.h-10]="size === 'md'"
        [class.w-12]="size === 'md'"
      />
    </div>
  `,
})
export class ColorPickerFieldComponent {
  @Input() label = 'Color';
  @Input() value = '#ec5542';
  @Input() size: 'sm' | 'md' = 'md';
  @Output() valueChange = new EventEmitter<string>();

  readonly id = `color-picker-field-${nextId++}`;
}

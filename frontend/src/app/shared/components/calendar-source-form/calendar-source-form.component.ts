import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FormsModule } from '@angular/forms';
import { ColorPickerFieldComponent } from '../color-picker-field/color-picker-field.component';

let nextId = 0;

/**
 * The small inline "add a calendar" / "add a schedule" form in Calendar's sidebar — identical
 * markup rendered twice on that page today (once per source type), differing only in labels and
 * placeholder text. Owns its own `<form>`/validity so the page just reads `name`/`color` back via
 * two-way binding and reacts to `submitted`/`cancelled`.
 */
@Component({
  selector: 'app-calendar-source-form',
  standalone: true,
  imports: [FormsModule, ColorPickerFieldComponent, TranslocoPipe],
  host: { class: 'block rounded-2xl bg-white p-2.5 shadow-sticker-sm' },
  template: `
    <form (ngSubmit)="submitted.emit()" #form="ngForm" class="space-y-2">
      <div class="flex items-end gap-2">
        <div class="flex-1">
          <label [for]="id" class="block text-xs font-bold text-ink">{{ 'common.name' | transloco }}</label>
          <input
            [id]="id"
            [name]="id"
            [placeholder]="namePlaceholder"
            [ngModel]="name"
            (ngModelChange)="nameChange.emit($event)"
            required
            class="mt-1 block w-full rounded-lg border-2 border-border-soft px-2 py-1.5 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </div>
        <app-color-picker-field [label]="colorLabel || ('common.color' | transloco)" size="sm" [value]="color" (valueChange)="colorChange.emit($event)" />
      </div>
      <div class="flex gap-2">
        <button type="submit" [disabled]="form.invalid" class="flex-1 rounded-full bg-coral px-3 py-1.5 text-xs font-extrabold text-white shadow-button hover:bg-coral-strong disabled:cursor-not-allowed disabled:opacity-50">
          {{ 'common.add' | transloco }}
        </button>
        <button type="button" (click)="cancelled.emit()" class="rounded-full px-3 py-1.5 text-xs font-bold text-ink-muted hover:bg-cork">{{ 'common.cancel' | transloco }}</button>
      </div>
    </form>
  `,
})
export class CalendarSourceFormComponent {
  @Input() namePlaceholder = '';
  @Input() colorLabel = '';
  @Input() name = '';
  @Output() nameChange = new EventEmitter<string>();
  @Input() color = '#ec5542';
  @Output() colorChange = new EventEmitter<string>();
  @Output() submitted = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  readonly id = `calendar-source-form-name-${nextId++}`;
}

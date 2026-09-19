import { Component, Input, booleanAttribute, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

let nextId = 0;

/**
 * A labeled text/email/password field on the coral/ink design tokens, used by the setup wizard
 * (Login/Family-setup/Add-members) in place of the plain gray/blue inputs those pages previously
 * hand-rolled. Implements ControlValueAccessor (rather than the simpler `[value]`/`(valueChange)`
 * pattern most other shared inputs use) specifically so `[(ngModel)]` + `required` on the host tag
 * keep participating in the surrounding `#form="ngForm"`'s validity — these pages gate their
 * submit button on `form.invalid`.
 */
@Component({
  selector: 'app-text-input',
  standalone: true,
  template: `
    <div>
      <label [for]="id" class="block text-sm font-bold text-ink">{{ label }}</label>
      <input
        [id]="id"
        [type]="type"
        [placeholder]="placeholder"
        [attr.autocomplete]="autocomplete"
        [attr.minlength]="minlength"
        [required]="required"
        [value]="value"
        (input)="onInput($any($event.target).value)"
        (blur)="onTouched()"
        class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
      />
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true,
    },
  ],
})
export class TextInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' = 'text';
  @Input() placeholder = '';
  @Input({ transform: booleanAttribute }) required = false;
  @Input() autocomplete: string | null = null;
  @Input() minlength: number | null = null;

  readonly id = `text-input-${nextId++}`;
  value = '';

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(value: string) {
    this.value = value;
    this.onChange(value);
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SegmentedControlOption {
  value: string;
  label: string;
}

/** The pill-group toggle used for Calendar's Month/Week/Day view switch. */
@Component({
  selector: 'app-segmented-control',
  standalone: true,
  template: `
    <div class="flex items-center rounded-full border-2 border-border-soft p-0.5 text-xs font-extrabold">
      @for (option of options; track option.value) {
        <button
          type="button"
          (click)="selectedChange.emit(option.value)"
          class="rounded-full px-3 py-1.5"
          [class.bg-coral]="option.value === selected"
          [class.text-white]="option.value === selected"
          [class.text-ink-muted]="option.value !== selected"
        >{{ option.label }}</button>
      }
    </div>
  `,
})
export class SegmentedControlComponent {
  @Input({ required: true }) options: SegmentedControlOption[] = [];
  @Input() selected: string | null = null;
  @Output() selectedChange = new EventEmitter<string>();
}

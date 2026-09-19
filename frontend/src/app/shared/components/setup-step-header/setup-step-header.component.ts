import { Component, Input } from '@angular/core';

/** The "Step N of 3 — Set up Qorkboard" breadcrumb + title + description atop each first-run wizard page. */
@Component({
  selector: 'app-setup-step-header',
  standalone: true,
  template: `
    <p class="text-sm font-bold text-ink-muted">Step {{ step }} of {{ totalSteps }} — Set up Qorkboard</p>
    <h1 class="mt-1 text-2xl font-extrabold text-ink">{{ title }}</h1>
    <p class="mt-2 text-sm font-semibold text-ink-muted">{{ description }}</p>
  `,
})
export class SetupStepHeaderComponent {
  @Input({ required: true }) step!: number;
  @Input() totalSteps = 3;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
}

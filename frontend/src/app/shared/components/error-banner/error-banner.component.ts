import { Component, Input } from '@angular/core';

/** The coral-danger message banner shown below a page's header when its last request failed. */
@Component({
  selector: 'app-error-banner',
  standalone: true,
  template: `
    @if (message) {
      <p class="mt-4 rounded-2xl bg-danger-bg px-3 py-2 text-sm font-semibold text-danger-text">{{ message }}</p>
    }
  `,
})
export class ErrorBannerComponent {
  @Input() message: string | null = null;
}

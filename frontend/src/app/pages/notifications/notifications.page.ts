import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PushNotifications, PushStatus } from '../../core/push-notifications';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';

/** Minutes before the due time / start; 0 means "at the time". Date-only items are always reminded at 09:00. */
export const LEAD_OPTIONS = [0, 5, 10, 15, 30, 60, 1440] as const;

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [FormsModule, TranslocoPipe, ErrorBannerComponent, LoadingIndicatorComponent],
  template: `
    <h1 class="text-2xl font-extrabold text-ink">{{ 'notifications.title' | transloco }} 🔔</h1>
    <p class="mt-1 text-sm font-semibold text-ink-muted">{{ 'notifications.intro' | transloco }}</p>

    <app-error-banner [message]="errorMessage" />
    @if (loading) {
      <app-loading-indicator class="mt-8" />
    } @else {
      <div class="mt-4 max-w-xl space-y-4 rounded-3xl bg-white p-5 shadow-sticker-sm">
        @switch (status) {
          @case ('on') {
            <p class="text-sm font-bold text-ink">✅ {{ 'notifications.on' | transloco }}</p>
          }
          @case ('off') {
            <p class="text-sm font-bold text-ink">{{ 'notifications.off' | transloco }}</p>
          }
          @default {
            <p class="text-sm font-bold text-ink-muted">{{ 'notifications.status.' + status | transloco }}</p>
          }
        }

        @if (status === 'on' || status === 'off') {
          <div>
            <label for="lead" class="block text-sm font-bold text-ink">{{ 'notifications.lead' | transloco }}</label>
            <select
              id="lead"
              name="lead"
              [ngModel]="leadMinutes"
              (ngModelChange)="onLeadChange($event)"
              class="mt-1 block w-full rounded-xl border-2 border-border-soft px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
            >
              @for (option of leadOptions; track option) {
                <option [ngValue]="option">{{ 'notifications.leads.' + option | transloco }}</option>
              }
            </select>
            <p class="mt-1 text-xs font-semibold text-ink-muted">{{ 'notifications.lead_hint' | transloco }}</p>
          </div>

          @if (status === 'off') {
            <button type="button" (click)="enable()" [disabled]="busy" class="rounded-full bg-coral px-4 py-2 text-sm font-extrabold text-white shadow-button hover:bg-coral-strong disabled:opacity-50">
              {{ 'notifications.enable' | transloco }}
            </button>
          } @else {
            <button type="button" (click)="disable()" [disabled]="busy" class="rounded-full px-4 py-2 text-sm font-bold text-ink-muted hover:bg-cork disabled:opacity-50">
              {{ 'notifications.disable' | transloco }}
            </button>
          }
        }
      </div>
    }
  `,
})
export class NotificationsPage implements OnInit {
  private readonly push = inject(PushNotifications);
  private readonly transloco = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly leadOptions = LEAD_OPTIONS;
  loading = true;
  busy = false;
  status: PushStatus = 'unsupported';
  leadMinutes = 15;
  errorMessage: string | null = null;

  async ngOnInit() {
    await this.refresh();
  }

  async enable() {
    await this.run(async () => {
      const subscription = await this.push.enable(this.leadMinutes);
      this.leadMinutes = subscription.leadMinutes;
    }, 'notifications.errors.enable');
  }

  async disable() {
    await this.run(() => this.push.disable(), 'notifications.errors.disable');
  }

  async onLeadChange(minutes: number) {
    this.leadMinutes = minutes;
    if (this.status !== 'on') return;
    await this.run(() => this.push.setLeadMinutes(minutes).then(() => undefined), 'notifications.errors.save');
  }

  private async run(action: () => Promise<void>, errorKey: string) {
    this.busy = true;
    this.errorMessage = null;
    try {
      await action();
    } catch {
      this.errorMessage = this.transloco.translate(errorKey);
    }
    this.busy = false;
    await this.refresh();
  }

  private async refresh() {
    try {
      const { status, subscription } = await this.push.status();
      this.status = status;
      if (subscription) this.leadMinutes = subscription.leadMinutes;
    } catch {
      this.errorMessage = this.transloco.translate('notifications.errors.load');
    }
    this.loading = false;
    this.cdr.markForCheck();
  }
}

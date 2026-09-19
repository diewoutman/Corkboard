import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type PushStatus =
  /** No service worker / Push API here (dev server, old browser). */
  | 'unsupported'
  /** iOS Safari only allows Web Push for an app that was added to the Home Screen. */
  | 'ios-needs-install'
  /** The server has no VAPID keys configured. */
  | 'server-disabled'
  /** The browser permission was refused; only the user can undo that in the browser settings. */
  | 'denied'
  | 'off'
  | 'on';

export interface PushSubscriptionInfo {
  id: string;
  endpoint: string;
  leadMinutes: number;
  userAgent: string | null;
  createdAt: string;
}

/** True on iOS/iPadOS in a normal browser tab, where Web Push isn't available until the app is on the Home Screen. */
export function needsIosInstall(nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> & { standalone?: boolean }, standaloneMedia: boolean): boolean {
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return ios && !(nav.standalone || standaloneMedia);
}

/** Opt this device in or out of Web Push reminders. Asking for permission is always a direct result of a user action. */
@Service()
export class PushNotifications {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush);
  private readonly base = `${environment.apiUrl}/notifications`;

  async status(): Promise<{ status: PushStatus; subscription: PushSubscriptionInfo | null }> {
    if (needsIosInstall(navigator, matchMedia('(display-mode: standalone)').matches)) return { status: 'ios-needs-install', subscription: null };
    if (!this.swPush.isEnabled || !('PushManager' in window) || !('Notification' in window)) return { status: 'unsupported', subscription: null };

    const config = await firstValueFrom(this.http.get<{ enabled: boolean }>(`${this.base}/config`));
    if (!config.enabled) return { status: 'server-disabled', subscription: null };
    if (Notification.permission === 'denied') return { status: 'denied', subscription: null };

    const current = await firstValueFrom(this.swPush.subscription);
    if (!current) return { status: 'off', subscription: null };
    const known = await firstValueFrom(this.http.get<PushSubscriptionInfo[]>(`${this.base}/subscriptions`));
    const match = known.find((s) => s.endpoint === current.endpoint) ?? null;
    return { status: match ? 'on' : 'off', subscription: match };
  }

  /** Asks the browser for permission (must be called from a click), subscribes, and registers the device with the server. */
  async enable(leadMinutes: number): Promise<PushSubscriptionInfo> {
    const config = await firstValueFrom(this.http.get<{ enabled: boolean; publicKey: string | null }>(`${this.base}/config`));
    if (!config.enabled || !config.publicKey) throw new Error('Push is not enabled on the server');

    const subscription = await this.swPush.requestSubscription({ serverPublicKey: config.publicKey });
    return this.register(subscription, leadMinutes);
  }

  async setLeadMinutes(leadMinutes: number): Promise<PushSubscriptionInfo> {
    const subscription = await firstValueFrom(this.swPush.subscription);
    if (!subscription) throw new Error('This device is not subscribed');
    return this.register(subscription, leadMinutes);
  }

  async disable(): Promise<void> {
    const subscription = await firstValueFrom(this.swPush.subscription);
    if (subscription) {
      await firstValueFrom(this.http.delete<void>(`${this.base}/subscriptions`, { params: { endpoint: subscription.endpoint } }));
    }
    await this.swPush.unsubscribe();
  }

  private register(subscription: globalThis.PushSubscription, leadMinutes: number) {
    const keys = subscription.toJSON().keys;
    return firstValueFrom(
      this.http.put<PushSubscriptionInfo>(`${this.base}/subscriptions`, {
        endpoint: subscription.endpoint,
        p256dh: keys?.['p256dh'],
        auth: keys?.['auth'],
        leadMinutes,
        userAgent: navigator.userAgent.slice(0, 500),
      }),
    );
  }
}

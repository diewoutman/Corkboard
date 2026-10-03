import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppLanguage, Language, SUPPORTED_LANGUAGES } from '../../core/language';

/** The account-level destination for preferences that do not belong to a family workspace. */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <h1 class="text-2xl font-extrabold text-ink">{{ 'settings.title' | transloco }}</h1>
    <p class="mt-1 text-sm font-semibold text-ink-muted">{{ 'settings.intro' | transloco }}</p>

    <div class="mt-6 max-w-xl space-y-4">
      <section class="rounded-3xl bg-white p-5 shadow-sticker-sm">
        <h2 class="text-base font-extrabold text-ink">{{ 'settings.language.title' | transloco }}</h2>
        <p class="mt-1 text-sm font-semibold text-ink-muted">{{ 'settings.language.description' | transloco }}</p>
        <div class="mt-4 flex gap-2" role="group" [attr.aria-label]="'account.language' | transloco">
          @for (lang of languages; track lang) {
            <button
              type="button"
              (click)="setLanguage(lang)"
              [attr.aria-pressed]="language.current === lang"
              class="rounded-full px-4 py-2 text-sm font-extrabold uppercase"
              [class.bg-coral]="language.current === lang"
              [class.text-white]="language.current === lang"
              [class.bg-cork]="language.current !== lang"
              [class.text-ink-muted]="language.current !== lang"
            >{{ lang }}</button>
          }
        </div>
      </section>

      <a routerLink="/notifications" class="block rounded-3xl bg-white p-5 shadow-sticker-sm hover:ring-2 hover:ring-coral">
        <h2 class="text-base font-extrabold text-ink">{{ 'settings.notifications.title' | transloco }}</h2>
        <p class="mt-1 text-sm font-semibold text-ink-muted">{{ 'settings.notifications.description' | transloco }}</p>
      </a>
    </div>
  `,
})
export class SettingsPage {
  readonly languages = SUPPORTED_LANGUAGES;
  readonly language = inject(Language);

  setLanguage(language: AppLanguage) {
    this.language.set(language);
  }
}

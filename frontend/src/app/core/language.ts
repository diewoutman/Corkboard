import { Service, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Auth } from './auth';

export const SUPPORTED_LANGUAGES = ['en', 'nl'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

const STORAGE_KEY = 'corkboard.language';

function isSupported(value: string | null | undefined): value is AppLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Stored choice first, then the browser's language ("nl-BE" → "nl"), then English. */
export function detectLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isSupported(stored)) return stored;
  } catch {
    // Storage unavailable (private mode etc.) — fall through to the browser language.
  }
  const browser = (typeof navigator !== 'undefined' ? navigator.language : '').split('-')[0].toLowerCase();
  return isSupported(browser) ? browser : DEFAULT_LANGUAGE;
}

@Service()
export class Language {
  private readonly transloco = inject(TranslocoService);
  private readonly auth = inject(Auth);

  get current(): AppLanguage {
    return this.transloco.getActiveLang() as AppLanguage;
  }

  /** Keeps <html lang> in sync — call once at startup. */
  init() {
    document.documentElement.lang = this.current;
  }

  /**
   * Takes over the language stored on the account after logging in (so the choice follows the
   * user across devices). Returns true when it differs from what's currently shown — the caller
   * should then do a full page load, since LOCALE_ID is fixed at boot.
   */
  adopt(language: string | null | undefined): boolean {
    if (!isSupported(language)) return false;
    this.store(language);
    return language !== this.current;
  }

  /**
   * Stores the choice (on the account too, when signed in) and reloads: LOCALE_ID (which the
   * `date` pipe reads) is fixed when the app boots, so a reload is what makes dates switch language too.
   */
  set(language: AppLanguage) {
    if (language === this.current) return;
    this.store(language);

    if (!this.auth.isAuthenticated()) {
      window.location.reload();
      return;
    }
    // A failed save still reloads: the choice is stored locally and applies on this device.
    this.auth.updateLanguage(language).subscribe({
      next: () => window.location.reload(),
      error: () => window.location.reload(),
    });
  }

  private store(language: AppLanguage) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage unavailable — the choice just won't survive the reload.
    }
  }
}

import { Service, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

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

  get current(): AppLanguage {
    return this.transloco.getActiveLang() as AppLanguage;
  }

  /** Keeps <html lang> in sync — call once at startup. */
  init() {
    document.documentElement.lang = this.current;
  }

  /**
   * Stores the choice and reloads: LOCALE_ID (which the `date` pipe reads) is
   * fixed when the app boots, so a reload is what makes dates switch language too.
   */
  set(language: AppLanguage) {
    if (language === this.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Not persisted — the reload below still applies it for this session's boot detection.
    }
    window.location.reload();
  }
}

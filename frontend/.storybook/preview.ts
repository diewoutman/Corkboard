import { applicationConfig, type Preview } from '@storybook/angular-vite';
import { provideTransloco, type Translation, type TranslocoLoader } from '@jsverse/transloco';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import en from '../src/assets/i18n/en.json';
import nl from '../src/assets/i18n/nl.json';
import '../src/global.css';

const TRANSLATIONS: Record<string, Translation> = { en, nl };

/** Serves the app's real JSON files, so stories render the same text as the app. */
@Injectable({ providedIn: 'root' })
class StorybookTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of(TRANSLATIONS[lang]);
  }
}

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        provideTransloco({
          config: { availableLangs: ['en', 'nl'], defaultLang: 'en', fallbackLang: 'en', reRenderOnLangChange: true },
          loader: StorybookTranslocoLoader,
        }),
      ],
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;

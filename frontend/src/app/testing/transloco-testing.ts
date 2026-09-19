import { TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../assets/i18n/en.json';

/** Import in a spec's TestBed so components using the `transloco` pipe or TranslocoService render the real English text. */
export const translocoTesting = () =>
  TranslocoTestingModule.forRoot({ langs: { en }, translocoConfig: { availableLangs: ['en'], defaultLang: 'en' } });

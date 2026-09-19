import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { translocoTesting } from '../testing/transloco-testing';
import { Language, detectLanguage } from './language';

describe('detectLanguage', () => {
  afterEach(() => localStorage.clear());

  it('prefers the stored choice', () => {
    localStorage.setItem('corkboard.language', 'nl');
    expect(detectLanguage()).toBe('nl');
  });

  it('ignores an unsupported stored value', () => {
    localStorage.setItem('corkboard.language', 'xx');
    expect(['en', 'nl']).toContain(detectLanguage());
  });
});

describe('Language.adopt', () => {
  let language: Language;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [translocoTesting()], providers: [provideHttpClient()] });
    language = TestBed.inject(Language);
  });

  afterEach(() => localStorage.clear());

  it('stores a supported account language and reports a difference from the active one (en)', () => {
    expect(language.adopt('nl')).toBe(true);
    expect(localStorage.getItem('corkboard.language')).toBe('nl');
  });

  it('reports no change when the account language is already active', () => {
    expect(language.adopt('en')).toBe(false);
  });

  it('ignores null and unsupported languages', () => {
    expect(language.adopt(null)).toBe(false);
    expect(language.adopt('de')).toBe(false);
    expect(localStorage.getItem('corkboard.language')).toBeNull();
  });
});

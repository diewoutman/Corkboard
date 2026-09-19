import { registerLocaleData } from '@angular/common';
import localeNl from '@angular/common/locales/nl';
import { LOCALE_ID, NgModule, inject, isDevMode, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { authInterceptor } from './core/auth-interceptor';
import { IconComponent } from './shared/components/icon/icon.component';
import { TranslocoPipe, TranslocoService, provideTransloco } from '@jsverse/transloco';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, detectLanguage } from './core/language';
import { TranslocoHttpLoader } from './core/transloco-loader';

registerLocaleData(localeNl);

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    IconComponent,
    TranslocoPipe,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LANGUAGES],
        defaultLang: detectLanguage(),
        fallbackLang: DEFAULT_LANGUAGE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    // Load the active language before the first render, so TranslocoService.translate() is safe to call synchronously anywhere (field initializers, getters).
    provideAppInitializer(() => firstValueFrom(inject(TranslocoService).load(detectLanguage()))),
    // Read by the `date` pipe; fixed at boot, which is why Language.set() reloads.
    { provide: LOCALE_ID, useFactory: detectLanguage },
    // Angular is zoneless by default from v21+ regardless of the zone.js
    // polyfill being loaded. This app is written in the classic style (plain
    // properties mutated from RxJS subscribe callbacks, not signals), which
    // needs zone-driven change detection to actually repaint after async
    // work — Angular's ambient ticks otherwise only walk views already
    // marked dirty. Every page component calls ChangeDetectorRef.markForCheck()
    // after such a mutation; see e.g. LoginPage.ngOnInit.
    provideZoneChangeDetection({ eventCoalescing: true }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

import { NgModule, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { authInterceptor } from './core/auth-interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
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

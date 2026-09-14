import { NgModule, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular/lazy';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { authInterceptor } from './core/auth-interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule,
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: !isDevMode(),
        // Register the ServiceWorker as soon as the application is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000'
      })
    ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideHttpClient(withInterceptors([authInterceptor])),
    // Angular is zoneless by default from v21+ regardless of the zone.js
    // polyfill being loaded (that alone only satisfies Ionic's own internal
    // patching needs — see the zone.js commit). This restores zone.js as
    // *available*, but Angular's ambient ticks still only walk views already
    // marked dirty — a plain property mutated in a subscribe() callback does
    // not mark anything dirty by itself. Every page component therefore
    // calls ChangeDetectorRef.markForCheck() after such a mutation; see e.g.
    // LoginPage.ngOnInit.
    provideZoneChangeDetection({ eventCoalescing: true }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

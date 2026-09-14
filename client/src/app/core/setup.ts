import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SetupStatusResponse {
  isConfigured: boolean;
}

@Service()
export class Setup {
  private readonly http = inject(HttpClient);

  // The answer only ever flips false -> true, once, for the lifetime of an
  // instance — cache it for this app session rather than re-checking on every
  // page load.
  private readonly status$ = this.http
    .get<SetupStatusResponse>(`${environment.apiUrl}/setup/status`)
    .pipe(shareReplay(1));

  status() {
    return this.status$;
  }
}

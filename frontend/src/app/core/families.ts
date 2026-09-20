import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthenticatedFamilyResponse, CreateFamilyRequest, FamilyResponse } from './models';

@Service()
export class Families {
  private readonly http = inject(HttpClient);

  private readonly nameState = signal<string | null>(null);
  /** The current Family's name, shown in the app header once `load()` has run. */
  readonly name = this.nameState.asReadonly();

  create(request: CreateFamilyRequest) {
    return this.http.post<AuthenticatedFamilyResponse>(`${environment.apiUrl}/families`, request);
  }

  /** Fetches the current Family and publishes its name to `name`. */
  load() {
    return this.mine().pipe(tap((family) => this.nameState.set(family.name)));
  }

  mine() {
    return this.http.get<FamilyResponse>(`${environment.apiUrl}/families/mine`);
  }
}

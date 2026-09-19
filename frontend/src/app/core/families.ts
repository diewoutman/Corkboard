import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthenticatedFamilyResponse, CreateFamilyRequest, FamilyResponse } from './models';

@Service()
export class Families {
  private readonly http = inject(HttpClient);

  create(request: CreateFamilyRequest) {
    return this.http.post<AuthenticatedFamilyResponse>(`${environment.apiUrl}/families`, request);
  }

  mine() {
    return this.http.get<FamilyResponse>(`${environment.apiUrl}/families/mine`);
  }
}

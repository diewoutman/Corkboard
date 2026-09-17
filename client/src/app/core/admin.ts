import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AdminFamilySummaryResponse, AdminStatsResponse, FamilyResponse, UpdateFamilyRequest } from './models';

/** System-owner-only — see AdminShellComponent and AdminController. */
@Service()
export class Admin {
  private readonly http = inject(HttpClient);

  getStats() {
    return this.http.get<AdminStatsResponse>(`${environment.apiUrl}/admin/stats`);
  }

  listFamilies() {
    return this.http.get<AdminFamilySummaryResponse[]>(`${environment.apiUrl}/admin/families`);
  }

  getFamily(id: string) {
    return this.http.get<FamilyResponse>(`${environment.apiUrl}/admin/families/${id}`);
  }

  updateFamily(id: string, request: UpdateFamilyRequest) {
    return this.http.put<FamilyResponse>(`${environment.apiUrl}/admin/families/${id}`, request);
  }
}

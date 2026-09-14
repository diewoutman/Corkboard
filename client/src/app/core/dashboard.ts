import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  CreateDashboardWidgetRequest,
  DashboardWidgetResponse,
  ReorderDashboardWidgetsRequest,
  UpdateDashboardWidgetRequest,
} from './models';

@Service()
export class Dashboard {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<DashboardWidgetResponse[]>(`${environment.apiUrl}/dashboard`);
  }

  create(request: CreateDashboardWidgetRequest) {
    return this.http.post<DashboardWidgetResponse>(`${environment.apiUrl}/dashboard`, request);
  }

  update(id: string, request: UpdateDashboardWidgetRequest) {
    return this.http.put<DashboardWidgetResponse>(`${environment.apiUrl}/dashboard/${id}`, request);
  }

  /** Full replacement of the caller's widget order. */
  reorder(request: ReorderDashboardWidgetsRequest) {
    return this.http.put<DashboardWidgetResponse[]>(`${environment.apiUrl}/dashboard/reorder`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/dashboard/${id}`);
  }
}

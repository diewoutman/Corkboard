import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  CreateDashboardWidgetRequest,
  DashboardWidgetResponse,
  DashboardWidgetScope,
  ReorderDashboardWidgetsRequest,
  UpdateDashboardWidgetRequest,
  UpdateDashboardWidgetSpanRequest,
} from './models';

@Service()
export class Dashboard {
  private readonly http = inject(HttpClient);

  list(scope: DashboardWidgetScope) {
    return this.http.get<DashboardWidgetResponse[]>(`${environment.apiUrl}/dashboard`, { params: { scope } });
  }

  create(request: CreateDashboardWidgetRequest) {
    return this.http.post<DashboardWidgetResponse>(`${environment.apiUrl}/dashboard`, request);
  }

  update(id: string, request: UpdateDashboardWidgetRequest) {
    return this.http.put<DashboardWidgetResponse>(`${environment.apiUrl}/dashboard/${id}`, request);
  }

  updateSpan(id: string, request: UpdateDashboardWidgetSpanRequest) {
    return this.http.put<DashboardWidgetResponse>(`${environment.apiUrl}/dashboard/${id}/span`, request);
  }

  /** Full replacement of one dashboard's widget order. */
  reorder(scope: DashboardWidgetScope, request: ReorderDashboardWidgetsRequest) {
    return this.http.put<DashboardWidgetResponse[]>(`${environment.apiUrl}/dashboard/reorder`, request, { params: { scope } });
  }

  delete(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/dashboard/${id}`);
  }
}

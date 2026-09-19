import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ApiCallLogEntryResponse, ApiClientResponse, CreateApiClientRequest, CreatedApiClientResponse } from './models';

/** System-owner-only — see AdminShellComponent and AdminApiClientsController. */
@Service()
export class ApiClients {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<ApiClientResponse[]>(`${environment.apiUrl}/admin/api-clients`);
  }

  create(request: CreateApiClientRequest) {
    return this.http.post<CreatedApiClientResponse>(`${environment.apiUrl}/admin/api-clients`, request);
  }

  callLog(id: string) {
    return this.http.get<ApiCallLogEntryResponse[]>(`${environment.apiUrl}/admin/api-clients/${id}/call-log`);
  }

  revoke(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/admin/api-clients/${id}`);
  }
}

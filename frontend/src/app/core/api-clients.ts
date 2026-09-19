import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { fetchAll, fetchPage } from './paging';
import { ApiCallLogEntryResponse, ApiClientResponse, CreateApiClientRequest, CreatedApiClientResponse } from './models';

/** System-owner-only — see AdminShellComponent and AdminApiClientsController. */
@Service()
export class ApiClients {
  private readonly http = inject(HttpClient);

  list() {
    return fetchAll<ApiClientResponse>(this.http, `${environment.apiUrl}/admin/api-clients`);
  }

  create(request: CreateApiClientRequest) {
    return this.http.post<CreatedApiClientResponse>(`${environment.apiUrl}/admin/api-clients`, request);
  }

  callLog(id: string, page = 1) {
    return fetchPage<ApiCallLogEntryResponse>(this.http, `${environment.apiUrl}/admin/api-clients/${id}/call-log`, {}, page);
  }

  revoke(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/admin/api-clients/${id}`);
  }
}

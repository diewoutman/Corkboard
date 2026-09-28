import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ActivityResponse } from './models';
import { fetchPage } from './paging';

@Injectable({ providedIn: 'root' })
export class ActivityApi {
  private readonly http = inject(HttpClient);

  list(page = 1, pageSize = 20) {
    return fetchPage<ActivityResponse>(this.http, `${environment.apiUrl}/activity`, {}, page, pageSize);
  }
}

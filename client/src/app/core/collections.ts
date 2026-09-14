import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  CollectionResponse,
  CollectionType,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from './models';

export interface CollectionListFilter {
  type?: CollectionType;
  parentCollectionId?: string;
}

@Service()
export class Collections {
  private readonly http = inject(HttpClient);

  list(filter: CollectionListFilter = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value != null) params = params.set(key, value);
    }
    return this.http.get<CollectionResponse[]>(`${environment.apiUrl}/collections`, { params });
  }

  get(id: string) {
    return this.http.get<CollectionResponse>(`${environment.apiUrl}/collections/${id}`);
  }

  create(request: CreateCollectionRequest) {
    return this.http.post<CollectionResponse>(`${environment.apiUrl}/collections`, request);
  }

  update(id: string, request: UpdateCollectionRequest) {
    return this.http.put<CollectionResponse>(`${environment.apiUrl}/collections/${id}`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/collections/${id}`);
  }

  /** (Re)generates the calendar's iCal subscribe URL. */
  rotateFeedToken(id: string) {
    return this.http.post<CollectionResponse>(`${environment.apiUrl}/collections/${id}/feed-token`, {});
  }
}

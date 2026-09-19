import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  CollectionResponse,
  CollectionType,
  CreateCollectionRequest,
  SectionResponse,
  UpdateCollectionRequest,
} from './models';

export interface CollectionListFilter {
  type?: CollectionType;
  parentCollectionId?: string;
}

/** Spread into a Create/UpdateCollectionRequest for any non-Household collection. */
export const NULL_HOUSEHOLD_FIELDS = {
  street: null,
  city: null,
  postalCode: null,
  country: null,
} as const;

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

  sections(collectionId: string) {
    return this.http.get<SectionResponse[]>(`${environment.apiUrl}/collections/${collectionId}/sections`);
  }

  /** Returns the existing section when one with that name (any casing) already exists. */
  createSection(collectionId: string, name: string) {
    return this.http.post<SectionResponse>(`${environment.apiUrl}/collections/${collectionId}/sections`, { name });
  }

  updateSection(sectionId: string, request: { name: string; sortOrder: number }) {
    return this.http.put<SectionResponse>(`${environment.apiUrl}/collections/sections/${sectionId}`, request);
  }

  /** Its tasks stay in the list, without a section. */
  deleteSection(sectionId: string) {
    return this.http.delete<void>(`${environment.apiUrl}/collections/sections/${sectionId}`);
  }
}

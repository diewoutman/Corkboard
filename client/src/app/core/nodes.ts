import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { CreateNodeRequest, NodeResponse, NodeType, UpdateNodeRequest } from './models';

export interface NodeListFilter {
  type?: NodeType;
  assignedTo?: string;
  from?: string;
  until?: string;
}

@Service()
export class Nodes {
  private readonly http = inject(HttpClient);

  list(filter: NodeListFilter = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value != null) params = params.set(key, value);
    }
    return this.http.get<NodeResponse[]>(`${environment.apiUrl}/nodes`, { params });
  }

  create(request: CreateNodeRequest) {
    return this.http.post<NodeResponse>(`${environment.apiUrl}/nodes`, request);
  }

  update(id: string, request: UpdateNodeRequest) {
    return this.http.put<NodeResponse>(`${environment.apiUrl}/nodes/${id}`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/nodes/${id}`);
  }
}

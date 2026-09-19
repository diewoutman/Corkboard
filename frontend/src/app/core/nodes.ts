import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { CreateNodeRequest, NodeResponse, NodeType, UpdateNodeRequest } from './models';

export interface NodeListFilter {
  type?: NodeType;
  assignedTo?: string;
  collectionId?: string;
  from?: string;
  until?: string;
}

/** Spread into a Create/UpdateNodeRequest for any non-Contact node type. */
export const NULL_CONTACT_FIELDS = {
  firstName: null,
  lastName: null,
  dateOfBirth: null,
  street: null,
  city: null,
  postalCode: null,
  country: null,
  phoneNumbers: null,
  emails: null,
} as const;

/** Spread into a Create/UpdateNodeRequest for any non-Note node type. */
export const NULL_NOTE_FIELDS = {
  isImportant: null,
} as const;

/** Builds the UpdateNodeRequest to toggle a Task's done state, preserving its other fields — used by every compact task checkbox (Today/Upcoming/Tasks widget). */
export function toggleTaskCompletionRequest(task: NodeResponse, isCompleted: boolean): UpdateNodeRequest {
  return {
    title: task.title,
    description: task.description,
    from: task.from,
    until: task.until,
    assignedFamilyMemberIds: task.assignedFamilyMemberIds,
    collectionId: task.collectionId,
    isImportant: null,
    isCompleted,
    priority: task.priority,
    category: task.category,
    location: null,
    allDay: null,
    recurrenceRule: task.recurrenceRule,
    ...NULL_CONTACT_FIELDS,
  };
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

  get(id: string) {
    return this.http.get<NodeResponse>(`${environment.apiUrl}/nodes/${id}`);
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

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { CreateFamilyGroupRequest, FamilyGroupResponse } from './models';

@Injectable({ providedIn: 'root' })
export class FamilyGroups {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<FamilyGroupResponse[]>(`${environment.apiUrl}/family-groups`); }
  create(request: CreateFamilyGroupRequest) { return this.http.post<FamilyGroupResponse>(`${environment.apiUrl}/family-groups`, request); }
  update(id: string, request: CreateFamilyGroupRequest) { return this.http.put<FamilyGroupResponse>(`${environment.apiUrl}/family-groups/${id}`, request); }
  assignMembers(id: string, memberIds: string[]) { return this.http.put<FamilyGroupResponse>(`${environment.apiUrl}/family-groups/${id}/members`, { memberIds }); }
  delete(id: string) { return this.http.delete<void>(`${environment.apiUrl}/family-groups/${id}`); }
}

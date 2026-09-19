import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { fetchAll } from './paging';
import {
  CreateFamilyMemberAccountRequest,
  CreateFamilyMemberRequest,
  FamilyMemberResponse,
  UpdateFamilyMemberRequest,
} from './models';

/**
 * System-owner-only FamilyMember management for a Family the caller isn't
 * necessarily a member of — same shape as core/family-members.ts, but every
 * call takes an explicit familyId (see AdminFamilyMembersController).
 */
@Service()
export class AdminFamilyMembers {
  private readonly http = inject(HttpClient);

  list(familyId: string) {
    return fetchAll<FamilyMemberResponse>(this.http, `${environment.apiUrl}/admin/families/${familyId}/members`);
  }

  create(familyId: string, request: CreateFamilyMemberRequest) {
    return this.http.post<FamilyMemberResponse>(`${environment.apiUrl}/admin/families/${familyId}/members`, request);
  }

  update(familyId: string, id: string, request: UpdateFamilyMemberRequest) {
    return this.http.put<FamilyMemberResponse>(`${environment.apiUrl}/admin/families/${familyId}/members/${id}`, request);
  }

  createAccount(familyId: string, id: string, request: CreateFamilyMemberAccountRequest) {
    return this.http.post<FamilyMemberResponse>(`${environment.apiUrl}/admin/families/${familyId}/members/${id}/account`, request);
  }

  delete(familyId: string, id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/admin/families/${familyId}/members/${id}`);
  }
}

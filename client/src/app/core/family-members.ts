import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  CreateFamilyMemberAccountRequest,
  CreateFamilyMemberRequest,
  FamilyMemberResponse,
  UpdateFamilyMemberRequest,
} from './models';

@Service()
export class FamilyMembers {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<FamilyMemberResponse[]>(`${environment.apiUrl}/family-members`);
  }

  create(request: CreateFamilyMemberRequest) {
    return this.http.post<FamilyMemberResponse>(`${environment.apiUrl}/family-members`, request);
  }

  update(id: string, request: UpdateFamilyMemberRequest) {
    return this.http.put<FamilyMemberResponse>(`${environment.apiUrl}/family-members/${id}`, request);
  }

  /** Owner-only. */
  createAccount(id: string, request: CreateFamilyMemberAccountRequest) {
    return this.http.post<FamilyMemberResponse>(`${environment.apiUrl}/family-members/${id}/account`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/family-members/${id}`);
  }
}

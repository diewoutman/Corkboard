import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Auth } from './auth';
import { Observable, map, shareReplay, tap } from 'rxjs';
import { fetchAll } from './paging';
import {
  CreateFamilyMemberAccountRequest,
  CreateFamilyMemberRequest,
  FamilyMemberResponse,
  UpdateFamilyMemberRequest,
} from './models';

@Service()
export class FamilyMembers {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);

  /** Members almost never change but nearly every page asks for them, so a list is reused for a minute (and dropped on any change made here). */
  private cache: { at: number; token: string | null; members$: Observable<FamilyMemberResponse[]> } | null = null;
  private static readonly CACHE_MS = 60_000;

  list(): Observable<FamilyMemberResponse[]> {
    if (!this.cache || this.cache.token !== this.auth.token || Date.now() - this.cache.at > FamilyMembers.CACHE_MS) {
      this.cache = {
        at: Date.now(),
        token: this.auth.token,
        members$: fetchAll<FamilyMemberResponse>(this.http, `${environment.apiUrl}/family-members`).pipe(shareReplay({ bufferSize: 1, refCount: false })),
      };
    }
    // A copy, so a page that sorts or edits its list can't change what the next page receives.
    return this.cache.members$.pipe(map((members) => members.map((m) => ({ ...m }))));
  }

  private invalidate<T>() {
    return tap<T>(() => (this.cache = null));
  }

  create(request: CreateFamilyMemberRequest) {
    return this.http.post<FamilyMemberResponse>(`${environment.apiUrl}/family-members`, request).pipe(this.invalidate());
  }

  update(id: string, request: UpdateFamilyMemberRequest) {
    return this.http.put<FamilyMemberResponse>(`${environment.apiUrl}/family-members/${id}`, request).pipe(this.invalidate());
  }

  /** Owner-only. */
  createAccount(id: string, request: CreateFamilyMemberAccountRequest) {
    return this.http.post<FamilyMemberResponse>(`${environment.apiUrl}/family-members/${id}/account`, request).pipe(this.invalidate());
  }

  delete(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/family-members/${id}`).pipe(this.invalidate());
  }
}

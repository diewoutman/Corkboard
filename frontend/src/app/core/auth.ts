import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from './models';

const STORAGE_KEY = 'corkboard.auth';

@Service()
export class Auth {
  private readonly http = inject(HttpClient);

  private readonly state = signal<AuthResponse | null>(this.readFromStorage());

  readonly current = this.state.asReadonly();
  readonly isAuthenticated = computed(() => this.state() !== null);
  readonly hasFamily = computed(() => this.state()?.familyId != null);
  readonly isOwner = computed(() => this.state()?.role === 'Owner');
  /** Owner or Adult — who's allowed to manage the shared Family dashboard. */
  readonly isAdmin = computed(() => this.state()?.role === 'Owner' || this.state()?.role === 'Adult');
  readonly role = computed(() => this.state()?.role ?? null);
  /** This app's instance-level administrator — independent of Family role, see API clients admin area. */
  readonly isSystemOwner = computed(() => this.state()?.isSystemOwner ?? false);

  register(request: RegisterRequest) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, request)
      .pipe(tap((auth) => this.persist(auth)));
  }

  login(request: LoginRequest) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(tap((auth) => this.persist(auth)));
  }

  /** Swaps in a fresh token — used after family setup, whose new token carries the FamilyId claim. */
  applyAuth(auth: AuthResponse) {
    this.persist(auth);
  }

  logout() {
    localStorage.removeItem(STORAGE_KEY);
    this.state.set(null);
  }

  get token(): string | null {
    return this.state()?.token ?? null;
  }

  private persist(auth: AuthResponse) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    this.state.set(auth);
  }

  private readFromStorage(): AuthResponse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }
}

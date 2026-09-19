import { Component } from '@angular/core';
import { Auth } from '../core/auth';

interface AdminNavLink {
  label: string;
  route: string;
}

const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { label: 'Stats', route: '/admin/stats' },
  { label: 'Families', route: '/admin/families' },
  { label: 'API clients', route: '/admin/api-clients' },
];

/**
 * Deliberately visually distinct from AppComponent's own header/nav (slate,
 * not this app's coral/cork brand) — the admin console should read as a
 * different, administrative tool, not another page of the family app. See
 * AppComponent's isAdminRoute, which hides its own chrome while this owns
 * the screen.
 */
@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss'],
  standalone: false,
})
export class AdminShellComponent {
  readonly navLinks = ADMIN_NAV_LINKS;

  constructor(readonly auth: Auth) {}

  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }
}

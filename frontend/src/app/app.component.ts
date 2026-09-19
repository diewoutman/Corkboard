import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from './core/auth';
import { DueSummary } from './core/due-summary';

export interface NavGroup {
  key: string;
  label: string;
  /** Where tapping the group itself navigates to. */
  route: string;
  /** Route prefixes that count as "inside this group" for highlighting and the sub-nav. */
  matches: string[];
  icon: string;
}

/** The four top-level destinations shared by the header nav and the mobile bottom bar. */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'home',
    label: 'Home',
    route: '/home',
    matches: ['/home'],
    icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10',
  },
  {
    key: 'daily',
    label: 'Daily',
    route: '/tasks',
    matches: ['/tasks', '/notes', '/calendar'],
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'administration',
    label: 'Administration',
    route: '/contacts',
    matches: ['/contacts'],
    icon: 'M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a1 1 0 00-1 1v10a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1zM9 5h6v2H9V5z',
  },
  {
    key: 'more',
    label: 'More',
    route: '/family',
    matches: ['/family'],
    icon: 'M6 12h.01M12 12h.01M18 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zM13 12a1 1 0 11-2 0 1 1 0 012 0zM19 12a1 1 0 11-2 0 1 1 0 012 0z',
  },
];

/** The Daily group's own children, shown as a sub-nav strip while inside it. */
const DAILY_CHILDREN = [
  { label: 'Tasks', route: '/tasks' },
  { label: 'Notes', route: '/notes' },
  { label: 'Calendar', route: '/calendar' },
];

const ACCOUNT_ICON = 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  dueTodayCount = 0;
  accountMenuOpen = false;

  readonly navGroups = NAV_GROUPS;
  readonly dailyChildren = DAILY_CHILDREN;
  readonly accountIcon = ACCOUNT_ICON;

  private currentUrl = '';

  constructor(
    readonly auth: Auth,
    private readonly dueSummary: DueSummary,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.auth.hasFamily()) {
      this.dueSummary.dueTodayCount().subscribe((count) => {
        this.dueTodayCount = count;
        this.cdr.markForCheck();
      });
    }

    this.currentUrl = this.router.url;
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentUrl = event.urlAfterRedirects;
      this.accountMenuOpen = false;
      this.cdr.markForCheck();
    });
  }

  isGroupActive(group: NavGroup): boolean {
    return group.matches.some((prefix) => this.currentUrl === prefix || this.currentUrl.startsWith(`${prefix}/`));
  }

  get inDailyGroup(): boolean {
    return this.isGroupActive(this.navGroups.find((g) => g.key === 'daily')!);
  }

  /** True on /admin/**, where AdminShellComponent owns the screen — hides this component's own header/bottom-nav. */
  get isAdminRoute(): boolean {
    return this.currentUrl === '/admin' || this.currentUrl.startsWith('/admin/');
  }

  toggleAccountMenu() {
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }
}

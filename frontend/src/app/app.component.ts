import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from './core/auth';
import { Families } from './core/families';
import { DueSummary } from './core/due-summary';
import { AppLanguage, Language, SUPPORTED_LANGUAGES } from './core/language';

export interface NavGroup {
  key: string;
  /** Translation key for the group's name. */
  labelKey: string;
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
    labelKey: 'nav.home',
    route: '/home',
    matches: ['/home'],
    icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10',
  },
  {
    key: 'daily',
    labelKey: 'nav.daily',
    route: '/tasks',
    matches: ['/tasks', '/notes', '/calendar'],
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'administration',
    labelKey: 'nav.administration',
    route: '/contacts',
    matches: ['/contacts'],
    icon: 'M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a1 1 0 00-1 1v10a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1zM9 5h6v2H9V5z',
  },
  {
    key: 'more',
    labelKey: 'nav.more',
    route: '/family',
    matches: ['/family'],
    icon: 'M6 12h.01M12 12h.01M18 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zM13 12a1 1 0 11-2 0 1 1 0 012 0zM19 12a1 1 0 11-2 0 1 1 0 012 0z',
  },
  {
    key: 'kitchen',
    labelKey: 'nav.kitchen',
    route: '/recipes',
    matches: ['/recipes', '/meal-plan', '/shopping-list'],
    icon: 'M4 10h16l-1.3 8.8A2 2 0 0116.7 20H7.3a2 2 0 01-2-1.2L4 10zM5 10a3 3 0 013-3M19 10a3 3 0 00-3-3M9 7V6a3 3 0 016 0v1',
  },
];

/** The Daily group's own children, shown as a sub-nav strip while inside it. */
const DAILY_CHILDREN = [
  { labelKey: 'nav.tasks', route: '/tasks' },
  { labelKey: 'nav.notes', route: '/notes' },
  { labelKey: 'nav.calendar', route: '/calendar' },
];

/** The Kitchen group's own children, shown as a sub-nav strip while inside it. */
const KITCHEN_CHILDREN = [
  { labelKey: 'nav.recipes', route: '/recipes' },
  { labelKey: 'nav.mealPlan', route: '/meal-plan' },
  { labelKey: 'nav.shoppingList', route: '/shopping-list' },
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
  /** On phones the top bar slides away while scrolling down and returns on scrolling up, to give the content the space. */
  headerHidden = false;
  private lastScrollY = 0;

  readonly navGroups = NAV_GROUPS;
  readonly dailyChildren = DAILY_CHILDREN;
  readonly kitchenChildren = KITCHEN_CHILDREN;
  readonly accountIcon = ACCOUNT_ICON;
  readonly languages = SUPPORTED_LANGUAGES;

  private currentUrl = '';

  @HostListener('window:scroll')
  onScroll() {
    const y = Math.max(window.scrollY, 0);
    const delta = y - this.lastScrollY;
    // Ignore jitter and the rubber-band bounce at the top; keep the bar while its account menu is open.
    if (Math.abs(delta) < 6) return;
    this.lastScrollY = y;
    const hidden = !this.accountMenuOpen && delta > 0 && y > 56;
    if (hidden !== this.headerHidden) {
      this.headerHidden = hidden;
      this.cdr.markForCheck();
    }
  }

  constructor(
    readonly auth: Auth,
    readonly families: Families,
    readonly language: Language,
    private readonly dueSummary: DueSummary,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.language.init();

    if (this.auth.hasFamily()) {
      this.families.load().subscribe({ error: () => {} });
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

  get inKitchenGroup(): boolean {
    return this.isGroupActive(this.navGroups.find((g) => g.key === 'kitchen')!);
  }

  /** True on /admin/**, where AdminShellComponent owns the screen — hides this component's own header/bottom-nav. */
  get isAdminRoute(): boolean {
    return this.currentUrl === '/admin' || this.currentUrl.startsWith('/admin/');
  }

  setLanguage(language: AppLanguage) {
    this.language.set(language);
  }

  toggleAccountMenu() {
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }
}

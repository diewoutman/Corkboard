import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Collections, NULL_HOUSEHOLD_FIELDS } from '../../core/collections';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse } from '../../core/models';

/** The design system's vivid palette (see design/design-tokens.json) — new lists cycle through these instead of all landing on the same blue. */
const LIST_COLORS = ['#ec5542', '#2a80e2', '#1eab53', '#bc9c00', '#b45bc8'];

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false,
})
export class TasksPage implements OnInit {
  lists: CollectionResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  showNewListForm = false;
  newListName = '';
  newListColor = LIST_COLORS[0];
  submitting = false;

  constructor(
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    this.collectionsApi.list({ type: 'TaskList' }).subscribe({
      next: (lists) => {
        this.lists = lists;
        this.newListColor = LIST_COLORS[lists.length % LIST_COLORS.length];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load your lists. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submitNewList() {
    if (!this.newListName) return;

    this.submitting = true;
    this.collectionsApi
      .create({ name: this.newListName, type: 'TaskList', color: this.newListColor, parentCollectionId: null, ...NULL_HOUSEHOLD_FIELDS })
      .subscribe({
        next: (created) => {
          this.lists = [...this.lists, created].sort((a, b) => a.name.localeCompare(b.name));
          this.newListName = '';
          this.newListColor = LIST_COLORS[this.lists.length % LIST_COLORS.length];
          this.showNewListForm = false;
          this.submitting = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that list.');
          this.submitting = false;
          this.cdr.markForCheck();
        },
      });
  }

  /** WCAG relative luminance — decides whether a list's (arbitrary, user-editable) color needs light or dark text on top of it. */
  isLightColor(hex: string): boolean {
    const c = hex.replace('#', '');
    if (c.length !== 6) return false;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
    const toLinear = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.5;
  }
}

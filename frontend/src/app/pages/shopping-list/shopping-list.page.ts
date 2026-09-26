import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { Collections } from '../../core/collections';
import { extractErrorMessage } from '../../core/http-error';

/**
 * No UI of its own — the shopping list is just the family's one system-managed
 * Task list, so this resolves its id and hands off to the existing task-list view
 * (the same place it's reachable from within Taken, labeled system-managed).
 */
@Component({
  selector: 'app-shopping-list',
  templateUrl: './shopping-list.page.html',
  styleUrls: ['./shopping-list.page.scss'],
  standalone: false,
})
export class ShoppingListPage implements OnInit {
  errorMessage: string | null = null;

  constructor(
    private readonly collectionsApi: Collections,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  ngOnInit() {
    this.collectionsApi.shoppingList().subscribe({
      next: (list) => {
        this.router.navigate(['/tasks', list.id], { replaceUrl: true });
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('shopping_list.errors.load'));
        this.cdr.markForCheck();
      },
    });
  }
}

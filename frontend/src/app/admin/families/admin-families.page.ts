import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Admin } from '../../core/admin';
import { AdminFamilySummaryResponse } from '../../core/models';
import { PagedList } from '../../core/paging';

@Component({
  selector: 'app-admin-families',
  templateUrl: './admin-families.page.html',
  standalone: false,
})
export class AdminFamiliesPage implements OnInit {
  readonly familyList = new PagedList<AdminFamilySummaryResponse>((page) => this.adminApi.listFamilies(page));
  loading = true;
  errorMessage: string | null = null;

  constructor(
    private readonly adminApi: Admin,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get families(): AdminFamilySummaryResponse[] {
    return this.familyList.items;
  }

  loadMore() {
    this.familyList.loadingMore = true;
    this.familyList.more().subscribe({
      next: () => this.finishLoadMore(),
      error: () => {
        this.errorMessage = 'Could not load more families.';
        this.finishLoadMore();
      },
    });
  }

  private finishLoadMore() {
    this.familyList.loadingMore = false;
    this.cdr.markForCheck();
  }

  ngOnInit() {
    this.familyList.first().subscribe({
      next: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load families.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}

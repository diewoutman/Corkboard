import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Admin } from '../../core/admin';
import { AdminFamilySummaryResponse } from '../../core/models';

@Component({
  selector: 'app-admin-families',
  templateUrl: './admin-families.page.html',
  standalone: false,
})
export class AdminFamiliesPage implements OnInit {
  families: AdminFamilySummaryResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  constructor(
    private readonly adminApi: Admin,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.adminApi.listFamilies().subscribe({
      next: (families) => {
        this.families = families;
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

import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Admin } from '../../core/admin';
import { AdminStatsResponse } from '../../core/models';

interface StatTile {
  label: string;
  value: number;
}

@Component({
  selector: 'app-admin-stats',
  templateUrl: './admin-stats.page.html',
  standalone: false,
})
export class AdminStatsPage implements OnInit {
  loading = true;
  errorMessage: string | null = null;
  tiles: StatTile[] = [];

  constructor(
    private readonly adminApi: Admin,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.adminApi.getStats().subscribe({
      next: (stats) => {
        this.tiles = this.toTiles(stats);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load stats.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private toTiles(stats: AdminStatsResponse): StatTile[] {
    return [
      { label: 'Families', value: stats.familyCount },
      { label: 'Users', value: stats.userCount },
      { label: 'Family members', value: stats.familyMemberCount },
      { label: 'Nodes', value: stats.nodeCount },
      { label: 'API clients', value: stats.apiClientCount },
      { label: 'Active API clients', value: stats.activeApiClientCount },
    ];
  }
}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing.module';

import { AdminShellComponent } from './admin-shell.component';
import { AdminStatsPage } from './stats/admin-stats.page';
import { AdminFamiliesPage } from './families/admin-families.page';
import { AdminFamilyDetailPage } from './families/admin-family-detail.page';
import { ApiClientsPage } from './api-clients/api-clients.page';

/**
 * Everything reachable under /admin — deliberately one module rather than a
 * further per-page lazy split like the rest of this app's `pages/` tree: the
 * whole admin section is already one lazy chunk behind the systemOwnerGuard,
 * and with only 4 small pages, splitting further would be over-engineering.
 */
@NgModule({
  imports: [CommonModule, FormsModule, AdminRoutingModule],
  declarations: [AdminShellComponent, AdminStatsPage, AdminFamiliesPage, AdminFamilyDetailPage, ApiClientsPage],
})
export class AdminModule {}

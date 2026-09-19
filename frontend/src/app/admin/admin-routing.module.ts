import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminShellComponent } from './admin-shell.component';
import { AdminStatsPage } from './stats/admin-stats.page';
import { AdminFamiliesPage } from './families/admin-families.page';
import { AdminFamilyDetailPage } from './families/admin-family-detail.page';
import { ApiClientsPage } from './api-clients/api-clients.page';

const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', redirectTo: 'stats', pathMatch: 'full' },
      { path: 'stats', component: AdminStatsPage },
      { path: 'families', component: AdminFamiliesPage },
      { path: 'families/:id', component: AdminFamilyDetailPage },
      { path: 'api-clients', component: ApiClientsPage },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}

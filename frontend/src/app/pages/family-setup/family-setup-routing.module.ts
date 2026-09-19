import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FamilySetupPage } from './family-setup.page';

const routes: Routes = [
  {
    path: '',
    component: FamilySetupPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FamilySetupPageRoutingModule {}

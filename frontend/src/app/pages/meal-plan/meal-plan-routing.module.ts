import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MealPlanPage } from './meal-plan.page';

const routes: Routes = [{ path: '', component: MealPlanPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MealPlanPageRoutingModule {}

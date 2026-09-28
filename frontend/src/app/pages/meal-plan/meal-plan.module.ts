import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

import { MealPlanPageRoutingModule } from './meal-plan-routing.module';

import { MealPlanPage } from './meal-plan.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { ModalSheetComponent } from '../../shared/components/modal-sheet/modal-sheet.component';

@NgModule({
  imports: [CommonModule, FormsModule, TranslocoPipe, MealPlanPageRoutingModule, ErrorBannerComponent, LoadingIndicatorComponent, ModalSheetComponent],
  declarations: [MealPlanPage],
})
export class MealPlanPageModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TasksPageRoutingModule } from './tasks-routing.module';

import { TasksPage } from './tasks.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { ListCardComponent } from '../../shared/components/list-card/list-card.component';
import { ColorPickerFieldComponent } from '../../shared/components/color-picker-field/color-picker-field.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TasksPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    ListCardComponent,
    ColorPickerFieldComponent,
  ],
  declarations: [TasksPage],
})
export class TasksPageModule {}

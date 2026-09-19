import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { TasksPageRoutingModule } from './tasks-routing.module';

import { TasksPage } from './tasks.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { ColorPickerFieldComponent } from '../../shared/components/color-picker-field/color-picker-field.component';
import { ModalSheetComponent } from '../../shared/components/modal-sheet/modal-sheet.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    RouterLink,
    RouterLinkActive,
    TasksPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    ColorPickerFieldComponent,
    ModalSheetComponent,
  ],
  declarations: [TasksPage],
})
export class TasksPageModule {}

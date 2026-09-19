import { NgModule } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ScheduleEditorPageRoutingModule } from './schedule-editor-routing.module';

import { ScheduleEditorPage } from './schedule-editor.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { ScheduleDayColumnComponent } from '../../shared/components/schedule-entry-row/schedule-day-column.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';
import { AssigneeChipGroupComponent } from '../../shared/components/assignee-chip-group/assignee-chip-group.component';
import { ModalSheetComponent } from '../../shared/components/modal-sheet/modal-sheet.component';

@NgModule({
  imports: [
    TranslocoPipe,
    CommonModule,
    FormsModule,
    ScheduleEditorPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    ScheduleDayColumnComponent,
    FabButtonComponent,
    AssigneeChipGroupComponent,
    ModalSheetComponent,
  ],
  declarations: [ScheduleEditorPage],
})
export class ScheduleEditorPageModule {}

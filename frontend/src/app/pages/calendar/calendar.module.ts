import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CalendarPageRoutingModule } from './calendar-routing.module';

import { CalendarPage } from './calendar.page';
import { TimeGridComponent } from './time-grid.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { QuickAddBarComponent } from '../../shared/components/quick-add-bar/quick-add-bar.component';
import { SegmentedControlComponent } from '../../shared/components/segmented-control/segmented-control.component';
import { MonthDayCellComponent } from '../../shared/components/month-day-cell/month-day-cell.component';
import { CalendarEventBlockComponent } from '../../shared/components/calendar-event-block/calendar-event-block.component';
import { MemberBadgeComponent } from '../../shared/components/member-badge/member-badge.component';
import { AssigneeChipGroupComponent } from '../../shared/components/assignee-chip-group/assignee-chip-group.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';
import { CalendarSourceRowComponent } from '../../shared/components/calendar-source-row/calendar-source-row.component';
import { CalendarSourceFormComponent } from '../../shared/components/calendar-source-form/calendar-source-form.component';
import { ModalSheetComponent } from '../../shared/components/modal-sheet/modal-sheet.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CalendarPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    QuickAddBarComponent,
    SegmentedControlComponent,
    MonthDayCellComponent,
    CalendarEventBlockComponent,
    MemberBadgeComponent,
    AssigneeChipGroupComponent,
    FabButtonComponent,
    CalendarSourceRowComponent,
    CalendarSourceFormComponent,
    ModalSheetComponent,
  ],
  declarations: [CalendarPage, TimeGridComponent],
})
export class CalendarPageModule {}

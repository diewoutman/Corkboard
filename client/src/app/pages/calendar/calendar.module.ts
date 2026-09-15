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
import { MemberBadgeComponent } from '../../shared/components/member-badge/member-badge.component';
import { AssigneeChipGroupComponent } from '../../shared/components/assignee-chip-group/assignee-chip-group.component';
import { ColorPickerFieldComponent } from '../../shared/components/color-picker-field/color-picker-field.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';

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
    MemberBadgeComponent,
    AssigneeChipGroupComponent,
    ColorPickerFieldComponent,
    FabButtonComponent,
  ],
  declarations: [CalendarPage, TimeGridComponent],
})
export class CalendarPageModule {}

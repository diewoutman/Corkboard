import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CalendarPageRoutingModule } from './calendar-routing.module';

import { CalendarPage } from './calendar.page';
import { TimeGridComponent } from './time-grid.component';

@NgModule({
  imports: [CommonModule, FormsModule, CalendarPageRoutingModule],
  declarations: [CalendarPage, TimeGridComponent],
})
export class CalendarPageModule {}

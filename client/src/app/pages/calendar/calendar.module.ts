import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CalendarPageRoutingModule } from './calendar-routing.module';

import { CalendarPage } from './calendar.page';

@NgModule({
  imports: [CommonModule, FormsModule, CalendarPageRoutingModule],
  declarations: [CalendarPage],
})
export class CalendarPageModule {}

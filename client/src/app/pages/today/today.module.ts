import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TodayPageRoutingModule } from './today-routing.module';

import { TodayPage } from './today.page';

@NgModule({
  imports: [CommonModule, TodayPageRoutingModule],
  declarations: [TodayPage],
})
export class TodayPageModule {}

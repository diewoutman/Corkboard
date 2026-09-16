import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UpcomingPageRoutingModule } from './upcoming-routing.module';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { AgendaListItemComponent } from '../../shared/components/agenda-list-item/agenda-list-item.component';

import { UpcomingPage } from './upcoming.page';

@NgModule({
  imports: [CommonModule, UpcomingPageRoutingModule, LoadingIndicatorComponent, AgendaListItemComponent],
  declarations: [UpcomingPage],
})
export class UpcomingPageModule {}

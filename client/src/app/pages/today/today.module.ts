import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TodayPageRoutingModule } from './today-routing.module';

import { TodayPage } from './today.page';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { MemberAvatarComponent } from '../../shared/components/member-avatar/member-avatar.component';
import { AgendaListItemComponent } from '../../shared/components/agenda-list-item/agenda-list-item.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@NgModule({
  imports: [
    CommonModule,
    TodayPageRoutingModule,
    LoadingIndicatorComponent,
    MemberAvatarComponent,
    AgendaListItemComponent,
    EmptyStateComponent,
  ],
  declarations: [TodayPage],
})
export class TodayPageModule {}

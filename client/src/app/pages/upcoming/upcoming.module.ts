import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UpcomingPageRoutingModule } from './upcoming-routing.module';
import { MemberAvatarsComponent } from '../../shared/member-avatars.component';

import { UpcomingPage } from './upcoming.page';

@NgModule({
  imports: [CommonModule, UpcomingPageRoutingModule, MemberAvatarsComponent],
  declarations: [UpcomingPage],
})
export class UpcomingPageModule {}

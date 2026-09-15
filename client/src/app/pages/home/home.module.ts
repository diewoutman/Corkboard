import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { HomePageRoutingModule } from './home-routing.module';
import { MemberAvatarsComponent } from '../../shared/member-avatars.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';
import { MemberAvatarComponent } from '../../shared/components/member-avatar/member-avatar.component';
import { AgendaListItemComponent } from '../../shared/components/agenda-list-item/agenda-list-item.component';

import { HomePage } from './home.page';
import { NavigationWidgetComponent } from './widgets/navigation-widget.component';
import { NotesWidgetComponent } from './widgets/notes-widget.component';
import { TasksWidgetComponent } from './widgets/tasks-widget.component';
import { TodayWidgetComponent } from './widgets/today-widget.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    HomePageRoutingModule,
    MemberAvatarsComponent,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    EmptyStateComponent,
    FabButtonComponent,
    MemberAvatarComponent,
    AgendaListItemComponent,
  ],
  declarations: [HomePage, NavigationWidgetComponent, NotesWidgetComponent, TasksWidgetComponent, TodayWidgetComponent],
})
export class HomePageModule {}

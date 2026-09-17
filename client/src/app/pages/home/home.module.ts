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
import { WidgetCardComponent } from '../../shared/components/widget-card/widget-card.component';
import { ModalSheetComponent } from '../../shared/components/modal-sheet/modal-sheet.component';
import { SegmentedControlComponent } from '../../shared/components/segmented-control/segmented-control.component';
import { StickyNoteCardComponent } from '../../shared/components/sticky-note-card/sticky-note-card.component';

import { HomePage } from './home.page';
import { NavigationWidgetComponent } from './widgets/navigation-widget.component';
import { NotesWidgetComponent } from './widgets/notes-widget.component';
import { ShortcutWidgetComponent } from './widgets/shortcut-widget.component';
import { TilePillComponent } from './widgets/tile-pill.component';
import { TasksWidgetComponent } from './widgets/tasks-widget.component';
import { TodayWidgetComponent } from './widgets/today-widget.component';
import { UpcomingWidgetComponent } from './widgets/upcoming-widget.component';

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
    WidgetCardComponent,
    ModalSheetComponent,
    SegmentedControlComponent,
    StickyNoteCardComponent,
    TilePillComponent,
  ],
  declarations: [
    HomePage,
    NavigationWidgetComponent,
    NotesWidgetComponent,
    ShortcutWidgetComponent,
    TasksWidgetComponent,
    TodayWidgetComponent,
    UpcomingWidgetComponent,
  ],
})
export class HomePageModule {}

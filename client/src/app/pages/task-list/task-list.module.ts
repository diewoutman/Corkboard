import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TaskListPageRoutingModule } from './task-list-routing.module';

import { TaskListPage } from './task-list.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { QuickAddBarComponent } from '../../shared/components/quick-add-bar/quick-add-bar.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { TaskRowComponent } from '../../shared/components/task-row/task-row.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AssigneeChipGroupComponent } from '../../shared/components/assignee-chip-group/assignee-chip-group.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TaskListPageRoutingModule,
    ErrorBannerComponent,
    QuickAddBarComponent,
    LoadingIndicatorComponent,
    TaskRowComponent,
    EmptyStateComponent,
    AssigneeChipGroupComponent,
    FabButtonComponent,
  ],
  declarations: [TaskListPage],
})
export class TaskListPageModule {}

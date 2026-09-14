import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TaskListPageRoutingModule } from './task-list-routing.module';

import { TaskListPage } from './task-list.page';

@NgModule({
  imports: [CommonModule, FormsModule, TaskListPageRoutingModule],
  declarations: [TaskListPage],
})
export class TaskListPageModule {}

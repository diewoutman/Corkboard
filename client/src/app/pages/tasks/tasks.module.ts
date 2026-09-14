import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TasksPageRoutingModule } from './tasks-routing.module';

import { TasksPage } from './tasks.page';

@NgModule({
  imports: [CommonModule, FormsModule, TasksPageRoutingModule],
  declarations: [TasksPage],
})
export class TasksPageModule {}

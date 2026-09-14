import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { HomePageRoutingModule } from './home-routing.module';

import { HomePage } from './home.page';
import { NavigationWidgetComponent } from './widgets/navigation-widget.component';
import { NotesWidgetComponent } from './widgets/notes-widget.component';
import { TasksWidgetComponent } from './widgets/tasks-widget.component';

@NgModule({
  imports: [CommonModule, FormsModule, DragDropModule, HomePageRoutingModule],
  declarations: [HomePage, NavigationWidgetComponent, NotesWidgetComponent, TasksWidgetComponent],
})
export class HomePageModule {}

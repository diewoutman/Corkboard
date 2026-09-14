import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NotesPageRoutingModule } from './notes-routing.module';

import { NotesPage } from './notes.page';

@NgModule({
  imports: [CommonModule, FormsModule, NotesPageRoutingModule],
  declarations: [NotesPage],
})
export class NotesPageModule {}

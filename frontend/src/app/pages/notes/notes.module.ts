import { NgModule } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NotesPageRoutingModule } from './notes-routing.module';

import { NotesPage } from './notes.page';
import { LoadMoreComponent } from '../../shared/components/load-more/load-more.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { StickyNoteCardComponent } from '../../shared/components/sticky-note-card/sticky-note-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { NoteEditorComponent } from '../../shared/components/note-editor/note-editor.component';
import { ModalSheetComponent } from '../../shared/components/modal-sheet/modal-sheet.component';

@NgModule({
  imports: [
    TranslocoPipe,
    CommonModule,
    FormsModule,
    NotesPageRoutingModule,
    ErrorBannerComponent,
    LoadMoreComponent,
    LoadingIndicatorComponent,
    StickyNoteCardComponent,
    EmptyStateComponent,
    NoteEditorComponent,
    ModalSheetComponent,
  ],
  declarations: [NotesPage],
})
export class NotesPageModule {}

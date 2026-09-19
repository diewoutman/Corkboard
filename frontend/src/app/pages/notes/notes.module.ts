import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NotesPageRoutingModule } from './notes-routing.module';

import { NotesPage } from './notes.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { StickyNoteCardComponent } from '../../shared/components/sticky-note-card/sticky-note-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AssigneeChipGroupComponent } from '../../shared/components/assignee-chip-group/assignee-chip-group.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';
import { ModalSheetComponent } from '../../shared/components/modal-sheet/modal-sheet.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NotesPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    StickyNoteCardComponent,
    EmptyStateComponent,
    AssigneeChipGroupComponent,
    FabButtonComponent,
    ModalSheetComponent,
  ],
  declarations: [NotesPage],
})
export class NotesPageModule {}

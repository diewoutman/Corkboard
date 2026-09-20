import { Component, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CREATE_KINDS, CreateFab } from '../../../core/create-fab';
import { EventEditorComponent } from '../event-editor/event-editor.component';
import { FabButtonComponent } from '../fab-button/fab-button.component';
import { ModalSheetComponent } from '../modal-sheet/modal-sheet.component';
import { NoteEditorComponent } from '../note-editor/note-editor.component';
import { SegmentedControlComponent, SegmentedControlOption } from '../segmented-control/segmented-control.component';
import { TaskEditorComponent } from '../task-editor/task-editor.component';

/**
 * The one "+" button of the app (mounted in the shell). It opens a sheet with a Task / Note / Event selector and the
 * full editor of the selected kind, on top of whatever page you are on. See `CreateFab`.
 */
@Component({
  selector: 'app-create-fab',
  standalone: true,
  imports: [FabButtonComponent, ModalSheetComponent, SegmentedControlComponent, TaskEditorComponent, NoteEditorComponent, EventEditorComponent, TranslocoPipe],
  template: `
    @if (!fab.hidden()) {
      <app-fab-button [label]="'create.title' | transloco" (clicked)="fab.press()" />
    }
    @if (fab.sheetOpen()) {
      <app-modal-sheet (dismissed)="fab.close()">
        <div class="mb-3 flex justify-center">
          <app-segmented-control [options]="options" [selected]="fab.selected()" (selectedChange)="fab.select($any($event))" />
        </div>
        @switch (fab.selected()) {
          @case ('task') {
            <app-task-editor
              [showTitle]="false"
              [defaultCollectionId]="fab.context()?.taskListId ?? null"
              (saved)="fab.saved('task')"
              (cancelled)="fab.close()"
            />
          }
          @case ('note') {
            <app-note-editor [showTitle]="false" (saved)="fab.saved('note')" (cancelled)="fab.close()" />
          }
          @case ('event') {
            <app-event-editor [showTitle]="false" (saved)="fab.saved('event')" (cancelled)="fab.close()" />
          }
        }
      </app-modal-sheet>
    }
  `,
})
export class CreateFabComponent {
  readonly fab = inject(CreateFab);
  private readonly transloco = inject(TranslocoService);

  get options(): SegmentedControlOption[] {
    return CREATE_KINDS.map((k) => ({ value: k.kind, label: `${k.icon} ${this.transloco.translate('create.kinds.' + k.kind)}` }));
  }
}

import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Collections } from '../../core/collections';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse } from '../../core/models';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false,
})
export class TasksPage implements OnInit {
  lists: CollectionResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  showNewListForm = false;
  newListName = '';
  submitting = false;

  constructor(
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    this.collectionsApi.list({ type: 'TaskList' }).subscribe({
      next: (lists) => {
        this.lists = lists;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load your lists. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submitNewList() {
    if (!this.newListName) return;

    this.submitting = true;
    this.collectionsApi
      .create({ name: this.newListName, type: 'TaskList', color: '#4c6ef5', parentCollectionId: null })
      .subscribe({
        next: (created) => {
          this.lists = [...this.lists, created].sort((a, b) => a.name.localeCompare(b.name));
          this.newListName = '';
          this.showNewListForm = false;
          this.submitting = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that list.');
          this.submitting = false;
          this.cdr.markForCheck();
        },
      });
  }
}

import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { dueClass } from '../../../core/task-due';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { memberColor, memberName } from '../../../core/member-lookup';
import { MemberBadgeComponent } from '../member-badge/member-badge.component';

/**
 * A single task row in Task-list's grouped-by-category view: checkbox, title, due badge, assignees.
 * `host: display:contents` so this component's own element doesn't sit between the `<ul>` it's
 * used in and its `<li>` root — keeping `<li>` a direct `<ul>` child preserves list semantics
 * (screen readers announcing "list, N items") that an intervening wrapper element would break.
 */
@Component({
  selector: 'app-task-row',
  standalone: true,
  host: { class: 'contents' },
  imports: [DatePipe, MemberBadgeComponent],
  template: `
    <li
      class="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sticker-sm"
      [class.opacity-55]="task.isCompleted"
    >
      <input
        type="checkbox"
        [checked]="!!task.isCompleted"
        (change)="toggleDone.emit()"
        class="mt-1 h-5 w-5 shrink-0 rounded-md accent-coral"
      />
      <div class="min-w-0 flex-1">
        <p class="truncate font-bold text-ink" [class.line-through]="task.isCompleted" [class.text-ink-muted]="task.isCompleted">
          {{ task.title }}
        </p>
        @if (task.description) {
          <p class="mt-0.5 text-sm font-semibold text-ink-muted">{{ task.description }}</p>
        }
        <div class="mt-1 flex flex-wrap items-center gap-2">
          @if (task.until) {
            <span class="text-xs" [class]="dueClassFor(task)">Due {{ task.until | date: 'mediumDate' }}</span>
          }
          @if (task.recurrenceRule) {
            <span class="text-xs text-ink-muted" title="Repeats — completing it rolls the due date forward">🔁</span>
          }
          @for (memberId of task.assignedFamilyMemberIds; track memberId) {
            <app-member-badge [name]="memberName(members, memberId)" [color]="memberColor(members, memberId)" />
          }
        </div>
      </div>
      <button type="button" (click)="edit.emit()" class="shrink-0 text-ink-muted hover:text-coral" aria-label="Edit">✎</button>
      <button type="button" (click)="delete.emit()" class="shrink-0 text-ink-muted hover:text-danger" aria-label="Delete">✕</button>
    </li>
  `,
})
export class TaskRowComponent {
  @Input({ required: true }) task!: NodeResponse;
  @Input() members: FamilyMemberResponse[] = [];
  @Output() toggleDone = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();

  protected readonly memberName = memberName;
  protected readonly memberColor = memberColor;

  dueClassFor(task: NodeResponse): string {
    return dueClass(task);
  }
}

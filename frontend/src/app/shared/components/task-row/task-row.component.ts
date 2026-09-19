import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { hasTimeOfDay } from '../../../core/recurrence';
import { dueClass } from '../../../core/task-due';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { memberColor, memberName } from '../../../core/member-lookup';
import { MemberBadgeComponent } from '../member-badge/member-badge.component';

/** dataTransfer type a dragged task carries (its NodeResponse as JSON); the tasks sidebar accepts it as a drop. */
export const TASK_DRAG_TYPE = 'application/x-corkboard-task';

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
  imports: [DatePipe, MemberBadgeComponent, TranslocoPipe],
  template: `
    <li
      class="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sticker-sm"
      [class.opacity-55]="task.isCompleted"
      [class.opacity-40]="dragging"
      draggable="true"
      (dragstart)="onDragStart($event)"
      (dragend)="dragging = false"
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
            <span class="text-xs" [class]="dueClassFor(task)">{{ 'shared.due' | transloco: { date: (task.until | date: (hasTime(task) ? 'medium' : 'mediumDate')) } }}</span>
          }
          @if (origin) {
            <span class="rounded-full bg-cork px-2 py-0.5 text-xs font-bold text-ink-muted">{{ origin }}</span>
          }
          @if (task.recurrenceRule) {
            <span class="text-xs text-ink-muted" [title]="'shared.repeats_hint' | transloco">🔁</span>
          }
          @for (memberId of task.assignedFamilyMemberIds; track memberId) {
            <app-member-badge [name]="memberName(members, memberId)" [color]="memberColor(members, memberId)" />
          }
        </div>
      </div>
      <button type="button" (click)="edit.emit()" class="shrink-0 text-ink-muted hover:text-coral" [attr.aria-label]="'common.edit' | transloco">✎</button>
      <button type="button" (click)="delete.emit()" class="shrink-0 text-ink-muted hover:text-danger" [attr.aria-label]="'common.delete' | transloco">✕</button>
    </li>
  `,
})
export class TaskRowComponent {
  /** The original row dims while it is being dragged, so the list underneath the pointer stays readable. */
  dragging = false;

  onDragStart(event: DragEvent) {
    const transfer = event.dataTransfer;
    if (!transfer) return;

    transfer.setData(TASK_DRAG_TYPE, JSON.stringify(this.task));
    transfer.effectAllowed = 'move';

    // The browser's drag image is a snapshot of the row at full opacity, which hides the drop target — swap in a see-through copy.
    const row = event.currentTarget as HTMLElement;
    const ghost = row.cloneNode(true) as HTMLElement;
    ghost.style.cssText = `position:fixed;top:-1000px;left:0;width:${row.offsetWidth}px;opacity:0.45;pointer-events:none`;
    document.body.appendChild(ghost);
    transfer.setDragImage(ghost, event.offsetX, event.offsetY);
    setTimeout(() => {
      ghost.remove();
      this.dragging = true;
    });
  }

  @Input({ required: true }) task!: NodeResponse;
  @Input() members: FamilyMemberResponse[] = [];
  /** Which list the task comes from, when a view mixes several (the combined Inbox). */
  @Input() origin: string | null = null;
  @Output() toggleDone = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();

  protected readonly memberName = memberName;
  protected readonly memberColor = memberColor;

  hasTime(task: NodeResponse): boolean {
    return hasTimeOfDay(task.until);
  }

  dueClassFor(task: NodeResponse): string {
    return dueClass(task);
  }
}

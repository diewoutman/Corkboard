import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AgendaItem } from '../../../core/agenda';
import { FamilyMemberResponse } from '../../../core/models';
import { MemberAvatarsComponent } from '../../member-avatars.component';

/**
 * One row of an `AgendaItem` (see `core/agenda.ts`) — the shared shape behind Today, the home
 * screen's Today widget, and Upcoming's day groups / overdue banner. Those four call sites differ
 * only in size, whether the divider/avatars/badge show, and how the title is colored — real,
 * pre-existing variance (not invented here), captured as inputs instead of four near-duplicate
 * components:
 *  - Today / Today-widget: `titleMode="auto"` (color follows `item.overdue`, shows the "Overdue"
 *    badge), no avatars (already grouped by member).
 *  - Upcoming's day rows: `titleMode="normal"` (never overdue by construction), shows avatars.
 *  - Upcoming's overdue banner: `titleMode="danger"`, shows avatars, `timeFormat="mediumDate"`.
 */
@Component({
  selector: 'app-agenda-list-item',
  standalone: true,
  host: { class: 'contents' },
  imports: [DatePipe, MemberAvatarsComponent, TranslocoPipe],
  template: `
    <li class="flex items-center gap-2 py-1.5" [class]="dividerClass">
      @if (item.kind === 'task') {
        <input type="checkbox" (change)="toggleDone.emit()" class="shrink-0 rounded-md accent-coral" [class]="checkboxSizeClass" />
      } @else {
        <span class="shrink-0 rounded-full bg-wouter" [class]="dotSizeClass"></span>
      }

      <span class="truncate text-sm" [class]="titleClass">{{ item.title }}</span>

      @if (titleMode === 'auto' && item.overdue) {
        <span class="shrink-0 rounded-full bg-danger px-2 py-0.5 text-xs font-extrabold text-white">{{ 'shared.overdue' | transloco }}</span>
      }

      @if (showAvatars) {
        <app-member-avatars class="ml-auto shrink-0" [members]="members" [assignedIds]="item.assignedFamilyMemberIds" />
      }

      @if (item.time) {
        <span class="shrink-0 text-xs font-bold" [class]="timeClass">{{ item.time | date: timeFormat }}</span>
      }
    </li>
  `,
})
export class AgendaListItemComponent {
  @Input({ required: true }) item!: AgendaItem;
  @Input() members: FamilyMemberResponse[] = [];
  @Input() showAvatars = false;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() dashedDivider = false;
  @Input() titleMode: 'auto' | 'normal' | 'danger' = 'auto';
  @Input() timeFormat: 'shortTime' | 'mediumDate' = 'shortTime';
  @Output() toggleDone = new EventEmitter<void>();

  get dividerClass(): string {
    return this.dashedDivider ? 'border-t-2 border-dashed border-cork first:border-t-0 first:pt-0' : '';
  }

  get checkboxSizeClass(): string {
    return this.size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  }

  get dotSizeClass(): string {
    return this.size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';
  }

  get titleClass(): string {
    if (this.titleMode === 'danger') return 'font-extrabold text-danger-text-strong';
    if (this.titleMode === 'normal') return 'font-semibold text-ink';
    return this.item.overdue ? 'text-danger font-extrabold' : 'font-semibold text-ink';
  }

  get timeClass(): string {
    const align = this.showAvatars ? '' : 'ml-auto ';
    return align + (this.titleMode === 'danger' ? 'text-danger-text' : 'text-ink-muted');
  }
}

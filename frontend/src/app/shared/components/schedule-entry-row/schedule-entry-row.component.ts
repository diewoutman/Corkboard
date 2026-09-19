import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { memberColor, memberName } from '../../../core/member-lookup';
import { isBiweekly, endsOn } from '../../../core/recurrence';
import { MemberBadgeComponent } from '../member-badge/member-badge.component';

/**
 * A single schedule entry in Schedule-editor's weekday columns. Normalized onto the app's coral/ink
 * design tokens and `MemberBadgeComponent` — the page previously rendered this with the old
 * gray/blue classes and a flat, non-color-coded assignee pill (see plan's Phase 3 notes).
 */
@Component({
  selector: 'app-schedule-entry-row',
  standalone: true,
  host: { class: 'contents' },
  imports: [DatePipe, MemberBadgeComponent, TranslocoPipe],
  template: `
    <li class="rounded-xl border-2 border-border-soft px-2 py-1.5">
      <div class="flex items-start justify-between gap-1">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-ink">{{ entry.title }}</p>
          <p class="text-xs text-ink-muted">
            {{ entry.from | date: 'shortTime' }}@if (entry.until) {<span> – {{ entry.until | date: 'shortTime' }}</span>}
          </p>
          @if (entry.location) {
            <p class="text-xs text-ink-muted">📍 {{ entry.location }}</p>
          }
          @if (biweekly || until) {
            <p class="text-xs text-ink-muted/80">
              @if (biweekly) {<span>{{ 'shared.every_other_week' | transloco }}</span>}
              @if (biweekly && until) {<span> · </span>}
              @if (until) {<span>{{ 'shared.ends' | transloco: { date: until } }}</span>}
            </p>
          }
        </div>
        <button type="button" (click)="edit.emit()" class="shrink-0 text-ink-muted hover:text-coral" [attr.aria-label]="'common.edit' | transloco">✎</button>
        <button type="button" (click)="delete.emit()" class="shrink-0 text-ink-muted hover:text-danger" [attr.aria-label]="'common.delete' | transloco">✕</button>
      </div>
      <div class="mt-1 flex flex-wrap gap-1">
        @for (memberId of entry.assignedFamilyMemberIds; track memberId) {
          <app-member-badge [name]="memberName(members, memberId)" [color]="memberColor(members, memberId)" size="xs" />
        }
      </div>
    </li>
  `,
})
export class ScheduleEntryRowComponent {
  @Input({ required: true }) entry!: NodeResponse;
  @Input() members: FamilyMemberResponse[] = [];
  @Output() delete = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();

  protected readonly memberName = memberName;
  protected readonly memberColor = memberColor;

  get biweekly(): boolean {
    return isBiweekly(this.entry);
  }

  get until(): string | null {
    return endsOn(this.entry);
  }
}

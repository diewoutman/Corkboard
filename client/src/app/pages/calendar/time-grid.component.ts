import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { dayKeyOf } from '../../core/agenda';
import { OccurrenceResponse } from '../../core/models';

const HOUR_HEIGHT = 48;
const SNAP_MINUTES = 15;
const MIN_EVENT_MINUTES = 30;
const CLICK_THRESHOLD_PX = 6;

interface LanedOccurrence {
  occurrence: OccurrenceResponse;
  startMinutes: number;
  endMinutes: number;
  lane: number;
  laneCount: number;
}

interface DayColumn {
  date: Date;
  dayKey: string;
  allDay: OccurrenceResponse[];
  timed: LanedOccurrence[];
}

interface DragState {
  mode: 'create' | 'move';
  pointerId: number;
  startClientY: number;
  moved: boolean;
  /** create: the Y position the drag started at, minutes stay relative to this. move: the block's original start. */
  anchorMinutes: number;
  durationMinutes: number;
  occurrence?: OccurrenceResponse;
  /** Live values, updated as the pointer moves. */
  dayIndex: number;
  startMinutes: number;
}

/**
 * An hour-by-hour grid for 1 (Day) or 7 (Week) columns — Google-Calendar-style
 * click-drag to create an event, and drag an existing block to reschedule it.
 * A plain click (no real movement) on empty grid space selects the day instead,
 * matching the month grid's existing "select day" behavior.
 */
@Component({
  selector: 'app-time-grid',
  templateUrl: './time-grid.component.html',
  standalone: false,
})
export class TimeGridComponent implements OnChanges {
  @Input() days: Date[] = [];
  @Input() occurrences: OccurrenceResponse[] = [];
  @Input() calendarColor!: (collectionId: string) => string;

  @Output() createRange = new EventEmitter<{ date: Date; start: Date; end: Date }>();
  @Output() reschedule = new EventEmitter<{ occurrence: OccurrenceResponse; newStart: Date; newEnd: Date | null }>();
  @Output() selectDay = new EventEmitter<Date>();
  @Output() deleteOccurrence = new EventEmitter<OccurrenceResponse>();

  readonly hours = Array.from({ length: 24 }, (_, i) => i);
  readonly hourHeight = HOUR_HEIGHT;
  columns: DayColumn[] = [];

  ghostVisible = false;
  ghostDayIndex = 0;
  ghostTop = 0;
  ghostHeight = 0;

  private drag: DragState | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['days'] || changes['occurrences']) {
      this.columns = this.days.map((date) => this.buildColumn(date));
    }
  }

  trackByDayKey(_: number, column: DayColumn): string {
    return column.dayKey;
  }

  trackByOccurrenceKey(_: number, laned: LanedOccurrence): string {
    return laned.occurrence.appointmentId + laned.occurrence.originalDate;
  }

  topPx(minutes: number): number {
    return minutesToPx(minutes);
  }

  heightPx(minutes: number): number {
    return minutesToPx(minutes);
  }

  isToday(date: Date): boolean {
    return dayKeyOf(date) === dayKeyOf(new Date());
  }

  hasAnyAllDay(): boolean {
    return this.columns.some((c) => c.allDay.length > 0);
  }

  nowOffsetPx(): number {
    return minutesToPx(minutesOfDay(new Date()));
  }

  onColumnPointerDown(event: PointerEvent, dayIndex: number) {
    // Drag-to-create/reschedule is mouse-only — on touch it would have to fight the
    // browser's native scroll gesture (touch-scrolling the day open is more important
    // than drag-creation there); touch devices fall back to the "+ Add event" button.
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const minutes = snapMinutes(pxToMinutes(event.clientY - rect.top));

    this.drag = {
      mode: 'create',
      pointerId: event.pointerId,
      startClientY: event.clientY,
      moved: false,
      anchorMinutes: minutes,
      durationMinutes: SNAP_MINUTES,
      dayIndex,
      startMinutes: minutes,
    };
  }

  onDeleteClick(event: MouseEvent, occurrence: OccurrenceResponse) {
    event.stopPropagation();
    this.deleteOccurrence.emit(occurrence);
  }

  onBlockPointerDown(event: PointerEvent, laned: LanedOccurrence, dayIndex: number) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    event.stopPropagation();

    this.drag = {
      mode: 'move',
      pointerId: event.pointerId,
      startClientY: event.clientY,
      moved: false,
      anchorMinutes: laned.startMinutes,
      durationMinutes: laned.endMinutes - laned.startMinutes,
      occurrence: laned.occurrence,
      dayIndex,
      startMinutes: laned.startMinutes,
    };
  }

  @HostListener('document:pointermove', ['$event'])
  onDocumentPointerMove(event: PointerEvent) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const drag = this.drag;

    const deltaY = event.clientY - drag.startClientY;
    if (!drag.moved && Math.abs(deltaY) > CLICK_THRESHOLD_PX) drag.moved = true;
    const deltaMinutes = snapMinutes(pxToMinutes(deltaY));

    if (drag.mode === 'create') {
      const a = drag.anchorMinutes;
      const b = clampMinutes(a + deltaMinutes);
      drag.startMinutes = Math.min(a, b);
      drag.durationMinutes = Math.max(SNAP_MINUTES, Math.abs(b - a));
    } else {
      drag.startMinutes = clampMinutes(drag.anchorMinutes + deltaMinutes, drag.durationMinutes);

      const columnEl = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-day-index]');
      if (columnEl) drag.dayIndex = Number(columnEl.dataset['dayIndex']);
    }

    this.ghostVisible = drag.moved;
    this.ghostDayIndex = drag.dayIndex;
    this.ghostTop = minutesToPx(drag.startMinutes);
    this.ghostHeight = minutesToPx(drag.durationMinutes);
  }

  @HostListener('document:pointerup', ['$event'])
  onDocumentPointerUp(event: PointerEvent) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const drag = this.drag;
    this.drag = null;
    this.ghostVisible = false;

    const column = this.columns[drag.dayIndex];
    if (!column) return;

    if (drag.mode === 'create') {
      if (!drag.moved) {
        this.selectDay.emit(column.date);
        return;
      }
      this.createRange.emit({
        date: column.date,
        start: atMinutes(column.date, drag.startMinutes),
        end: atMinutes(column.date, drag.startMinutes + drag.durationMinutes),
      });
    } else if (drag.moved) {
      this.reschedule.emit({
        occurrence: drag.occurrence!,
        newStart: atMinutes(column.date, drag.startMinutes),
        newEnd: atMinutes(column.date, drag.startMinutes + drag.durationMinutes),
      });
    }
  }

  private buildColumn(date: Date): DayColumn {
    const key = dayKeyOf(date);
    const dayOccurrences = this.occurrences.filter((o) => o.originalDate === key);
    return {
      date,
      dayKey: key,
      allDay: dayOccurrences.filter((o) => o.allDay),
      timed: this.layoutLanes(dayOccurrences.filter((o) => !o.allDay)),
    };
  }

  /** Greedy lane assignment so overlapping events sit side by side instead of stacking illegibly. */
  private layoutLanes(occurrences: OccurrenceResponse[]): LanedOccurrence[] {
    const items = occurrences
      .map((occurrence) => {
        const start = minutesOfDay(new Date(occurrence.from));
        const end = occurrence.until ? Math.max(minutesOfDay(new Date(occurrence.until)), start + MIN_EVENT_MINUTES) : start + MIN_EVENT_MINUTES;
        return { occurrence, startMinutes: start, endMinutes: Math.min(end, 24 * 60) };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);

    const laneEnds: number[] = [];
    const placed = items.map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.startMinutes);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.endMinutes);
      } else {
        laneEnds[lane] = item.endMinutes;
      }
      return { ...item, lane };
    });

    const laneCount = Math.max(1, laneEnds.length);
    return placed.map((p) => ({ ...p, laneCount }));
  }
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function pxToMinutes(px: number): number {
  return (px / HOUR_HEIGHT) * 60;
}

function minutesToPx(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT;
}

function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function clampMinutes(minutes: number, duration = 0): number {
  return Math.min(Math.max(minutes, 0), 24 * 60 - duration);
}

function atMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setHours(0, minutes, 0, 0);
  return result;
}

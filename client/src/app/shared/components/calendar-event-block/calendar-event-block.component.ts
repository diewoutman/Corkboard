import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * A single positioned occurrence block inside Calendar's time grid (Week/Day view): a colored
 * rectangle with a hover-reveal delete button. Position/size (top/height/left/width) and the lane
 * layout that produces them are computed by `TimeGridComponent` — this component only renders the
 * block and forwards the pointerdown that `TimeGridComponent` uses to drive reschedule-by-drag.
 */
@Component({
  selector: 'app-calendar-event-block',
  standalone: true,
  host: {
    'data-occurrence-block': '',
    class:
      'group absolute z-20 cursor-grab overflow-hidden rounded-lg px-1 py-0.5 text-[10px] font-bold leading-tight text-white shadow-[0_2px_0_0_rgba(0,0,0,0.12)] active:cursor-grabbing',
    '[style.background]': 'color',
    '[style.top.px]': 'top',
    '[style.height.px]': 'height',
    '[style.left]': 'left',
    '[style.width]': 'width',
    '(pointerdown)': 'blockPointerDown.emit($event)',
  },
  template: `
    <button
      type="button"
      class="float-right ml-1 hidden shrink-0 leading-none opacity-80 hover:opacity-100 group-hover:inline"
      aria-label="Delete"
      (pointerdown)="$event.stopPropagation()"
      (click)="deleteClick.emit($event)"
    >✕</button>
    <button
      type="button"
      class="float-right ml-1 hidden shrink-0 leading-none opacity-80 hover:opacity-100 group-hover:inline"
      aria-label="Edit"
      (pointerdown)="$event.stopPropagation()"
      (click)="editClick.emit($event)"
    >✎</button>
    {{ title }}
  `,
})
export class CalendarEventBlockComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) color!: string;
  @Input({ required: true }) top!: number;
  @Input({ required: true }) height!: number;
  @Input({ required: true }) left!: string;
  @Input({ required: true }) width!: string;

  @Output() blockPointerDown = new EventEmitter<PointerEvent>();
  @Output() deleteClick = new EventEmitter<MouseEvent>();
  @Output() editClick = new EventEmitter<MouseEvent>();
}

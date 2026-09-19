import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { CalendarEventBlockComponent } from './calendar-event-block.component';

const meta: Meta<CalendarEventBlockComponent> = {
  title: 'Shared/CalendarEventBlock',
  component: CalendarEventBlockComponent,
  args: {
    title: 'Dentist',
    color: '#ec5542',
    top: 0,
    height: 96,
    left: '0%',
    width: 'calc(100% - 2px)',
    blockPointerDown: fn(),
    deleteClick: fn(),
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="position: relative; height: 12rem;">
        <app-calendar-event-block
          [title]="title"
          [color]="color"
          [top]="top"
          [height]="height"
          [left]="left"
          [width]="width"
          (blockPointerDown)="blockPointerDown($event)"
          (deleteClick)="deleteClick($event)"
        ></app-calendar-event-block>
      </div>
    `,
  }),
};
export default meta;

type Story = StoryObj<CalendarEventBlockComponent>;

export const Default: Story = {};

export const ShortDuration: Story = {
  args: { height: 24, title: 'Standup' },
};

export const LongTitle: Story = {
  args: { title: 'Annual dentist checkup and cleaning appointment' },
};

export const SideBySideLanes: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="position: relative; height: 12rem;">
        <app-calendar-event-block title="Piano" color="#2a80e2" [top]="0" [height]="96" left="0%" width="calc(50% - 2px)"></app-calendar-event-block>
        <app-calendar-event-block title="Soccer" color="#ec5542" [top]="24" [height]="72" left="50%" width="calc(50% - 2px)"></app-calendar-event-block>
      </div>
    `,
  }),
};

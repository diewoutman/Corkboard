import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { CalendarSourceFormComponent } from './calendar-source-form.component';

const meta: Meta<CalendarSourceFormComponent> = {
  title: 'Shared/CalendarSourceForm',
  component: CalendarSourceFormComponent,
  args: {
    namePlaceholder: 'e.g. Family, Work…',
    colorLabel: 'Calendar color',
    name: '',
    color: '#ec5542',
    nameChange: fn(),
    colorChange: fn(),
    submitted: fn(),
    cancelled: fn(),
  },
};
export default meta;

type Story = StoryObj<CalendarSourceFormComponent>;

export const AddCalendar: Story = {};

export const AddSchedule: Story = {
  args: { namePlaceholder: 'e.g. School schedule…', colorLabel: 'Schedule color' },
};

export const Filled: Story = {
  args: { name: 'Family' },
};

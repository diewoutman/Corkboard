import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { SegmentedControlComponent } from './segmented-control.component';

const meta: Meta<SegmentedControlComponent> = {
  title: 'Shared/SegmentedControl',
  component: SegmentedControlComponent,
  args: {
    options: [
      { value: 'month', label: 'Month' },
      { value: 'week', label: 'Week' },
      { value: 'day', label: 'Day' },
    ],
    selected: 'month',
    selectedChange: fn(),
  },
};
export default meta;

type Story = StoryObj<SegmentedControlComponent>;

export const MonthSelected: Story = {};

export const DaySelected: Story = {
  args: { selected: 'day' },
};

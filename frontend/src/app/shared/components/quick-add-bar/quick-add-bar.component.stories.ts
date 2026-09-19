import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { QuickAddBarComponent } from './quick-add-bar.component';

const meta: Meta<QuickAddBarComponent> = {
  title: 'Shared/QuickAddBar',
  component: QuickAddBarComponent,
  args: {
    placeholder: 'Add a task… try "Buy milk tomorrow 5pm #Groceries"',
    submitted: fn(),
  },
};
export default meta;

type Story = StoryObj<QuickAddBarComponent>;

export const Tasks: Story = {};

export const Calendar: Story = {
  args: { placeholder: 'Add an event… try "Dentist tomorrow 3pm"' },
};

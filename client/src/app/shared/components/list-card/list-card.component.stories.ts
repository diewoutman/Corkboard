import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ListCardComponent } from './list-card.component';

const meta: Meta<ListCardComponent> = {
  title: 'Shared/ListCard',
  component: ListCardComponent,
  args: { name: 'Groceries', color: '#ec5542', nodeCount: 8, incompleteCount: 3 },
};
export default meta;

type Story = StoryObj<ListCardComponent>;

export const InProgress: Story = {};

export const Empty: Story = {
  args: { nodeCount: 0, incompleteCount: 0 },
};

export const AllDone: Story = {
  args: { nodeCount: 5, incompleteCount: 0 },
};

// A light user-picked color should flip to dark text/progress instead of staying white-on-white.
export const LightColor: Story = {
  args: { color: '#f5e642', nodeCount: 4, incompleteCount: 2 },
};

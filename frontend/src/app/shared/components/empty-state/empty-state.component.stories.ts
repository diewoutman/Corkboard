import type { Meta, StoryObj } from '@storybook/angular-vite';
import { EmptyStateComponent } from './empty-state.component';

const meta: Meta<EmptyStateComponent> = {
  title: 'Shared/EmptyState',
  component: EmptyStateComponent,
};
export default meta;

type Story = StoryObj<EmptyStateComponent>;

export const Default: Story = {
  render: () => ({
    template: `<app-empty-state>No notes here yet.</app-empty-state>`,
  }),
};

export const WithEmoji: Story = {
  render: () => ({
    template: `<app-empty-state>Nothing due today. 🎉</app-empty-state>`,
  }),
};

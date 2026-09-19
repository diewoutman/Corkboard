import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LoadingIndicatorComponent } from './loading-indicator.component';

const meta: Meta<LoadingIndicatorComponent> = {
  title: 'Shared/LoadingIndicator',
  component: LoadingIndicatorComponent,
};
export default meta;

type Story = StoryObj<LoadingIndicatorComponent>;

export const Default: Story = {};

export const CustomText: Story = {
  args: { text: 'Fetching your tasks…' },
};

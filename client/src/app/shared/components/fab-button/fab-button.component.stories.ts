import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { FabButtonComponent } from './fab-button.component';

const meta: Meta<FabButtonComponent> = {
  title: 'Shared/FabButton',
  component: FabButtonComponent,
  args: { label: 'Add task', clicked: fn() },
};
export default meta;

type Story = StoryObj<FabButtonComponent>;

export const Default: Story = {};

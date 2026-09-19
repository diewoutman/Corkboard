import type { Meta, StoryObj } from '@storybook/angular-vite';
import { RoleBadgeComponent } from './role-badge.component';

const meta: Meta<RoleBadgeComponent> = {
  title: 'Shared/RoleBadge',
  component: RoleBadgeComponent,
  argTypes: {
    role: { control: 'select', options: ['Owner', 'Adult', 'Member'] },
  },
};
export default meta;

type Story = StoryObj<RoleBadgeComponent>;

export const Owner: Story = { args: { role: 'Owner' } };
export const Adult: Story = { args: { role: 'Adult' } };
export const Member: Story = { args: { role: 'Member' } };

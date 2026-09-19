import type { Meta, StoryObj } from '@storybook/angular-vite';
import { MemberBadgeComponent } from './member-badge.component';

const meta: Meta<MemberBadgeComponent> = {
  title: 'Shared/MemberBadge',
  component: MemberBadgeComponent,
  args: { name: 'Wouter', color: '#ec5542' },
};
export default meta;

type Story = StoryObj<MemberBadgeComponent>;

export const Default: Story = {};

export const CompactCalendarSize: Story = {
  args: { size: 'xs' },
};

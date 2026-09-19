import type { Meta, StoryObj } from '@storybook/angular-vite';
import { MemberAvatarComponent } from './member-avatar.component';

const meta: Meta<MemberAvatarComponent> = {
  title: 'Shared/MemberAvatar',
  component: MemberAvatarComponent,
  args: { name: 'Wouter', color: '#2a80e2', size: 'md' },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
};
export default meta;

type Story = StoryObj<MemberAvatarComponent>;

export const Default: Story = {};

export const AllSizes: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display:flex; align-items:center; gap:8px;">
        <app-member-avatar name="${args.name}" color="${args.color}" size="xs"></app-member-avatar>
        <app-member-avatar name="${args.name}" color="${args.color}" size="sm"></app-member-avatar>
        <app-member-avatar name="${args.name}" color="${args.color}" size="md"></app-member-avatar>
        <app-member-avatar name="${args.name}" color="${args.color}" size="lg"></app-member-avatar>
        <app-member-avatar name="${args.name}" color="${args.color}" size="xl"></app-member-avatar>
      </div>
    `,
  }),
};

import type { Meta, StoryObj } from '@storybook/angular-vite';
import { FamilyMemberResponse } from '../core/models';
import { MemberAvatarsComponent } from './member-avatars.component';

const MEMBERS: FamilyMemberResponse[] = [
  {
    id: 'm1',
    displayName: 'Wouter',
    color: '#ec5542',
    avatarUrl: null,
    linkedUserId: 'u1',
    dateOfBirth: null,
    linkedUserEmail: 'wouter@example.com',
    linkedUserRole: 'Owner',
  },
  {
    id: 'm2',
    displayName: 'Sam',
    color: '#2a80e2',
    avatarUrl: null,
    linkedUserId: null,
    dateOfBirth: null,
    linkedUserEmail: null,
    linkedUserRole: null,
  },
  {
    id: 'm3',
    displayName: 'Robin',
    color: '#1eab53',
    avatarUrl: null,
    linkedUserId: null,
    dateOfBirth: null,
    linkedUserEmail: null,
    linkedUserRole: null,
  },
];

const meta: Meta<MemberAvatarsComponent> = {
  title: 'Shared/MemberAvatars',
  component: MemberAvatarsComponent,
};
export default meta;

type Story = StoryObj<MemberAvatarsComponent>;

export const NoneAssigned: Story = {
  args: { members: MEMBERS, assignedIds: [] },
};

export const OneAssigned: Story = {
  args: { members: MEMBERS, assignedIds: ['m1'] },
};

export const AllAssigned: Story = {
  args: { members: MEMBERS, assignedIds: MEMBERS.map((m) => m.id) },
};

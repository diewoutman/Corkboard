import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { FamilyMemberResponse } from '../../../core/models';
import { AssigneeChipGroupComponent } from './assignee-chip-group.component';

const MEMBERS: FamilyMemberResponse[] = [
  { id: 'm1', displayName: 'Wouter', color: '#ec5542', avatarUrl: null, linkedUserId: 'u1', dateOfBirth: null, linkedUserEmail: null, linkedUserRole: 'Owner' },
  { id: 'm2', displayName: 'Sam', color: '#2a80e2', avatarUrl: null, linkedUserId: null, dateOfBirth: null, linkedUserEmail: null, linkedUserRole: null },
  { id: 'm3', displayName: 'Robin', color: '#1eab53', avatarUrl: null, linkedUserId: null, dateOfBirth: null, linkedUserEmail: null, linkedUserRole: null },
];

const meta: Meta<AssigneeChipGroupComponent> = {
  title: 'Shared/AssigneeChipGroup',
  component: AssigneeChipGroupComponent,
  args: { members: MEMBERS, selectedIds: ['m1'], toggled: fn() },
};
export default meta;

type Story = StoryObj<AssigneeChipGroupComponent>;

export const OneSelected: Story = {};

export const NoneSelected: Story = {
  args: { selectedIds: [] },
};

export const AllSelected: Story = {
  args: { selectedIds: MEMBERS.map((m) => m.id) },
};

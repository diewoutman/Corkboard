import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { TaskRowComponent } from './task-row.component';

const MEMBERS: FamilyMemberResponse[] = [
  { id: 'm1', displayName: 'Wouter', color: '#ec5542', avatarUrl: null, linkedUserId: null, dateOfBirth: null, linkedUserEmail: null, linkedUserRole: null },
  { id: 'm2', displayName: 'Sam', color: '#2a80e2', avatarUrl: null, linkedUserId: null, dateOfBirth: null, linkedUserEmail: null, linkedUserRole: null },
];

function task(overrides: Partial<NodeResponse>): NodeResponse {
  return {
    id: 't1',
    type: 'Task',
    title: 'Buy milk',
    description: null,
    from: null,
    until: null,
    createdAt: '',
    updatedAt: '',
    createdByUserId: '',
    assignedFamilyMemberIds: [],
    collectionId: null,
    isImportant: null,
    isCompleted: false,
    completedAt: null,
    priority: null,
    category: null,
    location: null,
    allDay: null,
    recurrenceRule: null,
    firstName: null,
    lastName: null,
    dateOfBirth: null,
    street: null,
    city: null,
    postalCode: null,
    country: null,
    phoneNumbers: [],
    emails: [],
    ...overrides,
  };
}

const meta: Meta<TaskRowComponent> = {
  title: 'Shared/TaskRow',
  component: TaskRowComponent,
  args: { members: MEMBERS, toggleDone: fn(), delete: fn() },
};
export default meta;

type Story = StoryObj<TaskRowComponent>;

export const Basic: Story = {
  args: { task: task({ assignedFamilyMemberIds: ['m1'] }) },
};

export const OverdueWithDescription: Story = {
  args: {
    task: task({
      title: 'Pay the rent',
      description: 'Bank transfer, ref: March',
      until: '2020-01-01',
      assignedFamilyMemberIds: ['m1', 'm2'],
    }),
  },
};

export const RecurringDueSoon: Story = {
  args: {
    task: task({
      title: 'Take out the trash',
      until: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      recurrenceRule: 'FREQ=WEEKLY',
      assignedFamilyMemberIds: ['m2'],
    }),
  },
};

export const Completed: Story = {
  args: {
    task: task({ title: 'Water the plants', isCompleted: true, until: '2024-01-01' }),
  },
};

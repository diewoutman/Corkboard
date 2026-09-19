import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { ScheduleEntryRowComponent } from './schedule-entry-row.component';

const MEMBERS: FamilyMemberResponse[] = [
  { id: 'm1', displayName: 'Wouter', color: '#ec5542', avatarUrl: null, linkedUserId: null, dateOfBirth: null, linkedUserEmail: null, linkedUserRole: null },
];

function entry(overrides: Partial<NodeResponse>): NodeResponse {
  return {
    id: 'e1',
    type: 'Appointment',
    title: 'Swim practice',
    description: null,
    from: '2026-01-05T16:00:00Z',
    until: '2026-01-05T17:00:00Z',
    createdAt: '',
    updatedAt: '',
    createdByUserId: '',
    assignedFamilyMemberIds: ['m1'],
    collectionId: null,
    isImportant: null,
    isCompleted: null,
    completedAt: null,
    priority: null,
    sectionId: null,
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

const meta: Meta<ScheduleEntryRowComponent> = {
  title: 'Shared/ScheduleEntryRow',
  component: ScheduleEntryRowComponent,
  args: { members: MEMBERS, delete: fn() },
};
export default meta;

type Story = StoryObj<ScheduleEntryRowComponent>;

export const Basic: Story = {
  args: { entry: entry({}) },
};

export const WithLocationAndRecurrence: Story = {
  args: {
    entry: entry({
      location: 'City Pool',
      recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2;UNTIL=20260601T000000Z',
    }),
  },
};

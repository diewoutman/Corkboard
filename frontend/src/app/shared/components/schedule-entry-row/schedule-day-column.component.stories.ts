import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { ScheduleDayColumnComponent } from './schedule-day-column.component';

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

const meta: Meta<ScheduleDayColumnComponent> = {
  title: 'Shared/ScheduleDayColumn',
  component: ScheduleDayColumnComponent,
  args: { label: 'Monday', members: MEMBERS, deleteEntry: fn() },
};
export default meta;

type Story = StoryObj<ScheduleDayColumnComponent>;

export const WithEntries: Story = {
  args: { entries: [entry({ id: 'e1' }), entry({ id: 'e2', title: 'Piano lesson', from: '2026-01-05T18:00:00Z', until: '2026-01-05T18:30:00Z' })] },
};

export const Empty: Story = {
  args: { entries: [] },
};

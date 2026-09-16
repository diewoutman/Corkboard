import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { AgendaItem } from '../../../core/agenda';
import { FamilyMemberResponse } from '../../../core/models';
import { AgendaListItemComponent } from './agenda-list-item.component';

const MEMBERS: FamilyMemberResponse[] = [
  { id: 'm1', displayName: 'Wouter', color: '#ec5542', avatarUrl: null, linkedUserId: null, dateOfBirth: null, linkedUserEmail: null, linkedUserRole: null },
];

function item(overrides: Partial<AgendaItem>): AgendaItem {
  return {
    key: 'k1',
    kind: 'task',
    title: 'Buy milk',
    time: '2026-01-05T17:00:00Z',
    overdue: false,
    assignedFamilyMemberIds: ['m1'],
    dayKey: '2026-01-05',
    ...overrides,
  };
}

const meta: Meta<AgendaListItemComponent> = {
  title: 'Shared/AgendaListItem',
  component: AgendaListItemComponent,
  args: { members: MEMBERS, toggleDone: fn() },
};
export default meta;

type Story = StoryObj<AgendaListItemComponent>;

export const TodayTask: Story = {
  args: { item: item({}), dashedDivider: true },
};

export const TodayOverdue: Story = {
  args: { item: item({ title: 'Pay the rent', overdue: true }), dashedDivider: true },
};

export const TodayEvent: Story = {
  args: { item: item({ kind: 'event', title: 'Dentist' }), dashedDivider: true },
};

export const UpcomingDayRow: Story = {
  args: { item: item({}), titleMode: 'normal', size: 'sm', showAvatars: true },
};

export const UpcomingOverdueBanner: Story = {
  args: {
    item: item({ title: 'Renew passport', time: '2025-12-01T00:00:00Z' }),
    titleMode: 'danger',
    showAvatars: true,
    timeFormat: 'mediumDate',
  },
};

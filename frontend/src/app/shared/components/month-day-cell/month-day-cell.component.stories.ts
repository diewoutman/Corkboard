import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { OccurrenceResponse } from '../../../core/models';
import { MonthDayCellComponent } from './month-day-cell.component';

function occurrence(overrides: Partial<OccurrenceResponse>): OccurrenceResponse {
  return {
    appointmentId: 'a1',
    collectionId: 'c1',
    originalDate: '2026-01-05',
    from: '2026-01-05T16:00:00Z',
    until: '2026-01-05T17:00:00Z',
    title: 'Dentist',
    location: null,
    allDay: false,
    isException: false,
    isRecurring: false,
    assignedFamilyMemberIds: [],
    ...overrides,
  };
}

const COLORS: Record<string, string> = { c1: '#ec5542', c2: '#2a80e2' };

const meta: Meta<MonthDayCellComponent> = {
  title: 'Shared/MonthDayCell',
  component: MonthDayCellComponent,
  args: {
    date: new Date(2026, 0, 5),
    calendarColor: (id: string) => COLORS[id] ?? '#999',
    daySelected: fn(),
  },
};
export default meta;

type Story = StoryObj<MonthDayCellComponent>;

export const Empty: Story = {
  args: { occurrences: [] },
};

export const WithEvents: Story = {
  args: { occurrences: [occurrence({ appointmentId: 'a1' }), occurrence({ appointmentId: 'a2', title: 'Piano', collectionId: 'c2' })] },
};

export const Overflowing: Story = {
  args: {
    occurrences: [
      occurrence({ appointmentId: 'a1' }),
      occurrence({ appointmentId: 'a2', title: 'Piano', collectionId: 'c2' }),
      occurrence({ appointmentId: 'a3', title: 'Soccer practice' }),
      occurrence({ appointmentId: 'a4', title: 'Birthday party', collectionId: 'c2' }),
    ],
  },
};

export const Today: Story = {
  args: { occurrences: [], isToday: true },
};

export const Selected: Story = {
  args: { occurrences: [], selected: true },
};

export const OutsideCurrentMonth: Story = {
  args: { occurrences: [], inCurrentMonth: false },
};

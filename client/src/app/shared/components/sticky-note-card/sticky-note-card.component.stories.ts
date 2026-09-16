import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { FamilyMemberResponse, NodeResponse } from '../../../core/models';
import { StickyNoteCardComponent } from './sticky-note-card.component';

const MEMBERS: FamilyMemberResponse[] = [
  { id: 'm1', displayName: 'Wouter', color: '#ec5542', avatarUrl: null, linkedUserId: null, dateOfBirth: null, linkedUserEmail: null, linkedUserRole: null },
];

function note(overrides: Partial<NodeResponse>): NodeResponse {
  return {
    id: 'n1',
    type: 'Note',
    title: 'Wifi password',
    description: null,
    from: null,
    until: null,
    createdAt: '',
    updatedAt: '',
    createdByUserId: '',
    assignedFamilyMemberIds: [],
    collectionId: null,
    isImportant: false,
    isCompleted: null,
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

const meta: Meta<StickyNoteCardComponent> = {
  title: 'Shared/StickyNoteCard',
  component: StickyNoteCardComponent,
  args: { members: MEMBERS, toggleImportant: fn(), delete: fn() },
};
export default meta;

type Story = StoryObj<StickyNoteCardComponent>;

export const Default: Story = {
  args: { note: note({ description: 'CorkboardWifi2024', assignedFamilyMemberIds: ['m1'] }), index: 0 },
};

export const Important: Story = {
  args: { note: note({ title: "Don't forget Grandma's birthday", isImportant: true }), index: 1 },
};

export const ColorCycle: Story = {
  render: () => ({
    template: `
      <div style="display:grid; grid-template-columns: repeat(3, 200px); gap: 16px;">
        ${[0, 1, 2, 3, 4, 5]
          .map(
            (i) =>
              `<app-sticky-note-card [note]="note${i}" [index]="${i}"></app-sticky-note-card>`,
          )
          .join('\n')}
      </div>
    `,
    props: Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`note${i}`, note({ title: `Note ${i + 1}` })])),
  }),
};

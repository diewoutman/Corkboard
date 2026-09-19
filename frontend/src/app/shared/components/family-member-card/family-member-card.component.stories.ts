import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { FamilyMemberResponse } from '../../../core/models';
import { FamilyMemberCardComponent } from './family-member-card.component';

const OWNER: FamilyMemberResponse = {
  id: 'm1',
  displayName: 'Wouter',
  color: '#ec5542',
  avatarUrl: null,
  linkedUserId: 'u1',
  dateOfBirth: '1990-04-12',
  linkedUserEmail: 'wouter@example.com',
  linkedUserRole: 'Owner',
};

const NO_LOGIN: FamilyMemberResponse = {
  id: 'm2',
  displayName: 'Robin',
  color: '#1eab53',
  avatarUrl: null,
  linkedUserId: null,
  dateOfBirth: null,
  linkedUserEmail: null,
  linkedUserRole: null,
};

const meta: Meta<FamilyMemberCardComponent> = {
  title: 'Shared/FamilyMemberCard',
  component: FamilyMemberCardComponent,
  args: { edit: fn(), remove: fn() },
};
export default meta;

type Story = StoryObj<FamilyMemberCardComponent>;

export const WithOwnerLogin: Story = {
  args: { member: OWNER },
};

export const NoLoginYet: Story = {
  args: { member: NO_LOGIN },
  render: (args) => ({
    props: args,
    template: `<app-family-member-card [member]="member" (edit)="edit()" (remove)="remove()">
      <p class="mt-1.5 text-xs font-semibold text-ink-muted">No login yet — only the Owner can create one.</p>
    </app-family-member-card>`,
  }),
};

import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { ContactListRowComponent } from './contact-list-row.component';

const meta: Meta<ContactListRowComponent> = {
  title: 'Shared/ContactListRow',
  component: ContactListRowComponent,
  args: { firstName: 'Jane', lastName: 'Doe', color: '#b45bc8', rowSelected: fn() },
};
export default meta;

type Story = StoryObj<ContactListRowComponent>;

export const Default: Story = {};

export const Selected: Story = {
  args: { selected: true },
};

export const WithHousehold: Story = {
  args: { householdName: 'Smith Household' },
};

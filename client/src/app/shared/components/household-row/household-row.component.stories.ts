import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { CollectionResponse } from '../../../core/models';
import { HouseholdRowComponent } from './household-row.component';

function household(overrides: Partial<CollectionResponse>): CollectionResponse {
  return {
    id: 'h1',
    name: 'Jansen',
    type: 'Household',
    color: '#ec5542',
    parentCollectionId: null,
    createdAt: '2026-01-01T00:00:00Z',
    nodeCount: 0,
    incompleteCount: null,
    feedUrl: null,
    street: null,
    city: null,
    postalCode: null,
    country: null,
    ...overrides,
  };
}

const meta: Meta<HouseholdRowComponent> = {
  title: 'Shared/HouseholdRow',
  component: HouseholdRowComponent,
  args: {
    edit: fn(),
  },
  render: (args) => ({
    props: args,
    template: `<ul><app-household-row [household]="household" (edit)="edit()"></app-household-row></ul>`,
  }),
};
export default meta;

type Story = StoryObj<HouseholdRowComponent>;

export const NoAddress: Story = {
  args: { household: household({}) },
};

export const FullAddress: Story = {
  args: { household: household({ street: 'Kerkstraat 12', postalCode: '1234 AB', city: 'Amsterdam', country: 'Netherlands' }) },
};

export const CityOnly: Story = {
  args: { household: household({ city: 'Amsterdam' }) },
};

export const NoCountry: Story = {
  args: { household: household({ street: 'Kerkstraat 12', postalCode: '1234 AB', city: 'Amsterdam' }) },
};

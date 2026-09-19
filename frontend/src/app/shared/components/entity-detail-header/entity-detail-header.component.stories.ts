import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { EntityDetailHeaderComponent } from './entity-detail-header.component';

const meta: Meta<EntityDetailHeaderComponent> = {
  title: 'Shared/EntityDetailHeader',
  component: EntityDetailHeaderComponent,
  args: {
    avatarName: 'Jane',
    displayName: 'Jane Doe',
    color: '#b45bc8',
    edit: fn(),
    remove: fn(),
  },
};
export default meta;

type Story = StoryObj<EntityDetailHeaderComponent>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/angular-vite';
import { IconTileComponent } from './icon-tile.component';

const TASKS_ICON = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';

const meta: Meta<IconTileComponent> = {
  title: 'Shared/IconTile',
  component: IconTileComponent,
  args: { icon: TASKS_ICON, title: 'Tasks', colorClass: 'bg-coral' },
};
export default meta;

type Story = StoryObj<IconTileComponent>;

export const Default: Story = {};

export const Grid: Story = {
  render: () => ({
    template: `
      <div style="display:grid; grid-template-columns: repeat(2, 120px); gap: 10px;">
        <app-icon-tile icon="${TASKS_ICON}" title="Tasks" colorClass="bg-coral"></app-icon-tile>
        <app-icon-tile icon="${TASKS_ICON}" title="Notes" colorClass="bg-wouter"></app-icon-tile>
        <app-icon-tile icon="${TASKS_ICON}" title="Calendar" colorClass="bg-finn"></app-icon-tile>
        <app-icon-tile icon="${TASKS_ICON}" title="Family" colorClass="bg-lotte"></app-icon-tile>
      </div>
    `,
  }),
};

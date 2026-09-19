import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { WidgetCardComponent } from './widget-card.component';

const meta: Meta<WidgetCardComponent> = {
  title: 'Shared/WidgetCard',
  component: WidgetCardComponent,
  args: {
    resized: fn(),
    configure: fn(),
    remove: fn(),
  },
};
export default meta;

type Story = StoryObj<WidgetCardComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-widget-card (resized)="resized()" (configure)="configure()" (remove)="remove()">
        <h2 widgetCardTitle class="font-heading text-base font-bold text-ink">Today</h2>
        <p class="text-sm text-ink-muted">Widget body content goes here.</p>
      </app-widget-card>
    `,
  }),
};

export const LongTitle: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-widget-card (resized)="resized()" (configure)="configure()" (remove)="remove()">
        <h2 widgetCardTitle class="font-heading text-base font-bold text-ink">Everything assigned to me this week</h2>
        <p class="text-sm text-ink-muted">Widget body content goes here.</p>
      </app-widget-card>
    `,
  }),
};

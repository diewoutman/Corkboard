import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { CalendarSourceRowComponent } from './calendar-source-row.component';

const meta: Meta<CalendarSourceRowComponent> = {
  title: 'Shared/CalendarSourceRow',
  component: CalendarSourceRowComponent,
  args: {
    name: 'Family',
    color: '#ec5542',
    hidden: false,
    visibilityToggled: fn(),
  },
  render: (args) => ({
    props: args,
    template: `<ul><app-calendar-source-row [name]="name" [color]="color" [hidden]="hidden" [feedUrl]="feedUrl" (visibilityToggled)="visibilityToggled()"></app-calendar-source-row></ul>`,
  }),
};
export default meta;

type Story = StoryObj<CalendarSourceRowComponent>;

export const Default: Story = {};

export const Hidden: Story = {
  args: { hidden: true },
};

export const WithActions: Story = {
  render: (args) => ({
    props: args,
    template: `
      <ul>
        <app-calendar-source-row [name]="name" [color]="color" [hidden]="hidden" (visibilityToggled)="visibilityToggled()">
          <button sourceRowActions type="button" class="font-extrabold text-coral hover:text-coral-strong">Subscribe link</button>
          <button sourceRowActions type="button" class="font-extrabold text-coral hover:text-coral-strong">Import .ics</button>
        </app-calendar-source-row>
      </ul>
    `,
  }),
};

export const WithFeedUrl: Story = {
  render: (args) => ({
    props: args,
    template: `<ul><app-calendar-source-row [name]="name" [color]="color" [hidden]="hidden" [feedUrl]="'https://corkboard.example/feeds/abc123.ics'" (visibilityToggled)="visibilityToggled()"></app-calendar-source-row></ul>`,
  }),
};

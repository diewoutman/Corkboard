import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { ModalSheetComponent } from './modal-sheet.component';

const meta: Meta<ModalSheetComponent> = {
  title: 'Shared/ModalSheet',
  component: ModalSheetComponent,
  args: {
    dismissed: fn(),
  },
};
export default meta;

type Story = StoryObj<ModalSheetComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-modal-sheet (dismissed)="dismissed()">
        <h2 class="font-heading text-lg font-bold text-ink">Add a widget</h2>
        <p class="mt-2 text-sm text-ink-muted">Sheet content goes here.</p>
      </app-modal-sheet>
    `,
  }),
};

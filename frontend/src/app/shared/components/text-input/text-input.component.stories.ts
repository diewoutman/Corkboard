import { FormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { TextInputComponent } from './text-input.component';

const meta: Meta<TextInputComponent> = {
  title: 'Shared/TextInput',
  component: TextInputComponent,
  decorators: [
    (story) => ({
      ...story(),
      moduleMetadata: { imports: [FormsModule] },
    }),
  ],
};
export default meta;

type Story = StoryObj<TextInputComponent>;

export const Email: Story = {
  render: (args) => ({
    props: { ...args, model: '' },
    template: `<app-text-input label="${args.label}" type="${args.type}" [(ngModel)]="model" name="field"></app-text-input>`,
  }),
  args: { label: 'Email', type: 'email' },
};

export const Password: Story = {
  render: (args) => ({
    props: { ...args, model: '' },
    template: `<app-text-input label="${args.label}" type="${args.type}" [(ngModel)]="model" name="field"></app-text-input>`,
  }),
  args: { label: 'Password', type: 'password' },
};

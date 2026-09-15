import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { ColorPickerFieldComponent } from './color-picker-field.component';

const meta: Meta<ColorPickerFieldComponent> = {
  title: 'Shared/ColorPickerField',
  component: ColorPickerFieldComponent,
  args: { label: 'Color', value: '#2a80e2', valueChange: fn() },
};
export default meta;

type Story = StoryObj<ColorPickerFieldComponent>;

export const Default: Story = {};

export const Compact: Story = {
  args: { label: 'List color', size: 'sm' },
};

import type { Meta, StoryObj } from '@storybook/angular-vite';
import { SetupStepHeaderComponent } from './setup-step-header.component';

const meta: Meta<SetupStepHeaderComponent> = {
  title: 'Shared/SetupStepHeader',
  component: SetupStepHeaderComponent,
};
export default meta;

type Story = StoryObj<SetupStepHeaderComponent>;

export const Step1: Story = {
  args: {
    step: 1,
    title: "Welcome! Let's create your account",
    description: "Nobody's set up this Corkboard yet. Create your account first — you'll set up your family next.",
  },
};

export const Step2: Story = {
  args: {
    step: 2,
    title: 'Set up your family',
    description: 'One-time setup — this creates your family and you as its first member.',
  },
};

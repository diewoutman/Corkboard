import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ErrorBannerComponent } from './error-banner.component';

const meta: Meta<ErrorBannerComponent> = {
  title: 'Shared/ErrorBanner',
  component: ErrorBannerComponent,
};
export default meta;

type Story = StoryObj<ErrorBannerComponent>;

export const WithMessage: Story = {
  args: { message: 'Could not load your lists. Pull to refresh to try again.' },
};

export const NoMessage: Story = {
  args: { message: null },
};

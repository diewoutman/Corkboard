import type { Meta, StoryObj } from '@storybook/angular-vite';
import { IconComponent } from './icon.component';

// Same path as the bottom nav's "Home" icon (app.component.html).
const HOME_PATH = 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10';

const meta: Meta<IconComponent> = {
  title: 'Shared/Icon',
  component: IconComponent,
  args: { path: HOME_PATH },
};
export default meta;

type Story = StoryObj<IconComponent>;

export const NavSize: Story = {
  args: { sizeClass: 'h-5 w-5' },
};

export const TileSize: Story = {
  args: { sizeClass: 'h-6 w-6' },
};

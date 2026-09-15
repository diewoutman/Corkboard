/** The design system's vivid palette — new lists/contacts cycle through these by position. */
export const PALETTE = ['#ec5542', '#2a80e2', '#1eab53', '#bc9c00', '#b45bc8'];

/** WCAG relative luminance — decides whether a color (list, calendar, contact…) needs light or dark text on top of it. */
export function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const toLinear = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.5;
}

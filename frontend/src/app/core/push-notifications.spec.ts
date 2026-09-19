import { describe, expect, it } from 'vitest';
import { needsIosInstall } from './push-notifications';

const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 };
const android = { userAgent: 'Mozilla/5.0 (Linux; Android 14)', platform: 'Linux armv81', maxTouchPoints: 5 };

describe('needsIosInstall', () => {
  it('is true for iOS in a normal browser tab', () => {
    expect(needsIosInstall(iphone, false)).toBe(true);
  });

  it('is false once the app runs from the Home Screen', () => {
    expect(needsIosInstall({ ...iphone, standalone: true }, false)).toBe(false);
    expect(needsIosInstall(iphone, true)).toBe(false);
  });

  it('recognises iPadOS, which reports itself as a Mac with a touch screen', () => {
    expect(needsIosInstall({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 5 }, false)).toBe(true);
  });

  it('is false on Android and desktop', () => {
    expect(needsIosInstall(android, false)).toBe(false);
    expect(needsIosInstall({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64', maxTouchPoints: 0 }, false)).toBe(false);
  });
});

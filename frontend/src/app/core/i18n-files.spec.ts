import { describe, expect, it } from 'vitest';
import en from '../../assets/i18n/en.json';
import nl from '../../assets/i18n/nl.json';

function keysOf(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? keysOf(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

describe('i18n files', () => {
  it('nl has exactly the same keys as en', () => {
    expect(keysOf(nl).sort()).toEqual(keysOf(en).sort());
  });
});

// Polyfills for running unit tests under jsdom (the default Vitest environment).
// jsdom does not implement `window.matchMedia`, which components relying on
// prefers-color-scheme or other media queries may call.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom 26 defers to Node's own (flag-gated, experimental) `localStorage` global instead of
// providing its own, which leaves `window.localStorage` undefined under plain Node — polyfill
// a minimal in-memory Storage so services like `core/auth.ts` can read/write it in tests.
if (!window.localStorage) {
  const store = new Map<string, string>();
  window.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

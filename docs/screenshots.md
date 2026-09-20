# Regenerating the screenshots

The images in the README (`docs/screenshots/`) are captured by a dedicated
Playwright script, not hand-taken:

```bash
npm --prefix frontend run screenshots
```

It drives the seeded dev family (starting the dev stack itself if it isn't
already running), populates a small deterministic set of demo data, and
writes PNGs to `docs/screenshots/`. Rerun it after any meaningful UI change.

The script lives in `frontend/e2e/screenshots.spec.ts` and is configured by
`frontend/playwright.screenshots.config.ts`.

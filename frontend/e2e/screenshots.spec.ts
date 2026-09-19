import path from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * Captures the screenshots embedded in the repo's README. Not a correctness test — it drives the
 * seeded dev family through a few of the same flows the other e2e specs use (see fixtures.ts) to
 * populate calendar/dashboard/contacts with enough content to be worth looking at, then screenshots
 * each page. Run via `npm run screenshots`; regenerate whenever the UI changes meaningfully.
 */

const outDir = path.join(__dirname, '../../docs/screenshots');

async function shot(page: Page, name: string) {
  // Prior interactions (esp. adding a widget below the fold) can leave the page scrolled down.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(outDir, `${name}.png`), animations: 'disabled' });
}

function dateAt(dayOffset: number, hour: string): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hour}`;
}

/** Every page shows `app-loading-indicator` while its initial data fetch is in flight — wait for
 * it to clear before reading the page's contents, otherwise "does X already exist?" checks race
 * the fetch and see a still-empty page. */
async function goto(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator('app-loading-indicator')).toHaveCount(0);
}

/**
 * The seeded dev family (`dev@corkboard.test`) is also what every other e2e spec logs into
 * (fixtures.ts), and those specs create uniquely-named fixtures they never delete — years of test
 * runs leave hundreds of stray lists/calendars/contacts behind. The UI has no delete affordance
 * for Collections (Task lists/Calendars/Households), so this reaches the API directly to prune
 * everything down to exactly what this script wants to screenshot. Destructive, but scoped to
 * this one synthetic dev family's test fixtures — nothing a real user would ever see.
 */
async function resetDevFamilyData(page: Page) {
  const authRaw = await page.evaluate(() => localStorage.getItem('corkboard.auth'));
  const token: string = JSON.parse(authRaw ?? '{}').token;
  const api = 'http://localhost:5147/api';
  const headers = { Authorization: `Bearer ${token}` };

  type Collection = { id: string; name: string; type: string };
  const collections: Collection[] = await page.request.get(`${api}/collections`, { headers }).then((r) => r.json());
  const keepCollectionNames = new Set(['Groceries', 'Family Calendar', 'Jansen Household']);
  const seenCollectionNames = new Set<string>();
  for (const c of collections) {
    const keep = keepCollectionNames.has(c.name) && !seenCollectionNames.has(c.name);
    if (keep) {
      seenCollectionNames.add(c.name);
      continue;
    }
    const res = await page.request.delete(`${api}/collections/${c.id}`, { headers });
    if (!res.ok()) console.log(`[reset] failed to delete collection ${c.name} (${c.id}): ${res.status()} ${await res.text()}`);
  }

  // Dashboard widgets: keep one Navigation and one Today, drop everything else (broken/orphaned
  // widget rows from schema changes over time show up here with no matching *ngIf branch in the
  // template — they render as an empty card with just a title, invisible to a DOM-selector check).
  type Widget = { id: string; type: string };
  const widgets: Widget[] = await page.request.get(`${api}/dashboard`, { headers }).then((r) => r.json());
  const keepWidgetTypesOnce = new Set(['Navigation', 'Today']);
  const seenWidgetTypes = new Set<string>();
  for (const w of widgets) {
    const keep = keepWidgetTypesOnce.has(w.type) && !seenWidgetTypes.has(w.type);
    if (keep) {
      seenWidgetTypes.add(w.type);
      continue;
    }
    await page.request.delete(`${api}/dashboard/${w.id}`, { headers });
  }

  type Node = { id: string; type: string; title: string; firstName: string | null; lastName: string | null };
  const nodes: Node[] = await page.request.get(`${api}/nodes`, { headers }).then((r) => r.json());
  const keepNoteTitles = new Set(['Wifi password']);
  const seenContactNames = new Set<string>();
  const seenAppointmentTitles = new Set<string>();
  for (const n of nodes) {
    let keep: boolean;
    switch (n.type) {
      case 'Note':
        keep = keepNoteTitles.has(n.title);
        break;
      case 'Contact': {
        const name = `${n.firstName} ${n.lastName}`;
        keep = name === 'Emma Jansen' && !seenContactNames.has(name);
        if (keep) seenContactNames.add(name);
        break;
      }
      case 'Appointment':
        keep = !seenAppointmentTitles.has(n.title);
        if (keep) seenAppointmentTitles.add(n.title);
        break;
      default:
        keep = true; // Tasks: left alone, they live under the "Groceries" list handled above.
    }
    if (!keep) await page.request.delete(`${api}/nodes/${n.id}`, { headers });
  }
}

test('login page', async ({ page }) => {
  await goto(page, '/login');
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await shot(page, 'login');
});

test('app screenshots', async ({ authedPage: page }) => {
  await resetDevFamilyData(page);

  // --- Calendar: add a calendar + a few events so the month grid isn't empty ---
  // Idempotent (checks before creating) since this runs against the shared, persistent dev
  // database — reruns shouldn't pile up duplicate demo calendars/events/contacts.
  await goto(page, '/calendar');
  const calendarsSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Calendars' }) });
  if ((await calendarsSection.getByText('Family Calendar', { exact: true }).count()) === 0) {
    await calendarsSection.getByRole('button', { name: '+ Add' }).click();
    await page.getByLabel('Name').fill('Family Calendar');
    await page.getByLabel('Name').press('Enter');
  }

  const events = [
    { title: 'Dentist appointment', day: 1, hour: '10:00' },
    { title: 'Piano lesson', day: 3, hour: '16:30' },
    { title: 'Family dinner', day: 5, hour: '18:30' },
  ];
  for (const event of events) {
    if ((await page.getByText(event.title, { exact: true }).count()) > 0) continue;
    await page.getByRole('button', { name: 'Add event' }).click();
    await page.getByLabel('Calendar', { exact: true }).selectOption({ label: 'Family Calendar' });
    await page.getByLabel('Event', { exact: true }).fill(event.title);
    await page.getByLabel('Start').fill(dateAt(event.day, event.hour));
    await page.getByRole('button', { name: 'Add event' }).click();
    await expect(page.getByRole('heading', { name: 'Add event', exact: true })).toHaveCount(0);
  }
  await expect(page.getByText(events[0].title, { exact: true }).first()).toBeVisible();
  await shot(page, 'calendar');

  // --- Contacts: a household + a contact linked to it ---
  await goto(page, '/contacts');
  await page.getByRole('button', { name: /Households/ }).click();
  await expect(page.getByRole('button', { name: '+ Add a household' })).toBeVisible();
  if ((await page.getByText('Jansen Household', { exact: true }).count()) === 0) {
    await page.getByRole('button', { name: '+ Add a household' }).click();
    await page.getByLabel('Name').fill('Jansen Household');
    await page.getByRole('button', { name: 'Add household' }).click();
    await expect(page.getByText('Jansen Household').first()).toBeVisible();
  }

  if ((await page.getByRole('button', { name: /Emma Jansen/ }).count()) === 0) {
    await page.getByRole('button', { name: 'Add contact' }).click();
    await page.getByLabel('First name').fill('Emma');
    await page.getByLabel('Last name').fill('Jansen');
    await page.getByLabel('Household').selectOption({ label: 'Jansen Household' });
    await page.getByRole('button', { name: 'Add contact' }).click();
  }
  await expect(page.getByRole('button', { name: /Emma Jansen/ }).first()).toBeVisible();
  await shot(page, 'contacts');

  // --- Dashboard: resetDevFamilyData already pruned it down to Navigation + Today; add one
  // Tasks widget (on the seeded "Groceries" list) and one Upcoming widget ---
  await goto(page, '/home');

  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByLabel('Type').selectOption('Tasks');
  await page.getByLabel('A specific list').check();
  await page.locator('select[name="taskCollectionId"]').selectOption({ label: 'Groceries' });
  await page.getByRole('button', { name: 'Add widget' }).click();
  await expect(page.locator('app-tasks-widget')).toBeVisible();

  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByLabel('Type').selectOption('Upcoming');
  await page.getByRole('button', { name: 'Add widget' }).click();
  await expect(page.locator('app-upcoming-widget')).toBeVisible();
  await shot(page, 'dashboard');

  // --- Tasks: lists overview, then the seeded "Groceries" list itself ---
  await goto(page, '/tasks');
  await expect(page.getByText('Groceries')).toBeVisible();
  await shot(page, 'tasks');

  await page.locator('a').filter({ hasText: 'Groceries' }).first().click();
  await page.waitForURL('**/tasks/**');
  await expect(page.locator('app-loading-indicator')).toHaveCount(0);
  await page.getByLabel('Show completed').check();
  await expect(page.getByRole('heading', { name: 'Groceries' })).toBeVisible();
  await expect(page.locator('li').first()).toBeVisible();
  await shot(page, 'task-list');

  // --- Notes: the seeded "Wifi password" note ---
  await goto(page, '/notes');
  await expect(page.getByText('Wifi password')).toBeVisible();
  await shot(page, 'notes');

  // --- Family: the seeded members ---
  await goto(page, '/family');
  await expect(page.getByText('Sam', { exact: true })).toBeVisible();
  await shot(page, 'family');
});

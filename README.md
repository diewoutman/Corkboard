# Qorkboard

Qorkboard is a self-hosted family organizer. Appointments, tasks, notes and
contacts live together on one shared board that everyone in the household
can see, and you run it yourself on your own hardware, so the data stays
yours.

![Dashboard](docs/screenshots/dashboard.png)

<details>
<summary>More screenshots</summary>

| | |
|---|---|
| ![Calendar](docs/screenshots/calendar.png) | ![Tasks](docs/screenshots/tasks.png) |
| ![Notes](docs/screenshots/notes.png) | ![Contacts](docs/screenshots/contacts.png) |
| ![Family](docs/screenshots/family.png) | ![Login](docs/screenshots/login.png) |

</details>

## Features

- **Customizable dashboard** (`/home`) — widget-based home screen (Today,
  Upcoming, Tasks, Notes, Navigation, Timeline), drag-and-drop reordering,
  per-person or shared family layouts.
- **Calendar** — month/week/day views, multiple calendars, recurring
  appointments (RFC 5545 RRULE), per-occurrence overrides/skips, `.ics`
  import and one-way `.ics` export/subscribe feed.
- **Tasks** — lists ("Collections"), priorities, due dates, completion
  state.
- **Notes** — post-it style board, markable as important.
- **Contacts & Households** — an address book tied to the family.
- **Family management** — multiple family members per household, optional
  login accounts for the ones old enough to need them (kids/pets can exist
  without one).
- **Admin console** (`/admin`, system-owner only) — instance-wide stats,
  every family on the instance, and API client (client-credentials)
  management for external automation/integrations.
- **Installable PWA** — Angular service worker + manifest.

## Getting started

Requirements: [Docker](https://docs.docker.com/get-docker/), the
[.NET 10 SDK](https://dotnet.microsoft.com/download), and Node.js/npm.

```bash
./scripts/dev.sh
```

This starts Postgres in Docker, waits for it to be healthy, applies pending
EF Core migrations, then runs the API and the Angular dev server together
(Ctrl+C stops both; Postgres keeps running — `docker compose down` to stop
it too). First run also installs `dotnet-ef` and `frontend/node_modules` if
missing.

- API: `http://localhost:5147`
- Client: `http://localhost:4200`

The first account you register becomes the instance's system owner and
walks through a first-run wizard (register → create family → add family
members) before landing on the dashboard.

### Push notifications (optional)

Reminders are sent with Web Push and stay off until you give the server a VAPID key pair:

```bash
npx web-push generate-vapid-keys
dotnet user-secrets set Push:PublicKey  <public key>  --project backend/src/Corkboard.Api
dotnet user-secrets set Push:PrivateKey <private key> --project backend/src/Corkboard.Api
```

(In Docker use the `Push__PublicKey` / `Push__PrivateKey` environment variables.) Browsers only
allow push on an HTTPS origin — `localhost` counts, but a home-server deployment needs a reverse
proxy with a valid certificate. On iPhone/iPad the app must first be added to the Home Screen.
Devices opt in under *account menu → Notifications*.

### Running tests

```bash
dotnet test                     # .NET unit tests
npm --prefix frontend test      # Angular unit tests
npm --prefix frontend run e2e   # Playwright end-to-end tests
```

The README screenshots are regenerated with a script; see
[`docs/screenshots.md`](docs/screenshots.md).

## Self-hosting (Docker image)

For running Qorkboard somewhere other than a dev machine (a home
server/NAS), `docker/` builds one image with the frontend and API combined —
see [`docker/README.md`](docker/README.md). You host Postgres yourself; the
image just connects to it.

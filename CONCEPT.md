# Corkboard — Concept Document

## 1. Vision

Corkboard is a family coordination app built for one family (yours), not a generic
multi-tenant SaaS product aimed at the broadest possible audience like FamilyWall or
OpenFamily. The goal is a small, focused tool that keeps everyone in the household
aligned on what needs to happen — appointments, tasks, notes — without the bloat of
a commercial family-organizer app (ads, subscriptions, features nobody in the family
asked for).

Guiding principles:
- **Self-hosted first.** You own the data and the deployment.
- **One core abstraction.** Everything that can be "pinned to the board" is a `Node`.
  Calendar appointments, tasks, and notes are all Nodes with a different `Type`, not
  three unrelated features bolted together.
- **API-first.** The backend has no server-rendered UI; the Angular client is just one
  consumer of the API, which keeps the door open for a future mobile app, widgets, or
  automation scripts.
- **Small surface, sharp edges removed later.** Ship the smallest useful version, let
  real family use drive what gets built next.

## 2. Domain Model

### 2.1 Core entities

**Family**
A household. Owns everything else. Supporting more than one Family in the schema
costs little and avoids a painful migration if you ever want to run a second
household (e.g. grandparents) on the same instance — but the UI/UX only needs to
design for one.

| Field | Notes |
|---|---|
| Id | |
| Name | |
| TimeZone | drives TickerQ scheduling and "today" boundaries |
| CreatedAt | |

**User**
Someone who can log in. A User is an account, not a person in the family per se —
this separation matters because a `FamilyMember` might not have (or need) a login
(e.g. a young child), and because in principle a User could belong to more than one
Family (co-parents with two households, grandparents helping manage things).

| Field | Notes |
|---|---|
| Id | |
| Email | |
| PasswordHash | or external auth provider subject id — see §4.3 |
| CreatedAt | |

`UserFamily` (join table): `UserId`, `FamilyId`, `Role` (Owner / Adult / Member) —
governs who can manage family settings vs. just use the board.

**FamilyMember**
The assignable person. This is who a Node gets assigned *to*, and who shows up on the
calendar as "whose thing is this." A FamilyMember optionally links to a User (for
members old enough to log in) — kids, pets, or "the household" itself can exist as
FamilyMembers without ever logging in.

| Field | Notes |
|---|---|
| Id | |
| FamilyId | |
| DisplayName | |
| Color | for calendar/board color-coding |
| AvatarUrl | optional |
| LinkedUserId | nullable FK to User |
| DateOfBirth | optional, enables birthday nodes/reminders later |

### 2.2 Node — the shared abstraction

A `Node` is anything pinned to the family's board. Concretely, in this first pass
that means Tasks, Notes, and Calendar Appointments, but the model is deliberately
named generically so new node types (shopping list item, chore, poll) can be added
without a new top-level concept.

**Shared base fields** (per your description):

| Field | Notes |
|---|---|
| Id | |
| FamilyId | |
| Type | discriminator — `Note`, `Task`, `Appointment`, extensible |
| Title | |
| Description | |
| From | start / effective date — optional for a plain note |
| Until | end / due date — optional |
| CreatedAt | |
| UpdatedAt | |
| CreatedByUserId | |

**Assignment**: `NodeAssignment` join table (`NodeId`, `FamilyMemberId`) — many
FamilyMembers can be assigned to one Node, and one FamilyMember can have many Nodes.
This alone (Node + assignment + From/Until) already gives you a working calendar,
task list, and note board with no type-specific modeling at all.

**Type-specific data.** Real tasks and appointments need a few fields a bare note
doesn't (an appointment's location, a task's completion state, a recurrence rule).
Two ways to model that in EF Core / Postgres, worth deciding deliberately rather than
defaulting into one:

- **TPH (table-per-hierarchy) with typed subclasses** — `Note : Node`, `Task : Node`,
  `Appointment : Node`, one `Nodes` table with a discriminator column and nullable
  columns for the union of all subtype fields. Standard EF Core, fully typed, easy to
  query with LINQ, but every new node type adds columns to one wide table.
- **Base `Nodes` table + a `jsonb` `Payload` column** for type-specific data (Postgres
  native JSON support). Adding a new node type is a code change, not a migration;
  type-specific fields aren't strongly typed at the DB layer but can still be strongly
  typed in C# via a `Payload` DTO per type, (de)serialized in the repository layer.

Recommendation: start with **TPH** — the type set is small and known (Note, Task,
Appointment), and full LINQ-queryability (e.g. "all incomplete Tasks due this week")
matters more here than schema flexibility. Revisit JSONB if/when node types grow
past a handful or become user-definable.

Type-specific fields to start with:
- **Note**: nothing beyond the base fields.
- **Task**: `IsCompleted`, `CompletedAt`, `Priority` (optional).
- **Appointment**: `Location` (optional), `AllDay` (bool), `RecurrenceRule`
  (nullable — see §3.3 on TickerQ). The `RecurrenceRule` describes the pattern only
  (e.g. an RRULE-style string); no occurrence rows are stored — see §3.3.

### 2.3 Collection — grouping Nodes

`Collection` is Node's sibling backend-only abstraction: a container that holds one
or more Nodes, and can itself nest under a parent Collection (a plain self-referencing
tree — `ParentCollectionId`, `ChildCollections`). Like Node, the word "Collection"
never reaches the user; each `CollectionType` gets its own user-facing framing:

- **`TaskList`** — "a Task list is a Collection of Task Nodes". `/tasks` lists a
  family's `TaskList` Collections, `/tasks/{id}` shows the Tasks inside one.
- **`Calendar`** — "a Calendar is a Collection of Appointment Nodes". `/calendar`
  renders a month grid overlaying every `Calendar` Collection's Appointments (each
  toggleable, color-coded); creating an event picks which Calendar it belongs to.
- **`Schedule`** — "a Schedule is a Collection of Appointment Nodes", same shape as
  `Calendar` — filled in through a dedicated weekly (day-of-week × time) editor
  instead of one-off dated events, and rendered as just another togglable layer in
  the `/calendar` month grid rather than a separate view. Modeled this way after
  looking at how FamilyWall ("Roosters") and OpenFamily represent weekly routines:
  both use simpler day-of-week+time patterns than our RRULE engine already supports
  as a superset, so `Schedule` reuses the existing Node/Appointment/RecurrenceRule
  machinery rather than introducing a new pattern model — each schedule entry is
  just an Appointment whose `RecurrenceRule` is `FREQ=WEEKLY;BYDAY=<day>[;INTERVAL=2]
  [;UNTIL=<date>]` and whose `From` is anchored to that weekday in the current week.
  `/calendar/schedules/:id` is the weekly editor (`ScheduleEditorPage`): seven
  day-of-week columns, each listing that day's recurring entries, with an add-entry
  form (day, start/end time, title, location, "every other week", optional "ends
  on"). Schedule Collections are excluded from the "add event" form's calendar
  picker (`eventableCalendars`) — schedule entries are only authored via the weekly
  editor — but their occurrences render in the month grid exactly like a Calendar's.

| Field | Notes |
|---|---|
| Id, FamilyId | same pattern as everything else |
| Name | |
| Type | `CollectionType` — `TaskList`, `Calendar`, or `Schedule` |
| Color | hex string, same idea as `FamilyMember.Color` — lets the Calendar grid color-code events by which Calendar they're in |
| FeedToken | nullable opaque string; set the first time a Calendar's iCal subscribe URL is requested (see §3.3) |
| ParentCollectionId | nullable self-reference; `Restrict` on delete (a Collection with children can't be deleted until they're moved or removed — avoids silently losing a subtree) |
| CreatedAt, UpdatedAt, CreatedByUserId | |

A Node gets an optional `CollectionId` (nullable — most Notes won't use it).
Deleting a Collection cascades to delete the Nodes in it, matching "delete this
list/calendar" expectations. Membership is one Collection per Node, not a
many-to-many join — simpler, and matches how list/calendar apps actually behave (an
event lives on one calendar at a time).

Not yet built: nested Task lists or Calendars (sub-collections) in the UI — the
domain model supports it (`ParentCollectionId`) but neither `/tasks` nor
`/calendar` create/list anything but top-level Collections today.

## 3. Backend

### 3.1 Stack

- **.NET 10**, ASP.NET Core Web API (API-first — no MVC views, no Razor).
- **EF Core** against **PostgreSQL**.
- **TickerQ** for scheduled/recurring work (see below).

### 3.2 Suggested solution layout

```
Corkboard.sln
src/
  Corkboard.Api/            # controllers/minimal API endpoints, auth, DI wiring
  Corkboard.Domain/         # entities, enums, domain logic — no EF/ASP.NET references
  Corkboard.Infrastructure/ # EF Core DbContext, migrations, TickerQ jobs, repositories
  Corkboard.Contracts/      # request/response DTOs shared shape (source of truth for
                             # the Angular client's generated types)
tests/
  Corkboard.Domain.Tests/
  Corkboard.Api.Tests/
```

Keeping `Domain` free of EF Core references is optional ceremony for a solo/family
project — fine to simplify into `Api` + `Infrastructure` only if the extra project
boundary doesn't pay for itself.

### 3.3 TickerQ usage

TickerQ (in-process, EF-Core-backed scheduler) is the natural fit for:
- **Reminders/notifications** — "task due tomorrow," "appointment in 1 hour" —
  scheduled per-Node at creation/update time. For a recurring Appointment, the
  reminder job is (re)scheduled against the *next* computed occurrence rather than
  a stored row (see below).
- **Digests** — e.g. a daily/weekly "what's coming up" push or email per Family.

**Recurrence: computed on read, not precomputed — implemented.** A recurring
`Appointment` stores only its `RecurrenceRule` on the base Node, as a real RFC 5545
RRULE value string (e.g. `"FREQ=WEEKLY"` or `"FREQ=WEEKLY;BYDAY=MO,WE,FR"`) — no
separate occurrence rows exist. `RecurrenceExpansionService` (Infrastructure,
built on the `Ical.Net` library rather than hand-rolled RRULE math) expands a given
Appointment into concrete occurrences for a date range on request;
`GET /api/calendar/occurrences?from=&until=&calendarId=` is what the client's
month grid actually calls. This avoids a background job that has to keep extending
a precomputed window and avoids ever "running out" of future occurrences.

`AppointmentException` (keyed by `(AppointmentId, OriginalOccurrenceDate)`) is now
wired up end-to-end: `PUT /api/calendar/appointments/{id}/occurrences/{date}` skips
or overrides one occurrence, consulted during expansion. The client only exercises
the skip path so far (deleting a single occurrence from the day-detail view);
overriding one occurrence's own fields (time/title/location) without touching the
whole series has a working endpoint but no UI yet.

Known simplification: which calendar day an occurrence "belongs to" (for matching
against `OriginalOccurrenceDate`) is derived from its UTC start, not the family's
local time zone — an occurrence within a few hours of midnight UTC could land on
the "wrong" day for a family far from UTC. Fine for now; revisit if it causes real
confusion.

Because TickerQ persists jobs via EF Core against the same Postgres database, no
extra moving parts (no Redis/Hangfire dashboard/separate worker infra) are needed for
a single-instance, family-scale deployment. TickerQ itself isn't used for
recurrence — see above — only reminders/digests remain on the "not yet built" list.

**iCal (RFC 5545) interop — implemented, one-way each direction.** Both directions
go through `Ical.Net`, not hand-rolled `.ics` text:
- **Export**: `POST /api/collections/{id}/feed-token` (re)generates an opaque
  `FeedToken` on a Calendar Collection and returns its full subscribe URL;
  `GET /api/calendar-feed/{collectionId}/{token}.ics` (anonymous — calendar apps
  can't do an interactive JWT login, so the token in the URL *is* the auth) serves
  a standard `VCALENDAR` document any calendar app can subscribe to. One `VEVENT`
  per Appointment (with its RRULE and EXDATEs for skipped occurrences included
  directly, letting the subscribing app do its own expansion) plus one extra
  `VEVENT` per override exception (same UID, a `RECURRENCE-ID` — the standard way
  to represent "this one occurrence was moved/renamed"). `EXDATE`/`RECURRENCE-ID`
  values are built to match the master event's original time-of-day exactly, since
  RFC 5545 requires that for a calendar app to match them against its own RRULE
  expansion.
- **Import**: `POST /api/calendar/collections/{id}/import` (multipart `.ics`
  upload) parses the file and creates an Appointment per "master" `VEVENT`
  (recurring or one-off), copying its RRULE across unchanged. Per-occurrence
  override `VEVENT`s in the *source* file (their own `RECURRENCE-ID` set) are
  skipped rather than mapped to `AppointmentException` rows — a reasonable v1
  limitation given how rarely real-world exports actually contain them.
- **Not built**: CalDAV (true two-way sync, where editing an event in Apple/Google
  Calendar updates Corkboard). That's a much bigger undertaking — implementing a
  CalDAV server — than anything else in this app so far, and probably isn't worth
  it for a personal family app; one-way export already covers "family member sees
  Corkboard events in their own phone calendar," which is the realistic use case.

### 3.4 Auth

**ASP.NET Core Identity + JWT.** Identity owns the Users table, password hashing, and
account plumbing (lockout, password reset tokens) so none of that needs to be
hand-rolled; on login the API issues a JWT carrying the User's id and their
`Family`/`Role` claims. Every subsequent API call is scoped to `FamilyId` via the
token, so the whole surface is naturally multi-family-safe even though the UI only
targets one family for now.

## 4. Frontend

- **Angular + Tailwind CSS**, calling the API exclusively (no server-side rendering
  coupling). Tried Ionic first for its ready-made PWA/native-app story, but its
  Stencil-based web components turned out fragile in this exact Angular 22 setup
  (a long debugging session's worth of lazy-loading/dependency-cache/change-detection
  interactions — see git history around the "step away from Ionic" decision) and,
  separately, made it hard to keep the UI from feeling like a generic app shell
  rather than something built for this one family. Dropped Ionic and Capacitor
  entirely; PWA installability still comes from Angular's own `@angular/pwa`
  (service worker + manifest), independent of any UI component library.
- **The `Node` abstraction is backend-only** — the client never surfaces the word
  "Node". Each Node type gets its own dedicated page with its own language: Tasks
  talks about tasks (due dates, priority, "mark done"), Notes talks about notes,
  Calendar talks about events/appointments. All three still just call
  `GET/POST /api/nodes` with a `type` filter under the hood (see `core/nodes.ts`).

## 5. MVP scope

**In scope for v1:**
- Family setup (single family, seeded on first run).
- User accounts + login.
- FamilyMember management (create/edit, link to a User optionally).
- Node CRUD for Note, Task, Appointment.
- Assignment of Nodes to one or more FamilyMembers.
- Board view (list/filter) + Calendar view.
- Basic due-date/appointment reminders via TickerQ.

**Explicitly deferred:**
- Recurrence rules beyond a simple fixed interval.
- Push notifications (start with in-app/email; push needs platform-specific plumbing).
- Real-time multi-device sync (SignalR) — polling/refresh is fine for a family of a
  few people to start.
- Sharing/inviting outside the family, multi-family switching UI.
- Attachments, comments, shopping lists, chores/rewards, and other node types.
- Self-service node-type extensibility (new types are a code change for now).

## 6. Deployment

**Home server / NAS, via Docker.** `docker-compose.yml` currently runs just
`postgres` (with a named volume) — the API still runs from the CLI/IDE during
day-to-day development, which is the faster inner loop while the schema is
changing often. Add an `api` service + `Dockerfile` once the backend is stable
enough to be worth containerizing end-to-end. No public IP/domain to secure by
default, so no urgency around HTTPS termination or a reverse proxy — add one later
only if the app needs to be reachable outside the home network. No CI/CD pipeline
needed yet; automate only once there's a reason to (multiple contributors, wanting
zero-downtime deploys).

## 7. Decisions log

All four open questions from the first draft are now settled; captured here for a
quick recap, with the reasoning inline in the relevant section above.

| Decision | Choice | Detail |
|---|---|---|
| Auth | ASP.NET Core Identity + JWT | §3.4 |
| Recurrence | Computed on read from `RecurrenceRule`, no precomputed rows | §3.3 |
| Node types | TPH, code-change + migration for new types | §2.2 |
| Deployment | Home server/NAS via Docker | §6 |

Nothing is currently open. New questions will surface once implementation starts
(e.g. the exact shape of `AppointmentException`, whether Identity's default token
lifetime needs tuning) — add them here as they come up rather than trying to
pre-answer them now.

## 8. Getting started (current scaffold)

Layout matches §3.2, plus the Angular client at repo root (its own convention,
alongside `src`/`tests` rather than under them):

```
Corkboard.sln
docker-compose.yml       # postgres only, for now — see §6
src/
  Corkboard.Api/          # ASP.NET Core Web API — see endpoint table below
  Corkboard.Domain/       # Family, FamilyMember, Node (+ Note/TaskNode/Appointment), ...
  Corkboard.Infrastructure/ # CorkboardDbContext (EF Core + Identity + TickerQ tables), migrations
  Corkboard.Contracts/    # request/response DTOs — Auth, Families, FamilyMembers, Nodes
tests/
  Corkboard.Domain.Tests/  # empty so far
  Corkboard.Api.Tests/     # empty so far
client/                  # Angular 22 + Tailwind CSS PWA (service worker) — no Ionic, see §4
  src/app/core/           # Auth, Families, FamilyMembers, Nodes, Collections, CalendarApi,
                          # Setup services + auth interceptor/guards
  src/app/pages/          # login, family-setup, add-members, tasks (Lists overview),
                          # task-list (one list's Tasks, /tasks/:id), notes,
                          # calendar (multi-calendar/schedule month grid),
                          # schedule-editor (weekly grid, /calendar/schedules/:id)
```

**API surface implemented so far** (all family-scoped ones require a JWT with a
`family_id` claim, obtained from `POST /api/families`):

| Endpoint | Purpose |
|---|---|
| `GET /api/setup/status` | Anonymous — whether this instance has any Family yet, drives the client's first-run wizard framing |
| `POST /api/auth/register`, `/login` | Identity account creation/login → JWT |
| `POST /api/families`, `GET /api/families/mine` | One-time family setup (creates Family + Owner FamilyMember, returns a fresh token) |
| `GET/POST /api/family-members`, `GET/PUT/DELETE /api/family-members/{id}` | FamilyMember CRUD |
| `GET/POST /api/nodes`, `PUT/DELETE /api/nodes/{id}` | Node CRUD across all three types, with `?type=`/`?assignedTo=`/`?collectionId=`/`?from=`/`?until=` filters on the list endpoint |
| `GET/POST /api/collections`, `PUT/DELETE /api/collections/{id}` | Collection CRUD (Task lists, Calendars, Schedules), with `?type=`/`?parentCollectionId=` filters — list responses include `NodeCount`/`IncompleteCount` |
| `POST /api/collections/{id}/feed-token` | (Re)generates a Calendar's iCal feed URL |
| `GET /api/calendar-feed/{collectionId}/{token}.ics` | Anonymous — the actual iCal subscribe feed |
| `GET /api/calendar/occurrences` | Expanded Appointment occurrences for a date range (`?from=&until=&calendarId=`) — what the month grid renders |
| `PUT`/`DELETE /api/calendar/appointments/{id}/occurrences/{date}` | Override or skip one occurrence of a recurring Appointment |
| `POST /api/calendar/collections/{id}/import` | Multipart `.ics` upload → creates Appointments in that Calendar |

**First-run setup wizard**: the client doesn't have a separate `/setup` route —
instead `/login` checks `GET /api/setup/status` on load, and when no Family exists
yet anywhere on the instance it frames itself as "Step 1 of 3" and defaults to
register mode. Registering routes to `/family-setup` ("Step 2 of 3", creates the
Family + the caller's own FamilyMember as Owner), which routes to `/add-members`
("Step 3 of 3", add the rest of the family before landing on `/tasks`). Ordinary
subsequent logins skip all of this — `isFirstRun` on `LoginPage` only turns on when
the instance-wide check comes back `false`.

**To run the whole stack locally: `./scripts/dev.sh`** (needs Docker, the .NET 10
SDK, and Node/npm on `PATH`). It starts Postgres, waits for it to actually be ready
(`docker compose up --wait`, via the healthcheck in `docker-compose.yml`), applies
pending EF Core migrations, then runs the API and the Angular dev server together
(via `concurrently`, prefixed/colored output) — Ctrl+C stops both. First run also
installs `dotnet-ef` (if missing) and `client/node_modules`. Postgres itself keeps
running afterwards (`docker compose down` to stop it).

What that script does, spelled out (useful if something in it needs debugging):
1. `docker compose up -d --wait postgres` — Postgres on `localhost:5432` (user/db/
   password all `corkboard`, matching `Corkboard.Api/appsettings.json`'s dev
   connection string — change both together if you change one).
2. `dotnet ef database update --project src/Corkboard.Infrastructure --startup-project src/Corkboard.Api`
   — applies the `InitialCreate` migration (Identity + domain + TickerQ tables).
3. `dotnet run --project src/Corkboard.Api --launch-profile http` — API on
   `http://localhost:5147` (plain HTTP, deliberately — see below). A real
   `Jwt:SigningKey` is already set via `dotnet user-secrets` (not committed —
   see `Corkboard.Api.csproj`'s `UserSecretsId`); nothing to configure there.
4. `npm --prefix client start` — Angular dev server. Points at
   `http://localhost:5147/api` via `environment.ts`.

Local dev deliberately uses plain HTTP, not the ASP.NET Core dev HTTPS cert
(`https://localhost:7127`, the other profile in `launchSettings.json`): that cert's
trust story is painful cross-platform (especially Linux, no automatic trust store
hookup), and there's no need for it locally per the "no urgency around HTTPS" call in
§6. Two things this makes necessary, both already wired up: a CORS policy (`Program.cs`,
`Cors:AllowedOrigins` in `appsettings.Development.json` — defaults to the Angular
dev server's port, 4200) since client and API are now different origins even
in dev, and being explicit about `--launch-profile http` rather than relying on
`dotnet run`'s default profile selection (which happens to pick "http" here since it's
listed first in `launchSettings.json`, but that's not something to depend on silently).

Not yet done: no automated tests, no reminder jobs wired to TickerQ yet (the
scheduler itself is running, just unused — see §3.3), no recurrence expansion on
the `/api/nodes` list endpoint (an Appointment's `RecurrenceRule` is stored and
returned but not yet expanded into occurrences — see the `AppointmentException`
design note in §3.3), and end-to-end verification against a live Postgres hasn't
happened yet (Docker wasn't running in the dev environment this was built in).

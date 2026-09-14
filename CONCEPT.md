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

**Recurrence: computed on read, not precomputed.** A recurring `Appointment` stores
only its `RecurrenceRule` on the base Node; no separate occurrence rows exist. When
the API is asked for Nodes in a date range (calendar view, "what's today"), it
expands any `RecurrenceRule`-bearing Appointments into concrete occurrences in that
range on the fly. This avoids a background job that has to keep extending a
precomputed window and avoids ever "running out" of future occurrences.

Two things this pushes onto the API/domain layer that a precomputed-rows approach
would get for free, worth remembering when implementing:
- **Single-occurrence edits/exceptions** ("move just this Tuesday's appointment," "skip
  next week") need explicit modeling — typically an `AppointmentException` table
  keyed by `(NodeId, OriginalOccurrenceDate)` carrying either a replacement
  time/fields or a "skipped" flag, consulted during expansion.
- **Assignment/reminders are naturally computed just-in-time**: since there's no
  occurrence row, "assign this occurrence to a FamilyMember" also needs the exception
  table above rather than a plain join to a Node row, and TickerQ reminder jobs for a
  recurring series get scheduled for "the next occurrence" and re-scheduled after
  firing, rather than one job per future occurrence.

Because TickerQ persists jobs via EF Core against the same Postgres database, no
extra moving parts (no Redis/Hangfire dashboard/separate worker infra) are needed for
a single-instance, family-scale deployment.

### 3.4 Auth

**ASP.NET Core Identity + JWT.** Identity owns the Users table, password hashing, and
account plumbing (lockout, password reset tokens) so none of that needs to be
hand-rolled; on login the API issues a JWT carrying the User's id and their
`Family`/`Role` claims. Every subsequent API call is scoped to `FamilyId` via the
token, so the whole surface is naturally multi-family-safe even though the UI only
targets one family for now.

## 4. Frontend

- **Angular**, calling the API exclusively (no server-side rendering coupling).
- **Ionic** under consideration for PWA/installable-app packaging — gives a native-ish
  mobile experience (and eventually iOS/Android app-store builds via Capacitor) from
  one Angular codebase, at the cost of Ionic's component/styling conventions layered
  on top of Angular. Worth prototyping the board/calendar views with Ionic components
  early since that's the piece most likely to feel wrong if forced into.
- Core views map directly to the domain: a **Board** (Nodes, filterable by type/
  assignee), a **Calendar** (Nodes with a `From`/`Until`), and per-FamilyMember views.

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

Layout matches §3.2, plus the Angular/Ionic client at repo root (its own
convention, alongside `src`/`tests` rather than under them):

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
client/                  # Angular 22 + Ionic 9, Capacitor-ready, PWA (service worker) configured
  src/app/core/           # Auth, Families, FamilyMembers, Nodes services + auth interceptor/guards
  src/app/pages/          # login, family-setup, board
```

**API surface implemented so far** (all family-scoped ones require a JWT with a
`family_id` claim, obtained from `POST /api/families`):

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register`, `/login` | Identity account creation/login → JWT |
| `POST /api/families`, `GET /api/families/mine` | One-time family setup (creates Family + Owner FamilyMember, returns a fresh token) |
| `GET/POST /api/family-members`, `GET/PUT/DELETE /api/family-members/{id}` | FamilyMember CRUD |
| `GET/POST /api/nodes`, `PUT/DELETE /api/nodes/{id}` | Node CRUD across all three types, with `?type=`/`?assignedTo=`/`?from=`/`?until=` filters on the list endpoint |

**To run the whole stack locally: `./scripts/dev.sh`** (needs Docker, the .NET 10
SDK, and Node/npm on `PATH`). It starts Postgres, waits for it to actually be ready
(`docker compose up --wait`, via the healthcheck in `docker-compose.yml`), applies
pending EF Core migrations, then runs the API and the Ionic dev server together
(via `concurrently`, prefixed/colored output) — Ctrl+C stops both. First run also
installs `dotnet-ef` (if missing) and `client/node_modules`. Postgres itself keeps
running afterwards (`docker compose down` to stop it).

What that script does, spelled out (useful if something in it needs debugging):
1. `docker compose up -d --wait postgres` — Postgres on `localhost:5432` (user/db/
   password all `corkboard`, matching `Corkboard.Api/appsettings.json`'s dev
   connection string — change both together if you change one).
2. `dotnet ef database update --project src/Corkboard.Infrastructure --startup-project src/Corkboard.Api`
   — applies the `InitialCreate` migration (Identity + domain + TickerQ tables).
3. `dotnet run --project src/Corkboard.Api` — API on `https://localhost:7127`. A
   real `Jwt:SigningKey` is already set via `dotnet user-secrets` (not committed —
   see `Corkboard.Api.csproj`'s `UserSecretsId`); nothing to configure there.
4. `npm --prefix client start` — Ionic dev server (`ionic serve` also works). Points
   at `https://localhost:7127/api` via `environment.ts`.

Not yet done: no automated tests, no reminder jobs wired to TickerQ yet (the
scheduler itself is running, just unused — see §3.3), no recurrence expansion on
the `/api/nodes` list endpoint (an Appointment's `RecurrenceRule` is stored and
returned but not yet expanded into occurrences — see the `AppointmentException`
design note in §3.3), and end-to-end verification against a live Postgres hasn't
happened yet (Docker wasn't running in the dev environment this was built in).

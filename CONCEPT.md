# Qorkboard — Concept Document

## 1. Vision

Qorkboard is a family coordination app built for one family (yours), not a generic
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
governs who can manage family settings vs. just use the board. The Owner is the
only one who can create logins for other family members (see "Registration and
invites" below).

`ApplicationUser.IsSystemOwner` (bool, Infrastructure/Identity — not part of
`UserFamily`): this app's actual instance-level administrator, granted once,
automatically, to the very first user (the one who registers before any Family
exists, `POST /api/auth/register`). Deliberately kept separate from the Family
`Owner` role rather than reusing it: it's the flag that gates the API clients
admin area (§8's kind of first-run special-casing, not a Family concern) —
see "API clients" below.

**Registration and invites.** `POST /api/auth/register` is only open for the very
first user, before any Family exists — the first-run wizard (§8). Once a Family
has been set up, self-registration is closed (403): a stranger hitting a
configured instance's `/register` would otherwise be able to spin up an unrelated
second Family in the same database. From then on, adding a family member's login
is the Owner's job, from the Family page: `POST /api/family-members/{id}/account`
creates the Identity account and the `UserFamily` row (Role Adult or Member —
never Owner, there's exactly one, set at family creation) in the same call, and
links it to that `FamilyMember`. The Owner picks the password themselves and
shares it with whoever it's for; there's no invite-link/token flow.

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
- **Note**: `IsImportant` (bool) — lets the dashboard's Notes widget (§2.4) filter
  down to just what matters right now. The only field Note has beyond the base ones.
- **Task**: `IsCompleted`, `CompletedAt`, `Priority` (optional).
- **Appointment**: `Location` (optional), `AllDay` (bool), `RecurrenceRule`
  (nullable — see §3.3 on TickerQ). The `RecurrenceRule` describes the pattern only
  (e.g. an RRULE-style string); no occurrence rows are stored — see §3.3.
- **Contact**: an address book entry. `FirstName` is the only required field —
  everything else, including `LastName`, is optional (e.g. "Huisarts" with no last
  name and no phone number is a valid Contact). `DateOfBirth` optional;
  `Street`/`City`/`PostalCode`/`Country` optional (own address — falls back to its
  Household's address when unset, see §2.3); `PhoneNumbers`/`Emails` are separate
  one-to-many tables (`ContactPhoneNumber`/`ContactEmail`, each `{value, Label}`)
  since a Contact can have several of each, or none. `Title` mirrors "FirstName
  LastName" (or just "FirstName" when LastName is unset), recomputed server-side
  on every create/update rather than client-set.

### 2.3 Collection — grouping Nodes

`Collection` is Node's sibling backend-only abstraction: a container that holds one
or more Nodes, and can itself nest under a parent Collection (a plain self-referencing
tree — `ParentCollectionId`, `ChildCollections`). Like Node, the word "Collection"
never reaches the user; each `CollectionType` gets its own user-facing framing:

- **`TaskList`** — "a Task list is a Collection of Task Nodes". `/tasks` lists a
  family's `TaskList` Collections, `/tasks/{id}` shows the Tasks inside one.
  Every Collection has a **scope**: `Family` (shared) or `Personal` (only its
  `OwnerUserId` sees it — enforced in the collection and node services, so API
  clients, which authenticate as themselves, never see Personal lists; only Task
  lists can be Personal). Each scope has one fixed, non-deletable **Inbox**
  (`IsInbox`, created lazily on first list; quick-add lands there; `/tasks/inbox`
  shows the Family and Personal Inbox combined). `IsSystemManaged` lists are normal
  lists hidden from the tasks UI. Inside a list, Tasks group into **Sections**
  (`Section` entity with `SortOrder`, one level; `Task.SectionId`, replacing the old
  free-text `Category`). Moving a task between lists just changes its `CollectionId`.
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
- **`Household`** — "a Household is a Collection of Contact Nodes". Groups related
  Contacts (e.g. a child and their parents) under one shared address, entirely by
  reusing existing machinery for the grouping itself: no new relationship, just a
  Household-typed Collection, and Contacts join it the same way a Task joins a
  TaskList — `Node.CollectionId`. A Contact's own address (see §2.2) wins when set;
  otherwise the client falls back to its Household's address
  (`ContactsPage.effectiveAddress`). Household membership is optional — a Contact
  like the family doctor has no Household at all. Deliberately named "Household"
  rather than "Family" to avoid colliding with this app's own `Family` (the
  tenant/instance-owning entity, §2.1) — a completely different concept.

| Field | Notes |
|---|---|
| Id, FamilyId | same pattern as everything else |
| Name | |
| Type | `CollectionType` — `TaskList`, `Calendar`, `Schedule`, or `Household` |
| Color | hex string, same idea as `FamilyMember.Color` — lets the Calendar grid color-code events by which Calendar they're in |
| FeedToken | nullable opaque string; set the first time a Calendar's iCal subscribe URL is requested (see §3.3) |
| Address | nullable one-to-one `CollectionAddress` (`Street`/`City`/`PostalCode`/`Country`), only meaningful for a Household. Kept in its own table rather than as columns on Collection itself — Collection is shared by every CollectionType, and an address is a Household-only "feature"; folding it into Collection would mean every future per-type extra keeps widening that one wide table the same way Node's TPH columns do (see §2.2). `CollectionsController` upserts/deletes the row as a unit (no address fields set → no row) rather than exposing it as its own endpoint, since nothing outside a Collection edit needs to address it directly yet. |
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

### 2.4 DashboardWidget — the customizable Home page

`/home` is a grid of widgets, arranged into two dashboards distinguished by
`Scope` (`DashboardWidgetScope`):

- **Personal** — per-User, not per-FamilyMember (a FamilyMember isn't
  necessarily login-capable, §2.1), since a dashboard layout is a personal
  login-time preference, not family-shared data. This is `/home`'s original
  and default behavior.
- **Family** — one shared layout per Family, visible to every FamilyMember
  with a login but only editable by an Owner or Adult (`FamilyRole`, §2.1) —
  `UserId` on a Family-scope widget just records who created it and plays no
  part in querying or authorization.

Every widget is also scoped to a Family (`FamilyId`, alongside `UserId`) so a
widget's settings that reference family data (e.g. a Task widget's
`CollectionId`) stay meaningful if a User is ever in more than one Family.

| Field | Notes |
|---|---|
| Id, UserId, FamilyId | |
| Type | `DashboardWidgetType` — `Navigation`, `Notes`, `Tasks`, `Today`, or `Upcoming` |
| Scope | `DashboardWidgetScope` — `Personal` or `Family`, see above |
| SortOrder | the drag-and-drop order within one dashboard — an int, not a 2D position; layout itself is always a responsive CSS grid, never freeform placement |
| Config | nullable `jsonb` column holding per-type settings (see below) |

**Why `Config` is JSONB and not columns, unlike Node's TPH fields (§2.2):** the
shapes are genuinely heterogeneous rather than a handful of scalars — Navigation's
is an ordered array of tile keys, Notes' and Tasks' are scalars — and, critically,
nothing ever needs to query *into* a widget's config relationally (unlike e.g.
"all incomplete Tasks", which is exactly why Node stayed TPH). `DashboardController`
still exposes/accepts one flat typed shape either way (`DashboardWidgetResponse`
etc., same convention as `NodeResponse`) — the JSON only exists between that
controller and the DB; nothing else in the codebase touches raw JSON.

**Widget types:**
- **Navigation** — the tile grid to the other pages. `TileOrder`: an ordered list
  of tile keys (`tasks`/`notes`/`calendar`/`contacts`/`family`); null/omitted means
  default order. A key missing from a saved order still renders, appended at the
  end (`tilesInOrder()`), so adding a new page later doesn't hide it from existing
  widgets.
- **Notes** — `ImportantOnly` (bool): show only Notes with `IsImportant` set (§2.2)
  or everything.
- **Tasks** — either `CollectionId` (a specific Task list) or `AssignedToMeOnly`
  (bool: every incomplete Task assigned to the FamilyMember linked to the caller's
  User — resolved client-side via `FamilyMembers.list().find(m => m.linkedUserId
  === current user)`, no new backend lookup needed). Mutually exclusive in the UI's
  form (a radio choice), though the API doesn't enforce that.
- **Today** — today's due Tasks and Calendar occurrences, grouped by FamilyMember.
  No per-widget config.
- **Upcoming** — the next 7 days' Tasks and Calendar occurrences (plus an overdue
  section), grouped by day. No per-widget config.

A dashboard can have any number of widgets, including several of the same type
(e.g. two Task widgets pointed at different lists) — nothing about the model is
one-per-type. A Personal dashboard's first visit seeds one Navigation widget
(what every earlier version of this page always showed) so it never starts
blank; after that it's entirely user-driven, including removing that seeded
widget. A Family dashboard has no seeding — it starts empty until an admin adds
something, matching "managed by family admins."

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
- **Reminders/notifications** — implemented as Web Push (see below), but not via a
  TickerQ job per Node: a once-a-minute `ReminderWorker` (a plain `BackgroundService`)
  looks at what is due and a `SentReminder` row per device + occurrence prevents
  duplicates. That sidesteps rescheduling on every edit/complete and handles recurring
  items for free (each occurrence is simply due once), at the cost of a cheap query per
  minute.
- **Digests** — e.g. a daily/weekly "what's coming up" push or email per Family.

**Web Push reminders — implemented.** A device opts in on `/notifications` (per device: on/off and a lead time; permission is only requested from a button, and iOS is told to add the app to the Home Screen first). `PushSubscription` rows hold the browser's endpoint and keys. `ReminderService` reminds for tasks with a due time and for appointments (each occurrence) `LeadMinutes` before, and for date-only tasks / all-day appointments at 09:00 local. Recipients: the Personal list's owner; otherwise the assigned members that have a login; **items nobody is assigned to go to the whole family** (a product choice — change `ReminderService.Recipients` to alter it). Endpoints must be public https URLs, since the server POSTs to them. A 404/410 from the push service deletes the subscription. It stays off until `Push:PublicKey` and `Push:PrivateKey` are set (`npx web-push generate-vapid-keys`; keep the private key secret, e.g. via the `Push__PrivateKey` environment variable), and browsers only allow push on an HTTPS origin. Not built: a per-task custom reminder, a daily digest, and an e-mail/in-app fallback for devices that can't do push.

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
recurrence — see above — only digests remain on the "not yet built" list.

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
  Calendar updates Qorkboard). That's a much bigger undertaking — implementing a
  CalDAV server — than anything else in this app so far, and probably isn't worth
  it for a personal family app; one-way export already covers "family member sees
  Qorkboard events in their own phone calendar," which is the realistic use case.

### 3.4 Auth

**ASP.NET Core Identity + JWT.** Identity owns the Users table, password hashing, and
account plumbing (lockout, password reset tokens) so none of that needs to be
hand-rolled; on login the API issues a JWT carrying the User's id and their
`Family`/`Role` claims. Every subsequent API call is scoped to `FamilyId` via the
token, so the whole surface is naturally multi-family-safe even though the UI only
targets one family for now.

**API clients (client-credentials).** Besides human logins, the system owner
(`ApplicationUser.IsSystemOwner`, see §2.1) can provision `ApiClient`s — a
name, a generated `ClientId`, and a generated secret (shown once, stored only
as a PBKDF2 hash) — for automation scripts/integrations. `POST
/api/api-clients/token` exchanges a valid `clientId`/`clientSecret` pair for a
short-lived JWT through the same signing pipeline as a human login, carrying
`client_id`/`scope` claims instead of `Family`/`Role`. Scopes
(`nodes`/`calendar`/`collections`/`dashboard`/`family`, each `:read`/`:write`)
gate the existing resource controllers via a `[RequireScope]` filter, which
only fires for a token that actually carries a `scope` claim.

The Angular GUI is itself modeled as a client — a single seeded
`ApiClient` row (`IsFirstParty = true`, no secret, `ClientId = "corkboard-web"`,
seeded once at startup, see `Program.cs`) that every human login's JWT also
carries a `client_id` claim for. It never gets a `scope` claim, so
`[RequireScope]` leaves it alone (access still comes from `Family`/`Role` as
always) — the claim exists purely so its traffic gets a client identity too.
Every request tied to *any* client — the GUI included — is written to
`ApiCallLog` and kept for 48h (a TickerQ job purges older rows), so the
system owner's API-clients screen is a full picture of what's calling the
API, not just external automation.

**Admin console (`/admin`, `/api/admin/...`).** A system-owner-only area,
visually distinct from the rest of the app (own layout/nav/color palette —
`AdminShellComponent` fully replaces `AppComponent`'s header/nav while
active), reachable from the account menu. Covers: instance-wide stats
(`GET /api/admin/stats`), every Family on the instance with basic
edit (`/api/admin/families`, not just the caller's own), that Family's
FamilyMembers incl. creating logins (`/api/admin/families/{familyId}/members...`
— same `IFamilyMemberService` `/api/family-members` uses, just addressed by
an explicit `familyId` instead of the caller's own JWT claim, since a system
owner administering another Family isn't necessarily a member of it), and
API client management (moved here from a bare `/api/api-clients` — see
above; only the anonymous token-exchange endpoint stayed outside `/api/admin`).

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
  Calendar talks about events/appointments, Contacts talks about phone numbers and
  addresses. All four still just call `GET/POST /api/nodes` with a `type` filter
  under the hood (see `core/nodes.ts`).
- **`/home` is the application's entry point** — `/` redirects there, and it's
  where login/registration and the setup wizard land once a family exists. It's
  a customizable widget dashboard (`DashboardWidget`, §2.4) rather than a fixed
  page: `HomePage` loads the current dashboard's widgets and renders one small
  component per row (`NavigationWidgetComponent`/`NotesWidgetComponent`/
  `TasksWidgetComponent`/`TodayWidgetComponent`/`UpcomingWidgetComponent`, under
  `pages/home/widgets/`), each just taking its widget's already-flat config as
  `@Input()`s — no widget component talks to `DashboardWidgetResponse`'s
  JSON-backed shape directly, or even needs to know it's JSON-backed at all.
  Today and Upcoming used to be their own routed pages (`/today`, `/upcoming`);
  they were folded into widget-only form once the dashboard could show the same
  content inline, and the routes were removed.
  - **Two dashboards, one segmented control**: a `<app-segmented-control>`
    (same component as Calendar's Month/Week/Day switch) at the top of `/home`
    picks `DashboardWidgetScope` — `Personal` (default, per-User, exactly the
    behavior above) or `Family` (one shared layout per Family, `Scope=Family`
    widgets ignore `UserId` entirely). Only Owner/Adult roles
    (`Auth.isAdmin`/`FamilyScopedControllerBase.CurrentUserIsAdmin`) can
    add/remove/reorder/resize/configure Family widgets — everyone in the Family
    can view it. `WidgetCardComponent`'s `[editable]` input is the one place
    that hides the resize/configure/remove chrome for a non-admin viewer.
  - **Drag-and-drop** via `@angular/cdk` (`DragDropModule`) — added specifically
    for this, no prior use of CDK in the app. One `cdkDropList` for widget order
    on the page itself, and a second, independent one inside the Navigation
    widget's config form for tile order — same interaction pattern in both places
    deliberately, since the user only ever controls *order*; actual placement is
    always a responsive CSS grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`),
    never freeform x/y. Reordering posts the caller's whole new order in one call
    (`PUT /api/dashboard/reorder`) rather than N individual position updates.
  - **Add/configure widget** is one shared modal form (`showWidgetForm` +
    `editingWidgetId`, same create-vs-edit-via-one-form pattern as
    `ContactsPage`) whose fields switch on the selected `DashboardWidgetType`.
  - Multiple widgets of the same type are fully supported (e.g. two Task widgets
    pointed at different lists) — `DashboardWidget` was never modeled as
    one-per-type.
- **Editing an existing Node/Collection** — every earlier page (Tasks, Notes,
  Calendar) only ever supported create + delete; Contacts is the first page with
  real edit forms, for both Contacts and Households. Rather than a separate
  edit-page or modal, `ContactsPage` reuses one form per entity for both create and
  edit (`contactForm`/`householdForm`, with an `editingContactId`/
  `editingHouseholdId` flag choosing `create()` vs `update()` on submit) — avoids
  keeping two near-identical templates in sync.

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

Layout matches §3.2, split into a `backend/` (.NET) and `frontend/` (Angular)
monorepo tree, with cross-cutting bits (`docker-compose.yml`, `scripts/`, `docs/`)
at the repo root:

```
docker-compose.yml       # postgres only, for now — see §6
backend/
  Corkboard.slnx
  src/
    Corkboard.Api/          # ASP.NET Core Web API — see endpoint table below
    Corkboard.Domain/       # Family, FamilyMember, Node (+ Note/TaskNode/Appointment), ...
    Corkboard.Infrastructure/ # CorkboardDbContext (EF Core + Identity + TickerQ tables), migrations
    Corkboard.Contracts/    # request/response DTOs — Auth, Families, FamilyMembers, Nodes
  tests/
    Corkboard.Domain.Tests/  # empty so far
    Corkboard.Api.Tests/     # ApiClientService, AdminService, FamilyService.UpdateAsync,
                            # RequireScopeAttribute — in-memory-DB unit tests
frontend/                # Angular 22 + Tailwind CSS PWA (service worker) — no Ionic, see §4
                          # + @angular/cdk (DragDropModule), added for the Home dashboard
  src/app/core/           # Auth, Families, FamilyMembers, Nodes, Collections, CalendarApi,
                          # Dashboard, Setup, ApiClients, Admin, AdminFamilyMembers
                          # services + auth interceptor/guards
  src/app/pages/          # login, family-setup, add-members, home (entry point,
                          # / redirects here — customizable widget dashboard, see
                          # home/widgets/ and §2.4), tasks (Lists overview),
                          # task-list (one list's Tasks, /tasks/:id), notes,
                          # calendar (multi-calendar/schedule month grid),
                          # schedule-editor (weekly grid, /calendar/schedules/:id),
                          # contacts (address book + Household management),
                          # family (manage FamilyMembers; Owner-only: create logins)
  src/app/admin/          # system-owner-only, visually distinct shell (AdminShellComponent) —
                          # stats, families (list + per-Family info/members admin), api-clients
```

**API surface implemented so far** (all family-scoped ones require a JWT with a
`family_id` claim, obtained from `POST /api/families`):

| Endpoint | Purpose |
|---|---|
| `GET /api/setup/status` | Anonymous — whether this instance has any Family yet, drives the client's first-run wizard framing |
| `POST /api/auth/register`, `/login` | Identity account creation/login → JWT. Registration is only open before any Family exists (403 after — see "Registration and invites" in §2.1) |
| `POST /api/families`, `GET /api/families/mine` | One-time family setup (creates Family + Owner FamilyMember, returns a fresh token) |
| `GET/POST /api/family-members`, `GET/PUT/DELETE /api/family-members/{id}` | FamilyMember CRUD — responses include `LinkedUserEmail`/`LinkedUserRole` when a member has a login |
| `POST /api/family-members/{id}/account` | Owner-only — creates a login for a FamilyMember that doesn't have one yet and links it, in one call |
| `GET/POST /api/nodes`, `PUT/DELETE /api/nodes/{id}` | Node CRUD across all four types (incl. Contact), with `?type=`/`?assignedTo=`/`?collectionId=`/`?from=`/`?until=` filters on the list endpoint |
| `GET/POST /api/collections/{id}/sections`, `PUT/DELETE /api/collections/sections/{sectionId}` | Sections of a list; POST returns the existing section on a case-insensitive name match |
| `GET/POST /api/collections`, `PUT/DELETE /api/collections/{id}` | Collection CRUD (Task lists, Calendars, Schedules, Households), with `?type=`/`?parentCollectionId=` filters — list responses include `NodeCount`/`IncompleteCount` |
| `POST /api/collections/{id}/feed-token` | (Re)generates a Calendar's iCal feed URL |
| `GET /api/calendar-feed/{collectionId}/{token}.ics` | Anonymous — the actual iCal subscribe feed |
| `GET /api/calendar/occurrences` | Expanded Appointment occurrences for a date range (`?from=&until=&calendarId=`) — what the month grid renders |
| `PUT`/`DELETE /api/calendar/appointments/{id}/occurrences/{date}` | Override or skip one occurrence of a recurring Appointment |
| `POST /api/calendar/collections/{id}/import` | Multipart `.ics` upload → creates Appointments in that Calendar |
| `GET/POST /api/dashboard`, `PUT/DELETE /api/dashboard/{id}` | DashboardWidget CRUD. `GET`/`POST` take a `scope` query param / body field (`Personal`\|`Family`, defaults `Personal`); `Personal` is scoped to the caller (User × Family) and `GET` seeds one Navigation widget on a caller's very first request, `Family` is shared by the whole Family and requires an Owner/Adult role to mutate (403 otherwise) — `PUT`/`DELETE /{id}` infer scope from the widget itself |
| `PUT /api/dashboard/reorder?scope=...` | Full replacement of one dashboard's widget order in one call — `SortOrder` becomes each id's index in the given list |
| `GET/POST /api/admin/api-clients`, `GET /api/admin/api-clients/{id}/call-log`, `DELETE /api/admin/api-clients/{id}` | System-owner-only (§3.4) — ApiClient CRUD/revoke and its 48h call log; `POST` returns the plaintext secret once |
| `POST /api/api-clients/token` | Anonymous — client-credentials grant, exchanges a `clientId`/`clientSecret` for a scoped JWT. Kept outside `/api/admin` on purpose: the caller here is the external client itself, not the system owner |
| `GET /api/admin/stats` | System-owner-only — instance-wide counts (families, users, API clients, FamilyMembers, Nodes) |
| `GET /api/admin/families`, `GET/PUT /api/admin/families/{id}` | System-owner-only — every Family on the instance (not just the caller's own), and renaming/timezone edits |
| `GET/POST /api/admin/families/{familyId}/members`, `PUT/DELETE /api/admin/families/{familyId}/members/{id}`, `POST .../members/{id}/account` | System-owner-only — the same FamilyMember CRUD `/api/family-members` offers its own Family, but for *any* Family, without being one of its members |

**First-run setup wizard**: the client doesn't have a separate `/setup` route —
instead `/login` checks `GET /api/setup/status` on load, and when no Family exists
yet anywhere on the instance it frames itself as "Step 1 of 3" in register mode —
the *only* time `LoginPage` ever submits a register call; once `isFirstRun` is
false there's no toggle to get back to it (registration is closed server-side
anyway, see §2.1). Registering routes to `/family-setup` ("Step 2 of 3", creates
the Family + the caller's own FamilyMember as Owner), which routes to
`/add-members` ("Step 3 of 3", add the rest of the family before landing on
`/home`) — both one-shot, onboarding-only pages. Ordinary subsequent logins skip
all of this. Adding *more* family members later, after onboarding, is the `/family`
page's job — list/edit/remove FamilyMembers, and (Owner-only) create a login for
one that doesn't have one yet.

**To run the whole stack locally: `./scripts/dev.sh`** (needs Docker, the .NET 10
SDK, and Node/npm on `PATH`). It starts Postgres, waits for it to actually be ready
(`docker compose up --wait`, via the healthcheck in `docker-compose.yml`), applies
pending EF Core migrations, then runs the API and the Angular dev server together
(via `concurrently`, prefixed/colored output) — Ctrl+C stops both. First run also
installs `dotnet-ef` (if missing) and `frontend/node_modules`. Postgres itself keeps
running afterwards (`docker compose down` to stop it).

What that script does, spelled out (useful if something in it needs debugging):
1. `docker compose up -d --wait postgres` — Postgres on `localhost:5432` (user/db/
   password all `corkboard`, matching `Corkboard.Api/appsettings.json`'s dev
   connection string — change both together if you change one).
2. `dotnet ef database update --project backend/src/Corkboard.Infrastructure --startup-project backend/src/Corkboard.Api`
   — applies the `InitialCreate` migration (Identity + domain + TickerQ tables).
3. `dotnet run --project backend/src/Corkboard.Api --launch-profile http` — API on
   `http://localhost:5147` (plain HTTP, deliberately — see below). A real
   `Jwt:SigningKey` is already set via `dotnet user-secrets` (not committed —
   see `Corkboard.Api.csproj`'s `UserSecretsId`); nothing to configure there.
4. `npm --prefix frontend start` — Angular dev server. Points at
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

Not yet done: no automated tests, reminders run in a `BackgroundService`, not TickerQ (the
scheduler itself is running, only used for the API-call-log purge — see §3.3), no recurrence expansion on
the `/api/nodes` list endpoint (an Appointment's `RecurrenceRule` is stored and
returned but not yet expanded into occurrences — see the `AppointmentException`
design note in §3.3), and end-to-end verification against a live Postgres hasn't
happened yet (Docker wasn't running in the dev environment this was built in).

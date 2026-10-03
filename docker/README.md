# Docker image

Builds one image with the Angular frontend and the ASP.NET Core API combined:
Kestrel serves the built Angular app as static files and the API under `/api`
from the same process/port, so nothing else needs to run inside the
container. Postgres is **not** included — you host that yourself and point
the container at it.

Base images: `mcr.microsoft.com/dotnet/sdk:10.0` to publish the API and
`mcr.microsoft.com/dotnet/aspnet:10.0` for the runtime image (the one that
actually ships). The frontend build stage uses `node:22-alpine` to run `npm
ci`/`ng build`; it's discarded after the build and never part of the shipped
image, so it doesn't need to match.

## Build

From the repository root (the build needs both `backend/` and `frontend/` in
its context):

```bash
docker build -f docker/Dockerfile -t qorkboard .
```

## Prebuilt image

The `Docker image` GitHub Action publishes to GHCR only when a version tag
(`v1.2.3`) is pushed, giving `ghcr.io/diewoutman/corkboard:1.2.3`, `:1.2` and
`:latest` (the image path tracks this repository's current name — it moves to
`.../qorkboard` if the repo is ever renamed). Pull requests and pushes to
`main` only build, without pushing.

## Run

```bash
docker run -d \
  --name qorkboard \
  -p 8080:8080 \
  -e ConnectionStrings__Default="Host=<your-postgres-host>;Port=5432;Database=qorkboard;Username=qorkboard;Password=<password>" \
  -e Jwt__SigningKey="<32+ byte random secret>" \
  -e ApplyMigrationsOnStartup=true \
  qorkboard
```

See `docker-compose.example.yml` for the same thing as a compose file
(includes a Postgres service you can drop if you already have one running
elsewhere).

## Required environment variables

| Variable | Purpose |
|---|---|
| `ConnectionStrings__Default` | Npgsql connection string to your Postgres instance. |
| `Jwt__SigningKey` | Random secret, at least 32 bytes. The app refuses to start without a real one outside Development — generate with e.g. `openssl rand -base64 32`. |

## Optional

| Variable | Purpose |
|---|---|
| `ApplyMigrationsOnStartup` | Set to `true` to have the container apply pending EF Core migrations itself on boot (`Database.MigrateAsync()`), instead of running `dotnet ef database update` separately. Off by default — safe for a single instance, but don't set it on more than one replica pointed at the same database at once. |
| `Cors__AllowedOrigins__0`, `__1`, ... | Only needed if you'll call the API from a different origin than the one serving the frontend. Same-origin (the normal case — one container, one port) doesn't need this. |

`ASPNETCORE_ENVIRONMENT` defaults to `Production` when unset, which is what
you want here.

## Notes

- The image listens on port `8080` inside the container (`ASPNETCORE_URLS`).
  Map it to whatever host port you like.
- First registered user becomes the instance's system owner, same as in
  local dev — see the main [README](../README.md#getting-started).
- `Dockerfile.dockerignore` is picked up automatically by BuildKit when
  building with `-f docker/Dockerfile` from the repo root.

## Running on a low-powered host (NAS)

The API compresses responses (Brotli/gzip) and caches its fingerprinted bundles for a year, so most of the
remaining latency is Postgres and disk. Things worth checking, in order:

- **Keep the Postgres volume on the fastest disk you have** (SSD/NVMe pool or cache, not the spinning array).
- **Give Postgres some memory.** The defaults assume a tiny machine. On a NAS with 4 GB+ free, start the
  container with e.g. `-c shared_buffers=256MB -c effective_cache_size=1GB -c work_mem=8MB`.
- **`synchronous_commit=off`** removes the wait for a disk flush on every write. A crash can lose the last
  fraction of a second of writes but never corrupts the database — a fair trade for a family app.
- **Measure before and after.** The API-clients page of the admin area shows the call log with
  `DurationMs` per request (48h retention); compare the slow endpoints before and after a change.

POST requests carry an `Idempotency-Key` header; the API remembers the response to a key for 10 minutes and
replays it for a repeat, so a double submit or a retry can't create a second task.

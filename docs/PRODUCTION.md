# Production deployment and operations

This runbook describes the current production shape of TTCA. It is provider-neutral: the Angular
files may be hosted by a static web server or CDN, Express runs as a Node.js service, and PostgreSQL
is the system of record.

## Architecture

```text
Browser
  ├── / and application routes ──> Angular static files
  ├── /api/*                    ──> Express
  └── /images/*                 ──> Express public image directory
                                      └── PostgreSQL
```

Angular must never connect directly to PostgreSQL. Keep the browser and API on one public origin
when possible. The frontend intentionally uses root-relative `/api` and `/images` URLs.

## Runtime requirements

- Node.js 24 LTS-compatible runtime
- npm 11 and the committed `package-lock.json`
- PostgreSQL 18 (the schema uses UUID defaults and is also compatible with supported PostgreSQL
  releases that provide `gen_random_uuid()`)
- TLS at the public load balancer or reverse proxy
- A persistent, backed-up PostgreSQL volume or managed database

Do not treat the Node service filesystem as an upload store. Images currently committed under
`public/images` are deployed with the application. If user uploads are added later, use durable
object storage and save only approved URLs in PostgreSQL.

## Required environment

Use the deployment platform's encrypted secret store. Never commit a production `.env` file.

| Variable                           | Purpose                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `NODE_ENV=production`              | Enables production error behavior and secret checks.                     |
| `PORT`                             | Express listen port. The platform may inject this.                       |
| `CLIENT_ORIGIN`                    | Exact public frontend origin, for example `https://archive.example.com`. |
| `ADMIN_PASSWORD`                   | Shared editor password; use at least 12 strong, unique characters.       |
| `SESSION_SECRET`                   | Random signing secret of at least 32 characters.                         |
| `DATABASE_URL`                     | Runtime connection using the restricted `dnd_app` role.                  |
| `MIGRATION_DATABASE_URL`           | Schema-owner connection used only by the migration release step.         |
| `DATABASE_SSL`                     | Set to `true` when the provider requires PostgreSQL TLS.                 |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Keep `true` unless the provider explicitly requires otherwise.           |
| `TRUST_PROXY`                      | Set to `1` only when Express is behind one trusted proxy.                |

Pool controls have safe defaults and can be tuned with `PGPOOL_MAX`,
`PG_CONNECTION_TIMEOUT_MS`, `PG_IDLE_TIMEOUT_MS`, `PG_STATEMENT_TIMEOUT_MS`, and
`PG_QUERY_TIMEOUT_MS`. Size `PGPOOL_MAX` against the database provider's total connection limit
across every API instance.

Generate secrets with a cryptographically secure password manager or secret generator. Do not
reuse local or CI values.

## Database roles

Use two separate credentials:

1. A schema owner or migration role supplied only to the release job through
   `MIGRATION_DATABASE_URL`.
2. The lower-privilege `dnd_app` runtime role supplied to Express through `DATABASE_URL`.

Migrations grant the application role only the table permissions needed by current CRUD routes.
The API process should not own tables or have permission to alter the schema.

## Release procedure

1. Create a recoverable database backup or provider snapshot.
2. Check out the exact commit or immutable release artifact.
3. Install locked dependencies with `npm ci`.
4. Run `npm run test:backend`.
5. Run `npm test -- --watch=false`.
6. Run `npm run build`.
7. Run `npm audit --omit=dev --audit-level=high`.
8. Apply migrations once with `npm run db:migrate` using `MIGRATION_DATABASE_URL`.
9. Deploy `dist/TTCA/browser` to the static host.
10. Start the API with `NODE_ENV=production node server/index.js`.
11. Verify `GET /api/health` returns HTTP 200 and exactly `{ "status": "ok" }`.
12. Verify demo login, a protected route, and an editor read before enabling public traffic.

Do not run `ng serve`, `node --watch`, or `npm run dev` in production.

## Reverse proxy and SPA routing

The proxy must send `/api/*` and `/images/*` to Express before applying the Angular fallback. All
other unknown browser routes must return Angular's `index.html`, otherwise direct navigation to
`/characters`, `/campaign-log`, or another client route will produce a server 404.

Illustrative Nginx routing:

```nginx
location /api/ {
    proxy_pass http://ttca-api:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /images/ {
    proxy_pass http://ttca-api:3000;
}

location / {
    root /srv/ttca/browser;
    try_files $uri $uri/ /index.html;
}
```

Set cache headers aggressively for hashed Angular JavaScript/CSS assets. Do not aggressively cache
`index.html`, health responses, or authenticated API responses.

## Health, logs, and shutdown

- `/api/health` checks PostgreSQL without exposing its database name, user, or server time.
- Route production logs to the platform's centralized log service. Restrict access because errors
  can contain operational context.
- The API handles `SIGTERM` and `SIGINT`, stops accepting connections, waits for active requests,
  and closes the PostgreSQL pool. Give it at least 10 seconds of termination grace.
- Alert on repeated health failures, HTTP 5xx rates, authentication-rate-limit spikes, and database
  pool exhaustion.

## Backups and recovery

- Enable automated PostgreSQL backups and point-in-time recovery where available.
- Test restoration into a non-production database before launch and periodically afterward.
- Take an on-demand snapshot immediately before migrations that alter or remove data.
- Store committed static images in source control or the build artifact; back up any future object
  storage separately.

## Rollback

Database migrations are currently forward-only. Do not automatically reverse them.

1. Remove the release from public traffic if it is leaking data or corrupting writes.
2. Redeploy the previous immutable frontend and API artifacts.
3. If the new code wrote incompatible data, restore the pre-release database snapshot or apply a
   reviewed forward-fix migration.
4. Re-run the health, demo, protected-route, and editor smoke checks.
5. Record the failed migration filename and incident details before attempting another release.

## Security checklist

- Production secrets exist only in the platform secret store.
- `CLIENT_ORIGIN` exactly matches the public HTTPS origin.
- PostgreSQL is not publicly exposed to browsers or the internet.
- The runtime database credential is not a schema owner.
- TLS is enabled for public HTTP and, when supported, PostgreSQL.
- Demo responses contain no `dm_only` records; authorization is enforced in SQL/API code.
- Dependency audit and CI are green for the deployed commit.
- D&D text, artwork, fonts, and datasets have documented permission or attribution.

The current shared-password authentication is suitable for a controlled portfolio demonstration,
not a multi-user production service. Before inviting independent users, add individual accounts,
server-side revocation, password reset, audit history, and role assignment.

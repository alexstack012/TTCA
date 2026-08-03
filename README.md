# The war of shadow and secrets dnd/ttrpg achive

Angular and Express foundation for a tabletop campaign archive. Visitors may enter a read-only demonstration, while keepers authenticate for editing privileges.

## Local development

1. Copy `.env.example` to `.env` and replace both secrets. If no `.env` exists, local development uses password `keeper`; production deliberately refuses to start without secrets.
2. Run `npm install`.
3. Run `npm run db:migrate` with a database role that owns the schema. Hosted environments
   should provide that role through `MIGRATION_DATABASE_URL`; the API continues to use the
   lower-privilege `DATABASE_URL` or `PG*` settings.
4. Run `npm run dev` from this directory.
5. Open `http://localhost:4200`.

`npm run dev` starts the Express API on port 3000 and Angular on port 4200. Angular proxies `/api` requests through `proxy.conf.json`.

`Start-Service postgresql-x64-18` and `Stop-Service postgresql-x64-18` and `Restart-Service postgresql-x64-18` are for the database.

## Authorization model

- `POST /api/auth/login` issues a signed, eight-hour `editor` session after a valid password.
- `POST /api/auth/demo` issues a signed, eight-hour `demo` session.
- `authenticate` validates signed sessions on protected API routes.
- `requireEditor` returns HTTP 403 for demo sessions. Apply it to every future POST, PUT, PATCH, and DELETE route.

Session tokens are stored in browser session storage and are removed by the client during logout.

## Checks

```sh
npm run build
npm test -- --watch=false
npm run test:backend
npm run test:e2e
```

The Playwright suite runs against Chromium in desktop and mobile layouts. Its default scenarios are
read-only. Set `E2E_ADMIN_PASSWORD` to the same value as `ADMIN_PASSWORD` to enable the editor CRUD
scenario; that test creates a uniquely named location and removes it during cleanup. Use
`npm run test:all` to run backend, Angular, and end-to-end suites together.

# The war of shadow and secrets dnd/ttrpg achive

Angular and Express foundation for a tabletop campaign archive. Visitors may enter a read-only demonstration, while keepers authenticate for editing privileges.

## Local development

1. Copy `.env.example` to `.env` and replace both secrets. If no `.env` exists, local development uses password `keeper`; production deliberately refuses to start without secrets.
2. Run `npm install`.
3. Run `npm run dev` from this directory.
4. Open `http://localhost:4200`.

`npm run dev` starts the Express API on port 3000 and Angular on port 4200. Angular proxies `/api` requests through `proxy.conf.json`.

`Start-Service postgresql-x64-18` and `Stop-Service postgresql-x64-18` and `Restart-Service postgresql-x64-18` are for the database.

## Authorization model

- `POST /api/auth/login` issues an eight-hour `editor` session after a valid password.
- `POST /api/auth/demo` issues an eight-hour `demo` session.
- `authenticate` validates signed sessions on protected API routes.
- `requireEditor` returns HTTP 403 for demo sessions. Apply it to every future POST, PUT, PATCH, and DELETE route.

The example write endpoint demonstrates the permission boundary and returns 501 for an authorized editor until PostgreSQL is connected. Session tokens are stored in browser session storage, so closing the tab ends the local browser session.

## Checks

```sh
npm run build
npm test -- --watch=false
```

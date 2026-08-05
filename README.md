# TTCA — Tabletop Campaign Archive

[![CI](https://github.com/alexstack012/TTCA/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/alexstack012/TTCA/actions/workflows/ci.yml)

A full-stack Angular campaign-management application for organizing characters, locations, session logs, lore, plot points, spells, and equipment.

TTCA provides an authenticated editor experience for campaign management and a protected,
read-only demonstration for portfolio visitors.

> **Deployment status:** public demo URL coming soon. The application is currently undergoing its
> final deployment verification.

## Application preview

The interface presents a responsive, dark-fantasy archive built for a lore-heavy tabletop campaign.
A hosted screenshot or short product walkthrough will be added alongside the public deployment URL.

## Key features

- Protected read-only demo and authenticated editor experiences
- Searchable campaign characters with detailed records, images, and full CRUD workflows
- Session logs linked bidirectionally to characters and locations
- Location, lore, and plot-point management backed by normalized PostgreSQL relationships
- Static, filterable spell and equipment reference catalogues
- Server-enforced visibility and mutation permissions
- Responsive layouts for desktop and mobile use
- Node API tests, Angular unit tests, and Playwright desktop/mobile end-to-end tests

## Architecture and technologies

```text
Browser
  ├── Angular 21 application
  ├── /api/* requests ──────────> Express 5 API
  └── /images/* assets               └── PostgreSQL 18
```

|--------------------------------------------------------------------------------- |
| Frontend | Angular 21, TypeScript, signals, RxJS, SCSS                                       |
| Backend  | Node.js 24, Express 5                                                             |
| Database | PostgreSQL 18, normalized relational schema and SQL migrations                    |
| Security | Signed sessions, role-aware routes, Helmet, CORS, rate limiting, input validation |
| Quality  | Vitest, Node test runner, Playwright, Prettier, GitHub Actions                    |

Angular never connects directly to PostgreSQL. The browser uses root-relative API URLs, and Express owns data access, visibility filtering, validation, and authorization.

## Security model

- `POST /api/auth/login` issues a signed editor session after valid authentication.
- `POST /api/auth/demo` issues a signed read-only session.
- Protected API routes authenticate every request.
- Mutation routes require editor privileges.
- Campaign visibility is filtered by the API and is never delegated to CSS or client-only logic.
- Browser sessions use session storage and end when the browser session closes.
- Production startup rejects missing or unsafe secrets.
- Database migrations and the API use separate database roles.

The shared editor password is appropriate for this controlled portfolio demonstration, not a general-purpose multi-user identity system. See the production runbook for the remaining controls required before expanding access.

## Testing and continuous integration

Pushes to `master`, pull requests, and manual workflow dispatches run:

1. Prettier formatting verification
2. Backend API tests
3. Angular unit tests
4. Production Angular build
5. Production dependency audit
6. PostgreSQL migrations against a disposable database
7. Playwright read-only and editor CRUD scenarios in desktop and mobile layouts

```sh
npm run format:check
npm run test:backend
npm test -- --watch=false
npm run build
npm run test:e2e
```

The CI badge reflects the latest workflow result after this configuration has run on GitHub.

## Local setup

### Requirements

- Node.js 24
- npm 11
- PostgreSQL with permission to create and migrate the development schema

### Start the application

1. Copy `.env.example` to `.env`.
2. Replace the development secrets and configure the PostgreSQL connection.
3. Run `npm install`.
4. Run `npm run db:migrate` using the schema-owner connection.
5. Run `npm run dev`.
6. Open `http://localhost:4200`.

`npm run dev` starts Express on port 3000 and Angular on port 4200. Angular proxies `/api` requests through `proxy.conf.json`. Never commit `.env` or place database credentials in Angular.

## Production deployment

The [production runbook](docs/PRODUCTION.md) documents environment variables, database roles, migrations, reverse-proxy configuration, TLS, health checks, backups, rollback, monitoring, and the release checklist.

## Post-deployment roadmap

The following improvements are planned after the initial stable deployment; they are maintainability,
accessibility, and scalability enhancements rather than launch blockers.

- [] **Refactor the characters feature:** Split filtering, cards, details, forms, deletion, and image presentation into focused components with clear responsibilities.
- [] **Adopt typed reactive character forms:** Replace mutable template-driven drafts with typed controls, structured validation, predictable resets, and testable request mapping.
- [] **Decompose the campaign log:** Extract session cards, session forms, relationship selectors, and location references from the current page component.
- [] **Separate lore and plot-point presentation:** Preserve the combined route while giving each domain its own list, details, form, and CRUD components.
- [] **Standardize dialog infrastructure:** Use Angular CDK or a tested native dialog wrapper for focus management, Escape handling, background isolation, and unsaved-change protection.
- [] **Create reusable relationship selectors:** Share searchable entity and location selection behavior across sessions, lore, and plot points without hiding domain-specific rules.
- [] **Standardize asynchronous UI state:** Replace repeated loading, saving, deletion, and error signals with a small, consistent request-state convention.
- [] **Separate API and form models:** Introduce explicit mapping functions so backend response shapes are not mutated directly as user-editable drafts.
- [] **Consolidate shared SCSS primitives:** Centralize design tokens, focus rings, forms, dialogs, record cards, and responsive breakpoints while retaining feature-specific styling.
- [] **Lazy-load feature routes:** Load archive sections on demand to reduce the initial bundle and reinforce clear feature boundaries.
- [] **Standardize backend repositories and routes:** Align validation, not-found behavior, transactions, filtering, error mapping, and fixture conventions across API features.
- [] **Separate Express construction from process startup:** Introduce an application factory so API and authentication tests can run without starting the production server lifecycle.

## Content and image notice

TTCA is an unofficial fan-made archive and is not affiliated with or endorsed by Wizards of the Coast. Application source code, Dungeons & Dragons material, third-party artwork, and original campaign writing have distinct ownership and licensing terms.

See [CONTENT_NOTICE.md](CONTENT_NOTICE.md) for the content policy and
[public/images/CREDITS.md](public/images/CREDITS.md) for asset-level provenance. Do not add an image to the public application until its source and permitted use have been recorded.

<!--
Quick development reference

Application:
  npm run dev                       Start Angular and Express

Formatting:
  npm run format                    Format supported repository files
  npm run format:check              Check formatting without modifying files

Angular / Vitest unit tests:
  npm test -- --watch=false         Run unit tests once
  npm test                          Run unit tests in watch mode

Backend tests:
  npm run test:backend              Run Node API tests

Playwright:
  npm run test:e2e                  Run desktop and mobile E2E tests
  npm run test:e2e:ui               Open Playwright UI mode
  npx playwright test --headed      Run E2E tests in visible browsers
  npx playwright test --debug       Run with the Playwright debugger
  npx playwright show-report        Open the latest HTML report

Everything:
  npm run test:all                  Run backend, unit, and E2E suites
-->

# DDC CRM

> Admin platform for Talent Center "DDC" — a dance school CRM. Manage clients, dance groups and
> schedule, choreographers, branches, invoicing and recurring payments (Mollie), and email workflows.

**DDC CRM** is a TypeScript monorepo powering the daily operations of a dance school: client and
student records, group schedule and calendar, choreographer and branch management, invoicing with
online payment links, Mollie subscriptions and mandates, emails (IMAP/SMTP), Telegram and Instagram
integrations, users, roles and settings.

## Tech Stack

| Layer   | Technology |
| ------- | ---------- |
| Client  | React 19, Redux Toolkit, TypeScript, SCSS Modules, Webpack, Jest, Storybook |
| Server  | Express 5, Prisma 6, MySQL 8, Redis (rate limiting), Zod, Node test runner |
| Auth    | Cookie sessions, CSRF double-submit, Argon2id, 2FA email, endpoint rate limiting |
| Payments| Mollie (payments, subscriptions, mandates, reconciliation) |
| Infra   | Docker Compose (dev + prod), nginx, GitHub Actions (CI + deploy) |

## Repository Layout

```text
client/  React admin SPA (Feature-Sliced Design)
server/  Express API + Prisma + MySQL + Redis
docker/  Dockerfiles and nginx config (client & server, dev + prod)
docs/    product, security, infrastructure and roadmap documentation
scripts/ repository-level tooling (dev, deploy, docs generation)
plugins/ local ESLint plugins (FSD path checker)
```

The root package only orchestrates project-level commands. Install dependencies separately in
`client/` and `server/` when working without Docker; the containers install their own.

## Features

- **Clients & Students** — records, filters, pagination, details, comments, payment status
- **Schedule** — groups, halls, calendar, dance styles, choreographers
- **Invoicing** — invoices, PDF, payment links, reminders and Mollie reconciliation
- **Mollie** — client profiles, subscriptions, mandates, payments and incident matrix
- **Emails** — IMAP/SMTP accounts, messages, attachments (encrypted)
- **Users, Roles, Settings** — organization, brands, company pages, content hub
- **Security** — Argon2id password hashing, cookie sessions with CSRF, 2FA email flow, rate limiting
  (Redis-based with in-memory fallback), security audit event log

## Getting Started

> Development runs on **Docker** (the supported path used in production).

### Prerequisites

- Docker + Docker Compose v2
- Node.js 20+ (only needed to run repo-level tooling outside the containers)

### 1. Configure environment

Copy the example env file and fill in the values:

```bash
cp .env.example .env
```

`docker compose` reads this file at the repository root. All variables are documented inline in
`.env.example`, including the prod-only `*_PROD` values used by `docker-compose.prod.yml`.

### 2. Start the dev stack

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This brings up MySQL, Redis, the backend API and the frontend dev server, with the ports defined in
your `.env` (defaults: frontend `3000`, backend `18080`, MySQL and Redis on Docker-internal network).

> **Note:** the database/Redis containers are stateful. To start from a clean slate after changing
> DB credentials or ports, remove the corresponding volumes (`docker compose down -v`) — this
> re-runs the MySQL init scripts.

### Running without Docker

Dependencies must be installed separately in each package:

```bash
cd client && npm install
cd server && npm install
```

From the repository root, `npm start` launches both development processes
(`scripts/start-development.js`). Alternatively, run each package directly from its own directory.

## Project Scripts

Repository root:

```bash
npm start             # dev server + client (non-Docker)
npm run deploy        # production Docker deploy
npm run deploy:docker # alias for the same production deploy
```

Client (`cd client`):

```bash
npm start            # webpack dev server on :3000
npm run build:prod   # production build -> client/build
npm run lint:ts      # ESLint (FSD path rules enforced)
npm run lint:scss    # stylelint
npm test             # Jest
npm run storybook    # Storybook on :6006
```

Server (`cd server`):

```bash
npm start                       # nodemon dev process
npm run build                   # prisma generate + tsc
npm run prisma:generate         # regenerate Prisma client
npm run pmd:dev                 # apply local Prisma schema migrations
npm run migrate:prod            # apply production migrations
npm run user:reset-password -- <email>  # interactive Argon2id password reset
```

Server tests use the Node built-in test runner and are organised per domain — there is no single
server-wide command:

```bash
npm run test:auth
npm run test:mollie
npm run test:search
npm run test:email
npm run test:payment-reminders
# or a single file directly:
node --test -r ts-node/register src/services/service.Password.test.ts
```

## Environment Variables

The single source of documented variables is [`.env.example`](.env.example). Key groups:

- **MySQL / Redis** — credentials, database name, host ports (`DB_*`, `REDIS_*`)
- **Ports / URLs** — frontend & backend ports, `CLIENT_URL`, `PUBLIC_SITE_URL`, `CLIENT_API_URL`
  plus their `*_PROD` counterparts
- **Security** — `JWT_*`, `SECRET_SALT`, `CSRF_SECRET`, `VERIFY_MARKER_SECRET`, cookie names,
  token expirations
- **Integrations** — `MOLLIE_*`, `INSTAGRAM_*`, `TELEGRAM_*`, `TWO_FACTOR_SENDER_EMAIL`

Only the built frontend bundle and server receive environment at runtime; the server reads env from
the compose `environment:` block (or, when run directly with `node`/`nodemon`, from a `server/.env`
file — not required for the Docker workflow).

## Architecture

### Client — Feature-Sliced Design

`client/src` is organised into layers, top-down:

```text
app -> pages -> widgets -> features -> entities -> shared
```

A slice may import only through its own public API (`index.ts`) or from a layer **below** — never
sideways or up. This is enforced by the local `eslint-plugin-fix-path-plugin` (`path-checker` rule);
the `@/` alias maps to `client/src/`.

Most page/feature state is mounted lazily with `DynamicModuleLoader`. API access goes through
`@/shared/api/api.ts`: `$api` for unauthenticated calls and `$apiPrivate` for cookie-session calls
that automatically attach the CSRF token.

### Server — Layered Express

```text
routes/router.X.ts -> controllers/controller.X.ts -> services/service.X.ts
```

- Validation via Zod schemas (`server/src/schemas/`) applied through validation middleware
- Authentication: cookie sessions, CSRF double-submit, Argon2id password hashing, 2FA email flow,
  endpoint-specific rate limiting (Redis when `REDIS_URL` is set, in-memory process-local fallback)
- Prisma schema is split across `server/prisma/schema/*.prisma` (client, company, email, invoice,
  mollie, payment-reminder, schedule, user) pointed at MySQL via `DATABASE_URL`
- `GET /api/v1/health` (no auth, no DB) supports Docker health checks and deploy smoke tests

## Production & Deployment

Production is deployed as a **single Docker Compose stack** on a VPS, driven by

```bash
npm run deploy
```

(`npm run deploy:docker` is an alias). The deploy script (`scripts/deploy-docker.sh`) takes
`--no-cache` and `--skip-smoke` flags and uses `docker compose` with the `prod` override files.

The production topology, required env values, container names, ports and the nginx contract are
documented in full:

- [Docker Production Deployment](docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md)
- [Deploy endpoint usage](scripts/deploy-docker.sh)

GitHub Actions:
- [`ci.yml`](.github/workflows/ci.yml) — `client-checks`/`server-checks`/`docs-links` on Node 20,
  required on PRs into `develop` and `main`

Production deploy is manual (`npm run deploy`, run by the repo owner), not GitHub-Actions-triggered —
see `docs/adr/0002-manual-production-deploy-retire-github-actions-deploy.md` (gitignored, local only)
for why.

## Documentation

- [Project dependency tree](docs/spec/PROJECT_TREE.html) (Graphify)
- [Server source tree](docs/spec/SERVER_SRC_TREE.html) and [Client source tree](docs/spec/CLIENT_SRC_TREE.html)
- [Graphify workflow](docs/spec/GRAPHIFY_WORKFLOW.md)
- [Schema documentation](docs/schema.md)

## License

No license file is included in this repository. All rights to the code are reserved by the
copyright holder. Contact the maintainer for usage permissions.

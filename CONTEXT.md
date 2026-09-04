# DDC CRM — Project Context

Domain knowledge for AI agents working on this codebase.

---

## Product

CRM / admin platform for dance school "DDC" (Talent Center): client/student records, dance groups, schedule/calendar, choreographers, branches, invoicing and recurring payments (Mollie), email workflows, users/roles, and settings.

## Domain Language

| Term | Meaning |
|---|---|
| Client | A person enrolled at the school (student), or their parent/guardian who pays. |
| Group / Dance group | A scheduled class (style + level + choreographer + hall + time slot). |
| Choreographer | An instructor who teaches one or more groups. |
| Branch / Filiya | A physical location / studio. |
| Invoice | Generated monthly per client for active groups. PDF + online payment link. |
| Mollie | Payment gateway: client profiles, subscriptions, mandates, payments, reconciliation. |
| Mandate | Recurring payment authorisation (Mollie). |
| Payment reminder | Automated email sequence for unpaid invoices. |

## System Overview

TypeScript monorepo, two packages, no shared root `node_modules`:

- `client/` — React 19 admin SPA, Redux Toolkit, custom webpack (not CRA), SCSS Modules
- `server/` — Express 5 API, Prisma 6 ORM, MySQL 8, Zod validation
- `docker/` — Dockerfiles and nginx config for dev and prod
- `docs/` — product, infrastructure, security, roadmap, Graphify documentation
- `plugins/` — local ESLint plugins (FSD path checker)

## Client Architecture

`client/src` follows Feature-Sliced Design:

```
app -> pages -> widgets -> features -> entities -> shared
```

- Slices import only through their public API (`index.ts`) or from lower layers.
- `@/` alias → `client/src/`.
- FSD path rules enforced by `eslint-plugin-denys-fix-fsd-path-plugin` (`path-checker`).
- Redux state: always-mounted reducers (`user`, `ui`) + lazy reducers via `DynamicModuleLoader`.
- API access: `$api` (unauthenticated) and `$apiPrivate` (cookie session + CSRF).
- UI text via i18next. Components are functional, often wrapped with `memo()`.
- SCSS Modules (`*.module.scss`). Global styles in `app/styles`.
- UI conventions: `.claude/rules/code-style.md` — theme tokens (prefer `*-redesigned`), dark theme awareness.

## Server Architecture

Layered Express:

```
routes/router.X.ts -> controllers/controller.X.ts -> services/service.X.ts
```

- Validation: Zod schemas in `server/src/schemas/`, applied via `middleware.ValidateSchema`.
- Auth: cookie sessions, CSRF double-submit (`middleware.Auth`, `middleware.Csrf`), Argon2id, 2FA email flow, endpoint-specific rate limiting (`middleware.LoginRateLimit`, etc.).
- Rate limiting: Redis-based when `REDIS_URL` is set; in-memory process-local fallback otherwise.
- Health: `GET /api/v1/health` (no auth, no DB) — for Docker health checks.

## Data / Prisma

- Schema split across `server/prisma/schema/*.prisma`: client, company, email, invoice, mollie, payment-reminder, schedule, user.
- `schema.prisma` contains datasource/generator and shared models (`Comment`, `Transaction`).
- MySQL via `DATABASE_URL`.
- After editing any `.prisma` file: `cd server && npm run prisma:generate` (also runs in `npm run build` via `prebuild`).

## Integrations

- **Mollie** (`@mollie/api-client`): client payment profiles, subscriptions, mandates, reconciliation.
- **Email**: IMAP/SMTP via `imapflow`/`nodemailer`/`mailparser`. Separate model in `email.prisma`.
- **2FA email**: Sent via nodemailer directly using SMTP creds from `EmailAccount` whose `username` matches `TWO_FACTOR_SENDER_EMAIL` env — does not go through `service.EmailSmtp` and does not create a message in the Email module.

## Security Context

- Cookie sessions + CSRF double-submit
- Argon2id password hashing
- 2FA email flow on login
- Endpoint-specific rate limiting
- Security audit event log
- See `docs/roadmap/AUTH_SECURITY_ROADMAP.md` for planned security hardening.

## Infrastructure Context

- Production: single Docker Compose stack on VPS.
- Full topology in `docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md`.
- `docker-compose.yml` (MySQL + Redis, shared), `docker-compose.dev.yml`, `docker-compose.prod.yml`.
- Container names driven by env values (`DB_CONTAINER_NAME`, etc.).
- Deploy is manual (`npm run deploy` from repo root), not GitHub Actions.
- GitHub Actions: CI only (`ci.yml`: `client-checks`/`server-checks`/`docs-links`/`skylos-check`).
- `skylos-check` is informational (Phase A), not a required status check.

## Important Existing Decisions

- Only one supported production deploy path: Docker Compose. No PM2, no other Docker stacks.
- No parallel production deploy paths.
- Graphify and docs generation are dev-only — not wired into production deploy.
- GitHub ruleset blocking direct pushes to `main` is planned but not yet created (as of CI/CD rebuild).
- Old `deploy.yml` (PM2, frontend only, broken) has been deleted.
- ADRs recorded in `docs/adr/` (gitignored, local only): branch protection rationale, manual deploy rationale.

## Related Documentation

- [README.md](README.md) — setup, commands, project overview
- [AGENTS.md](AGENTS.md) — agent operating contract
- [Docker Production Deployment](docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md)
- [Graphify Workflow](docs/spec/GRAPHIFY_WORKFLOW.md)
- [Schema docs](docs/schema.md)
- [Auth / Security Roadmap](docs/roadmap/AUTH_SECURITY_ROADMAP.md)
- [Invoices Roadmap](docs/roadmap/INVOICES_MODULE_ROADMAP.md)
- [Organizations and Brands Roadmap](docs/roadmap/ORGANIZATIONS_AND_BRANDS_ROADMAP.md)

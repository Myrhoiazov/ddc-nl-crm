# Agent Instructions for DDC CRM

This file is the top-level operating guide for AI agents working in this repository. Keep it current with the codebase and prefer links to deeper docs over duplicating volatile details.

## Project

DDC CRM is a TypeScript monorepo for the Talent Center DDC administration platform: clients/students, dance groups, schedule, choreographers, branches, invoices, Mollie payments, email workflows, users, roles, and settings.

Primary structure:

- `client/` - React 19 admin SPA, Redux Toolkit, webpack, Jest, Storybook, SCSS Modules.
- `server/` - Express 5 API, Prisma 6, MySQL, Redis-assisted rate limiting, Node test runner.
- `docker/` - production and development Dockerfiles.
- `deploy/` - host nginx templates and deployment support.
- `docs/` - active product, infrastructure, security, roadmap, and Graphify documentation.
- `docs/adr/` - architecture decision records (gitignored, local only — not published to the repo).
- `.agents/` - local agent profiles and skills for this repository.
- `graphify-out/`, `client/src/graphify-out/`, `server/src/graphify-out/` - generated local Graphify cache/output; do not commit.

The root `package.json` only orchestrates repository-level commands. Install dependencies separately in `client/` and `server/` when working without Docker.

## First Steps

1. Run `git status --short --branch` before edits and identify user changes.
2. Create a task branch before changing code, docs, or config. Use `feat/`, `fix/`, `refactor/`, or `chore/`.
3. Read the smallest relevant context:
   - `README.md` for setup, deploy entry points, and operational notes.
   - `CONTEXT.md` for current domain language, architecture notes, and project-specific implementation details.
   - `docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md` for production topology and deploy contract.
   - `docs/spec/GRAPHIFY_WORKFLOW.md` before changing Graphify tooling or generated docs.
   - Relevant roadmaps in `docs/roadmap/` before changing auth/security, invoices, organizations, brands, or payment reminders.
4. Keep unrelated user changes intact. Never revert, restage, or overwrite work you did not make unless the user explicitly asks.

Use `/opt/homebrew/bin/dnote` with `-c` for durable planning notes when a task needs a written plan or scratchpad. Tiny one-file fixes do not need a separate note.

## Commands

Root:

```bash
npm start
npm run deploy
npm run deploy:docker
npm run graphify:specs
npm run ci             # mirrors CI: client lint/test/build + server build/test + docs-links
npm run docs:links     # just the markdown link check
npm run check:skylos   # Skylos audit (dead code/security/secrets/quality/SCA); informational, not part of `ci`
```

Client, from `client/`:

```bash
npm start
npm run build:prod
npm run lint:ts
npm run lint:scss
npm test
npm run storybook
```

Server, from `server/`:

```bash
npm start
npm run build
npm run prisma:generate
npm run pmd:dev
npm run migrate:prod
npm run test:auth
npm run test:mollie
npm run test:search
npm run test:email
npm run test:payment-reminders
```

There is no single server-wide test command. Run the domain script that matches the changed area, or invoke one file directly:

```bash
node --test -r ts-node/register src/services/service.Password.test.ts
```

## Client Architecture

`client/src` follows Feature-Sliced Design:

```text
app -> pages -> widgets -> features -> entities -> shared
```

Slices import only through their public API (`index.ts`) or from lower layers. The `@/` alias points to `client/src/`. The project enforces FSD path rules through `eslint-plugin-denys-fix-fsd-path-plugin`; do not import into another slice's internals.

Most feature/page state is mounted lazily with `DynamicModuleLoader`; always check the owning page or feature before adding reducers. API access goes through `@/shared/api/api.ts`: use `$api` for unauthenticated calls and `$apiPrivate` for cookie-session calls that need CSRF handling.

UI text should use i18next where practical. New React components should be functional components, usually wrapped with `memo()` following existing local patterns.

## Client Styling

Use SCSS Modules (`*.module.scss`) beside the component. Global styles belong under `client/src/app/styles`.

Follow `.claude/rules/code-style.md` for current UI conventions. In particular:

- Use theme tokens, not raw colors, for text, backgrounds, borders, and statuses.
- Prefer the `*-redesigned` token family.
- Keep dark theme behavior real; check it after visual changes.
- Do not mass-reorder legacy SCSS only to satisfy stylelint. Keep new edits consistent with the documented order.

## Server Architecture

The Express API is layered:

```text
routes/router.X.ts -> controllers/controller.X.ts -> services/service.X.ts
```

Validation lives in `server/src/schemas/` and is applied through validation middleware. Authentication uses cookie sessions, CSRF double-submit protection, Argon2id password hashing, 2FA email flow, and endpoint-specific rate limiting. Redis is used when `REDIS_URL` is present; otherwise rate limiting falls back to in-memory process-local state.

Prisma schema files live in `server/prisma/schema/*.prisma`, with `schema.prisma` containing datasource/generator and shared models. After editing any Prisma schema file, run:

```bash
cd server
npm run prisma:generate
```

Also keep `docs/schema.md` and Graphify outputs in sync when schema or architecture changes are significant.

## Infrastructure And Deploy

Production has one supported deploy path: Docker Compose via `npm run deploy` from the repository root. `npm run deploy:docker` is an alias. Deploy is manual, run by the repo owner from their own machine — GitHub Actions only runs CI (`ci.yml`: `client-checks`/`server-checks`/`docs-links`/`skylos-check`), it does not deploy. `skylos-check` (Skylos static analysis) is currently informational only (Phase A, see `docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md`) and is intentionally not part of `npm run ci` — run `npm run check:skylos` separately if you want to mirror it locally.

Do not add parallel production deploy paths. Do not wire Graphify or documentation generation into production deploy. Keep container names and ports driven by env values rather than hardcoded compose values.

Secrets stay in `.env` files or production host configuration. Never commit credentials, private customer data, uploads, generated dependencies, `.DS_Store`, or `node_modules/`.

## Documentation And Graphify

Update documentation when behavior, architecture, deployment, schema, or public workflow changes. Prefer existing docs under `docs/spec/`, `docs/roadmap/`, and `docs/security/`. Record hard-to-reverse architectural or process decisions (branching model, deploy strategy, tooling choices with real trade-offs) as ADRs in `docs/adr/` — gitignored, local only, numbered sequentially (`0001-slug.md`, ...).

Run `npm run graphify:specs` after significant structural changes such as new modules, import graph changes, Prisma domain changes, or major feature moves. The command refreshes the tracked HTML trees under `docs/spec/` and regenerates local ignored Graphify output.

## Local Agents And Skills

The Dev Loop (`.agents/`) is the end-to-end delivery workflow for this React/Express/Prisma stack. Agent assets live under `.agents/`:

- `.agents/agents/dev-loop.md` (and an opencode copy at `.opencode/agents/dev-loop.md`) - coordinator profile for end-to-end delivery.
- `.agents/skills/agent-loop/` - delivery loop: intake, planning, TDD implementation, checks, review, browser QA, PR.
- `.agents/skills/planning-and-task-breakdown/` - creates task plans for multi-file or risky client/server work.
- `.agents/skills/tdd/` - test-first implementation guidance (Jest for client, Node test runner for server).
- `.agents/skills/code-review/` - standards/spec review before publishing, default diff base `develop`.
- `.agents/skills/e2e-test/` and `.agents/skills/manual-automation/` - browser QA for the React SPA.
- `.agents/skills/pull-request/` - branch, commit, push, and PR publishing into `develop`.
- `.agents/skills/qa/` - interactive bug triage and issue filing.

These skills target the current DDC CRM stack and are the source of truth for the delivery loop; `AGENTS.md`, `CONTEXT.md`, and `README.md` take precedence wherever they disagree.

Use the Dev Loop profile when the user asks for autonomous end-to-end work. The completion bar is: scoped request, branch created, implementation complete, relevant client/server checks run incl. `npm run ci`, review completed, browser QA run when UI changed, and PR prepared or published into `develop` when requested.

## Git And Pull Requests

Branching model: `feature/*`/`fix/*` branch off `develop`, PR into `develop`; a Release PR then merges `develop → main`. `hotfix/*` branches off `main` for production emergencies, still via PR, then gets back-merged into `develop`. Direct pushes to `main` are meant to be blocked by a GitHub ruleset with **no bypass** — not for the repo owner, not for hotfixes — applying to every change regardless of size, including one-line `chore:` edits. PR merge requires a green CI run; 0 approvals are required (solo project, self-merge is expected). Squash-merge `feature/*`/`fix/*` into `develop`; use a merge commit for the Release PR into `main`. Rationale and the branch-protection specifics are in `docs/adr/0001-develop-main-branch-protection-no-bypass.md` (gitignored — local only, not published; see git history/PRs if the file isn't present).

**Ruleset status:** as of the CI/CD rebuild (`ci.yml` now implements `client-checks`/`server-checks`/`docs-links` and is green), the GitHub ruleset itself has not been created yet — nothing at the GitHub level currently blocks a direct push to `main`. Follow the branching model above regardless; enabling the ruleset is the next planned step, not yet done. Don't assume it's enforced until this note is removed/updated.

Run `npm run ci` from the repo root before pushing — it mirrors the GitHub Actions `client-checks`/`server-checks`/`docs-links` jobs so failures surface locally instead of after push.

Use standard `git` and `gh` commands. Commit messages must use Conventional Commits:

- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `chore: ...`

Before committing:

1. Inspect `git status --short --branch`, `git diff`, and staged changes.
2. Stage only intended files.
3. Run the relevant checks for changed areas.
4. Scan staged files for secrets, private media/uploads, ignored outputs, and unrelated changes.

Do not add AI attribution trailers such as `Co-authored-by`, `Generated-by`, or similar metadata unless the user explicitly asks.

Production deploy stays manual (`npm run deploy`, run by the owner from their own machine) — GitHub Actions does not deploy. See `docs/adr/0002-manual-production-deploy-retire-github-actions-deploy.md` (also gitignored) for why.

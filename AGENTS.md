# Agent Instructions for DDC CRM

This file is the operating contract for AI agents in this repository. Keep it current with the codebase and prefer links to deeper docs over duplicating volatile details.

## Purpose

DDC CRM is a TypeScript monorepo — React 19 admin SPA (`client/`) + Express 5 API (`server/`) + Prisma 6 (MySQL). See [README.md](README.md) for project overview and [CONTEXT.md](CONTEXT.md) for domain knowledge.

## Sources of Truth

| Type | Location |
|---|---|
| Agent operating rules | **AGENTS.md** (this file) |
| Human setup / project entry | README.md |
| Project / domain knowledge | CONTEXT.md |
| Feature / system contract | docs/spec/* |
| Planned module evolution | docs/roadmap/* (gitignored, local only) |
| Architectural decisions | docs/adr/* (gitignored, local only) |
| Execution procedure | .agents/skills/*/SKILL.md |
| End-to-end coordination | .agents/agents/dev-loop.md |

## Mandatory Rules

1. Run `git status --short --branch` before edits and identify user changes.
2. Create a task branch before changing code, docs, or config. Use `feat/`, `fix/`, `refactor/`, or `chore/`.
3. Read the smallest relevant context required to complete the task safely and correctly.
4. Keep unrelated user changes intact. Never revert, restage, or overwrite work you did not make unless the user explicitly asks.
5. Follow existing architecture and code conventions (see CONTEXT.md for details).
6. Never commit credentials, private customer data, uploads, generated dependencies, `.DS_Store`, or `node_modules/`.
7. Do not add AI attribution trailers (`Co-authored-by`, `Generated-by`, or similar) to commits unless the user explicitly asks.
8. Run relevant checks for changed areas before committing.
9. Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`.

## Context Loading

Do not read all documentation automatically. Classify the task first, then load only what is relevant:

```
Task
 ↓
Read AGENTS.md
 ↓
Inspect repository state
 ↓
Classify task
 ↓
Load only relevant context
 ↓
Inspect relevant code
 ↓
Implement
 ↓
Validate
```

### Task Routing

| Task Type | Read |
|---|---|
| Setup / environment | README.md |
| Domain terminology / project-specific behavior | CONTEXT.md |
| Docker / production deployment | docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md |
| Graphify changes | docs/spec/GRAPHIFY_WORKFLOW.md |
| Auth / security changes | docs/roadmap/AUTH_SECURITY_ROADMAP.md (gitignored, local only) |
| Invoice changes | docs/roadmap/INVOICES_MODULE_ROADMAP.md (gitignored, local only) |
| Organizations / brands | docs/roadmap/ORGANIZATIONS_AND_BRANDS_ROADMAP.md (gitignored, local only) |
| Payment reminders | relevant roadmap in docs/roadmap/ (gitignored, local only) |
| Large / risky task | .agents/skills/planning-and-task-breakdown/ |
| Test-first implementation | .agents/skills/tdd/ |
| Finished implementation review | .agents/skills/code-review/ |
| UI / browser changes | .agents/skills/e2e-test/ or .agents/skills/manual-automation/ |
| Bug investigation | .agents/skills/qa/ |
| PR publishing | .agents/skills/pull-request/ |

## Conditional Rules

### Always
- Run `npm run ci` from root before pushing — mirrors CI checks.
- Use `/usr/local/bin/dnote` with `-c` for durable planning notes when a task needs a written plan.

### When Client Changes
- Run `npm run lint:ts` and `npm test` from `client/`.
- Check `.claude/rules/code-style.md` for UI conventions.
- Use SCSS Modules (`*.module.scss`). Use theme tokens, not raw colors. Check dark theme.

### When Server Changes
- Run relevant test command from `server/` (`npm run test:auth`, `npm run test:mollie`, etc.).
- After editing Prisma schema: `cd server && npm run prisma:generate`.
- Keep `docs/schema.md` in sync when schema changes significantly.

### When Infrastructure / Deploy Changes
- Only one supported deploy path: Docker Compose via `npm run deploy`.
- Do not wire Graphify or docs generation into production deploy.
- Container names and ports driven by env values, not hardcoded compose values.

### When Documentation Changes
- Prefer existing docs under `docs/spec/` (committed). `docs/roadmap/`, `docs/security/`, `docs/adr/` are gitignored local-only planning/security docs and must not be referenced from committed files.
- Record hard-to-reverse decisions as ADRs in `docs/adr/` (gitignored, local only, numbered sequentially).
- Run `npm run graphify:specs` after significant structural changes.

## Git and Pull Requests

- `feature/*`/`fix/*` branch off `develop`, PR into `develop`.
- Release PR merges `develop → main` (merge commit).
- `hotfix/*` branches off `main`, PR into `main`, back-merge into `develop`.
- Direct pushes to `main` are not part of the normal workflow.
- Squash-merge `feature/*`/`fix/*` into `develop`; merge commit for Release PR into `main`.
- PR merge requires green CI; 0 approvals required (solo project, self-merge expected).
- Before committing: inspect `git diff` and staged changes, stage only intended files, scan for secrets.

## Agents and Skills

The Dev Loop (`.agents/agents/dev-loop.md`) is the end-to-end delivery profile. Skills are loaded on demand per task routing above. Available skills:

- `.agents/skills/agent-loop/` — delivery loop: intake, planning, TDD, checks, review, browser QA, PR
- `.agents/skills/planning-and-task-breakdown/` — task plans for multi-file or risky work
- `.agents/skills/tdd/` — test-first implementation (Jest client, Node test runner server)
- `.agents/skills/code-review/` — standards/spec review before publishing
- `.agents/skills/e2e-test/` and `.agents/skills/manual-automation/` — browser QA
- `.agents/skills/pull-request/` — branch, commit, push, PR into `develop`
- `.agents/skills/qa/` — interactive bug triage and issue filing

## Definition of Done

- Right instruction + Right context + Right skill + Right time
- Relevant checks pass (client: `npm run lint:ts`, `npm test`; server: domain test command; root: `npm run ci`)
- No secrets committed, no unrelated changes, no AI attribution trailers
- Branch created, implementation complete, review done, browser QA run when UI changed
- PR prepared or published into `develop` when requested

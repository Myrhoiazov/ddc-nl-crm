# Implementation Plan: Health Module Migration

## Overview
Move the existing Health API surface from layer-first files into `server/src/modules/health/` without changing `GET /api/v1/health` behavior.

## Relevant Context
- Reference module: `server/src/modules/comments/` colocates route, controller, and tests where useful.
- Current Health dependency map: `routes/index.ts` -> `routes/router.Health.ts` -> `controllers/controller.Health.ts` -> fixed JSON response.
- Health has no Prisma usage, schemas, DTOs, frontend consumers, or external integrations.
- Baseline: `node --test -r ts-node/register src/routes/router.Health.test.ts` passed when run with local port permissions.

## Task List
- [x] Task 1: Move Health route/controller/test into `server/src/modules/health/`.
- [x] Task 2: Verify Health contract and module boundary.

## Verification Plan
- [x] Health test: `node --test -r ts-node/register src/modules/health/health.routes.test.ts`
- [x] Server build: `npm run build`
- [x] Server CI: `npm run test:ci`
- [x] Root CI: `npm run ci`
- [x] Diff review: `git diff --stat` and `git diff`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Health endpoint path changes | High | Only update import path; keep `router.use('/health', healthRouter)` and `router.get('/')`. |
| Test requires binding a local port | Low | Run with permission when sandbox blocks `listen`. |
| Over-engineering DTO/projection | Low | Do not add DTO, mapper, service, repository, or select files; endpoint returns a constant response. |

## Open Questions
- None

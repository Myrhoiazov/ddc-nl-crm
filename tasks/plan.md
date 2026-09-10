# Implementation Plan: Skylos Findings Fix

## Overview

Fix findings from `npm run check:skylos` (Grade D, 66/100). Security issues first,
then quality/dead code. All changes in a single `fix/skylos-findings` branch off
`develop`, one commit per SKY-code group, squash-merged PR into `develop`.

## Ordering Rationale

Security (SKY-D*) first — real vulnerabilities. Then type safety / quality (SKY-T,
SKY-Q, SKY-L) in production code. Dead code (SKY-U/SKY-E) last — mostly test/config
files kept intentionally.

## Task List

- [ ] Task 1: SKY-D252 — Add `secure: true` to cookie options (controller.Auth.ts + conteroller.Mollie.ts)
- [ ] Task 2: SKY-D253 — Replace `===` with `crypto.timingSafeEqual` (changePasswordThunk.ts + reset-user-password.ts)
- [ ] Task 3: SKY-D248 — Move hardcoded URLs to env vars (7 files)
- [ ] Task 4: SKY-D327 — Fix data exfiltration (conteroller.Mollie.ts:364 + deploy-docker.sh:66)
- [ ] Task 5: SKY-D216 — Add allowlist URL validation (conteroller.Mollie.ts:3080)
- [ ] Task 6: SKY-D230 — Validate redirect targets (conteroller.Mollie.ts:351,411)
- [ ] Task 7: SKY-S101 — Review high-entropy value (controller.Clients.ts:333)
- [ ] Task 8: SKY-T105 — Add runtime validation for JSON.parse (controller.Invoices.ts:286)
- [ ] Task 9: SKY-L007 — Handle / document empty catch (webpack.config.ts:9)
- [ ] Task 10: SKY-Q402 — Parallelize await-in-loop in production services (MollieSync.ts, Invoices.ts, EmailImap.ts, InvoiceDelivery.ts, PaymentReminders.ts, seed.ts)
- [ ] Task 11: SKY-U001/U003/U004/E003 — Clean production dead code only (leave test/config/stories)

## Verification Plan

- [ ] `npm run check:skylos` after each task — verify the specific SKY-code findings drop to 0
- [ ] Server: `npm run build` after each server-side change
- [ ] Client: `npm run lint:ts` + `npm test` after each client-side change
- [ ] Root: `npm run ci` before PR
- [ ] Browser QA: spot-check affected pages (Mollie, Auth, Invoices, Clients, Schedule)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `crypto.timingSafeEqual` throws on different-length inputs | Med | Normalize lengths or compare hashes before constant-time compare |
| Env vars not defined in all environments | High | Add defaults / optional chaining — don't break dev setup |
| `Promise.all` in loops changes error-handling semantics | Med | Wrap in `Promise.allSettled` where individual failures are acceptable |
| Cookie `secure: true` breaks local dev over HTTP | Med | Check `NODE_ENV` before setting `secure` |

## Files Likely Touched

- `server/src/controllers/controller.Auth.ts`
- `server/src/controllers/conteroller.Mollie.ts`
- `server/src/controllers/controller.Clients.ts`
- `server/src/controllers/controller.Invoices.ts`
- `server/src/services/service.MollieSync.ts`
- `server/src/services/service.EmailImap.ts`
- `server/src/services/service.InvoiceDelivery.ts`
- `server/src/services/service.PaymentReminders.ts`
- `server/src/middlewares/middleware.Csrf.ts`
- `server/src/app.ts`
- `server/scripts/reset-user-password.ts`
- `client/src/features/changePassword/model/services/changePasswordThunk.ts`
- `client/webpack.config.ts`
- `scripts/deploy-docker.sh`

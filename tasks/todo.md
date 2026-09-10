# Todo: Skylos Findings Fix

**Grade: D (66/100)** — Phase A (informational, non-blocking)

## Security (High Priority)

- [ ] Task 1: SKY-D252 — Add `secure: true` to cookie options
  - `server/src/controllers/controller.Auth.ts` (lines 116, 175, 252, 390)
  - `server/src/controllers/conteroller.Mollie.ts` (line 343)
- [ ] Task 2: SKY-D253 — Use `crypto.timingSafeEqual` for password comparison
  - `client/src/features/changePassword/model/services/changePasswordThunk.ts:23`
  - `server/scripts/reset-user-password.ts:66`
- [ ] Task 3: SKY-D248 — Replace hardcoded URLs with env vars
  - `client/webpack.config.ts:31`
  - `server/src/app.ts:27`
  - `server/src/controllers/conteroller.Mollie.ts:410`
  - `server/src/middlewares/middleware.Csrf.ts:11`
  - `server/src/services/service.Files.ts:7`
  - `server/src/services/service.InvoiceDelivery.ts:43`
  - `server/src/services/service.PaymentReminders.ts:11`
- [ ] Task 4: SKY-D327 — Fix potential data exfiltration
  - `server/src/controllers/conteroller.Mollie.ts:364`
  - `scripts/deploy-docker.sh:66`
- [ ] Task 5: SKY-D216 — Validate URL against allowlist (SSRF prevention)
  - `server/src/controllers/conteroller.Mollie.ts:3080`
- [ ] Task 6: SKY-D230 — Validate redirect targets
  - `server/src/controllers/conteroller.Mollie.ts:351,411`
- [ ] Task 7: SKY-S101 — Verify high-entropy value is not a secret
  - `server/src/controllers/controller.Clients.ts:333`

## Quality / Type Safety (Medium Priority)

- [ ] Task 8: SKY-T105 — Add runtime validation for `JSON.parse`
  - `server/src/controllers/controller.Invoices.ts:286`
- [ ] Task 9: SKY-L007 — Handle or document empty catch block
  - `client/webpack.config.ts:9`
- [ ] Task 10: SKY-Q402 — Parallelize `await` in loops with `Promise.all`
  - `server/src/services/service.MollieSync.ts` (7 locations)
  - `server/src/controllers/controller.Invoices.ts` (lines 879, 880)
  - `server/src/services/service.EmailImap.ts:222`
  - `server/src/services/service.InvoiceDelivery.ts:272`
  - `server/src/services/service.PaymentReminders.ts:298`
  - `server/prisma/seed.ts:35`

## Dead Code (Low Priority — leave test/config/stories)

- [ ] Task 11: Clean production dead code only
  - SKY-U001: `client/config/jest/__mocks__/react-i18next.ts`, `jestEnptyComponent.tsx`, `setupTests.ts`
  - SKY-U003: `server/src/services/service.Files.ts:6` (isDev)
  - SKY-U004: `client/src/app/providers/ErrorBoundary/ui/ErrorBoundary.tsx`
  - SKY-E003: `server/prisma.config.ts`, `server/prisma/seed.ts`, `client/webpack.config.ts`, `client/stylelint.config.mjs`

## Final

- [ ] `npm run check:skylos` — confirm grade improvement
- [ ] Server: `npm run build` + relevant domain tests
- [ ] Client: `npm run lint:ts` + `npm test`
- [ ] Root: `npm run ci`
- [ ] Browser QA for changed pages
- [ ] PR into `develop`

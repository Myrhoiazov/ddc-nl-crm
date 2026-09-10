# Implementation Plan: Brute-force & Automated Attack Protection

## Overview

Implements the remaining unchecked items in the "Защита от перебора и
автоматических атак" section of `docs/roadmap/AUTH_SECURITY_ROADMAP.md`:
CAPTCHA after a threshold of failed login attempts (Cloudflare Turnstile),
Telegram notifications on suspicious login activity, and an offline
common-password blocklist for new/changed passwords.

The roadmap's fourth item in that section — "log failed logins without
storing the password" — was verified against the running code before writing
this plan and is **already satisfied**: `LOGIN_FAILED` audit metadata is
`{ email, reason }` only, and `service.AuthSecurityAudit.ts` additionally
redacts any metadata key matching `/(password|token|secret|cookie|
authorization|csrf|session)/i` regardless of what's passed. No task needed;
Task 5 below just corrects the roadmap.

## Relevant Context

- **Login rate limiting**: `middleware.LoginRateLimit.ts` + `service.RateLimit.ts`
  (Redis-backed, in-memory fallback). `WINDOW_MS = 15min`, `MAX_ATTEMPTS = 5`
  (blocks at `count > 5`). `hitRateLimit()` returns `{ count, limited, store }`
  — CAPTCHA will key off `count` before the hard block fires.
- **Telegram notifications**: `service.Telegram.ts` (`sendTelegramMessage`,
  `isTelegramConfigured`) — currently used only for Mollie payment events.
  Reuse the same fire-and-forget, feature-flagged pattern for auth alerts.
- **Password validation**: `service.Password.ts` (`isPasswordAllowed`), called
  from `controller.Users.ts` (admin create/reset) and `controller.Profiles.ts`
  (self-service change) — single choke point for the new blocklist check.
- **Auth audit**: `service.AuthSecurityAudit.ts` / `AuthSecurityEventType`
  (Prisma enum). `LOGIN_BLOCKED` already fires once per rate-limit window from
  `middleware.LoginRateLimit.ts` — natural hook for the notification, already
  self-throttled.
- **Env var convention**: flat `UPPER_SNAKE_CASE` in `.env.example`
  (`TELEGRAM_TOKEN`, `TWO_FACTOR_SENDER_EMAIL`, `REDIS_URL`); docker-compose
  files enumerate each var explicitly under `environment:` (no blanket
  `env_file` passthrough) — new vars need adding to `docker-compose.yml`,
  `docker-compose.dev.yml`, `docker-compose.prod.yml` too.
- **Client Auth feature**: `client/src/features/Auth/ui/LoginForm/*`,
  `useLoginForm.ts`, `loginByUsername` thunk — FSD feature slice.
- Turnstile site keys are meant to be public (embedded in page HTML) — the
  server can hand the site key to the client in the `CAPTCHA_REQUIRED`
  response body itself, avoiding any new client build-time env wiring.

## Decisions (confirmed with user)

- CAPTCHA provider: **Cloudflare Turnstile**.
- Password check: **offline common-password blocklist only** (no
  HaveIBeenPwned/external call).

## Task List

- [ ] Task 1: Offline common-password blocklist
- [ ] Task 2: Server-side CAPTCHA verification (Turnstile) + login gating
- [ ] Task 3: Client CAPTCHA widget in LoginForm
- [ ] Task 4: Suspicious-login Telegram notifications
- [ ] Task 5: Update `AUTH_SECURITY_ROADMAP.md`

## Task 1: Offline common-password blocklist

**Description:** Reject new/changed passwords that match a curated list of
common/leaked passwords, independent of the existing length check.

**Acceptance criteria:**
- [ ] `isCommonPassword(password)` in `service.Password.ts` checks
  case-insensitively against a bundled list (~10k entries, curated top
  common/leaked passwords, ~100-150KB, loaded once as a `Set` at module load).
- [ ] `isPasswordAllowed` callers get a way to distinguish "too common" from
  "wrong length" in the error response (distinct message/code).
- [ ] `controller.Users.ts` (create/reset) and `controller.Profiles.ts`
  (self change) both return a 400 with the common-password reason when hit.
- [ ] Unit tests: known common password rejected, random/unique password
  allowed, case-insensitivity, boundary (list membership exact match only,
  no fuzzy matching).

**Verification:**
- [ ] Server: `npm run build` and `npm run test:auth`

**Dependencies:** None

**Files likely touched:**
- `server/src/services/service.Password.ts`
- `server/src/services/service.Password.test.ts`
- `server/src/data/common-passwords.txt` (new)
- `server/src/controllers/controller.Users.ts`
- `server/src/controllers/controller.Profiles.ts`

**Estimated scope:** S

## Task 2: Server-side CAPTCHA verification (Turnstile) + login gating

**Description:** Add Turnstile server-side verification and require it once a
login key (IP + email) crosses a failure threshold below the existing hard
rate-limit block, without disturbing the current rate-limit/progressive-delay
behavior when Turnstile isn't configured.

**Acceptance criteria:**
- [ ] `service.Captcha.ts`: `isCaptchaConfigured()`, `verifyCaptchaToken(token,
  remoteIp)` calling Cloudflare's `siteverify` endpoint.
- [ ] In `middleware.LoginRateLimit.ts`: once `result.count > CAPTCHA_THRESHOLD`
  (e.g. 3, strictly before the `> 5` hard block) **and** `isCaptchaConfigured()`,
  a missing/invalid `req.body.captchaToken` short-circuits with 400 and a
  machine-readable body (`{ code: 'CAPTCHA_REQUIRED', siteKey }` or
  `{ code: 'CAPTCHA_INVALID', siteKey }`), distinct from the generic
  401 auth-failure shape.
- [ ] A valid captcha does not itself authenticate — password check still
  runs after.
- [ ] Feature is fully inert (today's behavior unchanged) when
  `TURNSTILE_SECRET_KEY`/`TURNSTILE_SITE_KEY` are unset.
- [ ] `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` added to `.env.example` and
  to the `environment:` blocks of all three `docker-compose*.yml` files.
- [ ] Unit tests: `verifyCaptchaToken` success/failure/network-error (mock
  `axios`), `isCaptchaConfigured` true/false.

**Verification:**
- [ ] Server: `npm run build` and `npm run test:auth`

**Dependencies:** None

**Files likely touched:**
- `server/src/services/service.Captcha.ts` (new)
- `server/src/services/service.Captcha.test.ts` (new)
- `server/src/middlewares/middleware.LoginRateLimit.ts`
- `.env.example`
- `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.prod.yml`

**Estimated scope:** M

## Task 3: Client CAPTCHA widget in LoginForm

**Description:** Render the Turnstile widget once the server signals
`CAPTCHA_REQUIRED`, and attach the resulting token to the next login attempt.

**Acceptance criteria:**
- [ ] `loginByUsername` thunk accepts an optional `captchaToken` and forwards
  it in the request body.
- [ ] `LoginForm` renders the Turnstile widget only after a login response
  carries `code: 'CAPTCHA_REQUIRED'`/`CAPTCHA_INVALID` — the Turnstile script
  is not loaded on a normal page visit.
- [ ] Widget uses the `siteKey` returned by the server response (no hardcoded
  key, no new client build-time env var).
- [ ] User-facing captcha copy goes through `t()` (i18next), per code-style
  rule.
- [ ] Jest test: widget appears after `CAPTCHA_REQUIRED`, token is included on
  the retried submit.

**Verification:**
- [ ] Client: `npm run lint:ts` and `npm test`
- [ ] Browser QA: trigger repeated failed logins locally (Cloudflare provides
  fixed test site/secret keys with deterministic pass/fail for local dev —
  use those, not a real key, in `.env`), confirm widget appears at the right
  attempt count, confirm login succeeds after solving. Check both themes.

**Dependencies:** Task 2

**Files likely touched:**
- `client/src/features/Auth/ui/LoginForm/LoginForm.tsx`
- `client/src/features/Auth/ui/LoginForm/useLoginForm.ts`
- `client/src/features/Auth/model/services/loginByUsername/loginByUsername.ts`
- `client/src/features/Auth/model/slice/authSlice.ts`
- new test file(s) beside the above

**Estimated scope:** M

## Task 4: Suspicious-login Telegram notifications

**Description:** Send a Telegram alert (reusing `service.Telegram.ts`) when a
login shows attack signs: a rate-limit block, or a successful login from an
untrusted device immediately following recent failures on that account.

**Acceptance criteria:**
- [ ] New notification builder/sender (in `service.Telegram.ts` or a new
  `service.AuthNotifications.ts`) for two triggers:
  - `LOGIN_BLOCKED` (rate limit tripped) — fired from
    `middleware.LoginRateLimit.ts`, piggybacking on the same event that's
    already throttled to once per 15-minute window per key.
  - Successful login without a trusted-device cookie, checked at the point
    `hasTrustedDevice` is already computed in `controller.Auth.ts` — no new
    query — combined with ≥1 recent `LOGIN_FAILED` for that account in the
    current window (avoids alerting on every normal first-time device login).
- [ ] Telegram send failures/unconfigured state never block or delay the
  actual HTTP response — same fire-and-forget + `isTelegramConfigured()`
  guard as `notifyMolliePayment`.
- [ ] Unit tests: message content built correctly for both triggers;
  `isTelegramConfigured() === false` → no network call attempted (mock
  `axios`, assert not called).

**Verification:**
- [ ] Server: `npm run build` and `npm run test:auth`

**Dependencies:** None (independent of Tasks 1–3)

**Files likely touched:**
- `server/src/services/service.Telegram.ts`
- `server/src/middlewares/middleware.LoginRateLimit.ts`
- `server/src/controllers/controller.Auth.ts`
- matching `*.test.ts` files

**Estimated scope:** S

## Task 5: Update `AUTH_SECURITY_ROADMAP.md`

**Description:** Remove the "Защита от перебора и автоматических атак"
section's checklist once Tasks 1–4 are verified, matching what's actually in
the code (same convention as the rest of this trimmed roadmap file).

**Acceptance criteria:**
- [ ] Section removed/updated once shipped and merged.

**Verification:** N/A (docs only, gitignored file)

**Dependencies:** Tasks 1–4

**Files likely touched:**
- `docs/roadmap/AUTH_SECURITY_ROADMAP.md`

**Estimated scope:** XS

## Verification Plan

- [ ] `npm run ci` from root
- [ ] Server: `npm run test:auth` (from `server/`)
- [ ] Client: `npm run lint:ts` and `npm test` (from `client/`)
- [ ] Browser QA: login page — normal login unaffected; after N failed
  attempts CAPTCHA widget appears; wrong/missing captcha rejected; correct
  captcha + correct password logs in; check both light/dark themes
- [ ] Code review pass on the diff before PR

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Turnstile misconfigured or down → could block all logins if made mandatory | High | Fully feature-flagged behind `isCaptchaConfigured()`, same pattern as `isTelegramConfigured()` — absent config means today's behavior (rate limit only), not a hard failure |
| CAPTCHA threshold fights the existing hard block at `count > 5` | Medium | Threshold set strictly below the block (`> 3`), verified against existing `MAX_ATTEMPTS = 5` semantics in `middleware.LoginRateLimit.ts` |
| Telegram notification spam on every single failed login | Medium | Only two triggers, both already-throttled or condition-gated — not every `LOGIN_FAILED` |
| Common-password blocklist false-positives a legitimate strong password that coincidentally matches an entry | Low | Exact case-insensitive match only against a curated list, no fuzzy/substring matching; documented in the rejection message |
| New env vars (`TURNSTILE_*`) missed in one of the three docker-compose files | Low | Explicit acceptance criterion in Task 2 checklist covering all three files |

## Open Questions

None — CAPTCHA provider and password-check approach were confirmed with the
user before writing this plan.

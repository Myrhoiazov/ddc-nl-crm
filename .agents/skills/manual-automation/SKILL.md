---
name: manual-automation
description: Manual browser automation for the DDC CRM React admin SPA. Use when you need to drive a live client by hand — reproduce a visual/UI bug, inspect navigation, log in and walk a page, or validate forms that have no automated coverage. Covers finding or safely starting the dev app, port conflicts, login (cookie session + CSRF, 2FA/Turnstile), browser tooling, assertions and cleanup. For QA of changed flows inside the delivery loop or the Playwright suite, use e2e-test instead.
---

# DDC CRM Manual Browser Automation

Use this skill for browser-driven checks against the DDC CRM React SPA when you need to inspect a live UI, reproduce a visual or interaction bug, or validate forms that lack automated coverage. It is intentionally conservative: reuse the app the user already runs, never stop processes you did not start, never expose secrets.

Not this skill: QA of changed user flows in the delivery loop and the Playwright suite (`npm run e2e`, `e2e/`) — see `.agents/skills/e2e-test/SKILL.md` and `docs/E2E_TESTING.md`.

## 1. Preparation

Read:

- `AGENTS.md`
- `CONTEXT.md` for domain terminology and page structure
- `README.md` ("Getting Started", "Project Scripts") for how the app runs

Ask the user for what you cannot discover yourself: the target URL if it is not local, and test credentials (see step 4).

Completion criterion: the goal of the check (pages, flows, bug to reproduce) is clear.

## 2. Find the Running App (Port Management)

Development ports (defaults from `.env.example`; the real values live in the user's `.env`, which you must not read):

| What | Docker dev stack | Non-Docker `npm start` |
|---|---|---|
| SPA (webpack-dev-server) | `FRONTEND_PORT`, default `3000` | `3000` (`client`: `webpack serve --env port=3000`) |
| API (Express, prefix `/api/v1`) | `BACKEND_PORT`, default `18080` → container `8080` | `PORT` from the server env (the client's dev fallback expects `http://localhost:8080`) |

The SPA calls the API directly at the build-time `CLIENT_API_URL` (no dev proxy); `GET <api>/api/v1/health` needs no auth or DB.

1. Probe first: `lsof -nP -iTCP:3000 -sTCP:LISTEN` and `curl -sI http://localhost:3000`.
2. If the SPA answers, **reuse it**. The user often runs the Docker dev stack on `:3000` (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up`); `docker ps` shows whether that is the case.
3. If the port is taken by something that is not a working DDC app, report the PID/command and ask. **Never kill, stop or restart a process or container you did not start** without explicit approval.
4. Port `13001` is reserved for the E2E client (`client: npm run start:e2e`) — do not use it for manual checks.

Completion criterion: a reachable base URL is known, or the conflict/blocker is reported.

## 3. Launch Only When Needed

Start the app only if nothing is running and the user agreed, or the task explicitly asks for it:

- Preferred: the user's Docker dev stack (command above) — ask before bringing it up, it touches their local DB/Redis containers.
- Non-Docker: `npm start` from the root (`scripts/start-development.js` runs `server` nodemon + `client` webpack-dev-server). Run it in the background, wait for readiness by polling the URL / health endpoint instead of fixed sleeps, and remember the PID — you own it and must stop it in cleanup.
- Never run `prisma migrate`, seeds, `docker compose down -v` or edit `.env` to make the app start; report the missing prerequisite instead.

Completion criterion: the app answers on the base URL, or the launch failure is reported with the relevant log lines.

## 4. Login Flow

The app uses cookie sessions with CSRF (the client fetches `/auth/csrf` and sends the token on mutating requests — you do not handle it by hand, just use the real UI).

1. Get test credentials from the user. Never invent, hardcode, guess or brute-force credentials, never read them from `.env`/DB, and never echo the password in output or reports.
2. Open `<base>/login`, fill "Электронная почта" and "Пароль" by their labels, submit.
3. 2FA: with `MODE=development` on the server the email code is skipped. Otherwise the form switches to the 2FA code step (code sent to the masked email) — ask the user for the code; do not read it from the DB or mail logs.
4. Turnstile captcha appears after repeated failed logins. Stop after one failed attempt, report the error message, and ask the user — do not retry in a loop or try to bypass the captcha.
5. Telegram login is an ADMIN-only external OIDC flow — do not automate it; ask the user to log in manually in the tab if it is required.
6. Verify success by the authenticated layout (sidebar/navigation) instead of the HTTP status alone.

Completion criterion: an authenticated session is confirmed, or the login blocker is reported.

## 5. Browser Tooling

Use what is available in this environment:

- **Claude in Chrome** (`mcp__claude-in-chrome__*`) and the `browser-automation` skill — the default. Start with `tabs_context_mcp`, open your own tab with `tabs_create_mcp`; drive pages with `navigate`, `find`, `form_input`, `computer`, read state with `read_page`/`get_page_text`, `read_console_messages`, `read_network_requests`; resize with `resize_window`.
- **Chrome DevTools MCP** — only if it is configured in the session (`navigate_page`, `fill`, `click`, `wait_for`, `take_snapshot`, `list_console_messages`, `list_network_requests`, `emulate`, `lighthouse_audit`).
- No browser tooling available → report that manual browser checks are blocked; fall back to `curl` only for reachability.

Prefer semantic targets (labels, roles, visible text) over CSS selectors; wait for elements/state instead of fixed sleeps.

Completion criterion: you can drive and inspect your own tab.

## 6. Navigation and Assertions

Exercise the changed or reported flow first. For layout work test at least desktop width and mobile width.

Check:

- Page title and main content load; the expected route mounts.
- Header/sidebar/navigation are present and links resolve.
- Redux-driven state reflects the expected data (dynamic module loaders mount, slices hydrate).
- Forms show expected validation using test data.
- Console has no new JavaScript errors.
- Network requests for changed interactions do not fail unexpectedly (watch `401`/`403` CSRF and session errors).
- Dark theme remains real when styling changed: toggle the theme switch (class `app_dark_theme` on `document.body`) and re-check.

Use screenshots only when visual evidence helps. Use DOM/state assertions for pass/fail checks. When an element never appears, capture a snapshot/screenshot and the console before reporting — a modal, error alert or loading state may be blocking it.

Completion criterion: the target pages and interactions have been exercised and checked.

## Safety

- Do not submit real customer data; use clearly fake test data and avoid destructive actions (delete, send email/invoice, Mollie operations) unless the user asked for them.
- Do not reveal DB credentials, `.env` values, passwords, 2FA codes, cookies or private URLs.
- Do not restart services, stop the user's processes/containers, or edit database content unless the user explicitly approves it.

## 7. Cleanup

- Close the tabs you opened. Leave the user's existing tabs, session and services alone.
- Stop only processes you started in step 3 (by the remembered PID) and confirm the port is free.
- Remove temporary files you created (screenshots outside the scratchpad, etc.).

## Report

Summarize:

- URL and pages tested; whether the app was reused or started by you.
- Viewports and themes tested.
- Interactions performed (no credentials or codes).
- Console/network issues.
- Any blockers or skipped checks (port conflict, login/2FA/captcha, missing tooling).

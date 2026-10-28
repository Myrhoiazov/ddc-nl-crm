---
name: manual-automation
description: Manual browser automation for the DDC CRM React admin SPA through the project's Chrome DevTools MCP server (`chrome-devtools`, configured in `.mcp.json`), with Claude in Chrome as the fallback. Use when you need to drive a live client by hand — reproduce a visual/UI bug, inspect navigation, log in and walk a page, check light/dark theme and viewports, read console/network errors, or validate forms that have no automated coverage. Covers finding or safely starting the dev app, port conflicts, login (cookie session + CSRF, 2FA/Turnstile), assertions, error handling and cleanup. For QA of changed flows inside the delivery loop or the Playwright suite, use e2e-test instead.
---

# DDC CRM Manual Browser Automation

Drive the DDC CRM React SPA in a real browser to inspect a live UI, reproduce a visual or interaction bug, or validate forms that lack automated coverage. The skill is deliberately conservative: reuse the app the user already runs, never stop processes you did not start, never expose secrets, and back every conclusion with a snapshot, screenshot, console or network evidence.

## Table of Contents

- [When to Use](#when-to-use)
- [Hard Rules](#hard-rules)
- [Workflow Overview](#workflow-overview)
- [1. Preparation](#1-preparation)
- [2. Find the Running App](#2-find-the-running-app)
- [3. Launch Only When Needed](#3-launch-only-when-needed)
- [4. Connect the Browser](#4-connect-the-browser)
- [5. Login Flow](#5-login-flow)
- [6. Navigate and Interact](#6-navigate-and-interact)
- [7. Assertions and Evidence](#7-assertions-and-evidence)
- [8. Cleanup](#8-cleanup)
- [Error Handling](#error-handling)
- [Exit Criteria](#exit-criteria)
- [Report](#report)
- [MCP Tool Reference](#mcp-tool-reference)

## When to Use

Use it for:

- Reproducing a visual, layout or interaction bug the user reported on a specific page.
- Walking a page or flow by hand after a UI change, under a logged-in test account.
- Checking light and dark theme, desktop/tablet/mobile widths, sidebar collapse.
- Validating forms, modals and dialogs that have no Jest or Playwright coverage.
- Reading browser console errors and failed API requests (`4xx`/`5xx`, CSRF `403`, session `401`).
- Optional accessibility/best-practices checks with Lighthouse.

Do not use it for:

- QA of changed user flows as a delivery-loop stage, or the Playwright suite (`npm run e2e`, `e2e/`) — use `.agents/skills/e2e-test/SKILL.md` and `docs/E2E_TESTING.md`.
- Unit or service behavior — use `tdd` with Jest (client) or the server domain test scripts.
- Pure API contract checks with no UI — use `curl` against `/api/v1/...` or server tests.
- Anything against production or a real customer account, unless the user explicitly asks and supplies the target.

## Hard Rules

These apply in every step and override convenience:

1. **Reuse before launch.** The user often runs the Docker dev stack on `:3000`. Probe first; start the app only when nothing runs and the user agreed.
2. **Never kill what you did not start.** No `kill`, `docker stop/restart/down`, or port takeover of a foreign process without explicit approval. Do not move the app to another port on your own.
3. **Credentials come only from the user.** Never invent, guess, hardcode or brute-force them; never read `.env`, the DB or mail logs for passwords or 2FA codes; never echo them in output or reports.
4. **Test data only.** No real customer data. No destructive or outward-facing actions (delete, send email/invoice, Mollie operations, Telegram messages) unless the user asked for that action.
5. **No environment edits.** Do not edit `.env`, run migrations/seeds, or change DB content to make a check pass.
6. **Evidence over assumption.** An HTTP `200` is not success. Confirm by visible UI state, snapshot, console and network.
7. **Wait for state, not time.** Use `wait_for` / readiness polling, never fixed sleeps.
8. **Clean up only your own footprint.** Close pages you opened; stop only the PID you started; keep the user's tabs, session and services.

## Workflow Overview

```
1 Preparation → 2 Find app → 3 Launch (only if needed) → 4 Connect browser
→ 5 Login → 6 Navigate & interact → 7 Assert & capture evidence → 8 Cleanup → Report
```

Each step has a completion criterion. Do not move on until it is met or the blocker is reported.

## 1. Preparation

Read:

- `AGENTS.md`
- `CONTEXT.md` for domain terminology and page structure
- `README.md` ("Getting Started", "Project Scripts") for how the app runs
- `DESIGN.md` when the check is visual (tokens, theme, breakpoints)

Pin down the goal: which pages/flows, which bug and its reproduction steps, which roles, which viewports/themes. Ask the user only for what you cannot discover: the target URL if it is not local, test credentials (step 5), and approval to start the app (step 3).

Completion criterion: the goal of the check and the target environment are clear.

## 2. Find the Running App

Development ports (defaults from `.env.example`; the real values live in the user's `.env`, which you must not read):

| What | Docker dev stack | Non-Docker `npm start` |
|---|---|---|
| SPA (webpack-dev-server) | `FRONTEND_PORT`, default `3000` | `3000` (`client`: `webpack serve --env port=3000`) |
| API (Express, prefix `/api/v1`) | `BACKEND_PORT`, default `18080` → container `8080` | `PORT` from the server env (the client's dev fallback expects `http://localhost:8080`) |
| E2E client | — | `13001` — reserved for Playwright, never use it here |

The SPA calls the API directly at the build-time `CLIENT_API_URL`; `GET <api>/api/v1/health` needs no auth or DB.

1. Probe the SPA: `lsof -nP -iTCP:3000 -sTCP:LISTEN` and `curl -sI http://localhost:3000`.
2. Probe the API: `curl -s http://localhost:18080/api/v1/health` (Docker) or `http://localhost:8080/api/v1/health`.
3. `docker ps --format '{{.Names}} {{.Ports}}'` shows whether the Docker dev stack owns the ports.
4. SPA answers → **reuse it** and go to step 4.
5. Port held by something that is not a working DDC app → report the PID and command line and ask. Do not kill it.
6. Nothing listens → step 3.

Completion criterion: a reachable base URL is known, or the conflict/blocker is reported.

## 3. Launch Only When Needed

Start the app only if nothing is running and the user agreed, or the task explicitly asks for it.

- Preferred: the user's Docker dev stack — `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`. Ask first: it touches their local MySQL/Redis containers.
- Non-Docker: `npm start` from the root (`scripts/start-development.js` runs the server with nodemon and the client with webpack-dev-server). Run it in the background, record the PID, and poll the SPA URL and the health endpoint until they answer (bounded, for example up to 3 minutes). You own this process and must stop it in step 8.
- Never run `prisma migrate`, seeds, `docker compose down -v`, or edit `.env` to make the app start. Report the missing prerequisite instead, with the relevant log lines.

Completion criterion: the app answers on the base URL, or the launch failure is reported.

## 4. Connect the Browser

Pick the first available tool:

1. **Chrome DevTools MCP** (`chrome-devtools` in `.mcp.json`, tools `mcp__chrome-devtools__*`) — the default. It starts its own Chrome with an isolated temporary profile (`--isolated`), so the user's cookies and tabs are never touched, at a default viewport of `1440x900`. The browser starts on the first tool call that needs it.
2. **Claude in Chrome** (`mcp__claude-in-chrome__*`, see the `claude-in-chrome` skill) — fallback when the DevTools server is not connected. It drives the user's real Chrome: call `tabs_context_mcp` first, always open your own tab with `tabs_create_mcp`, and never reuse the user's tabs.
3. **`browser-automation` skill** — headless one-shot run for "does it render / console errors" when no interactive tool is available.
4. None available → report that manual browser checks are blocked; fall back to `curl` for reachability only.

With Chrome DevTools MCP:

1. `new_page` with `url: <base>/login` (or the target route). Keep the returned page id; every page-scoped tool takes `pageId`.
2. For a clean-slate auth check, pass `isolatedContext: "<name>"` — pages in different contexts share no cookies or storage.
3. `take_snapshot` — the a11y-tree snapshot lists elements with a `uid`. Interaction tools target that `uid`, not CSS selectors. Always use the latest snapshot; take a new one after navigation or DOM changes.

Completion criterion: you can drive and inspect your own page.

## 5. Login Flow

The app uses cookie sessions with CSRF: the client fetches `/auth/csrf` and sends the token on mutating requests. You do not handle tokens by hand — use the real UI.

1. Get test credentials from the user (Hard Rule 3).
2. Open `<base>/login`, `take_snapshot`, then `fill_form` the "Электронная почта" and "Пароль" fields by their `uid`s in one call and `click` the submit button.
3. **2FA:** with `MODE=development` on the server the email code is skipped. Otherwise the form switches to the code step (code sent to the masked email) — ask the user for the code; never read it from the DB or mail logs.
4. **Turnstile captcha** appears after repeated failed logins. Stop after one failed attempt, report the on-screen error, and ask the user. Never retry in a loop or try to bypass it.
5. **Telegram login** is an ADMIN-only external OIDC flow — do not automate it. With Claude in Chrome, ask the user to log in manually in your tab; with the isolated DevTools browser, use email login instead.
6. Verify success by the authenticated layout (`wait_for` a sidebar/navigation label, then `take_snapshot`), not by the HTTP status alone. Check `list_network_requests` for the login call's status if the UI does not change.

Completion criterion: an authenticated session is confirmed, or the login blocker is reported with its reason.

## 6. Navigate and Interact

Exercise the changed or reported flow first.

- Navigate with `navigate_page` (`type: "url"`, `url`), or through the sidebar with `click`, so client-side routing runs like for a real user.
- After each navigation: `wait_for` an expected visible text, then `take_snapshot`.
- Forms: prefer one `fill_form` over many `fill` calls; use clearly fake data (`Test Student QA`, `qa+<date>@example.com`).
- Dialogs: `handle_dialog` for native `confirm`/`alert`; do not accept destructive confirms (Hard Rule 4).
- Keyboard: `press_key` for Escape/Enter/Tab focus checks.

Viewports — test at least desktop and mobile when layout is touched, and tablet when the sidebar is involved:

| Name | `resize_page` / `emulate viewport` | Expectation |
|---|---|---|
| Desktop | `1440x900` | Full sidebar (`--sidebar-width`, 288px) + content |
| Tablet | `900x1100` | Sidebar auto-collapses (769–1024px media query) |
| Mobile | `emulate` `viewport: "390x844x3,mobile,touch"` | Sidebar becomes an overlay (≤ 768px), content full width |

Theme — the app ignores `prefers-color-scheme`; `emulate colorScheme` does not switch it. The theme is the `body` class (`app_light_theme` / `app_dark_theme`) persisted in `localStorage` under `theme`:

- Preferred: click the theme switcher in the navbar like a user would.
- Or: `evaluate_script` with `() => { localStorage.setItem('theme', 'app_dark_theme'); location.reload(); }`, then `wait_for` and re-check. Restore the previous value afterwards.
- Do not design or check for the `orange` theme — it has no switcher.

Completion criterion: every target page and interaction has been exercised at the required viewports and themes.

## 7. Assertions and Evidence

Check, per page:

- The expected route mounts; title and main content render (`wait_for` + `take_snapshot`).
- Header/sidebar/navigation are present; links resolve to the expected routes.
- Redux-driven state reflects the expected data (lists filled, dynamic module loaders mounted, no endless loaders).
- Forms show the expected validation with test data.
- `list_console_messages` with `types: ["error"]` — no new JavaScript errors. Note pre-existing ones separately.
- `list_network_requests` — changed interactions do not fail; inspect failures with `get_network_request` (watch `401` session, `403` CSRF, `422` validation, `5xx`).
- Dark theme stays real when styling changed: no light-stuck modals (`Modal` falling back to `--white`), readable text, visible borders. See `DESIGN.md` → Theming.

Evidence:

- Prefer `take_snapshot` (text, cheap, exact) for pass/fail; use `take_screenshot` when visual proof matters (layout, theme, overlap). Save screenshots under the session scratchpad, never inside the repo.
- For a specific element, `take_screenshot` with its `uid`; `fullPage: true` for long pages.
- Optional: `lighthouse_audit` (`mode: "snapshot"`, `device: "desktop" | "mobile"`) for accessibility/best practices; `performance_start_trace` / `performance_stop_trace` only when performance is the question.

Completion criterion: each check has a pass/fail backed by evidence.

## 8. Cleanup

- Close the pages you opened (`close_page`; with Claude in Chrome, `tabs_close_mcp` on your tabs only).
- Restore anything you changed in the browser (for example the `theme` value in `localStorage` in the user's real Chrome).
- Stop only the process you started in step 3, by its recorded PID, and confirm the port is free. Leave the user's Docker stack and processes running.
- Remove temporary files you created outside the scratchpad.

Completion criterion: no pages, processes or files of yours are left behind; the user's environment is as you found it.

## Error Handling

| Situation | Action |
|---|---|
| Port `3000` held by a foreign process | Report PID/command, ask. Do not kill, do not switch ports on your own |
| App does not become ready | Stop polling at the bound, report the last log lines; do not edit `.env` or run migrations |
| `chrome-devtools` tools missing | The server is not connected (needs a Claude Code restart after `.mcp.json` changes, Node ≥ 20.19, Chrome installed). Fall back to Claude in Chrome and say so |
| Chrome fails to start in the MCP | Report the error; suggest installing Chrome stable; do not pass `--executablePath` guesses |
| `wait_for` times out | `take_snapshot` + `take_screenshot` + `list_console_messages`: a modal, error alert, loader or auth redirect may block the element |
| `uid` not found / stale | Take a fresh `take_snapshot` and retarget; never fall back to guessed selectors |
| Login fails | Report the on-screen message and the login request status; stop after one attempt (Turnstile) |
| 2FA code step | Ask the user for the code; never read it from DB/mail |
| `401` after login | Session cookie not set — check the API URL/CORS in `list_network_requests`; report, do not patch config |
| `403` on mutations | CSRF token missing/expired — reload the page to refetch `/auth/csrf`, retry once, then report |
| Native dialog blocks the page | `handle_dialog` with `dismiss`, unless the user asked for that action |

## Exit Criteria

- A reachable base URL was used; whether it was reused or started by you is recorded.
- No foreign process was stopped; any process you started is stopped and its port is free.
- The browser connected and every target page/flow was exercised.
- Login succeeded, or its blocker (credentials, 2FA, captcha, Telegram) is reported.
- Required viewports and themes were checked.
- Every assertion has a pass/fail with snapshot/screenshot/console/network evidence.
- Pages you opened are closed and browser state you changed is restored.

## Report

Summarize:

- Base URL and pages tested; app reused or started by you.
- Browser tool used (Chrome DevTools MCP, Claude in Chrome, or headless).
- Viewports and themes tested.
- Interactions performed (no credentials or codes).
- Findings: console errors, failed requests, visual/behavior issues — each with its evidence (snapshot excerpt, screenshot path, request status).
- Blockers and skipped checks, with the reason (port conflict, login/2FA/captcha, missing tooling).

## MCP Tool Reference

Server `chrome-devtools` (`chrome-devtools-mcp@1.10.1`, see `.mcp.json`). Page-scoped tools take `pageId`; element tools take a `uid` from the latest `take_snapshot`.

| Category | Tools | Use here |
|---|---|---|
| Navigation | `new_page`, `navigate_page`, `select_page`, `list_pages`, `close_page`, `wait_for` | Open your page, move between routes, wait for visible text |
| Input | `click`, `fill`, `fill_form`, `type_text`, `press_key`, `hover`, `drag`, `upload_file`, `handle_dialog`, `click_at` | Login, forms, sidebar, dialogs |
| Emulation | `emulate` (`viewport`, `networkConditions`, `cpuThrottlingRate`), `resize_page` | Mobile/tablet widths, slow network |
| Network | `list_network_requests`, `get_network_request` | API failures, CSRF/session errors |
| Debugging | `take_snapshot`, `take_screenshot`, `evaluate_script`, `list_console_messages`, `get_console_message`, `get_css_styles`, `lighthouse_audit`, `screencast_start`, `screencast_stop` | Evidence, theme switch, computed styles, a11y audit |
| Performance | `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight` | Only when performance is the question |

Full parameters: https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/chrome-devtools-mcp-v1.10.1/docs/tool-reference.md

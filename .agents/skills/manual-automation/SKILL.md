---
name: manual-automation
description: Manual browser automation for the DDC NL WordPress theme. Use when checking local XAMPP pages, reproducing visual/UI bugs, inspecting navigation, or validating forms without full automated test coverage.
---

# DDC NL Manual Browser Automation

Use this skill for browser-driven checks against the DDC NL WordPress site. It is intentionally conservative: inspect the existing WordPress/XAMPP environment, avoid restarting services unless the user asks, and never expose secrets.

## Preparation

Read:

- `AGENTS.md`
- `README.md`
- `CONTEXT.md` when copy, labels, or public terminology may be involved

Identify the base URL. Common local candidates are:

- `http://localhost/ddc_nl/`
- `http://127.0.0.1/ddc_nl/`
- A URL supplied by the user

Completion criterion: the browser target is known or the missing prerequisite is reported.

## Navigation

Open the base URL and inspect the changed flow first. Prefer stable selectors and visible labels. For layout work, test at least:

- Desktop width.
- Mobile width.

Completion criterion: changed pages or interactions have been exercised in the browser.

## Assertions

Check:

- Page title and main content load.
- Header/footer/navigation are present.
- CTA links and menus work.
- Forms show expected validation using test data.
- Console has no new JavaScript errors.
- Network requests for changed interactions do not fail unexpectedly.
- No visible PHP warnings, raw shortcodes, or broken template fragments appear.

Use screenshots only when visual evidence helps. Use DOM/state assertions for pass/fail checks.

## Safety

- Do not submit real customer data.
- Do not reveal Telegram tokens, chat IDs, database credentials, or private URLs.
- Do not add files from `images/` or `videos/` to Git.
- Do not stop or restart XAMPP services unless the user explicitly approves it.

## Cleanup

Close pages opened for testing when using browser automation. Leave the user's existing browser tabs and local services alone.

## Report

Summarize:

- URL and pages tested.
- Viewports tested.
- Interactions performed.
- Console/network issues.
- Any blockers or skipped checks.

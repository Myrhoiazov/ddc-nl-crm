---
name: e2e-test
description: Browser QA for the DDC NL WordPress theme on local XAMPP or a supplied URL. Use when templates, forms, front-end JavaScript, SCSS/CSS, navigation, or public WordPress pages change.
---

# DDC NL Browser QA

Use this skill to verify user-facing behavior for the DDC NL WordPress theme. It complements static checks; it does not replace PHP lint, JS syntax checks, review, or brand/secret scans.

## Inputs

Before testing, read:

- `AGENTS.md`
- `README.md`
- `CONTEXT.md` when public copy or labels changed

Determine the base URL from the user, local WordPress/XAMPP configuration, or a running local server. If no URL can be discovered, report that browser QA is blocked and continue with static verification.

## Server Readiness

For local XAMPP, prefer checking the existing site instead of restarting services.

1. Probe the likely local URL with `curl -I` or a browser navigation.
2. If the site is unavailable, identify the missing prerequisite without stopping unrelated services.
3. Do not edit secrets or WordPress configuration to make QA pass.

Completion criterion: a reachable base URL is known, or the blocker is documented.

## Pages to Check

Choose pages affected by the diff first. When unsure, include:

- Home page.
- Schedule or location page if enrollment/navigation changed.
- Trial Lesson or contact form page if forms/CTA changed.
- Agreement page if formal copy/templates changed.
- Any changed custom template under `templates/`, `page-templates/`, or `parts/`.

Completion criterion: every changed user-facing path has at least one rendered-page check.

## Browser Assertions

Use browser automation or manual inspection to verify:

- The page renders without visible PHP warnings or broken markup.
- No new console errors appear during load and primary interactions.
- Navigation and CTA links target the expected pages.
- Forms can be filled and validated without sending real private customer data unless the user explicitly approves a live submission.
- Desktop and mobile viewports remain readable when layout changed.
- Public text follows `Talent Center DDC` / `DDC NL` terminology from `CONTEXT.md`.

Prefer DOM assertions for exact checks and screenshots for layout evidence.

## Form Safety

Contact requests are private customer communication. Use test data and stop before live submission unless the task specifically requires submission testing and the user approved it.

If Telegram integration is involved, verify configuration presence without exposing token values.

## Reporting

Report:

- Base URL tested.
- Pages and viewports checked.
- Console/network/form findings.
- Any skipped checks and why.

Completion criterion: the report gives enough detail for another agent or human to reproduce the QA result.

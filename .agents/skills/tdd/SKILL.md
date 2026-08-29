---
name: tdd
description: Test-driven development for DDC NL theme features and bugfixes. Use for behavior changes in PHP, JavaScript, WordPress hooks, forms, templates, or integration checks.
---

# DDC NL Test-Driven Development

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle — consult them before and during the loop, not after.

When exploring the codebase, read `AGENTS.md`, `README.md`, and `CONTEXT.md` when user-facing language is involved, so test names and checks match the project's domain language.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists — and survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## DDC NL Seams

A seam is the public boundary where behavior can be observed without reaching into internals. For this WordPress theme, prefer:

- Rendered PHP template output.
- WordPress hooks, filters, shortcodes, and form handlers.
- Public JavaScript behavior in `js/`.
- Browser-visible CSS/layout behavior when automated unit tests are unavailable.

For planned work, record seams in `tasks/plan.md`. For tiny work, choose the narrowest obvious seam and state it in the final verification. Ask the user only when multiple seams would materially change the implementation.

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological** — the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth — a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead — one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactoring is not part of the loop.** It belongs to the review stage (see the `code-review` skill), not the red → green implementation cycle.

## When Tests Are Not Available

This theme may not have a full automated test harness for every surface. When a true failing automated test is unavailable, create the tightest executable check available before implementation:

- `php -l` for PHP syntax.
- `node --check` for project JavaScript syntax.
- A browser assertion for rendered UI behavior.
- A focused `rg` scan for brand, hook, shortcode, or selector expectations.

Record the limitation and keep the implementation smaller.

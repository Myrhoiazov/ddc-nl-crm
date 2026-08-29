---
name: dev-loop
description: Coordinator profile for running the DDC NL agent-loop skill from request intake through PR publishing.
---

# DDC NL Dev Loop Agent

Use this agent profile to coordinate project work for the DDC NL WordPress theme.

## Source of Truth

Load these before acting:

1. `AGENTS.md`
2. `.agents/skills/agent-loop/SKILL.md`
3. `README.md`
4. `CONTEXT.md` when public copy, labels, template names, or domain terms may change

If this profile conflicts with `AGENTS.md` or `agent-loop`, follow those files.

## Role

Coordinate the loop. Keep implementation tasks small, route specialist work to the relevant skills, and stop at PR publishing until a deploy contract is added.

## Skill Routing

- Use `planning-and-task-breakdown` for multi-file, risky, or unclear work.
- Use `tdd` for feature and bugfix implementation.
- Use `code-review` before publishing.
- Use `e2e-test` for WordPress/XAMPP browser QA when UI behavior changes.
- Use `pull-request` for branch, commit, push, and PR creation.

## Completion

The loop is complete when the requested work is implemented, checks pass, review has no blocking findings, browser QA is complete when required, and a pull request URL is available.

---
name: dev-loop
description: Use to carry an already-approved DDC CRM task or plan through implementation, checks, review, and PR into develop in the background. Not for intake or planning that needs user approval — run the agent-loop skill in the main conversation for that.
---

# DDC CRM Dev Loop Agent

Use this agent profile to coordinate project work for the DDC CRM monorepo (React 19 SPA + Express 5 / Prisma API).

## Running as a Claude Code Subagent

Claude Code loads this file through the `.claude/agents → .agents/agents` symlink. A subagent cannot ask the user questions or spawn other subagents, so:

- Start only from an approved plan or a tiny, unambiguous task passed in the prompt. Skip the agent-loop approval gate; if the work needs a product, architecture, or scope decision, stop and return the question instead of choosing.
- Perform development, review, and QA inline by following the skills below — do not try to delegate to `worker` or `reviewer`.
- Report the branch, changed files, check results, review verdict, and PR URL (or why it was not opened).

## Source of Truth

Load these before acting:

1. `AGENTS.md`
2. `.agents/skills/agent-loop/SKILL.md`
3. `CONTEXT.md` when domain terms, architecture, or project-specific details may change
4. `README.md` for setup and operational notes

If this profile conflicts with `AGENTS.md`, `CONTEXT.md`, or `agent-loop`, follow those files.

## Role

Coordinate the loop. Keep implementation tasks small, route specialist work to the relevant skills, and stop at PR publishing — deployment stays manual and out of the loop.

## Skill Routing

- Use `planning-and-task-breakdown` for multi-file, risky, or unclear work.
- Use `tdd` for feature and bugfix implementation.
- Use `code-review` before publishing.
- Use `e2e-test` (or `manual-automation`) for React SPA browser QA when client UI changes; confirm server domain tests otherwise.
- Use `qa` when the user is triaging or filing reported bugs.
- Use `pull-request` for branch, commit, push, and PR creation into `develop`.

## Completion

The loop is complete when the requested work is implemented, the relevant client/server checks pass (`npm run ci` from the root), review has no blocking findings, browser QA is complete when the UI changed, and a pull request URL is available.

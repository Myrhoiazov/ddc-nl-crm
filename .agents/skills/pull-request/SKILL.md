---
name: pull-request
description: Create a GitHub pull request for DDC NL theme changes: inspect diffs, create a feature branch, commit with Conventional Commits, push, and open a PR. Use when asked to publish local work for review.
metadata:
   version: 1.0.0
---

# DDC NL Pull Request Publishing

Publish current DDC NL WordPress theme changes as a GitHub pull request. This skill stops at PR creation; production deployment and release-to-main are separate gates.

## Prerequisites

- `gh` CLI installed and authenticated.
- Remote `origin` points to `git@github.com:Myrhoiazov/ddc_nl-wordpress-theme.git`.
- Relevant checks from `AGENTS.md` have passed or blockers are documented.

## Process

### 1. Inspect Current State

Run:

- `git status --short --branch`
- `git diff`
- `git diff --staged`
- `git remote -v`

Confirm that staged or unstaged changes do not include:

- Secrets, tokens, passwords, or private URLs.
- `.env`, `.DS_Store`, `node_modules/`.
- Private or licensed media from `images/` or `videos/`.
- Unrelated user changes.

Completion criterion: the change set is understood and safe to publish.

### 2. Prepare Branch and Message

Choose:

- A short feature branch name.
- One Conventional Commit message.
- A PR title and body that describe behavior and verification.

Read `commit-message-instructions.md` from this skill directory and follow it. Do not add `Co-authored-by`, `Generated-by`, AI attribution trailers, or similar metadata unless the user explicitly asks.

Completion criterion: branch name, commit message, PR title, and PR body are ready.

### 3. Commit and Push

Create or switch to the feature branch, stage only intended files, commit, and push to `origin`.

Use non-interactive Git commands. If push fails because network access is blocked, rerun the push with escalation approval.

Completion criterion: the branch exists on `origin`.

### 4. Open Pull Request

Determine the target branch, normally `main`, from the remote default branch when possible. Create the PR with `gh pr create`.

If authentication fails, report that `gh auth login` is required.

Completion criterion: a GitHub PR URL is available.

## PR Body

Include:

- Summary of user-facing changes.
- Verification commands and browser QA performed.
- Notes about skipped checks or deferred deployment.
- Issue references when available.

---
name: planning-and-task-breakdown
description: Break DDC NL WordPress theme work into ordered, verifiable tasks. Use for multi-file features, risky template/form/style changes, unclear requirements, or work that needs agent-loop coordination.
---

# DDC NL Planning and Task Breakdown

Use this skill before implementation when the request is larger than an obvious tiny change.

## Inputs

Read:

- `AGENTS.md`
- `README.md`
- `CONTEXT.md` when public copy, labels, page names, template names, or domain language may change
- Relevant PHP, SCSS, CSS, JS, and template files

Completion criterion: the existing pattern and the risky surfaces are known.

## Planning Rules

Plan in vertical slices that leave the site working after each task. Prefer slices around user-visible outcomes:

- A template renders the requested content.
- A form validates and routes a contact request.
- A CTA or navigation path works.
- A style change renders correctly across desktop and mobile.
- A hook/filter integration behaves correctly through WordPress public boundaries.

Keep task scope small. Break tasks that touch unrelated areas, require more than about five files, or combine behavior with broad visual polish.

## DDC NL Risk Checks

Call out risks when the work touches:

- Public brand or domain terms from `CONTEXT.md`.
- Slugs, template names, CSS/JS ids, or classes.
- Telegram/contact form handling.
- Ignored media folders: `images/`, `videos/`.
- Generated style outputs: `style.css`, `css/style.css`, `style.css.map`.
- Release/version files.

Completion criterion: each risk has a mitigation or an explicit open question.

## Output Files

Create or update:

- `tasks/plan.md`
- `tasks/todo.md`

Use these files only for real implementation plans. For tiny work, skip them and state that no written plan was needed.

## Task Format

Each task should use this shape:

```markdown
## Task [N]: [Short user-visible outcome]

**Description:** [What this task delivers.]

**Acceptance criteria:**
- [ ] [Specific, observable behavior]
- [ ] [Specific, observable behavior]

**Verification:**
- [ ] PHP lint: `php -l path/to/file.php` when PHP changed
- [ ] JS syntax: `node --check js/file.js` when project JS changed
- [ ] Browser QA: [page/viewport/interaction] when UI changed
- [ ] Brand/secret/media scan when relevant

**Dependencies:** [Task numbers or "None"]

**Files likely touched:**
- `templates/example.php`
- `scss/example.scss`

**Estimated scope:** [XS | S | M]
```

## Plan Template

```markdown
# Implementation Plan: [Feature/Fix Name]

## Overview
[One paragraph.]

## Relevant Context
- [Existing pattern or file group.]
- [Brand/domain constraint when applicable.]

## Task List
- [ ] Task 1: ...
- [ ] Task 2: ...

## Verification Plan
- [ ] Static checks:
- [ ] Browser QA:
- [ ] Review:

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Med/Low] | [Mitigation] |

## Open Questions
- [Question, or "None"]
```

## Todo Template

```markdown
# Todo: [Feature/Fix Name]

- [ ] Task 1: [Short title]
- [ ] Task 2: [Short title]
- [ ] Static checks passed
- [ ] Code review passed
- [ ] Browser QA completed or marked not required
- [ ] Ready for PR
```

## Completion

Planning is complete when every task has acceptance criteria, verification, dependencies, and likely files, and the user has approved the plan when approval is required by `agent-loop`.

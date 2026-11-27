# Agent task — DDC Ticketing discovery (read-only)

Read PROJECT_BRIEF.md and repository instructions (AGENTS.md, DEVELOPER.md if present). Inspect the actual repository before proposing changes. Do not implement, migrate, install packages, modify application code, call production payment APIs or access/export customer data. Only write discovery documentation in an agreed docs directory. Use existing safe local inspection commands; redact secrets. If access is missing, report it.

## Investigation
1. Map repositories, modules, runtime versions, frontend/backend conventions, deployment, routing, database ORM and migrations. Cite actual file paths, symbols and line ranges.
2. Inspect CRM navigation, design system, RBAC, tenant/company scoping, staff authentication and audit logs. Identify reuse points.
3. Inspect Mollie integration: one-off payment creation versus recurring payments, webhook routing, payment lookup, idempotency, status mapping, refunds, chargebacks, reconciliation, test mode. Do not assume subscription flows fit ticketing.
4. Inspect existing customers, orders, payments, email, PDF, QR, jobs, Redis and observability. Classify each as reuse/adapt/new; explain dependencies and risks.
5. Inspect WordPress integration and deployment boundaries; compare iframe and JS widget, CSP/CORS, accessibility, mobile zoom, localization, checkout return URLs and guest access. If WordPress repository is absent, mark unverified.
6. Design versioned venue/seat maps and session-specific inventory. Compare transaction/locking strategies; define uniqueness, lock ordering, deadlock retries, atomic holds and expiry. Analyze payment/hold races, late payments, duplicate/out-of-order webhooks, retry recovery, refunds and simultaneous scans.
7. Propose API contracts, data model, UI navigation and permission matrix. Identify privacy, retention, VAT/invoicing and consumer-policy questions requiring business review. Do not invent legal conclusions.
8. Evaluate feasibility on current infrastructure; propose measurable load and concurrency tests, backup/restore, feature flags and rollback. Identify monitoring and manual reconciliation workflows.

## Deliverables
- CURRENT_ARCHITECTURE.md: evidence-based inventory, diagrams, existing integrations and gaps.
- TICKETING_SPECIFICATION.md: MVP, user/admin flows, acceptance criteria, exclusions, open decisions.
- DATABASE_DESIGN.md: proposed ERD, constraints, transactions, migration and versioning strategy.
- BOOKING_AND_PAYMENT_FLOW.md: state machines, sequence diagrams, failure/recovery matrix, refund/check-in policies.
- IMPLEMENTATION_PLAN.md: phased tasks, dependencies, reuse matrix, risk register, tests, estimates with assumptions, definition of done.

Separate verified facts from proposals and unknowns. For each major recommendation give alternatives and trade-offs. Include a final GO / CONDITIONAL GO / NO GO recommendation with blockers and questions for the owner. Stop after documentation; wait for approval before implementation.

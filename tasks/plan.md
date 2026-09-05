# Implementation Plan: Skylos Refactoring — Waves 16+

## Overview

Continuation of the Skylos-driven code quality cleanup after waves 1–15 (all merged into
`develop` via PRs; `main` synced via PR #45 merge commit `a06ce26`). A fresh skylos run
on 2026-09-05 (`/tmp/skylos_planning.txt`) shows **283 findings** total.

Only two categories remain actionable: **SKY-C304 (long function, 158)** and
**SKY-Q301 (high cyclomatic complexity, 17)**. Everything else is documented as a
conscious decision or false positive and must NOT be re-opened:

- **SKY-E003 (51)** — Storybook `.stories.tsx` (CSF convention) + jest config helpers; documented false positive.
- **SKY-Q402 (17)** — await-inside-loop: 3 parallelized in wave earlier, 14–17 consciously kept sequential (IMAP protocol semantics, Prisma interactive transactions, Mollie API rate limiting, email throttling). Documented with rationale.
- **SKY-U003 (10) / SKY-U001 (4) / SKY-U004 (1)** — stories/config/ErrorBoundary; documented.
- **SKY-D248 (7) / SKY-D252 (5) / SKY-D253 (2) / SKY-D230 (2) / SKY-D216 (2) / SKY-D327 (2) / SKY-S101 (1) / SKY-T105 (1) / SKY-L007 (1)** — security/type categories, each documented inline as by-design or false positive.
- **SKY-R103 / SKY-R104 (2)** — Skylos gate/pre-commit policy: consciously not configured (Phase A informational).

## Current State (fresh run 2026-09-05)

| Category | Count | Actionable |
|---|---|---|
| SKY-C304 — long function (>50 lines) | 158 | **yes** — production client/server, hooks, tests |
| SKY-Q301 — cyclomatic complexity (>10) | 17 | **yes** — mostly client hooks + 2 server |
| SKY-E003 / SKY-U001/003/004 | 66 | no — documented false positives |
| SKY-Q402 — await in loop | 17 | no — consciously sequential (documented) |
| SKY-D248/252/253/230/216/327 | 20 | no — by design / false positive |
| SKY-S101 / SKY-T105 / SKY-L007 | 3 | no — documented |
| SKY-R103 / R104 | 2 | no — not configured (Phase A) |
| **Total** | **283** | **~175 flagged, of which ~107 real production work** (roughly: 59 client prod + 23 client hooks + 2 hook-tests + 13 server files + test files) |

Breakdown of the 158 SKY-C304 findings:
- 46 in `.test.ts(x)` files — consciously NOT decomposing tests for metric sake (documented in waves 5/6); keep as is.
- 25 client hook files (`useXxx.ts`) — decomposition lesson from round 4/5: moving logic into hooks does NOT close the finding (Skylos flags the hook itself); do NOT move more logic into hooks.
- 59 client production components/subcomponents (still >50 lines after prior decomposition).
- 13 server files (controllers + services) incl. deferred HIGH-risk money functions.

Breakdown of the 17 SKY-Q301 findings: 15 client hooks/components + 2 server
(`controller.Invoices.ts:959`, `controller.Users.ts:101`).

## Task List

> Waves are delivered as separate `fix/skylos-*` branches, squash-merged into `develop`.
> Verification per wave: type-check, build, targeted tests, lint (client).

### Wave 16 — Server controllers C304/Q301 (HIGH)

- **Task 16.1** — `server/src/controllers/conteroller.Mollie.ts` (7 C304 findings).
  Includes the HIGH-risk money functions deferred from wave 7: `mollieCallbackController`,
  `mollieCreateCustomerPaymentLinkController`, `mollieCreateMandateSubscriptionController`,
  `mollieUpdateSubscriptionController`, `mollieRestartSubscriptionController`,
  `mollieRevokeMandateController`, `mollieCancelPaymentController`,
  `mollieResolveIncidentController`.
  Mitigation: behavior-preserving extraction only; the controller has no unit tests —
  rely on `tsc`, build, and `test:mollie` (7/7) plus line-by-line diff review.
- **Task 16.2** — `server/src/controllers/controller.Invoices.ts` (5 C304 + 1 Q301 :959).
  Includes deferred HIGH-risk `createInvoiceAdjustment` (cc17/109 lines) and
  `confirmPaidInvoice` (cc11/82 lines). Same mitigation as 16.1.
- **Task 16.3** — `server/src/controllers/controller.Users.ts` (1 Q301 :101 cc11).
- **Task 16.4** — single C304 findings: `controller.Auth.ts` (:121, 81 lines — deferred
  from wave 7, no dedicated login test; extract non-security parts only or add test first),
  `controller.Clients.ts`, `controller.Instagram.ts`, `controller.Profiles.ts`,
  `controller.Schedule.ts` (:140, 78 lines).

### Wave 17 — Server services C304 (MEDIUM)

- **Task 17.1** — `service.Search.ts`, `service.MolliePaymentInvoicePdf.ts` (:51, 62).
- **Task 17.2** — `service.InvoiceMollie.ts`, `service.InvoiceDelivery.ts`,
  `service.EmailSmtp.ts`, `service.Clients.ts`.
- Domain tests: `test:search`, `test:email`, `test:payment-reminders`, `test:mollie`.

### Wave 18 — Client production: TOP components (HIGH/MEDIUM)

> These are the largest remaining production components (>90 lines), several are
> subcomponents extracted in earlier waves that themselves became long. Decompose
> with subcomponents — but NO new hooks (lesson from round 4/5) unless the hook is
> itself split into <50-line functions.

- **18.1** `InvoicesPage/ui/InvoiceListItem.tsx:57` (172)
- **18.2** `features/globalSearch/ui/GlobalSearch/GlobalSearch.tsx:110` (163; Q301 cc16 same line)
- **18.3** `ClientsDetailsPage/ui/ClientPaymentBlock/ClientPaymentBlock.tsx:21` (136) +
  `ClientPaymentBlockModals.tsx:52` (123)
- **18.4** `ScheduleSettingsPage/ui/ScheduleSettingsPage/GroupStatisticsSection.tsx:30` (134) + `:50` (109)
- **18.5** `ChoreographersPage/ui/ChoreographerModal/ChoreographerDetailsForm.tsx:33` (122) + `ChoreographerPhotoSection.tsx:25` (66)
- **18.6** `EmailPage/ui/EmailPage/EmailPage.tsx:14` (116) + `EmailPageMessagesTab.tsx:34` (80)
- **18.7** `InvoicesPage/ui/InvoicesPage/InvoicesPage.tsx:15` (111) + `InvoicesPageToolbar.tsx:19` (57)
- **18.8** `features/addMollieSubscriptionForm/.../AddMollieSubscriptionForm.tsx:38` (105)
- **18.9** `MolliePage/ui/MollieIncidents/MollieIncidents.tsx:14` (99) + `MollieIncidentCard.tsx:90` (80)
- **18.10** `MolliePage/ui/MollieCustomerDetails/MollieStudentLinksManager.tsx:27` (94) + `MollieCustomerDetails.tsx:32` (70)
- **18.11** `InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.tsx:20` (94) + `InvoiceFormFields.tsx:26` (53)
- **18.12** `MolliePage/ui/MolliePaymentsMatrix/*` (matrix :13 91, table :13 78, upcoming :34 68, toolbar :29 67)
- **18.13** `features/Auth/ui/TwoFactorForm/TwoFactorForm.tsx:23` (91, remains after wave 5) + `features/changePassword/.../ChangePasswordModal.tsx:29` (75)
- **18.14** `MolliePage/ui/MolliePayments/MolliePayments.tsx:14` (86) + `MolliePaymentsFilters.tsx:37` (62)
- **18.15** `features/addClientForm/ui/ClientForm/ClientForm.tsx:28` (84) + `entities/EmailMessage/ui/EmailMessageDetail/EmailMessageDetail.tsx:45` (83)

### Wave 19 — Client production: medium components (MEDIUM)

- **19.1** pages ~79: `ClientsPage.tsx:41`, `ChoreographersPage.tsx:11`, `AddTransactionForm.tsx:34`, `DanceStylesPage.tsx:9` (78)
- **19.2** `PaymentRemindersPage` subtree (`PaymentRemindersPage.tsx:11` 67, `PaymentReminderTemplateCard` 77, `PaymentReminderSettingsCard` 59, `PaymentReminderDeliveriesCard` 58)
- **19.3** `HomePage` subtree (`HomePageRevenueChart` 76, `HomePageKpiCards` 66, `HomePageFailedPayments` 60, `HomePage.tsx:12` 53)
- **19.4** `features/addUserForm/ui/UserForm/UserForm.tsx:31` (77), `entities/MollieSubscription/ui/MollieSubscriptionCard/MollieSubscriptionCard.tsx:23` (76)
- **19.5** `InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.tsx` (3 funcs: :63 75, :200 65, :139 60)
- **19.6** `ClientEmailBlock.tsx:17` (75), `EditClientFormFields.tsx:21` (73)
- **19.7** `createMollieMandateForm/CreateMollieMandateForm.tsx:40` (73), `MollieClientForm.tsx:35` (59)
- **19.8** `TransactionsPage.tsx:43` (72), `OrganizationBrandsPage.tsx:14` (69)
- **19.9** `MollieCustomers.tsx:25` (67), `Sidebar.tsx:17` (61), `EditMollieClientDropdown.tsx:25` (57)
- **19.10** `addClientData.ts:13` (60), `mollieClientsDetailsPageSlice.ts:44` (59), `ProfileCardFields.tsx:18` (58), `ProfileCard.tsx:23` (55)

### Wave 20 — Client hooks C304 + Q301 (MEDIUM)

> Dispatch the deferred hook work. Lesson from round 4/5: splitting a hook into smaller
> hooks does NOT reliably silence Skylos — the pattern that works is extracting pure
> functions (builders/selectors/validators) and memoized handlers from inside the hook.

- **20.1** `useClientPaymentBlock` (Q301 :90)
- **20.2** `useCreateInvoiceModal` (2 C304; Q301 :106, :260)
- **20.3** `useEditClientModal` (2 C304; Q301 :133, :55)
- **20.4** `useClientForm` (:49, 226 lines; Q301 :49)
- **20.5** `useEmailPage` (Q301 :38), `useInvoicesPage` (Q301 :10)
- **20.6** `useChoreographerModal` (Q301 :71), `useClientEmailBlock` (Q301 :21)
- **20.7** `useMolliePaymentsMatrix` (Q301 :95), `usePaymentReminders` (Q301 :54)
- **20.8** other C304 hooks: `useDanceStyles`, `useHomePageData`, `useOrganizationBrands`,
  `useMollieIncidents`, `useMolliePayments`, `useMollieCustomerDetails`, `usePaymentHistory`,
  `useStudentLinksManager`, `useCreateGroupForm`, `useScheduleSettingsPage`, `useSidebarState`,
  `useTransactionFilters`, `useClientFilters`, `useActiveSessions`, `useEditSubscriptionDropdown`.

### Wave 21 — Close remaining by documentation (LOW)

- **21.1** Test files (46 C304 findings) — do NOT decompose tests for metric sake; record the decision in the checklist.
- **21.2** `useTransactionFilters.test.tsx`, `useInfiniteScroll.test.ts` — same treatment.
- **21.3** Refresh counters/status in `docs/spec/SKYLOS_FINDINGS_CHECKLIST.md` after waves 16–20.

## Verification Plan

Per wave:
- **Client**: `tsc --noEmit` (client), `npm run lint:ts`, targeted Jest of affected screens, `npm run build:prod` (clean; only pre-existing bundle-size warnings).
- **Server**: `tsc --noEmit` (server), `npm run build`, relevant domain tests (`test:auth`, `test:mollie`, `test:search`, `test:email`, `test:payment-reminders`), `npm run test:ci`.
- **Per task**: behavior-preserving extraction; verify via type-check + build + existing tests; for money paths, line-by-line diff review.
- **Final**: `npm run ci` from root. `skylos-check` on CI is informational (Phase A), not a merge gate; `docs-links` must stay green.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| HIGH-risk money functions (`conteroller.Mollie.ts` / `controller.Invoices.ts`) | High — broken payments/invoices | Behavior-preserving extract only; no logic change; `test:mollie` + line-by-line review; leave money-write paths untouched if extraction can't be verified |
| `controller.Auth.ts:121` (login, 81 lines) — no dedicated test | High — security regression | Extract only non-security helpers; or add auth controller test first (deferred decision) |
| Client hooks — decomposing pushes logic into hooks that Skylos then flags | Medium — no metric gain | Extract pure functions/handlers inside hooks; avoid new hooks with >50 lines |
| Subcomponents extracted earlier became long themselves (GroupStatisticsSection, MolliePaymentsMatrixTable, etc.) | Medium — churn | Decompose again with render-helper subcomponents, keep pure JSX |
| Test files >50 lines | Low | Not actionable by decision — don't touch |
| New Skylos "unused function" false positives on extracted helpers | Low — noise only | Documented; not a blocker |

## Open Questions

- Should we add a dedicated auth controller integration test before touching `controller.Auth.ts:121`?
- Local `check:skylos` is available via plain `bash` (works); `rtk bash` has an architectural mismatch — verify per-wave counts using the working invocation, or rely on CI `skylos-check` (informational)?
- Batch smaller waves (19/20) into one branch, or keep one branch per wave?
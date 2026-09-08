# Implementation Plan: API Response Shape — Second-Pass Audit Fixes

## Overview

Follow-up to the first pass of `docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md`
enforcement (PRs #73–#78, already merged/open, covering `controller.Company.ts`,
`controller.Schedule.ts` halls/choreographers/styleCards, `controller.Email.ts`
downloadAttachment, and the Mollie mandate response shape). A second, broader
audit (two parallel research passes covering every remaining controller/service)
found 19 further violations of the same convention: endpoints that return more
Prisma fields/relations to the client than any client consumer reads, ranging
from a genuine secret leak (an unauthenticated bearer token) to fully-unused
mutation response bodies. This plan tracks each as one independent, mergeable
task — same workflow as the first pass: one branch, one commit, one PR into
`develop` per task, in the order below.

Ordering rationale: security/secret leaks first (Tasks 1–2), then PII/financial
data over-exposure (Task 3), then structural over-fetch of nested relations
(Tasks 4–13), then dead/unused response bodies which are the cheapest, lowest-risk
fixes (Tasks 14–19).

## Relevant Context

- `docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md` — the convention being enforced:
  every endpoint needs an explicit named `select`/`include` matching actual
  client usage; full-model responses are the rare exception, not the default.
- Established pattern from the first pass: a `const <entity><purpose>Select = {
  ... } satisfies Prisma.<Entity>Select;` near the controller function, with a
  one-line comment naming the client file/type that justifies the field list.
  See `controller.Company.ts` (`branchSelect`, `organizationSelect`), `controller.Schedule.ts`
  (`hallSelect`, `choreographerListSelect`, `styleCardSelect`), `conteroller.Mollie.ts`
  (`toMandateResponse`).
- `AGENTS.md` git workflow: `feat/`/`fix/`/`refactor/` branch off `develop`, PR into
  `develop`, squash-merge, Conventional Commits, no AI attribution trailers.
- Server domain test scripts (run the one matching the changed area, see AGENTS.md
  table): `test:mollie` for Mollie tasks, no dedicated script exists for
  Clients/Invoices/Schedule/PaymentReminders controllers — `npm run build` (tsc)
  is the baseline check for those, per the pattern already used in the first pass.
- All 19 findings were cross-checked against real client consumers (types/hooks)
  during the audit; each task below names the exact client file that justifies
  the narrower shape.

## Task List

- [x] Task 1: Stop leaking `InvoiceDelivery.publicToken` from create/update
- [x] Task 2: Stop leaking `InvoiceDelivery.publicToken` from `getInvoiceDeliveries`
- [x] Task 3: Narrow Mollie customer-list response (drop bank-like consumer fields)
- [x] Task 4: Narrow Client detail includes (branch/group) in `service.Clients.ts`
- [ ] Task 5: Narrow `findLatestPayments`/`findPaymentLinks` Payment fields
- [ ] Task 6: Narrow `findSubscriptions` (Subscription + nested Mandate)
- [ ] Task 7: Narrow `findMandates` Mandate fields
- [ ] Task 8: Narrow `mollieGetCustomerFullInfo` (drop unused relations, select Payment)
- [ ] Task 9: Narrow `mollieGetPaymentsController` Payment fields
- [ ] Task 10: Narrow `mollieGetUpcomingSubscriptionsController` Subscription fields
- [ ] Task 11: Drop unused raw `payment`/`subscription` objects from Mollie incidents
- [ ] Task 12: Narrow payment-reminder settings/template upsert responses
- [ ] Task 13: Narrow payment-reminder delivery list response
- [ ] Task 14: Trim `deleteClient` response body
- [ ] Task 15: Trim dance-group create/update response bodies
- [ ] Task 16: Trim style-card create/update response bodies
- [ ] Task 17: Trim `mollieDeleteSubscriptionByIdController` response body
- [ ] Task 18: Drop unused `parentInvoice` from `invoiceInclude`
- [ ] Task 19: Resolve `invoiceInclude.adjustments` (open question — see below)

## Verification Plan

- [ ] Server: `npm run build` (tsc) after every task, from `server/`
- [ ] Server: `npm run test:mollie` after every Mollie-touching task (Tasks 3, 8, 9, 10, 11, 17)
- [ ] Server: `npm run test:ci` before the final task lands, to catch cross-task regressions
- [ ] No dedicated client changes expected — client types are already narrower than
      the server responses (that's the point); if any task requires a client type
      tweak, run `npm run lint:ts` and `npm test` from `client/`
- [ ] Browser QA: spot-check the pages named in each task's acceptance criteria after
      the corresponding PR — not full e2e, since these are non-visible payload trims
- [ ] Secret scan: for Tasks 1–2 specifically, confirm via `grep` on the actual
      HTTP response (not just the Prisma call) that `publicToken` no longer appears

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Narrowing a `select` accidentally drops a field a less-obvious client consumer still reads | Med | Each task's acceptance criteria names the specific client file(s) checked during the audit; re-grep the client for the field name before removing it, not just the primary consumer named here |
| `publicToken` fix (Tasks 1–2) changes response shape for a route that may have an undiscovered caller | High if wrong | `getInvoiceDeliveries` audit found zero callers in `client/src` — re-verify with a fresh grep immediately before editing, since this is a security-sensitive assumption |
| Trimming "dead" mutation responses (Tasks 14–17) removes a field some other undiscovered consumer needs | Low-Med | Audit already grepped each response's only known caller and confirmed the value is discarded; still worth one more targeted grep per task before touching the response shape |
| Task 19 (`adjustments`) may be intentional forward-looking API surface for unshipped UI | Low | Treated as an open question, not auto-fixed — resolve with the user or leave as `TODO`-commented exception before merging |
| Removing `mandates`/`subscriptions` from `mollieGetCustomerFullInfo` (Task 8) could be relied upon by a webhook/internal caller, not just the browser client | Low | Function is only reachable via the HTTP controller per the audit; confirm no internal service imports it before trimming |

## Open Questions

- **Task 19** (`invoiceInclude.adjustments`): the client type
  `client/src/pages/InvoicesPage/model/types.ts` declares `adjustments` on the
  `Invoice` interface, but no component currently renders it — this could be
  scaffolding for a not-yet-built adjustments UI rather than dead weight. Default
  plan (see Task 19 below) is to leave it as-is with a comment flagging the
  situation, since removing a declared-but-unused type field is a judgment call
  the user may want to make explicitly rather than have silently dropped.
- **`getInvoiceDeliveries` route** (Task 2): the audit found no client caller at
  all for `GET /invoices/:id/deliveries`. This plan only narrows its response
  shape (fixing the `publicToken` leak regardless of whether the route is dead);
  deleting the route entirely is out of scope here and would need explicit
  confirmation first.

---

## Task 1: Stop leaking `InvoiceDelivery.publicToken` from create/update

**Description:** `service.InvoiceDelivery.ts` (`create` ~line 149, `update` ~line
195) calls `prisma.invoiceDelivery.create`/`.update` with no `select`, and
`controller.Invoices.ts`'s `sendInvoice` (~line 1342) returns that full row via
`res.status(201).json(delivery)`. The full `InvoiceDelivery` row includes
`publicToken` — the unauthenticated bearer token that grants public view/pay
access to the invoice (see the `InvoiceDelivery.publicToken @unique` field in
`server/prisma/schema/invoice.prisma`). This is a real secret leak, same
severity class as the already-fixed Mollie mandate row leak. The client
(`client/src/pages/InvoicesPage/ui/InvoicesPage/useInvoiceDelivery.ts:22`)
never reads `.data` from this call at all, so the safest fix is a named
`invoiceDeliverySelect` (or just trimming to `{ id: true, createdAt: true }`)
applied to both the `create` and `update` calls in `service.InvoiceDelivery.ts`,
not a client-driven field list.

**RESOLVED (broader than originally scoped):** the same leak also existed in
`controller.Invoices.ts`'s shared `invoiceInclude.deliveries` (the include used
by every invoice mutation response — create/update/confirmPaid/etc.), which had
no `select` at all and is the actively-consumed path (the edit form reads
`invoice.deliveries`). Fixed by adding an explicit `select` there too, matching
`client/src/pages/InvoicesPage/model/types.ts`'s `InvoiceDelivery` type
(id/type/status/recipientEmail/subject/errorMessage/sentAt/firstViewedAt/lastViewedAt/viewCount/createdAt/createdBy).
Also added a shared `invoiceDeliverySelect` constant in `service.InvoiceDelivery.ts`
applied to `create`, `update`, and `markDeliveryFailed`. Confirmed via grep that
`publicToken` only remains in the actual public-invoice-view code path
(`controller.Invoices.ts` ~1400/1450), which legitimately needs it.

**Acceptance criteria:**
- [ ] `service.InvoiceDelivery.ts`'s `create` and `update` calls use an explicit
      `select` that does not include `publicToken`, `paymentUrl`, `invoiceId`, or
      `createdById`
- [ ] `controller.Invoices.ts`'s `sendInvoice` response body no longer contains
      `publicToken` (verify with a manual request or by reading the new response
      shape, not just the Prisma call)
- [ ] Re-grep `client/src` for `useInvoiceDelivery` and any other caller of the
      send-invoice endpoint immediately before editing, to confirm nothing reads
      the trimmed fields

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Server: `npm run test:invoice-delivery`
- [ ] Secret scan: grep the final response-building code path for `publicToken`
      to confirm it no longer appears in anything passed to `res.json`

**Dependencies:** None

**Files likely touched:**
- `server/src/services/service.InvoiceDelivery.ts`
- `server/src/controllers/controller.Invoices.ts`

**Estimated scope:** S

---

## Task 2: Stop leaking `InvoiceDelivery.publicToken` from `getInvoiceDeliveries`

**Description:** `controller.Invoices.ts`'s `getInvoiceDeliveries` (~line 1360)
calls `prisma.invoiceDelivery.findMany` with only the `createdBy` relation
scoped — no top-level `select` — so the same `publicToken` leaks in the list
response too, along with `paymentUrl`/`updatedAt`/`invoiceId`/`createdById`.
The audit found no caller anywhere in `client/src` for `GET
/invoices/:id/deliveries` — treat this as likely-dead but still worth fixing
defensively (don't delete the route in this task; that's a separate decision,
see Open Questions in the plan). Reuse the same select shape introduced in
Task 1 if it makes sense as a shared constant.

**Acceptance criteria:**
- [ ] `getInvoiceDeliveries`'s `findMany` uses an explicit `select` that excludes
      `publicToken`, `paymentUrl`, `invoiceId`, `createdById`
- [ ] Route behavior (auth, filtering, ordering) is otherwise unchanged
- [ ] Do not delete the route or its registration in `routes/router.Invoices.ts`
      in this task, even though it looks unused — that's a separate call

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Secret scan: confirm `publicToken` does not appear in the new response shape

**Dependencies:** Task 1 (share the select constant if convenient; not a hard blocker)

**Files likely touched:**
- `server/src/controllers/controller.Invoices.ts`

**Estimated scope:** XS

---

## Task 3: Narrow Mollie customer-list response (drop bank-like consumer fields)

**Description:** `conteroller.Mollie.ts`'s `customerListInclude` (~line 1306),
used by `mollieGetCustomersController` (~line 1352), calls `customer.findMany`
with no top-level `select`. Each row in the customer list leaks
`consumerAccount`/`consumerBic`/`consumerName` (bank-account-like data),
`city`/`country`/`postalCode`/`streetAndNumber`, `locale`/`preferredLanguage`,
`clientId`, `mollieId`, `createdAt`/`updatedAt`. The client
(`client/src/entities/MollieClient/ui/MollieClientListItem/MollieClientListItem.tsx`
and `MollieCustomerBadges.tsx`) only reads `id`, `payerName`, `givenName`,
`familyName`, `email`, `payerRelation`, `client`, `clientLinks`, and the
already-narrowed `mandates`/`subscriptions`. This is the highest-volume
over-exposure found (every row of the customer list, not just one record) and
involves financial-adjacent PII — prioritize accordingly.

**Acceptance criteria:**
- [ ] Add a named `customerListSelect` matching exactly the fields
      `MollieClientListItem.tsx`/`MollieCustomerBadges.tsx` read, with a comment
      citing those files
- [ ] `mollieGetCustomersController`'s response no longer includes
      `consumerAccount`, `consumerBic`, `consumerName`, `city`, `country`,
      `postalCode`, `streetAndNumber`, `locale`, `preferredLanguage`
- [ ] Existing `mandates`/`subscriptions` narrowing on this same query is preserved
      as-is

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Server: `npm run test:mollie`
- [ ] Browser QA: Mollie clients list page still renders names/badges/mandate
      status correctly

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/conteroller.Mollie.ts`

**Estimated scope:** S

---

## Task 4: Narrow Client detail includes (branch/group) in `service.Clients.ts`

**Description:** `service.Clients.ts`'s `createClient` (~181), `getClientById`
(~263), and `updateClient` (~277) all use `include: { branch: true,
groupMemberships: { include: { group: true } } }`. `branch: true` leaks
`Branch.phone`/`email`/`description`/`createdAt`/`updatedAt`; `group: true`
leaks `DanceGroup.maxParticipants`/`lessonPriceCents`/`choreographerId` (an
internal FK)/`hallId`/`createdAt`/`updatedAt`. The client
(`client/src/entities/Client/model/types/client.ts`) declares `ClientBranch`
(id/name/city/address/isActive) and `ClientDanceGroup`
(id/name/style/level/branchId) — much narrower. Introduce one named
`clientDetailInclude` (parallel to the existing `clientListInclude` pattern
already used elsewhere) and reuse it across all three call sites instead of
duplicating the wide include three times.

**Acceptance criteria:**
- [ ] A single `clientDetailInclude` constant (or `clientBranchSelect` +
      `clientGroupSelect` composed together) matches `ClientBranch`/`ClientDanceGroup`
      field-for-field
- [ ] `createClient`, `getClientById`, `updateClient` all use it instead of the
      wide `include: { branch: true, ... group: true }`
- [ ] No duplicate select/include literals across the three functions

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Browser QA: Client details page renders branch and group info correctly;
      client create/edit flow still works

**Dependencies:** None

**Files likely touched:**
- `server/src/services/service.Clients.ts`

**Estimated scope:** S

---

## Task 5: Narrow `findLatestPayments`/`findPaymentLinks` Payment fields

**Description:** `controller.Clients.ts`'s `findLatestPayments` (~133) and
`findPaymentLinks` (~156) call `prisma.payment.findMany` with no `select` on
Payment scalars, leaking `refundedAmount`, `chargedBackAmount`, `adjustmentAt`,
`invoiceId`, and the `subscriptionId` FK. The client
(`client/src/pages/ClientsDetailsPage/ui/ClientPaymentBlock/types.ts`)'s
`ClientPayment` type declares none of those fields.

**Acceptance criteria:**
- [ ] Both functions use an explicit `select` matching `ClientPayment` exactly
- [ ] Response no longer includes `refundedAmount`, `chargedBackAmount`,
      `adjustmentAt`, `invoiceId`, `subscriptionId`

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Browser QA: Client details page's payment block still lists payments correctly

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/controller.Clients.ts`

**Estimated scope:** XS

---

## Task 6: Narrow `findSubscriptions` (Subscription + nested Mandate)

**Description:** `controller.Clients.ts`'s `findSubscriptions` (~172) has no
`select` on Subscription scalars (leaking `metadata`, `mandateId`, the
`customerId` FK) and uses `include: { mandate: true }` (full Mandate model,
leaking `mandateReference` and its own `customerId` FK) where the client's
`ClientSubscription.mandate` only reads `{ mollieId, status }`.

**Acceptance criteria:**
- [ ] Subscription-level fields are explicitly selected to match `ClientSubscription`
      in `client/src/pages/ClientsDetailsPage/.../types.ts`
- [ ] `mandate: true` is replaced with `mandate: { select: { mollieId: true, status: true } }`

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Browser QA: Client details page's subscriptions section still shows mandate status

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/controller.Clients.ts`

**Estimated scope:** XS

---

## Task 7: Narrow `findMandates` Mandate fields

**Description:** `controller.Clients.ts`'s `findMandates` (~187) has no
`select` on Mandate scalars, leaking `mandateReference` and the `customerId`
FK. The client's `ClientMandate` type reads
id/mollieId/status/method/signatureDate/createdAt/updatedAt/customer only.

**Acceptance criteria:**
- [ ] `findMandates` uses an explicit `select` matching `ClientMandate` exactly

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Browser QA: Client details page's mandates list still renders

**Dependencies:** None (can share a `clientMandateSelect` constant with Task 6 if convenient)

**Files likely touched:**
- `server/src/controllers/controller.Clients.ts`

**Estimated scope:** XS

---

## Task 8: Narrow `mollieGetCustomerFullInfo` (drop unused relations, select Payment)

**Description:** `conteroller.Mollie.ts`'s `mollieGetCustomerFullInfo` (~1391)
fetches `customer.findUnique` with `mandates: true, subscriptions: true,
payments: true`. The audit found `mandates`/`subscriptions` are entirely
unused — the client
(`client/src/.../useCustomerDataRefresh.ts:20-31`) fetches those from separate,
already-narrowed endpoints instead. `payments` uses the full `Payment` model,
but `usePaymentHistoryData.ts` only reads the 9-field `MolliePayment` type.

**Acceptance criteria:**
- [ ] `mandates` and `subscriptions` relations are dropped entirely from this query
- [ ] `payments` uses an explicit `select` matching `MolliePayment`
      (`client/src/entities/MollieClient/model/types/mollieClient.ts`)
- [ ] Re-verify via grep that no other consumer of this specific endpoint reads
      `.mandates`/`.subscriptions` before removing them

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Server: `npm run test:mollie`
- [ ] Browser QA: Mollie customer detail page still shows payment history correctly

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/conteroller.Mollie.ts`

**Estimated scope:** S

---

## Task 9: Narrow `mollieGetPaymentsController` Payment fields

**Description:** `conteroller.Mollie.ts`'s payments-list path (~1597,
`paymentsListPage` → `mollieGetPaymentsController`) calls `payment.findMany`
with no top-level `select`, leaking the same extra Payment fields as Task 8.
The client's list type `MolliePayment` (`molliePaymentTypes.ts:42-55`) is 11
fields.

**Acceptance criteria:**
- [ ] Explicit `select` matching the 11-field `MolliePayment` list type (reuse
      the select introduced in Task 8 if the shapes match, otherwise a
      list-specific variant with a comment explaining the difference)

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Server: `npm run test:mollie`
- [ ] Browser QA: Mollie payments list page still renders/sorts/filters correctly

**Dependencies:** Task 8 (share the select if the field sets match)

**Files likely touched:**
- `server/src/controllers/conteroller.Mollie.ts`

**Estimated scope:** XS

---

## Task 10: Narrow `mollieGetUpcomingSubscriptionsController` Subscription fields

**Description:** `conteroller.Mollie.ts`'s `mollieGetUpcomingSubscriptionsController`
(~1733) calls `subscription.findMany` with no top-level `select`, leaking
`mollieId`, `status`, `interval`, `metadata`, `startDate`, `mandateId`, `times`,
`customerId`, `createdAt`, `updatedAt`. `MolliePaymentsMatrixUpcoming.tsx`
(~12-60) only reads `id`, `nextPaymentDate`, `amountValue`, `amountCurrency`,
`description`, `mandate.status`, `customer.*`.

**Acceptance criteria:**
- [ ] Explicit `select` matching exactly what `MolliePaymentsMatrixUpcoming.tsx` reads

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Server: `npm run test:mollie`
- [ ] Browser QA: Upcoming-payments matrix widget still renders correctly

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/conteroller.Mollie.ts`

**Estimated scope:** XS

---

## Task 11: Drop unused raw `payment`/`subscription` objects from Mollie incidents

**Description:** `conteroller.Mollie.ts`'s incident builders
(`loadPaymentIncidents`/`loadSubscriptionIncidents`/`loadCombinedIncidents`,
~1998–2236, via `mapPaymentIncident`/`mapSubscriptionIncident`) embed the full
raw `payment`/`subscription` objects as `incident.payment`/`incident.subscription`
in the response. The client's `mollieIncidentTypes.ts` declares narrow
`IncidentPayment`/`IncidentSubscription` types, but a grep across
`MollieIncidents/*` shows neither `incident.payment` nor `incident.subscription`
is read anywhere in the UI — this is dead weight, not just an over-fetch, so
the fix is to select the narrow fields the declared types actually specify
(or drop the fields from the response object entirely if the declared types
turn out to be unused too — re-check before deciding).

**Acceptance criteria:**
- [ ] Re-confirm via grep that `incident.payment`/`incident.subscription` (or
      destructured equivalents) are unread in `client/src` immediately before
      editing
- [ ] If confirmed unused: either narrow the underlying Prisma query to the
      fields declared in `IncidentPayment`/`IncidentSubscription`, or drop the
      fields from the mapped incident object — pick whichever keeps the code
      simplest given what `mapPaymentIncident`/`mapSubscriptionIncident` need
      internally to compute other incident fields
- [ ] Incident list/detail behavior (dedupe, sorting, status derivation) is
      unchanged — only the unused payload shrinks

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Server: `npm run test:mollie`
- [ ] Browser QA: Mollie incidents page still lists/filters incidents correctly

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/conteroller.Mollie.ts`

**Estimated scope:** S

---

## Task 12: Narrow payment-reminder settings/template upsert responses

**Description:** `service.PaymentReminders.ts`'s settings upsert (~50) and
template upsert (~58), used by `controller.PaymentReminders.ts` (~14 and ~85),
call `.upsert` with no `select`. Settings leaks `id`/`updatedById`/`updatedAt`
beyond the 5-field `ReminderSettings` client type
(`useReminderSettings.ts:6-12`, which even has a comment noting the extra
fields today). Template leaks `id`/`updatedById`/`createdAt`/`updatedAt` beyond
the 3-field `ReminderTemplate` type (`useReminderTemplates.ts:8-12`).

**Acceptance criteria:**
- [ ] Settings upsert uses an explicit `select` matching `ReminderSettings`
- [ ] Template upsert uses an explicit `select` matching `ReminderTemplate`
- [ ] Remove the client-side comment in `useReminderSettings.ts` noting the
      extra fields, since it's no longer true after this fix

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Browser QA: Payment reminder settings/template admin forms still save and
      reload correctly

**Dependencies:** None

**Files likely touched:**
- `server/src/services/service.PaymentReminders.ts`
- `client/src/.../useReminderSettings.ts` (comment removal only)

**Estimated scope:** S

---

## Task 13: Narrow payment-reminder delivery list response

**Description:** `controller.PaymentReminders.ts`'s delivery list (~63)
calls `paymentReminderDelivery.findMany` with a nested `include` but no
top-level `select`, leaking `subscriptionId`, `sentAt`, `triggeredById`, and
fetching an unused `subscription.id`. `useReminderDeliveries.ts:8-22`'s
`ReminderDelivery` type omits all three.

**Acceptance criteria:**
- [ ] Explicit top-level `select` matching `ReminderDelivery` exactly
- [ ] Drop the unused nested `subscription.id` selection if nothing reads it

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Browser QA: Payment reminder deliveries admin list still renders

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/controller.PaymentReminders.ts`

**Estimated scope:** XS

---

## Task 14: Trim `deleteClient` response body

**Description:** `service.Clients.ts`'s `deleteClient` (~300), surfaced via
`controller.Clients.ts` (~367), returns the full deleted `Client` scalar row
(image, anamnesis, description, social, etc.) as `{ message, client:
deletedClient }`. `client/src/entities/Client/model/services/fetchClientById/deleteClientById.tsx`
never reads the `client` field — no reducer case uses it.

**Acceptance criteria:**
- [ ] Response trimmed to `{ message }` (or `{ message, client: { id } }` if a
      minimal id echo is useful for the calling code — check
      `deleteClientById.tsx` for whether it dispatches with the id from the
      response or from its own argument first)
- [ ] Re-grep `client/src` for the delete-client thunk's consumers to confirm
      nothing else expects a fuller `client` object

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Browser QA: deleting a client from the Clients page still works and
      updates the list

**Dependencies:** None

**Files likely touched:**
- `server/src/services/service.Clients.ts`
- `server/src/controllers/controller.Clients.ts`

**Estimated scope:** XS

---

## Task 15: Trim dance-group create/update response bodies

**Description:** `controller.Schedule.ts`'s group create (~266) and update
(~297) return the full `groupInclude` (`choreographer: true, hall: true,
branch: true`, full nested models). `useGroupFormSubmit.ts:44-60` never reads
the response (`await $apiPrivate.put(...)` with no destructure) — the UI
re-fetches via a separate GET afterward.

**Acceptance criteria:**
- [ ] Re-grep `client/src` for the group create/update thunk's callers to
      confirm the response is genuinely unread everywhere, not just in
      `useGroupFormSubmit.ts`
- [ ] If confirmed: trim the response to the minimal shape actually useful
      (e.g. `{ id: true }` or the scalar `DanceGroup` fields without the three
      full relations) rather than the full `groupInclude`

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Browser QA: creating and editing a dance group still works, list refreshes
      correctly afterward

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/controller.Schedule.ts`

**Estimated scope:** XS

---

## Task 16: Trim style-card create/update response bodies

**Description:** `controller.Schedule.ts`'s style-card create (~394) and
update (~400) return the full `DanceStyle` model with no `select`.
`useDanceStyleFormSubmit.ts:35-39` discards the response; the page calls
`loadStyles()` afterward instead.

**Acceptance criteria:**
- [ ] Re-grep to confirm the response is unread everywhere
- [ ] Trim the response (reuse the `styleCardSelect` from the already-merged
      `getStyleCards` fix (PR #77) if the same field set is still useful, or a
      minimal `{ id: true }` if truly nothing is read)

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Browser QA: creating and editing a dance style card still works

**Dependencies:** None (references the Task from the first-pass PR #77 for the
existing `styleCardSelect` constant)

**Files likely touched:**
- `server/src/controllers/controller.Schedule.ts`

**Estimated scope:** XS

---

## Task 17: Trim `mollieDeleteSubscriptionByIdController` response body

**Description:** `conteroller.Mollie.ts`'s `mollieDeleteSubscriptionByIdController`
(~2618) returns the full `subscription.update` result with no `select`, plus
the raw Mollie SDK `deletedSubscription` object. `useCancelSubscription.ts:13-28`
(the only active caller) discards the response entirely.

**Acceptance criteria:**
- [ ] Re-grep to confirm no active caller reads the response
- [ ] Trim to a minimal acknowledgement shape (e.g. `{ ok: true }`)
- [ ] Note (no action needed unless the user wants it addressed separately): the
      audit flagged a `deleteSubscriptionById.tsx` typed thunk that reads this
      response but appears to have no dispatch site (dead code) — out of scope
      for this task, mention it in the PR description for visibility

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Server: `npm run test:mollie`
- [ ] Browser QA: cancelling a Mollie subscription from the customer page still
      works and the UI updates correctly

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/conteroller.Mollie.ts`

**Estimated scope:** XS

---

## Task 18: Drop unused `parentInvoice` from `invoiceInclude`

**Description:** `controller.Invoices.ts`'s `invoiceInclude.parentInvoice`
(~128–195, used by every mutation: create/createPaid/confirmPaid/update/
updateStatus/recordPayment/createAdjustment) selects `{ id, number,
documentType }` on a relation that a grep of `client/src` shows zero hits for
— not even declared on the client `Invoice` type. This is the cleanest of the
over-fetch fixes: delete the relation from the shared include object entirely.

**Acceptance criteria:**
- [ ] Re-grep `client/src` for `parentInvoice` immediately before editing to
      confirm it's still unreferenced
- [ ] `parentInvoice` removed from `invoiceInclude` (single shared constant, so
      one edit fixes all the call sites listed above)
- [ ] Confirm no server-side code (PDF generation, email templates) reads
      `.parentInvoice` off the include result before removing it — if it does,
      this becomes a "keep server-internal, don't serialize" fix instead of an
      outright removal

**Verification:**
- [ ] Server: `npm run build` from `server/`
- [ ] Server: `npm run test:ci` (touches shared invoice include used broadly)
- [ ] Browser QA: invoice create/edit/status-change/adjustment flows still work

**Dependencies:** None

**Files likely touched:**
- `server/src/controllers/controller.Invoices.ts`

**Estimated scope:** S

---

## Task 19: Resolve `invoiceInclude.adjustments` (open question)

**Description:** `controller.Invoices.ts`'s `invoiceInclude.adjustments`
(~138–141, same call sites as Task 18) selects `{ id, number, documentType,
totalCents, status }` and is declared on the client `Invoice` type
(`client/src/pages/InvoicesPage/model/types.ts:113`), but a grep shows it's
never rendered by any component — only referenced in test mocks. Unlike Task
18, this field is intentionally typed on the client, so it may be forward-looking
scaffolding for unshipped UI rather than dead weight. **Do not remove it
unilaterally** — this task is to raise the question and get an explicit
decision (from the user, or from a code comment left in place) before acting,
per the plan's Open Questions section.

**Acceptance criteria:**
- [ ] Confirm with the user (or check for an open roadmap doc under the
      gitignored `docs/roadmap/` mentioning invoice adjustments UI) whether
      `adjustments` is planned or genuinely dead
- [ ] If dead: remove from `invoiceInclude` and from the client `Invoice` type
      in the same PR
- [ ] If planned: leave as-is, add a one-line comment on the client type
      referencing the plan/roadmap doc so a future audit doesn't re-flag it
- [ ] Either way, close out this task with a recorded decision, not a silent skip

**Verification:**
- [ ] Server: `npm run build` from `server/` (if changed)
- [ ] No verification needed if the decision is "leave as-is, add a comment"

**Dependencies:** None (can run independently of Task 18, though both touch the
same `invoiceInclude` object — do Task 18 first to avoid a rebase conflict on
the same lines)

**Files likely touched:**
- `server/src/controllers/controller.Invoices.ts`
- `client/src/pages/InvoicesPage/model/types.ts` (only if removed)

**Estimated scope:** XS

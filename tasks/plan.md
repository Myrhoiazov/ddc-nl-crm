# Implementation Plan: Mollie Subscription Deletion

## Overview

Add an explicit end-to-end flow for stopping a Mollie subscription from the
Mollie customer details page. In this domain "delete subscription" should mean
cancel the recurring subscription in Mollie and keep the local CRM record as
history with status `canceled`, not physically remove payment history. The flow
must be visible from the subscription row, require confirmation, call the
existing authenticated API, refresh the customer details, and avoid leaving the
UI in a stale state.

## Relevant Context

- The Mollie customer details page already renders subscriptions through
  `MollieSubscriptionList` and passes `EditSubscriptionDropdown` as the row
  action.
- The client already has a cancellation call:
  `DELETE /mollie/subscriptions/:subscriptionId` with request body
  `{ customerId: number }`.
- The server already cancels active subscriptions by looking up the local
  subscription by `mollieId`, validating the local `customerId`, calling Mollie
  with the customer's external `mollieId`, then updating the local subscription
  status to `canceled`.
- Mollie customer deletion must distinguish active obligations from historical
  records: `valid`/`pending` mandates and `active`/`pending`/`suspended`
  subscriptions block deletion, while `revoked`, `canceled`, and `completed`
  records are local history and should not keep an otherwise inactive customer
  undeletable.
- Canceled/completed subscriptions should remain visible for audit/history and
  can be restarted through the existing restart flow.
- Auth and CSRF must stay on the existing `$apiPrivate` and Express
  `isAuthenticated`/CSRF path.

## Task List

- [x] Task 1: Confirm and document the subscription delete contract
- [x] Task 2: Make the subscription row action discoverable
- [x] Task 3: Harden the client cancellation flow
- [x] Task 4: Harden the server cancellation endpoint
- [x] Task 4a: Allow Mollie customer deletion when only historical
      mandates/subscriptions remain
- [x] Task 5: Verify end-to-end behavior in browser QA

## Task 1: Confirm and document the subscription delete contract

**Description:** Define user-facing deletion semantics before changing UI:
stopping a subscription cancels future Mollie direct debit attempts and marks
the CRM subscription as `canceled`; it does not remove historical payments,
mandates, reminders, or subscription rows.

**Acceptance criteria:**
- [x] Product wording uses "Остановить подписку" or "Отменить подписку", not a
      misleading hard-delete label.
- [x] Active subscriptions are cancellable.
- [x] Canceled/completed subscriptions are not cancellable and keep the restart
      action.
- [x] Pending/suspended behavior remains unchanged: no cancel action is exposed
      because the API only cancels active subscriptions.

**Verification:**
- [x] Review existing Mollie status handling in UI and API.
- [ ] Code review confirms no hard deletion of subscription/payment history.

**Dependencies:** None

**Files likely touched:**
- `client/src/features/editSubscriptionDropdown/**`
- `client/src/entities/MollieSubscription/**`
- `server/src/controllers/conteroller.Mollie.ts`

**Estimated scope:** XS

## Task 2: Make the subscription row action discoverable

**Description:** Improve the customer-details subscription row action so the
admin can clearly find the stop/delete flow from the subscriptions list. The
current pencil-only affordance is easy to read as "edit only"; keep edit/restart
where needed, but make stop/cancel obvious for active subscriptions.

**Acceptance criteria:**
- [x] Each active subscription row exposes a clear stop/cancel action from the
      details page.
- [x] The row still shows edit for active subscriptions and restart for
      canceled/completed subscriptions.
- [x] The modal states do not overlap and remain keyboard/mouse accessible.
- [x] Empty/loading states remain unchanged.

**Verification:**
- [x] Client: targeted Jest for `EditSubscriptionDropdown` and/or
      `MollieCustomerDetails`.
- [ ] Client: `npm run lint:ts`.
- [ ] Browser QA: open `/mollie/customers/:id`, verify active row action,
      canceled row action, and modal copy at desktop viewport.

**Dependencies:** Task 1

**Files likely touched:**
- `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.tsx`
- `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/*`
- `client/src/entities/MollieSubscription/ui/MollieSubscriptionItem/*`

**Estimated scope:** S

## Task 3: Harden the client cancellation flow

**Description:** Ensure the UI sends the correct identifiers, handles success
and failure, closes the confirmation modal, and refreshes the customer details
so the stopped subscription immediately shows `canceled`.

**Acceptance criteria:**
- [x] The delete/cancel request uses the subscription external id
      (`subscription.id`, e.g. `sub_...`) in the URL.
- [x] The request body sends the local customer id from the route as a number.
- [x] Success closes the modal, shows a success/info toast, and reloads
      mandates/subscriptions/customer details.
- [x] Failure keeps the user on the page and shows a useful error message.
- [x] A missing subscription id does not fire a network request.

**Verification:**
- [x] Client: targeted Jest for active cancellation success/failure/no-id.
- [ ] Client: `npm run lint:ts` and `npm test` if shared behavior changes.

**Dependencies:** Task 2

**Files likely touched:**
- `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/useCancelSubscription.ts`
- `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/EditSubscriptionDropdown.test.tsx`
- `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.test.tsx`

**Estimated scope:** S

## Task 4: Harden the server cancellation endpoint

**Description:** Keep the existing route but make the API contract explicit and
well-tested: validate `customerId`, reject non-active/mismatched subscriptions,
cancel in Mollie, and persist the local status returned by Mollie or `canceled`.

**Acceptance criteria:**
- [x] `DELETE /api/v1/mollie/subscriptions/:subscriptionId` requires
      authenticated access and CSRF like other unsafe API calls.
- [x] Missing or invalid `customerId` returns `400`.
- [x] Unknown, mismatched, or non-active subscriptions return a 4xx response
      without calling Mollie.
- [x] Active subscription cancellation calls Mollie with external customer id
      and external subscription id.
- [x] Local CRM subscription status is updated to `canceled` and payment
      history is preserved.

**Verification:**
- [x] Server: add/extend Mollie controller/service tests around cancellation.
- [ ] Server: `npm run build`.
- [x] Server: `npm run test:mollie`.

**Dependencies:** Task 1

**Files likely touched:**
- `server/src/controllers/conteroller.Mollie.ts`
- `server/src/services/service.Mollie.ts`
- `server/src/routes/router.Mollie.ts`
- `server/src/services/service.MollieSync.test.ts` or a new controller/route
  test where appropriate

**Estimated scope:** S

## Task 5: Verify end-to-end behavior in browser QA

**Description:** Exercise the real UI flow against a running dev/prod-like CRM
with a customer that has active and canceled subscriptions.

**Acceptance criteria:**
- [ ] From `/mollie/customers/:id`, active subscription can be stopped through
      the UI.
- [ ] Network tab shows `DELETE /api/v1/mollie/subscriptions/sub_...`, not a
      malformed path.
- [ ] After success, the row remains visible with status `canceled`.
- [ ] Canceled subscription does not show another stop action and still exposes
      restart.
- [ ] Existing mandate and payment history blocks still render.

**Verification:**
- [x] Browser QA desktop viewport on Mollie customer details attempted.
- [ ] Optional mobile sanity check if layout/action placement changes.
- [x] Final root `npm run ci` before PR.

**Dependencies:** Tasks 2, 3, 4

**Files likely touched:**
- No new files expected beyond implementation and tests.

**Estimated scope:** S

## Verification Plan

- [x] Client targeted Jest:
      `npx jest src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/EditSubscriptionDropdown.test.tsx --config ./config/jest/jest.config.ts`
- [ ] Client targeted page test if customer-details behavior changes:
      `npx jest src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.test.tsx --config ./config/jest/jest.config.ts`
- [ ] Client checks: `npm run lint:ts`, `npm test`
- [ ] Server checks: `npm run build`, `npm run test:mollie`
- [ ] Root check: `npm run ci`
- [x] Browser QA on `/mollie/customers/:id` attempted; frontend mounted and
      redirected to login, but API `localhost:18080` was unavailable in the
      local dev process, so destructive Mollie cancellation/deletion was not
      submitted against live data.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Confusing "delete" with hard removal | High | Use cancellation semantics and keep historical rows/payments. |
| Wrong identifier sent from UI | High | Test URL uses `subscription.id` (`sub_...`) and body uses local customer id. |
| Local state stale after cancellation | Medium | Reload customer details after success and verify row status changes. |
| Mollie API succeeds but local update fails | High | Keep local update narrow, test server behavior, and log server errors. |
| Non-active subscription cancellation | Medium | Return 4xx without Mollie call; UI hides stop action for canceled/completed. |
| Auth/CSRF regression | High | Keep existing `$apiPrivate` and authenticated Express route. |

## Open Questions

- Should `pending` and `suspended` subscriptions be stoppable, or only
  `active` as the current API requires?
- Should the visible UI label be "Остановить" everywhere, or should the menu say
  "Удалить" while the modal explains that this cancels future payments?
- Should cancellation add an audit/event row in the CRM event history, or is the
  local `updatedAt` + status change sufficient for this release?

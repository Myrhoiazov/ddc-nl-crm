# Client `src` Test Coverage Plan

> **For agentic workers:** this is a batch-level coverage plan, not a strict
> bite-sized task plan — 526 source files makes a full per-file plan
> impractical. Each batch below is executed directly (no subagent dispatch
> per file): write the test, run `npm test -- <path>` from `client/`, fix,
> move to the next file in the batch, then run the full `npm test` for the
> batch before moving on.

**Goal:** Raise Jest test coverage of `client/src` from 11 test files
(526 source files total) to a meaningful baseline, working bottom-up through
Feature-Sliced Design layers (`shared → entities → features → widgets/pages`),
since lower layers are pure/cheap to test and higher layers depend on them.

**Architecture:** Follow existing conventions found in the 11 current tests:
`describe`/`test` blocks, React Testing Library (`render`/`screen`/`renderHook`)
for components and hooks, `DeepPartial<StateSchema>` casts for selector tests,
`dispatch`/`getState`/`extra` thunk-signature tests for Redux Toolkit
`createAsyncThunk` services.

**Tech Stack:** Jest 29 + jsdom, `@testing-library/react` 16 (has `renderHook`
built in — no separate hooks library), `@testing-library/jest-dom`. Config at
`client/config/jest/jest.config.ts`. Run via `npm test` from `client/`
(optionally `-- <pattern>` to scope a run, or `-- -t "name"` for one test).

## Global Constraints

- Do not restructure existing source files to make them "more testable"
  unless a test genuinely requires it — this is a coverage pass, not a
  refactor.
- No new test-only dependencies — `@testing-library/react`'s `renderHook`
  covers hook testing; do not add `@testing-library/react-hooks` or similar.
- Match existing test file placement: `Thing.test.ts(x)` beside `Thing.ts(x)`.
- Keep new UI text/strings out of tests where not needed; tests assert
  behavior, not translated copy (existing `react-i18next` mock returns keys).
- Respect FSD import rules (`@/` alias, public `index.ts` only) even in tests.

---

## Batch 1 — `shared/lib` (11 files, no existing tests besides classNames/addQueryParams) — DONE

11 test files added (`useDebounce`, `useThrottle`, `useHover`,
`useInitialEffect`, `useAppDispatch`, `styleColor`, `useInfiniteScroll`,
`useRefreshToken`, `ThemeContext`, `useTheme`, `DynamicModuleLoader`), 36
passing tests in this directory, full `client` suite green (22 suites / 67
tests), `eslint` clean.

Files: `useDebounce`, `useThrottle`, `useHover`, `useInitialEffect`,
`useAppDispatch`, `styleColor`, `useInfiniteScroll`, `useRefreshToken`,
`ThemeContext`, `useTheme`, `DynamicModuleLoader`.

Pure logic and small hooks — highest value per line, zero UI dependency for
most of them. `useRefreshToken` needs `$api` mocked; `DynamicModuleLoader`
needs a real `createReduxStore()` instance (has genuine `reducerManager`
add/remove behavior worth asserting, not worth mocking away).

## Batch 2 — `entities/*` model layer (selectors, reducers, services) — MOSTLY DONE

Covered: `Article`, `Client`, `MollieClient`, `User`, `Profile`,
`EmailAccount`, `EmailMessage` — 33 new test files, 103 passing tests in
`src/entities`, full client suite green (50 suites / 164 tests), `eslint`
and `tsc --noEmit` clean on all new files.

Deliberately skipped (re-check `ls client/src/entities` — this list is a
snapshot, not authoritative):
- `Transaction/model/slices/TransactionSlice.ts` — the only real reducer
  case (`template`) is an empty stub with no logic; nothing to assert.
  Revisit once it grows real `extraReducers`.
- Pure type-only entities with no `model/services|selectors|slice` files:
  `ClientStatus`, `Comment`, `Country`, `DanceGroup`, `Mandate`,
  `MandateMethod`, `MollieSubscription`, `Month`, `PaymentMethod`, `Role`,
  `Summary`, `TransactionCategory`, `TransactionType` — nothing but
  interfaces/enums, no logic to test.

Not yet started, still within Batch 2's scope for a future session: none —
every file with real logic under `entities/*/model` has a test as of this
plan update.

## Batch 3 — `features/*` services (Redux thunks) and `entities/*` services — DONE

Covered every `features/*/model` file with real logic (selectors, slices,
thunk services, plain async API wrappers) across all 21 feature slices:
`addClientForm`, `AddCommentForm`, `addMollieClientForm`,
`addMollieSubscriptionForm`, `addTransactionForm` (incl. its 3 enum-mapping
utils), `addUserForm`, `Auth`, `changePassword`, `createMollieMandateForm`,
`editClientDropdown`, `editMollieClientDropdown`, `editProfile`,
`editSubscriptionDropdown`, `editTransactionDropdown`, `editUserDropdown`,
`globalSearch`, `UI`. 52 new test files, 184 passing tests in
`src/features`. Full client suite: 99 suites / 333 tests, all green.
`eslint` and `tsc --noEmit` clean.

Not covered (no `model/` logic to test): `ClientSortSelector`,
`ClientTypeTabs`, `TransactionSortSelector`, `TransactionTypeTabs`,
`avatarDropdown` — these are presentational-only feature slices (UI folder
only), picked up by Batch 5 instead.

Gotcha hit repeatedly and worth remembering for Batches 4-5: `createAsyncThunk`
calls the test's `dispatch` mock itself with the auto-generated
`pending`/`fulfilled`/`rejected` actions, in addition to whatever the thunk
body dispatches explicitly. Asserting `expect(dispatch).not.toHaveBeenCalled()`
to prove "the thunk short-circuited before touching the API" is wrong even on
the short-circuit path — assert on the API mock (`extra.api.post` etc.) not
being called, and/or assert `dispatch` was not called with the *specific*
action in question (e.g. `not.toHaveBeenCalledWith(userActions.setAuthData(...))`).

## Batch 4 — Component render tests: `shared/ui`, `entities/*/ui` — DONE

Covered every component in both directories (31 new files in `shared/ui`,
55 new files across all `entities/*/ui`). Full client suite: 176 suites /
574 tests, all green, `eslint` and `tsc --noEmit` clean.

Two Jest config gaps found and fixed along the way (both belong to
`client/config/jest/`, not source code):
- `ResizeObserver` isn't implemented by jsdom, and `@headlessui/react`
  (`Menu`/`Listbox`/`Popover`, used by `Popups/components/*`) needs it —
  added a no-op polyfill in `setupTests.ts`.
- `.png`/`.jpg`/etc weren't mapped in `moduleNameMapper` (only `.svg` was),
  so any component importing a raster image (`CommentCard`, `LoginForm`,
  `Navbar`) crashed Jest with a syntax error. Added `fileMock.js` +
  a mapper entry, mirroring the existing `.svg` → empty-component approach.

Patterns that came up repeatedly, worth reusing in Batch 5:
- Redux-connected components (`ClientDetails`, `MollieClient/ClientDetails`,
  `ArticleDetails`) use `createReduxStore()` from `@/app/providers/StoreProvider`
  wrapped in `<Provider>`, with `@/shared/api/api` fully `jest.mock`'d
  (`$api`/`$apiPrivate`/`injectStore`/`csrfActions`) so the thunk's real
  `extra.api`/`extra.apiPrivate` resolve to controllable mocks — then
  `await screen.findByText(...)` for the async-loaded content.
- The `react-i18next` mock's `t()` returns the raw key unmodified — it does
  **not** interpolate `{{placeholders}}**. Assertions on interpolated
  strings must match the literal un-interpolated key text, not the
  "rendered" text a real i18n setup would produce.
- A found-not-fixed bug: `TransactionListItem.tsx` compares
  `transaction.type === 'INCOME'` (a string literal) against
  `TransactionType.INCOME`, whose actual enum value is `'Приход'` — so the
  income/expense branch is permanently stuck on "expense". Test file has a
  comment explaining this; worth a real fix in a separate, non-coverage PR.

## Batch 5 — `features/*/ui`, `widgets/*`, `pages/*`

Same render-test pattern as Batch 4, but these commonly need
`DynamicModuleLoader`-mounted slices and a real/mocked store — follow the
existing `Sidebar.test.tsx` and `GlobalSearch.test.tsx` for the wrapping
pattern (store + router + i18n provider setup) already established in this
repo.

---

## Batch 5 — `features/*/ui` — DONE, `widgets`/`pages` in progress

`features/*/ui` fully covered: 21 new test files across `ClientSortSelector`,
`TransactionSortSelector`, `TransactionTypeTabs`, `ClientTypeTabs`,
`avatarDropdown`, `Auth` (`LoginForm`, `TwoFactorForm`), edit*Dropdown x4,
`AddCommentForm`, `addUserForm`, `changePassword`, `addClientForm`,
`addMollieClientForm`, `addMollieSubscriptionForm`, `addTransactionForm`,
`createMollieMandateForm`, `editMollieClientDropdown` (dropdown + both
add/edit `MollieClientForm`s). Full client suite: 197 suites / 654 tests,
`eslint` + `tsc --noEmit` clean.

Deliberately skipped — thin `Modal` + `Suspense` + lazy-import wrappers with
zero conditional logic (`*FormModal.tsx`, `LoginModal.tsx`): composition of
already-tested pieces (`Modal` itself is tested in Batch 4; the real form
inside is tested directly). Not skipped: any dropdown/form component with
actual state, validation, or a thunk dispatch — those all got real tests.

Patterns worth carrying into `widgets`/`pages`:
- Thunks that only proceed with a non-empty form (`if (!formData) return
  rejectWithValue(...)`) need the UI test to fill at least one field before
  clicking submit in the "success" case, and a **separate** "empty form"
  case asserting the API mock was never called — clicking submit on an
  untouched form always hits the rejection path, not success.
- `Select`'s visible `label` prop is a plain `<Text>`, not a `<label
  htmlFor>` — `getByLabelText` never finds it. Query by placeholder, or by
  finding a known `<option>` and calling `.closest('select')`.
- Components that use `Dropdown`/`Popover`/`AppLink` need `<MemoryRouter>`
  even when the component itself does no routing — `AppLink` throws
  ("Cannot destructure 'basename'...") without router context.
- `$apiPrivate`/`$api` mocked via `jest.mock('@/shared/api/api', ...)` must
  export every named export the module under test imports from it
  (`injectStore`, `csrfActions`, etc.) even if unused by that particular
  test, or `createReduxStore()` throws at import time.
- Wrap manual `store.dispatch(...)` calls (used to seed state a component
  doesn't set through its own UI, e.g. a `mandateId`/`id` normally filled by
  a fetch) in `act(...)` to avoid act-warning noise.

`widgets` — DONE: 10 new test files (`Sidebar` sub-components, `Navbar`,
`Page`, `ErrorPage`, `ClientFilters`, `TransactionFilters`, `UserFilters`,
`MollieClientAction`). Full client suite: 206 suites / 688 tests. Skipped
`widgets/PageLoader` — pure barrel re-export of `shared/ui/PageLoader`, no
logic. New pattern: a filter widget's "click add → modal opens" test needs
the *same* Redux `Provider` (`createReduxStore()` + `@/shared/api/api`
mocked) as the feature-level form test, because clicking through actually
mounts the real (lazy-loaded) form component, not just the thin Modal
shell — `MemoryRouter` alone isn't enough once you interact past the
trigger button.

Only `pages` remains (~39 files with real logic; ~39 more are trivial
`.async.tsx` lazy-import wrappers, skipped like the `.async.ts` files in
`features/*/ui`).

## `pages` — in progress

Done so far: `HomePage`, `CrmSettingsPage`, `OrganizationBrandsPage`,
`DanceStylesPage`, `NotFoundPage`, `AboutPage`, `ContentHubPage`,
`DanceSchoolPage` (trivial placeholder smoke tests), `ProfilePage` (+
`ProfilePageHeader`, `ActiveSessions`), `AuthPage/LoginPage`,
`PaymentRemindersPage`, `SettingsPage`, `StudentsPage`,
`ScheduleSettingsPage` (`GroupCard`, `AddHallModal`, `CreateGroupModal`,
`ScheduleSettingsPage`), `ChoreographersPage` (`ChoreographerCard`,
`ChoreographerModal`, `ChoreographersPage`), `BranchesPage` (`BranchCard`,
`BranchModal`, `BranchesPage`), `ArticlesPage`, `ArticleDetailsPage`,
`ClientsPage` (model: `fetchClientsList`, `initClientsPage`, selectors,
slice, `useClientFilters` hook; UI: `ClientsPage`, `ClientsPageFilters`,
`FiltersContainer`) and `ClientsDetailsPage` (model: `addCommentsForClient`,
`fetchCommentsByClientId`, selectors, slice; UI: `ClientsDetailsPage`,
`HeaderDetails`, `EditClientModal`, `ClientPaymentBlock`, `ClientEmailBlock`,
`ClientDetailsComments`, `PaymentLinkModal`). Full client suite as of
`ClientsPage`/`ClientsDetailsPage`: 252 suites / 847 tests, `eslint` +
`tsc --noEmit` clean.

`TransactionsPage` — DONE: model (`fetchTransactionsList`,
`fetchTransactionsSummary`, `initTransactionsPage`, both selector files,
slice, `useTransactionFilters` hook) + UI (`FiltersContainer`,
`TransactionsPage`). Full client suite: 261 suites / 875 tests, `eslint` +
`tsc --noEmit` clean. Confirmed (again) the pre-existing
`TransactionListItem` income/expense bug — `transaction.type === 'INCOME'`
literal vs the real enum value `'Приход'` — still not fixed, out of scope.

`InvoicesPage` — DONE: `InvoiceActionModal` (all 5 sub-forms:
record-payment, confirm-paid, create-credit, create-debit, cancel),
`CreateInvoiceModal` (client/group prefill, validation, create, edit
prefill), `InvoicesPage` (list fetch, empty state, status filter, search,
issue/status update, action-modal payment flow, create-modal open). Full
client suite: 264 suites / 896 tests, `eslint` + `tsc --noEmit` clean.

`CompanyPage` — DONE: nav-link layout/`Outlet` composition (title, links,
active-link state, matched child route). `EmailPage` — DONE:
`ComposeEmailModal` (validation, send wiring — `EmailComposer` mocked since
it already has its own entity-level test), `EmailAccountsPanel` (empty
state, account list, sync/delete, add-account form + error), `EmailPage`
itself (admin gate, account/message load, tab switch, compose-button
gating, message selection — `@/entities/EmailAccount` and
`@/entities/EmailMessage` mocked wholesale since their services already
have dedicated tests). Full client suite: 268 suites / 914 tests, `eslint`
+ `tsc --noEmit` clean.

`MolliePage` — DONE: model (`fetchMollieClientsList`, `fetchAllMandates`,
`fetchAllSubscriptions`, `mollieClientsPageSelectors` — note it reads two
distinct slice keys, `mollieClientsPage` for the list page and
`customerDetailsMandates` for the details page, both backed by the same
`MollieClientsDetailsPageSchema`/reducer — and the slice itself) + UI
(`MolliePage` tab layout, `MollieMain` org profile, `MollieCustomers` list
+ filters + pagination + CSV export, `MollieCustomerDetails` — client +
mandates + subscriptions + student-links manager + payment history,
`MolliePayments`, `MollieIncidents`, `MolliePaymentsMatrix` — matrix table
+ upcoming subscriptions + sync). Full client suite: 280 suites / 965
tests, `eslint` + `tsc --noEmit` clean.

`SchedulePage` — DONE: week grid render/fetch, empty state, choreographer/
day filters, cross-links to dance styles/choreographers/branches, week
navigation. One gotcha specific to this file: the page's own translated
summary text (`t('Период: {{start}} — {{end}}', {...})`) never changes
under test since the `react-i18next` mock doesn't interpolate — assert on
the untranslated `<input type="date">` value instead when a test needs to
observe date-driven state.

## `pages` — COMPLETE

All real-logic files across every `pages/*` directory now have tests.
`.async.tsx` lazy-import wrappers remain deliberately untested throughout
(same rationale as `features/*/ui`: zero conditional logic, pure
`lazy(() => import(...))`). Final full-suite verification: **281 test
suites / 971 tests, all passing**, `eslint` and `tsc --noEmit` clean across
the entire `client/src` tree.

This closes out the whole coverage plan: `shared → entities → features →
widgets → pages`, bottom-up through every FSD layer, starting from 11
pre-existing test files up to the current count. No commit or PR has been
made — per project rules, that only happens when explicitly requested.

New patterns from the `ClientsPage`/`ClientsDetailsPage` batch:
- `createReduxStore(undefined, { sliceKey: sliceReducer })` — when the
  slice reducer's state type is built via `createEntityAdapter().getInitialState<Schema>()`,
  TS sees `EntityState<T, string> & Schema` as distinct from the plain
  `Schema` type in `StateSchema`, even though structurally identical. Cast
  the second arg `as never` rather than fighting the generic variance.
  Correspondingly, `store.getState().sliceKey` needs a `!` non-null
  assertion since the slice is optional on `StateSchema`.
- `createAsyncThunk` invoked directly (`thunk(arg)(dispatch, getState,
  extra)`, bypassing a real store) dispatches its own `pending`/`fulfilled`/
  `rejected` through the *same* `dispatch` you passed in — this applies to
  thunks that themselves call `dispatch(otherThunk(...))` internally too.
  Asserting `dispatch` was called with a nested thunk's return value by
  reference never matches (each call to a `createAsyncThunk` creator
  returns a fresh function). Fix: `jest.mock` the nested thunk's module to
  return a plain, comparable action object, then assert
  `toHaveBeenCalledWith` that object.
- A component reachable only through a sibling's `DynamicModuleLoader` in
  production (e.g. `ClientDetailsComments`' `addCommentsForClient` thunk
  reads `state.clientDetails.data`, normally populated by the neighboring
  `ClientDetails` entity component) doesn't need that neighbor's slice
  mounted for an isolated unit test — `jest.mock` the thunk itself instead
  of wiring up unrelated cross-slice state.
- `t('text')` imported directly from `i18next` (not via `useTranslation()`)
  renders empty in tests, since no i18n instance is initialized — query the
  element by role/position instead of by name in that case
  (`AddCommentForm`'s send button).
- A `<Link>` anywhere in the render tree (even several components deep,
  e.g. `ClientPaymentBlock`'s payer links, `CommentList`'s author links)
  needs `<MemoryRouter>`, not just a mocked store.
- Fire-and-forget async handlers (delete/reload/toast chains) that outlive
  the test's last assertion cause act() warnings even when the test
  otherwise passes — `await waitFor(() => expect(toast.success)...)` (or
  equivalent) at the end of the test to let the promise chain settle before
  the test function returns.

## Execution Notes

- After each batch, run the full `npm test` (from `client/`) to confirm no
  regressions before starting the next batch.
- This plan is intentionally re-scoped at each batch boundary: re-`ls` the
  target directory at batch start rather than trusting file lists above,
  since the codebase moves.
- Do not chase 100% coverage on generated/trivial files (barrel `index.ts`
  re-exports, pure type files, Storybook `*.stories.*`) — these carry no
  logic to test.

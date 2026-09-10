# Skylos Findings Report

**Grade: D (66/100)** — Phase A (informational, non-blocking)

Generated: 2026-09-10

---

## SKY-C304 — Function too long (>50 lines)

| File | Lines |
|---|---|
| `client/src/entities/Profile/model/slice/profileSlice.test.ts:6` | 110 |
| `client/src/features/editMollieClientDropdown/model/slices/mollieClientSlice.test.ts:7` | 103 |
| `client/src/pages/TransactionsPage/model/slices/transactionsPageSlice.test.ts:8` | 103 |
| `client/src/entities/EmailMessage/model/services/emailMessageApi.test.ts:20` | 98 |
| `client/src/pages/InvoicesPage/ui/CreateInvoiceModal/CreateInvoiceModal.test.tsx:46` | 92 |
| `client/src/pages/MolliePage/ui/MolliePayments/MolliePayments.test.tsx:43` | 88 |
| `client/src/pages/InvoicesPage/ui/InvoiceActionModal/InvoiceActionModal.test.tsx:33` | 85 |
| `client/src/features/editSubscriptionDropdown/ui/EditSubscriptionDropdown/EditSubscriptionDropdown.test.tsx:36` | 84 |
| `client/src/pages/ClientsPage/model/slices/clientsPageSlice.test.ts:6` | 83 |
| `client/src/pages/InvoicesPage/ui/InvoicesPage/InvoicesPage.test.tsx:73` | 83 |
| `client/src/pages/MolliePage/ui/MollieIncidents/MollieIncidents.test.tsx:52` | 78 |
| `client/src/features/addMollieSubscriptionForm/model/slices/addMollieSubscriptionSlice.test.ts:7` | 78 |
| `client/src/pages/MolliePage/model/slices/mollieClientsDetailsPageSlice.test.ts:6` | 76 |
| `client/src/shared/lib/hooks/useInfiniteScroll/useInfiniteScroll.test.ts:5` | 74 |
| `client/src/pages/MolliePage/model/services/fetchMollieClientsList/fetchMollieClientsList.test.ts:13` | 72 |
| `client/src/pages/MolliePage/ui/MollieCustomers/MollieCustomers.test.tsx:40` | 71 |
| `client/src/features/addClientForm/ui/ClientForm/ClientForm.test.tsx:42` | 68 |
| `client/src/features/createMollieMandateForm/model/slices/createMollieMandateFormSlice.test.ts:7` | 68 |
| `client/src/pages/ScheduleSettingsPage/ui/CreateGroupModal/CreateGroupModal.test.tsx:25` | 66 |
| `client/src/features/changePassword/model/services/changePasswordThunk.test.ts:12` | 65 |
| `client/src/features/globalSearch/ui/GlobalSearch/GlobalSearch.test.tsx:46` | 65 |
| `client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/PaymentRemindersPage.test.tsx:67` | 65 |
| `client/src/pages/MolliePage/ui/MollieCustomerDetails/MollieCustomerDetails.test.tsx:56` | 64 |
| `client/src/features/addClientForm/model/slices/clientSlice.test.ts:6` | 63 |
| `client/src/features/Auth/ui/TwoFactorForm/TwoFactorForm.test.tsx:33` | 62 |
| `client/src/pages/SchedulePage/ui/SchedulePage/SchedulePage.test.tsx:65` | 62 |
| `client/src/shared/ui/Modal/Modal.test.tsx:4` | 61 |
| `client/src/pages/TransactionsPage/model/services/fetchTransactionsList/fetchTransactionsList.test.ts:35` | 61 |
| `client/src/features/changePassword/ui/ChangePasswordModal/ChangePasswordModal.test.tsx:30` | 61 |
| `client/src/widgets/Page/Page.test.tsx:29` | 60 |
| `client/src/pages/EmailPage/ui/EmailAccountsPanel/EmailAccountsPanel.test.tsx:31` | 60 |
| `client/src/pages/ScheduleSettingsPage/ui/ScheduleSettingsPage/ScheduleSettingsPage.test.tsx:69` | 60 |
| `client/src/entities/Transaction/ui/TransactionListItem/TransactionListItem.test.tsx:6` | 60 |
| `client/src/features/addTransactionForm/model/slices/addTransactionFormSlice.test.ts:5` | 59 |
| `client/src/entities/Profile/model/services/updateProfileData/updateProfileData.test.tsx:23` | 59 |
| `client/src/pages/TransactionsPage/lib/hooks/useTransactionFilters.test.tsx:33` | 57 |
| `client/src/features/TransactionSortSelector/ui/TransactionSortSelector/TransactionSortSelector.test.tsx:6` | 56 |
| `client/src/pages/ChoreographersPage/ui/ChoreographerModal/ChoreographerModal.test.tsx:19` | 54 |
| `client/src/features/Auth/model/services/loginByUsername/loginByUsername.test.ts:21` | 54 |
| `client/src/entities/EmailMessage/ui/EmailComposer/EmailComposer.test.tsx:4` | 53 |
| `client/src/features/Auth/model/slice/authSlice.test.ts:5` | 53 |
| `client/src/pages/MolliePage/ui/MolliePaymentsMatrix/MolliePaymentsMatrix.test.tsx:82` | 53 |
| `client/src/features/addUserForm/model/slices/newUserSlice.test.ts:6` | 52 |
| `client/src/pages/HomePage/ui/HomePage.test.tsx:57` | 52 |
| `client/src/pages/TransactionsPage/model/selectors/transactionPageSelectors.test.ts:22` | 51 |

---

## SKY-D216 — Potential SSRF (variable URL)

| File | Issue |
|---|---|
| `server/src/controllers/conteroller.Mollie.ts:3080` | axios call with variable URL |
| `server/src/routes/router.Health.test.ts:20` | fetch() with variable URL |

---

## SKY-D230 — Open Redirect

| File | Issue |
|---|---|
| `server/src/controllers/conteroller.Mollie.ts:351` | res.redirect() with variable argument |
| `server/src/controllers/conteroller.Mollie.ts:411` | res.redirect() with variable argument |

---

## SKY-D248 — Hardcoded Internal URL

| File | Issue |
|---|---|
| `client/webpack.config.ts:31` | Hardcoded internal URL |
| `server/src/app.ts:27` | Hardcoded internal URL |
| `server/src/controllers/conteroller.Mollie.ts:410` | Hardcoded internal URL |
| `server/src/middlewares/middleware.Csrf.ts:11` | Hardcoded internal URL |
| `server/src/services/service.Files.ts:7` | Hardcoded internal URL |
| `server/src/services/service.InvoiceDelivery.ts:43` | Hardcoded internal URL |
| `server/src/services/service.PaymentReminders.ts:11` | Hardcoded internal URL |

---

## SKY-D252 — Cookie Security Flags

| File | Issue |
|---|---|
| `server/src/controllers/conteroller.Mollie.ts:343` | secure=unknown |
| `server/src/controllers/controller.Auth.ts:116` | secure=unknown |
| `server/src/controllers/controller.Auth.ts:175` | secure=unknown |
| `server/src/controllers/controller.Auth.ts:252` | secure=unknown |
| `server/src/controllers/controller.Auth.ts:390` | secure=unknown |

---

## SKY-D253 — Timing-Unsafe Comparison

| File | Issue |
|---|---|
| `client/src/features/changePassword/model/services/changePasswordThunk.ts:23` | Timing-unsafe comparison of 'newPassword' |
| `server/scripts/reset-user-password.ts:66` | Timing-unsafe comparison of 'password' |

---

## SKY-D327 — Potential Data Exfiltration

| File | Issue |
|---|---|
| `server/src/controllers/conteroller.Mollie.ts:364` | HTTP request sends process.env data to external destination |
| `scripts/deploy-docker.sh:66` | Shell command may exfiltrate env vars or secrets |

---

## SKY-E003 — Unused File (not imported)

| File |
|---|
| `client/config/jest/__mocks__/react-i18next.ts` |
| `client/config/jest/fileMock.js` |
| `client/config/jest/jestEnptyComponent.tsx` |
| `client/config/jest/setupTests.ts` |
| `client/config/storybook/preview.ts` |
| `client/stylelint.config.mjs` |
| `client/webpack.config.ts` |
| `server/prisma.config.ts` |
| `server/prisma/seed.ts` |
| `client/src/entities/Article/ui/ArticleDetails/ArticleDetails.stories.tsx` |
| `client/src/entities/Article/ui/ArticleList/ArticleList.stories.tsx` |
| `client/src/entities/Article/ui/ArticleListItem/ArticleListItem.stories.tsx` |
| `client/src/entities/Article/ui/ArticleViewSelector/ArticleViewSelector.stories.tsx` |
| `client/src/entities/Client/ui/ClientViewSelector/ClientViewSelector.stories.tsx` |
| `client/src/entities/ClientStatus/ui/ClientStatusSelect/RoleSelect.stories.tsx` |
| `client/src/entities/Comment/ui/CommentCard/CommentCard.stories.tsx` |
| `client/src/entities/Comment/ui/CommentList/CommentList.stories.tsx` |
| `client/src/entities/Country/ui/CountrySelect/CountrySelect.stories.tsx` |
| `client/src/entities/MollieSubscription/ui/MollieSubscriptionCard/MollieSubscriptionCard.stories.tsx` |
| `client/src/entities/Month/ui/MonthSelect/MonthSelect.stories.tsx` |
| `client/src/entities/PaymentMethod/ui/PaymentMethod/TransactionSelect.stories.tsx` |
| `client/src/entities/Role/ui/RoleSelect/RoleSelect.stories.tsx` |
| `client/src/entities/Summary/ui/SummaryCards/Summary.stories.tsx` |
| `client/src/entities/TransactionCategory/ui/TransactionCategorySelect/TransactionCategory.stories.tsx` |
| `client/src/entities/TransactionType/ui/TransactionSelect/TransactionSelect.stories.tsx` |
| `client/src/features/Auth/ui/LoginForm/LoginForm.stories.tsx` |
| `client/src/features/ClientTypeTabs/ui/ClientTypeTabs/ArticleTypeTabs.stories.tsx` |
| `client/src/features/TransactionTypeTabs/ui/TransactionTypeTabs/TransactionTypeTabs.stories.tsx` |
| `client/src/features/addMollieSubscriptionForm/ui/AddMollieSubscriptionForm/AddMollieSubscriptionForm.stories.tsx` |
| `client/src/features/addTransactionForm/ui/AddTransactionForm/AddTransactionForm.stories.tsx` |
| `client/src/features/avatarDropdown/ui/AvatarDropdown/AvatarDropdown.stories.tsx` |
| `client/src/features/createMollieMandateForm/ui/CreateMollieMandateForm/CreateMollieMandateForm.stories.tsx` |
| `client/src/shared/config/storybook/RouterDecorator/RouterDecorator.tsx` |
| `client/src/shared/config/storybook/StyleDecorator/StyleDecorator.ts` |
| `client/src/shared/ui/AppImage/AppImage.stories.tsx` |
| `client/src/shared/ui/AppLink/AppLink.stories.tsx` |
| `client/src/shared/ui/Avatar/Avatar.stories.tsx` |
| `client/src/shared/ui/Button/Button.stories.tsx` |
| `client/src/shared/ui/Card/Card.stories.tsx` |
| `client/src/shared/ui/Code/Code.stories.tsx` |
| `client/src/shared/ui/Input/Input.stories.tsx` |
| `client/src/shared/ui/Loader/Loader.stories.tsx` |
| `client/src/shared/ui/Modal/Modal.stories.tsx` |
| `client/src/shared/ui/Select/Select.stories.tsx` |
| `client/src/shared/ui/Skeleton/Skeleton.stories.tsx` |
| `client/src/shared/ui/Text/Text.stories.tsx` |
| `client/src/shared/ui/ThemeSwitcher/ui/ThemeSwitcher.stories.tsx` |
| `client/src/widgets/ErrorPage/ui/ErrorPage.stories.tsx` |
| `client/src/widgets/Navbar/ui/Navbar.stories.tsx` |
| `client/src/widgets/Page/Page.stories.tsx` |
| `client/src/widgets/Sidebar/ui/Sidebar/Sidebar.stories.tsx` |

---

## SKY-L007 — Empty Catch Block

| File | Issue |
|---|---|
| `client/webpack.config.ts:9` | Empty catch block silently discards an error |

---

## SKY-Q402 — await Inside Loop

| File | Line(s) |
|---|---|
| `server/prisma/seed.ts` | 35 |
| `server/src/controllers/controller.Invoices.ts` | 879, 880 |
| `server/src/services/service.EmailImap.ts` | 222 |
| `server/src/services/service.InvoiceDelivery.ts` | 272 |
| `server/src/services/service.MollieSync.ts` | 204, 320, 386, 391, 404, 511, 529 |
| `server/src/services/service.PaymentReminders.ts` | 298 |

---

## SKY-S101 — High-Entropy Value (potential secret)

| File | Entropy |
|---|---|
| `server/src/controllers/controller.Clients.ts:333` | 4.23 |

---

## SKY-T105 — JSON.parse Without Runtime Validation

| File | Issue |
|---|---|
| `server/src/controllers/controller.Invoices.ts:286` | JSON.parse() asserted as `Prisma.InputJsonValue` without validation |

---

## SKY-U001 — Unused Function

| File | Function |
|---|---|
| `client/config/jest/__mocks__/react-i18next.ts:1` | useTranslation |
| `client/config/jest/jestEnptyComponent.tsx:2` | jestEnptyComponent |
| `client/config/jest/setupTests.ts:28` | disconnect |
| `client/config/jest/setupTests.ts:29` | takeRecords |

---

## SKY-U003 — Unused Variable

| File | Variable |
|---|---|
| `client/config/jest/jest.config.ts:9` | config |
| `client/config/storybook/main.ts:3` | config |
| `client/src/pages/ProfilePage/ui/Sidebar.stories.tsx:11` | Light |
| `client/src/shared/ui/Button/Button.stories.tsx:29` | Clear |
| `client/src/shared/ui/Button/Button.stories.tsx:14` | Outline |
| `client/src/shared/ui/Input/Input.stories.tsx:4` | meta |
| `client/src/shared/ui/Input/Input.stories.tsx:12` | Primary |
| `client/src/widgets/Navbar/ui/Navbar.stories.tsx:11` | Light |
| `client/src/widgets/Sidebar/ui/Sidebar/Sidebar.stories.tsx:11` | Light |
| `server/src/services/service.Files.ts:6` | isDev |

---

## SKY-U004 — Unused Class

| File | Class |
|---|---|
| `client/src/app/providers/ErrorBoundary/ui/ErrorBoundary.tsx:12` | ErrorBoundary |

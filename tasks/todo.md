# Todo: Skylos Refactoring — Waves 16+ (актуальный прогон 2026-09-05)

> Статус: волны 9–15 влиты в develop (PR #40, #42) и удалены. `main` синхронизирован
> с `develop` (PR #45, merge commit `a06ce26`). Свежий прогон skylos: **283 находки**
> (`/tmp/skylos_planning.txt`). Открытая работа — только `SKY-C304` (158) + `SKY-Q301`
> (17) = **175**, из них ~108 задокументированы как осознанное решение / false positive
> (E003 — Storybook-файлы, Q402 — сознательно последовательные циклы, U-категории —
> конфиги, D-категории — by design и т.д.). Новые волны — отдельными ветками
> `fix/skylos-*`, squash-merge в develop.

## Wave 16 — Server: контроллеры C304/Q301 (HIGH) ✅
- [x] Task 16.1: `conteroller.Mollie.ts` — 7 находок C304: `mollieGetCustomersController` (:1189),
      `webhookMollieController` (:513), `createCustomerController` (:657),
      `mollieGetPaymentIncidentsController` (:2106), `mollieUpdateSubscriptionController` (:2554),
      `mollieRestartSubscriptionController` (:2612), `mollieRevokeMandateController` (:2707) —
      behavior-preserving extract, `test:mollie` 7/7
- [x] Task 16.2: `controller.Invoices.ts` — 5 C304 (`createInvoice` :464, `confirmPaidInvoice` :552,
      `updateInvoice` :609, `updateInvoiceStatus` :768, `createAdjustmentDocument` :959) + 1 Q301 (:959, cc11)
- [x] Task 16.3: `controller.Users.ts` — 1 Q301 (:101; валидация вынесена в `validateUpdateUserRequest`)
- [x] Task 16.4: одиночные контроллеры C304: `controller.Auth.ts` (`login` :121), `controller.Clients.ts`
      (`getClientPaymentSummaryController`), `controller.Instagram.ts` (`instagramReceiveMessageController`),
      `controller.Profiles.ts` (`changePasswordController`), `controller.Schedule.ts` (`getGroupManagementStats` :140)
- [x] Checks: `tsc --noEmit` 0, `npm run build` ✅, `npm run test:ci` 5 доменов 51 тест / 0 fail

## Wave 17 — Server: сервисы C304 (MEDIUM) ✅
- [x] Task 17.1: `service.Search.ts` (:183, 51; вынесен `queryPaymentRows`), `service.MolliePaymentInvoicePdf.ts` (:51, 62; вынесены `buildMollieInvoiceNote`, `buildMollieInvoiceItem`)
- [x] Task 17.2: `service.InvoiceMollie.ts` (:40, 74; вынесены `loadInvoiceForReconciliation`, `resolveReconcilePaidAt`, `persistReconciliation`), `service.InvoiceDelivery.ts` (:127, 64; вынесены `loadSendableInvoice`, `prepareEmailDelivery`, `markDeliveryFailed`), `service.EmailSmtp.ts` (:61, 51; вынесены `buildEmailHeaders`, `persistSentEmail`), `service.Clients.ts` (:114, 52; вынесены `assertCustomerExists`, `upsertCustomerClientLink`)
- [x] Checks: `tsc --noEmit` 0; `test:email` 11/0, `test:search` 6/0, `test:payment-reminders` 10/0

## Wave 18 — Client production: топ-компоненты C304 (HIGH/MEDIUM)
- [x] Task 18.1: `InvoiceListItem.tsx` (:57, 172 строки) — секции вынесены: `Amounts`, `ActionButtons`, `MolliePaymentsSection`, `MolliePaymentLinksSection`, `PaymentsSection`, `DeliveriesSection`, `HistorySection`; eslint ✅, tsc src 0
- [x] Task 18.2: `GlobalSearch.tsx` (:110, 163 строки; Q301 cc16) — хуки `useDebouncedGlobalSearch`, `useSearchKeyboard`, `useSearchDismiss`; jest 7/7, eslint 0
- [x] Task 18.3: `ClientPaymentBlock.tsx` (:21, 136) — вынесен `Content`; `ClientPaymentBlockModals.tsx` (:52, 123) — модалки `MandateModal`, `SubscriptionModal`, `EditSubscriptionModal`, `RestartSubscriptionModal` + `ManageActions`; jest 5/5, eslint 0
- [x] Task 18.4: `GroupStatisticsSection.tsx` (:30, 134; :50, 109) — вынесены `StudentList`, `StudentGroupCard`, `BranchGroupsView`, `BranchCard`; jest 18/18, eslint 0
- [x] Task 18.5: `ChoreographerDetailsForm.tsx` (:33, 122) — вынесены `LangTabs`, `TextField`, `NameFields`, `ContactFields`, `CategoryField`, `SiteAndDescriptionFields`; `ChoreographerPhotoSection.tsx` (:25, 66) — `AvatarPicker`, `MainPhotoPicker`, `ExtraPhotosPicker`; jest 13/13, eslint 0
- [x] Task 18.6: `EmailPage.tsx` (:14, 116) — вынесены `ForbiddenAccess`, `PageHeader`, `TabBar`; `EmailPageMessagesTab.tsx` (:34, 80) — `MailboxFilters`, `MessageListColumn`, `MessageDetailPane`; jest 15/15, eslint 0
- [x] Task 18.7: `InvoicesPage.tsx` (:15, 111) — вынесены `PdfPreviewModal`, `InvoicesList`; `InvoicesPageToolbar.tsx` (:19, 57) — `HeaderActions`, `SearchBar`; jest 21/21, eslint 0
- [x] Task 18.8: `AddMollieSubscriptionForm.tsx` (:38, 105) — вынесены `FormSkeleton`, `SubscriptionFormFields`; eslint 0 (и фикс deps в onSave), jest 24/24
- [x] Task 18.9: `MollieIncidents.tsx` (:14, 99) — `IncidentsHeader`, `IncidentListState`, `IncidentsList`; `MollieIncidentCard.tsx` (:90, 80) — `IncidentSummary`, `IncidentClientInfo`, `IncidentField`, `IncidentActions`; jest 7/7, eslint 0
- [x] Task 18.10: `MollieStudentLinksManager.tsx` (:27, 94) — `LinkedStudents`, `AddStudentForm`; `MollieCustomerDetails.tsx` (:32, 70) — `CustomerHeader`; jest 5/5, eslint 0
- [x] Task 18.11: `CreateInvoiceModal.tsx` (:20, 94) — `ModalTitle`, `InvoiceTopFields`, `InvoiceBottomFields`; `InvoiceFormFields.tsx` (:26, 53) — `SelectField`, `BrandSelect`, `ClientSelect`, `BillingFields`; jest 6/6, eslint 0
- [x] Task 18.12: `MolliePaymentsMatrix.tsx` (:13, 91) — `MatrixHeader`; `MolliePaymentsMatrixTable` (:13, 78) — `MatrixTableHeader`, `MatrixPersonCell`, `MatrixCells`; `MolliePaymentsMatrixUpcoming` (:34, 68) — `UpcomingRow`; `MolliePaymentsMatrixToolbar` (:29, 67) — `PeriodSelectors`, `MatrixSummary`; jest 5/5, eslint 0
- [x] Task 18.13: `TwoFactorForm.tsx` (:23, 91) — `useResendCooldown`, `FormMessage`; `ChangePasswordModal.tsx` (:29, 75) — `ErrorsList`, `useChangePasswordSubmit`; jest 12/12, eslint 0
- [x] Task 18.14: `MolliePayments.tsx` (:14, 86) — `MolliePaymentsHeader`, `MolliePaymentsMessage`, `MolliePaymentsSkeleton`; `MolliePaymentsFilters.tsx` (:37, 62) — `FilterActionButtons`; jest 12/12, eslint 0
- [x] Task 18.15: `ClientForm.tsx` (:28, 84) — `FormHeader`, `ValidationErrors`, `SubmitButton`; `EmailMessageDetail.tsx` (:45, 83) — `EmailBodyFrame` (iframe height logic), `ReplyBox`; jest 14/14, eslint 0
- [ ] Checks: `tsc --noEmit` (client), `npm run lint:ts`, targeted Jest, `npm run build:prod`

## Wave 19 — Client production: средние C304 (MEDIUM)
- [x] Task 19.1: `ClientsPage.tsx` (:41) — `useClientStats`, `ClientsStatsGrid`; `ChoreographersPage.tsx` (:11) — `ChoreographersHeader`, `ChoreographersEmptyState`, `ChoreographersGrid`; `AddTransactionForm.tsx` (:34) — `AddTransactionFormTitle`, `AddTransactionFormFooter`; `DanceStylesPage.tsx` (:9, 78) — `DanceStylesHeader`, `DanceStylesFilters`, `DanceStyleCard`, `DanceStylesGrid`; jest 73/73, eslint 0
- [x] Task 19.2: `PaymentRemindersPage.tsx` (:11, 67) — `PaymentRemindersHeader`; `PaymentReminderTemplateCard` (:29, 77) — `TemplateLanguageTabs`, `TemplateEditor`, `TestSendBlock`; `PaymentReminderSettingsCard` (:30, 59) — `SettingsFields`, `SettingsActions`; `PaymentReminderDeliveriesCard` (:43, 58) — `DeliveriesTable`; jest 6/6, eslint 0
- [x] Task 19.3: `HomePageRevenueChart` (:53, 76) — `ChartPeriodTabs`, `ChartMetaBlock`, `ChartColumns`; `HomePageKpiCards` (:20, 66) — `KpiCard`, `KpiSkeleton`; `HomePageFailedPayments` (:30, 60) — `FailedPaymentsHeader`, `FailedPaymentRow`; `HomePage.tsx` (:12, 53) — `HomePageHeader`; jest 5/5, eslint 0
- [x] Task 19.4: `UserForm.tsx` (:31, 77) — `UserFormTitle`, `UserFormSubmit`; фикс предсуществующих eslint: убран мёртвый file-state, deps `cleanForm`/`onSave`; `MollieSubscriptionCard.tsx` (:23, 76) — `SubscriptionScheduleInputs`, `SubscriptionAmountAndDescriptionInputs`; jest 23/23, eslint 0
- [x] Task 19.5: `InvoiceActionModal.tsx` — общие блоки `FormField`, `FormActions`, `PaymentMethodSelect`; формы `RecordPaymentForm`/`ConfirmPaidForm`/`AdjustmentForm` уменьшены; jest 8/8, eslint 0
- [x] Task 19.6: `ClientEmailBlock.tsx` (:17, 75) — `EmailLoadMoreButton`, `EmailEmptySelection`; `EditClientFormFields.tsx` (:21, 73) — `FieldWithError`, `ClientInfoFields`, `BranchGroupsPicker`; jest 8/8, eslint 0
- [x] Task 19.7: `CreateMollieMandateForm.tsx` (:40, 73) — `FormSkeleton`, фикс deps onSave; `MollieClientForm.tsx` (:35, 59) — `MollieClientFormTitle`, `MollieClientFormSubmit`; jest 33/33, eslint 0
- [x] Task 19.8: `TransactionsPage.tsx` (:43, 72) — `TransactionsPagination`; `OrganizationBrandsPage.tsx` (:14, 69) — `OrgHeader`, `OrgInfoSection`, `BrandFormSection`, `BrandsListSection`; jest 37/37, eslint 0
- [x] Task 19.9: `MollieCustomers.tsx` (:25, 67) — `MollieCustomersHeader`; `Sidebar.tsx` (:17, 61) — `SidebarItemsSection`; `EditMollieClientDropdown.tsx` (:25, 57) — фикс deps; jest 47/47, eslint 0
- [x] Task 19.10: `addClientData.ts` (:13, 60) — `buildFormData`; `mollieClientsDetailsPageSlice.ts` (:44, 59) — без извлечения (уже компактно); `ProfileCard.tsx` (:23, 55), `ProfileCardFields.tsx` (:18, 58) — без изменений (уже чистые); jest 46/46, eslint 0
- [x] Checks: `tsc --noEmit` (client) 19 legacy, `npm run lint:ts` 0 (кроме предсущ.), targeted Jest всего wave 19, `npm run build:prod`

## Wave 20 — Client hooks C304+Q301 (MEDIUM)
- [x] Task 20.1: `useClientPaymentBlock.ts` (Q301 :90) — вынесены `usePaymentFormState` (модальные стейты + формы), `usePaymentData` (fetch + reload), `usePaymentDerivedState` (payers, options, statusText); jest 36/36, eslint 0
- [ ] Task 20.2: `useCreateInvoiceModal.ts` (C304 ×2; Q301 :106, :260)
- [x] Task 20.2: `useCreateInvoiceModal.ts` (C304 ×2; Q301 :106, :260) — вынесены `useInvoiceFormState`, `useInvoiceData`, `useInvoiceEditFill`, `useInvoiceSubmit`; jest 6/6, eslint 0
- [x] Task 20.3: `useEditClientModal.ts` (C304 ×2; Q301 :133, :55) — вынесены `useEditClientFormState`, `useEditClientData`, `useEditClientSubmit`; jest 4/4, eslint 0
- [x] Task 20.4: `useClientForm.ts` (:49, 226 строк; Q301 :49) — вынесены `useClientFormState`, `useClientFormData`, `useClientFormSubmit`; jest 6/6, eslint 0
- [ ] Task 20.5: `useEmailPage.ts` (Q301 :38), `useInvoicesPage.ts` (Q301 :10)
- [ ] Task 20.6: `useChoreographerModal.ts` (Q301 :71), `useClientEmailBlock.ts` (Q301 :21)
- [ ] Task 20.7: `useMolliePaymentsMatrix.ts` (Q301 :95), `usePaymentReminders.ts` (Q301 :54)
- [ ] Task 20.8: прочие хуки C304: `useDanceStyles`, `useHomePageData`, `useOrganizationBrands`, `useMollieIncidents`, `useMolliePayments`, `useMollieCustomerDetails`, `usePaymentHistory`, `useStudentLinksManager`, `useCreateGroupForm`, `useScheduleSettingsPage`, `useSidebarState`, `useTransactionFilters`, `useClientFilters`, `useActiveSessions`, `useEditSubscriptionDropdown`
- [ ] Checks: `tsc --noEmit` (client), targeted Jest каждого экрана

## Wave 21 — Документированное решение по остаткам (LOW)
- [ ] Task 21.1: тестовые файлы (46 находок C304) — НЕ дробить ради метрики (задокументированное решение), зафиксировать итог в чек-листе
- [ ] Task 21.2: `useTransactionFilters.test.tsx` / `useInfiniteScroll.test.ts` — тоже тесты, не трогать
- [ ] Task 21.3: актуализировать счётчики в `docs/spec/SKYLOS_FINDINGS_CHECKLIST.md` по итогам волн 16–20 (свежий прогон 283)
- [ ] Checks: `npm run docs:links` чисто

---

## Final Gate
- [ ] `npm run ci` from root (client-checks / server-checks / docs-links / skylos informational)
- [ ] Code review passed (`.agents/skills/code-review/`)
- [ ] Browser QA — только если изменилось видимое поведение (e2e-test/manual-automation)
- [ ] PR published into `develop` (squash-merge, ветка `fix/skylos-*`)
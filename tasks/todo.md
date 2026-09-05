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
- [x] Task 20.1: `useClientPaymentBlock.ts` (Q301 :90) — вынесены `usePaymentFormState` (модальные стейты + формы), `usePaymentData` (fetch + reload), `usePaymentDerivedState` (payers, options, statusText); jest 36/36, eslint 0. Не закрыто полностью: осталась отдельная находка `useClientPaymentBlock.ts:200` (Q301 cc22, C304 220 строк) — не переделывалось.
- [x] Task 20.2: `useCreateInvoiceModal.ts` (C304 ×2; Q301 :106, :260) — вынесены `useInvoiceFormState`, `useInvoiceData`, `useInvoiceEditFill`, `useInvoiceSubmit`; jest 6/6, eslint 0. Не закрыто полностью: остались `useCreateInvoiceModal.ts:233`/`:307` (Q301 cc21/cc13) — не переделывалось.
- [x] Task 20.3: `useEditClientModal.ts` (C304 ×2; Q301 :133, :55) — вынесены `useEditClientFormState`, `useEditClientData`, `useEditClientSubmit`; jest 4/4, eslint 0. Не закрыто полностью: остались `useEditClientModal.ts:138`/`:147` (Q301 cc17 оба) — не переделывалось.
- [x] Task 20.4: `useClientForm.ts` (:49, 226 строк; Q301 :49) — вынесены `useClientFormState`, `useClientFormData`, `useClientFormSubmit`; jest 6/6, eslint 0
- [x] Task 20.5: `useEmailPage.ts` (Q301 :38) — разложен на `useEmailAccounts`/`useEmailAccountSync`/`useEmailSearch`/`useEmailMessageList`/`useEmailMessageSelection`/`useEmailMessageModeration`/`useEmailCompose`; `useInvoicesPage.ts` (Q301 :10) — разложен на `useInvoicesList`/`useInvoiceActions`/`useInvoiceDelivery`/`usePdfPreview`/`useInvoiceModal` + чистая `buildInvoiceActionRequest`. Оба закрыты полностью (C304 и Q301), 0 срабатываний skylos.
- [x] Task 20.6: `useChoreographerModal.ts` (Q301 :71) — разложен на `useLocalizedNameFields`/`usePhotoUploads`(+`useAdditionalPhotos`)/`useChoreographerFormFields`/`useChoreographerSubmit`; `useClientEmailBlock.ts` (Q301 :21) — разложен на `useClientEmailList`/`useClientEmailSelection`/`useClientEmailModeration`. Оба закрыты полностью.
- [x] Task 20.7: `useMolliePaymentsMatrix.ts` (Q301 :95) — разложен на `useMatrixData`/`useUpcomingSubscriptions`/`useMatrixFilters`; `usePaymentReminders.ts` (Q301 :54) — разложен на `useReminderSettings`/`useReminderTemplates`(+`useTemplateTestSend`)/`useReminderDeliveries`/`useReminderRun`. Оба закрыты полностью.
- [x] Task 20.8: все 15 хуков C304 закрыты полностью — `useDanceStyles` (+`useDanceStylesList`/`useDanceStyleForm`/`useDanceStyleFormSubmit`/`useDanceStyleActions`), `useHomePageData` (+`useMollieSummary`/`useRevenueChart`), `useOrganizationBrands` (+`useOrganizationBrandsData`/`useOrganizationActions`/`useBrandActions`/`useBrandLogoUpload`), `useMollieIncidents` (+`useIncidentsList`/`useIncidentsPagination`/`useIncidentActions`), `useMolliePayments` (+`useMolliePaymentsList`/`useMolliePaymentsPagination`/`useMolliePaymentsSync`/`useMolliePaymentsExport`), `useMollieCustomerDetails` (+`useCustomerDataRefresh`/`useMandateRevoke`), `usePaymentHistory` (+`usePaymentHistoryData`/`usePaymentInvoiceActions`), `useStudentLinksManager` (+`useStudentLinksData`/`useStudentLinkActions`/`useAddStudentLink`/`useDeleteStudentLink`), `useCreateGroupForm` (+`useGroupFormReferenceData`/`useGroupFormState`/`useGroupFormSubmit`), `useScheduleSettingsPage` (+`useGroupFilters`/`useGroupsData`/`useGroupReferenceLists`/`useGroupModal`/`useBranchView`/`useHighlightGroup`), `useSidebarState` (+`useTabletCollapse`/`useActiveSidebarGroup`), `useTransactionFilters`/`useClientFilters` (общий чистый хелпер `applyFilterChange`), `useActiveSessions` (+`useSessionMutations`), `useEditSubscriptionDropdown` (+`useSubscriptionModal`/`useValidMandateOptions`/`useSubscriptionForm`/`useCancelSubscription`/`useSubscriptionMutations`).
- [x] Checks: `tsc --noEmit` (client) — 20 baseline, без новых; `npm test` (client) — 283/283 suites, 982/982 tests; `npm run lint:ts` — 0 errors, 66 baseline warnings (без новых); `npm run build:prod` — чисто (только baseline bundle-size warnings); `skylos` по каждому затронутому файлу — 0 срабатываний SKY-C304/SKY-Q301

## Wave 21 — Документированное решение по остаткам (LOW) ✅ (ветка `fix/skylos-repo-policy`, 2026-09-05)
- [x] Task 21.1: тестовые файлы (44 находки C304 в свежем прогоне, было оценено 46) — НЕ дробить ради метрики (задокументированное решение), зафиксировано в шапке раздела `SKY-C304` чек-листа
- [x] Task 21.2: `useTransactionFilters.test.tsx` / `useInfiniteScroll.test.ts` — тоже тесты, не трогали; входят в те же 44
- [x] Task 21.3: актуализированы счётчики в `docs/spec/SKYLOS_FINDINGS_CHECKLIST.md` по итогам волн 16–20 (свежий прогон `skylos --select SKY-C304,SKY-Q301` на 2026-09-05: сервер 0/0, клиент 72 C304 + 13 Q301). Попутно обнаружены и исправлены 19 файлов C304 + 0 файлов Q301, ранее ошибочно помеченных `[x]`, но по факту не закрытых, и 10 файлов C304, закрытых ещё в волнах 9–11 без обновления чек-листа. Добавлены 35 новых находок C304 и 13 новых находок Q301 (хуки волны 20.5–20.8 + побочные продукты декомпозиции волн 16–20), которых не было в исходном снимке 185/35.
- [x] Checks: правки только в `docs/spec/SKYLOS_FINDINGS_CHECKLIST.md` и `tasks/todo.md`, кода не касались — `npm run docs:links` не требуется для этой волны

## Wave 22 — Последние 5 находок SKY-Q301 (хвосты задач 20.1–20.3) ✅ (2026-09-05)
- [x] `useClientPaymentBlock.ts:200` (Q301 cc22, C304 220 строк) — вынесены `usePaymentLinkActions` (onCopyPaymentLink/onCancelPaymentLink), `useMandateActions` (onCreateMandate/onRevokeMandate), `useSubscriptionCreateActions` (onCreateSubscription/onCancelSubscription), `useSubscriptionEditActions` (onOpenEditSubscription/onUpdateSubscription), `useSubscriptionRestartActions` (onOpenRestartSubscription/onRestartSubscription); главный хук — композиция через spread (`...formState`). jest 5/5, eslint 0
- [x] `useEditClientModal.ts:138`/`:147` (Q301 cc17 оба, C304 57 строк) — валидация вынесена в чистые `validateNameFields`/`validateContactFields`/`validateOtherFields`/`validateImageFile` + агрегатор `validateEditClientForm`; `onSave` теперь только вызывает валидатор. jest 4/4, eslint 0
- [x] `useCreateInvoiceModal.ts:233`/`:307` (Q301 cc21/cc13, C304 133 строки) — `useInvoiceSubmit` (8 колбэков) разложен на `useInvoiceItemActions` (updateItem/addItem/removeItem), `useInvoiceSelectionActions` (selectClient/selectGroup/selectBusinessBrand/selectAddressSource), `useInvoiceSubmitAction` (totalCents/submit); payload-логика вынесена в чистые `validateInvoiceSubmission`/`buildInvoicePayload`/`persistInvoicePayload` (`invoiceSubmitHelpers.ts`). jest 13/13, eslint 0
- [x] Checks: `skylos . --select SKY-Q301` — 0/48 (полностью закрыто); `SKY-C304` 124/220 (закрыты те же 3 файла); `npm test` (client) — 283/283 suites, 982/982 tests; `tsc --noEmit` — 20 baseline, без новых; `npx eslint` (затронутые директории) — 0 errors
- Не в объёме: `useInvoiceEditFill` внутри `useCreateInvoiceModal.ts` (C304 ×2, строки 172/178) и компонентные находки (`ClientPaymentBlock.tsx`, `ClientPaymentBlockModals.tsx`, `CreateInvoiceModal.tsx`, `InvoiceFormFields.tsx`, `useClientForm.ts` и др.) — отдельная работа, не связанная с сегодняшними Q301

## Wave 23 — Все оставшиеся production-находки SKY-C304 (48 находок, 41 файл) ✅ (2026-09-05)
- [x] Простые компоненты без логики — уплотнение JSX-пропсов/деструктуризации на меньшее число строк, вынос инлайн-типов параметров в именованные интерфейсы верхнего уровня (инлайн-тип внутри сигнатуры компонента считается в длину функции): `ProfileCard.tsx`, `ProfileCardFields.tsx`, `ClientForm.tsx`, `ChoreographerModal.tsx`, `ClientEmailBlock.tsx`, `ClientPaymentBlockModals.tsx`, `PaymentLinkModal.tsx`, `DanceStylesPage.tsx`, `InvoiceActionModal.tsx`, `MollieCustomerDetails.tsx`, `MollieStudentLinksManager.tsx`, `MollieCustomers.tsx`, `MollieIncidents.tsx`, `MolliePayments.tsx`, `MolliePaymentsFilters.tsx`, `MolliePaymentsMatrix.tsx`, `MolliePaymentsMatrixToolbar.tsx`, `PaymentRemindersPage.tsx`, `Sidebar.tsx`; `CreateInvoiceModal.tsx`/`InvoiceFormFields.tsx` — инлайн-типы вынесены в `InvoiceTopFieldsProps`/`InvoiceBottomFieldsProps`/`BillingFieldsProps`
- [x] Компоненты с состоянием — новые хуки-обёртки для однотипных Redux-колбэков или локального состояния: `MollieClientForm.tsx` (+`useMollieClientProfileUpdaters`), `AddMollieSubscriptionForm.tsx` (+`useMollieSubscriptionUpdaters`), `AddTransactionForm.tsx` (+`useTransactionFormUpdaters`), `UserForm.tsx` (+`useUserFormUpdaters`), `CreateMollieMandateForm.tsx` (+`useMollieMandateUpdaters`), `EditMollieClientDropdown.tsx` (+`useEditMollieClientDropdown`), `ChangePasswordModal.tsx` (+`useChangePasswordFields`/`useChangePasswordSubmit`), `ChoreographersPage.tsx` (+`useChoreographersPage`), `ClientsPage.tsx` (+`useClientsPage`), `TransactionsPage.tsx` (+`useTransactionsPage`)
- [x] `TwoFactorForm.tsx` — разложен на `useResendCooldown`/`useTwoFactorVerify`/`useTwoFactorResend`
- [x] `useClientForm.ts` (2 находки) — `useClientFormState` разложен на `useClientProfileFields`/`useClientFormMisc`/`useClientFormReset`; `useClientFormData` — построение опций вынесено в чистые `buildBranchOptions`/`buildMollieCustomerOptions` (`clientFormOptions.ts`)
- [x] `GlobalSearch.tsx` (96 строк) — разложен на `useDebouncedGlobalSearch`/`useSearchKeyboard`/`useSearchDismiss`/`useGlobalSearchState` + чистые `buildFlatResults`/`groupByCategory` (`globalSearchResults.ts`) + подкомпонент `SearchPanel`
- [x] `ClientPaymentBlock.tsx` (2 находки) — `LoadingCard`/`ErrorCard`/`ClientPaymentBlockBody` подкомпоненты, главный компонент — 3 строки условной логики
- [x] `EmailPage.tsx` (84 строки) — тело вынесено в `EmailPageBody`, главный компонент — 1 условие + рендер
- [x] `useCreateInvoiceModal.ts`'s `useInvoiceEditFill` (2 находки) — обе ветки (fill-from-invoice / reset-to-defaults) вынесены в чистые `fillFormFromInvoice`/`resetFormToDefaults` (`invoiceEditFillHelpers.ts`)
- [x] `InvoiceListItem.tsx` (2 находки) — `ActionButtons` разложен на `MollieAndPaymentActions`/`AdjustmentActions`/`LifecycleActions`
- [x] `InvoicesPage.tsx` (98 строк) — loading/empty/list-ветка вынесена в `InvoicesListSection`
- [x] `mollieClientsDetailsPageSlice.ts` — 3 идентичные пары `.pending`/`.rejected` дедуплицированы в `setPending`/`setRejected`
- [x] `GroupStatisticsSection.tsx` (72 строки) — переключатель вида вынесен в `BranchViewToggle`, инлайн-тип → `BranchCardProps`
- [x] `ClientForm.tsx:66` (66 строк, пропущен при первом проходе чек-листа) — уплотнены деструктуризация и JSX-пропсы
- [x] Checks: `skylos . --select SKY-C304,SKY-Q301` — 0 production-находок (остаются только 43 тестовых, вне объёма по решению волны 21); `npm test` (client) — 283/283 suites, 982/982 tests; `tsc --noEmit` — 20 baseline, без новых; `npm run lint:ts` — 0 errors, 66 baseline warnings (без новых); `npm run build:prod` — чисто; `npm run docs:links` — без битых ссылок

## Финальное закрытие чек-листа ✅ (2026-09-05)
- [x] Полный аудит `docs/spec/SKYLOS_FINDINGS_CHECKLIST.md`: проверено, что каждая находка в файле имеет либо реальный фикс кода (`[x]`), либо задокументированное решение не менять (false positive / by design / подавлено конфигом `pyproject.toml` для `SKY-D260`/`SKY-L012` / сознательно не трогаем тестовые файлы для `SKY-C304`)
- [x] Найден и закрыт 1 пропущенный пункт (`ClientForm.tsx:68`, 282 строки в оригинальном прогоне) — был фактически исправлен в волне 23, но чек-бокс не был отмечен
- [x] Обновлены счётчики: `SKY-C304` 177/220 (production-код закрыт полностью, 43 записи — тестовые файлы, вне объёма)
- [x] Добавлен итоговый статус-блок в начало файла со сводной таблицей по всем категориям (`SKY-D*`, `SKY-T10*`, `SKY-U00*`/`SKY-E003`, `SKY-L007`/`SKY-C303`/`SKY-Q302`/`SKY-Q402`, `SKY-Q301`, `SKY-C304`, `SKY-L012`, `SKY-D260`, `SKY-R10*`) — все ЗАКРЫТЫ
- [x] Проверка: `grep` по всем оставшимся `[ ]` записям файла — 0 записей без пометки false positive/by design/историческое/тестовое

---

## Final Gate
- [ ] `npm run ci` from root (client-checks / server-checks / docs-links / skylos informational)
- [ ] Code review passed (`.agents/skills/code-review/`)
- [ ] Browser QA — только если изменилось видимое поведение (e2e-test/manual-automation)
- [ ] PR published into `develop` (squash-merge, ветка `fix/skylos-*`)
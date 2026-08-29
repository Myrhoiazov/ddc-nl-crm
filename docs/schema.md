# Схема данных Prisma

Автоописание схемы из `server/prisma/schema/*.prisma` (MySQL, datasource `db`, генератор
`prisma-client-js`). Файл существует для Graphify semantic-pass и для людей: здесь перечислены
все модели, перечисления и связи. После изменения любого `.prisma`-файла обновите этот документ
и выполните `npm run prisma:generate` в `server/`.

## Домены

| Файл                     | Домен                                            |
| ------------------------ | ------------------------------------------------ |
| `schema.prisma`          | Общие модели (Comment, Transaction)              |
| `client.prisma`          | Ученики                                          |
| `company.prisma`         | Филиалы, юрлица, бренды                          |
| `email.prisma`           | Почтовые ящики и сообщения                       |
| `invoice.prisma`         | Инвойсы                                          |
| `mollie.prisma`          | Mollie: аккаунты, клиенты, платежи, подписки     |
| `payment-reminder.prisma` | Напоминания об оплате                           |
| `schedule.prisma`        | Расписание, группы, хореографы, залы             |
| `user.prisma`            | Пользователи, сессии, безопасность, 2FA          |

---

## schema.prisma — общие модели

### Comment (таблица `comments`)
Комментарий к ученику от пользователя.
- Поля: id Int @id autoincrement; text String? @db.Text; clientId Int? (`client_Id`); createdAt DateTime @default(now()); userId Int? (`user_Id`)
- Связи: client -> Client? (onDelete: Cascade); author -> User? (onDelete: Cascade)
- Индексы: clientId, userId

### Transaction (таблица `transactions`)
Финансовая транзакция (доход/расход).
- Поля: id Int @id autoincrement; type TransactionType; amount Float; category ExpenseCategory; description String? @db.VarChar(250); date DateTime @default(now()); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; paymentMethod PaymentMethod @default(CASH)
- Связей нет.

### Enum TransactionType: INCOME | EXPENSE
### Enum PaymentMethod: CASH | CARD | BANK_TRANSFER
### Enum ExpenseCategory: KOMUNALKA | AUTO | PRODUCTS | HEALTH | HUIS | PHARMACY | OTHER

---

## client.prisma — ученики

### Enum ClientLanguage: EN | NL | RU

### Client (таблица `clients`)
Ученик школы танцев.
- Поля: id Int @id autoincrement; firstName String?; lastName String?; birthday String?; phoneNumber String?; email String?; branchId Int? (`branch_Id`); image String?; createdAt DateTime? @default(now()); expiresAt DateTime?; anamnesis String? @db.VarChar(250); social String? @db.VarChar(250); description String? @db.VarChar(250); image_3d Boolean @default(false); document Boolean @default(false); preferredLanguage ClientLanguage @default(RU)
- Связи: branch -> Branch? (SetNull); statuses ClientStatus[]; comments Comment[]; mollieCustomers Customer[]; mollieLinks CustomerClientLink[]; invoices Invoice[]; groupMemberships ClientDanceGroup[]; emailMessages EmailMessage[]
- Индексы: branchId

### ClientDanceGroup (таблица `client_dance_groups`)
Связь «ученик ↔ группа» (составной PK `[clientId, groupId]`).
- Поля: clientId Int (`client_id`); groupId Int (`group_id`); createdAt DateTime @default(now()) (`created_at`)
- Связи: client -> Client (Cascade); group -> DanceGroup (Cascade)
- Индексы: groupId

### ClientStatus (таблица `client_status`)
Статус/лояльность ученика.
- Поля: id Int @id autoincrement; clientId Int (`client_Id`); loyaltyLevel LoyaltyLevel?; notes String? @db.Text; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt
- Связи: client -> Client (Cascade)
- Индексы: clientId

---

## company.prisma — филиалы, юрлица, бренды

### Branch (таблица `branches`)
Филиал школы.
- Поля: id Int @id autoincrement; name String; address String?; city String?; phone String?; email String?; description String? @db.Text; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt
- Связи: groups DanceGroup[]; clients Client[]

### LegalOrganization (таблица `legal_organizations`)
Юрлицо (реквизиты для инвойсов, привязка к организации Mollie).
- Поля: id Int @id autoincrement; legalName String; kvkNumber String?; vatNumber String?; registrationAddress String?; postalCode String?; city String?; countryCode String @default("NL"); email String?; phone String?; website String?; bankName String?; iban String?; mollieOrganizationId String? @unique; createdAt; updatedAt
- Связи: brands BusinessBrand[]

### BusinessBrand (таблица `business_brands`)
Бренд/профиль отправителя инвойсов внутри юрлица.
- Поля: id Int @id autoincrement; organizationId Int; name String; slug String @unique; logoUrl String? @db.Text; primaryColor String @default("#1d1d33"); email String?; phone String?; website String?; address String?; mollieProfileId String?; isDefault Boolean @default(false); isActive Boolean @default(true); createdAt; updatedAt
- Связи: organization -> LegalOrganization (Restrict); invoices Invoice[]
- Индексы: [organizationId, isActive]

---

## email.prisma — почта

### EmailAccount (таблица `email_accounts`)
Почтовый аккаунт (IMAP/SMTP), пароль хранится зашифрованным.
- Поля: id Int @id autoincrement; label String; imapHost String; imapPort Int; imapSecure Boolean @default(true); smtpHost String; smtpPort Int; smtpSecure Boolean @default(true); username String; passwordEncrypted String @db.Text; isActive Boolean @default(true); trashFolder String @default("Trash"); spamFolder String @default("Junk"); lastSyncedUid Int?; lastSyncedAt DateTime?; createdAt; updatedAt
- Связи: messages EmailMessage[]; paymentReminderSetting PaymentReminderSettings[]
- (camelCase-колонки замаплены через `@map`)

### EmailMessage (таблица `email_messages`)
Сообщение из почтового ящика, опционально привязано к ученику.
- Поля: id Int @id autoincrement; mailboxId Int; imapUid Int?; messageId String?; inReplyToMessageId String?; isOutgoing Boolean @default(false); fromAddress String; fromName String?; toAddresses Json; ccAddresses Json?; subject String?; bodyText String? @db.Text; bodyHtml String? @db.Text; receivedAt DateTime; isRead Boolean @default(false); clientId Int?; createdAt DateTime @default(now())
- Связи: mailbox -> EmailAccount (Cascade); client -> Client? (SetNull); attachments EmailAttachment[]
- Unique: [mailboxId, imapUid]; индексы: clientId, fromAddress

### EmailAttachment (таблица `email_attachments`)
Вложение письма на диске.
- Поля: id Int @id autoincrement; messageId Int; filename String; mimeType String; sizeBytes Int; storagePath String @db.Text; createdAt DateTime @default(now())
- Связи: message -> EmailMessage (Cascade)
- Индексы: messageId

---

## invoice.prisma — инвойсы

### Enum InvoiceStatus: DRAFT | ISSUED | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED
### Enum InvoiceDocumentType: INVOICE | CREDIT_NOTE | DEBIT_NOTE
### Enum InvoiceDeliveryType: INITIAL | RESEND | REMINDER_BEFORE_DUE | REMINDER_OVERDUE
### Enum InvoiceDeliveryStatus: PENDING | SENT | FAILED

### Invoice (таблица `invoices`)
Инвойс/кредит-нота/дебет-нота со снимком реквизитов отправителя.
- Поля: id Int @id autoincrement; number String @unique; documentType InvoiceDocumentType @default(INVOICE); status InvoiceStatus @default(DRAFT); clientId Int?; businessBrandId Int?; parentInvoiceId Int?; billToName String; billToEmail String?; issueDate DateTime; dueDate DateTime?; paidAt DateTime?; currency String @default("EUR"); totalCents Int; issuerName String; issuerAddress String?; issuerEmail String?; issuerPhone String?; issuerWebsite String?; issuerLegalName String?; issuerKvkNumber String?; issuerVatNumber String?; issuerLogoUrl String? @db.Text; issuerPrimaryColor String?; bankName String?; iban String?; paymentReference String?; note String? @db.Text; showPaymentButton Boolean @default(true); showPaymentQr Boolean @default(true); paidAmountCents Int @default(0); creditedAmountCents Int @default(0); balanceDueCents Int; createdById Int?; updatedById Int?; createdAt; updatedAt
- Связи: client -> Client? (SetNull); businessBrand -> BusinessBrand? (SetNull); parentInvoice -> Invoice? self-relация «InvoiceAdjustments» (Restrict); adjustments Invoice[]; items InvoiceItem[]; payments InvoicePayment[]; molliePayments Payment[]; molliePaymentLinks InvoiceMolliePaymentLink[]; deliveries InvoiceDelivery[]; auditLogs InvoiceAuditLog[]; createdBy/updatedBy -> User? («InvoiceCreatedBy»/«InvoiceUpdatedBy», SetNull)
- Индексы: clientId, businessBrandId, parentInvoiceId, [status, issueDate]

### InvoiceDelivery (таблица `invoice_deliveries`)
Факт доставки инвойса письмом (с публичным токеном просмотра).
- Поля: id Int @id autoincrement; invoiceId Int; type InvoiceDeliveryType; status InvoiceDeliveryStatus @default(PENDING); recipientEmail String; subject String; publicToken String @unique; paymentUrl String? @db.Text; errorMessage String? @db.Text; sentAt DateTime?; firstViewedAt DateTime?; lastViewedAt DateTime?; viewCount Int @default(0); createdById Int?; createdAt; updatedAt
- Связи: invoice -> Invoice (Restrict); createdBy -> User? («InvoiceDeliveryCreatedBy», SetNull)
- Индексы: [invoiceId, createdAt], [status, createdAt], [type, createdAt]

### InvoiceItem (таблица `invoice_items`)
Позиция инвойса, опционально ссылается на группу.
- Поля: id Int @id autoincrement; invoiceId Int; groupId Int?; description String; period String?; quantity Int @default(1); unitPriceCents Int; totalCents Int
- Связи: invoice -> Invoice (Cascade); group -> DanceGroup? (SetNull)
- Индексы: invoiceId, groupId

### InvoicePayment (таблица `invoice_payments`)
Ручная регистрация оплаты по инвойсу.
- Поля: id Int @id autoincrement; invoiceId Int; amountCents Int; paidAt DateTime @default(now()); method String @default("OTHER"); reference String?; note String? @db.Text; createdById Int?; createdAt
- Связи: invoice -> Invoice (Restrict); createdBy -> User? («InvoicePaymentCreatedBy», SetNull)
- Индексы: [invoiceId, paidAt], createdById

### InvoiceAuditLog (таблица `invoice_audit_logs`)
Журнал изменений инвойса (старые/новые значения).
- Поля: id Int @id autoincrement; invoiceId Int; action String; oldValues Json?; newValues Json?; actorId Int?; createdAt
- Связи: invoice -> Invoice (Restrict); actor -> User? («InvoiceAuditActor», SetNull)
- Индексы: [invoiceId, createdAt], actorId

---

## mollie.prisma — интеграция Mollie

### MollieAccount (таблица `mollie_accounts`)
OAuth-аккаунт Mollie пользователя (шифрованные access/refresh токены).
- Поля: id Int @id autoincrement; userId Int @unique (`user_Id`); accessTokenEncrypted String @db.Text; refreshTokenEncrypted String @db.Text; expiresAt DateTime; scope String? @db.Text; isActive Boolean @default(true); lastRefreshedAt DateTime?; createdAt; updatedAt
- Связи: user -> User (Cascade)
- Индексы: [isActive, updatedAt]

### MollieOAuthState (таблица `mollie_oauth_states`)
Одноразовый state для OAuth-авторизации Mollie.
- Поля: id Int @id autoincrement; state String @unique @db.VarChar(191); userId Int; expiresAt DateTime; createdAt
- Связи: user -> User (Cascade)
- Индексы: userId, expiresAt

### MollieIncidentResolution (таблица `mollie_incident_resolutions`)
Отметка о разборе инцидента сверки Mollie.
- Поля: id Int @id autoincrement; incidentKey String @unique @db.VarChar(191); incidentType String; sourceId Int; resolvedById Int (`resolvedBy_Id`); note String? @db.Text; resolvedAt DateTime @default(now())
- Связи: resolvedBy -> User (Cascade)
- Индексы: [incidentType, sourceId], resolvedById

### Customer (таблица `Customer`)
Клиент Mollie (`cst_...`), опционально связан с учеником.
- Поля: id Int @id autoincrement; mollieId String? @unique; email String? @unique; givenName String?; familyName String?; city String?; country String?; postalCode String?; streetAndNumber String?; consumerAccount String?; consumerName String?; consumerBic String?; payerName String?; payerRelation String? @default("unknown"); linkSource String @default("unlinked"); locale String?; preferredLanguage ClientLanguage?; clientId Int? (`client_Id`); createdAt; updatedAt
- Связи: client -> Client? (SetNull); clientLinks CustomerClientLink[]; mandates Mandate[]; subscriptions Subscription[]; payments Payment[]
- Индексы: clientId

### CustomerClientLink (таблица `customer_client_links`)
Явная связь «Mollie Customer ↔ Ученик» (unique пара).
- Поля: id Int @id autoincrement; customerId Int; clientId Int; payerRelation String? @default("unknown"); linkSource String @default("unlinked"); isPrimary Boolean @default(false); notes String? @db.Text; createdAt; updatedAt
- Связи: customer -> Customer (Cascade); client -> Client (Cascade)

### Mandate (таблица `Mandate`)
Мандат прямого дебетования (`mdt_...`).
- Поля: id Int @id autoincrement; mollieId String? @unique; status String; method String; signatureDate DateTime?; customerId Int; mandateReference String?
- Связи: customer -> Customer; subscriptions Subscription[]

### Subscription (таблица `Subscription`)
Подписка Mollie (`sub_...`) на мандате клиента.
- Поля: id Int @id autoincrement; mollieId String? @unique; description String; amountValue Decimal; amountCurrency String; interval String; metadata String?; startDate DateTime?; nextPaymentDate DateTime?; status String; mandateId Int?; times Int?; createdAt; updatedAt
- Связи: mandate -> Mandate?; customer -> Customer; payments Payment[]; reminderDeliveries PaymentReminderDelivery[]

### Payment (таблица `Payment`)
Транзакция Mollie (`tr_...`), может относиться к подписке и/или инвойсу.
- Поля: id Int @id autoincrement; mollieId String? @unique; amountValue Decimal; amountCurrency String; refundedAmount Decimal @default(0); chargedBackAmount Decimal @default(0); adjustmentAt DateTime?; description String?; method String; status String; checkoutUrl String? @db.Text; isCancelable Boolean @default(false); paidAt DateTime?; createdAt; updatedAt; customerId Int?; subscriptionId Int?; invoiceId Int?
- Связи: customer -> Customer?; subscription -> Subscription?; invoice -> Invoice? (SetNull); events MollieEvent[]
- Индексы: invoiceId

### InvoiceMolliePaymentLink (таблица `invoice_mollie_payment_links`)
Платёжная ссылка Mollie для инвойса (`pl_...`) с webhook-токеном.
- Поля: id Int @id autoincrement; invoiceId Int; mollieId String @unique; paymentUrl String @db.Text; webhookToken String @unique @db.VarChar(191); amountCents Int; expiresAt DateTime?; archived Boolean @default(false); paidAt DateTime?; createdAt; updatedAt
- Связи: invoice -> Invoice (Restrict)
- Индексы: [invoiceId, archived, expiresAt]

### MollieEvent (таблица `mollie_events`)
Сырое событие/webhook от Mollie с дедупликацией и статусом обработки.
- Поля: id Int @id autoincrement; molliePaymentId String; eventType String @default("payment.webhook"); paymentStatus String?; processingStatus String @default("received"); dedupeKey String? @unique; payload Json?; errorMessage String? @db.Text; receivedAt DateTime @default(now()); processedAt DateTime?; paymentId Int?
- Связи: payment -> Payment? (SetNull)
- Индексы: [molliePaymentId, receivedAt], paymentId, processingStatus

---

## payment-reminder.prisma — напоминания об оплате

### Enum PaymentReminderStatus: PENDING | SENT | FAILED | SKIPPED

### PaymentReminderSettings (таблица `payment_reminder_settings`)
Глобальные настройки-синглтон (id = 1): расписание рассылки напоминаний.
- Поля: id Int @id @default(1); offsetDays Int @default(3); sendHour Int @default(9); sendMinute Int @default(0); senderEmailAccountId Int?; enabled Boolean @default(true); updatedById Int?; updatedAt
- Связи: senderEmailAccount -> EmailAccount? (SetNull); updatedBy -> User? («PaymentReminderSettingsUpdatedBy», SetNull)

### PaymentReminderDelivery (таблица `payment_reminder_deliveries`)
Доставка напоминания по подписке на дату платежа (unique пара).
- Поля: id Int @id autoincrement; subscriptionId Int; targetPaymentDate DateTime; status PaymentReminderStatus @default(PENDING); language ClientLanguage; recipientEmail String; errorMessage String? @db.Text; sentAt DateTime?; triggeredById Int?; createdAt
- Связи: subscription -> Subscription (Cascade); triggeredBy -> User? («PaymentReminderTriggeredBy», SetNull)
- Индексы: [subscriptionId, targetPaymentDate], [status, createdAt]

### PaymentReminderTemplate (таблица `payment_reminder_templates`)
Шаблон письма-напоминания по языку (unique language).
- Поля: id Int @id autoincrement; language ClientLanguage @unique; subject String; bodyHtml String @db.Text; updatedById Int?; createdAt; updatedAt
- Связи: updatedBy -> User? («PaymentReminderTemplateUpdatedBy», SetNull)

---

## schedule.prisma — расписание

### Enum GroupLevel: START | FAN | PRO

### Choreographer (таблица `choreographers`)
Хореограф с мультиязычными именами и описаниями.
- Поля: id Int @id autoincrement; firstName String; lastName String; firstNameUa/lastNameUa/firstNameEn/lastNameEn String?; phone String?; email String?; birthday String?; experience Int?; category GroupLevel?; photo/mainPhoto/additionalPhotos String?; description/templateDescription String? @db.Text; showOnSite Boolean @default(true); createdAt; updatedAt
- Связи: groups DanceGroup[]

### Hall (таблица `halls`)
Зал для занятий.
- Поля: id Int @id autoincrement; name String; capacity Int?; createdAt
- Связи: groups DanceGroup[]

### DanceGroup (таблица `dance_groups`)
Танцевальная группа: стиль, уровень, цена занятия.
- Поля: id Int @id autoincrement; name String; style String; level GroupLevel @default(START); maxParticipants Int @default(20); lessonPriceCents Int @default(0); choreographerId Int; hallId Int?; branchId Int?; createdAt; updatedAt
- Связи: choreographer -> Choreographer; hall -> Hall?; branch -> Branch?; slots ScheduleSlot[]; invoiceItems InvoiceItem[]; clientMemberships ClientDanceGroup[]

### ScheduleSlot (таблица `schedule_slots`)
Слот расписания группы (день недели + время строками).
- Поля: id Int @id autoincrement; groupId Int; dayOfWeek String; startTime String; endTime String
- Связи: group -> DanceGroup (Cascade)

### DanceStyle (таблица `dance_styles`)
Справочник стилей с мультиязычными описаниями и контентом.
- Поля: id Int @id autoincrement; name String; nameUa/nameEn String?; description/descriptionUa/descriptionEn String? @db.Text; content/contentUa/contentEn String? @db.Text; image String?; youtubeUrl String?; isActive Boolean @default(true); createdAt; updatedAt

---

## user.prisma — пользователи и безопасность

### Enum UserRole: ADMIN | MANAGER | DOCTOR
### Enum TwoFactorChannel: EMAIL | TELEGRAM (зарезервирован, не реализован)
### Enum LoyaltyLevel: BRONZE | SILVER | GOLD | PLATINUM
### Enum AuthSecurityEventType: LOGIN_SUCCEEDED | LOGIN_FAILED | LOGIN_BLOCKED | LOGOUT | PASSWORD_CHANGED | PASSWORD_RESET | SESSION_CREATED | SESSION_ROTATED | SESSION_REVOKED | SESSION_REUSE_DETECTED | ROLE_CHANGED | ACCOUNT_CREATED | ACCOUNT_DISABLED | ACCOUNT_ENABLED | ACCOUNT_DELETED | TWO_FACTOR_REQUIRED | TWO_FACTOR_SUCCEEDED | TWO_FACTOR_FAILED | TWO_FACTOR_LOCKED | TWO_FACTOR_RESENT | TRUSTED_DEVICE_CREATED | TRUSTED_DEVICE_REVOKED

### User (таблица `users`)
Сотрудник/админ CRM.
- Поля: id Int @id autoincrement; firstName String?; lastName String?; email String @unique; password String; salt String?; role UserRole @default(MANAGER); isActive Boolean @default(false); isEnabled Boolean @default(true); authVersion Int @default(0); lastLogin DateTime?; createdAt; updatedAt
- Связи: comments Comment[]; sessions Session[]; mollieAccount MollieAccount?; mollieOAuthStates MollieOAuthState[]; resolvedMollieIncidents MollieIncidentResolution[]; createdInvoices Invoice[] («InvoiceCreatedBy»); updatedInvoices Invoice[] («InvoiceUpdatedBy»); invoicePayments InvoicePayment[]; invoiceDeliveries InvoiceDelivery[]; invoiceAuditLogs InvoiceAuditLog[]; authEventsAsActor/authEventsAsTarget AuthSecurityEvent[]; twoFactorChallenges TwoFactorChallenge[]; trustedDevices TrustedDevice[]; paymentReminderSettingsUpdates PaymentReminderSettings[]; paymentReminderDeliveriesTriggered PaymentReminderDelivery[]; paymentReminderTemplateUpdates PaymentReminderTemplate[]

### Session (таблица `sessions`)
Cookie-сессия с ротацией refresh-токена.
- Поля: id Int @id autoincrement; userId Int (`user_Id`); refreshToken String? @unique @db.VarChar(512); tokenHash String? @unique @db.VarChar(128); ipAddress String?; userAgent String?; isRevoked Boolean @default(false); createdAt; lastUsedAt DateTime?; expiresAt DateTime; revokedAt DateTime?; updatedAt
- Связи: user -> User (Cascade)

### AuthSecurityEvent (таблица `auth_security_events`)
Аудит событий безопасности входа/сессий/2FA.
- Поля: id Int @id autoincrement; type AuthSecurityEventType; actorUserId Int?; targetUserId Int?; ipAddress String? @db.VarChar(64); userAgent String? @db.Text; metadata Json?; createdAt
- Связи: actorUser -> User? («AuthSecurityEventActor», SetNull); targetUser -> User? («AuthSecurityEventTarget», SetNull)
- Индексы: [type, createdAt], [actorUserId, createdAt], [targetUserId, createdAt]

### TwoFactorChallenge (таблица `two_factor_challenges`)
Мост «пароль принят → код подтверждён»: короткоживущий челлендж, сам по себе доступ не даёт.
- Поля: id Int @id autoincrement; userId Int; channel TwoFactorChannel @default(EMAIL); tokenHash String @unique @db.VarChar(128); codeHash String @db.VarChar(128); attempts Int @default(0); maxAttempts Int @default(5); resendCount Int @default(0); ipAddress/userAgent String?; expiresAt DateTime; consumedAt DateTime?; createdAt; updatedAt (bump при resend — cooldown)
- Связи: user -> User (Cascade)
- Индексы: userId

### TrustedDevice (таблица `trusted_devices`)
Запомненное устройство, пропускающее 2FA до истечения/отзыва.
- Поля: id Int @id autoincrement; userId Int; tokenHash String @unique @db.VarChar(128); userAgent/ipAddress String?; createdAt; expiresAt DateTime; lastUsedAt DateTime?; revokedAt DateTime?
- Связи: user -> User (Cascade)
- Индексы: userId

---

## Ключевые междоменные связи

- **Ученик ↔ Группы**: `Client <-> ClientDanceGroup <-> DanceGroup` (+ `ScheduleSlot`, `Choreographer`, `Hall`, `Branch`).
- **Ученик ↔ Инвойсы**: `Client -> Invoice -> InvoiceItem -> DanceGroup`; оплата вручную через `InvoicePayment`, онлайн — `Invoice -> InvoiceMolliePaymentLink` или `Invoice -> Payment`.
- **Mollie-цепочка**: `User -> MollieAccount/MollieOAuthState`; `Customer -> Mandate -> Subscription -> Payment`; вебхуки — `MollieEvent -> Payment`; разбор инцидентов — `MollieIncidentResolution`.
- **Ученик ↔ Mollie**: `Client <-> CustomerClientLink <-> Customer` и прямой `Client -> Customer`.
- **Почта**: `EmailAccount -> EmailMessage -> EmailAttachment`; письмо привязывается к ученику (`EmailMessage.clientId`); `EmailAccount` также используется как отправитель напоминаний (`PaymentReminderSettings.senderEmailAccountId`).
- **Напоминания**: `Subscription -> PaymentReminderDelivery`, шаблоны по языку — `PaymentReminderTemplate.language`, настройки-синглтон — `PaymentReminderSettings`.
- **Безопасность**: `User -> Session / TwoFactorChallenge / TrustedDevice / AuthSecurityEvent`; все действия инвойсов и напоминаний атрибутируются `User` через named-связи.

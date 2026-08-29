-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mollieId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `givenName` VARCHAR(191) NULL,
    `familyName` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `streetAndNumber` VARCHAR(191) NULL,
    `consumerAccount` VARCHAR(191) NULL,
    `consumerName` VARCHAR(191) NULL,
    `consumerBic` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `client_Id` INTEGER NULL,
    `linkSource` VARCHAR(191) NOT NULL DEFAULT 'unlinked',
    `payerName` VARCHAR(191) NULL,
    `payerRelation` VARCHAR(191) NULL DEFAULT 'unknown',

    UNIQUE INDEX `Customer_email_key`(`email` ASC),
    UNIQUE INDEX `Customer_mollieId_key`(`mollieId` ASC),
    INDEX `customers_client_Id_fkey`(`client_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mandate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mollieId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `signatureDate` DATETIME(3) NULL,
    `customerId` INTEGER NOT NULL,
    `mandateReference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Mandate_customerId_fkey`(`customerId` ASC),
    UNIQUE INDEX `Mandate_mollieId_key`(`mollieId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mollieId` VARCHAR(191) NULL,
    `amountValue` DECIMAL(65, 30) NOT NULL,
    `amountCurrency` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `method` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `customerId` INTEGER NULL,
    `subscriptionId` INTEGER NULL,
    `checkoutUrl` TEXT NULL,
    `isCancelable` BOOLEAN NOT NULL DEFAULT false,
    `chargedBackAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0.000000000000000000000000000000,
    `refundedAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0.000000000000000000000000000000,
    `adjustmentAt` DATETIME(3) NULL,
    `invoiceId` INTEGER NULL,

    INDEX `Payment_customerId_fkey`(`customerId` ASC),
    INDEX `Payment_invoiceId_idx`(`invoiceId` ASC),
    UNIQUE INDEX `Payment_mollieId_key`(`mollieId` ASC),
    INDEX `Payment_subscriptionId_fkey`(`subscriptionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mollieId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `amountValue` DECIMAL(65, 30) NOT NULL,
    `amountCurrency` VARCHAR(191) NOT NULL,
    `interval` VARCHAR(191) NOT NULL,
    `metadata` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `nextPaymentDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL,
    `mandateId` INTEGER NULL,
    `times` INTEGER NULL,
    `customerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Subscription_customerId_fkey`(`customerId` ASC),
    INDEX `Subscription_mandateId_fkey`(`mandateId` ASC),
    UNIQUE INDEX `Subscription_mollieId_key`(`mollieId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointmentImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `appointmentId` INTEGER NOT NULL,

    INDEX `appointmentImage_appointmentId_fkey`(`appointmentId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_Id` INTEGER NOT NULL,
    `procedure_Id` INTEGER NOT NULL,
    `doctor_Id` INTEGER NOT NULL DEFAULT 2,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `appointments_client_Id_fkey`(`client_Id` ASC),
    INDEX `appointments_doctor_Id_fkey`(`doctor_Id` ASC),
    INDEX `appointments_procedure_Id_fkey`(`procedure_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments_notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appointment_Id` INTEGER NOT NULL,
    `channel` ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SENT', 'ERROR') NOT NULL DEFAULT 'PENDING',
    `errorText` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `appointments_notifications_appointment_Id_fkey`(`appointment_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_security_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'SESSION_CREATED', 'SESSION_ROTATED', 'SESSION_REVOKED', 'SESSION_REUSE_DETECTED', 'ROLE_CHANGED', 'ACCOUNT_CREATED', 'ACCOUNT_DISABLED', 'ACCOUNT_ENABLED', 'ACCOUNT_DELETED', 'TWO_FACTOR_REQUIRED', 'TWO_FACTOR_SUCCEEDED', 'TWO_FACTOR_FAILED', 'TWO_FACTOR_LOCKED', 'TWO_FACTOR_RESENT', 'TRUSTED_DEVICE_CREATED', 'TRUSTED_DEVICE_REVOKED') NOT NULL,
    `actor_user_id` INTEGER NULL,
    `target_user_id` INTEGER NULL,
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auth_security_events_actor_user_id_createdAt_idx`(`actor_user_id` ASC, `createdAt` ASC),
    INDEX `auth_security_events_target_user_id_createdAt_idx`(`target_user_id` ASC, `createdAt` ASC),
    INDEX `auth_security_events_type_createdAt_idx`(`type` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_brands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logoUrl` TEXT NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#1d1d33',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `mollieProfileId` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `business_brands_organizationId_isActive_idx`(`organizationId` ASC, `isActive` ASC),
    UNIQUE INDEX `business_brands_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `choreographers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `additionalPhotos` VARCHAR(191) NULL,
    `birthday` VARCHAR(191) NULL,
    `category` ENUM('START', 'FAN', 'PRO') NULL,
    `description` TEXT NULL,
    `experience` INTEGER NULL,
    `firstNameEn` VARCHAR(191) NULL,
    `firstNameUa` VARCHAR(191) NULL,
    `lastNameEn` VARCHAR(191) NULL,
    `lastNameUa` VARCHAR(191) NULL,
    `mainPhoto` VARCHAR(191) NULL,
    `photo` VARCHAR(191) NULL,
    `showOnSite` BOOLEAN NOT NULL DEFAULT true,
    `templateDescription` TEXT NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_dance_groups` (
    `client_id` INTEGER NOT NULL,
    `group_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_dance_groups_group_id_idx`(`group_id` ASC),
    PRIMARY KEY (`client_id` ASC, `group_id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_Id` INTEGER NOT NULL,
    `loyaltyLevel` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `client_status_client_Id_fkey`(`client_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `birthday` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `anamnesis` VARCHAR(250) NULL,
    `social` VARCHAR(250) NULL,
    `description` VARCHAR(250) NULL,
    `image_3d` BOOLEAN NOT NULL DEFAULT false,
    `document` BOOLEAN NOT NULL DEFAULT false,
    `branch_Id` INTEGER NULL,

    INDEX `clients_branch_Id_fkey`(`branch_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` TEXT NULL,
    `client_Id` INTEGER NULL,
    `appointment_Id` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_Id` INTEGER NULL,

    INDEX `comments_appointment_Id_fkey`(`appointment_Id` ASC),
    INDEX `comments_client_Id_fkey`(`client_Id` ASC),
    INDEX `comments_user_Id_fkey`(`user_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_client_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `clientId` INTEGER NOT NULL,
    `payerRelation` VARCHAR(191) NULL DEFAULT 'unknown',
    `linkSource` VARCHAR(191) NOT NULL DEFAULT 'unlinked',
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_client_links_client_Id_fkey`(`clientId` ASC),
    UNIQUE INDEX `customer_client_links_customer_client_key`(`customerId` ASC, `clientId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dance_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `style` VARCHAR(191) NOT NULL,
    `level` ENUM('START', 'FAN', 'PRO') NOT NULL DEFAULT 'START',
    `maxParticipants` INTEGER NOT NULL DEFAULT 20,
    `choreographerId` INTEGER NOT NULL,
    `hallId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `branchId` INTEGER NULL,
    `lessonPriceCents` INTEGER NOT NULL DEFAULT 0,

    INDEX `dance_groups_branchId_fkey`(`branchId` ASC),
    INDEX `dance_groups_choreographerId_fkey`(`choreographerId` ASC),
    INDEX `dance_groups_hallId_fkey`(`hallId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dance_styles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `nameUa` VARCHAR(191) NULL,
    `nameEn` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `descriptionUa` TEXT NULL,
    `descriptionEn` TEXT NULL,
    `content` TEXT NULL,
    `contentUa` TEXT NULL,
    `contentEn` TEXT NULL,
    `image` VARCHAR(191) NULL,
    `youtubeUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `imap_host` VARCHAR(191) NOT NULL,
    `imap_port` INTEGER NOT NULL,
    `imap_secure` BOOLEAN NOT NULL DEFAULT true,
    `smtp_host` VARCHAR(191) NOT NULL,
    `smtp_port` INTEGER NOT NULL,
    `smtp_secure` BOOLEAN NOT NULL DEFAULT true,
    `username` VARCHAR(191) NOT NULL,
    `password_encrypted` TEXT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_synced_uid` INTEGER NULL,
    `last_synced_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `spam_folder` VARCHAR(191) NOT NULL DEFAULT 'Junk',
    `trash_folder` VARCHAR(191) NOT NULL DEFAULT 'Trash',

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message_id` INTEGER NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `storage_path` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_attachments_message_id_idx`(`message_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mailbox_id` INTEGER NOT NULL,
    `imap_uid` INTEGER NULL,
    `message_id` VARCHAR(191) NULL,
    `in_reply_to_message_id` VARCHAR(191) NULL,
    `is_outgoing` BOOLEAN NOT NULL DEFAULT false,
    `from_address` VARCHAR(191) NOT NULL,
    `from_name` VARCHAR(191) NULL,
    `to_addresses` JSON NOT NULL,
    `cc_addresses` JSON NULL,
    `subject` VARCHAR(191) NULL,
    `body_text` TEXT NULL,
    `body_html` TEXT NULL,
    `received_at` DATETIME(3) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `client_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_messages_client_id_idx`(`client_id` ASC),
    INDEX `email_messages_from_address_idx`(`from_address` ASC),
    UNIQUE INDEX `email_messages_mailbox_id_imap_uid_key`(`mailbox_id` ASC, `imap_uid` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `halls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `oldValues` JSON NULL,
    `newValues` JSON NULL,
    `actorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_audit_logs_actorId_idx`(`actorId` ASC),
    INDEX `invoice_audit_logs_invoiceId_createdAt_idx`(`invoiceId` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `type` ENUM('INITIAL', 'RESEND', 'REMINDER_BEFORE_DUE', 'REMINDER_OVERDUE') NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `recipientEmail` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `publicToken` VARCHAR(191) NOT NULL,
    `paymentUrl` TEXT NULL,
    `errorMessage` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `firstViewedAt` DATETIME(3) NULL,
    `lastViewedAt` DATETIME(3) NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoice_deliveries_createdById_idx`(`createdById` ASC),
    INDEX `invoice_deliveries_invoiceId_createdAt_idx`(`invoiceId` ASC, `createdAt` ASC),
    UNIQUE INDEX `invoice_deliveries_publicToken_key`(`publicToken` ASC),
    INDEX `invoice_deliveries_status_createdAt_idx`(`status` ASC, `createdAt` ASC),
    INDEX `invoice_deliveries_type_createdAt_idx`(`type` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `groupId` INTEGER NULL,
    `description` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPriceCents` INTEGER NOT NULL,
    `totalCents` INTEGER NOT NULL,

    INDEX `invoice_items_groupId_idx`(`groupId` ASC),
    INDEX `invoice_items_invoiceId_idx`(`invoiceId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_mollie_payment_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `mollieId` VARCHAR(191) NOT NULL,
    `paymentUrl` TEXT NOT NULL,
    `webhookToken` VARCHAR(191) NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoice_mollie_payment_links_invoiceId_archived_expiresAt_idx`(`invoiceId` ASC, `archived` ASC, `expiresAt` ASC),
    UNIQUE INDEX `invoice_mollie_payment_links_mollieId_key`(`mollieId` ASC),
    UNIQUE INDEX `invoice_mollie_payment_links_webhookToken_key`(`webhookToken` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` TEXT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `method` VARCHAR(191) NOT NULL DEFAULT 'OTHER',
    `reference` VARCHAR(191) NULL,

    INDEX `invoice_payments_createdById_idx`(`createdById` ASC),
    INDEX `invoice_payments_invoiceId_paidAt_idx`(`invoiceId` ASC, `paidAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `clientId` INTEGER NULL,
    `billToName` VARCHAR(191) NOT NULL,
    `billToEmail` VARCHAR(191) NULL,
    `issueDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EUR',
    `totalCents` INTEGER NOT NULL,
    `issuerName` VARCHAR(191) NOT NULL,
    `issuerAddress` VARCHAR(191) NULL,
    `issuerEmail` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `paymentReference` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `documentType` ENUM('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE') NOT NULL DEFAULT 'INVOICE',
    `parentInvoiceId` INTEGER NULL,
    `paidAmountCents` INTEGER NOT NULL DEFAULT 0,
    `creditedAmountCents` INTEGER NOT NULL DEFAULT 0,
    `balanceDueCents` INTEGER NOT NULL,
    `createdById` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `showPaymentButton` BOOLEAN NOT NULL DEFAULT true,
    `showPaymentQr` BOOLEAN NOT NULL DEFAULT true,
    `businessBrandId` INTEGER NULL,
    `issuerPhone` VARCHAR(191) NULL,
    `issuerWebsite` VARCHAR(191) NULL,
    `issuerLegalName` VARCHAR(191) NULL,
    `issuerKvkNumber` VARCHAR(191) NULL,
    `issuerVatNumber` VARCHAR(191) NULL,
    `issuerLogoUrl` TEXT NULL,
    `issuerPrimaryColor` VARCHAR(191) NULL,

    INDEX `invoices_businessBrandId_idx`(`businessBrandId` ASC),
    INDEX `invoices_clientId_idx`(`clientId` ASC),
    INDEX `invoices_createdById_idx`(`createdById` ASC),
    UNIQUE INDEX `invoices_number_key`(`number` ASC),
    INDEX `invoices_parentInvoiceId_idx`(`parentInvoiceId` ASC),
    INDEX `invoices_status_issueDate_idx`(`status` ASC, `issueDate` ASC),
    INDEX `invoices_updatedById_idx`(`updatedById` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legal_organizations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `legalName` VARCHAR(191) NOT NULL,
    `kvkNumber` VARCHAR(191) NULL,
    `vatNumber` VARCHAR(191) NULL,
    `registrationAddress` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT 'NL',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `mollieOrganizationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `legal_organizations_mollieOrganizationId_key`(`mollieOrganizationId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mollie_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_Id` INTEGER NOT NULL,
    `accessTokenEncrypted` TEXT NOT NULL,
    `refreshTokenEncrypted` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `scope` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastRefreshedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mollie_accounts_isActive_updatedAt_idx`(`isActive` ASC, `updatedAt` ASC),
    UNIQUE INDEX `mollie_accounts_user_Id_key`(`user_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mollie_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `molliePaymentId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL DEFAULT 'payment.webhook',
    `paymentStatus` VARCHAR(191) NULL,
    `processingStatus` VARCHAR(191) NOT NULL DEFAULT 'received',
    `payload` JSON NULL,
    `errorMessage` TEXT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `paymentId` INTEGER NULL,
    `dedupeKey` VARCHAR(191) NULL,

    UNIQUE INDEX `mollie_events_dedupeKey_key`(`dedupeKey` ASC),
    INDEX `mollie_events_molliePaymentId_receivedAt_idx`(`molliePaymentId` ASC, `receivedAt` ASC),
    INDEX `mollie_events_paymentId_idx`(`paymentId` ASC),
    INDEX `mollie_events_processingStatus_idx`(`processingStatus` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mollie_incident_resolutions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `incidentKey` VARCHAR(191) NOT NULL,
    `incidentType` VARCHAR(191) NOT NULL,
    `sourceId` INTEGER NOT NULL,
    `resolvedBy_Id` INTEGER NOT NULL,
    `note` TEXT NULL,
    `resolvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mollie_incident_resolutions_incidentKey_key`(`incidentKey` ASC),
    INDEX `mollie_incident_resolutions_incidentType_sourceId_idx`(`incidentType` ASC, `sourceId` ASC),
    INDEX `mollie_incident_resolutions_resolvedBy_Id_idx`(`resolvedBy_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mollie_oauth_states` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` VARCHAR(191) NOT NULL,
    `user_Id` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mollie_oauth_states_expiresAt_idx`(`expiresAt` ASC),
    UNIQUE INDEX `mollie_oauth_states_state_key`(`state` ASC),
    INDEX `mollie_oauth_states_user_Id_idx`(`user_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procedures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procedures_contraindication` (
    `id` VARCHAR(191) NOT NULL,
    `procedure_Id` INTEGER NOT NULL,
    `text` TEXT NULL,

    INDEX `procedures_contraindication_procedure_Id_fkey`(`procedure_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procedures_injection_zone` (
    `id` VARCHAR(191) NOT NULL,
    `procedure_Id` INTEGER NOT NULL,
    `text` TEXT NULL,

    INDEX `procedures_injection_zone_procedure_Id_fkey`(`procedure_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procedures_preparetions` (
    `id` VARCHAR(191) NOT NULL,
    `procedure_Id` INTEGER NOT NULL,
    `text` TEXT NULL,

    INDEX `procedures_preparetions_procedure_Id_fkey`(`procedure_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procedures_price` (
    `id` VARCHAR(191) NOT NULL,
    `procedure_Id` INTEGER NOT NULL,
    `zone` TEXT NULL,
    `price` DECIMAL(65, 30) NOT NULL,

    INDEX `procedures_price_procedure_Id_fkey`(`procedure_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procedures_rehabilitation` (
    `id` VARCHAR(191) NOT NULL,
    `procedure_Id` INTEGER NOT NULL,
    `text` TEXT NULL,

    INDEX `procedures_rehabilitation_procedure_Id_fkey`(`procedure_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procedures_result` (
    `id` VARCHAR(191) NOT NULL,
    `procedure_Id` INTEGER NOT NULL,
    `text` TEXT NULL,

    INDEX `procedures_result_procedure_Id_fkey`(`procedure_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `dayOfWeek` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,

    INDEX `schedule_slots_groupId_fkey`(`groupId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_Id` INTEGER NOT NULL,
    `refreshToken` VARCHAR(512) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `tokenHash` VARCHAR(128) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `sessions_refreshToken_key`(`refreshToken` ASC),
    UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash` ASC),
    INDEX `sessions_user_Id_fkey`(`user_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `category` ENUM('KOMUNALKA', 'AUTO', 'PRODUCTS', 'HEALTH', 'HUIS', 'PHARMACY', 'OTHER') NOT NULL,
    `description` VARCHAR(250) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `paymentMethod` ENUM('CASH', 'CARD', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trusted_devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `user_agent` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `last_used_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,

    UNIQUE INDEX `trusted_devices_token_hash_key`(`token_hash` ASC),
    INDEX `trusted_devices_user_id_idx`(`user_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `two_factor_challenges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `channel` ENUM('EMAIL', 'TELEGRAM') NOT NULL DEFAULT 'EMAIL',
    `token_hash` VARCHAR(128) NOT NULL,
    `code_hash` VARCHAR(128) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 5,
    `resend_count` INTEGER NOT NULL DEFAULT 0,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `two_factor_challenges_token_hash_key`(`token_hash` ASC),
    INDEX `two_factor_challenges_user_id_idx`(`user_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `salt` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'DOCTOR') NOT NULL DEFAULT 'MANAGER',
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `authVersion` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `users_email_key`(`email` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_Id` INTEGER NOT NULL,
    `procedureName` VARCHAR(191) NOT NULL,
    `doctorName` VARCHAR(191) NULL,
    `cost` DOUBLE NOT NULL,
    `wasSuccessful` BOOLEAN NOT NULL DEFAULT true,
    `clientFeedback` VARCHAR(191) NULL,
    `isComplaint` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `visit_history_client_Id_fkey`(`client_Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_client_Id_fkey` FOREIGN KEY (`client_Id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mandate` ADD CONSTRAINT `Mandate_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_mandateId_fkey` FOREIGN KEY (`mandateId`) REFERENCES `Mandate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointmentImage` ADD CONSTRAINT `appointmentImage_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_client_Id_fkey` FOREIGN KEY (`client_Id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_doctor_Id_fkey` FOREIGN KEY (`doctor_Id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_procedure_Id_fkey` FOREIGN KEY (`procedure_Id`) REFERENCES `procedures`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments_notifications` ADD CONSTRAINT `appointments_notifications_appointment_Id_fkey` FOREIGN KEY (`appointment_Id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_security_events` ADD CONSTRAINT `auth_security_events_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_security_events` ADD CONSTRAINT `auth_security_events_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_brands` ADD CONSTRAINT `business_brands_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `legal_organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_dance_groups` ADD CONSTRAINT `client_dance_groups_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_dance_groups` ADD CONSTRAINT `client_dance_groups_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `dance_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_status` ADD CONSTRAINT `client_status_client_Id_fkey` FOREIGN KEY (`client_Id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_branch_Id_fkey` FOREIGN KEY (`branch_Id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_appointment_Id_fkey` FOREIGN KEY (`appointment_Id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_client_Id_fkey` FOREIGN KEY (`client_Id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_Id_fkey` FOREIGN KEY (`user_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_client_links` ADD CONSTRAINT `customer_client_links_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_client_links` ADD CONSTRAINT `customer_client_links_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dance_groups` ADD CONSTRAINT `dance_groups_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dance_groups` ADD CONSTRAINT `dance_groups_choreographerId_fkey` FOREIGN KEY (`choreographerId`) REFERENCES `choreographers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dance_groups` ADD CONSTRAINT `dance_groups_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `halls`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_attachments` ADD CONSTRAINT `email_attachments_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `email_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_messages` ADD CONSTRAINT `email_messages_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_messages` ADD CONSTRAINT `email_messages_mailbox_id_fkey` FOREIGN KEY (`mailbox_id`) REFERENCES `email_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_audit_logs` ADD CONSTRAINT `invoice_audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_audit_logs` ADD CONSTRAINT `invoice_audit_logs_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_deliveries` ADD CONSTRAINT `invoice_deliveries_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_deliveries` ADD CONSTRAINT `invoice_deliveries_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `dance_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_mollie_payment_links` ADD CONSTRAINT `invoice_mollie_payment_links_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_businessBrandId_fkey` FOREIGN KEY (`businessBrandId`) REFERENCES `business_brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_parentInvoiceId_fkey` FOREIGN KEY (`parentInvoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mollie_accounts` ADD CONSTRAINT `mollie_accounts_user_Id_fkey` FOREIGN KEY (`user_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mollie_events` ADD CONSTRAINT `mollie_events_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mollie_incident_resolutions` ADD CONSTRAINT `mollie_incident_resolutions_resolvedBy_Id_fkey` FOREIGN KEY (`resolvedBy_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mollie_oauth_states` ADD CONSTRAINT `mollie_oauth_states_user_Id_fkey` FOREIGN KEY (`user_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procedures_contraindication` ADD CONSTRAINT `procedures_contraindication_procedure_Id_fkey` FOREIGN KEY (`procedure_Id`) REFERENCES `procedures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procedures_injection_zone` ADD CONSTRAINT `procedures_injection_zone_procedure_Id_fkey` FOREIGN KEY (`procedure_Id`) REFERENCES `procedures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procedures_preparetions` ADD CONSTRAINT `procedures_preparetions_procedure_Id_fkey` FOREIGN KEY (`procedure_Id`) REFERENCES `procedures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procedures_price` ADD CONSTRAINT `procedures_price_procedure_Id_fkey` FOREIGN KEY (`procedure_Id`) REFERENCES `procedures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procedures_rehabilitation` ADD CONSTRAINT `procedures_rehabilitation_procedure_Id_fkey` FOREIGN KEY (`procedure_Id`) REFERENCES `procedures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procedures_result` ADD CONSTRAINT `procedures_result_procedure_Id_fkey` FOREIGN KEY (`procedure_Id`) REFERENCES `procedures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_slots` ADD CONSTRAINT `schedule_slots_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `dance_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_Id_fkey` FOREIGN KEY (`user_Id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trusted_devices` ADD CONSTRAINT `trusted_devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `two_factor_challenges` ADD CONSTRAINT `two_factor_challenges_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_history` ADD CONSTRAINT `visit_history_client_Id_fkey` FOREIGN KEY (`client_Id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

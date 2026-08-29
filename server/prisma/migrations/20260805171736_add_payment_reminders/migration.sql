-- CreateTable
CREATE TABLE `payment_reminder_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `offsetDays` INTEGER NOT NULL DEFAULT 3,
    `sendHour` INTEGER NOT NULL DEFAULT 9,
    `sendMinute` INTEGER NOT NULL DEFAULT 0,
    `senderEmailAccountId` INTEGER NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedById` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_reminder_deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriptionId` INTEGER NOT NULL,
    `targetPaymentDate` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `language` ENUM('EN', 'NL', 'RU') NOT NULL,
    `recipientEmail` VARCHAR(191) NOT NULL,
    `errorMessage` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `triggeredById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_reminder_deliveries_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `payment_reminder_deliveries_subscriptionId_targetPaymentDate_key`(`subscriptionId`, `targetPaymentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_reminder_settings` ADD CONSTRAINT `payment_reminder_settings_senderEmailAccountId_fkey` FOREIGN KEY (`senderEmailAccountId`) REFERENCES `email_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_reminder_settings` ADD CONSTRAINT `payment_reminder_settings_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_reminder_deliveries` ADD CONSTRAINT `payment_reminder_deliveries_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_reminder_deliveries` ADD CONSTRAINT `payment_reminder_deliveries_triggeredById_fkey` FOREIGN KEY (`triggeredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

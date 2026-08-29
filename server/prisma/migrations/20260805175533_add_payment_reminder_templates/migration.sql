-- CreateTable
CREATE TABLE `payment_reminder_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `language` ENUM('EN', 'NL', 'RU') NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `bodyHtml` TEXT NOT NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_reminder_templates_language_key`(`language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_reminder_templates` ADD CONSTRAINT `payment_reminder_templates_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

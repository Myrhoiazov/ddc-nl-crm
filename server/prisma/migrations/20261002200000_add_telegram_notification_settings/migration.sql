CREATE TABLE `telegram_notification_settings` (
    `key` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `updated_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`key`),
    INDEX `telegram_notification_settings_updated_by_id_idx` (`updated_by_id`),
    CONSTRAINT `telegram_notification_settings_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

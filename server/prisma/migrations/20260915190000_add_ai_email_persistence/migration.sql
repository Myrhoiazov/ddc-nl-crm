-- CreateTable
CREATE TABLE `ai_email_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_email_message_id` INTEGER NULL,
    `message_id` VARCHAR(191) NULL,
    `thread_key` VARCHAR(191) NULL,
    `direction` ENUM('INBOUND', 'OUTBOUND') NOT NULL DEFAULT 'INBOUND',
    `sender` VARCHAR(191) NOT NULL,
    `recipients` JSON NOT NULL,
    `subject` VARCHAR(191) NULL,
    `normalized_body` TEXT NOT NULL,
    `received_at` DATETIME(3) NOT NULL,
    `status` ENUM('RECEIVED', 'NORMALIZED', 'CLASSIFIED', 'IGNORED_SPAM', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_email_messages_source_email_message_id_key`(`source_email_message_id`),
    INDEX `ai_email_messages_status_received_at_idx`(`status`, `received_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_email_classifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email_id` INTEGER NOT NULL,
    `spam` BOOLEAN NOT NULL,
    `needs_reply` BOOLEAN NOT NULL,
    `language` VARCHAR(16) NOT NULL,
    `intent` VARCHAR(32) NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `reason` VARCHAR(240) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `prompt_version` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_email_classifications_email_id_created_at_idx`(`email_id`, `created_at`),
    UNIQUE INDEX `ai_email_classifications_email_id_prompt_version_key`(`email_id`, `prompt_version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_email_classifications` ADD CONSTRAINT `ai_email_classifications_email_id_fkey` FOREIGN KEY (`email_id`) REFERENCES `ai_email_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

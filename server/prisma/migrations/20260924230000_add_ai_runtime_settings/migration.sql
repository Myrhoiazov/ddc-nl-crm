CREATE TABLE `ai_runtime_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `draft_provider` ENUM('OLLAMA', 'OPENAI') NOT NULL DEFAULT 'OLLAMA',
    `draft_model` VARCHAR(191) NOT NULL,
    `updated_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `ai_runtime_settings_updated_by_id_idx` (`updated_by_id`),
    CONSTRAINT `ai_runtime_settings_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ai_email_drafts`
    ADD COLUMN `provider` ENUM('OLLAMA', 'OPENAI') NOT NULL DEFAULT 'OLLAMA',
    ADD COLUMN `generation_error_code` VARCHAR(64) NULL,
    ADD COLUMN `generation_error_message` VARCHAR(500) NULL;

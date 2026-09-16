CREATE TABLE `ai_email_drafts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `subject` VARCHAR(500) NOT NULL,
    `body` TEXT NOT NULL,
    `reply_language` VARCHAR(16) NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `needs_manual_answer` BOOLEAN NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `prompt_version` VARCHAR(64) NOT NULL,
    `status` ENUM('GENERATED', 'EDITED', 'APPROVED', 'REJECTED', 'SPAM', 'SENT') NOT NULL DEFAULT 'GENERATED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ai_email_drafts_email_id_version_key`(`email_id`, `version`),
    INDEX `ai_email_drafts_email_id_status_created_at_idx`(`email_id`, `status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_email_knowledge_refs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draft_id` INTEGER NOT NULL,
    `knowledge_id` VARCHAR(191) NOT NULL,
    `source_url` VARCHAR(500) NOT NULL,
    `score` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `ai_email_knowledge_refs_draft_id_knowledge_id_key`(`draft_id`, `knowledge_id`),
    INDEX `ai_email_knowledge_refs_knowledge_id_idx`(`knowledge_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ai_email_drafts` ADD CONSTRAINT `ai_email_drafts_email_id_fkey` FOREIGN KEY (`email_id`) REFERENCES `ai_email_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ai_email_knowledge_refs` ADD CONSTRAINT `ai_email_knowledge_refs_draft_id_fkey` FOREIGN KEY (`draft_id`) REFERENCES `ai_email_drafts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

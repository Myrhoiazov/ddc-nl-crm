CREATE TABLE `ai_email_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draft_id` INTEGER NOT NULL,
    `draft_version` INTEGER NOT NULL,
    `action` ENUM('APPROVE', 'EDIT', 'REJECT', 'SPAM') NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `edited_body` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `ai_email_approvals_draft_id_created_at_idx`(`draft_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ai_email_approvals` ADD CONSTRAINT `ai_email_approvals_draft_id_fkey` FOREIGN KEY (`draft_id`) REFERENCES `ai_email_drafts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

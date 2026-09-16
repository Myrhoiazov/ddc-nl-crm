-- AlterTable
ALTER TABLE `ai_email_drafts`
    MODIFY `status` ENUM('GENERATED', 'EDITED', 'APPROVED', 'REJECTED', 'SPAM', 'SENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'GENERATED',
    ADD COLUMN `send_idempotency_key` VARCHAR(191) NULL,
    ADD COLUMN `send_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `sent_email_message_id` INTEGER NULL,
    ADD COLUMN `sent_at` DATETIME(3) NULL,
    ADD COLUMN `send_error` VARCHAR(500) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ai_email_drafts_send_idempotency_key_key` ON `ai_email_drafts`(`send_idempotency_key`);

-- CreateTable
CREATE TABLE `ai_prompts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slot` ENUM('DRAFT_BODY', 'CLASSIFICATION') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `tags` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ai_prompts_slot_is_active_idx`(`slot`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

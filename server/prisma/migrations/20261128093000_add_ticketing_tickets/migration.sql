-- CreateTable
CREATE TABLE `tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_item_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,
    `code_hash` CHAR(64) NOT NULL,
    `short_code` VARCHAR(8) NOT NULL,
    `token_nonce` CHAR(32) NOT NULL,
    `token_version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('VALID', 'USED', 'VOID') NOT NULL DEFAULT 'VALID',
    `issued_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `used_by_id` INTEGER NULL,
    `voided_at` DATETIME(3) NULL,
    `void_reason` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tickets_order_item_id_key`(`order_item_id`),
    UNIQUE INDEX `tickets_code_hash_key`(`code_hash`),
    UNIQUE INDEX `tickets_short_code_key`(`short_code`),
    INDEX `tickets_session_id_status_idx`(`session_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `type` ENUM('TICKETS', 'RESEND', 'REFUND_NOTICE', 'RECOVERY_LINK') NOT NULL,
    `status` ENUM('PENDING', 'SENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `recipient_email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(255) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `next_attempt_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_error` TEXT NULL,
    `sent_at` DATETIME(3) NULL,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_deliveries_status_next_attempt_at_idx`(`status`, `next_attempt_at`),
    INDEX `ticket_deliveries_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entity_type` VARCHAR(32) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `actor_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_audit_logs_entity_type_entity_id_created_at_idx`(`entity_type`, `entity_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `ticket_order_items`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `ticket_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_deliveries` ADD CONSTRAINT `ticket_deliveries_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `ticket_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

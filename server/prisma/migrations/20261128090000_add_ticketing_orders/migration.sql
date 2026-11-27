-- CreateTable
CREATE TABLE `ticket_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` VARCHAR(16) NOT NULL,
    `access_token_hash` CHAR(64) NOT NULL,
    `session_id` INTEGER NOT NULL,
    `hold_id` INTEGER NOT NULL,
    `buyer_name` VARCHAR(191) NOT NULL,
    `buyer_email` VARCHAR(191) NOT NULL,
    `buyer_phone` VARCHAR(32) NULL,
    `locale` VARCHAR(5) NOT NULL DEFAULT 'nl',
    `subtotal_cents` INTEGER NOT NULL,
    `fee_cents` INTEGER NOT NULL DEFAULT 0,
    `total_cents` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'EUR',
    `refunded_cents` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'NEEDS_REVIEW') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `payment_deadline_at` DATETIME(3) NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `review_reason` VARCHAR(191) NULL,
    `event_snapshot` JSON NOT NULL,
    `terms_accepted_at` DATETIME(3) NOT NULL,
    `terms_version` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ticket_orders_number_key`(`number`),
    UNIQUE INDEX `ticket_orders_access_token_hash_key`(`access_token_hash`),
    UNIQUE INDEX `ticket_orders_hold_id_key`(`hold_id`),
    INDEX `ticket_orders_buyer_email_idx`(`buyer_email`),
    INDEX `ticket_orders_session_id_status_idx`(`session_id`, `status`),
    INDEX `ticket_orders_status_payment_deadline_at_idx`(`status`, `payment_deadline_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,
    `seat_id` INTEGER NOT NULL,
    `section_label` VARCHAR(32) NOT NULL DEFAULT '',
    `row_label` VARCHAR(16) NOT NULL,
    `seat_label` VARCHAR(16) NOT NULL,
    `category_name` VARCHAR(191) NOT NULL,
    `price_cents` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'ACTIVE',

    INDEX `ticket_order_items_session_id_seat_id_idx`(`session_id`, `seat_id`),
    INDEX `ticket_order_items_seat_id_idx`(`seat_id`),
    UNIQUE INDEX `ticket_order_items_order_id_seat_id_key`(`order_id`, `seat_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `mollie_payment_id` VARCHAR(64) NULL,
    `idempotency_key` CHAR(36) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'CREATED',
    `amount_cents` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'EUR',
    `method` VARCHAR(32) NULL,
    `checkout_url` TEXT NULL,
    `mollie_expires_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `refunded_cents` INTEGER NOT NULL DEFAULT 0,
    `charged_back_cents` INTEGER NOT NULL DEFAULT 0,
    `last_synced_at` DATETIME(3) NULL,
    `mollie_mode` ENUM('TEST', 'LIVE') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ticket_payments_mollie_payment_id_key`(`mollie_payment_id`),
    UNIQUE INDEX `ticket_payments_idempotency_key_key`(`idempotency_key`),
    INDEX `ticket_payments_order_id_idx`(`order_id`),
    INDEX `ticket_payments_status_last_synced_at_idx`(`status`, `last_synced_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_payment_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mollie_payment_id` VARCHAR(64) NOT NULL,
    `source` ENUM('WEBHOOK', 'RECONCILE', 'RETURN') NOT NULL,
    `observed_status` VARCHAR(24) NULL,
    `payload` JSON NULL,
    `outcome` VARCHAR(32) NULL,
    `error_message` TEXT NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,

    INDEX `ticket_payment_events_mollie_payment_id_received_at_idx`(`mollie_payment_id`, `received_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ticket_session_seats` ADD CONSTRAINT `ticket_session_seats_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `ticket_order_items`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket_orders` ADD CONSTRAINT `ticket_orders_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `ticket_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_orders` ADD CONSTRAINT `ticket_orders_hold_id_fkey` FOREIGN KEY (`hold_id`) REFERENCES `ticket_holds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_order_items` ADD CONSTRAINT `ticket_order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `ticket_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_order_items` ADD CONSTRAINT `ticket_order_items_seat_id_fkey` FOREIGN KEY (`seat_id`) REFERENCES `ticket_seats`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_payments` ADD CONSTRAINT `ticket_payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `ticket_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ручные CHECK-ограничения (Prisma их не описывает, см. комментарий в ticketing.prisma).
ALTER TABLE `ticket_orders` ADD CONSTRAINT `ticket_orders_amounts_chk` CHECK (
    `subtotal_cents` >= 0 AND `fee_cents` >= 0 AND `total_cents` = `subtotal_cents` + `fee_cents`
    AND `refunded_cents` >= 0 AND `refunded_cents` <= `total_cents`
);

ALTER TABLE `ticket_order_items` ADD CONSTRAINT `ticket_order_items_price_chk` CHECK (`price_cents` >= 0);

ALTER TABLE `ticket_payments` ADD CONSTRAINT `ticket_payments_amounts_chk` CHECK (
    `amount_cents` >= 0 AND `refunded_cents` >= 0 AND `charged_back_cents` >= 0
);

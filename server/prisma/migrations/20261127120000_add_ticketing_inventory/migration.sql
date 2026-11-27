-- CreateTable
CREATE TABLE `ticket_venues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_seat_maps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `venue_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `name` VARCHAR(191) NOT NULL,
    `canvas` JSON NULL,
    `published_at` DATETIME(3) NULL,
    `published_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ticket_seat_maps_published_by_id_idx`(`published_by_id`),
    UNIQUE INDEX `ticket_seat_maps_venue_id_version_key`(`venue_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_seat_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seat_map_id` INTEGER NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color_slot` TINYINT NOT NULL DEFAULT 1,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ticket_seat_categories_seat_map_id_code_key`(`seat_map_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_seats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seat_map_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `section_label` VARCHAR(32) NOT NULL DEFAULT '',
    `row_label` VARCHAR(16) NOT NULL,
    `seat_label` VARCHAR(16) NOT NULL,
    `x` INTEGER NOT NULL,
    `y` INTEGER NOT NULL,
    `rotation` INTEGER NOT NULL DEFAULT 0,
    `is_accessible` BOOLEAN NOT NULL DEFAULT false,
    `is_default_blocked` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ticket_seats_category_id_idx`(`category_id`),
    UNIQUE INDEX `ticket_seats_seat_map_id_section_label_row_label_seat_label_key`(`seat_map_id`, `section_label`, `row_label`, `seat_label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(120) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `poster_url` TEXT NULL,
    `business_brand_id` INTEGER NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ticket_events_slug_key`(`slug`),
    INDEX `ticket_events_business_brand_id_idx`(`business_brand_id`),
    INDEX `ticket_events_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event_id` INTEGER NOT NULL,
    `seat_map_id` INTEGER NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `doors_at` DATETIME(3) NULL,
    `sales_start_at` DATETIME(3) NULL,
    `sales_end_at` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'ON_SALE', 'PAUSED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `hold_ttl_seconds` INTEGER NOT NULL DEFAULT 600,
    `max_seats_per_order` INTEGER NOT NULL DEFAULT 8,
    `currency` CHAR(3) NOT NULL DEFAULT 'EUR',
    `inventory_generated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ticket_sessions_event_id_starts_at_idx`(`event_id`, `starts_at`),
    INDEX `ticket_sessions_seat_map_id_idx`(`seat_map_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_session_prices` (
    `session_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `price_cents` INTEGER NOT NULL,

    INDEX `ticket_session_prices_category_id_idx`(`category_id`),
    PRIMARY KEY (`session_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_session_seats` (
    `session_id` INTEGER NOT NULL,
    `seat_id` INTEGER NOT NULL,
    `status` ENUM('AVAILABLE', 'HELD', 'SOLD', 'BLOCKED') NOT NULL DEFAULT 'AVAILABLE',
    `hold_id` INTEGER NULL,
    `order_item_id` INTEGER NULL,
    `price_cents` INTEGER NOT NULL,
    `block_reason` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ticket_session_seats_order_item_id_key`(`order_item_id`),
    INDEX `ticket_session_seats_session_id_status_idx`(`session_id`, `status`),
    INDEX `ticket_session_seats_seat_id_idx`(`seat_id`),
    INDEX `ticket_session_seats_hold_id_idx`(`hold_id`),
    PRIMARY KEY (`session_id`, `seat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_holds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `status` ENUM('ACTIVE', 'CONVERTED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `expires_at` DATETIME(3) NOT NULL,
    `seat_count` INTEGER NOT NULL,
    `client_ip_hash` CHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `released_at` DATETIME(3) NULL,

    UNIQUE INDEX `ticket_holds_token_hash_key`(`token_hash`),
    INDEX `ticket_holds_status_expires_at_idx`(`status`, `expires_at`),
    INDEX `ticket_holds_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ticket_seat_maps` ADD CONSTRAINT `ticket_seat_maps_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `ticket_venues`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_seat_maps` ADD CONSTRAINT `ticket_seat_maps_published_by_id_fkey` FOREIGN KEY (`published_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_seat_categories` ADD CONSTRAINT `ticket_seat_categories_seat_map_id_fkey` FOREIGN KEY (`seat_map_id`) REFERENCES `ticket_seat_maps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_seats` ADD CONSTRAINT `ticket_seats_seat_map_id_fkey` FOREIGN KEY (`seat_map_id`) REFERENCES `ticket_seat_maps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_seats` ADD CONSTRAINT `ticket_seats_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `ticket_seat_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_events` ADD CONSTRAINT `ticket_events_business_brand_id_fkey` FOREIGN KEY (`business_brand_id`) REFERENCES `business_brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_events` ADD CONSTRAINT `ticket_events_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_sessions` ADD CONSTRAINT `ticket_sessions_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `ticket_events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_sessions` ADD CONSTRAINT `ticket_sessions_seat_map_id_fkey` FOREIGN KEY (`seat_map_id`) REFERENCES `ticket_seat_maps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_session_prices` ADD CONSTRAINT `ticket_session_prices_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `ticket_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_session_prices` ADD CONSTRAINT `ticket_session_prices_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `ticket_seat_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_session_seats` ADD CONSTRAINT `ticket_session_seats_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `ticket_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_session_seats` ADD CONSTRAINT `ticket_session_seats_seat_id_fkey` FOREIGN KEY (`seat_id`) REFERENCES `ticket_seats`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_session_seats` ADD CONSTRAINT `ticket_session_seats_hold_id_fkey` FOREIGN KEY (`hold_id`) REFERENCES `ticket_holds`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket_holds` ADD CONSTRAINT `ticket_holds_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `ticket_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Ручные CHECK-ограничения (Prisma их не описывает, см. комментарий в ticketing.prisma).
-- Состояние места и его ссылки должны быть согласованы на уровне БД, а не только кода.
ALTER TABLE `ticket_session_seats` ADD CONSTRAINT `ticket_session_seats_status_refs_chk` CHECK (
    (`status` = 'HELD' AND `hold_id` IS NOT NULL AND `order_item_id` IS NULL)
    OR (`status` = 'SOLD' AND `order_item_id` IS NOT NULL)
    OR (`status` IN ('AVAILABLE', 'BLOCKED') AND `hold_id` IS NULL AND `order_item_id` IS NULL)
);

ALTER TABLE `ticket_session_seats` ADD CONSTRAINT `ticket_session_seats_price_chk` CHECK (`price_cents` >= 0);

ALTER TABLE `ticket_session_prices` ADD CONSTRAINT `ticket_session_prices_price_chk` CHECK (`price_cents` >= 0);

ALTER TABLE `ticket_seat_categories` ADD CONSTRAINT `ticket_seat_categories_color_slot_chk` CHECK (`color_slot` BETWEEN 1 AND 8);

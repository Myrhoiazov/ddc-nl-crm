CREATE TABLE `knowledge_documents` (
    `id` VARCHAR(191) NOT NULL,
    `source_type` VARCHAR(32) NOT NULL,
    `source_id` VARCHAR(500) NOT NULL,
    `source_url` VARCHAR(500) NOT NULL,
    `title` VARCHAR(500) NULL,
    `language` VARCHAR(16) NULL,
    `content_hash` VARCHAR(64) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ERROR') NOT NULL DEFAULT 'ACTIVE',
    `error_message` VARCHAR(500) NULL,
    `last_synced_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `knowledge_documents_source_id_status_idx`(`source_id`, `status`),
    INDEX `knowledge_documents_content_hash_idx`(`content_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `knowledge_chunks` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `ordinal` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `embedding` JSON NOT NULL,
    `embedding_model` VARCHAR(191) NOT NULL,
    `content_hash` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `knowledge_chunks_document_id_ordinal_key`(`document_id`, `ordinal`),
    INDEX `knowledge_chunks_content_hash_idx`(`content_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `knowledge_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

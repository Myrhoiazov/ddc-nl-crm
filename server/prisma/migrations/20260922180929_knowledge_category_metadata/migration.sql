-- AlterTable
ALTER TABLE `knowledge_documents`
    ADD COLUMN `category` ENUM('BRAND', 'LOCATIONS', 'DANCE_STYLES', 'CLASSES', 'SCHEDULE', 'REGISTRATION', 'FAQ', 'CAMP', 'BUSINESS_RULES', 'SOURCES', 'OTHER') NOT NULL DEFAULT 'OTHER',
    ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `tags` JSON NOT NULL DEFAULT (JSON_ARRAY()),
    MODIFY `status` ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'ERROR') NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX `knowledge_documents_category_idx` ON `knowledge_documents`(`category`);

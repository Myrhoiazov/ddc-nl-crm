-- AlterTable
ALTER TABLE `knowledge_documents` ADD COLUMN `kb_version` VARCHAR(8) NOT NULL DEFAULT 'v1';

-- AlterTable
ALTER TABLE `knowledge_chunks` ADD COLUMN `metadata` JSON NULL;

-- AlterTable
ALTER TABLE `ai_email_drafts` ADD COLUMN `rag_trace` JSON NULL;

-- CreateIndex
CREATE INDEX `knowledge_documents_kb_version_status_idx` ON `knowledge_documents`(`kb_version`, `status`);

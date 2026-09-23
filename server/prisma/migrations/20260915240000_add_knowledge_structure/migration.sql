ALTER TABLE `knowledge_documents`
  ADD COLUMN `relative_path` VARCHAR(500) NULL,
  ADD COLUMN `folder_path` VARCHAR(500) NULL;

ALTER TABLE `knowledge_chunks`
  ADD COLUMN `heading_path` JSON NOT NULL;

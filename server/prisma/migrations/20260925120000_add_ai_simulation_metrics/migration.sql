-- CreateTable
CREATE TABLE `ai_simulation_runs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `from_address` VARCHAR(320) NULL,
    `subject` VARCHAR(500) NOT NULL,
    `body` TEXT NOT NULL,
    `top_k` INTEGER NULL,
    `no_knowledge` BOOLEAN NOT NULL DEFAULT false,
    `force_draft` BOOLEAN NOT NULL DEFAULT false,
    `no_query_expansion` BOOLEAN NOT NULL DEFAULT false,
    `no_rerank` BOOLEAN NOT NULL DEFAULT false,
    `classification_prompt_id` INTEGER NULL,
    `classification_prompt_name` VARCHAR(191) NULL,
    `draft_body_prompt_id` INTEGER NULL,
    `draft_body_prompt_name` VARCHAR(191) NULL,
    `draft_provider` ENUM('OLLAMA', 'OPENAI') NULL,
    `draft_model` VARCHAR(191) NULL,
    `classification_spam` BOOLEAN NULL,
    `classification_needs_reply` BOOLEAN NULL,
    `classification_confidence` DOUBLE NULL,
    `classification_json` JSON NULL,
    `knowledge_json` JSON NULL,
    `draft_json` JSON NULL,
    `deterministic_spam_reason` VARCHAR(191) NULL,
    `draft_skipped_reason` VARCHAR(191) NULL,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `ai_simulation_runs_created_at_idx`(`created_at`),
    INDEX `ai_simulation_runs_draft_provider_draft_model_idx`(`draft_provider`, `draft_model`),
    INDEX `ai_simulation_runs_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_simulation_run_metrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `run_id` INTEGER NOT NULL,
    `stage` ENUM('CLASSIFICATION', 'QUERY_EXPANSION', 'RETRIEVAL_EMBEDDING', 'RERANK', 'DRAFT') NOT NULL,
    `provider` ENUM('OLLAMA', 'OPENAI') NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `call_count` INTEGER NOT NULL DEFAULT 1,
    `duration_ms` INTEGER NOT NULL,
    `prompt_tokens` INTEGER NULL,
    `completion_tokens` INTEGER NULL,
    `total_tokens` INTEGER NULL,
    `meta` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `ai_simulation_run_metrics_run_id_idx`(`run_id`),
    INDEX `ai_simulation_run_metrics_stage_provider_model_idx`(`stage`, `provider`, `model`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_simulation_runs` ADD CONSTRAINT `ai_simulation_runs_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ai_simulation_run_metrics` ADD CONSTRAINT `ai_simulation_run_metrics_run_id_fkey` FOREIGN KEY (`run_id`) REFERENCES `ai_simulation_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

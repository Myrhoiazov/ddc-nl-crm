-- CreateTable
CREATE TABLE `mandate_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mandate_Id` INTEGER NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `storagePath` VARCHAR(191) NOT NULL,
    `caption` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mandate_documents_storagePath_key`(`storagePath`),
    INDEX `mandate_documents_mandate_Id_idx`(`mandate_Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mandate_documents` ADD CONSTRAINT `mandate_documents_mandate_Id_fkey` FOREIGN KEY (`mandate_Id`) REFERENCES `Mandate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


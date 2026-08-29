-- AlterTable
ALTER TABLE `clients` ADD COLUMN `preferredLanguage` ENUM('EN', 'NL', 'RU') NOT NULL DEFAULT 'RU';

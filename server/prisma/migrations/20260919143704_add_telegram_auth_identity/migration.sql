-- AlterTable
ALTER TABLE `auth_security_events` MODIFY `type` ENUM('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGIN_TELEGRAM_SUCCEEDED', 'LOGIN_TELEGRAM_FAILED', 'TELEGRAM_LINKED', 'TELEGRAM_UNLINKED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'SESSION_CREATED', 'SESSION_ROTATED', 'SESSION_REVOKED', 'SESSION_REUSE_DETECTED', 'ROLE_CHANGED', 'ACCOUNT_CREATED', 'ACCOUNT_DISABLED', 'ACCOUNT_ENABLED', 'ACCOUNT_DELETED', 'TWO_FACTOR_REQUIRED', 'TWO_FACTOR_SUCCEEDED', 'TWO_FACTOR_FAILED', 'TWO_FACTOR_LOCKED', 'TWO_FACTOR_RESENT', 'TRUSTED_DEVICE_CREATED', 'TRUSTED_DEVICE_REVOKED') NOT NULL;

-- CreateTable
CREATE TABLE `auth_identities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `provider` ENUM('TELEGRAM') NOT NULL,
    `provider_user_id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `display_name` VARCHAR(191) NULL,
    `linked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_login_at` DATETIME(3) NULL,

    INDEX `auth_identities_user_id_idx`(`user_id`),
    UNIQUE INDEX `auth_identities_provider_provider_user_id_key`(`provider`, `provider_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_auth_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` VARCHAR(191) NOT NULL,
    `nonce_hash` VARCHAR(128) NOT NULL,
    `code_verifier` VARCHAR(191) NOT NULL,
    `flow` ENUM('LOGIN', 'LINK') NOT NULL,
    `user_id` INTEGER NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `telegram_auth_transactions_state_key`(`state`),
    INDEX `telegram_auth_transactions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_identities` ADD CONSTRAINT `auth_identities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `telegram_auth_transactions` ADD CONSTRAINT `telegram_auth_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

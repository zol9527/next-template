-- AlterTable
-- SystemSetting.value 改为 MEDIUMTEXT 以支持存储加密后的 AI Provider 配置 JSON
ALTER TABLE `system_settings` MODIFY `value` MEDIUMTEXT NOT NULL;

-- CreateTable
CREATE TABLE `ai_prompt_templates` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `variables` JSON NOT NULL,
    `version` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_prompt_templates_slug_is_active_idx`(`slug`, `is_active`),
    INDEX `ai_prompt_templates_category_idx`(`category`),
    UNIQUE INDEX `ai_prompt_templates_slug_version_key`(`slug`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_usage_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `capability` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `input_tokens` INTEGER NOT NULL DEFAULT 0,
    `output_tokens` INTEGER NOT NULL DEFAULT 0,
    `cost_amount` DECIMAL(10, 6) NOT NULL DEFAULT 0.000000,
    `currency_code` VARCHAR(191) NOT NULL DEFAULT 'CNY',
    `duration_ms` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'success',
    `error_message` TEXT NULL,
    `entity` VARCHAR(191) NULL,
    `entity_id` VARCHAR(191) NULL,
    `trace_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `ai_usage_logs_provider_created_at_idx`(`provider`, `created_at`),
    INDEX `ai_usage_logs_capability_created_at_idx`(`capability`, `created_at`),
    INDEX `ai_usage_logs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_prompt_templates` ADD CONSTRAINT `ai_prompt_templates_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

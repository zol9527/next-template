-- 补充创建通知相关表
-- 之前 schema 中定义了但缺少对应 migration，导致 reset-db 后 seed 失败

-- 先创建 enum 类型（MySQL 中 ENUM 是列级定义，不需要单独 CREATE TYPE）

CREATE TABLE `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `type` ENUM('SYSTEM', 'COURSE', 'ACTIVITY', 'ORDER') NOT NULL DEFAULT 'SYSTEM',
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `summary` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `linkType` VARCHAR(191) NULL,
    `linkId` VARCHAR(191) NULL,
    `isGlobal` BOOLEAN NOT NULL DEFAULT false,
    `targetUser` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `notifications_type_idx`(`type`),
    INDEX `notifications_isGlobal_created_at_idx`(`isGlobal`, `created_at`),
    INDEX `notifications_targetUser_created_at_idx`(`targetUser`, `created_at`),
    INDEX `notifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notification_reads` (
    `id` VARCHAR(36) NOT NULL,
    `notification_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `notification_reads_notification_id_user_id_key`(`notification_id`, `user_id`),
    INDEX `notification_reads_user_id_read_at_idx`(`user_id`, `read_at`),
    INDEX `notification_reads_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 外键约束
ALTER TABLE `notification_reads` ADD CONSTRAINT `notification_reads_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `notification_reads` ADD CONSTRAINT `notification_reads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

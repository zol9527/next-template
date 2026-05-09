-- CreateTable
-- 备份与恢复任务表，支持数据库备份、文件备份及恢复操作
CREATE TABLE `backup_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `job_type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `requested_by` VARCHAR(191) NOT NULL,
    `options` VARCHAR(191) NOT NULL DEFAULT '{}',
    `backup_file_key` VARCHAR(191) NULL,
    `file_name` VARCHAR(191) NULL,
    `file_size` BIGINT NULL,
    `stats` TEXT NULL,
    `snapshot_time` DATETIME(3) NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `backup_jobs_status_idx`(`status`),
    INDEX `backup_jobs_job_type_idx`(`job_type`),
    INDEX `backup_jobs_requested_by_idx`(`requested_by`),
    INDEX `backup_jobs_started_at_idx`(`started_at`),
    INDEX `backup_jobs_completed_at_idx`(`completed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

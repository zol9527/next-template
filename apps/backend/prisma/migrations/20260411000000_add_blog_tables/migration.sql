-- CreateTable
CREATE TABLE `blog_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `parent_id` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `blog_categories_slug_key`(`slug`),
    INDEX `blog_categories_parent_id_idx`(`parent_id`),
    INDEX `blog_categories_status_idx`(`status`),
    INDEX `blog_categories_sort_order_idx`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blog_articles` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NULL,
    `content` LONGTEXT NULL,
    `cover_image` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `author_id` VARCHAR(191) NULL,
    `category_id` VARCHAR(191) NULL,
    `meta_title` VARCHAR(191) NULL,
    `meta_description` TEXT NULL,
    `og_image` VARCHAR(191) NULL,
    `source_type` ENUM('EDITOR', 'MARKDOWN', 'API') NOT NULL DEFAULT 'EDITOR',
    `source_path` VARCHAR(191) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `like_count` INTEGER NOT NULL DEFAULT 0,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `blog_articles_slug_key`(`slug`),
    INDEX `blog_articles_status_published_at_idx`(`status`, `published_at`),
    INDEX `blog_articles_slug_idx`(`slug`),
    INDEX `blog_articles_author_id_idx`(`author_id`),
    INDEX `blog_articles_category_id_idx`(`category_id`),
    INDEX `blog_articles_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blog_tags` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `blog_tags_name_key`(`name`),
    UNIQUE INDEX `blog_tags_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blog_article_tags` (
    `article_id` VARCHAR(191) NOT NULL,
    `tag_id` VARCHAR(191) NOT NULL,

    INDEX `blog_article_tags_tag_id_idx`(`tag_id`),
    PRIMARY KEY (`article_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blog_article_views` (
    `id` VARCHAR(191) NOT NULL,
    `article_id` VARCHAR(191) NOT NULL,
    `viewer_id` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `referer` VARCHAR(191) NULL,
    `read_time` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `blog_article_views_article_id_created_at_idx`(`article_id`, `created_at`),
    INDEX `blog_article_views_article_id_idx`(`article_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `blog_articles` ADD CONSTRAINT `blog_articles_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blog_articles` ADD CONSTRAINT `blog_articles_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `blog_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blog_categories` ADD CONSTRAINT `blog_categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `blog_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blog_article_tags` ADD CONSTRAINT `blog_article_tags_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `blog_articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blog_article_tags` ADD CONSTRAINT `blog_article_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `blog_tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blog_article_views` ADD CONSTRAINT `blog_article_views_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `blog_articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

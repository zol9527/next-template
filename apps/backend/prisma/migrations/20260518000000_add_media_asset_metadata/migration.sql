-- AlterTable: 为 media_assets 表添加 metadata JSON 字段
-- 用于存储图片分辨率、视频时长等元数据
ALTER TABLE `media_assets` ADD COLUMN `metadata` JSON NULL;

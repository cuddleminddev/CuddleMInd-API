-- AlterTable
ALTER TABLE `user` ADD COLUMN `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active';

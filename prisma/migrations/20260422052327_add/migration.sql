/*
  Warnings:

  - You are about to drop the column `duration_minutes` on the `bookings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `bookings` DROP COLUMN `duration_minutes`;

-- CreateTable
CREATE TABLE `booking_settings` (
    `id` VARCHAR(191) NOT NULL,
    `setting_key` VARCHAR(191) NOT NULL DEFAULT 'default',
    `booking_duration_minutes` INTEGER NOT NULL DEFAULT 30,
    `booking_charge` DECIMAL(65, 30) NOT NULL DEFAULT 100.0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `booking_settings_setting_key_key`(`setting_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affirmations` (
    `id` VARCHAR(191) NOT NULL,
    `quote` TEXT NOT NULL,
    `author` VARCHAR(191) NOT NULL,
    `background_image` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

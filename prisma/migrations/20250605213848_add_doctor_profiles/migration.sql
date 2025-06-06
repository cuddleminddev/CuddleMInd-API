-- AlterTable
ALTER TABLE `users` ADD COLUMN `profile_picture` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `doctor_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `doctorId` VARCHAR(191) NOT NULL,
    `audio_consultation_charge` DECIMAL(65, 30) NOT NULL,
    `video_consultation_charge` DECIMAL(65, 30) NOT NULL,

    UNIQUE INDEX `doctor_profiles_doctorId_key`(`doctorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `doctor_profiles` ADD CONSTRAINT `doctor_profiles_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

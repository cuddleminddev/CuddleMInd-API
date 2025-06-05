/*
  Warnings:

  - You are about to drop the column `ended_at` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `support_id` on the `chat_sessions` table. All the data in the column will be lost.
  - Added the required column `patientId` to the `chat_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `chat_sessions` DROP FOREIGN KEY `chat_sessions_patient_id_fkey`;

-- DropForeignKey
ALTER TABLE `chat_sessions` DROP FOREIGN KEY `chat_sessions_support_id_fkey`;

-- DropIndex
DROP INDEX `chat_sessions_patient_id_fkey` ON `chat_sessions`;

-- DropIndex
DROP INDEX `chat_sessions_support_id_fkey` ON `chat_sessions`;

-- AlterTable
ALTER TABLE `chat_sessions` DROP COLUMN `ended_at`,
    DROP COLUMN `patient_id`,
    DROP COLUMN `started_at`,
    DROP COLUMN `support_id`,
    ADD COLUMN `endedAt` DATETIME(3) NULL,
    ADD COLUMN `patientId` VARCHAR(191) NOT NULL,
    ADD COLUMN `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `supportId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_supportId_fkey` FOREIGN KEY (`supportId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

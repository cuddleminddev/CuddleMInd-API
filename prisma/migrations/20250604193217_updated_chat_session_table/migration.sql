/*
  Warnings:

  - You are about to drop the column `createdAt` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `supportDoctorId` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `chat_sessions` table. All the data in the column will be lost.
  - Added the required column `supportId` to the `chat_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `chat_sessions` DROP FOREIGN KEY `chat_sessions_supportDoctorId_fkey`;

-- DropIndex
DROP INDEX `chat_sessions_supportDoctorId_fkey` ON `chat_sessions`;

-- AlterTable
ALTER TABLE `chat_sessions` DROP COLUMN `createdAt`,
    DROP COLUMN `supportDoctorId`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `status` ENUM('pending', 'ongoing', 'canceled', 'completed') NOT NULL DEFAULT 'pending',
    ADD COLUMN `supportId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_supportId_fkey` FOREIGN KEY (`supportId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

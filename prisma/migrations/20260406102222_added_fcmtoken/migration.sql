/*
  Warnings:

  - A unique constraint covering the columns `[patient_id]` on the table `chat_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `reminder_sent` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `fcm_token` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `chat_sessions_patient_id_key` ON `chat_sessions`(`patient_id`);

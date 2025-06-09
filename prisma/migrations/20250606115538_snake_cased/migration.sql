/*
  Warnings:

  - You are about to drop the column `createdAt` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `isPaid` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `paymentType` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `userPlanId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `endedAt` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `supportId` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `doctor_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `remainingUses` on the `transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[doctor_id]` on the table `doctor_profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `doctor_id` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_id` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_type` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduled_at` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_id` to the `chat_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doctor_id` to the `doctor_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_doctorId_fkey`;

-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_patientId_fkey`;

-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_userPlanId_fkey`;

-- DropForeignKey
ALTER TABLE `chat_sessions` DROP FOREIGN KEY `chat_sessions_patientId_fkey`;

-- DropForeignKey
ALTER TABLE `chat_sessions` DROP FOREIGN KEY `chat_sessions_supportId_fkey`;

-- DropForeignKey
ALTER TABLE `doctor_profiles` DROP FOREIGN KEY `doctor_profiles_doctorId_fkey`;

-- DropIndex
DROP INDEX `bookings_doctorId_fkey` ON `bookings`;

-- DropIndex
DROP INDEX `bookings_patientId_fkey` ON `bookings`;

-- DropIndex
DROP INDEX `bookings_userPlanId_fkey` ON `bookings`;

-- DropIndex
DROP INDEX `chat_sessions_patientId_fkey` ON `chat_sessions`;

-- DropIndex
DROP INDEX `chat_sessions_supportId_fkey` ON `chat_sessions`;

-- DropIndex
DROP INDEX `doctor_profiles_doctorId_key` ON `doctor_profiles`;

-- AlterTable
ALTER TABLE `bookings` DROP COLUMN `createdAt`,
    DROP COLUMN `doctorId`,
    DROP COLUMN `isPaid`,
    DROP COLUMN `patientId`,
    DROP COLUMN `paymentType`,
    DROP COLUMN `scheduledAt`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userPlanId`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `doctor_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `is_paid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `patient_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `payment_type` ENUM('one_time', 'plan') NOT NULL,
    ADD COLUMN `scheduled_at` DATETIME(3) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `user_plan_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `chat_sessions` DROP COLUMN `endedAt`,
    DROP COLUMN `patientId`,
    DROP COLUMN `startedAt`,
    DROP COLUMN `supportId`,
    ADD COLUMN `ended_at` DATETIME(3) NULL,
    ADD COLUMN `patient_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `support_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `doctor_profiles` DROP COLUMN `doctorId`,
    ADD COLUMN `doctor_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `transactions` DROP COLUMN `remainingUses`,
    ADD COLUMN `remaining_uses` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX `doctor_profiles_doctor_id_key` ON `doctor_profiles`(`doctor_id`);

-- AddForeignKey
ALTER TABLE `doctor_profiles` ADD CONSTRAINT `doctor_profiles_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_user_plan_id_fkey` FOREIGN KEY (`user_plan_id`) REFERENCES `user_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_support_id_fkey` FOREIGN KEY (`support_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

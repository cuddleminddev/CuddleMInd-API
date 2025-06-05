/*
  Warnings:

  - You are about to drop the column `createdAt` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `durationMinutes` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `isPaid` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `paymentType` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `userPlanId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `endedAt` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `supportId` on the `chat_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `bookingId` on the `consultation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `consultation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `endedAt` on the `consultation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `sessionType` on the `consultation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `consultation_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `doctor_unavailabalities` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `doctor_unavailabalities` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `doctor_unavailabalities` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `doctor_unavailabalities` table. All the data in the column will be lost.
  - You are about to drop the column `bookingFrequency` on the `plan_packages` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `plan_packages` table. All the data in the column will be lost.
  - You are about to drop the column `timePeriod` on the `plan_packages` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `plan_packages` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `bookingId` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `paymentType` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `planId` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `otpSecret` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `bookingsPending` on the `user_plans` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_plans` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `user_plans` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `user_plans` table. All the data in the column will be lost.
  - You are about to drop the column `packageId` on the `user_plans` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `user_plans` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `user_plans` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `user_plans` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[booking_id]` on the table `consultation_sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[plan_id]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[booking_id]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `doctor_id` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration_minutes` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `is_paid` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_id` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_type` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduled_at` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_plan_id` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_id` to the `chat_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `support_id` to the `chat_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `booking_id` to the `consultation_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_type` to the `consultation_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doctor_id` to the `doctor_unavailabalities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_time` to the `doctor_unavailabalities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `doctor_unavailabalities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `booking_frequency` to the `plan_packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time_period` to the `plan_packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `plan_packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_type` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `user_otps` table without a default value. This is not possible if the table is not empty.
  - Added the required column `otp_secret` to the `user_otps` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `user_otps` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookings_pending` to the `user_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `is_active` to the `user_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `package_id` to the `user_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_id` to the `user_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `user_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `user_plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

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
ALTER TABLE `consultation_sessions` DROP FOREIGN KEY `consultation_sessions_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `doctor_unavailabalities` DROP FOREIGN KEY `doctor_unavailabalities_doctorId_fkey`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_planId_fkey`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_otps` DROP FOREIGN KEY `user_otps_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_plans` DROP FOREIGN KEY `user_plans_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `user_plans` DROP FOREIGN KEY `user_plans_patientId_fkey`;

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
DROP INDEX `consultation_sessions_bookingId_key` ON `consultation_sessions`;

-- DropIndex
DROP INDEX `doctor_unavailabalities_doctorId_fkey` ON `doctor_unavailabalities`;

-- DropIndex
DROP INDEX `transactions_bookingId_key` ON `transactions`;

-- DropIndex
DROP INDEX `transactions_planId_key` ON `transactions`;

-- DropIndex
DROP INDEX `transactions_userId_fkey` ON `transactions`;

-- DropIndex
DROP INDEX `user_otps_userId_fkey` ON `user_otps`;

-- DropIndex
DROP INDEX `user_plans_packageId_fkey` ON `user_plans`;

-- DropIndex
DROP INDEX `user_plans_patientId_fkey` ON `user_plans`;

-- AlterTable
ALTER TABLE `bookings` DROP COLUMN `createdAt`,
    DROP COLUMN `doctorId`,
    DROP COLUMN `durationMinutes`,
    DROP COLUMN `isPaid`,
    DROP COLUMN `patientId`,
    DROP COLUMN `paymentType`,
    DROP COLUMN `scheduledAt`,
    DROP COLUMN `userPlanId`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `doctor_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `duration_minutes` INTEGER NOT NULL,
    ADD COLUMN `is_paid` BOOLEAN NOT NULL,
    ADD COLUMN `patient_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `payment_type` ENUM('one_time', 'plan') NOT NULL,
    ADD COLUMN `scheduled_at` DATETIME(3) NOT NULL,
    ADD COLUMN `user_plan_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `chat_sessions` DROP COLUMN `endedAt`,
    DROP COLUMN `patientId`,
    DROP COLUMN `startedAt`,
    DROP COLUMN `supportId`,
    ADD COLUMN `ended_at` DATETIME(3) NULL,
    ADD COLUMN `patient_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `support_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `consultation_sessions` DROP COLUMN `bookingId`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `endedAt`,
    DROP COLUMN `sessionType`,
    DROP COLUMN `startedAt`,
    ADD COLUMN `booking_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `ended_at` DATETIME(3) NULL,
    ADD COLUMN `session_type` ENUM('audio', 'video') NOT NULL,
    ADD COLUMN `started_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `doctor_unavailabalities` DROP COLUMN `createdAt`,
    DROP COLUMN `doctorId`,
    DROP COLUMN `endTime`,
    DROP COLUMN `startTime`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `doctor_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `end_time` DATETIME(3) NOT NULL,
    ADD COLUMN `start_time` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `plan_packages` DROP COLUMN `bookingFrequency`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `timePeriod`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `booking_frequency` INTEGER NOT NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `time_period` INTEGER NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `roles` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `transactions` DROP COLUMN `bookingId`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `paymentType`,
    DROP COLUMN `planId`,
    DROP COLUMN `userId`,
    ADD COLUMN `booking_id` VARCHAR(191) NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `payment_type` ENUM('one_time', 'plan') NOT NULL,
    ADD COLUMN `plan_id` VARCHAR(191) NULL,
    ADD COLUMN `user_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `user_otps` DROP COLUMN `createdAt`,
    DROP COLUMN `expiresAt`,
    DROP COLUMN `otpSecret`,
    DROP COLUMN `userId`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `expires_at` DATETIME(3) NOT NULL,
    ADD COLUMN `otp_secret` VARCHAR(191) NOT NULL,
    ADD COLUMN `user_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `user_plans` DROP COLUMN `bookingsPending`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `endDate`,
    DROP COLUMN `isActive`,
    DROP COLUMN `packageId`,
    DROP COLUMN `patientId`,
    DROP COLUMN `startDate`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `bookings_pending` INTEGER NOT NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `end_date` DATETIME(3) NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL,
    ADD COLUMN `package_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `patient_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `start_date` DATETIME(3) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `consultation_sessions_booking_id_key` ON `consultation_sessions`(`booking_id`);

-- CreateIndex
CREATE UNIQUE INDEX `transactions_plan_id_key` ON `transactions`(`plan_id`);

-- CreateIndex
CREATE UNIQUE INDEX `transactions_booking_id_key` ON `transactions`(`booking_id`);

-- AddForeignKey
ALTER TABLE `user_otps` ADD CONSTRAINT `user_otps_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_plans` ADD CONSTRAINT `user_plans_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_plans` ADD CONSTRAINT `user_plans_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `plan_packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plan_packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_user_plan_id_fkey` FOREIGN KEY (`user_plan_id`) REFERENCES `user_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultation_sessions` ADD CONSTRAINT `consultation_sessions_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doctor_unavailabalities` ADD CONSTRAINT `doctor_unavailabalities_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_support_id_fkey` FOREIGN KEY (`support_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

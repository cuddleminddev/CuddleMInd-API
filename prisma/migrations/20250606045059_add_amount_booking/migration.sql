/*
  Warnings:

  - You are about to drop the column `created_at` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `duration_minutes` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `is_paid` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `payment_type` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_at` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `user_plan_id` on the `bookings` table. All the data in the column will be lost.
  - Added the required column `doctorId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentType` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledAt` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_doctor_id_fkey`;

-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_patient_id_fkey`;

-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_user_plan_id_fkey`;

-- DropIndex
DROP INDEX `bookings_doctor_id_fkey` ON `bookings`;

-- DropIndex
DROP INDEX `bookings_patient_id_fkey` ON `bookings`;

-- DropIndex
DROP INDEX `bookings_user_plan_id_fkey` ON `bookings`;

-- AlterTable
ALTER TABLE `bookings` DROP COLUMN `created_at`,
    DROP COLUMN `doctor_id`,
    DROP COLUMN `duration_minutes`,
    DROP COLUMN `is_paid`,
    DROP COLUMN `patient_id`,
    DROP COLUMN `payment_type`,
    DROP COLUMN `scheduled_at`,
    DROP COLUMN `user_plan_id`,
    ADD COLUMN `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0.0,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `doctorId` VARCHAR(191) NOT NULL,
    ADD COLUMN `isPaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `patientId` VARCHAR(191) NOT NULL,
    ADD COLUMN `paymentType` ENUM('one_time', 'plan') NOT NULL,
    ADD COLUMN `scheduledAt` DATETIME(3) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userPlanId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('pending', 'confirmed', 'completed', 'cancelled', 'missed') NOT NULL DEFAULT 'pending';

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_userPlanId_fkey` FOREIGN KEY (`userPlanId`) REFERENCES `user_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - The values [audio,video] on the enum `bookings_type` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `session_type` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `session_type` ENUM('audio', 'video') NOT NULL,
    MODIFY `type` ENUM('normal', 'instant', 'special', 'rebooking') NOT NULL;

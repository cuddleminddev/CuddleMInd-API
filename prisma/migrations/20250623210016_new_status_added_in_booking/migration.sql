-- AlterTable
ALTER TABLE `bookings` MODIFY `status` ENUM('pending', 'confirmed', 'completed', 'cancelled', 'missed', 'failed') NOT NULL DEFAULT 'pending';

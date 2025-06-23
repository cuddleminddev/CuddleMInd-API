-- AlterTable
ALTER TABLE `consultation_sessions` ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `durationInMinutes` INTEGER NULL,
    ADD COLUMN `endedBy` VARCHAR(191) NULL,
    ADD COLUMN `sessionToken` VARCHAR(191) NULL,
    ADD COLUMN `zegocloudRoomId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `timeslots` MODIFY `timezone` VARCHAR(191) NULL;

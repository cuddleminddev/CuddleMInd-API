-- AlterTable
ALTER TABLE `chat_messages` ADD COLUMN `payload` JSON NULL,
    ADD COLUMN `type` ENUM('text', 'image', 'doctor_card', 'system') NOT NULL DEFAULT 'text',
    MODIFY `message` VARCHAR(191) NULL;

/*
  Warnings:

  - Added the required column `tenantId` to the `system_users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `system_users` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `currentFiscalMonth` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `currentFiscalYear` INTEGER NOT NULL DEFAULT 2025,
    ADD COLUMN `fiscalYearStart` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `isSystem` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `system_users_name_idx` ON `system_users`(`name`);

-- CreateIndex
CREATE INDEX `system_users_tenantId_idx` ON `system_users`(`tenantId`);

-- CreateIndex
CREATE INDEX `users_name_idx` ON `users`(`name`);

-- AddForeignKey
ALTER TABLE `system_users` ADD CONSTRAINT `system_users_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

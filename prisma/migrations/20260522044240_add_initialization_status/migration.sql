/*
  Warnings:

  - You are about to drop the column `fiscalYearStart` on the `tenants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `tenants` DROP COLUMN `fiscalYearStart`,
    ADD COLUMN `fiscalYearStartMonth` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `fiscalYearStartYear` INTEGER NOT NULL DEFAULT 2025,
    ADD COLUMN `initializationStatus` VARCHAR(191) NOT NULL DEFAULT 'pending';

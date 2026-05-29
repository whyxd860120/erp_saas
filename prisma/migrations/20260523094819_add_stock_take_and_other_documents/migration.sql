/*
  Warnings:

  - You are about to drop the column `sn` on the `sales_outbound_details` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `sales_outbound_details_sn_idx` ON `sales_outbound_details`;

-- AlterTable
ALTER TABLE `purchase_inbound_details` ADD COLUMN `serialNumbersList` VARCHAR(191) NULL,
    ADD COLUMN `snCount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `sales_outbound_details` DROP COLUMN `sn`,
    ADD COLUMN `expiryDate` DATETIME(3) NULL,
    ADD COLUMN `productionDate` DATETIME(3) NULL,
    ADD COLUMN `serialNumbersList` VARCHAR(191) NULL,
    ADD COLUMN `snCount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `serial_numbers` ADD COLUMN `inboundDetailId` VARCHAR(191) NULL,
    ADD COLUMN `otherInboundDetailId` VARCHAR(191) NULL,
    ADD COLUMN `otherOutboundDetailId` VARCHAR(191) NULL,
    ADD COLUMN `outboundDetailId` VARCHAR(191) NULL,
    ADD COLUMN `stockTakeDetailId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `stock_takes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `takeNo` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `takeDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `totalDiffQty` INTEGER NOT NULL DEFAULT 0,
    `totalDiffCost` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `remark` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `confirmedById` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_takes_tenantId_takeDate_idx`(`tenantId`, `takeDate`),
    INDEX `stock_takes_warehouseId_idx`(`warehouseId`),
    INDEX `stock_takes_status_idx`(`status`),
    UNIQUE INDEX `stock_takes_tenantId_takeNo_key`(`tenantId`, `takeNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_take_details` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `takeId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `batchNo` VARCHAR(191) NULL,
    `bookQty` INTEGER NOT NULL DEFAULT 0,
    `actualQty` INTEGER NOT NULL DEFAULT 0,
    `diffQty` INTEGER NOT NULL DEFAULT 0,
    `unitCost` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `diffCost` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `productionDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `serialNumbersList` VARCHAR(191) NULL,
    `snCount` INTEGER NOT NULL DEFAULT 0,
    `stockTakeDetailId` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_take_details_tenantId_idx`(`tenantId`),
    INDEX `stock_take_details_takeId_idx`(`takeId`),
    INDEX `stock_take_details_productId_idx`(`productId`),
    INDEX `stock_take_details_batchNo_idx`(`batchNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `other_inbounds` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `inboundNo` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `inboundDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `remark` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `confirmedById` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `other_inbounds_tenantId_inboundDate_idx`(`tenantId`, `inboundDate`),
    INDEX `other_inbounds_warehouseId_idx`(`warehouseId`),
    INDEX `other_inbounds_type_idx`(`type`),
    INDEX `other_inbounds_status_idx`(`status`),
    UNIQUE INDEX `other_inbounds_tenantId_inboundNo_key`(`tenantId`, `inboundNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `other_inbound_details` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `inboundId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `unitPrice` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `batchNo` VARCHAR(191) NULL,
    `productionDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `serialNumbersList` VARCHAR(191) NULL,
    `snCount` INTEGER NOT NULL DEFAULT 0,
    `otherInboundDetailId` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `other_inbound_details_tenantId_idx`(`tenantId`),
    INDEX `other_inbound_details_inboundId_idx`(`inboundId`),
    INDEX `other_inbound_details_productId_idx`(`productId`),
    INDEX `other_inbound_details_batchNo_idx`(`batchNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `other_outbounds` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `outboundNo` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `outboundDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `type` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `salesmanId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `remark` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `confirmedById` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `other_outbounds_tenantId_outboundDate_idx`(`tenantId`, `outboundDate`),
    INDEX `other_outbounds_warehouseId_idx`(`warehouseId`),
    INDEX `other_outbounds_type_idx`(`type`),
    INDEX `other_outbounds_status_idx`(`status`),
    UNIQUE INDEX `other_outbounds_tenantId_outboundNo_key`(`tenantId`, `outboundNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `other_outbound_details` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `outboundId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `unitPrice` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `batchNo` VARCHAR(191) NULL,
    `productionDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `serialNumbersList` VARCHAR(191) NULL,
    `snCount` INTEGER NOT NULL DEFAULT 0,
    `otherOutboundDetailId` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `other_outbound_details_tenantId_idx`(`tenantId`),
    INDEX `other_outbound_details_outboundId_idx`(`outboundId`),
    INDEX `other_outbound_details_productId_idx`(`productId`),
    INDEX `other_outbound_details_batchNo_idx`(`batchNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `serial_numbers_inboundDetailId_idx` ON `serial_numbers`(`inboundDetailId`);

-- CreateIndex
CREATE INDEX `serial_numbers_outboundDetailId_idx` ON `serial_numbers`(`outboundDetailId`);

-- CreateIndex
CREATE INDEX `serial_numbers_stockTakeDetailId_idx` ON `serial_numbers`(`stockTakeDetailId`);

-- CreateIndex
CREATE INDEX `serial_numbers_otherInboundDetailId_idx` ON `serial_numbers`(`otherInboundDetailId`);

-- CreateIndex
CREATE INDEX `serial_numbers_otherOutboundDetailId_idx` ON `serial_numbers`(`otherOutboundDetailId`);

-- AddForeignKey
ALTER TABLE `stock_takes` ADD CONSTRAINT `stock_takes_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_takes` ADD CONSTRAINT `stock_takes_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_takes` ADD CONSTRAINT `stock_takes_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_takes` ADD CONSTRAINT `stock_takes_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_take_details` ADD CONSTRAINT `stock_take_details_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_take_details` ADD CONSTRAINT `stock_take_details_takeId_fkey` FOREIGN KEY (`takeId`) REFERENCES `stock_takes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_take_details` ADD CONSTRAINT `stock_take_details_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_inbounds` ADD CONSTRAINT `other_inbounds_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_inbounds` ADD CONSTRAINT `other_inbounds_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_inbounds` ADD CONSTRAINT `other_inbounds_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_inbounds` ADD CONSTRAINT `other_inbounds_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_inbound_details` ADD CONSTRAINT `other_inbound_details_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_inbound_details` ADD CONSTRAINT `other_inbound_details_inboundId_fkey` FOREIGN KEY (`inboundId`) REFERENCES `other_inbounds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_inbound_details` ADD CONSTRAINT `other_inbound_details_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_outbounds` ADD CONSTRAINT `other_outbounds_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_outbounds` ADD CONSTRAINT `other_outbounds_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_outbounds` ADD CONSTRAINT `other_outbounds_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_outbounds` ADD CONSTRAINT `other_outbounds_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_outbound_details` ADD CONSTRAINT `other_outbound_details_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_outbound_details` ADD CONSTRAINT `other_outbound_details_outboundId_fkey` FOREIGN KEY (`outboundId`) REFERENCES `other_outbounds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `other_outbound_details` ADD CONSTRAINT `other_outbound_details_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_inboundDetailId_fkey` FOREIGN KEY (`inboundDetailId`) REFERENCES `purchase_inbound_details`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_outboundDetailId_fkey` FOREIGN KEY (`outboundDetailId`) REFERENCES `sales_outbound_details`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_stockTakeDetailId_fkey` FOREIGN KEY (`stockTakeDetailId`) REFERENCES `stock_take_details`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_otherInboundDetailId_fkey` FOREIGN KEY (`otherInboundDetailId`) REFERENCES `other_inbound_details`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_otherOutboundDetailId_fkey` FOREIGN KEY (`otherOutboundDetailId`) REFERENCES `other_outbound_details`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

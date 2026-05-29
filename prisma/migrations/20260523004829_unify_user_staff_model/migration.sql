/*
  Warnings:

  - You are about to drop the column `department` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,code]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `users_tenantId_email_key` ON `users`;

-- AlterTable
ALTER TABLE `customers` ADD COLUMN `creditLevel` VARCHAR(191) NOT NULL DEFAULT 'A',
    ADD COLUMN `creditLimit` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `creditUsed` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `discountDays` INTEGER NULL,
    ADD COLUMN `discountRate` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `level` VARCHAR(191) NOT NULL DEFAULT 'normal',
    ADD COLUMN `paymentDays` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `salesmanId` VARCHAR(191) NULL,
    ADD COLUMN `settlementType` VARCHAR(191) NOT NULL DEFAULT 'cash';

-- AlterTable
ALTER TABLE `inventory_items` ADD COLUMN `expiryDate` DATETIME(3) NULL,
    ADD COLUMN `productionDate` DATETIME(3) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'normal';

-- AlterTable
ALTER TABLE `payment_payments` ADD COLUMN `settledAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'payment';

-- AlterTable
ALTER TABLE `payment_receipts` ADD COLUMN `salesmanId` VARCHAR(191) NULL,
    ADD COLUMN `settledAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'receipt';

-- AlterTable
ALTER TABLE `products` ADD COLUMN `batchType` VARCHAR(191) NULL,
    ADD COLUMN `brand` VARCHAR(191) NULL,
    ADD COLUMN `enableBatch` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `enableExpiry` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `enableSN` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `expiryWarningDays` INTEGER NULL DEFAULT 90,
    ADD COLUMN `leadTime` INTEGER NULL,
    ADD COLUMN `maxStock` INTEGER NULL,
    ADD COLUMN `minStock` INTEGER NULL,
    ADD COLUMN `origin` VARCHAR(191) NULL,
    ADD COLUMN `retailPrice` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `shelfLife` INTEGER NULL,
    ADD COLUMN `snType` VARCHAR(191) NULL,
    ADD COLUMN `volume` DECIMAL(65, 30) NULL,
    ADD COLUMN `weight` DECIMAL(65, 30) NULL,
    ADD COLUMN `wholesalePrice` DECIMAL(65, 30) NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `purchase_inbound_details` ADD COLUMN `qcRemark` VARCHAR(191) NULL,
    ADD COLUMN `qcResult` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `purchase_inbounds` ADD COLUMN `qcStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'blue';

-- AlterTable
ALTER TABLE `purchase_order_items` ADD COLUMN `remark` VARCHAR(191) NULL,
    ADD COLUMN `returnedQty` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `purchase_orders` ADD COLUMN `approvalStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedBy` VARCHAR(191) NULL,
    ADD COLUMN `expectDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `sales_order_items` ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `discountRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `remark` VARCHAR(191) NULL,
    ADD COLUMN `returnedQty` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `sales_orders` ADD COLUMN `approvalStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedBy` VARCHAR(191) NULL,
    ADD COLUMN `contractNo` VARCHAR(191) NULL,
    ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `discountRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `expectDate` DATETIME(3) NULL,
    ADD COLUMN `finalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `salesmanId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sales_outbound_details` ADD COLUMN `sn` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sales_outbounds` ADD COLUMN `customerId` VARCHAR(191) NULL,
    ADD COLUMN `salesmanId` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'blue';

-- AlterTable
ALTER TABLE `suppliers` ADD COLUMN `deliveryType` VARCHAR(191) NULL,
    ADD COLUMN `discountDays` INTEGER NULL,
    ADD COLUMN `discountRate` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `leadTime` INTEGER NULL,
    ADD COLUMN `paymentDays` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `rating` VARCHAR(191) NOT NULL DEFAULT 'normal',
    ADD COLUMN `ratingScore` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `settlementType` VARCHAR(191) NOT NULL DEFAULT 'cash';

-- AlterTable
ALTER TABLE `users` DROP COLUMN `department`,
    DROP COLUMN `title`,
    ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `code` VARCHAR(191) NOT NULL,
    ADD COLUMN `departmentId` VARCHAR(191) NULL,
    ADD COLUMN `gender` VARCHAR(191) NOT NULL DEFAULT 'unknown',
    ADD COLUMN `hireDate` DATETIME(3) NULL,
    ADD COLUMN `idCard` VARCHAR(191) NULL,
    ADD COLUMN `isSystemUser` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `positionId` VARCHAR(191) NULL,
    ADD COLUMN `remark` VARCHAR(191) NULL,
    ADD COLUMN `username` VARCHAR(191) NULL,
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `password` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `data_permission_rules` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `field` VARCHAR(191) NOT NULL,
    `operator` VARCHAR(191) NOT NULL DEFAULT 'eq',
    `valueType` VARCHAR(191) NOT NULL DEFAULT 'current_user',
    `value` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `data_permission_rules_tenantId_idx`(`tenantId`),
    INDEX `data_permission_rules_roleId_idx`(`roleId`),
    INDEX `data_permission_rules_module_idx`(`module`),
    INDEX `data_permission_rules_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `roles_tenantId_idx`(`tenantId`),
    INDEX `roles_status_idx`(`status`),
    UNIQUE INDEX `roles_tenantId_code_key`(`tenantId`, `code`),
    UNIQUE INDEX `roles_tenantId_name_key`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `path` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `description` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_code_key`(`code`),
    INDEX `permissions_type_idx`(`type`),
    INDEX `permissions_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_roleId_idx`(`roleId`),
    INDEX `role_permissions_permissionId_idx`(`permissionId`),
    UNIQUE INDEX `role_permissions_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_userId_idx`(`userId`),
    INDEX `user_roles_roleId_idx`(`roleId`),
    UNIQUE INDEX `user_roles_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_managerId_key`(`managerId`),
    INDEX `departments_tenantId_idx`(`tenantId`),
    INDEX `departments_parentId_idx`(`parentId`),
    UNIQUE INDEX `departments_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `positions` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `positions_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `positions_tenantId_code_key`(`tenantId`, `code`),
    UNIQUE INDEX `positions_tenantId_name_key`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipt_writeoffs` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `receiptId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `writeoffDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `receipt_writeoffs_receiptId_idx`(`receiptId`),
    INDEX `receipt_writeoffs_orderId_idx`(`orderId`),
    INDEX `receipt_writeoffs_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_writeoffs` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `writeoffDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_writeoffs_paymentId_idx`(`paymentId`),
    INDEX `payment_writeoffs_orderId_idx`(`orderId`),
    INDEX `payment_writeoffs_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_prices` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `price` DECIMAL(65, 30) NOT NULL,
    `minQty` INTEGER NULL,
    `maxQty` INTEGER NULL,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validTo` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_prices_tenantId_idx`(`tenantId`),
    INDEX `customer_prices_customerId_idx`(`customerId`),
    INDEX `customer_prices_productId_idx`(`productId`),
    UNIQUE INDEX `customer_prices_tenantId_customerId_productId_key`(`tenantId`, `customerId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_histories` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `oldPrice` DECIMAL(65, 30) NOT NULL,
    `newPrice` DECIMAL(65, 30) NOT NULL,
    `changeType` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `changedBy` VARCHAR(191) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `price_histories_tenantId_idx`(`tenantId`),
    INDEX `price_histories_productId_idx`(`productId`),
    INDEX `price_histories_changedAt_idx`(`changedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `serial_numbers` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `sn` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `batchNo` VARCHAR(191) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'in_stock',
    `inboundId` VARCHAR(191) NULL,
    `outboundId` VARCHAR(191) NULL,
    `saleDate` DATETIME(3) NULL,
    `warrantyExpireDate` DATETIME(3) NULL,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `serial_numbers_tenantId_idx`(`tenantId`),
    INDEX `serial_numbers_productId_idx`(`productId`),
    INDEX `serial_numbers_batchNo_idx`(`batchNo`),
    INDEX `serial_numbers_warehouseId_idx`(`warehouseId`),
    INDEX `serial_numbers_status_idx`(`status`),
    UNIQUE INDEX `serial_numbers_tenantId_sn_key`(`tenantId`, `sn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_evaluations` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `evaluationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `evaluationType` VARCHAR(191) NOT NULL,
    `qualityScore` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `deliveryScore` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `serviceScore` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `priceScore` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalScore` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `orderCount` INTEGER NOT NULL DEFAULT 0,
    `onTimeRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `returnRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `supplier_evaluations_tenantId_idx`(`tenantId`),
    INDEX `supplier_evaluations_supplierId_idx`(`supplierId`),
    INDEX `supplier_evaluations_evaluationDate_idx`(`evaluationDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `adjustmentNo` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `adjustmentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `reason` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_adjustments_tenantId_idx`(`tenantId`),
    INDEX `stock_adjustments_warehouseId_idx`(`warehouseId`),
    INDEX `stock_adjustments_type_idx`(`type`),
    UNIQUE INDEX `stock_adjustments_tenantId_adjustmentNo_key`(`tenantId`, `adjustmentNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_adjustment_details` (
    `id` VARCHAR(191) NOT NULL,
    `adjustmentId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `batchNo` VARCHAR(191) NULL,
    `adjustQty` INTEGER NOT NULL,
    `adjustType` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_adjustment_details_adjustmentId_idx`(`adjustmentId`),
    INDEX `stock_adjustment_details_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expiry_warnings` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `batchNo` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `warningType` VARCHAR(191) NOT NULL,
    `warningDays` INTEGER NOT NULL,
    `handled` BOOLEAN NOT NULL DEFAULT false,
    `handledAt` DATETIME(3) NULL,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expiry_warnings_tenantId_idx`(`tenantId`),
    INDEX `expiry_warnings_productId_idx`(`productId`),
    INDEX `expiry_warnings_warehouseId_idx`(`warehouseId`),
    INDEX `expiry_warnings_expiryDate_idx`(`expiryDate`),
    INDEX `expiry_warnings_warningType_idx`(`warningType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_changes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `beforeValue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `afterValue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `reason` VARCHAR(191) NULL,
    `changedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `credit_changes_tenantId_idx`(`tenantId`),
    INDEX `credit_changes_customerId_idx`(`customerId`),
    INDEX `credit_changes_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `customers_salesmanId_idx` ON `customers`(`salesmanId`);

-- CreateIndex
CREATE INDEX `inventory_items_batchNo_idx` ON `inventory_items`(`batchNo`);

-- CreateIndex
CREATE INDEX `inventory_items_status_idx` ON `inventory_items`(`status`);

-- CreateIndex
CREATE INDEX `payment_payments_type_idx` ON `payment_payments`(`type`);

-- CreateIndex
CREATE INDEX `payment_receipts_type_idx` ON `payment_receipts`(`type`);

-- CreateIndex
CREATE INDEX `products_barcode_idx` ON `products`(`barcode`);

-- CreateIndex
CREATE INDEX `purchase_inbound_details_batchNo_idx` ON `purchase_inbound_details`(`batchNo`);

-- CreateIndex
CREATE INDEX `purchase_inbounds_type_idx` ON `purchase_inbounds`(`type`);

-- CreateIndex
CREATE INDEX `purchase_inbounds_qcStatus_idx` ON `purchase_inbounds`(`qcStatus`);

-- CreateIndex
CREATE INDEX `purchase_orders_status_idx` ON `purchase_orders`(`status`);

-- CreateIndex
CREATE INDEX `purchase_orders_approvalStatus_idx` ON `purchase_orders`(`approvalStatus`);

-- CreateIndex
CREATE INDEX `sales_orders_salesmanId_idx` ON `sales_orders`(`salesmanId`);

-- CreateIndex
CREATE INDEX `sales_orders_status_idx` ON `sales_orders`(`status`);

-- CreateIndex
CREATE INDEX `sales_orders_approvalStatus_idx` ON `sales_orders`(`approvalStatus`);

-- CreateIndex
CREATE INDEX `sales_outbound_details_batchNo_idx` ON `sales_outbound_details`(`batchNo`);

-- CreateIndex
CREATE INDEX `sales_outbound_details_sn_idx` ON `sales_outbound_details`(`sn`);

-- CreateIndex
CREATE INDEX `sales_outbounds_type_idx` ON `sales_outbounds`(`type`);

-- CreateIndex
CREATE INDEX `suppliers_rating_idx` ON `suppliers`(`rating`);

-- CreateIndex
CREATE INDEX `users_departmentId_idx` ON `users`(`departmentId`);

-- CreateIndex
CREATE INDEX `users_positionId_idx` ON `users`(`positionId`);

-- CreateIndex
CREATE INDEX `users_phone_idx` ON `users`(`phone`);

-- CreateIndex
CREATE INDEX `users_isSystemUser_idx` ON `users`(`isSystemUser`);

-- CreateIndex
CREATE UNIQUE INDEX `users_tenantId_code_key` ON `users`(`tenantId`, `code`);

-- CreateIndex
CREATE UNIQUE INDEX `users_tenantId_username_key` ON `users`(`tenantId`, `username`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_permission_rules` ADD CONSTRAINT `data_permission_rules_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_permission_rules` ADD CONSTRAINT `data_permission_rules_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `permissions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `positions` ADD CONSTRAINT `positions_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_prices` ADD CONSTRAINT `customer_prices_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_prices` ADD CONSTRAINT `customer_prices_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_prices` ADD CONSTRAINT `customer_prices_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_histories` ADD CONSTRAINT `price_histories_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_numbers` ADD CONSTRAINT `serial_numbers_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_evaluations` ADD CONSTRAINT `supplier_evaluations_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_evaluations` ADD CONSTRAINT `supplier_evaluations_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_adjustments` ADD CONSTRAINT `stock_adjustments_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_adjustments` ADD CONSTRAINT `stock_adjustments_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_adjustment_details` ADD CONSTRAINT `stock_adjustment_details_adjustmentId_fkey` FOREIGN KEY (`adjustmentId`) REFERENCES `stock_adjustments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

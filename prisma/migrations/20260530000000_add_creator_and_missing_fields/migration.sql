-- AlterTable: purchase_orders - 补充缺失字段
ALTER TABLE `purchase_orders`
  ADD COLUMN `expectDate` DATETIME(3) NULL AFTER `orderDate`,
  ADD COLUMN `logisticsCost` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `totalAmount`,
  ADD COLUMN `discountRate` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `logisticsCost`,
  ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `discountRate`,
  ADD COLUMN `finalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `discountAmount`,
  ADD COLUMN `approvalStatus` VARCHAR(191) NOT NULL DEFAULT 'pending' AFTER `status`,
  ADD COLUMN `approvedAt` DATETIME(3) NULL AFTER `approvalStatus`,
  ADD COLUMN `approvedBy` VARCHAR(191) NULL AFTER `approvedAt`,
  ADD COLUMN `creatorId` VARCHAR(191) NULL AFTER `approvedBy`;

-- AlterTable: purchase_order_items - 补充缺失字段
ALTER TABLE `purchase_order_items`
  ADD COLUMN `taxRate` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `unitPrice`,
  ADD COLUMN `taxAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `taxRate`,
  ADD COLUMN `returnedQty` INTEGER NOT NULL DEFAULT 0 AFTER `receivedQty`,
  ADD COLUMN `remark` VARCHAR(191) NULL AFTER `status`;

-- AlterTable: sales_orders - 补充缺失字段
ALTER TABLE `sales_orders`
  ADD COLUMN `contractNo` VARCHAR(191) NULL AFTER `orderNo`,
  ADD COLUMN `salesmanId` VARCHAR(191) NULL AFTER `customerId`,
  ADD COLUMN `expectDate` DATETIME(3) NULL AFTER `orderDate`,
  ADD COLUMN `logisticsCost` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `totalAmount`,
  ADD COLUMN `discountRate` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `logisticsCost`,
  ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `discountRate`,
  ADD COLUMN `finalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `discountAmount`,
  ADD COLUMN `approvalStatus` VARCHAR(191) NOT NULL DEFAULT 'pending' AFTER `status`,
  ADD COLUMN `approvedAt` DATETIME(3) NULL AFTER `approvalStatus`,
  ADD COLUMN `approvedBy` VARCHAR(191) NULL AFTER `approvedAt`,
  ADD COLUMN `creatorId` VARCHAR(191) NULL AFTER `approvedBy`;

-- AlterTable: sales_order_items - 补充缺失字段
ALTER TABLE `sales_order_items`
  ADD COLUMN `discountRate` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `unitPrice`,
  ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `discountRate`,
  ADD COLUMN `returnedQty` INTEGER NOT NULL DEFAULT 0 AFTER `shippedQty`,
  ADD COLUMN `remark` VARCHAR(191) NULL AFTER `status`;

-- AlterTable: purchase_inbounds - 补充缺失字段
ALTER TABLE `purchase_inbounds`
  ADD COLUMN `logisticsCost` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `totalAmount`,
  ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `logisticsCost`,
  ADD COLUMN `finalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `discountAmount`,
  ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'blue' AFTER `finalAmount`,
  ADD COLUMN `qcStatus` VARCHAR(191) NOT NULL DEFAULT 'pending' AFTER `status`,
  ADD COLUMN `creatorId` VARCHAR(191) NULL AFTER `qcStatus`;

-- AlterTable: purchase_inbound_details - 补充缺失字段
ALTER TABLE `purchase_inbound_details`
  ADD COLUMN `taxRate` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `amount`,
  ADD COLUMN `taxAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `taxRate`,
  ADD COLUMN `remark` VARCHAR(191) NULL AFTER `expiryDate`;

-- AlterTable: sales_outbounds - 补充缺失字段
ALTER TABLE `sales_outbounds`
  ADD COLUMN `customerId` VARCHAR(191) NULL AFTER `orderId`,
  ADD COLUMN `salesmanId` VARCHAR(191) NULL AFTER `warehouseId`,
  ADD COLUMN `logisticsCost` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `totalAmount`,
  ADD COLUMN `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `logisticsCost`,
  ADD COLUMN `finalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `discountAmount`,
  ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'blue' AFTER `finalAmount`,
  ADD COLUMN `creatorId` VARCHAR(191) NULL AFTER `status`;

-- AlterTable: sales_outbound_details - 补充缺失字段
ALTER TABLE `sales_outbound_details`
  ADD COLUMN `taxRate` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `amount`,
  ADD COLUMN `taxAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0 AFTER `taxRate`,
  ADD COLUMN `remark` VARCHAR(191) NULL AFTER `batchNo`;

-- CreateIndex: purchase_orders status
CREATE INDEX `purchase_orders_status_idx` ON `purchase_orders`(`status`);

-- CreateIndex: purchase_orders approvalStatus
CREATE INDEX `purchase_orders_approvalStatus_idx` ON `purchase_orders`(`approvalStatus`);

-- CreateIndex: purchase_orders creatorId
CREATE INDEX `purchase_orders_creatorId_idx` ON `purchase_orders`(`creatorId`);

-- CreateIndex: sales_orders salesmanId
CREATE INDEX `sales_orders_salesmanId_idx` ON `sales_orders`(`salesmanId`);

-- CreateIndex: sales_orders creatorId
CREATE INDEX `sales_orders_creatorId_idx` ON `sales_orders`(`creatorId`);

-- CreateIndex: sales_orders status
CREATE INDEX `sales_orders_status_idx` ON `sales_orders`(`status`);

-- CreateIndex: sales_orders approvalStatus
CREATE INDEX `sales_orders_approvalStatus_idx` ON `sales_orders`(`approvalStatus`);

-- CreateIndex: purchase_inbounds type
CREATE INDEX `purchase_inbounds_type_idx` ON `purchase_inbounds`(`type`);

-- CreateIndex: purchase_inbounds qcStatus
CREATE INDEX `purchase_inbounds_qcStatus_idx` ON `purchase_inbounds`(`qcStatus`);

-- CreateIndex: purchase_inbounds creatorId
CREATE INDEX `purchase_inbounds_creatorId_idx` ON `purchase_inbounds`(`creatorId`);

-- CreateIndex: sales_outbounds customerId
CREATE INDEX `sales_outbounds_customerId_idx` ON `sales_outbounds`(`customerId`);

-- CreateIndex: sales_outbounds salesmanId
CREATE INDEX `sales_outbounds_salesmanId_idx` ON `sales_outbounds`(`salesmanId`);

-- CreateIndex: sales_outbounds creatorId
CREATE INDEX `sales_outbounds_creatorId_idx` ON `sales_outbounds`(`creatorId`);

-- AddForeignKey: purchase_orders.creatorId -> users.id
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: sales_orders.salesmanId -> users.id
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: sales_orders.creatorId -> users.id
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: purchase_inbounds.creatorId -> users.id
ALTER TABLE `purchase_inbounds` ADD CONSTRAINT `purchase_inbounds_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: sales_outbounds.customerId -> customers.id
ALTER TABLE `sales_outbounds` ADD CONSTRAINT `sales_outbounds_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: sales_outbounds.salesmanId -> users.id
ALTER TABLE `sales_outbounds` ADD CONSTRAINT `sales_outbounds_salesmanId_fkey` FOREIGN KEY (`salesmanId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: sales_outbounds.creatorId -> users.id
ALTER TABLE `sales_outbounds` ADD CONSTRAINT `sales_outbounds_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

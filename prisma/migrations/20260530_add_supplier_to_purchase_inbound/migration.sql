-- 为采购入库单添加供应商字段
ALTER TABLE `purchase_inbounds` ADD COLUMN `supplierId` VARCHAR(191) NULL AFTER `orderId`;

-- 添加供应商索引
ALTER TABLE `purchase_inbounds` ADD INDEX `purchase_inbounds_supplierId_idx`(`supplierId`);

-- 根据已有订单回填供应商ID
UPDATE `purchase_inbounds` pi
INNER JOIN `purchase_orders` po ON pi.`orderId` = po.`id`
SET pi.`supplierId` = po.`supplierId`
WHERE pi.`orderId` IS NOT NULL AND pi.`supplierId` IS NULL;

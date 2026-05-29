-- ========================================
-- 系统租户迁移脚本
-- 日期: 2026-05-22
-- ========================================

-- 1. 添加 isSystem 字段到 Tenant 表
ALTER TABLE `Tenant` ADD COLUMN `isSystem` BOOLEAN NOT NULL DEFAULT FALSE AFTER `slug`;

-- 2. 添加 tenantId 字段到 system_users 表（允许为空，稍后填充）
ALTER TABLE `system_users` ADD COLUMN `tenantId` VARCHAR(191) NULL AFTER `id`;

-- 3. 创建系统租户记录
INSERT INTO `Tenant` (`id`, `name`, `slug`, `isSystem`, `status`, `plan`, `description`, `createdAt`, `updatedAt`)
VALUES ('sys_default_tenant', '系统管理', 'system', TRUE, 'active', 'enterprise', '系统管理员专用租户', NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = '系统管理', `isSystem` = TRUE;

-- 4. 将现有系统用户关联到系统租户
UPDATE `system_users` SET `tenantId` = 'sys_default_tenant' WHERE `tenantId` IS NULL;

-- 5. 将 tenantId 设为非空（所有现有数据已有关联）
ALTER TABLE `system_users` MODIFY COLUMN `tenantId` VARCHAR(191) NOT NULL;

-- 6. 添加外键约束
ALTER TABLE `system_users` ADD CONSTRAINT `fk_system_users_tenant`
FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. 创建索引（如果不存在）
ALTER TABLE `system_users` ADD INDEX `idx_system_users_tenantId` (`tenantId`);

-- ========================================
-- 验证迁移结果
-- ========================================

-- 查看 Tenant 表结构
DESCRIBE `Tenant`;

-- 查看 system_users 表结构
DESCRIBE `system_users`;

-- 确认系统租户已创建
SELECT `id`, `name`, `slug`, `isSystem`, `status` FROM `Tenant` WHERE `slug` = 'system';

-- 确认系统用户已关联
SELECT `id`, `email`, `name`, `tenantId` FROM `system_users` WHERE `role` = 'super_admin';
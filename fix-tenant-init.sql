-- P0 Bug修复: 新租户账套未初始化
-- 为已存在的租户初始化账套数据

USE inventory_system;

-- 查找测试租户 ceshi
SELECT id, name, initializationStatus FROM tenants WHERE slug = 'ceshi' OR name LIKE '%测试%' OR name LIKE '%ceshi%';

-- 修复测试租户 ceshi（租户ID: cmpk7zn4t0007muxgmmemombq）
-- 1. 更新初始化状态
UPDATE tenants SET initializationStatus = 'completed' WHERE id = 'cmpk7zn4t0007muxgmmemombq';

-- 2. 创建默认仓库（如果不存在）
INSERT IGNORE INTO warehouses (id, tenantId, code, name, status, remark, createdAt, updatedAt)
VALUES ('cmpk7zn4t0007muxgmmemombq_wh1', 'cmpk7zn4t0007muxgmmemombq', 'WH001', '主仓库', 'active', '系统自动创建的默认仓库', NOW(), NOW());

-- 3. 创建现金账户（如果不存在）
INSERT IGNORE INTO accounts (id, tenantId, code, name, type, status, remark, createdAt, updatedAt)
VALUES ('cmpk7zn4t0007muxgmmemombq_ac1', 'cmpk7zn4t0007muxgmmemombq', '1001', '现金', 'cash', 'active', '系统自动创建的默认账户', NOW(), NOW());

-- 4. 创建银行存款账户（如果不存在）
INSERT IGNORE INTO accounts (id, tenantId, code, name, type, status, remark, createdAt, updatedAt)
VALUES ('cmpk7zn4t0007muxgmmemombq_ac2', 'cmpk7zn4t0007muxgmmemombq', '1002', '银行存款', 'bank', 'active', '系统自动创建的默认账户', NOW(), NOW());

-- 验证修复
SELECT '租户信息:' as info;
SELECT id, name, initializationStatus FROM tenants WHERE id = 'cmpk7zn4t0007muxgmmemombq';

SELECT '仓库列表:' as info;
SELECT id, code, name FROM warehouses WHERE tenantId = 'cmpk7zn4t0007muxgmmemombq';

SELECT '账户列表:' as info;
SELECT id, code, name, type FROM accounts WHERE tenantId = 'cmpk7zn4t0007muxgmmemombq';
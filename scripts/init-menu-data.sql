-- ==============================================
-- 菜单数据初始化脚本
-- 使用方法: 在MySQL客户端中执行此脚本
-- ==============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 先删除所有菜单数据
DELETE FROM permissions WHERE type = 'menu';

-- 重置自增ID
ALTER TABLE permissions AUTO_INCREMENT = 1;

-- ==============================================
-- 插入菜单数据
-- ==============================================

-- 1. 仪表盘（一级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('仪表盘', 'dashboard', 'menu', '/', 'Odometer', NULL, 1, 1, NOW(), NOW());

-- 2. 基础资料（一级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('基础资料', 'basic', 'menu', NULL, 'Files', NULL, 10, 1, NOW(), NOW());

-- 3. 供应商管理（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('供应商管理', 'supplier', 'menu', '/suppliers', 'OfficeBuilding', 2, 1, 1, NOW(), NOW());

-- 4. 客户管理（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('客户管理', 'customer', 'menu', '/customers', 'UserFilled', 2, 2, 1, NOW(), NOW());

-- 5. 物料管理（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('物料管理', 'product', 'menu', '/products', 'Goods', 2, 3, 1, NOW(), NOW());

-- 6. 仓库管理（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('仓库管理', 'warehouse', 'menu', '/warehouses', 'House', 2, 4, 1, NOW(), NOW());

-- 7. 账户管理（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('账户管理', 'account', 'menu', '/accounts', 'Wallet', 2, 5, 1, NOW(), NOW());

-- 8. 采购管理（一级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('采购管理', 'purchase', 'menu', NULL, 'ShoppingCart', NULL, 20, 1, NOW(), NOW());

-- 9. 采购订单（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('采购订单', 'purchase_order', 'menu', '/purchase-orders', 'List', 8, 1, 1, NOW(), NOW());

-- 10. 采购入库（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('采购入库', 'purchase_inbound', 'menu', '/purchase-inbounds', 'Box', 8, 2, 1, NOW(), NOW());

-- 11. 销售管理（一级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('销售管理', 'sales', 'menu', NULL, 'Sell', NULL, 30, 1, NOW(), NOW());

-- 12. 销售订单（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('销售订单', 'sales_order', 'menu', '/sales-orders', 'Tickets', 11, 1, 1, NOW(), NOW());

-- 13. 销售出库（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('销售出库', 'sales_outbound', 'menu', '/sales-outbounds', 'Van', 11, 2, 1, NOW(), NOW());

-- 14. 库存管理（一级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('库存管理', 'inventory', 'menu', NULL, 'Package', NULL, 40, 1, NOW(), NOW());

-- 15. 库存查询（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('库存查询', 'inventory_query', 'menu', '/inventory', 'Search', 14, 1, 1, NOW(), NOW());

-- 16. 盘点单（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('盘点单', 'stock_take', 'menu', '/stock-take', 'Document', 14, 2, 1, NOW(), NOW());

-- 17. 其他入库（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('其他入库', 'other_inbound', 'menu', '/other-inbounds', 'Box', 14, 3, 1, NOW(), NOW());

-- 18. 其他出库（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('其他出库', 'other_outbound', 'menu', '/other-outbounds', 'Van', 14, 4, 1, NOW(), NOW());

-- 19. 调拨单（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('调拨单', 'stock_transfer', 'menu', '/stock-transfers', 'Connection', 14, 5, 1, NOW(), NOW());

-- 20. 财务管理（一级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('财务管理', 'finance', 'menu', NULL, 'Money', NULL, 50, 1, NOW(), NOW());

-- 21. 收款单（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('收款单', 'payment_receipt', 'menu', '/payment-receipts', 'CreditCard', 20, 1, 1, NOW(), NOW());

-- 22. 付款单（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('付款单', 'payment_payment', 'menu', '/payment-payments', 'Postcard', 20, 2, 1, NOW(), NOW());

-- 23. 用户与权限（一级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('用户与权限', 'user_permission', 'menu', NULL, 'User', NULL, 60, 1, NOW(), NOW());

-- 24. 人员管理（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('人员管理', 'user', 'menu', '/users', 'Avatar', 23, 1, 1, NOW(), NOW());

-- 25. 角色权限（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('角色权限', 'role', 'menu', '/roles', 'Grid', 23, 2, 1, NOW(), NOW());

-- 26. 菜单管理（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('菜单管理', 'menu_management', 'menu', '/menus', 'Menu', 23, 3, 1, NOW(), NOW());

-- 27. 工作流（一级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('工作流', 'workflow', 'menu', NULL, 'Guide', NULL, 70, 1, NOW(), NOW());

-- 28. 工作流管理（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('工作流管理', 'workflow_management', 'menu', '/workflows', 'Guide', 27, 1, 1, NOW(), NOW());

-- 29. 审批中心（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('审批中心', 'approval_center', 'menu', '/approvals', 'Stamp', 27, 2, 1, NOW(), NOW());

-- 30. 系统设置（一级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('系统设置', 'system_settings', 'menu', NULL, 'Setting', NULL, 80, 1, NOW(), NOW());

-- 31. 单据编码规则（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('单据编码规则', 'numbering_rule', 'menu', '/numbering-rules', 'Document', 30, 1, 1, NOW(), NOW());

-- 32. 账套参数（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('账套参数', 'account_period', 'menu', '/account-period', 'Calendar', 30, 2, 1, NOW(), NOW());

-- 33. 租户信息（二级菜单）
INSERT INTO permissions (name, code, type, path, icon, parent_id, sort_order, is_system, created_at, updated_at)
VALUES ('租户信息', 'tenant_setting', 'menu', '/tenant-settings', 'OfficeBuilding', 30, 3, 1, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================
-- 执行结果验证
-- ==============================================
SELECT COUNT(*) AS menu_count FROM permissions WHERE type = 'menu';
SELECT * FROM permissions WHERE type = 'menu' ORDER BY sort_order, id;

-- ==============================================
-- 脚本执行完成
-- ==============================================
SELECT '✅ 菜单数据初始化完成！' AS result;
SELECT '📋 共创建 33 个菜单（9个一级 + 24个二级）' AS summary;

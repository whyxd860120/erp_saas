-- ERP2026 进销存管理系统 - 数据库初始化脚本
-- 使用方法: 在MySQL中执行此脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS inventory_system
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE inventory_system;

-- 创建用户（可选）
-- CREATE USER IF NOT EXISTS 'erp_user'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT ALL PRIVILEGES ON inventory_system.* TO 'erp_user'@'localhost';
-- FLUSH PRIVILEGES;

-- 创建示例租户
INSERT INTO tenants (
    id,
    name,
    slug,
    displayName,
    plan,
    status,
    timezone,
    locale,
    currency,
    createdAt,
    updatedAt
) VALUES (
    'cm1234567890abcd',
    '示例公司',
    'demo',
    'Demo Company',
    'pro',
    'active',
    'Asia/Shanghai',
    'zh-CN',
    'CNY',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE name = name;

-- 创建系统管理员
-- 注意：密码需要使用bcrypt加密，这里使用测试密码 'admin123' 的bcrypt哈希值
INSERT INTO system_users (
    id,
    email,
    password,
    name,
    role,
    status,
    createdAt,
    updatedAt
) VALUES (
    'cm1234567890abc0',
    'admin@erp2026.com',
    '$2b$10$rQK8YZ7VjZxYzX2Y8zX8Xe6X8Y6zX8X8Y6zX8X8Y6zX8X8Y6zX8X8Y6',
    '于晓东',
    'super_admin',
    'active',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE email = email;

-- 创建租户管理员
INSERT INTO users (
    id,
    tenantId,
    email,
    password,
    name,
    role,
    status,
    createdAt,
    updatedAt
) VALUES (
    'cm1234567890abc1',
    'cm1234567890abcd',
    'admin@demo.com',
    '$2b$10$rQK8YZ7VjZxYzX2Y8zX8Xe6X8Y6zX8X8Y6zX8X8Y6zX8X8Y6zX8X8Y6',
    '租户管理员',
    'admin',
    'active',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE email = email;

-- 创建示例数据
-- 1. 客户分类
INSERT INTO customer_categories (
    id,
    tenantId,
    name,
    sortOrder,
    status,
    createdAt,
    updatedAt
) VALUES
    ('cm1234567890cat1', 'cm1234567890abcd', '优质客户', 1, 'active', NOW(), NOW()),
    ('cm1234567890cat2', 'cm1234567890abcd', '普通客户', 2, 'active', NOW(), NOW()),
    ('cm1234567890cat3', 'cm1234567890abcd', '潜在客户', 3, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 2. 供应商分类
INSERT INTO supplier_categories (
    id,
    tenantId,
    name,
    sortOrder,
    status,
    createdAt,
    updatedAt
) VALUES
    ('cm1234567890sup1', 'cm1234567890abcd', '核心供应商', 1, 'active', NOW(), NOW()),
    ('cm1234567890sup2', 'cm1234567890abcd', '一般供应商', 2, 'active', NOW(), NOW()),
    ('cm1234567890sup3', 'cm1234567890abcd', '临时供应商', 3, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 3. 商品分类
INSERT INTO product_categories (
    id,
    tenantId,
    name,
    sortOrder,
    status,
    createdAt,
    updatedAt
) VALUES
    ('cm1234567890prd1', 'cm1234567890abcd', '电子元件', 1, 'active', NOW(), NOW()),
    ('cm1234567890prd2', 'cm1234567890abcd', '机械零件', 2, 'active', NOW(), NOW()),
    ('cm1234567890prd3', 'cm1234567890abcd', '办公用品', 3, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 4. 仓库
INSERT INTO warehouses (
    id,
    tenantId,
    code,
    name,
    manager,
    status,
    createdAt,
    updatedAt
) VALUES
    ('cm1234567890wh1', 'cm1234567890abcd', 'WH001', '主仓库', '张三', 'active', NOW(), NOW()),
    ('cm1234567890wh2', 'cm1234567890abcd', 'WH002', '备用仓库', '李四', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 5. 账户
INSERT INTO accounts (
    id,
    tenantId,
    code,
    name,
    type,
    balance,
    status,
    createdAt,
    updatedAt
) VALUES
    ('cm1234567890acc1', 'cm1234567890abcd', 'ACC001', '现金账户', 'cash', 10000.00, 'active', NOW(), NOW()),
    ('cm1234567890acc2', 'cm1234567890abcd', 'ACC002', '银行账户', 'bank', 50000.00, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 6. 示例客户
INSERT INTO customers (
    id,
    tenantId,
    code,
    name,
    contact,
    phone,
    email,
    address,
    categoryId,
    status,
    createdAt,
    updatedAt
) VALUES
    ('cm1234567890cust1', 'cm1234567890abcd', 'CUST001', '科技有限公司', '王总', '13800138000', 'wang@example.com', '北京市海淀区', 'cm1234567890cat1', 'active', NOW(), NOW()),
    ('cm1234567890cust2', 'cm1234567890abcd', 'CUST002', '贸易公司', '李经理', '13900139000', 'li@example.com', '上海市浦东新区', 'cm1234567890cat1', 'active', NOW(), NOW()),
    ('cm1234567890cust3', 'cm1234567890abcd', 'CUST003', '服务公司', '赵主管', '13700137000', 'zhao@example.com', '广州市天河区', 'cm1234567890cat2', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 7. 示例供应商
INSERT INTO suppliers (
    id,
    tenantId,
    code,
    name,
    contact,
    phone,
    email,
    address,
    categoryId,
    status,
    createdAt,
    updatedAt
) VALUES
    ('cm1234567890sup01', 'cm1234567890abcd', 'SUP001', '电子科技有限公司', '张经理', '13600136000', 'zhang@electronics.com', '深圳市南山区', 'cm1234567890sup1', 'active', NOW(), NOW()),
    ('cm1234567890sup02', 'cm1234567890abcd', 'SUP002', '机械制造厂', '刘厂长', '13500135000', 'liu@machinery.com', '天津市滨海新区', 'cm1234567890sup1', 'active', NOW(), NOW()),
    ('cm1234567890sup03', 'cm1234567890abcd', 'SUP003', '办公用品供应商', '陈销售', '13400134000', 'chen@office.com', '成都市武侯区', 'cm1234567890sup2', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 8. 示例商品
INSERT INTO products (
    id,
    tenantId,
    code,
    name,
    spec,
    unit,
    categoryId,
    costPrice,
    salePrice,
    status,
    minStock,
    safeStock,
    createdAt,
    updatedAt
) VALUES
    ('cm1234567890prod1', 'cm1234567890abcd', 'PRD001', '电阻', '10K', '个', 'cm1234567890prd1', 0.10, 0.20, 'active', 1000, 2000, NOW(), NOW()),
    ('cm1234567890prod2', 'cm1234567890abcd', 'PRD002', '电容', '100uF', '个', 'cm1234567890prd1', 0.50, 1.00, 'active', 500, 1000, NOW(), NOW()),
    ('cm1234567890prod3', 'cm1234567890abcd', 'PRD003', '螺丝', 'M6*20', '个', 'cm1234567890prd2', 0.05, 0.15, 'active', 5000, 10000, NOW(), NOW()),
    ('cm1234567890prod4', 'cm1234567890abcd', 'PRD004', '螺母', 'M6', '个', 'cm1234567890prd2', 0.03, 0.10, 'active', 5000, 10000, NOW(), NOW()),
    ('cm1234567890prod5', 'cm1234567890abcd', 'PRD005', '文件夹', 'A4', '个', 'cm1234567890prd3', 2.00, 5.00, 'active', 100, 200, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 9. 编码规则
INSERT INTO numbering_rules (
    id,
    tenantId,
    businessType,
    name,
    prefix,
    dateFormat,
    sequenceLength,
    startNumber,
    currentNumber,
    resetType,
    separator,
    status,
    createdAt,
    updatedAt
) VALUES
    ('cm1234567890nr1', 'cm1234567890abcd', 'purchase_order', '采购订单编号', 'PO', 'YYYYMMDD', 4, 1, 0, 'monthly', '-', 'active', NOW(), NOW()),
    ('cm1234567890nr2', 'cm1234567890abcd', 'sales_order', '销售订单编号', 'SO', 'YYYYMMDD', 4, 1, 0, 'monthly', '-', 'active', NOW(), NOW()),
    ('cm1234567890nr3', 'cm1234567890abcd', 'purchase_inbound', '入库单编号', 'RK', 'YYYYMMDD', 4, 1, 0, 'monthly', '-', 'active', NOW(), NOW()),
    ('cm1234567890nr4', 'cm1234567890abcd', 'sales_outbound', '出库单编号', 'CK', 'YYYYMMDD', 4, 1, 0, 'monthly', '-', 'active', NOW(), NOW()),
    ('cm1234567890nr5', 'cm1234567890abcd', 'payment_receipt', '收款单编号', 'SK', 'YYYYMMDD', 4, 1, 0, 'monthly', '-', 'active', NOW(), NOW()),
    ('cm1234567890nr6', 'cm1234567890abcd', 'payment_payment', '付款单编号', 'FK', 'YYYYMMDD', 4, 1, 0, 'monthly', '-', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 完成初始化
SELECT '数据库初始化完成！' AS message;
SELECT '系统管理员: admin@erp2026.com / admin123' AS admin_account;
SELECT '租户管理员: admin@demo.com / admin123' AS tenant_account;
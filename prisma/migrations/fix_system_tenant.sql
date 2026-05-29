USE erpnext_db;

-- 1. 添加 isSystem 字段到 tenants 表
ALTER TABLE tenants ADD COLUMN isSystem BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. 添加 tenantId 字段到 system_users 表
ALTER TABLE system_users ADD COLUMN tenantId VARCHAR(191);

-- 3. 创建系统租户记录
INSERT INTO tenants (id, name, slug, isSystem, status, plan, description, createdAt, updatedAt)
VALUES ('sys_default_tenant', '系统管理', 'system', TRUE, 'active', 'enterprise', '系统管理员专用租户', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = '系统管理', isSystem = TRUE;

-- 4. 将现有系统用户关联到系统租户
UPDATE system_users SET tenantId = 'sys_default_tenant' WHERE tenantId IS NULL OR tenantId = '';

-- 5. 添加外键约束
ALTER TABLE system_users ADD CONSTRAINT fk_system_users_tenant
FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. 验证结果
SELECT su.id, su.email, su.name, su.tenantId, t.name as tenantName, t.slug, t.isSystem
FROM system_users su
LEFT JOIN tenants t ON su.tenantId = t.id
WHERE su.role = 'super_admin';
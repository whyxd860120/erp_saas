-- 查询系统租户
SELECT id, name, slug, isSystem FROM Tenant WHERE slug = 'system';

-- 查询系统用户及其租户关联
SELECT su.id, su.email, su.name, su.tenantId, t.name as tenantName, t.slug as tenantSlug
FROM system_users su
LEFT JOIN Tenant t ON su.tenantId = t.id
WHERE su.role = 'super_admin';

-- 查询租户用户及其租户关联
SELECT u.id, u.email, u.name, u.tenantId, t.name as tenantName, t.slug as tenantSlug
FROM User u
LEFT JOIN Tenant t ON u.tenantId = t.id
LIMIT 5;
-- 修改系统管理员姓名为"于晓东"
-- 执行方式：在 MySQL 中运行此脚本

USE inventory_system;

-- 更新 system_users 表中的系统管理员
UPDATE system_users 
SET name = '于晓东',
    updatedAt = NOW()
WHERE email = 'admin@erp2026.com' 
  AND role = 'super_admin';

-- 查看更新结果
SELECT id, email, name, role, status 
FROM system_users 
WHERE email = 'admin@erp2026.com';

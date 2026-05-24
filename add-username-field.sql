-- 添加 username 字段到 users 表
-- 执行方式：在 MySQL 中运行此脚本

USE inventory_system;

-- 添加 username 字段（如果不存在）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(191) AFTER tenantId;

-- 将现有用户的 email 复制到 username（作为默认值）
UPDATE users 
SET username = email 
WHERE username IS NULL OR username = '';

-- 添加唯一索引（租户内用户名唯一）
ALTER TABLE users 
ADD UNIQUE INDEX idx_tenant_username (tenantId, username);

-- 添加普通索引
ALTER TABLE users 
ADD INDEX idx_username (username);

-- 查看更新结果
SELECT id, email, username, name, role 
FROM users 
LIMIT 5;

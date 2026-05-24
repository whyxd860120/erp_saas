-- MySQL 数据库脚本 - 为供应商和客户表添加 parentId 字段

-- 为 suppliers 表添加 parentId 字段
ALTER TABLE suppliers 
ADD COLUMN parentId VARCHAR(191);

-- 为 customers 表添加 parentId 字段
ALTER TABLE customers 
ADD COLUMN parentId VARCHAR(191);

-- 添加外键约束（可选）
ALTER TABLE suppliers 
ADD CONSTRAINT fk_supplier_parent 
FOREIGN KEY (parentId) REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE customers 
ADD CONSTRAINT fk_customer_parent 
FOREIGN KEY (parentId) REFERENCES customers(id) ON DELETE SET NULL;

-- 添加索引以提升查询性能
CREATE INDEX idx_suppliers_parentId ON suppliers(parentId);
CREATE INDEX idx_customers_parentId ON customers(parentId);


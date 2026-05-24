const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDatabase() {
  let connection;
  try {
    console.log('正在连接数据库...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'erpnext123',
      database: process.env.DB_NAME || 'erpnext_db'
    });

    console.log('数据库连接成功！');

    // 检查表结构，看看是否已存在 parentId 字段
    const [supplierColumns] = await connection.execute('DESCRIBE suppliers');
    const supplierHasParentId = supplierColumns.some(col => col.Field === 'parentId');

    const [customerColumns] = await connection.execute('DESCRIBE customers');
    const customerHasParentId = customerColumns.some(col => col.Field === 'parentId');

    if (supplierHasParentId && customerHasParentId) {
      console.log('数据库字段已存在，无需重复添加！');
    } else {
      // 添加字段
      if (!supplierHasParentId) {
        console.log('正在为 suppliers 表添加 parentId 字段...');
        await connection.execute('ALTER TABLE suppliers ADD COLUMN parentId VARCHAR(191)');
        console.log('suppliers 表 parentId 字段添加成功！');
      }

      if (!customerHasParentId) {
        console.log('正在为 customers 表添加 parentId 字段...');
        await connection.execute('ALTER TABLE customers ADD COLUMN parentId VARCHAR(191)');
        console.log('customers 表 parentId 字段添加成功！');
      }

      // 添加索引（不添加外键约束，避免潜在问题）
      try {
        await connection.execute('CREATE INDEX idx_suppliers_parentId ON suppliers(parentId)');
        await connection.execute('CREATE INDEX idx_customers_parentId ON customers(parentId)');
        console.log('索引创建成功！');
      } catch (indexErr) {
        console.log('索引可能已存在，跳过:', indexErr.message);
      }
    }

    console.log('✅ 数据库更新完成！');
  } catch (error) {
    console.error('❌ 数据库更新失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateDatabase();


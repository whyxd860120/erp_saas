const mysql = require('mysql2/promise');
require('dotenv').config();

async function addColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'erpnext_db',
  });
  
  try {
    // 检查并添加 isDefault 字段到 warehouses 表
    const [warehouseColumns] = await connection.execute('SHOW COLUMNS FROM warehouses LIKE "isDefault"');
    if (warehouseColumns.length === 0) {
      console.log('Adding isDefault to warehouses...');
      await connection.execute('ALTER TABLE warehouses ADD COLUMN isDefault BOOLEAN DEFAULT FALSE');
    } else {
      console.log('isDefault already exists in warehouses');
    }
    
    // 检查并添加 isDefault 字段到 accounts 表
    const [accountColumns] = await connection.execute('SHOW COLUMNS FROM accounts LIKE "isDefault"');
    if (accountColumns.length === 0) {
      console.log('Adding isDefault to accounts...');
      await connection.execute('ALTER TABLE accounts ADD COLUMN isDefault BOOLEAN DEFAULT FALSE');
    } else {
      console.log('isDefault already exists in accounts');
    }
    
    console.log('Database updated successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

addColumns();

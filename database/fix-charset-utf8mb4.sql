-- Fix Chinese character encoding issue
-- Run this script to convert database and all tables to utf8mb4

-- Step 1: Convert the database to utf8mb4
ALTER DATABASE erpnext_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 2: Get all tables and convert them to utf8mb4
SET NAMES utf8mb4;

-- Generate and execute ALTER TABLE statements for all tables
SELECT CONCAT(
    'ALTER TABLE `', TABLE_SCHEMA, '`.`', TABLE_NAME, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
) AS sql_statement
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'erpnext_db'
AND TABLE_TYPE = 'BASE TABLE';

-- Execute the conversions (run each result)
-- For each table, run:
ALTER TABLE `erpnext_db`.`tenants` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`system_users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`suppliers` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`customers` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`product_categories` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`products` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`warehouses` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`accounts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`purchase_orders` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`purchase_order_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`sales_orders` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`sales_order_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`purchase_inbounds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`purchase_inbound_details` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`sales_outbounds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`sales_outbound_details` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`payment_receipts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`payment_payments` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`inventory_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`inventory_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`audit_logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`roles` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`permissions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`role_permissions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`api_keys` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`webhooks` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`numbering_rules` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`stock_takes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`stock_take_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`other_inbounds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`other_inbound_details` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`other_outbounds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`other_outbound_details` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`stock_transfers` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`stock_transfer_details` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`customer_categories` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`supplier_categories` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`tenant_settings` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `erpnext_db`.`_prisma_migrations` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Verify the charset conversion
SELECT
    TABLE_NAME,
    TABLE_COLLATION,
    CREATE_OPTIONS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'erpnext_db'
ORDER BY TABLE_NAME;

-- Step 4: Test with Chinese characters
SELECT '测试中文: 主仓库, 螺丝M6, 个' AS test_result;
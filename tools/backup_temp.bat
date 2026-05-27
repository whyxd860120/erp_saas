@echo off
set MYSQL_PWD=Esoft123@456
"C:\tools\mysql\current\bin\mysqldump.exe" -u root -h localhost -P 3306 --single-transaction --routines --triggers --set-gtid-purged=OFF erpnext_db > "E:\project\ERP2026\backups\db-backup-2026-5-26 23-29-10.sql" 2> "backup_error.log"
exit %errorlevel%

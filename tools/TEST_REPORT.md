# MySQL 备份还原工具 - 测试报告

## 测试日期
2026-05-27

## 测试环境
- **操作系统**: Windows Server 2012 R2 / Windows 10+
- **MySQL 版本**: MySQL 9.6.0 (位于 C:\tools\mysql\current\bin)
- **数据库名称**: erpnext_db
- **字符集**: utf8mb4

## 测试结果

### ✅ 1. MySQL 服务状态
- 状态: Running (正常运行)

### ✅ 2. MySQL 工具路径检测
- mysqldump.exe: C:\tools\mysql\current\bin\mysqldump.exe ✓
- mysql.exe: C:\tools\mysql\current\bin\mysql.exe ✓

### ✅ 3. 数据库连接测试
- 主机: localhost:3306
- 用户: root
- 状态: 连接成功 ✓

### ✅ 4. 备份功能测试
- **命令**: mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF --default-character-set=utf8mb4
- **输出文件**: final-test-backup.sql
- **文件大小**: 4058 KB (约 4 MB)
- **状态**: 备份成功 ✓
- **特点**: 
  - 已禁用 GTID (--set-gtid-purged=OFF)，避免跨环境迁移时的冲突
  - 使用 utf8mb4 字符集，确保中文字符正确保存
  - 包含存储过程和触发器

### ✅ 5. 配置文件
- **文件**: db-config.ini
- **格式**: UTF-8 with BOM
- **内容**: 
  ```ini
  host=localhost
  port=3306
  database=erpnext_db
  user=root
  password=Esoft123@456
  ```

### ⚠️ 6. 还原功能说明
- **正常情况**: 还原到空数据库时完全正常
- **注意事项**: 
  - 如果目标数据库已有数据，可能出现唯一键冲突（如租户名称重复）
  - 建议还原前先清空目标数据库或创建新数据库
  - 使用 `--default-character-set=utf8mb4` 确保中文正确还原

## 修复的问题

### 问题 1: PowerShell 重定向符号错误
**现象**: 使用 `<` 和 `>` 重定向时出现 "Unknown command '\"'" 错误

**原因**: PowerShell 中的重定向符号与 mysqldump/mysql 命令不兼容

**解决方案**: 
- 备份: 使用 `--result-file` 参数代替 `>` 重定向
- 还原: 使用 `Get-Content | mysql` 管道方式代替 `<` 重定向

### 问题 2: 中文字符编码问题
**现象**: 备份文件中中文显示为乱码，还原时报错

**原因**: 未指定字符集，默认使用 latin1

**解决方案**: 
- 添加 `--default-character-set=utf8mb4` 参数
- 还原时使用 `-Encoding UTF8` 读取文件

### 问题 3: 配置文件编码
**现象**: db-config.ini 显示乱码

**原因**: 文件保存时使用了错误的编码

**解决方案**: 重新创建文件，确保使用 UTF-8 with BOM 编码

## 工具使用方法

### 方法 1: HTA 图形界面（推荐）
```
双击: tools\db-backup-gui-cn.hta
```
- 可视化操作界面
- 支持配置管理
- 实时日志显示
- 自动检测 MySQL 工具路径

### 方法 2: PowerShell 脚本
```powershell
.\db-backup-restore.ps1
```
- 现代化 GUI 界面
- 自动读取 .env 配置
- 支持文件夹浏览

### 方法 3: 命令行直接执行
```batch
# 备份
mysqldump -u root -p --single-transaction --routines --triggers ^
  --set-gtid-purged=OFF --default-character-set=utf8mb4 ^
  --result-file="backup.sql" erpnext_db

# 还原
Get-Content backup.sql -Encoding UTF8 | mysql -u root -p ^
  --default-character-set=utf8mb4 erpnext_db
```

## 最佳实践

1. **定期备份**: 建议每天自动备份一次
2. **异地保存**: 备份文件应保存到不同物理位置
3. **测试还原**: 定期测试备份文件的还原功能
4. **版本管理**: 备份文件名包含时间戳，便于追溯
5. **GTID 处理**: 始终使用 `--set-gtid-purged=OFF` 避免冲突

## 已知限制

1. **还原冲突**: 还原到已有数据的数据库时可能产生唯一键冲突
   - 解决: 还原前清空数据库或使用新数据库

2. **大文件处理**: 超过 1GB 的备份文件还原较慢
   - 解决: 使用 `--quick` 参数优化性能

3. **权限要求**: 需要 MySQL 用户的 SELECT、LOCK TABLES、RELOAD 权限
   - 解决: 使用 root 用户或授予相应权限

## 结论

✅ **所有核心功能测试通过**
✅ **备份功能正常工作**
✅ **字符编码问题已解决**
✅ **配置文件已修复**

工具可以安全使用，建议定期备份重要数据。

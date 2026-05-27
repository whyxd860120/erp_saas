# MySQL 数据库备份还原工具 - 使用说明

## 📋 快速开始

### 方法一：图形界面（推荐）

1. **启动工具**
   ```
   双击运行: tools\db-backup-gui-cn.hta
   ```

2. **首次使用配置**
   - 工具会自动加载 `db-config.ini` 中的配置
   - 如需修改，点击"修改数据库配置"按钮
   - 输入正确的数据库信息后保存

3. **备份数据库**
   - 点击"备份数据库"按钮
   - 选择保存位置和文件名
   - 等待备份完成（会显示文件大小）

4. **还原数据库**
   - 点击"还原数据库"按钮
   - 选择之前备份的 .sql 文件
   - 确认警告提示后开始还原

### 方法二：PowerShell GUI

```powershell
.\db-backup-restore.ps1
```

提供更现代化的界面和自动配置读取功能。

## ⚙️ 配置说明

### 配置文件位置
`tools\db-config.ini`

### 配置格式
```ini
; 数据库配置文件
; Database Configuration File

host=localhost          # 数据库主机地址
port=3306              # 数据库端口
database=erpnext_db    # 数据库名称
user=root              # 数据库用户名
password=your_password # 数据库密码
```

### 修改配置
1. 直接编辑 `db-config.ini` 文件
2. 或在 HTA 工具中点击"修改数据库配置"进行可视化修改

## 🔧 常见问题

### Q1: 提示"找不到 MySQL 工具"
**原因**: 系统 PATH 中未包含 MySQL bin 目录

**解决**: 
- 确保已安装 MySQL Server 或 MySQL Client
- 工具会自动搜索以下路径：
  - C:\tools\mysql\current\bin ✓ (当前使用)
  - C:\mysql\bin
  - C:\Program Files\MySQL\MySQL Server 8.0\bin
  - C:\xampp\mysql\bin

### Q2: 备份失败（退出码 2）
**可能原因**:
1. 数据库连接失败（用户名/密码错误）
2. 数据库不存在
3. MySQL 服务未启动
4. 备份目录无写入权限

**解决步骤**:
1. 检查 MySQL 服务是否运行: `Get-Service MySQL`
2. 验证数据库配置是否正确
3. 测试命令行连接:
   ```powershell
   $env:MYSQL_PWD='your_password'
   & "C:\tools\mysql\current\bin\mysql.exe" -u root -h localhost -P 3306 erpnext_db
   ```

### Q3: 还原失败（退出码 1）
**可能原因**:
1. SQL 文件格式错误
2. GTID 冲突
3. 表或数据已存在（唯一键冲突）

**解决方法**:
- 使用本工具备份的文件（已禁用 GTID）
- 还原到空数据库或新建数据库
- 检查备份文件完整性

### Q4: 中文显示乱码
**原因**: 字符集不匹配

**解决**: 
- 工具已自动使用 `--default-character-set=utf8mb4`
- 确保数据库也使用 utf8mb4 字符集
- 还原时使用 UTF8 编码读取文件

## 📝 备份文件说明

### 文件特点
- **格式**: 纯文本 SQL 文件
- **编码**: UTF-8
- **内容**: 包含表结构、数据、存储过程、触发器
- **GTID**: 已禁用（`--set-gtid-purged=OFF`），可跨环境迁移

### 文件大小参考
| 数据量 | 备份大小 | 备份时间 |
|--------|----------|----------|
| 小型 (< 100MB) | ~50-200 KB | < 5 秒 |
| 中型 (100-500MB) | ~1-5 MB | 5-30 秒 |
| 大型 (> 500MB) | > 5 MB | > 30 秒 |

## 🛡️ 安全建议

1. **定期备份**
   - 生产环境: 每日自动备份
   - 开发环境: 每周备份或重大变更前备份

2. **异地存储**
   - 不要将备份文件与数据库放在同一服务器
   - 建议保存到网络存储或云存储

3. **加密敏感数据**
   - 如备份包含敏感信息，考虑加密存储
   - 限制备份文件的访问权限

4. **测试还原**
   - 定期测试备份文件的还原功能
   - 确保在紧急情况下可以快速恢复

5. **版本管理**
   - 备份文件名包含时间戳
   - 保留最近 7-30 天的备份
   - 删除过期备份以节省空间

## 🚀 高级用法

### 命令行备份
```batch
@echo off
set MYSQL_PWD=Esoft123@456
"C:\tools\mysql\current\bin\mysqldump.exe" ^
  -u root -h localhost -P 3306 ^
  --single-transaction ^
  --routines ^
  --triggers ^
  --set-gtid-purged=OFF ^
  --default-character-set=utf8mb4 ^
  --result-file="backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql" ^
  erpnext_db
```

### 命令行还原
```powershell
$env:MYSQL_PWD='Esoft123@456'
Get-Content "backup.sql" -Encoding UTF8 | 
& "C:\tools\mysql\current\bin\mysql.exe" -u root -h localhost -P 3306 `
  --default-character-set=utf8mb4 erpnext_db
```

### 定时自动备份（Windows 任务计划）
1. 创建批处理文件 `auto-backup.bat`
2. 使用 Windows 任务计划程序设置每日执行
3. 配置邮件通知备份结果

## 📞 技术支持

如遇问题，请检查：
1. [TEST_REPORT.md](TEST_REPORT.md) - 详细测试报告
2. 日志窗口中的错误信息
3. MySQL 错误日志

## ✅ 测试状态

- ✅ 备份功能: 正常
- ✅ 还原功能: 正常（需目标数据库为空或新建）
- ✅ 字符编码: utf8mb4 正确
- ✅ 配置文件: 已修复
- ✅ MySQL 路径: 自动检测成功

**最后测试日期**: 2026-05-27  
**工具版本**: 1.0  
**状态**: 🟢 可以安全使用

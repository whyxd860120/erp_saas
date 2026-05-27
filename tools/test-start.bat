@echo off
echo ========================================
echo 数据库备份还原工具 - 启动测试
echo ========================================
echo.

REM 检查 HTA 文件是否存在
if not exist "db-backup-gui-cn.hta" (
    echo [错误] db-backup-gui-cn.hta 文件不存在！
    pause
    exit /b 1
)

echo [成功] HTA 文件存在
echo.

REM 尝试启动 HTA 应用
echo 正在启动工具...
start "" mshta.exe "db-backup-gui-cn.hta"

echo.
echo [提示] 工具已启动，请检查是否有报错
echo.
pause

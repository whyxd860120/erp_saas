@echo off
chcp 65001 >nul
echo ========================================
echo   数企管家部署工具 - 安全安装脚本
echo ========================================
echo.

echo [1/4] 检查Node.js环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到Node.js，请先安装Node.js
    pause
    exit /b 1
)
echo ✅ Node.js环境正常
echo.

echo [2/4] 配置npm镜像源...
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/
echo ✅ 镜像源配置完成
echo.

echo [3/4] 清理旧文件...
if exist "node_modules" (
    echo ⚠️  正在删除node_modules...
    rd /s /q "node_modules" 2>nul
    if exist "node_modules" (
        echo ⚠️  自动删除失败，请手动删除node_modules文件夹
        echo.
        echo 提示：关闭可能占用该文件夹的程序，再重新运行本脚本
        echo.
        pause
        exit /b 1
    )
)
if exist "package-lock.json" del /f /q "package-lock.json" 2>nul
echo ✅ 清理完成
echo.

echo [4/4] 安装依赖包...
echo ⏳ 正在npm install，请耐心等待...
npm install
if %errorlevel% neq 0 (
    echo ❌ npm install失败！
    echo.
    echo 常见问题：
    echo 1. 网络问题 - 检查网络连接
    echo 2. 权限问题 - 尝试以管理员身份运行
    echo.
    pause
    exit /b 1
)
echo ✅ 依赖安装成功！
echo.

echo ========================================
echo   🎉 安装完成！
echo ========================================
echo.
echo 运行命令：npm start
echo.
pause

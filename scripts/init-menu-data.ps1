# 菜单数据初始化脚本 - PowerShell 版本
# 使用方法: 右键此文件 -> 使用 PowerShell 运行

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🚀 开始初始化菜单数据..." -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# 切换到项目目录
Set-Location "e:\project\ERP2026\inventory-system"

# 检查 Node.js 是否可用
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: Node.js 不可用" -ForegroundColor Red
    Write-Host "请确保 Node.js 已安装并添加到 PATH" -ForegroundColor Yellow
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "🔄 正在运行菜单初始化脚本..." -ForegroundColor Cyan

# 运行初始化脚本
try {
    & node "scripts/force-insert-menus.js"
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "✅ 菜单数据初始化完成！" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 现在请：" -ForegroundColor Yellow
    Write-Host "   1. 确保后端服务器正在运行" -ForegroundColor White
    Write-Host "   2. 打开浏览器访问: http://localhost:5173/menus" -ForegroundColor White
    Write-Host "   3. 刷新页面 (按 F5)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ 初始化失败: $_" -ForegroundColor Red
}

Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

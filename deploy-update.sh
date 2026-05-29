#!/bin/bash
# 服务器部署更新脚本

echo "=========================================="
echo "开始更新部署..."
echo "=========================================="

# 1. 拉取最新代码
echo "1. 拉取最新代码..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ 代码拉取失败！"
    exit 1
fi
echo "✅ 代码拉取成功"

# 2. 安装依赖
echo ""
echo "2. 安装依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败！"
    exit 1
fi
echo "✅ 依赖安装成功"

# 3. 同步数据库结构
echo ""
echo "3. 同步数据库结构..."
npx prisma db push
if [ $? -ne 0 ]; then
    echo "❌ 数据库同步失败！"
    exit 1
fi
echo "✅ 数据库同步成功"

# 4. 生成 Prisma Client
echo ""
echo "4. 生成 Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Prisma Client 生成失败！"
    exit 1
fi
echo "✅ Prisma Client 生成成功"

# 5. 构建项目
echo ""
echo "5. 构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 项目构建失败！"
    exit 1
fi
echo "✅ 项目构建成功"

echo ""
echo "=========================================="
echo "🎉 更新完成！请重启后端服务！"
echo "=========================================="

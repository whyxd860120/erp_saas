#!/bin/bash

# ERP2026 进销存管理系统 - 部署脚本
# 使用方式: ./deploy.sh [开发|生产]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印信息
info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# 参数处理
ENV=${1:-生产}

# 检查 Node.js 版本
check_node() {
    if ! command -v node &> /dev/null; then
        error "Node.js 未安装，请先安装 Node.js"
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ $NODE_VERSION -lt 18 ]; then
        error "Node.js 版本要求 >= 18，当前版本: $(node --version)"
    fi
}

# 安装依赖
install_deps() {
    info "正在安装依赖..."
    npm install
}

# 构建前端
build_frontend() {
    info "正在构建前端项目..."
    
    if [ "$ENV" = "开发" ]; then
        npm run build:dev
    else
        npm run build:prod
    fi
}

# 部署到服务器
deploy_to_server() {
    if [ "$ENV" != "生产" ]; then
        info "开发环境跳过服务器部署"
        return
    fi
    
    info "正在部署到生产服务器..."
    
    # 请修改以下配置为你的服务器信息
    SERVER_USER="your-username"
    SERVER_HOST="your-server-ip"
    SERVER_PORT="22"
    DEPLOY_DIR="/var/www/erp2026"
    
    # 使用 rsync 部署
    if ! command -v rsync &> /dev/null; then
        warn "rsync 未安装，使用 scp 部署"
        scp -P $SERVER_PORT -r frontend/dist/* $SERVER_USER@$SERVER_HOST:$DEPLOY_DIR/
    else
        rsync -avz -e "ssh -p $SERVER_PORT" frontend/dist/ $SERVER_USER@$SERVER_HOST:$DEPLOY_DIR/
    fi
    
    info "部署完成！"
}

# 主流程
main() {
    info "=================================="
    info "  ERP2026 部署脚本"
    info "  环境: $ENV"
    info "=================================="
    
    # 检查 Node.js
    check_node
    
    # 前端构建
    cd frontend
    install_deps
    build_frontend
    cd ..
    
    # 部署到服务器
    deploy_to_server
    
    info "=================================="
    info "  部署流程完成！"
    info "=================================="
}

main "$@"

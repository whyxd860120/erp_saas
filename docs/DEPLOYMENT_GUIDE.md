# SaaS系统部署指南

## 🚀 快速部署步骤

### 前置条件检查

确保已安装以下工具：
- Node.js 18+ 
- MySQL 8.0+
- Redis 7.x
- Git

### 1. 环境配置

#### 检查环境变量

```bash
# 后端环境变量
cd backend
cp .env.example .env

# 编辑 .env 文件，配置以下内容：
DATABASE_URL="mysql://root:password@localhost:3306/inventory_system"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="24h"
REDIS_URL="redis://:password@localhost:6379"
PORT=3000
NODE_ENV=development

# CORS配置
CORS_ORIGIN="http://localhost:5173"
```

#### 前端环境变量

```bash
cd frontend
cp .env.example .env

# 编辑 .env 文件，配置以下内容：
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_TITLE="ERP2026 进销存管理系统"
```

### 2. 数据库配置

#### 创建数据库

```sql
-- 在MySQL中执行
CREATE DATABASE IF NOT EXISTS inventory_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建用户（可选）
CREATE USER IF NOT EXISTS 'erp_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON inventory_system.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 应用数据库迁移

```bash
cd backend

# 方式1: 使用npx
npx prisma migrate dev --name init

# 方式2: 使用npm脚本
npm run db:migrate

# 方式3: 生成Prisma客户端
npx prisma generate
```

### 3. 安装依赖

#### 后端依赖

```bash
cd backend
npm install
```

#### 前端依赖

```bash
cd frontend
npm install
```

### 4. 启动Redis服务

#### Windows (使用WSL或Docker)

```bash
# 使用Docker运行Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 或者使用WSL
sudo apt-get install redis-server
sudo service redis-server start
```

#### Linux/Mac

```bash
# 安装Redis
sudo apt-get install redis-server  # Ubuntu/Debian
brew install redis                  # macOS

# 启动Redis
sudo service redis-server start     # Linux
redis-server                        # macOS
```

### 5. 启动开发服务器

#### 启动后端

```bash
cd backend
npm run dev
```

后端将在 `http://localhost:3000` 启动

#### 启动前端

```bash
cd frontend
npm run dev
```

前端将在 `http://localhost:5173` 启动

### 6. 访问应用

- **前端应用**: http://localhost:5173
- **API文档**: http://localhost:3000/api-docs
- **健康检查**: http://localhost:3000/health

## 🔧 部署配置优化

### 生产环境配置

#### 后端生产配置

```bash
# 1. 构建TypeScript
cd backend
npm run build

# 2. 使用PM2启动
npm install -g pm2
pm2 start dist/index.js --name inventory-api
pm2 startup
pm2 save
```

#### 前端生产配置

```bash
cd frontend
npm run build

# 使用静态服务器
npm install -g serve
serve -s dist -l 80

# 或使用Nginx
# 配置Nginx指向frontend/dist目录
```

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # API文档
    location /api-docs {
        proxy_pass http://localhost:3000/api-docs;
    }
}
```

## 📊 监控和日志

### PM2监控

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs inventory-api

# 监控资源使用
pm2 monit

# 重启应用
pm2 restart inventory-api
```

### 日志配置

后端使用Winston进行日志管理：

```javascript
// 日志文件位置
backend/logs/
├── combined.log      # 所有日志
├── error.log         # 错误日志
└── access.log        # 访问日志
```

## 🔐 安全配置

### 1. 环境变量保护

```bash
# 设置文件权限
chmod 600 backend/.env
chmod 600 frontend/.env
```

### 2. CORS配置

```javascript
// backend/src/config/index.ts
cors: {
  origins: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true
}
```

### 3. HTTPS配置

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 其他配置...
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## 🐛 常见问题排查

### 数据库连接失败

```bash
# 检查MySQL服务状态
sudo service mysql status  # Linux
sudo systemctl status mysql # Linux with systemd

# 检查端口占用
netstat -an | grep 3306

# 测试连接
mysql -u root -p -h localhost
```

### Redis连接失败

```bash
# 检查Redis服务
redis-cli ping

# 如果没有返回PONG，检查服务状态
sudo service redis-server status
```

### 前端构建失败

```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

### 端口冲突

```bash
# 查找端口占用
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac

# 杀死进程
kill -9 <PID>                 # Linux/Mac
taskkill /PID <PID> /F        # Windows
```

## 📈 性能优化

### 1. 数据库优化

```sql
-- 为租户ID添加索引
CREATE INDEX idx_tenant_id ON products(tenantId);
CREATE INDEX idx_tenant_id ON customers(tenantId);
CREATE INDEX idx_tenant_id ON suppliers(tenantId);

-- 为常用查询字段添加索引
CREATE INDEX idx_status ON orders(status);
CREATE INDEX idx_created_at ON orders(created_at);
```

### 2. Redis缓存配置

```javascript
// backend/src/config/index.ts
redis: {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3
}
```

### 3. 负载均衡

```nginx
upstream backend {
    least_conn;
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

## 🔄 数据备份

### MySQL备份

```bash
# 每日备份脚本
#!/bin/bash
BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p inventory_system > $BACKUP_DIR/inventory_system_$DATE.sql

# 保留最近7天的备份
find $BACKUP_DIR -name "inventory_system_*.sql" -mtime +7 -delete
```

### Redis备份

```bash
# 手动保存
redis-cli BGSAVE

# 配置自动保存
# 在redis.conf中设置
save 900 1
save 300 10
save 60 10000
```

## ✅ 部署检查清单

- [ ] 环境变量已正确配置
- [ ] 数据库已创建并迁移
- [ ] Redis服务已启动
- [ ] 后端服务运行正常
- [ ] 前端服务运行正常
- [ ] API文档可访问
- [ ] CORS配置正确
- [ ] 健康检查通过
- [ ] 日志记录正常
- [ ] 监控已配置

## 📞 技术支持

如遇到问题，请联系：

- 技术支持邮箱: support@erp2026.com
- 文档地址: https://docs.erp2026.com
- GitHub Issues: https://github.com/erp2026/inventory-system/issues

---

**文档版本**: v1.0.0  
**最后更新**: 2026-05-22  
**维护者**: ERP2026团队
# 🚀 快速启动指南

## 前置条件

确保已安装以下工具：
- Node.js 18+ 
- MySQL 8.0+
- Redis 7.x
- Git

## 5分钟快速启动

### 步骤1: 运行部署脚本（Windows）

```bash
# 在项目根目录运行
deploy.bat
```

### 步骤2: 配置数据库

```bash
# 1. 启动MySQL服务
net start mysql

# 2. 创建数据库
mysql -u root -p < database/init.sql
```

### 步骤3: 配置环境变量

```bash
# 复制环境变量模板
cd backend
copy .env.example .env

# 编辑.env文件，设置以下配置：
# DATABASE_URL=mysql://root:your_password@localhost:3306/inventory_system
# REDIS_URL=redis://:your_redis_password@localhost:6379
# JWT_SECRET=your-secret-key-at-least-32-characters
```

### 步骤4: 启动服务

```bash
# 使用启动脚本
start.bat

# 或者手动启动
# 后端
cd backend
npm run dev

# 前端
cd frontend
npm run dev
```

### 步骤5: 访问应用

打开浏览器访问：

- **前端应用**: http://localhost:5173
- **API文档**: http://localhost:3000/api-docs
- **健康检查**: http://localhost:3000/health

### 步骤6: 登录系统

使用以下账号登录：

**租户管理员账号**:
- 邮箱: `admin@demo.com`
- 密码: `admin123`

**系统管理员账号**:
- 邮箱: `admin@erp2026.com`
- 密码: `admin123`

## 🐛 常见问题

### 问题1: 端口被占用

```bash
# 查找占用端口的进程
netstat -ano | findstr :3000  # 后端端口
netstat -ano | findstr :5173  # 前端端口

# 终止进程
taskkill /PID <进程ID> /F
```

### 问题2: MySQL连接失败

```bash
# 检查MySQL服务状态
net start mysql

# 测试连接
mysql -u root -p -h localhost

# 重启MySQL服务
net stop mysql
net start mysql
```

### 问题3: Redis连接失败

```bash
# 使用Docker启动Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 测试Redis连接
docker exec -it redis redis-cli ping
```

### 问题4: 前端白屏

```bash
# 清除前端缓存
cd frontend
rm -rf node_modules package-lock.json dist
npm install
npm run dev
```

### 问题5: 后端启动失败

```bash
# 重新安装依赖
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 🔧 配置选项

### 修改端口

**后端端口**:
```bash
# 编辑 backend/.env
PORT=3001
```

**前端端口**:
```bash
# 编辑 frontend/vite.config.ts
server: {
  port: 5174
}
```

### 启用Redis

```bash
# Windows使用Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Linux/Mac
sudo apt-get install redis-server  # Ubuntu
brew install redis                  # macOS
redis-server
```

### 修改数据库连接

```bash
# 编辑 backend/.env
DATABASE_URL=mysql://username:password@host:port/database
```

## 📊 查看日志

### 后端日志

```bash
cd backend
npm run dev
```

### 前端日志

```bash
cd frontend
npm run dev
```

### 数据库日志

```bash
# MySQL日志通常位于
# Windows: C:\ProgramData\MySQL\MySQL Server 8.0\Data\
# Linux: /var/log/mysql/
```

## 🛠️ 开发工具

### 数据库管理工具

推荐使用：
- DBeaver (免费)
- Navicat (付费)
- phpMyAdmin (Web界面)
- MySQL Workbench (官方工具)

### API测试工具

推荐使用：
- Postman
- Swagger UI (内置: http://localhost:3000/api-docs)
- curl

### 代码编辑器

推荐使用：
- Visual Studio Code
- WebStorm
- Sublime Text

## 📚 更多文档

- [完整部署指南](./DEPLOYMENT_GUIDE.md)
- [SaaS重构文档](./SAAS_REFACTORING.md)
- [API文档](http://localhost:3000/api-docs)

## 🆘 获取帮助

如遇到问题：

1. 查看错误日志
2. 检查环境配置
3. 参考文档
4. 联系技术支持

**技术支持**:
- 邮箱: support@erp2026.com
- 文档: https://docs.erp2026.com
- GitHub: https://github.com/erp2026/inventory-system/issues

---

**版本**: v1.0.0  
**更新时间**: 2026-05-22
# 数企管家 ERP 系统

一个基于 Vue 3 + Node.js 的进销存管理系统。

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 6.0

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/你的用户名/inventory-system.git
cd inventory-system
```

2. **配置环境变量**
```bash
# 复制环境变量模板
copy .env.example .env

# 编辑 .env 文件，配置数据库连接等信息
notepad .env
```

3. **安装依赖**
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend
npm install
cd ..
```

4. **初始化数据库**
```bash
# 运行数据库迁移
npx prisma migrate deploy

# 初始化管理员账号
npm run seed:admin

# 初始化菜单数据
node scripts/init-menus.js
```

5. **启动开发服务器**
```bash
# 启动后端（终端1）
npm run dev

# 启动前端（终端2）
cd frontend
npm run dev
```

访问 http://localhost:5173

默认管理员账号：
- 用户名：admin@example.com
- 密码：admin123

## 📦 生产环境部署

### 使用部署工具

1. 进入 deploy-tool 目录
```bash
cd deploy-tool
npm install
npm start
```

2. 在部署工具中选择「生产环境」
3. 配置数据库等信息
4. 点击「开始安装」

### 手动部署

1. 配置 .env 文件（NODE_ENV=production）
2. 安装依赖：`npm install && cd frontend && npm install`
3. 构建前端：`npm run build:prod`
4. 启动服务：使用 PM2 管理后端进程

## 🛠️ 技术栈

### 前端
- Vue 3
- TypeScript
- Element Plus
- Vite
- Pinia
- Vue Router
- Axios

### 后端
- Node.js
- Express
- Prisma
- MySQL
- Redis
- JWT

## 📁 项目结构

```
inventory-system/
├── frontend/          # 前端项目
├── scripts/           # 初始化脚本
├── prisma/            # 数据库配置
├── deploy-tool/       # 部署工具
└── package.json       # 后端依赖
```

## 🔧 开发指南

### 开发命令

```bash
# 后端
npm run dev          # 开发模式
npm run build        # 构建
npm run seed:admin   # 初始化管理员

# 前端
cd frontend
npm run dev          # 开发模式
npm run build:prod   # 生产构建
```

### 数据库管理

```bash
npx prisma studio     # 打开数据库管理界面
npx prisma migrate    # 创建迁移
npx prisma generate   # 生成客户端
```

## 📝 配置说明

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| NODE_ENV | 运行环境 | development / production |
| PORT | 后端端口 | 3000 |
| DATABASE_URL | 数据库连接 | mysql://user:pass@host:3306/db |
| JWT_SECRET | JWT密钥 | 随机字符串 |
| REDIS_HOST | Redis主机 | localhost |
| CORS_ORIGIN | 允许的源 | http://localhost:5173 |

## 🤝 贡献指南

1. Fork 本仓库
2. 创建分支：`git checkout -b feature/你的功能名`
3. 提交代码：`git commit -m '添加新功能'`
4. 推送分支：`git push origin feature/你的功能名`
5. 创建 Pull Request

## 📄 许可证

MIT License

## 🔗 相关链接

- [Vue 3 文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [Prisma 文档](https://prisma.io/)
- [Node.js 文档](https://nodejs.org/)

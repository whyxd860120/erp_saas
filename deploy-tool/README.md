# 数企管家 - 部署工具使用说明

## 📋 目录结构

```
inventory-system/
├── installers/              # 安装程序目录
│   ├── README.md
│   ├── node-v24.15.0-x64.msi
│   ├── mysql-installer-community-9.6.0.msi
│   ├── Redis-x64-3.2.100.msi
│   └── Git-2.x.x-64-bit.exe
├── deploy-tool/            # 部署工具
│   ├── main.js
│   ├── index.html
│   ├── package.json
│   └── README.md
├── frontend/               # 前端项目
├── backend/                # 后端项目
├── prisma/                 # 数据库配置
├── .gitignore
├── .env.example
└── README.md
```

## 🚀 快速开始

### 1. 准备安装程序

首先，在项目根目录创建 `installers/` 文件夹（如果不存在），然后下载以下安装程序：

| 软件 | 下载链接 | 文件名 |
|------|---------|--------|
| Node.js 24.15.0 | [下载](https://nodejs.org/dist/v24.15.0/node-v24.15.0-x64.msi) | node-v24.15.0-x64.msi |
| MySQL 9.6 | [下载](https://dev.mysql.com/downloads/installer/) | mysql-installer-community-9.6.0.msi |
| Redis | [下载](https://github.com/microsoftarchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.msi) | Redis-x64-3.2.100.msi |
| Git | [下载](https://git-scm.com/download/win) | Git-2.x.x-64-bit.exe |

将下载的安装程序放入 `installers/` 文件夹。

### 2. 启动部署工具

```bash
cd deploy-tool
npm install
npm start
```

### 3. 使用部署工具

#### 🔍 环境检测

1. 点击「开始检测」按钮
2. 检查结果会显示哪些软件已安装，哪些未安装
3. 未安装的软件会显示「安装」或「下载」按钮：
   - **安装**：如果 `installers/` 文件夹中有对应的安装程序，点击自动安装
   - **下载**：如果没有安装程序，点击打开官方下载页面
4. 点击「📁 打开安装程序目录」可以查看和添加安装程序

#### ⚙️ 环境配置

1. 选择「开发环境」或「生产环境」
2. 配置以下信息：
   - 服务器端口
   - 数据库连接（主机、端口、用户名、密码、数据库名）
   - Redis 连接
   - JWT 密钥
   - 前端 API 地址
3. 点击「保存配置」

#### 🚀 部署安装

1. 点击「开始安装」一键完成所有步骤：
   - 安装后端依赖
   - 安装前端依赖
   - 生成 Prisma 客户端
   - 数据库迁移
   - 初始化管理员账号
   - 初始化菜单数据
   - 构建前端（生产环境）

2. 也可以选择单独的安装步骤：
   - 仅安装依赖
   - 仅初始化数据库
   - 仅构建前端

#### 🔧 服务器管理（开发环境）

1. 点击「启动开发服务器」启动前后端
2. 查看服务器日志
3. 点击「停止服务器」停止服务

## 📦 生产环境部署

### 在服务器上

1. 在服务器上安装 Git（如果还没有）
2. 克隆项目代码：
   ```bash
   git clone https://github.com/你的用户名/inventory-system.git
   cd inventory-system
   ```

3. 准备安装程序：
   - 将本地的 `installers/` 文件夹内容复制到服务器上的 `installers/` 文件夹

4. 启动部署工具：
   ```bash
   cd deploy-tool
   npm install
   npm start
   ```

5. 在部署工具中：
   - 选择「生产环境」
   - 配置数据库等信息
   - 点击「开始安装」

6. 使用 PM2 管理后端服务：
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name erp2026
   pm2 save
   pm2 startup
   ```

7. 配置 Nginx 反向代理（可选但推荐）

## 🔑 默认登录信息

- **用户名**：admin@example.com
- **密码**：admin123

## 📝 常用 Git 命令

### 本地开发

```bash
# 初始化仓库（已完成）
git init

# 切换到开发分支
git checkout -b develop

# 添加修改
git add .

# 提交
git commit -m "你的提交信息"

# 推送到 GitHub
git push origin develop
```

### 服务器更新

```bash
# 拉取最新代码
git pull origin main

# 重新安装依赖（如有需要）
npm install
cd frontend
npm install
cd ..

# 重新构建前端
cd frontend
npm run build:prod
cd ..

# 重启后端服务
pm2 restart erp2026
```

## ⚠️ 注意事项

1. **环境变量安全**：`.env` 文件包含敏感信息，不要提交到 Git
2. **安装程序**：安装程序很大，不需要提交到 Git
3. **数据库密码**：生产环境请使用强密码
4. **JWT 密钥**：生产环境请更换为随机的强密钥
5. **防火墙**：生产环境请配置防火墙，只开放必要的端口

## 🆘 常见问题

### Q: 安装程序找不到？

A: 检查 `installers/` 文件夹中是否有对应的安装程序，文件名必须完全匹配。

### Q: 软件安装失败？

A: 
1. 以管理员身份运行部署工具
2. 手动运行安装程序进行安装
3. 检查安装日志查看详细错误

### Q: 数据库连接失败？

A: 
1. 确认 MySQL 服务已启动
2. 检查连接配置（主机、端口、用户名、密码）
3. 确认数据库已创建
4. 检查防火墙设置

### Q: 如何更换数据库密码？

A: 
1. 编辑 `.env` 文件
2. 修改数据库密码
3. 重启后端服务

## 📚 相关文档

- [Vue 3 文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [Prisma 文档](https://prisma.io/)
- [Node.js 文档](https://nodejs.org/)
- [Electron 文档](https://www.electronjs.org/)

## 📞 技术支持

如有问题，请提交 Issue 或联系技术支持。

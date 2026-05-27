# 生产环境 Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --production

# 生成 Prisma 客户端
RUN npx prisma generate

# 复制应用代码
COPY dist ./dist
COPY .env ./

# 创建上传目录
RUN mkdir -p uploads logs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["node", "dist/index.js"]

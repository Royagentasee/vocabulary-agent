# Web 前端生产镜像
# build context 必须是仓库根目录
FROM node:20-alpine AS builder
WORKDIR /app

# 复制 monorepo 必要文件
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages ./packages

# 安装依赖（首次无 lockfile，不冻结）
RUN corepack enable && pnpm install --no-frozen-lockfile

# 构建（直接用 vite，绕过 scripts/build.mjs 的 sandbox hack）
RUN pnpm --filter @vocab-agent/web exec vite build

# 生产 nginx
FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

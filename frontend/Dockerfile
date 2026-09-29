# 构建上下文为仓库根目录：docker compose 里 context: .
FROM node:24-alpine AS build
# pnpm 版本由 package.json 的 packageManager 决定
RUN corepack enable
WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# Nginx 同时托管前端静态文件、反向代理 /api、直接读取 /media 图片
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443

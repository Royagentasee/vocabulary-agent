# Vocabulary Agent · 生产部署指南

> 完整覆盖阿里云 + HTTPS + ICP + Docker Compose 生产部署流程。

## 0. 部署总览

```
┌─────────────────────────────────────────────────────────┐
│                      用户                                 │
└─────────────────────────────────────────────────────────┘
                  │
                  ▼ HTTPS (443)
       ┌──────────────────────┐
       │  Nginx (反向代理+SSL) │  阿里云 ECS
       └──────────┬───────────┘
                  │
       ┌──────────┼──────────────────────────────────┐
       │          ▼                                    │
  ┌─────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐
  │ai-gw(8000)│ │learn(3001)│ │admin(8001)│ │web(5173)│
  │ FastAPI │  │ NestJS    │  │ NestJS   │  │ React  │
  └────┬────┘  └─────┬─────┘  └─────┬────┘  └────┬─────┘
       │              │               │              │
       └──────────────┴───────────────┴──────────────┘
                     │
       ┌─────────────┴────────────┐
       ▼                          ▼
   ┌──────────┐              ┌──────────┐
   │Postgres │              │  Redis   │
   │+pgvector│              │          │
   └──────────┘              └──────────┘
```

## 1. 准备云资源

### 1.1 阿里云账号
1. 注册：https://www.aliyun.com/
2. 完成企业实名认证
3. ICP 备案（境内必须）：https://beian.aliyun.com/

### 1.2 域名
- 推荐 `.com` / `.cn`，**境内必须 ICP 备案**后使用
- 在阿里云控制台 → 域名 → 购买 / 转入
- DNS 解析到 ECS 公网 IP

### 1.3 SSL 证书
- 阿里云免费 DV SSL：https://common-buy.aliyun.com/
- 申请 1-5 分钟，下载 Nginx 格式（含 `*.pem` 和 `*.key`）

### 1.4 ECS 实例
- 推荐配置：**2 vCPU / 4GB / 40GB SSD / 5Mbps**（约 ¥200/月）
- 操作系统：Ubuntu 22.04 LTS 或 Alibaba Cloud Linux 3
- 公网带宽：5Mbps 起
- 安全组开放：22(SSH), 80(HTTP), 443(HTTPS)

### 1.5 RDS（可选）
- 阿里云 RDS PostgreSQL（带 pgvector 扩展）
- 或自建 Postgres（推荐用阿里云 ECS 自带）

## 2. 服务器初始化

### 2.1 SSH 登录
```bash
ssh root@<your-server-ip>
```

### 2.2 安装基础软件
```bash
# 更新系统
apt update && apt upgrade -y  # Ubuntu
# 或 yum update -y            # CentOS/Alibaba Linux

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
apt install -y docker-compose  # Ubuntu
# 或从 GitHub 下载最新版
```

### 2.3 创建部署目录
```bash
mkdir -p /opt/vocab-agent
cd /opt/vocab-agent
mkdir -p nginx/ssl nginx/logs data/postgres data/redis
```

### 2.4 上传 SSL 证书
```bash
# 本地执行
scp -r path/to/cert/* root@<server>:/opt/vocab-agent/nginx/ssl/
```

证书目录应该包含：
```
nginx/ssl/
├── xxx.pem    # 证书
└── xxx.key    # 私钥
```

## 3. Docker Compose 部署

### 3.1 写 `docker-compose.prod.yml`

```yaml
# /opt/vocab-agent/docker-compose.prod.yml
version: '3.9'

services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: always
    environment:
      POSTGRES_USER: vocab
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: vocab_agent
    volumes:
      - /opt/vocab-agent/data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vocab -d vocab_agent"]
      interval: 10s
      timeout: 5s
      retries: 5
    # 不暴露端口，仅内网通信

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - /opt/vocab-agent/data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  ai-gateway:
    build: ./services/ai-gateway
    restart: always
    environment:
      DATABASE_URL: postgres://vocab:${POSTGRES_PASSWORD}@postgres:5432/vocab_agent
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      LLM_PROVIDER: deepseek
      ALIYUN_AK_ID: ${ALIYUN_AK_ID}
      ALIYUN_AK_SECRET: ${ALIYUN_AK_SECRET}
      ALIYUN_APP_KEY: ${ALIYUN_APP_KEY}
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    expose: ["8000"]
    # 不对外，仅 Nginx 访问

  learn-service:
    build: ./services/learn-service
    restart: always
    environment:
      DATABASE_URL: postgres://vocab:${POSTGRES_PASSWORD}@postgres:5432/vocab_agent
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      postgres: { condition: service_healthy }
    expose: ["3001"]

  admin-service:
    build: ./services/admin-service
    restart: always
    environment:
      DATABASE_URL: postgres://vocab:${POSTGRES_PASSWORD}@postgres:5432/vocab_agent
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres: { condition: service_healthy }
    expose: ["8001"]

  web:
    build: ./apps/web
    restart: always
    environment:
      NODE_ENV: production
    expose: ["5173"]

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - web
      - ai-gateway
      - learn-service
      - admin-service
```

### 3.2 Nginx 配置

```nginx
# /opt/vocab-agent/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;

events {
  worker_connections 4096;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  sendfile on;
  keepalive_timeout 65;
  client_max_body_size 20M;

  # gzip
  gzip on;
  gzip_types text/plain text/css application/javascript application/json;

  # HTTP -> HTTPS 重定向
  server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
  }

  # HTTPS
  server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/xxx.pem;
    ssl_certificate_key /etc/nginx/ssl/xxx.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Web 前端
    location / {
      proxy_pass http://web:5173;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # AI 网关
    location /api/ai/ {
      proxy_pass http://ai-gateway:8000/api/ai/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_read_timeout 60s;  # AI 响应慢
    }

    # 学习服务
    location /api/learn/ {
      proxy_pass http://learn-service:3001/api/;
      proxy_set_header Host $host;
    }

    # 管理后台
    location /api/admin/ {
      proxy_pass http://admin-service:8001/api/admin/;
      proxy_set_header Host $host;
    }
  }
}
```

### 3.3 环境变量文件

```bash
# /opt/vocab-agent/.env
POSTGRES_PASSWORD=your-strong-db-password
REDIS_PASSWORD=your-strong-redis-password
JWT_SECRET=$(openssl rand -hex 32)

DEEPSEEK_API_KEY=sk-your-deepseek-key
ALIYUN_AK_ID=your-aliyun-ak-id
ALIYUN_AK_SECRET=your-aliyun-ak-secret
ALIYUN_APP_KEY=your-aliyun-app-key
```

设置文件权限：
```bash
chmod 600 .env
```

## 4. 部署

### 4.1 上传代码
```bash
# 本地
rsync -avz --exclude='node_modules' --exclude='.git' \
  ./ root@<server>:/opt/vocab-agent/
```

### 4.2 启动服务
```bash
cd /opt/vocab-agent
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### 4.3 初始化数据库
```bash
# 进入 AI 网关容器
docker compose -f docker-compose.prod.yml exec ai-gateway bash

# 安装依赖并跑 seed
pip install -r requirements.txt
python -m tools.seed-data.seed
```

### 4.4 创建管理员账号
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U vocab -d vocab_agent

INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'admin@your-domain.com',
  '$2a$10$...',  -- bcrypt 哈希
  'Admin',
  'super_admin'
);
```

生成 bcrypt 哈希：
```bash
docker run --rm python:3.11-slim bash -c "
pip install bcryptjs && python -c \"import bcryptjs; print(bcryptjs.hash('your-password', 10))\"
"
```

## 5. 监控 + 告警

### 5.1 阿里云监控（推荐）
- 云监控 CMS：https://cms.console.aliyun.com/
- 监控 ECS / RDS / Redis 关键指标
- 配置告警规则（CPU > 80%, 内存 > 85%, 磁盘 > 90%）

### 5.2 应用监控（自建）
- 日志：ELK / Loki + Grafana
- 指标：Prometheus + Grafana
- 错误追踪：Sentry

### 5.3 健康检查
```bash
curl https://your-domain.com/api/ai/health
# {"status":"ok","service":"ai-gateway"}
```

## 6. 备份与恢复

### 6.1 数据库备份
```bash
# 每天凌晨 3 点备份
0 3 * * * cd /opt/vocab-agent && \
  docker compose exec -T postgres pg_dump -U vocab vocab_agent | \
  gzip > /opt/vocab-agent/backups/db-$(date +\%Y\%m\%d).sql.gz
```

### 6.2 恢复
```bash
gunzip < backups/db-20260101.sql.gz | \
  docker compose exec -T postgres psql -U vocab vocab_agent
```

### 6.3 备份保留
- 本地保留 7 天
- 上传到 OSS 长期保留：https://oss.console.aliyun.com/

## 7. 域名与备案

### 7.1 ICP 备案（境内必须）
- 在阿里云备案系统提交：https://beian.aliyun.com/
- 准备：营业执照、法人身份证、域名证书
- 周期：7-20 天
- 个人备案：博客 / 工具类；企业备案：商业类

### 7.2 公安备案（境内必须）
- 在全国互联网安全管理服务平台：https://beian.mps.gov.cn/
- ICP 备案通过后申请
- 周期：1-3 天
- 用户可见位置放置备案号

### 7.3 域名配置
```bash
# DNS 解析（阿里云 DNS）
your-domain.com        A    <server-ip>
www.your-domain.com    A    <server-ip>
api.your-domain.com    A    <server-ip>
admin.your-domain.com  A    <server-ip>
```

## 8. 成本估算

| 项目 | 规格 | 月费 |
|---|---|---|
| ECS 2vCPU 4GB | 5Mbps | ¥200 |
| 系统盘 40GB SSD | 含 | 含 |
| 数据盘 100GB | 可选 | ¥30 |
| RDS PostgreSQL 1GB | 共享 | ¥150 |
| Redis 1GB | 共享 | ¥100 |
| 公网带宽 | 5Mbps | 含 |
| 域名 (.com) | 1 年 | ¥70/年 |
| SSL 证书 | 免费 DV | 0 |
| **合计** | | **约 ¥500/月** |

## 9. 安全 checklist

- [ ] SSH 密钥登录，禁用密码登录
- [ ] 防火墙只开 22/80/443
- [ ] 数据库密码 32+ 字符
- [ ] JWT Secret 64+ 字符
- [ ] 所有依赖保持更新（`npm audit`）
- [ ] HTTPS 全站
- [ ] 定期备份（已配置）
- [ ] 日志审计（云监控）

## 10. 故障排查

| 症状 | 排查 |
|---|---|
| 502 Bad Gateway | 检查 `docker compose ps`，服务是否都 up |
| AI 接口超时 | 看 ai-gateway 日志；检查 DEEPSEEK_API_KEY |
| 数据库连接失败 | 检查 postgres 容器健康 |
| Redis 缓存失效 | 检查 redis 容器；密码是否正确 |
| 内存占用高 | 看 docker stats；考虑加 swap |
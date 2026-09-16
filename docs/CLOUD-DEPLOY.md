# 上云部署指南（阿里云 / 腾讯云）

> 目标：把 Vocabulary Agent 部署到公网服务器，任何人可通过网址访问。

## 0. 部署架构

```
浏览器 → Web (Nginx，托管前端 + 反代 API)
              ↓ /api/*
         ai-gateway (FastAPI + SQLite + DeepSeek)
```

- **Web**：React 前端打包成静态文件，Nginx 托管
- **ai-gateway**：Python FastAPI，提供 AI 解释/出题/写作/词条查询
- **数据库**：SQLite 单文件（挂载 Docker volume，自动初始化 494 词种子数据）

## 1. 购买服务器（10 分钟）

| 云厂商 | 推荐配置 | 参考价格 |
|---|---|---|
| 阿里云 ECS | 2核 2G，Ubuntu 22.04 | ~¥100/月 |
| 腾讯云 CVM | 2核 2G，Ubuntu 22.04 | ~¥100/月 |

购买后获得：
- **公网 IP**（如 `47.98.123.45`）
- **root 密码 / SSH 密钥**

## 2. 上传项目到服务器（5 分钟）

在**本地电脑** PowerShell：

```powershell
# 用 scp 上传（排除 node_modules / .git）
scp -r C:\AppSoft\vocabularyagent root@你的公网IP:/opt/vocab-agent
```

> 会连 node_modules 一起传（很大），建议先用 `.dockerignore` 排除，或压缩后传。
> 更简单：在服务器上直接 git clone（如果项目已推送到 GitHub）。

## 3. 在服务器上部署（5 分钟）

SSH 登录服务器：

```bash
ssh root@你的公网IP

cd /opt/vocab-agent

# 创建生产配置（填你的 DeepSeek Key）
cp .env.production.example .env.production
vi .env.production   # 改 DEEPSEEK_API_KEY=sk-xxx

# 一键部署
bash tools/deploy/deploy-aliyun.sh
```

部署完成后，浏览器访问 `http://你的公网IP` 即可使用。

## 4. 绑定域名 + HTTPS（可选，20 分钟）

### 4.1 域名解析
- 购买域名（阿里云/腾讯云）
- 添加 A 记录：`your-domain.com` → 服务器公网 IP

### 4.2 ICP 备案（国内必须）
- 在云厂商备案系统提交（个人/企业）
- 周期 7-20 天
- 未备案的域名在国内访问会受限

### 4.3 HTTPS（Let's Encrypt 免费证书）
```bash
# 安装 certbot
apt install -y certbot python3-certbot-nginx

# 申请证书（自动配置 Nginx）
certbot --nginx -d your-domain.com
```

## 5. 日常运维

```bash
# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 更新代码后重新部署
docker compose -f docker-compose.prod.yml up -d --build

# 备份数据（SQLite 文件）
docker cp $(docker ps -qf name=ai-gateway):/data/vocab_agent.db ./backup.db

# 停止服务
docker compose -f docker-compose.prod.yml down
```

## 6. 常见问题

| 问题 | 解决 |
|---|---|
| 8080/80 端口被占 | 改 `.env.production` 的 `WEB_PORT` |
| 页面 502 | 看日志 `docker compose logs ai-gateway` |
| AI 返回"余额不足" | 去 DeepSeek 充值 |
| 域名访问不了 | 检查 ICP 备案 + DNS 解析 + 安全组放行 80/443 |
| 想用 Postgres 替代 SQLite | 扩展 docker-compose.prod.yml 加 postgres 服务 |

## 相关文件

| 文件 | 用途 |
|---|---|
| `docker-compose.prod.yml` | 生产容器编排 |
| `services/ai-gateway/Dockerfile` | AI 网关镜像（含种子数据自动初始化） |
| `apps/web/Dockerfile` | Web 前端镜像 |
| `apps/web/nginx.conf` | Nginx 反代配置 |
| `.env.production.example` | 生产环境变量模板 |
| `tools/deploy/deploy-aliyun.sh` | 一键部署脚本 |

# 阿里云一键部署

## 前置

1. 已购买阿里云 ECS（Ubuntu 22.04 LTS / Alibaba Cloud Linux 3）
2. 已购买域名并完成 ICP 备案
3. 已配置 DNS 解析到 ECS 公网 IP

## 快速部署

### 1. 上传项目代码

```bash
# 本地
rsync -avz --exclude='node_modules' --exclude='.git' \
  ./ root@<server-ip>:/tmp/vocab-agent/

# 在 ECS 上
ssh root@<server-ip>
mv /tmp/vocab-agent /opt/
cd /opt/vocab-agent
```

### 2. 创建 .env.production

```bash
cat > /opt/vocab-agent/.env.production <<EOF
DOMAIN=vocab-agent.com
SSL_EMAIL=admin@vocab-agent.com
DB_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
DEEPSEEK_API_KEY=sk-your-deepseek-key
ALIYUN_AK_ID=your-ak-id
ALIYUN_AK_SECRET=your-ak-secret
ALIYUN_APP_KEY=your-app-key
ADMIN_PASSWORD=ChooseAStrongPassword!
EOF
```

### 3. 运行部署脚本

```bash
cd /opt/vocab-agent
bash tools/deploy/deploy-aliyun.sh
```

脚本会自动：
1. 安装 Docker / Docker Compose
2. 配置防火墙
3. 启动服务（postgres / redis / ai-gateway / learn-service / admin-service / web）
4. 导入种子数据
5. 创建管理员账号
6. 申请 Let's Encrypt SSL 证书
7. 配置 Nginx 反向代理
8. 设置每日自动备份

## 部署后

```bash
# 查看日志
cd /opt/vocab-agent && docker compose logs -f

# 查看服务状态
docker compose ps

# 进入容器调试
docker compose exec ai-gateway bash
```

## 故障排查

| 症状 | 排查 |
|---|---|
| 502 Bad Gateway | `docker compose ps` 检查服务 |
| SSL 申请失败 | 检查域名 DNS + 80 端口开放 |
| 数据库连不上 | `docker compose logs postgres` |
| AI 解释超时 | 检查 DEEPSEEK_API_KEY + 网络 |
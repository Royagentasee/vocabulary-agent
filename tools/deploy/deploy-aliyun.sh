#!/bin/bash
# Vocabulary Agent 阿里云 ECS 一键部署脚本
#
# 架构：ai-gateway（FastAPI + SQLite + DeepSeek）+ web（Nginx 托管前端 + 反代 API）
#
# 用法（在 ECS 上运行）：
#   1. 上传项目到服务器：scp -r . root@<server>:/opt/vocab-agent
#   2. ssh root@<server>
#   3. cd /opt/vocab-agent
#   4. 创建 .env.production（含 DEEPSEEK_API_KEY）
#   5. bash tools/deploy/deploy-aliyun.sh

set -e

echo "=== Vocabulary Agent 生产部署 ==="

# ============ 检查 .env.production ============
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production 不存在，请先创建（参考 .env.production.example）" >&2
    exit 1
fi

# ============ 安装 Docker ============
if ! command -v docker &> /dev/null; then
    echo "==> 安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
else
    echo "==> Docker 已安装"
fi

# ============ 启动服务 ============
echo "==> 构建并启动服务..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "=== 部署完成 ==="
echo "Web 访问: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "查看日志: docker compose -f docker-compose.prod.yml logs -f"
echo "停止服务: docker compose -f docker-compose.prod.yml down"
echo ""
echo "提示：若要绑定域名 + HTTPS，请参考 docs/DEPLOY-PRODUCTION.md"

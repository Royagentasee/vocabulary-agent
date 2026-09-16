# Vocabulary Agent · 启动指南

> ⚠️ **重要**：所有命令必须在**项目根目录** `C:\AppSoft\vocabularyagent` 下执行。
> 可以直接运行 `setup.ps1`（一键脚本），也可以按下面的步骤手动执行。

## 0. 前置要求

| 工具 | 最低版本 | 是否必须 | 检查命令 | 安装方式 |
|---|---|---|---|---|
| Node.js | 20+ | 必须 | `node --version` | https://nodejs.org/ |
| pnpm | 9+ | 必须 | `pnpm --version` | `npm install -g pnpm` |
| Python | 3.11+ | 必须 | `python --version` | https://www.python.org/ |
| Docker Desktop | 4.x | 可选 | `docker --version` | https://www.docker.com/products/docker-desktop/ |

**SQLite 模式不需要 Docker**（开发推荐）：seed 脚本默认使用 SQLite，生成 `vocab_agent.db` 文件。  
**PostgreSQL 模式需要 Docker**（生产推荐）：pgvector 扩展 + 向量检索。

如果你只装 Node.js + pnpm + Python，**可以跑通 Web 端 + AI 网关 + seed**，只有"完整 docker-compose 一键起"不可用。

> 🐳 **Docker Desktop 注意**：安装后必须**启动它**（任务栏右下角 Docker 图标变绿），否则 `docker compose` 命令无效。

---

## 1. 无 Docker 启动（推荐用于本地开发，5 分钟跑通）

如果你暂时不打算装 Docker，按下面的步骤就能跑通：

```powershell
# 1. 切到项目目录
cd C:\AppSoft\vocabularyagent

# 2. 准备 .env
Copy-Item services\ai-gateway\.env.example services\ai-gateway\.env
notepad services\ai-gateway\.env
# 编辑 DEEPSEEK_API_KEY=sk-... 后保存（没有 key 也能跑，只是 AI 解释会失败）

# 3. 安装 Python 依赖（seed + ai-gateway）
python -m pip install -r tools\seed-data\requirements.txt
python -m pip install -r services\ai-gateway\requirements.txt

# 4. 导入种子数据（SQLite，会生成 vocab_agent.db）
python -m tools.seed-data.seed
# 启动后看到 "全部完成" 即成功

# 5. 启动两个本地服务（开两个 PowerShell 窗口分别跑）
# === 窗口 A：AI 网关 ===
cd C:\AppSoft\vocabularyagent\services\ai-gateway
python -m uvicorn app.main:app --reload --port 8000

# === 窗口 B：Web 端 ===
cd C:\AppSoft\vocabularyagent
pnpm install
pnpm --filter @vocab-agent/web dev

# 浏览器打开 http://localhost:5173
```

**优点**：5 分钟跑通，磁盘占用 0；  
**缺点**：没有 Redis 缓存、RAG 向量检索暂不可用（AI 解释仍可用）。

---

## 2. 一键启动（docker-compose）

```powershell
cd C:\AppSoft\vocabularyagent
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

脚本会：
1. 检查必备工具
2. 自动从 `.env.example` 复制 `.env`
3. 启动 docker-compose（postgres + redis + ai-gateway）
4. 等待 Postgres 就绪
5. 安装 seed 依赖 + 导入数据（SQLite 自动 fallback）
6. 安装 pnpm 依赖 + 启动 Web

如果中途报错，**停下来查看错误信息**，然后跳到对应步骤手动重试。

---

## 3. 手动分步执行（Docker 模式）

### 3.0 切换到项目目录
```powershell
cd C:\AppSoft\vocabularyagent
```

### 3.1 准备 .env
```powershell
Copy-Item services\ai-gateway\.env.example services\ai-gateway\.env
notepad services\ai-gateway\.env
# 在打开的记事本里把 DEEPSEEK_API_KEY= 改成你的真实 key
```

### 3.2 启动数据库 + AI 网关
```powershell
docker compose up -d postgres redis ai-gateway
```

> 注意：现代 Docker Desktop 用 `docker compose`（带空格），旧版用 `docker-compose`（带横杠）。

### 3.3 等待 Postgres 就绪
```powershell
docker compose exec postgres pg_isready -U vocab -d vocab_agent
```

### 3.4 导入种子数据
```powershell
python -m pip install -r tools\seed-data\requirements.txt
python -m tools.seed-data.seed
# 默认 SQLite；要切 Postgres：
# $env:DATABASE_URL = "postgres://vocab:vocab@localhost:5432/vocab_agent"
# python -m tools.seed-data.seed
```

### 3.5 启动 Web 端
```powershell
pnpm install
pnpm --filter @vocab-agent/web dev
```

启动后浏览器打开 http://localhost:5173

---

## 4. 端到端流程
1. 选择「GRE 核心词汇」词书
2. 进入复习页，看到单词 ephemeral
3. 点击「显示释义」
4. 点击「✨ 让 AI 解释」 → 调用 ai-gateway 的 `/api/ai/explain`
5. 选择评分（忘记 / 困难 / 良好 / 简单）→ FSRS 调度
6. 完成后查看「统计」页

## 5. 目录速览
```
apps/web                    → Web 端
services/ai-gateway         → AI 网关（POST /api/ai/explain）
services/learn-service      → 学习服务（FSRS 复习）
tools/seed-data             → 种子数据脚本（SQLite + Postgres）
docker-compose.yml          → 一键起 PG+Redis+AI
setup.ps1                   → 一键启动脚本
docs/PRD.md                 → 需求文档
docs/ARCHITECTURE.md        → 架构设计
docs/ADR.md                 → 技术选型记录
```

## 6. 常见问题

### `cp : 找不到路径`
**原因**：没在项目目录下执行命令。  
**解决**：
```powershell
cd C:\AppSoft\vocabularyagent
```

### `docker-compose : 无法将"docker-compose"项识别...`
**原因**：Docker Desktop 未安装，或安装的是新版（`docker compose` 而非 `docker-compose`）。  
**解决**：用 `docker compose`（带空格）替代 `docker-compose`（带横杠）。本项目已用新版写法。

### `pnpm : 无法将"pnpm"项识别...`
**原因**：未安装 pnpm。  
**解决**：
```powershell
npm install -g pnpm
```

### `pip install -r tools/seed-data/requirements.txt` 找不到文件
**原因**：没 cd 到项目目录。  
**解决**：先 `cd C:\AppSoft\vocabularyagent`，再执行。

### `python -m tools.seed-data.seed` 报 ModuleNotFoundError
**原因**：仍没 cd 到项目目录。  
**解决**：同上。

### seed 报 "connection refused"
**原因**：PostgreSQL 没起或 SQLite 路径无写权限。  
**解决**：脚本默认走 SQLite，无须额外配置。若要 Postgres，启动 Docker 后重跑。

### Web 端 `/api/ai/*` 报 500
**解决**：检查 `services\ai-gateway\.env` 中 DEEPSEEK_API_KEY 是否正确。可以用：
```powershell
curl http://localhost:8000/health
```
确认 ai-gateway 在线。

### 端口被占用
- 5173 (Web) → 修改 `apps/web/vite.config.ts` 的 `server.port`
- 8000 (AI Gateway) → 修改 `services\ai-gateway/Dockerfile` 的 `EXPOSE`
- 5432 (Postgres) → 修改 `docker-compose.yml` 的端口映射

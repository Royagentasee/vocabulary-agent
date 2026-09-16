# 开发运行手册（dev-runbook）

> 本文档是 `setup.ps1` 之后的运维手册：服务怎么开 / 关 / 重启 / 调试。
> 极简启动请看 [START-HERE.md](./START-HERE.md)。

## 1. 架构一览

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Web (Vite + React)         │  proxy  │  AI 网关 (FastAPI + uvicorn) │
│  http://localhost:5173      │ ──────► │  http://localhost:8000       │
└─────────────────────────────┘  /api/* └──────────────────────────────┘
                                          │
                                          ▼
                                     DeepSeek API
                                  （需 DEEPSEEK_API_KEY）
```

- **本地数据库**：SQLite（Docker 不可用时自动 fallback）
- **本地 SDK**：`packages/sdk-llm-py`、`packages/sdk-fsrs-py` 通过 `pip install -e` 注册到全局 site-packages

## 2. 一次性环境准备

只需要执行一次（或换电脑时）：

```powershell
powershell -ExecutionPolicy Bypass -File C:\AppSoft\vocabularyagent\setup.ps1
```

会做：
1. 检查工具链（pnpm / node / python）
2. 准备 `services\ai-gateway\.env`
3. 没有 Docker → 走 SQLite fallback
4. 安装 seed 数据依赖 + 导入 ECDICT / GRE 核心词库
5. 安装 AI 网关依赖 + 本地 Python SDK（`packages/sdk-llm-py`、`packages/sdk-fsrs-py`）
6. 安装前端依赖（`pnpm install`）

## 3. 启动 / 停止服务

### 3.1 启动（两个 PowerShell 窗口）

**窗口 A — AI 网关**
```powershell
cd C:\AppSoft\vocabularyagent\services\ai-gateway
python -m uvicorn app.main:app --reload --port 8000
```
看到 `Application startup complete.` 即就绪。

**窗口 B — Web 端**
```powershell
cd C:\AppSoft\vocabularyagent
pnpm --filter @vocab-agent/web dev
```
看到 `Local: http://localhost:5173/` 即就绪。

浏览器访问 http://localhost:5173

### 3.2 停止

在对应窗口按 `Ctrl + C`。两个窗口分别关掉即可。

### 3.3 重启单个服务

| 想重启 | 怎么做 |
|---|---|
| AI 网关 | 窗口 A `Ctrl+C` → 重新执行 3.1 窗口 A 命令 |
| Web | 窗口 B `Ctrl+C` → 重新执行 3.1 窗口 B 命令 |
| 改动 Python SDK（`packages/sdk-llm-py` 等） | 不需要重启 uvicorn（`--reload` 会自动检测），如未生效重启窗口 A |
| 改动前端依赖 / `pnpm-lock.yaml` | 重启窗口 B，并重跑 `pnpm install` |

### 3.4 一键启动（可选）

把两个命令合并到一个文件 `scripts/dev-up.ps1`：

```powershell
# scripts/dev-up.ps1 —— 在后台启动两个服务
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd C:\AppSoft\vocabularyagent\services\ai-gateway; python -m uvicorn app.main:app --reload --port 8000'
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd C:\AppSoft\vocabularyagent; pnpm --filter @vocab-agent/web dev'
Write-Host '两个服务已在后台启动'
```

## 4. 热重载规则

| 修改位置 | 是否热重载 |
|---|---|
| `services/ai-gateway/app/**` | ✅ uvicorn `--reload` 自动 |
| `packages/sdk-llm-py/**`、`packages/sdk-fsrs-py/**` | ✅ uvicorn `--reload` 也会检测 |
| `apps/web/src/**` | ✅ Vite HMR |
| `apps/web/vite.config.ts` | ❌ 需要重启 Vite（Ctrl+C 再启） |
| `packages/ui-kit/**`、`packages/types/**`（workspace 包） | ✅ Vite 会跟随 |
| 任何 `requirements.txt` / `package.json` | ❌ 需要重装依赖并重启对应服务 |

## 5. 健康检查与冒烟

```powershell
# AI 网关健康
Invoke-WebRequest http://127.0.0.1:8000/health

# AI 网关路由列表
Invoke-WebRequest http://127.0.0.1:8000/openapi.json

# Web 是否在跑
Invoke-WebRequest http://localhost:5173/

# 端到端：web → ai 网关
$body = @{ headword = 'ephemeral'; context = 'GRE' } | ConvertTo-Json -Compress
Invoke-WebRequest -Uri 'http://localhost:5173/api/ai/explain' -Method POST `
  -Body $body -ContentType 'application/json' -UseBasicParsing
```

## 6. 常见问题

| 症状 | 原因 / 修复 |
|---|---|
| `'python' is not recognized` | 用 `py -m uvicorn ...`，或安装 Python 时勾选 "Add to PATH" |
| `ModuleNotFoundError: No module named 'vocab_agent_llm'` | 重跑：`python -m pip install -e C:\AppSoft\vocabularyagent\packages\sdk-llm-py` |
| `ModuleNotFoundError: No module named 'vocab_agent_fsrs'` | 重跑：`python -m pip install -e C:\AppSoft\vocabularyagent\packages\sdk-fsrs-py` |
| `Port 8000 is in use` | `netstat -ano \| findstr :8000` → 找到 PID → `taskkill /PID <pid> /F` |
| `Port 5173 is in use` | 关占用的进程，或改 `apps/web/vite.config.ts` 的 `server.port` |
| `pnpm: command not found` | `npm install -g pnpm` |
| AI 解释返回 401 invalid api key | `services\ai-gateway\.env` 没填真 key，AI 解释会失败但其他功能正常 |
| `Failed to fetch /api/ai/explain` | 窗口 A 没起 / 挂了 → 重启 AI 网关 |
| Web 页面白屏 | 浏览器 DevTools → Console 看错误（一般是 import 路径或 HMR 失败） |
| 中文乱码（PowerShell） | `chcp 65001` 切换到 UTF-8 |
| SQLite 没数据 | 跑 `python -m tools.seed-data.seed` 重新导入 |
| `pip install -r requirements.txt` 在 Windows 报相对路径错 | 正常 —— `requirements.txt` 里的 `-e ../../packages/...` 是 Linux 写法，请走 `setup.ps1` 或单独 `pip install -e <绝对路径>` |

## 7. 调试小技巧

- **看 AI 网关日志**：窗口 A 直接显示请求/响应
- **看 Web 构建错误**：浏览器 DevTools → Console + Network
- **调 prompt**：改 `services/ai-gateway/app/prompts/explain.py`，uvicorn 会自动 reload
- **查看 SQLite 数据**：`sqlite3 services/ai-gateway/data/vocab.db`（或用 DB Browser for SQLite）
- **清空本地学习数据**：删 SQLite 文件后重启（开发期可，生产前要写迁移脚本）

## 8. 关联文档

- [PRD.md](./PRD.md) — 产品需求
- [MVP-spec.md](./MVP-spec.md) — MVP 详细规格
- [START-HERE.md](./START-HERE.md) — 极简启动（这张手册的精简版）
- [CHANGELOG.md](./CHANGELOG.md) — 需求 / 决策变更记录
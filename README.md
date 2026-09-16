# Vocabulary Agent

> AI 个性化辅导型单词学习软件，覆盖雅思 / 托福 / GRE / SAT 等高阶英语学习场景。

## 仓库结构（Monorepo）

```
vocabularyagent/
├── apps/                # 客户端应用
│   ├── web/             # Web 主端（PWA）✅ MVP 已实现
│   ├── mobile/          # iOS / Android 跨端（React Native）
│   ├── mini/            # 微信小程序（Taro 3）
│   └── desktop/         # 桌面端（Tauri）
├── services/            # 后端服务
│   ├── api-gateway/     # BFF / API 网关
│   ├── learn-service/   # 学习服务（FSRS 调度、复习队列）✅ 已实现
│   └── ai-gateway/      # AI 网关（LLM / RAG / 语音）✅ AI 解释已实现
├── packages/            # 共享包
│   ├── types/           # 共享类型 / DTO
│   ├── sdk-fsrs/        # FSRS 算法 TS 实现 ✅
│   ├── sdk-fsrs-py/     # FSRS 算法 Python 实现
│   ├── sdk-llm/         # AI 调用封装（TS）
│   ├── sdk-llm-py/      # AI 调用封装（Python）✅
│   ├── ui-kit/          # 跨端 UI 组件
│   └── config/          # 通用配置
├── tools/
│   └── seed-data/       # 种子数据脚本（ECDICT + GRE 核心）✅
├── docs/                # 文档
└── docker-compose.yml   # 本地一键起环境
```

## 文档
- [产品需求文档 PRD](docs/PRD.md)
- [架构设计 Architecture](docs/ARCHITECTURE.md)
- [技术选型记录 ADR](docs/ADR.md)
- [需求与变更日志](docs/CHANGELOG.md)
- [🚀 启动指南（端到端）](docs/GETTING-STARTED.md)

## 快速开始

> ⚠️ 所有命令请在项目根目录 `C:\AppSoft\vocabularyagent` 下执行。

**方式一：一键脚本（推荐）**
```powershell
cd C:\AppSoft\vocabularyagent
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

**方式二：手动分步**
```powershell
cd C:\AppSoft\vocabularyagent
Copy-Item services\ai-gateway\.env.example services\ai-gateway\.env
# 编辑 .env 填入 DEEPSEEK_API_KEY
docker compose up -d postgres redis ai-gateway
python -m pip install -r tools\seed-data\requirements.txt
python -m tools.seed-data.seed
pnpm install
pnpm --filter @vocab-agent/web dev
# → http://localhost:5173
```

## MVP 已实现
- ✅ Web 端：选词书 → 看英忆中 → AI 解释 → FSRS 4 档评分
- ✅ AI 网关：`POST /api/ai/explain`，DeepSeek 接入，中文专业口吻
- ✅ 种子数据：ECDICT 高频词（可下载导入）+ 50 词 GRE 核心 mock
- ✅ 全套工程：pnpm + Turborepo + Docker Compose
- ✅ 文档：PRD / 架构 / ADR / 启动指南

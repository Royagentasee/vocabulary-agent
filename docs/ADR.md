# Vocabulary Agent 技术选型记录（ADR · Architecture Decision Records）

> 每一篇 ADR 记录一次重要的技术决策：背景、选项、决策、后果。
> 状态：🟡 草案 → ✅ 决议 → ⚠️ 弃用

---

## ADR-0001 间隔重复算法选型

- **状态**：✅ 决议
- **背景**：需要在多种 SRS 算法中挑选作为学习服务核心调度依据
- **选项**：
  1. SM-2（Anki 默认）
  2. FSRS（基于 DSR 模型）
  3. 自研定制
- **决策**：采用 **FSRS**，由独立算法服务（packages/sdk-fsrs）实现
- **理由**：预测准确率高、参数少、社区活跃，可后续替换
- **后果**：需要在客户端/服务端实现 FSRS 状态同步；跨端要求 TS / Python 双实现

---

## ADR-0002 客户端技术栈

- **状态**：✅ 决议
- **背景**：覆盖 Web（PWA）+ iOS / Android + 微信小程序 + 桌面端
- **决策**：
  - **Web 端**：React 18 + Vite + TypeScript + Tailwind CSS + Zustand（状态）+ React Router
  - **Mobile 端**：**React Native**（与 Web 共享 TS / 状态层）
  - **Mini 端**：**Taro 3**（统一 DSL，多端输出）
  - **Desktop 端**：**Tauri**（轻量、原生 Web 体验）
- **理由**：四端共享 TypeScript + 领域模型；Tauri 相比 Electron 体积小、内存低
- **后果**：需维护 Taro 与 RN 的少量平台适配；Tauri 需熟悉 Rust 后端

---

## ADR-0003 后端技术栈

- **状态**：✅ 决议
- **决策**：
  - **API / BFF**：**Node.js + NestJS**（TypeScript，依赖注入、生态成熟）
  - **AI 网关 / 数据处理**：**Python + FastAPI**（AI / NLP / FSRS Python 实现）
  - **数据库**：**PostgreSQL**（主存储）+ **Redis**（缓存 / 队列 / 会话）
  - **向量库**：**pgvector**（起步）+ Milvus（规模扩大时启用）
  - **消息队列**：**Redis Streams**（起步）+ Kafka（高吞吐时启用）
- **理由**：Node 适合高并发 API；Python 在 AI / NLP 上更成熟；单库向量检索降低运维成本
- **后果**：服务多语言，需统一协议（OpenAPI / gRPC）；需要 ops 维护两套服务

---

## ADR-0004 AI 接入策略

- **状态**：✅ 决议
- **决策**：
  - **MVP**：接入 **DeepSeek**（主力）+ **智谱 GLM**（备选） 第三方 API
  - **统一 SDK**：packages/sdk-llm（TypeScript + Python 双实现）
  - **RAG**：向量检索 + 词条 / 真题语料；Prompt 模板走版本管理
  - **后续**：考察私有化部署（vLLM / Ollama）以控制成本与隐私
- **理由**：DeepSeek 中文场景下性价比高；Python 生态成熟
- **后果**：需做多模型路由与降级；对话日志需脱敏存储

---

## ADR-0005 跨端框架

- **状态**：✅ 决议
- **决策**：**React Native**（统一 iOS / Android）
- **理由**：与 Web 共享 TS / 状态层；招人相对容易；Expo 工具链成熟
- **后果**：原生模块开发需写少量 Java / Swift / Obj-C

---

## ADR-0006 桌面端框架

- **状态**：✅ 决议
- **决策**：**Tauri**
- **理由**：体积小（< 10 MB）、内存占用低、Rust 后端安全；与 Web 共享前端构建产物
- **后果**：需要 Rust 基础（少量）；少数平台兼容性需回归

---

## ADR-0007 微信小程序框架

- **状态**：✅ 决议
- **决策**：**Taro 3**
- **理由**：与 React 风格一致，复用代码；支持编译为多端
- **后果**：依赖 Taro 生态，部分高级 API 需使用其封装

---

## ADR-0008 包管理与 Monorepo 工具

- **状态**：✅ 决议
- **决策**：**pnpm workspaces + Turborepo**
- **理由**：pnpm 节省磁盘、严格依赖；Turborepo 增量构建与缓存
- **后果**：需要团队熟悉 pnpm 协议；CI 需配置 turbo 缓存

---

## ADR-0009 鉴权方案

- **状态**：✅ 决议
- **决策**：**JWT（Access + Refresh） + 第三方登录**（微信、Apple、Google）
- **理由**：无状态、易扩展；第三方登录降低注册门槛
- **后果**：需实现 Refresh Token 轮换与吊销；登录状态需跨端同步

---

## ADR-0010 部署形态

- **状态**：✅ 决议
- **决策**：**容器化（Docker）+ 公有云（阿里云 / 腾讯云）**
- **理由**：MVP 阶段无需自建 K8s；托管容器可快速弹性伸缩
- **后续**：业务增长后迁移至 K8s / 多云
- **后果**：需要 CI/CD 流水线（GitHub Actions）；日志 / 监控走托管服务

---

## 技术栈总览

| 层 | 选型 |
| --- | --- |
| 客户端 Web | React 18 + Vite + TS + Tailwind + Zustand |
| 客户端 Mobile | React Native + Expo |
| 客户端 Mini | Taro 3 |
| 客户端 Desktop | Tauri |
| 后端 API | Node.js + NestJS |
| 后端 AI | Python + FastAPI |
| 主数据库 | PostgreSQL + pgvector |
| 缓存 / 队列 | Redis + Redis Streams |
| 算法 | FSRS（TS + Python 双实现） |
| LLM | DeepSeek（主力）+ 智谱 GLM |
| 鉴权 | JWT + 第三方登录 |
| 部署 | Docker + 阿里云 / 腾讯云 |
| Monorepo | pnpm workspaces + Turborepo |
| CI/CD | GitHub Actions |
| 观察性 | OpenTelemetry + Prometheus + Grafana |

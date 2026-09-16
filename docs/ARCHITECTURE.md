# Vocabulary Agent 架构设计（草案）

> 与 PRD 保持一致；技术选型最终以 ADR（docs/ADR.md）记录。

## 1. 设计原则
1. **AI 在环**：以 LLM 作为学习私教，但所有 AI 输出可追溯、可回放、可人工审核
2. **算法可替换**：FSRS 抽象为独立服务，后续可切换 SM-2 或自研
3. **跨端一致**：UI 组件、数据模型、关键交互在 Web / Mobile / 小程序 / 桌面上一致
4. **离线优先**：复习队列、错词本、近期进度本地缓存，离线可继续学习
5. **隐私默认安全**：学习内容脱敏、对话可清除、细粒度授权

## 2. 逻辑架构

```
┌──────────────────────────────────────────────────────────┐
│                    客户端（apps/*）                       │
│  Web PWA · Mobile (RN/Flutter) · Mini · Desktop          │
│  能力：UI、本地缓存、复习队列、语音输入/输出              │
└──────────────┬─────────────────────────────┬─────────────┘
               │ HTTPS / WebSocket            │
       ┌───────▼─────────┐           ┌────────▼────────┐
       │   API 网关       │           │  实时通道        │
       │  (REST + gRPC)   │           │  (WebSocket)     │
       └───────┬──────────┘           └────────┬─────────┘
               │                               │
   ┌───────────┼─────────────┬─────────────────┼──────────┐
   │           │             │                 │          │
┌──▼──┐   ┌───▼────┐   ┌────▼─────┐   ┌───────▼──────┐ ┌──▼───┐
│用户 │   │ 学习   │   │ AI 网关   │   │  社交 / 督学  │ │ 词典 │
│/词书│   │ 服务   │   │ (LLM/RAG) │   │   服务        │ │ 服务 │
│服务 │   │(FSRS)  │   └────┬──────┘   └───────────────┘ └──────┘
└──┬──┘   └───┬────┘        │
   │          │             │
   └────┬─────┘             │
        ▼                   ▼
  ┌──────────┐       ┌──────────────┐
  │ Postgres │       │ 向量库 + 词库 │
  │ Redis    │       │ （Milvus/ES） │
  └──────────┘       └──────────────┘
```

## 3. 模块职责

### 3.1 客户端（apps/*）
- **Web (PWA)**：首发端，使用 React + Vite + TS + Tailwind + Zustand/Redux
- **Mobile**：iOS / Android，跨端方案待选（见 ADR 候选）
- **Mini**：微信小程序，原生或 Taro
- **Desktop**：可选 Electron / Tauri

### 3.2 后端服务（services/*）
- **api-gateway**：路由、鉴权、限流、聚合
- **learn-service**：复习队列、FSRS 调度、错题归因、学习报告
- **ai-gateway**：统一 LLM 接入、Prompt 模板、RAG 检索、语音 ASR/TTS
- **user-service**：账号、词书、单词本、进度
- **social-service**：群组、PK、督学、排行榜

### 3.3 共享包（packages/*）
- **sdk-fsrs**：FSRS 算法 TS / Python 实现，可独立发版
- **sdk-llm**：LLM 调用封装（多家模型可切换）
- **ui-kit**：跨端 UI 组件（按钮 / 卡片 / 进度条 / 雷达图）
- **types**：领域模型与 DTO（用户、词条、复习记录、AI 会话）
- **config**：ESLint / Prettier / TS / Tailwind 等通用配置

## 4. 关键数据模型（草案）

```ts
// 词条
Word {
  id: string
  headword: string            // 单词原型
  pos: string[]               // 词性
  ipa: string                 // IPA
  audioUrl: string
  senses: Sense[]             // 多义项
  etymology: string           // 词根词缀
  collocations: string[]      // 搭配
  examTags: ExamTag[]         // 考点 / 考频
  examples: Example[]         // 真题例句
}

UserWordProgress {
  userId: string
  wordId: string
  status: 'new' | 'learning' | 'review' | 'mastered'
  fsrs: FSRSCardState         // FSRS 内部状态
  lastReviewedAt: timestamp
  nextDueAt: timestamp
  wrongCount: number
}

ReviewSession {
  id: string
  userId: string
  mode: 'recall' | 'spell' | 'cloze' | 'ai_dialog'
  items: ReviewItem[]
  startedAt: timestamp
  endedAt: timestamp
}
```

## 5. AI 能力流水线

```
用户输入 → 意图识别 → RAG 检索（词条 / 真题 / 历史）
        → Prompt 拼接 → LLM 调用 → 结果审核（敏感词 / 准确性）
        → 结构化输出 → 客户端展示 + 记录
```

- **拆词 / 释义**：单次 LLM 调用 + 词条缓存
- **造句 / 复述**：RAG（用户近期学习词） + LLM
- **口语陪练**：语音 ASR → LLM → 语音 TTS + 发音评分
- **错因归因**：规则引擎 + LLM 总结

## 6. 部署与扩展
- 容器化（Docker）+ 公有云托管（阿里云 / 腾讯云）
- 服务间通信：REST + gRPC + Redis Streams
- 观察性：OpenTelemetry + Prometheus + Grafana
- CI/CD：GitHub Actions + Turborepo 远程缓存

## 7. 已落地的技术选型（详见 ADR.md）
- 客户端：React (Web) + React Native (Mobile) + Taro 3 (Mini) + Tauri (Desktop)
- 后端：Node.js + NestJS（API）+ Python + FastAPI（AI）
- 数据：PostgreSQL + pgvector + Redis
- AI：DeepSeek（主力）+ 智谱 GLM（备选）
- Monorepo：pnpm workspaces + Turborepo
- 鉴权：JWT + 第三方登录
- 部署：Docker + 公有云容器

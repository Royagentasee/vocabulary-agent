# @vocab-agent/web

Web 主端（PWA），React + Vite + TypeScript + Tailwind + Zustand。

## 启动
```bash
# 在 monorepo 根目录
pnpm install
pnpm --filter @vocab-agent/web dev
# → http://localhost:5173
```

## 已实现的 MVP 流程

1. **首页** → 看今日新词 / 复习 / 错词数量
2. **选词书** → 三本 mock 词书（高频 5000 / GRE 核心 / 雅思 7+）
3. **复习** → 看英忆中 → 显示释义 → AI 解释（调 `/api/ai/explain`）→ FSRS 4 档评分
4. **统计** → 进度条 / 错词本

## 目录
```
src/
├── app/            # 路由、根组件
│   └── App.tsx
├── pages/          # 页面
│   ├── HomePage.tsx
│   ├── WordbooksPage.tsx
│   ├── ReviewPage.tsx
│   └── StatsPage.tsx
├── features/       # 功能模块
│   └── ai/
│       └── AIExplainPanel.tsx
├── stores/         # Zustand 状态
│   └── learnStore.ts
├── services/       # API 调用
│   ├── ai.ts
│   └── words.ts
└── styles/
    └── index.css
```

## 数据流
```
Sources: MOCK_WORDS (前端内置)
         ↓
ReviewPage → useLearnStore → scheduler.review(card, rating)
         ↓
AI 解释 → fetch('/api/ai/explain') → ai-gateway
```

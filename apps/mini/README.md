# @vocab-agent/mini

微信小程序端，基于 **Taro 3 + React + TypeScript**。

## 编译

```bash
# 在 monorepo 根目录
pnpm install
pnpm --filter @vocab-agent/mini build
# 产物在 apps/mini/dist/
```

## 在微信开发者工具中预览

1. 打开 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入项目 → 项目目录选 `apps/mini/dist/`
3. AppID 选"测试号"（或填自己的 AppID）

## 上架流程

详见 [`docs/MINI-PUBLISH.md`](../../docs/MINI-PUBLISH.md)

## 目录

```
src/
├── app.tsx / app.css / app.config.ts   # 应用入口 + 分包配置
├── pages/                              # 主包页面（核心流程）
│   ├── index/                          # 首页
│   ├── wordbooks/                      # 选词书
│   ├── review/                         # 复习（看英忆中 + AI 解释 + FSRS 评分）
│   ├── practice/                       # 专项练习（拼写/例句填空）
│   ├── stats/                          # 学习报告
│   ├── me/                             # 我的
│   └── legal/                          # 用户协议 / 隐私政策
├── components/                         # 通用组件（Card / Button 等）
├── styles/                             # 设计系统（tokens）
├── i18n/                               # 多语言（中英双语）
├── services/                           # API + Mock 数据
├── stores/                             # Zustand 状态
├── package-ai/                         # 分包 - AI 功能
│   └── pages/
│       ├── analysis/index.tsx          # 错因分析
│       └── dialogue/index.tsx          # 口语陪练
├── package-dict/                       # 分包 - 大词库（待启用）
└── scripts/                            # 自定义构建脚本
```

## 分包加载

主包只保留核心流程，AI 功能和大词库走分包：

| 包名 | 路径 | 大小 | 何时加载 |
|---|---|---|---|
| 主包 | `dist/` | ~250KB | 启动即加载 |
| package-ai | `dist/package-ai/` | ~180KB | 预加载（首页时）|
| package-dict | `dist/package-dict/` | ~600KB | 用户选词书时 |

## 后续步骤

1. ✅ 占位骨架 → ✅ 4 个核心页面
2. ⏳ 接入真实 AI 网关（修改 `services/ai.ts` 的 `API_BASE`）
3. ⏳ 接入 ECDICT 词库（替换 MOCK_WORDS）
4. ⏳ 加入错题归因 / 口语陪练
5. ⏳ 申请 AppID + 上架
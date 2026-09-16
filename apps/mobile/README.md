# @vocab-agent/mobile

iOS / Android 跨端，基于 **React Native + Expo**。

## 开发

```bash
# 在 monorepo 根目录
pnpm install
pnpm --filter @vocab-agent/mobile start
# → Expo Dev Tools 启动

# Android（需要 Android Studio / 真机）
pnpm --filter @vocab-agent/mobile android

# iOS（需要 macOS + Xcode）
pnpm --filter @vocab-agent/mobile ios
```

## 打包

```bash
# Web 版（无需手机）
pnpm --filter @vocab-agent/mobile build web

# Android（需要 Expo 账号）
pnpm --filter @vocab-agent/mobile build android

# iOS（需要 Apple Developer 账号 + macOS）
pnpm --filter @vocab-agent/mobile build ios
```

首次打包需 `eas login`。

## 上架流程

- **Google Play**：见 `docs/GOOGLE-PLAY-PUBLISH.md`
- **App Store**：见 `docs/APP-STORE-PUBLISH.md`（待写）

## 目录

```
App.tsx                    # 入口 + Navigation
app.json                   # Expo 配置
src/
├── screens/               # 6 个屏幕
│   ├── HomeScreen.tsx
│   ├── WordbooksScreen.tsx
│   ├── ReviewScreen.tsx
│   ├── PracticeScreen.tsx
│   ├── StatsScreen.tsx
│   └── MeScreen.tsx
├── services/              # API + Mock 数据
├── stores/                # FSRS 状态（AsyncStorage）
└── scripts/               # 构建脚本
```

## 与小程序 / Web 的差异

| 功能 | Web | Mini (Taro) | Mobile (RN) |
|---|---|---|---|
| 框架 | React + Vite | Taro 3 | React Native |
| 路由 | React Router | Taro navigateTo | React Navigation |
| 持久化 | Zustand persist | Taro.Storage | AsyncStorage |
| AI 解释 | ✅ | ✅ | ✅ |
| 多模式 | ✅ | ✅ | ✅ |
| ECDICT | 可选 bundle | 可选 bundle | 可选 bundle |

代码高度共用：
- `@vocab-agent/types` 共享领域模型
- `@vocab-agent/sdk-fsrs` 共享 FSRS 算法
- `services/words.ts` 数据可复制复用
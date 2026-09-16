# @vocab-agent/desktop

桌面端，基于 **Tauri 2 + React + Vite**。

## 前置要求

1. **Rust 工具链**：https://rustup.rs/
2. **Node.js 20+ + pnpm 9+**
3. **macOS**：Xcode Command Line Tools (`xcode-select --install`)
4. **Windows**：WebView2（Win11 自带，Win10 需手动装）
5. **Linux**：`libwebkit2gtk-4.0-dev`、`build-essential`、`libssl-dev`

## 开发

```bash
# 在 monorepo 根目录
pnpm install

# 启动 Tauri 开发模式（会自动启动 Vite + Rust 编译）
pnpm --filter @vocab-agent/desktop dev
```

第一次会编译 Rust 依赖（5-10 分钟），后续会快。

## 打包

```bash
pnpm --filter @vocab-agent/desktop build
# 产物：
#   macOS: src-tauri/target/release/bundle/dmg/*.dmg
#   Windows: src-tauri/target/release/bundle/msi/*.msi
#   Linux: src-tauri/target/release/bundle/deb/*.deb 或 AppImage
```

## 跨端复用

| 代码来源 | 用途 |
|---|---|
| `@vocab-agent/types` | 共享领域模型 |
| `@vocab-agent/sdk-fsrs` | FSRS 算法 |
| `services/words.ts` | Mock 词库 |

## 与 Tauri 后端通信

Rust 端（src-tauri/src/main.rs）注册了：
- `get_settings()` - 获取本地设置
- `set_settings()` - 写入本地设置

前端通过 `@tauri-apps/api/tauri` 的 `invoke()` 调用。

## 目录

```
apps/desktop/
├── package.json
├── vite.config.ts
├── tauri.conf.json
├── tsconfig.json
├── index.html
├── scripts/                  # 构建脚本（绕过 sandbox 限制）
│   ├── resolve.mjs
│   ├── dev.mjs
│   └── build.mjs
├── src/                      # React 前端
│   ├── app/App.tsx
│   ├── pages/
│   ├── stores/
│   └── services/
└── src-tauri/                # Rust 后端
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/main.rs
```

## 已知限制

- Mock 词库（8 词），需要接真实数据源
- 未集成 AI 网关（设置里可填 API 地址）
- 没做自动更新（后续用 tauri-plugin-updater）
# 小程序提审工具集

## 工具

| 脚本 | 用途 |
|---|---|
| `capture-screenshots.mjs` | 自动化截取 5 张关键页面 |
| `audit-checklist.mjs` | 提审清单自动检查 |
| `build-package.mjs` | 一键打包提审包 |

## 用法

### 1. 安装 Playwright
```bash
pnpm install
npx playwright install chromium
```

### 2. 启动小程序 H5 dev server

Taro 支持 H5 build：
```bash
pnpm --filter @vocab-agent/mini build --type h5
```

然后在 `tools/submission/` 目录：
```bash
# 启动一个静态服务器（如 npx serve）
npx serve ../apps/mini/dist -p 5176 &
H5_URL=http://localhost:5176 node capture-screenshots.mjs
```

截图保存到 `screenshots/` 目录。

### 3. 审核清单
```bash
node audit-checklist.mjs
```

会检查：
- 项目文件完整性
- AppID 是否填写
- 截图数量
- 协议文档
- 内容合规
- 编译产物
- 分包配置

### 4. 一键打包
```bash
node build-package.mjs
```

产物在 `dist-submission/`：
```
dist-submission/
├── dist/              # 微信开发者工具可识别的代码
├── docs/              # 协议文档（上传审核备用）
└── screenshots/       # 5 张截图
```

## 上传步骤

1. 打开微信开发者工具
2. 导入 `dist-submission/dist/` 目录
3. 确认 AppID 已配置
4. 点击"上传" → 填写版本号 + 项目备注
5. 提交审核 → 等通过 → 发布

详见 `docs/MINI-PUBLISH.md`。
# App Store 上架完整指南

> Vocabulary Agent iOS 版从 Apple Developer 注册到 TestFlight 内测全流程。

## 0. 时间表

| 阶段 | 内容 | 时长 | 费用 |
|---|---|---|---|
| Day 1-2 | 注册 Apple Developer | 1-2 天 | $99/年 |
| Day 3-5 | EAS iOS build 配置 | 2-3 天 | 0 |
| Day 6-7 | TestFlight 内测 | 1-2 天 | 0 |
| Day 8-14 | App Store 提交审核 | 1-7 天 | 0 |

**前置要求**：
- macOS（必需，用于生成证书 / Xcode 操作）
- iPhone 或 iPad（真机测试）

---

## 2. 注册 Apple Developer

1. 访问 https://developer.apple.com/
2. 用 Apple ID 登录
3. 点击"Enroll" → 选择"Individual / Sole Proprietor" 或 "Organization"
4. 填写资料：
- 姓名
- 电话
- 邮箱
- 邮寄地址
5. **支付 $99**（信用卡 / Apple Pay / 支付宝）
6. 等待审核（个人通常即时通过；企业需提交 D-U-N-S 编号 + 营业执照，1-2 周）

---

## 3. 创建 App ID

1. 登录 https://developer.apple.com/account
2. Certificates, Identifiers & Profiles → Identifiers
3. 点 "+" → App IDs → App
4. 填写：
- **Description**：Vocabulary Agent
- **Bundle ID**：com.vocabagent.app（显式，反向域名）
5. 勾选 **Capabilities**：
- Push Notifications（可选）
- In-App Purchase（如需订阅）
6. Register

---

## 4. 创建证书

### 方式 A：用 Xcode 自动管理（推荐）

1. 打开 Xcode → Preferences → Accounts
2. 添加 Apple ID → 选择 Team
3. Xcode 会自动：
- 创建 CertificateSigningRequest
- 下载 Apple Development / Distribution 证书
- 自动管理 Provisioning Profile

### 方式 B：手动管理

1. Certificates → "+" → Apple Development / Apple Distribution
3. 上传 CSR（用 Keychain Access 生成）
4. 下载证书（.cer）
5. Profiles → "+" → iOS App Development
6. 选择 App ID + Certificate + Devices → Generate
7. 下载 .mobileprovision 文件

---

## 5. Expo（EAS）iOS 配置

### 5.1 安装 EAS CLI

```bash
npm install -g eas-cli
```

### 5.2 登录 Expo

```bash
cd apps/mobile
eas login
```

### 5.3 配置 EAS

`apps/mobile/eas.json`：

```json
{
  "cli": {
    "version": ">= 5.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 5.4 配置 Bundle ID

`apps/mobile/app.json`：
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.vocabagent.app",
      "buildNumber": "1"
    }
  }
}
```

### 5.5 配置 Apple 凭据（推荐）

```bash
# 一次性：上传 Distribution 证书
eas credentials:configure --platform ios
```

按提示选择：
1. Generate a new Apple Distribution Certificate
2. Generate a new Apple Push Notifications service key (可选)
3. EAS 会 把证书存到 Expo 服务器

---

## 6. 构建 + 提交

### 6.1 本地构建（开发）

```bash
cd apps/mobile
eas build --profile development --platform ios
```

完成后会得到一个 .ipa 文件，在 TestFlight 中分发。

### 6.2 生产构建（用于上架）

```bash
eas build --profile production --platform ios
```

### 6.3 自动提交到 App Store Connect

```bash
eas submit --platform ios
```

Expo 会自动：
1. 上传 .ipa 到 App Store Connect
2. 关联到 App
3. 等待你审核

---

## 7. TestFlight 内测

### 7.1 创建内测群组

1. App Store Connect → My Apps → Vocabulary Agent → TestFlight
2. 创建 Internal Testing group
3. 添加测试者邮箱（最多 100 个）

### 7.2 提交构建到 TestFlight

1. App Store Connect → TestFlight → Builds
2. 选择 Expo 上传的 build
3. 填写"测试信息"（测试重点 / 联系方式）
4. 提交审核（Apple 通常 24h 内通过）

### 7.3 邀请测试者

1. 测试者会收到邮件邀请
2. 安装 TestFlight App
3. 接受邀请 → 安装 Vocabulary Agent

---

## 8. App Store 提交

### 8.1 在 App Store Connect 创建版本

1. App Store Connect → My Apps → Vocabulary Agent
2. App Store → Versions → "+" → 创建新版本（1.0.0）
3. 选择刚才的 build

### 8.2 填写版本信息

| 字段 | 内容 |
|---|---|
| Screenshots | 6.7", 6.1", 5.5", 12.9"（必备） |
| Promotional Text | 限 170 字 |
| Description | 限 4000 字 |
| Keywords | 限 100 字，逗号分隔 |
| Support URL | https://vocabulary-agent.com |
| Marketing URL | （可选） |
| What's New | 限 4000 字 |

### 8.3 隐私 / 内容

- **Privacy Policy URL**：必须
- **Content Rights**：是否包含第三方内容
- **Age Rating**：填写问卷（教育类通常 4+）
- **Export Compliance**：是否使用加密（通常选"使用豁免加密"）

### 8.4 提交审核

1. 点击"Submit for Review"
2. 填写：
- 审核员联系方式
- 测试账号（如有登录）
- 审核备注
3. 等待 24h-7 天

---

## 9. 审核被拒常见原因

| 原因 | 修复 |
|---|---|
| 缺少隐私政策 | 补充 https://vocabulary-agent.com/privacy |
| 截图与实际不符 | 用真机最新截图 |
| 崩溃 / Bug | 用 TestFlight 充分测试 |
| 元数据不当 | 修改标题 / 描述，避免绝对化用语 |
| 误导用户 | 功能描述与实际一致 |
| 订阅未配置 | 配置 App Store 内购商品 |

---

## 10. 上架后维护

### 10.1 更新版本

```bash
# 修改代码 + app.json 中 buildNumber
eas build --profile production --platform ios --auto-increment
eas submit --platform ios
```

### 10.2 紧急修复

1. App Store Connect → 版本 → 选择 build
2. 提交紧急审核（Expedited Review）
3. 通常 24h 内回复

### 10.3 用户评论

- App Store Connect → Ratings and Reviews
- 回复用户评论（提升用户满意度）

---

## 11. 重要时间点

| 日期 | 事件 |
|---|---|
| 申请 Developer | 立即 |
| App ID 创建 | Developer 通过后 |
| TestFlight 内测 | V0.5 完成 |
| 正式上架 | V1.0 完成 + 真机测试充分 |

---

## 12. 注意事项

1. **真实设备测试**：模拟器无法测试全部功能（语音 / 后台 / 推送）
2. **国际化**：如果上多语种市场，需要准备多语言元数据
3. **隐私问题**：接入 AI / 语音前确认符合 GDPR / CCPA
4. **沙盒账号**：Apple 提供测试用 Apple ID 用于内购测试
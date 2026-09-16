# 今天就能申请 AppID（30 分钟版）

> 目标：拿到微信小程序 AppID（`wx...` 开头）+ Apple Developer 账号

## 一、微信小程序 AppID（20 分钟）

### 你需要准备
- ✅ 身份证（个人主体最省事）
- ✅ 一个**没注册过微信任何产品**的邮箱
- ✅ 手机（接收验证码 + 人脸验证）

### 操作步骤（跟着做）

**第 1 步**：浏览器打开 https://mp.weixin.qq.com/

**第 2 步**：点右上角「立即注册」→ 选「**小程序**」

**第 3 步**：填邮箱 → 设密码 → 邮箱收激活邮件 → 点激活链接

**第 4 步**：主体类型选「**个人**」（最快，零成本，无需营业执照）

**第 5 步**：身份证 + 微信扫码人脸验证（5 分钟）

**第 6 步**：填小程序名称「**Vocabulary Agent**」

**第 7 步**：登录 mp.weixin.qq.com → 「开发」→「开发设置」→ 复制 **AppID**

### 拿到 AppID 后
把 AppID 填到 `apps/mini/project.config.json`：
```json
{ "appid": "wx你的AppID" }
```

---

## 二、Apple Developer（$99/年，10 分钟 + 等待）

### 你需要准备
- ✅ 信用卡（Visa/Mastercard/银联）
- ✅ Apple ID

### 操作步骤

**第 1 步**：浏览器打开 https://developer.apple.com/programs/enroll/

**第 2 步**：用 Apple ID 登录

**第 3 步**：点「Start Your Enrollment」→ 选「**Individual**」（个人）

**第 4 步**：填姓名、电话、邮箱、地址

**第 5 步**：支付 **$99**（约 ¥700）

**第 6 步**：等审核通过（个人通常即时，少数需 1-2 天）

### 拿到后
1. 登录 https://developer.apple.com/account
2. 创建 App ID（Bundle ID: `com.vocabagent.app`）
3. 后续用于 iOS TestFlight

---

## 三、两个都拿到后

| 平台 | 状态 | 下一步 |
|---|---|---|
| 微信小程序 | 有 AppID | 编译 + 微信开发者工具上传 |
| Apple | 有开发者账号 | EAS iOS build + TestFlight |

---

## ⏱️ 时间线

```
今天：       微信 AppID（20 分钟）✅
             Apple Developer 注册（10 分钟）✅

明天-后天：  Apple 审核通过
             填 AppID 到项目
             编译小程序

第 3 天：    微信开发者工具上传
             小程序提交审核

第 5-7 天：  小程序审核通过 → 发布 🎉
             iOS TestFlight 内测
```

---

## ❓ 常见问题

**Q: 个人主体能做教育类小程序吗？**
A: 可以，但避免「教育培训」（需资质），选「教育 → 在线教育」或「工具 → 效率」。

**Q: Apple Developer 一定要 Mac 吗？**
A: 注册账号不需要，但**打包 iOS 需要 macOS**（或用 EAS 云构建，但需付费）。先注册，打包后面解决。

**Q: 能跳过 Apple 先上微信吗？**
A: 完全可以。微信小程序是**最快**的验证渠道。
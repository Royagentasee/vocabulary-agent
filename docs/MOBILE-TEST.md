# 手机局域网访问指南

## 1. 找电脑 IP

电脑 PowerShell：
```powershell
ipconfig | Select-String "IPv4"
# 类似输出：
#   IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

记下这个 IP，比如 `192.168.1.100`。

## 2. 启动 Vite（绑定 0.0.0.0）

已经配置好了 `host: '0.0.0.0'`。直接：

```powershell
cd C:\AppSoft\vocabularyagent
pnpm --filter @vocab-agent/web dev
```

**预期最后一行**：
```
  ➜  Network: http://192.168.1.100:5173/
```

## 3. 手机访问

手机 Safari 打开：**`http://192.168.1.100:5173`**

（同 WiFi 网络下）

## 4. AI 网关跨域问题

⚠️ **手机直接访问时，Vite proxy 不工作**（proxy 在电脑里）。

需要让前端代码直接连 AI 网关：

**方式 A：环境变量**
```powershell
$env:VITE_AI_GATEWAY = "http://192.168.1.100:8000"
pnpm --filter @vocab-agent/web dev
```

**方式 B：构建时指定**

修改 `apps/web/.env.production`：
```
VITE_AI_GATEWAY=http://192.168.1.100:8000
```

## 5. 防火墙

如果连不上，**Windows 防火墙**可能拦截：
```powershell
# 临时关闭（开发用）
Set-NetFirewallProfile -Profile Private -Enabled False

# 或添加规则
New-NetFirewallRule -DisplayName "Vocab Agent Web" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Vocab Agent AI" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

## 6. 测试清单

- [ ] 电脑 IP 已确认
- [ ] Web 端显示 "Network: http://x.x.x.x:5173/"
- [ ] 手机能打开 Web（即使 AI 失败）
- [ ] 手机能调 AI（设了 VITE_AI_GATEWAY）
- [ ] AI 解释能返回（需要 DEEPSEEK_API_KEY）

## 7. 调试技巧

**手机 Safari 调试**：
1. 设置 → Safari → 高级 → Web 检查器 → 开启
2. Mac 用 Safari 打开 develop → [你的手机] → localhost
3. 可以看到 console / network
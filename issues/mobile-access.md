# Issue: 手机局域网访问 Vocabulary Agent

**状态**：🔄 In Progress（修复方案已就位）
**创建时间**：2026-08-23
**优先级**：P2（开发体验，非阻塞）

## 修复方案（v0.2.0）

| 改动 | 文件 | 说明 |
|---|---|---|
| ✅ Vite `host: '0.0.0.0'` | `apps/web/vite.config.ts` | Vite 监听所有网络接口 |
| ✅ AI 网关绑定 0.0.0.0 | `start-ai-gateway-public.ps1` | 启动脚本 `--host 0.0.0.0` |
| ✅ 前端智能 fallback | `apps/web/src/config.ts` + `services/ai.ts` | proxy 失败自动直连 AI 网关 |
| ✅ 防火墙规则脚本 | `open-firewall.ps1` | 一键添加 5173/8000/3001 规则 |
| ✅ Vite proxy 修复 | `apps/web/vite.config.ts` | 添加 secure: false + 更多路径 |

## 用户操作步骤

```powershell
# 1. 以管理员权限打开 PowerShell
# 2. 添加防火墙规则
.\open-firewall.ps1

# 3. 重启 AI 网关（绑定 0.0.0.0）
.\start-ai-gateway-public.ps1

# 4. 重启 Web 端（带 AI 网关地址）
cd C:\AppSoft\vocabularyagent
$env:VITE_AI_GATEWAY = "http://192.168.227.25:8000"
pnpm --filter @vocab-agent/web dev

# 5. 手机 Safari 访问
# http://192.168.227.25:5173
```
3. ❌ 添加防火墙入站规则（5173/8000）— 待测试

## Vite proxy 实际状态

- ✅ 直接访问 `http://localhost:8000/api/ai/explain` → 200 OK
- ❌ 通过 Vite proxy `http://localhost:5173/api/ai/explain` → 500 Internal Server Error

**这意味着 Vite 启动时可能因 sandbox EPERM 错误导致内部状态不完整。**

## 临时解决方案

前端代码已支持 `VITE_AI_GATEWAY` 环境变量，绕过 Vite proxy：

```powershell
$env:VITE_AI_GATEWAY = "http://localhost:8000"  # 电脑浏览器
# 或
$env:VITE_AI_GATEWAY = "http://192.168.227.25:8000"  # 手机访问
pnpm --filter @vocab-agent/web dev
```

## 待解决

1. **Windows 防火墙规则** — 需要添加 5173 / 8000 入站规则
2. **Vite proxy 修复** — 排查 EPERM 错误对 Vite 内部状态的影响
3. **跨域配置** — 验证手机跨域请求 CORS 配置
4. **AI 网关绑定 0.0.0.0** — 当前默认 127.0.0.1，手机可能连不上

## 验收标准

- [ ] 手机 Safari 能打开 `http://192.168.227.25:5173`
- [ ] 手机能完成"选词书 → 复习 → AI 解释"全流程
- [ ] AI 解释在手机上能正常返回结果

## 优先级排序

1. **Windows 防火墙**（最可能）→ 加 5173/8000 入站规则
2. **AI 网关 0.0.0.0 绑定**（次要）→ 修改 uvicorn 启动参数
3. **Vite proxy 修复**（低）→ 用环境变量绕过即可
4. **跨域测试**（中）→ 实测后定

## 解决时间估算

- 防火墙 / 端口绑定：30 分钟
- Vite proxy 修复：1-2 小时
- 完整跨域测试：30 分钟

**总计约 2-3 小时**

## 相关文件

- `apps/web/vite.config.ts` — Vite 配置（含 host 0.0.0.0 + proxy）
- `apps/web/src/config.ts` — AI 网关地址配置
- `docs/MOBILE-TEST.md` — 完整测试指南
- `services/ai-gateway/app/main.py` — AI 网关入口

## 后续动作

1. 用户**继续测试电脑端**（验证 AI 解释功能）
2. 手机问题**单独安排时间**调试
3. 优先推进其他 P0 任务（申请 AppID、ECDICT 扩词库）
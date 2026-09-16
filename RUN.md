# 启动 Vocabulary Agent · 一键指南

## 🚀 方案 A：一键启动（推荐）

**右键 `start-all.ps1` → "使用 PowerShell 运行"**

脚本会：
1. 检查 Python 依赖
2. 后台启动 AI 网关（端口 8000）
3. 后台启动 Web 端（端口 5173）
4. 验证服务状态

启动后访问：
- Web 端：http://localhost:5173
- AI 网关：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 🪟 方案 B：分开窗口（推荐开发时）

**窗口 A：AI 网关**
```powershell
cd C:\AppSoft\vocabularyagent
.\start-ai-gateway.ps1
```

**窗口 B：Web 端**
```powershell
cd C:\AppSoft\vocabularyagent
.\start-web.ps1
```

**窗口 C：（可选）下载数据**
```powershell
cd C:\AppSoft\vocabularyagent
.\start-data.ps1
```

## 🛑 停止服务

```powershell
cd C:\AppSoft\vocabularyagent
.\stop-all.ps1
```

## 📋 服务地址

| 服务 | URL | 用途 |
|---|---|---|
| Web 端 | http://localhost:5173 | 用户端 UI |
| AI 网关 | http://localhost:8000 | REST API |
| API 文档 | http://localhost:8000/docs | Swagger UI |
| API 健康 | http://localhost:8000/health | 检查服务 |

## 🔧 验证服务

```powershell
# AI 网关
curl http://localhost:8000/health
# {"status":"ok","service":"ai-gateway"}

# 词条搜索
curl "http://localhost:8000/api/words/search?q=ephemeral"

# AI 解释（需要 DEEPSEEK_API_KEY）
curl -X POST http://localhost:8000/api/ai/explain `
  -H "Content-Type: application/json" `
  -d '{"headword":"ephemeral"}'
```

## 🪵 日志

| 服务 | 路径 |
|---|---|
| AI 网关 stdout | `C:\AppSoft\vocabularyagent\logs\ai-gateway.log` |
| AI 网关 stderr | `C:\AppSoft\vocabularyagent\logs\ai-gateway.err` |
| Web 端 stdout | `C:\AppSoft\vocabularyagent\logs\web.log` |
| Web 端 stderr | `C:\AppSoft\vocabularyagent\logs\web.err` |

## ⚠️ 常见问题

### 端口被占用
```powershell
# 看谁在用 8000 / 5173
Get-NetTCPConnection -State Listen -LocalPort 8000,5173
```

### DEEPSEEK_API_KEY 没填
- AI 解释接口会返回"未配置 API Key"提示
- 其他功能（FSRS复习、词条搜索）正常

### 数据库未扩展到 5000 词
- 当前 54 词（GRE核心词书）
- 跑 `.\start-data.ps1` 下载 ECDICT
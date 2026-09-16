# Vocabulary Agent 启动 — 在你的 PowerShell 里跑

之前的 setup.ps1 已经装好了所有依赖（apps/web/node_modules 完整）。
现在只需要启动两个服务。

## 在两个 PowerShell 窗口里执行

### 窗口 A：AI 网关

```powershell
cd C:\AppSoft\vocabularyagent\services\ai-gateway
python -m uvicorn app.main:app --reload --port 8000
```

启动后看到：
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```
窗口 A 就 OK 了。**保持打开**。

### 窗口 B：Web 端

```powershell
cd C:\AppSoft\vocabularyagent
pnpm --filter @vocab-agent/web dev
```

启动后看到：
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```
窗口 B 也 OK 了。**保持打开**。

## 打开浏览器

访问 http://localhost:5173

你应该看到首页（"你好，今天学一会儿 👋"）。
点击"选词书开始" → 选"GRE 核心词汇" → 进入复习页 → 点"显示释义" → 点"✨ 让 AI 解释"。

## 如果出错

| 报错 | 修复 |
|---|---|
| `'python' is not recognized` | 用 `py -m uvicorn ...` 替代 |
| `python: No module named uvicorn` | `python -m pip install -r C:\AppSoft\vocabularyagent\services\ai-gateway\requirements.txt` |
| `ModuleNotFoundError: No module named 'vocab_agent_llm'` | `python -m pip install -e C:\AppSoft\vocabularyagent\packages\sdk-llm-py` |
| `'pnpm' is not recognized` | `npm install -g pnpm` |
| `Port 5173 is in use` | 关掉占用的进程，或换端口（修改 vite.config.ts 的 server.port） |
| `Failed to fetch /api/ai/explain` | AI 网关没起来，回到窗口 A 检查 |
| Web 页面白屏 | 打开浏览器 DevTools → Console 看错误 |

## 不需要 DEEPSEEK_API_KEY

如果你没填 DEEPSEEK_API_KEY：
- AI 解释会报错（其他功能不影响）
- 其他全功能：选词书、FSRS 复习、进度统计都正常
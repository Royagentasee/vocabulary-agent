# Day 1: 完整跑通 Vocabulary Agent

> **所有命令必须你在 PowerShell 里跑**（sandbox 不让模型启动子进程）。
> 全程预计 **5-10 分钟**。

---

## 🎯 已完成（不需要你执行）

我在跑测试时发现并修复了 3 个 bug：

1. ✅ **AI 网关 `redis` 包缺失崩溃** → `app/core/redis_client.py` + `cache.py` 已加入降级逻辑
2. ✅ **词条 schema 校验失败（id 类型不匹配）** → `app/schemas/word.py` 允许 `int | str`
3. ✅ **mock ECDICT 文件**：`tools/seed-data/data/top100_ecdict_mock.csv`（104 词，无网也可用）

并**直接验证通过**：
- 数据库 54 词 + 1 词书 + 49 关联
- 词条搜索 `ephemeral` 返回 1 条
- AI 解释服务在无 Key 时优雅降级
- 创建了 `e2e_full.py`（不依赖 HTTP，可随时跑）

---

## 📋 你要做的事（5 步）

### 1. 验证当前状态（1 分钟）

```powershell
cd C:\AppSoft\vocabularyagent
python e2e_full.py
```

**预期**：
```
通过: 6
失败: 0
跳过: 2（需手动配置或启动）

✓ 核心数据 + 服务全部正常
```

### 2. （可选）下载真实 ECDICT（2-5 分钟）

如果你想要 **5000+ 词**，跑这个：

```powershell
python tools\seed-data\download-simple.py
```

下载失败的话手动下载：
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv" -OutFile "tools\seed-data\data\ecdict.csv"
```

### 3. （可选）导入完整 ECDICT（1-3 分钟）

```powershell
python tools\seed-data\import-only.py
```

**预期输出**：
```
导入 ECDICT (frq >= 30.0) ...
  进度: 1000 词已导入
  ...
✓ ECDICT 导入完成: 5000+ 词
```

完成后重新跑 `python e2e_full.py`，词条数应该变成 5000+。

### 4. 启动 AI 网关（开窗口 A）

```powershell
cd C:\AppSoft\vocabularyagent\services\ai-gateway
python -m uvicorn app.main:app --reload --port 8000
```

**预期**：
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 5. 启动 Web 端（开窗口 B）

```powershell
cd C:\AppSoft\vocabularyagent
pnpm --filter @vocab-agent/web dev
```

**预期**：
```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

## ✅ 完整验证

### 浏览器测试
打开 http://localhost:5173
- 首页能看到统计卡片
- 「选词书」→ 选 GRE → 进复习页
- 点「显示释义」
- 点「✨ 让 AI 解释」（无 Key 会失败，其他正常）

### 命令行测试
新开 PowerShell 窗口：
```powershell
# 词条搜索接口
curl http://localhost:8000/api/words/search?q=ephemeral

# AI 网关健康
curl http://localhost:8000/health

# 完整端到端检查
cd C:\AppSoft\vocabularyagent
python tools\e2e-check.py
```

**预期 e2e-check.py 输出**：
```
通过: 4/6 或 5/6
（AI 解释可能因没 Key 失败，但其他应该全过）
```

---

## 🎁 已验证可用

| 检查项 | 状态 |
|---|---|
| 数据库 54 词 + 1 词书 + 49 关联 | ✅ PASS |
| 词条搜索 `ephemeral` | ✅ PASS（找到）|
| AI 解释降级（无 Key） | ✅ PASS（友好提示）|
| AI 网关健康检查 | ⏸️ 需启动 |
| Web 编译产物 | ⏸️ 需 build |

---

## ❓ 出错了？

1. **命令找不到**：用 `Test-Path <文件>` 检查文件是否存在
2. **模块未找到**：在 `services\ai-gateway` 目录跑 `python -m pip install -r requirements.txt`
3. **端口被占用**：Web 是 5173 / AI 网关是 8000，关掉占用的进程
4. **DB 没数据**：跑 `python tools\seed-data\seed.py`

**任何问题把报错贴给我，我直接修。** ✅
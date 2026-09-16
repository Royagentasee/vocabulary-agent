# 性能优化指南

## 1. 已实施的优化

### 1.1 AI 响应缓存
- **位置**：`app/core/cache.py` + 各 service
- **策略**：Redis 缓存 LLM 响应
  - `explain`：24 小时 TTL（单词释义稳定）
  - `dialogue`：暂未缓存（每次对话不同）
  - `voice`：实时不缓存
- **预期效果**：相同单词二次访问延迟从 2-3s → 50ms

### 1.2 限流
- **位置**：`app/middleware/rate_limit.py`
- **策略**：基于 IP + 用户 ID 的滑动窗口限流
  - `/api/ai/explain`：100 次/小时
  - `/api/ai/dialogue`：50 次/小时
  - `/api/ai/voice`：200 次/小时
- **响应头**：`X-RateLimit-Remaining` + `Retry-After`

### 1.3 数据库
- **Postgres** 主存储，索引：
  - `idx_words_headword`：单词查询
  - `idx_words_frq`：频率排序
  - `idx_uwp_user_due`：复习队列
- **pgvector**：词条相似度检索（cosine）

### 1.4 异步化
- FastAPI 异步路由
- LLM 调用通过 `loop.run_in_executor` 异步化（同步 OpenAI SDK）

## 2. 未来优化方向

### 2.1 数据库层
- [ ] **连接池**：SQLAlchemy / asyncpg pool
- [ ] **读副本**：查询走只读副本
- [ ] **分区表**：user_word_progress 按月分区

### 2.2 应用层
- [ ] **响应流式输出**（SSE）：AI 解释打字机效果
- [ ] **请求合并**：批量请求优化
- [ ] **WebSocket**：口语陪练实时对话

### 2.3 前端
- [ ] **IndexedDB** 缓存词条
- [ ] **Service Worker** 离线优先
- [ ] **图片懒加载**（词条配图）

### 2.4 LLM 层
- [ ] **模型选择**：简单任务用小模型（Haiku / Mini）
- [ ] **Prompt 压缩**：减少 token
- [ ] **Batch API**：批量请求

### 2.5 监控
- [ ] **APM**：OpenTelemetry → Jaeger
- [ ] **指标**：Prometheus
- [ ] **告警**：响应时间 > 5s、错误率 > 1%

## 3. 压测目标

| 接口 | P50 | P95 | P99 |
|---|---|---|---|
| GET /api/words/search | 50ms | 200ms | 500ms |
| POST /api/ai/explain（命中缓存）| 20ms | 50ms | 100ms |
| POST /api/ai/explain（未命中）| 2s | 4s | 8s |
| POST /api/ai/dialogue/turn | 3s | 6s | 12s |
| POST /api/ai/voice/asr | 1s | 2s | 5s |

## 4. 压测工具

```bash
# Apache Bench
ab -n 1000 -c 10 https://your-domain.com/api/words/search?q=test

# k6（推荐）
k6 run --vus 50 --duration 30s load-test.js
```

## 5. 缓存预热脚本

```python
# scripts/warmup_cache.py
import asyncio
import httpx

async def warmup():
    async with httpx.AsyncClient() as client:
        # 拉高频词列表
        words = await fetch_top_words(limit=1000)
        for w in words:
            await client.post(f'/api/ai/explain', json={'headword': w})

asyncio.run(warmup())
```
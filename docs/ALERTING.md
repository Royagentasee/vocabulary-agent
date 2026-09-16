# 数据看板告警配置

## 0. 概览

| 类别 | 指标 | 阈值 | 通知渠道 |
|---|---|---|---|
| **基础设施** | API P95 响应时间 | > 5s | 短信 + 钉 |
| | 错误率 | > 1% | 短信 + 钉 |
| | CPU 使用率 | > 80% | 钉 |
| | 内存使用率 | > 85% | 钉 |
| | 磁盘使用率 | > 90% | 钉 + 邮件 |
| **业务** | 7 日留存 | < 25% | 邮件 |
| | AI 功能渗透率 | < 30% | 邮件 |
| | 付费转化率 | < 5% | 邮件 |
| **异常** | AI 服务异常 | 持续 5min | 短信 |
| | 数据库连接失败 | 任何 | 短信 |

---

## 1. 阿里云监控（基础设施）

### 1.1 配置云监控

1. 阿里云控制台 → 云监控 CMS
2. 接入 ECS 实例
3. 配置告警规则

### 1.2 关键告警

```yaml
# /etc/cron.d/vocab-agent-alerts
# ECS CPU 使用率
CPU > 80% for 5 minutes → 钉钉群
# ECS 内存使用率
Memory > 85% for 5 minutes → 钉钉群
# 磁盘使用率
Disk > 90% → 钉钉群 + 邮件
# 公网带宽
Bandwidth > 80% → 钉钉群
```

### 1.3 钉钉机器人 Webhook

```bash
# 创建钉钉群 → 群设置 → 智能群助手 → 添加机器人 → 自定义
# Webhook URL: https://oapi.dingtalk.com/robot/send?access_token=xxx
# 保存到 ECS 环境变量
export DINGTALK_WEBHOOK='https://oapi.dingtalk.com/robot/send?access_token=xxx'
```

### 1.4 告警发送脚本

```bash
#!/bin/bash
# /opt/vocab-agent/scripts/alert.sh

WEBHOOK="$DINGTALK_WEBHOOK"
MESSAGE="$1"

curl -X POST "$WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"[VocabAgent Alert] $MESSAGE\"}}"
```

---

## 2. 应用层监控（业务指标）

### 2.1 关键指标阈值

| 指标 | 阈值 | 触发动作 |
|---|---|---|
| AI 接口 5xx 错误率 | > 1% / 5 分钟 | 短信告警 |
| AI 接口 P95 响应 | > 8s / 5 分钟 | 钉钉告警 |
| 数据库慢查询 | > 1s / 100 次/分钟 | 邮件告警 |
| 用户注册量突降 | < 50% / 日 | 邮件告警 |
| 用户支付失败率 | > 10% | 短信告警 |

### 2.2 监控实现

通过 Prometheus + Grafana：

```yaml
# /opt/vocab-agent/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ai-gateway'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: /metrics
```

应用侧导出 Prometheus 指标：

```python
# services/ai-gateway/app/core/metrics.py
from prometheus_client import Counter, Histogram

ai_requests = Counter('ai_requests_total', 'AI requests', ['endpoint', 'status'])
ai_duration = Histogram('ai_request_duration_seconds', 'AI request duration', ['endpoint'])

def track_ai(endpoint: str):
    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = await fn(*args, **kwargs)
                ai_requests.labels(endpoint=endpoint, status='success').inc()
                return result
            except Exception:
                ai_requests.labels(endpoint=endpoint, status='error').inc()
                raise
            finally:
                ai_duration.labels(endpoint=endpoint).observe(time.time() - start)
        return wrapper
    return decorator
```

### 2.3 告警规则

```yaml
# prometheus-alerts.yml
groups:
  - name: vocab-agent
    rules:
      - alert: AIHighErrorRate
        expr: rate(ai_requests_total{status="error"}[5m]) / rate(ai_requests_total[5m]) > 0.01
        for: 5m
        annotations:
          summary: "AI 接口错误率超过 1%"

      - alert: AISlowResponse
        expr: histogram_quantile(0.95, ai_request_duration_seconds) > 8
        for: 5m
        annotations:
          summary: "AI 接口 P95 超过 8 秒"
```

---

## 3. 业务指标看板（admin 后台）

### 3.1 启用看板

```bash
# 1. 启动 admin
cd apps/admin && pnpm dev

# 2. 访问
open http://localhost:5174

# 3. 输入 admin 账号密码登录
```

### 3.2 关键看板

| 看板 | 用途 |
|---|---|
| **概览** | 注册 / 复习 / 营收总数 |
| **数据分析** | 完成率 / AI 渗透 / 留存 |
| **高级分析** | 漏斗 / 同期群 / 营收 |

### 3.3 核心 KPI

| 指标 | 计算 | 健康值 |
|---|---|---|
| 7 日留存 | 7 日后活跃 / 注册 | ≥ 25% |
| AI 渗透 | 用 AI 功能 / 活跃用户 | ≥ 30% |
| 复习完成率 | 完成复习 / 开始复习 | ≥ 70% |
| 月付费转化 | 付费用户 / 月活 | ≥ 5% |

---

## 4. 自动化告警脚本

```python
# /opt/vocab-agent/scripts/alert_business.py
"""
业务指标告警（每天 8 点跑）
"""
import json
import urllib.request
from datetime import datetime, timedelta

import psycopg


def send_dingtalk(msg: str):
    """发送钉钉消息"""
    webhook = os.getenv("DINGTALK_WEBHOOK")
    if not webhook:
        print(f"[Alert] {msg}")
        return
    data = {"msgtype": "text", "text": {"content": f"[VocabAgent] {msg}"}}
    req = urllib.request.Request(webhook, data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req)


def check_retention():
    """检查 7 日留存"""
    dsn = os.getenv("DATABASE_URL")
    conn = psycopg.connect(dsn)
    cur = conn.cursor()
    cur.execute("""
        SELECT
            COUNT(DISTINCT user_id) FILTER (WHERE last_active >= CURRENT_DATE - 7) as active_7d,
            COUNT(DISTINCT user_id) FILTER (WHERE registered_at BETWEEN CURRENT_DATE - 14 AND CURRENT_DATE - 7) as registered_7d_ago
        FROM users
    """)
    active_7d, registered_7d_ago = cur.fetchone()
    if registered_7d_ago > 0:
        retention = active_7d / registered_7d_ago
        if retention < 0.25:
            send_dingtalk(f"⚠️ 7 日留存率 {retention:.1%}，低于 25% 阈值")


def check_ai_adoption():
    """检查 AI 功能渗透率"""
    conn = psycopg.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    cur.execute("""
        SELECT
            COUNT(DISTINCT user_id) FILTER (WHERE last_active >= CURRENT_DATE - 1) as dau,
            COUNT(DISTINCT user_id) FILTER (WHERE last_active >= CURRENT_DATE - 1 AND used_ai = true) as ai_users
        FROM users
    """)
    dau, ai_users = cur.fetchone()
    if dau > 0:
        adoption = ai_users / dau
        if adoption < 0.30:
            send_dingtalk(f"⚠️ AI 渗透率 {adoption:.1%}，低于 30% 阈值")


def main():
    check_retention()
    check_ai_adoption()
    print(f"检查完成: {datetime.now()}")


if __name__ == "__main__":
    main()
```

定时任务：
```bash
# /etc/cron.d/vocab-agent-business-alerts
0 8 * * * cd /opt/vocab-agent && python scripts/alert_business.py
```

---

## 5. 告警响应流程

```
告警触发
    │
    ├─ P0（短信）
    │   ├─ AI 服务异常 5min
    │   ├─ 数据库连接失败
    │   └─ 5xx 错误率 > 5%
    │
    ├─ P1（钉钉 + 邮件）
    │   ├─ 响应慢
    │   ├─ CPU / 内存 / 磁盘高
    │   └─ 业务指标异常
    │
    └─ P2（邮件）
        └─ 留存 / 转化异常
```

**响应时间 SLA**：
- P0：15 分钟内响应
- P1：1 小时内响应
- P2：当日处理
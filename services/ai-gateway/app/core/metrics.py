"""Prometheus metrics（降级到 no-op 如果 prometheus_client 未装）"""
from __future__ import annotations

import functools
import time
from typing import Any


class _NoOpMetric:
    """prometheus_client 未装时用的占位"""
    def labels(self, **_):
        return self
    def inc(self, *_):
        pass
    def observe(self, *_):
        pass
    def set(self, *_):
        pass


def _make_counter(name, doc, labels):
    try:
        from prometheus_client import Counter
        return Counter(name, doc, labels)
    except ImportError:
        return _NoOpMetric()


def _make_histogram(name, doc, labels, **kw):
    try:
        from prometheus_client import Histogram
        return Histogram(name, doc, labels, **kw)
    except ImportError:
        return _NoOpMetric()


def _make_gauge(name, doc):
    try:
        from prometheus_client import Gauge
        return Gauge(name, doc)
    except ImportError:
        return _NoOpMetric()


# ============ AI 接口指标 ============
ai_requests_total = _make_counter(
    'ai_requests_total', 'Total AI requests', ['endpoint', 'status']
)

ai_request_duration_seconds = _make_histogram(
    'ai_request_duration_seconds',
    'AI request duration in seconds',
    ['endpoint'],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30),
)

ai_tokens_total = _make_counter(
    'ai_tokens_total', 'Total LLM tokens used', ['endpoint', 'model']
)

# ============ 缓存指标 ============
cache_hits_total = _make_counter(
    'cache_hits_total', 'Total cache hits', ['cache_name']
)

cache_misses_total = _make_counter(
    'cache_misses_total', 'Total cache misses', ['cache_name']
)

# ============ 限流指标 ============
rate_limit_rejected_total = _make_counter(
    'rate_limit_rejected_total', 'Total rate limit rejections', ['endpoint']
)

# ============ 数据库指标 ============
db_query_duration_seconds = _make_histogram(
    'db_query_duration_seconds', 'Database query duration', ['query_type']
)

# ============ 业务指标 ============
active_sessions = _make_gauge('active_sessions', 'Active user sessions')


def track_request(endpoint: str):
    """装饰器：自动追踪请求次数 + 耗时"""
    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            start = time.time()
            status = 'success'
            try:
                result = await fn(*args, **kwargs)
                return result
            except Exception:
                status = 'error'
                raise
            finally:
                duration = time.time() - start
                try:
                    ai_requests_total.labels(endpoint=endpoint, status=status).inc()
                    ai_request_duration_seconds.labels(endpoint=endpoint).observe(duration)
                except Exception:
                    pass
        return wrapper
    return decorator


def track_cache(cache_name: str, hit: bool):
    """记录缓存命中/未命中"""
    try:
        if hit:
            cache_hits_total.labels(cache_name=cache_name).inc()
        else:
            cache_misses_total.labels(cache_name=cache_name).inc()
    except Exception:
        pass
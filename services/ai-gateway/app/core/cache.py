"""Redis 缓存 + 限流"""
from __future__ import annotations

import asyncio
import functools
import hashlib
import json
import logging
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


# ============ 缓存装饰器 ============

def _hash_key(*args, **kwargs) -> str:
    """根据参数生成稳定的 cache key"""
    raw = json.dumps([args, kwargs], sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()


def cached(ttl: int = 3600, key_prefix: str = 'cache'):
    """
    异步函数缓存装饰器

    用法：
        @cached(ttl=86400, key_prefix='explain')
        async def explain_word(headword: str):
            ...

    注意：依赖 redis 包；未安装或 REDIS_URL 未配置时自动降级为无缓存。
    """
    def decorator(fn: Callable):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            try:
                from app.core.redis_client import get_redis
                redis_client = get_redis()
            except Exception as e:
                logger.debug(f'Redis not available, bypassing cache: {e}')
                return await fn(*args, **kwargs)

            if not redis_client:
                return await fn(*args, **kwargs)

            key = f'{key_prefix}:{fn.__name__}:{_hash_key(*args, **kwargs)}'
            try:
                cached_value = await redis_client.get(key)
                if cached_value:
                    logger.debug(f'Cache hit: {key}')
                    return json.loads(cached_value)
            except Exception as e:
                logger.warning(f'Cache read failed: {e}')

            result = await fn(*args, **kwargs)
            try:
                await redis_client.setex(key, ttl, json.dumps(result, default=str))
            except Exception as e:
                logger.warning(f'Cache write failed: {e}')
            return result
        return wrapper
    return decorator


# ============ 限流 ============

class RateLimiter:
    """简单的滑动窗口限流"""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def check(self, key: str) -> tuple[bool, int]:
        """
        检查是否允许请求
        Returns: (allowed, remaining)
        """
        from app.core.redis_client import get_redis

        redis = get_redis()
        if not redis:
            return True, self.max_requests  # 无 Redis 时不限制

        try:
            full_key = f'ratelimit:{key}'
            current = await redis.get(full_key)
            if current is None:
                await redis.setex(full_key, self.window_seconds, '1')
                return True, self.max_requests - 1

            count = int(current)
            if count >= self.max_requests:
                return False, 0

            await redis.incr(full_key)
            await redis.expire(full_key, self.window_seconds)
            return True, self.max_requests - count - 1
        except Exception as e:
            logger.warning(f'Rate limit check failed: {e}')
            return True, self.max_requests


# 全局限流器
explain_limiter = RateLimiter(max_requests=100, window_seconds=3600)  # 每小时 100 次
dialogue_limiter = RateLimiter(max_requests=50, window_seconds=3600)
voice_limiter = RateLimiter(max_requests=200, window_seconds=3600)
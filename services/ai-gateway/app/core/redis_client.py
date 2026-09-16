"""Redis 客户端（懒加载，无 redis 包时自动降级）"""
from __future__ import annotations

import os
from typing import Optional

from loguru import logger

_client = None
_redis_module_unavailable = False


def get_redis():
    """获取 Redis 客户端。
    - REDIS_URL 未配置 → 返回 None
    - redis 包未安装 → 返回 None
    - 其他错误 → 返回 None
    """
    global _client, _redis_module_unavailable

    if _client is not None:
        return _client

    if _redis_module_unavailable:
        return None

    url = os.getenv('REDIS_URL')
    if not url:
        return None

    try:
        import redis.asyncio as redis  # noqa: F401
        _client = redis.from_url(url, decode_responses=True)
        logger.info('Redis client initialized')
        return _client
    except ModuleNotFoundError as e:
        logger.warning(f'Redis package not installed, caching disabled: {e}')
        _redis_module_unavailable = True
        return None
    except Exception as e:
        logger.warning(f'Redis init failed: {e}')
        return None
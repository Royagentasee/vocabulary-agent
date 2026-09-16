"""限流中间件"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.cache import (
    explain_limiter,
    dialogue_limiter,
    voice_limiter,
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """基于路径的限流中间件"""

    ROUTE_LIMITS = {
        '/api/ai/explain': explain_limiter,
        '/api/ai/dialogue': dialogue_limiter,
        '/api/ai/voice': voice_limiter,
    }

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 找到匹配的限流器
        limiter = None
        for prefix, l in self.ROUTE_LIMITS.items():
            if path.startswith(prefix):
                limiter = l
                break

        if not limiter:
            return await call_next(request)

        # 用 IP + 用户标识作为限流 key
        client_ip = request.headers.get('x-forwarded-for', request.client.host if request.client else 'unknown')
        user_id = request.headers.get('x-user-id', '')
        key = f'{client_ip}:{user_id}'

        allowed, remaining = await limiter.check(key)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    'detail': '请求过于频繁，请稍后重试',
                    'retry_after': 3600,
                },
                headers={
                    'X-RateLimit-Remaining': '0',
                    'Retry-After': '3600',
                },
            )

        response = await call_next(request)
        response.headers['X-RateLimit-Remaining'] = str(remaining)
        return response
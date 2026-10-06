"""FastAPI 依赖：AI 额度校验

用法：
    @router.post("", dependencies=[Depends(require_quota('explain'))])

校验通过会「扣减一次」额度；超出则返回 429，detail 里带
QUOTA_EXCEEDED 结构，前端据此弹出升级引导。
"""
from __future__ import annotations

from fastapi import Header, HTTPException

from app.services import quota


def require_quota(feature: str):
    async def _dep(x_user_id: str = Header('', alias='X-User-Id')) -> dict:
        allowed, used, limit = quota.check_and_consume(x_user_id, feature)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail=quota.quota_error_detail(feature, used, limit),
            )
        return {'userId': x_user_id, 'used': used, 'limit': limit}

    return _dep

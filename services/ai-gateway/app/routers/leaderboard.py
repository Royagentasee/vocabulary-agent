"""排行榜路由"""
from fastapi import APIRouter, Query

from app.services import leaderboard

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("")
async def get_leaderboard(
    me: str = Query('', description='当前用户 id，用于高亮自己'),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    """最近 7 天积分排行（服务端聚合）。"""
    return leaderboard.weekly(limit=limit, me=me)

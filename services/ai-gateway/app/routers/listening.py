"""听力练习路由"""
from fastapi import APIRouter, Query

from app.schemas.listening import ListeningResponse, ListeningStats
from app.services.listening_bank import get_stats, list_passages

router = APIRouter(prefix="/api/listening", tags=["listening"])


@router.get("/passages", response_model=ListeningResponse)
async def get_passages(
    exam: str | None = Query(None, description="TOEFL / IELTS"),
    limit: int = Query(50, ge=1, le=100),
    shuffle: bool = Query(False),
) -> ListeningResponse:
    """听力材料列表。"""
    items, total = list_passages(exam=exam, limit=limit, shuffle=shuffle)
    return ListeningResponse(items=items, total=total)


@router.get("/stats", response_model=ListeningStats)
async def get_listening_stats() -> ListeningStats:
    """听力题库统计。"""
    return ListeningStats(**get_stats())

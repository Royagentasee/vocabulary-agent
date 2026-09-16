"""真题库路由：官方真题（College Board SAT 官方练习题）"""
from fastapi import APIRouter, Query

from app.schemas.reading import BankResponse, BankStatsResponse
from app.services.reading_bank import get_stats, list_items

router = APIRouter(prefix="/api/reading", tags=["reading-bank"])


@router.get("/bank", response_model=BankResponse)
async def get_bank(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    test_no: int | None = Query(None, description="按套号筛选，如 4"),
    shuffle: bool = Query(False, description="随机抽取"),
) -> BankResponse:
    """获取真题库题目。"""
    items, total = list_items(limit=limit, offset=offset, test_no=test_no, shuffle=shuffle)
    stats = get_stats()
    return BankResponse(items=items, total=total, exam=stats['exam'], source=stats['source'])


@router.get("/bank/stats", response_model=BankStatsResponse)
async def get_bank_stats() -> BankStatsResponse:
    """真题库统计信息。"""
    return BankStatsResponse(**get_stats())

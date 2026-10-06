"""真题库路由：官方真题（College Board SAT）+ 分级阅读（初中/高中/大学）"""
from fastapi import APIRouter, HTTPException, Query

from app.schemas.reading import BankResponse, BankStatsResponse
from app.services import reading_levels
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


# ---------------- 分级阅读（初中 / 高中 / 大学）----------------


@router.get("/levels/stats")
async def get_levels_stats() -> dict:
    """分级阅读题库统计。"""
    return reading_levels.get_stats()


@router.get("/levels/topics")
async def get_level_topics(level: str = Query('', description="junior / senior / college")) -> dict:
    return {'topics': reading_levels.list_topics(level)}


@router.get("/levels")
async def get_levels(
    level: str = Query('', description="junior(初中) / senior(高中) / college(大学)"),
    topic: str = Query(''),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    shuffle: bool = Query(False),
) -> dict:
    """分级阅读文章列表（不含正文与答案）。"""
    items, total = reading_levels.list_items(
        level=level, topic=topic, limit=limit, offset=offset, shuffle=shuffle)
    return {'items': items, 'total': total, 'level': level}


@router.get("/levels/{item_id}")
async def get_level_item(item_id: str) -> dict:
    """单篇文章 + 题目 + 答案与解析。"""
    item = reading_levels.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f'文章不存在: {item_id}')
    return item

"""写作真题库路由"""
from fastapi import APIRouter, Query

from app.schemas.writing import WritingPromptResponse, WritingPromptStats
from app.services.writing_bank import get_stats, list_prompts

router = APIRouter(prefix="/api/writing", tags=["writing-bank"])


@router.get("/prompts", response_model=WritingPromptResponse)
async def get_prompts(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    task_type: str | None = Query(None, description="issue / argument"),
    shuffle: bool = Query(False),
) -> WritingPromptResponse:
    """获取官方写作真题。"""
    items, total = list_prompts(limit=limit, offset=offset, task_type=task_type, shuffle=shuffle)
    return WritingPromptResponse(
        items=items, total=total, exam='GRE',
        source='ETS 官方 GRE Analytical Writing 题库',
    )


@router.get("/prompts/stats", response_model=WritingPromptStats)
async def get_prompt_stats() -> WritingPromptStats:
    """写作真题库统计。"""
    return WritingPromptStats(**get_stats())

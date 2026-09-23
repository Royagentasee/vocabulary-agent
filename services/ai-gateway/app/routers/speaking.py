"""口语朗读路由"""
from fastapi import APIRouter

from app.schemas.speaking import (
    SpeakingAssessRequest,
    SpeakingAssessResponse,
    SpeakingSentencesResponse,
)
from app.services.speaking import SENTENCES, assess_speaking

router = APIRouter(prefix="/api/speaking", tags=["speaking"])


@router.get("/sentences", response_model=SpeakingSentencesResponse)
async def get_sentences() -> SpeakingSentencesResponse:
    """朗读练习句列表。"""
    return SpeakingSentencesResponse(items=SENTENCES, total=len(SENTENCES))


@router.post("/assess", response_model=SpeakingAssessResponse)
async def post_assess(req: SpeakingAssessRequest) -> SpeakingAssessResponse:
    """评估用户朗读的发音。"""
    return await assess_speaking(req)

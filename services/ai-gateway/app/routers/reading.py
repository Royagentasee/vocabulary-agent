"""阅读理解路由"""
from fastapi import APIRouter

from app.schemas.reading import ReadingRequest, ReadingResponse
from app.services.reading import generate_reading

router = APIRouter(prefix="/api/ai/reading", tags=["reading"])


@router.post("", response_model=ReadingResponse)
async def post_reading(req: ReadingRequest) -> ReadingResponse:
    """根据文章出阅读理解题。"""
    return await generate_reading(req)

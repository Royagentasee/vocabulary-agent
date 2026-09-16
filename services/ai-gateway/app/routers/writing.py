"""写作助手路由"""
from fastapi import APIRouter

from app.schemas.writing import WritingRequest, WritingResponse
from app.services.writing import generate_writing

router = APIRouter(prefix="/api/ai/writing", tags=["writing"])


@router.post("", response_model=WritingResponse)
async def post_writing(req: WritingRequest) -> WritingResponse:
    """生成写作短文。"""
    return await generate_writing(req)

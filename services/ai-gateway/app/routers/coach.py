"""AI 学习教练路由"""
from fastapi import APIRouter, Depends

from app.core.deps import require_quota
from app.schemas.coach import CoachChatRequest, CoachChatResponse
from app.services import coach

router = APIRouter(prefix="/api/coach", tags=["coach"])


@router.post("/chat", response_model=CoachChatResponse,
             dependencies=[Depends(require_quota('coach'))])
async def post_chat(req: CoachChatRequest) -> CoachChatResponse:
    """和 AI 学习教练对话（会读取传入的学习数据上下文）。"""
    messages = [m.model_dump() for m in req.messages]
    result = await coach.chat(messages, req.context)
    return CoachChatResponse(**result)

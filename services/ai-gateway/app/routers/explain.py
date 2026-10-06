"""AI 解释路由"""
from fastapi import APIRouter, Depends, HTTPException

from app.schemas.explain import ExplainRequest, ExplainResponse
from app.core.deps import require_quota
from app.services.explain import explain_word

router = APIRouter(prefix="/api/ai/explain", tags=["explain"])


@router.post("", response_model=ExplainResponse, dependencies=[Depends(require_quota('explain'))])
async def post_explain(req: ExplainRequest) -> ExplainResponse:
    """调用 LLM 解释单词并返回结构化数据。"""
    try:
        return await explain_word(req.headword, req.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 解释失败：{str(e)}")

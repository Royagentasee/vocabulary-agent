"""语法学习路由"""
from fastapi import APIRouter, Depends

from app.schemas.grammar import GrammarRequest, GrammarResponse, GrammarTopicsResponse
from app.core.deps import require_quota
from app.services.grammar import generate_grammar
from app.services.grammar_topics import TOPICS

router = APIRouter(prefix="/api/grammar", tags=["grammar"])


@router.get("/topics", response_model=GrammarTopicsResponse)
async def get_topics() -> GrammarTopicsResponse:
    """语法知识点列表。"""
    return GrammarTopicsResponse(items=TOPICS, total=len(TOPICS))


@router.post("/generate", response_model=GrammarResponse, dependencies=[Depends(require_quota('grammar'))])
async def post_grammar(req: GrammarRequest) -> GrammarResponse:
    """生成某个语法点的讲解 + 练习题。"""
    return await generate_grammar(req)

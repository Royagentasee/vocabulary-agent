"""语法学习路由"""
from fastapi import APIRouter

from app.schemas.grammar import GrammarRequest, GrammarResponse, GrammarTopicsResponse
from app.services.grammar import generate_grammar
from app.services.grammar_topics import TOPICS

router = APIRouter(prefix="/api/grammar", tags=["grammar"])


@router.get("/topics", response_model=GrammarTopicsResponse)
async def get_topics() -> GrammarTopicsResponse:
    """语法知识点列表。"""
    return GrammarTopicsResponse(items=TOPICS, total=len(TOPICS))


@router.post("/generate", response_model=GrammarResponse)
async def post_grammar(req: GrammarRequest) -> GrammarResponse:
    """生成某个语法点的讲解 + 练习题。"""
    return await generate_grammar(req)

"""词条查询路由"""
from fastapi import APIRouter, HTTPException, Query

from app.schemas.word import (
    WordSearchRequest,
    WordSearchResponse,
    WordDetailResponse,
    WordEmbeddingRequest,
    WordEmbeddingResponse,
    MeaningQuizResponse,
    RootAffixResponse,
)
from app.services.words import (
    get_word_detail,
    get_word_embedding,
    get_meaning_quiz,
    list_random_words,
    search_words,
)

router = APIRouter(prefix="/api/words", tags=["words"])


@router.get("/search", response_model=WordSearchResponse)
async def get_search(
    q: str = Query(..., min_length=1, max_length=64),
    limit: int = Query(20, ge=1, le=100),
    exam_tag: str | None = None,
) -> WordSearchResponse:
    """搜索词条。"""
    req = WordSearchRequest(query=q, limit=limit, exam_tag=exam_tag)
    return await search_words(req)


@router.get("/random", response_model=WordSearchResponse)
async def get_random(
    limit: int = Query(20, ge=1, le=100),
    exclude: str | None = Query(None, description="逗号分隔的已学单词 id，用于排除"),
) -> WordSearchResponse:
    """随机取 limit 个词（可排除已学过的词）。"""
    exclude_ids = [x.strip() for x in exclude.split(',') if x.strip()] if exclude else None
    return await list_random_words(limit=limit, exclude_ids=exclude_ids)


@router.get("/meaning-quiz", response_model=MeaningQuizResponse)
async def get_meaning_quiz_route(
    headword: str = Query(..., min_length=1, max_length=64),
) -> MeaningQuizResponse:
    """生成"选意思"4 选 1 选择题。"""
    quiz = await get_meaning_quiz(headword)
    if not quiz:
        raise HTTPException(status_code=404, detail=f"Word '{headword}' not found")
    return quiz


@router.get("/root-affix", response_model=RootAffixResponse)
async def get_root_affix(
    headword: str = Query(..., min_length=1, max_length=64),
) -> RootAffixResponse:
    """单独取单词的词根词缀拆解（学习卡片兜底回填用）。

    注意：必须声明在 /{headword} 之前，否则会被路径参数吃掉。
    """
    from app.core.word_roots import analyze_word
    from app.schemas.explain import RootAffix

    raw = analyze_word(headword)
    return RootAffixResponse(
        headword=headword,
        rootAffix=RootAffix(**raw) if raw else None,
    )


@router.get("/{headword}", response_model=WordDetailResponse)
async def get_word(headword: str) -> WordDetailResponse:
    """获取词条详情 + 相似词。"""
    detail = await get_word_detail(headword)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Word '{headword}' not found")
    return detail


@router.post("/embedding", response_model=WordEmbeddingResponse)
async def post_embedding(req: WordEmbeddingRequest) -> WordEmbeddingResponse:
    """获取词条的 embedding 向量。"""
    try:
        return await get_word_embedding(req)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
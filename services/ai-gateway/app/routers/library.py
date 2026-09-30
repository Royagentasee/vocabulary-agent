"""书库（原版阅读）路由"""
import re

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from app.schemas.library import (
    BookDetail,
    BookListResponse,
    ChapterContent,
    LibraryStats,
    LookupExample,
    LookupSense,
    RootAffixInfo,
    WordLookupResponse,
)
from app.services import library
from app.services.explain import explain_word
from app.services.words import get_word_detail

router = APIRouter(prefix="/api/library", tags=["library"])

# 查词结果缓存（避免同一个词反复调 AI）
_lookup_cache: dict[str, WordLookupResponse] = {}
_CACHE_MAX = 3000


def _candidates(word: str) -> list[str]:
    """生成可能的原形（很轻量的词形还原，够阅读场景用）"""
    w = word.lower().strip()
    out = [w]

    def add(x: str) -> None:
        if x and x not in out and len(x) > 1:
            out.append(x)

    if w.endswith('ies') and len(w) > 4:
        add(w[:-3] + 'y')
    if w.endswith('es') and len(w) > 3:
        add(w[:-2])
    if w.endswith('s') and not w.endswith('ss') and len(w) > 3:
        add(w[:-1])
    if w.endswith('ing') and len(w) > 5:
        add(w[:-3])
        add(w[:-3] + 'e')
        if len(w) > 6 and w[-4] == w[-5]:      # running -> run
            add(w[:-4])
    if w.endswith('ed') and len(w) > 4:
        add(w[:-2])
        add(w[:-1])
        if len(w) > 5 and w[-3] == w[-4]:      # stopped -> stop
            add(w[:-3])
    if w.endswith('ly') and len(w) > 4:
        add(w[:-2])
    if w.endswith('er') and len(w) > 4:
        add(w[:-2])
        add(w[:-1])
    if w.endswith('est') and len(w) > 5:
        add(w[:-3])
    return out


def _ra_info(ra) -> RootAffixInfo | None:
    """RootAffix 的字段名是 snake_case（对外序列化才用 camelCase 别名）"""
    if not ra:
        return None
    d = ra.model_dump()
    return RootAffixInfo(
        prefix=d.get('prefix', '') or '',
        prefixMeaning=d.get('prefix_meaning', '') or '',
        root=d.get('root', '') or '',
        rootMeaning=d.get('root_meaning', '') or '',
        suffix=d.get('suffix', '') or '',
        suffixMeaning=d.get('suffix_meaning', '') or '',
    )


def _from_dict(word: str, detail) -> WordLookupResponse:
    w = detail.word          # WordDetailResponse 是包装类型
    senses = [
        LookupSense(pos=s.pos, definitionCn=s.definitionCn, definitionEn=s.definitionEn)
        for s in (w.senses or [])
    ]
    examples = [
        LookupExample(sentence=e.sentence, translation=e.translation)
        for e in (w.examples or [])
    ][:2]
    return WordLookupResponse(
        word=word, found=True, source='dict', headword=w.headword,
        ipa=w.ipa or '', pos=w.pos or [], translation=w.translation or '',
        senses=senses, examples=examples, rootAffix=_ra_info(w.rootAffix),
    )


@router.get("/lookup", response_model=WordLookupResponse)
async def lookup_word(
    word: str = Query(..., min_length=1, max_length=48),
    context: str = Query('', max_length=600, description='该词所在句子，帮 AI 判断词义'),
) -> WordLookupResponse:
    """阅读器点词查义：本地词典优先，未收录则调 AI 解释。"""
    raw = re.sub(r"[^A-Za-z'-]", '', word).strip("'-")
    if not raw:
        return WordLookupResponse(word=word, found=False, source='none')

    key = raw.lower()
    if key in _lookup_cache:
        return _lookup_cache[key]

    # 1) 本地词典（含词形还原）
    for cand in _candidates(key):
        try:
            detail = await get_word_detail(cand)
        except Exception as e:
            logger.debug(f'词典查询 {cand} 失败: {e}')
            detail = None
        if detail and (detail.word.translation or detail.word.senses):
            res = _from_dict(raw, detail)
            if len(_lookup_cache) < _CACHE_MAX:
                _lookup_cache[key] = res
            return res

    # 2) AI 兜底
    try:
        exp = await explain_word(raw, context or None)
        senses = [
            LookupSense(pos=s.pos, definitionCn=s.definition_cn, definitionEn=s.definition_en)
            for s in (exp.senses or [])
        ]
        examples = [
            LookupExample(sentence=e.sentence, translation=e.translation)
            for e in (exp.examples or [])
        ][:2]
        translation = senses[0].definitionCn if senses else ''
        res = WordLookupResponse(
            word=raw, found=bool(senses or translation), source='ai', headword=exp.headword,
            ipa=exp.ipa or '', pos=exp.pos or [], translation=translation,
            senses=senses, examples=examples, rootAffix=_ra_info(exp.root_affix),
            memoryTip=exp.memory_tip or '',
        )
        if res.found and len(_lookup_cache) < _CACHE_MAX:
            _lookup_cache[key] = res
        return res
    except Exception as e:
        logger.warning(f'查词 AI 兜底失败 {raw}: {e}')
        return WordLookupResponse(word=raw, found=False, source='none')


@router.get("/books", response_model=BookListResponse)
async def get_books(
    kind: str = Query('', description='classic(名著) / story(A-Z小故事) / 空=全部'),
    level: str = Query('', description='A2 / B1 / B2'),
    category: str = Query('', description='分类'),
    letter: str = Query('', description='A-Z（仅小故事）'),
    q: str = Query('', description='搜索关键词'),
    limit: int = Query(200, ge=1, le=500),
) -> BookListResponse:
    """书目列表。"""
    return library.list_books(kind=kind, level=level, category=category,
                              letter=letter, q=q, limit=limit)


@router.get("/books/{book_id}", response_model=BookDetail)
async def get_book(book_id: str) -> BookDetail:
    """书籍详情 + 章节目录。"""
    book = library.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail=f'书籍不存在: {book_id}')
    return book


@router.get("/books/{book_id}/chapters/{index}", response_model=ChapterContent)
async def get_chapter(book_id: str, index: int) -> ChapterContent:
    """章节正文。"""
    ch = library.get_chapter(book_id, index)
    if not ch:
        raise HTTPException(status_code=404, detail=f'章节不存在: {book_id} #{index}')
    return ch


@router.get("/stats", response_model=LibraryStats)
async def get_stats() -> LibraryStats:
    """书库统计。"""
    return library.stats()

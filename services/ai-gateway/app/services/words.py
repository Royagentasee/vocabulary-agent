"""词条查询 / RAG 服务

实现：
1. 全文检索（PostgreSQL tsvector / SQLite LIKE）
2. 向量检索（pgvector）
3. 词条详情
"""
from __future__ import annotations

import asyncio
import functools
from typing import Optional

from loguru import logger

from app.core.word_roots import analyze_word
from app.schemas.word import (
    Word,
    WordSearchRequest,
    WordSearchResponse,
    WordDetailResponse,
    WordEmbeddingResponse,
    MeaningChoice,
    MeaningQuizResponse,
)


def _attach_root(item: dict) -> dict:
    """给词条附上词根词缀拆解（学习页直接展示，无需再调 AI）"""
    if not item.get('rootAffix'):
        try:
            root = analyze_word(item.get('headword', ''))
            if root:
                item['rootAffix'] = root
        except Exception as e:
            logger.debug(f'analyze_word failed for {item.get("headword")}: {e}')
    return item


# ============ Backend Adapter ============

async def _get_words_backend():
    """懒加载 DB backend（避免无 DB 时启动失败）"""
    try:
        from app.core.database import get_db
        return get_db()
    except Exception as e:
        logger.warning(f'Database not available: {e}')
        return None


# ============ 搜索 ============

async def search_words(req: WordSearchRequest) -> WordSearchResponse:
    db = await _get_words_backend()
    if db is None:
        return WordSearchResponse(items=[], total=0)

    try:
        items = await db.search_words(
            query=req.query,
            limit=req.limit,
            exam_tag=req.exam_tag,
        )
        return WordSearchResponse(items=[_attach_root(i) for i in items], total=len(items))
    except Exception as e:
        logger.error(f'Word search failed: {e}')
        return WordSearchResponse(items=[], total=0)


# ============ 随机取词 ============

async def list_random_words(limit: int, exclude_ids: list[str] | None = None) -> WordSearchResponse:
    """随机取 limit 个词（排除已学过的 exclude_ids）"""
    db = await _get_words_backend()
    if db is None:
        return WordSearchResponse(items=[], total=0)

    try:
        items = await db.list_random_words(limit=limit, exclude_ids=exclude_ids)
        return WordSearchResponse(items=[_attach_root(i) for i in items], total=len(items))
    except Exception as e:
        logger.error(f'List random words failed: {e}')
        return WordSearchResponse(items=[], total=0)


# ============ 选释义（4 选 1） ============

async def get_meaning_quiz(headword: str) -> Optional[MeaningQuizResponse]:
    """生成"选意思"4 选 1：1 正确翻译 + 3 个干扰翻译（从词库随机取其他词）"""
    import random

    db = await _get_words_backend()
    if db is None:
        return None

    try:
        word = await db.get_word_by_headword(headword)
        if not word:
            return None

        correct_text = word.get('translation') or word['headword']
        word_id = word['id']

        # 随机取 3 个干扰词（排除当前词）
        distractors = await db.list_random_words(limit=3, exclude_ids=[str(word_id)])
        distractor_texts = [
            (d.get('translation') or d['headword']) for d in distractors
        ]

        # 去重 + 补充占位（如果干扰不足）
        distractor_texts = [t for t in distractor_texts if t and t != correct_text]
        fallback = ['勇敢的', '复杂的', '传统的', '模糊的', '可靠的', '短暂的', '显著的', '必要的']
        for fb in fallback:
            if len(distractor_texts) >= 3:
                break
            if fb not in distractor_texts and fb != correct_text:
                distractor_texts.append(fb)

        # 组装 4 个选项并打乱顺序
        labels = ['A', 'B', 'C', 'D']
        texts = [correct_text] + distractor_texts[:3]
        random.shuffle(texts)
        correct_label = labels[texts.index(correct_text)]

        return MeaningQuizResponse(
            headword=word['headword'],
            ipa=word.get('ipa', ''),
            pos=word.get('pos', []),
            choices=[MeaningChoice(label=labels[i], text=texts[i]) for i in range(len(texts))],
            correct_label=correct_label,
            definition_en=word.get('translation_en', ''),
        )
    except Exception as e:
        logger.error(f'Meaning quiz failed: {e}')
        return None


# ============ 详情 ============

async def get_word_detail(headword: str) -> Optional[WordDetailResponse]:
    db = await _get_words_backend()
    if db is None:
        return None

    try:
        word = await db.get_word_by_headword(headword)
        if not word:
            return None
        # 找相似词（向量）
        similar = await db.find_similar_words(word['id'], limit=5)
        return WordDetailResponse(
            word=_attach_root(word),
            similar=[_attach_root(s) for s in similar],
        )
    except Exception as e:
        logger.error(f'Word detail failed: {e}')
        return None


# ============ Embedding ============

async def get_word_embedding(req) -> WordEmbeddingResponse:
    """获取词的 embedding（用于相似词检索）"""
    db = await _get_words_backend()
    if db is None:
        raise RuntimeError('Database not available')

    try:
        embedding = await db.get_word_embedding(req.word_id)
        if embedding is None:
            # 实时生成：调用 LLM embedding（这里简化）
            from app.core.llm import get_llm_client
            # 占位：实际应该调用 embedding API
            raise RuntimeError('Embedding not found and generation not implemented')
        return WordEmbeddingResponse(
            word_id=req.word_id,
            embedding=embedding,
            model='placeholder',
        )
    except Exception as e:
        logger.error(f'Get embedding failed: {e}')
        raise
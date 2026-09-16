"""AI 解释服务

带 mock fallback：DeepSeek 出错时用本地模板生成解释，避免前端显示错误。
"""
from __future__ import annotations

import asyncio
import functools
import json
import os

from loguru import logger
from vocab_agent_llm import ChatMessage, ChatOptions

from app.core.database import get_db
from app.core.llm import get_llm_client
from app.core.mock_data import generate_mock_explanation
from app.core.word_roots import analyze_word
from app.prompts.explain import build_explain_messages
from app.schemas.explain import ExplainResponse, Example, RootAffix, Sense

USE_MOCK = os.getenv('USE_AI_MOCK', '').lower() in ('1', 'true', 'yes')


def _clean_json(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith('```'):
        cleaned = cleaned.strip('`')
        if '\n' in cleaned:
            cleaned = cleaned.split('\n', 1)[1]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
    return json.loads(cleaned)


async def _llm_call(headword: str, context: str | None) -> dict:
    """调 DeepSeek，返回解析后的 JSON dict"""
    client = get_llm_client()
    messages = build_explain_messages(headword, context)
    chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]
    raw = await _to_thread(
        client.chat, chat_messages, ChatOptions(temperature=0.4, max_tokens=1500)
    )
    logger.debug(f"LLM raw for {headword}: {raw[:200]}...")
    return _clean_json(raw)


async def _fetch_db_word(headword: str) -> dict | None:
    try:
        db = get_db()
        return await db.get_word_by_headword(headword)
    except Exception as e:
        logger.debug(f"DB lookup failed for {headword}: {e}")
        return None


def _build_response(data: dict, headword: str) -> ExplainResponse:
    raw_root = data.get('root_affix')
    # LLM 一般不会返回结构化的词根词缀，这里用本地词根词缀引擎回填，
    # 保证「词根词缀拆解」在学习流程里始终可见。
    if not raw_root or not (raw_root.get('root') or raw_root.get('prefix') or raw_root.get('suffix')):
        raw_root = analyze_word(data.get('headword', headword) or headword)
    root_affix = RootAffix(**raw_root) if raw_root else None
    return ExplainResponse(
        headword=data.get('headword', headword),
        ipa=data.get('ipa', ''),
        pos=data.get('pos', []),
        etymology=data.get('etymology', ''),
        root_affix=root_affix,
        senses=[Sense(**s) for s in data.get('senses', [])],
        examples=[Example(**e) for e in data.get('examples', [])],
        collocations=data.get('collocations', []),
        difficulty=data.get('difficulty', 'medium'),
        memory_tip=data.get('memory_tip', ''),
    )


async def explain_word(headword: str, context: str | None = None) -> ExplainResponse:
    """带 mock fallback 的 AI 解释"""
    # 先从 DB 拿基础信息（fallback 数据源）
    db_word = await _fetch_db_word(headword)

    # 强制 mock 模式
    if USE_MOCK:
        data = _make_mock(headword, db_word)
        return _build_response(data, headword)

    # 尝试调 LLM
    try:
        data = await _llm_call(headword, context)
        return _build_response(data, headword)
    except json.JSONDecodeError as e:
        logger.warning(f"Explain JSON parse failed for {headword}, fallback to mock: {e}")
    except Exception as e:
        logger.warning(f"Explain LLM failed for {headword}, fallback to mock: {e}")

    # Fallback：mock 数据（用 DB 信息增强）
    return _build_response(_make_mock(headword, db_word), headword)


def _make_mock(headword: str, db_word: dict | None) -> dict:
    """根据 DB 信息生成 mock 数据"""
    if db_word:
        return generate_mock_explanation(
            headword=headword,
            pos=db_word.get('pos', 'n'),
            translation=db_word.get('translation', ''),
            definition_en=db_word.get('translation_en', ''),
            etymology_db=db_word.get('etymology', ''),
            frq=db_word.get('frq') or 50.0,
        )
    return generate_mock_explanation(headword=headword, pos='n', translation='')


async def _to_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))

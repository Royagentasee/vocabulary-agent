"""AI 出题服务（带 mock fallback）"""
from __future__ import annotations

import asyncio
import functools
import json
import os

from loguru import logger
from vocab_agent_llm import ChatMessage, ChatOptions

from app.core.database import get_db
from app.core.llm import get_llm_client
from app.core.mock_data import generate_mock_explanation, generate_mock_quiz
from app.prompts.quiz import build_quiz_messages
from app.schemas.quiz import (
    QuizChoice,
    QuizGenerateRequest,
    QuizGenerateResponse,
)

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


async def _fetch_db_word(headword: str) -> dict | None:
    try:
        db = get_db()
        return await db.get_word_by_headword(headword)
    except Exception as e:
        logger.debug(f"DB lookup failed for {headword}: {e}")
        return None


def _build_response(data: dict) -> QuizGenerateResponse:
    return QuizGenerateResponse(
        headword=data.get('headword', ''),
        sentence=data.get('sentence', ''),
        choices=[QuizChoice(**c) for c in data.get('choices', [])],
        correct_label=data.get('correct_label', 'A'),
        explanation=data.get('explanation', ''),
        difficulty=data.get('difficulty', 'medium'),
    )


async def generate_quiz(req: QuizGenerateRequest) -> QuizGenerateResponse:
    """调用 LLM 生成完形填空题（带 mock fallback）"""
    # 先查 DB
    db_word = await _fetch_db_word(req.headword)

    # 强制 mock 模式
    if USE_MOCK:
        return _build_response(_make_mock_quiz(req.headword, db_word))

    # 尝试调 LLM
    try:
        client = get_llm_client()
        messages = build_quiz_messages(req.headword, req.difficulty, req.context)
        chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]

        raw = await _to_thread(
            client.chat,
            chat_messages,
            ChatOptions(temperature=0.7, max_tokens=800),
        )
        logger.debug(f"Quiz raw for {req.headword}: {raw[:200]}...")
        data = _clean_json(raw)
        return _build_response(data)
    except json.JSONDecodeError as e:
        logger.warning(f"Quiz JSON parse failed for {req.headword}, fallback: {e}")
    except Exception as e:
        logger.warning(f"Quiz LLM failed for {req.headword}, fallback: {e}")

    # Fallback
    return _build_response(_make_mock_quiz(req.headword, db_word))


def _make_mock_quiz(headword: str, db_word: dict | None) -> dict:
    pos = (db_word or {}).get('pos', 'n')
    if isinstance(pos, list):
        pos = pos[0] if pos else 'n'
    translation = (db_word or {}).get('translation', '')
    return generate_mock_quiz(headword=headword, pos=pos, translation=translation)


async def _to_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))

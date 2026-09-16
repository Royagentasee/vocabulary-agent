"""阅读理解服务（带 mock fallback）"""
from __future__ import annotations

import asyncio
import functools
import json
import os

from loguru import logger
from vocab_agent_llm import ChatMessage, ChatOptions

from app.core.llm import get_llm_client
from app.prompts.reading import build_reading_messages
from app.schemas.reading import (
    ReadingChoice,
    ReadingQuestion,
    ReadingRequest,
    ReadingResponse,
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


def _mock_reading(req: ReadingRequest) -> ReadingResponse:
    """本地模板（AI 不可用时）"""
    first_sentence = req.passage.strip().split('.')[0][:100]
    questions = []
    for i in range(min(req.num_questions, 3)):
        questions.append(
            ReadingQuestion(
                question=f"What is the main idea discussed in this passage? (Question {i + 1})",
                choices=[
                    ReadingChoice(label='A', text='The passage describes a general concept.'),
                    ReadingChoice(label='B', text='The passage argues against a common belief.'),
                    ReadingChoice(label='C', text='The passage provides a detailed example.'),
                    ReadingChoice(label='D', text='The passage lists unrelated facts.'),
                ],
                correct_label='A',
                explanation='本文围绕一个核心概念展开论述，因此主旨是描述一个总体概念。',
            )
        )
    return ReadingResponse(
        summary=f'本文主要论述了：{first_sentence}...',
        questions=questions,
        is_mock=True,
    )


async def generate_reading(req: ReadingRequest) -> ReadingResponse:
    """阅读理解（带 mock fallback）"""
    if USE_MOCK:
        return _mock_reading(req)

    try:
        client = get_llm_client()
        messages = build_reading_messages(req.passage, req.num_questions, req.level)
        chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]
        raw = await _to_thread(
            client.chat, chat_messages, ChatOptions(temperature=0.4, max_tokens=2500)
        )
        data = _clean_json(raw)
        return ReadingResponse(
            summary=data.get('summary', ''),
            questions=[ReadingQuestion(**q) for q in data.get('questions', [])],
            is_mock=False,
        )
    except Exception as e:
        logger.warning(f"Reading LLM failed, fallback to mock: {e}")
        return _mock_reading(req)


async def _to_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))

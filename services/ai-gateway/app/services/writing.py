"""写作助手服务（带 mock fallback）"""
from __future__ import annotations

import asyncio
import functools
import json
import os

from loguru import logger
from vocab_agent_llm import ChatMessage, ChatOptions

from app.core.llm import get_llm_client
from app.prompts.writing import build_writing_messages
from app.schemas.writing import WritingRequest, WritingResponse

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


def _mock_writing(req: WritingRequest) -> WritingResponse:
    """本地模板写作（无需 AI）"""
    words = req.words or []
    topic = req.topic

    if words:
        # 用目标词造一段模板短文
        used = words[:5]
        sentence_parts = []
        for w in used:
            sentence_parts.append(f'In discussing {topic}, the word **{w}** is particularly relevant.')
        content = ' '.join(sentence_parts)
        content += (
            ' This topic is frequently examined in standardized tests, '
            'and mastering related vocabulary is essential for expressing nuanced ideas clearly.'
        )
    else:
        content = (
            f'Regarding the topic of "{topic}", it is important to consider multiple perspectives. '
            'A well-structured argument should present clear evidence and logical reasoning. '
            'By examining real-world examples, one can develop a deeper understanding of the subject.'
        )

    return WritingResponse(
        topic=topic,
        title=f'On {topic.title() if topic else "the Topic"}',
        content=content,
        used_words=used,
        is_mock=True,
    )


async def generate_writing(req: WritingRequest) -> WritingResponse:
    """写作助手（带 mock fallback）"""
    if USE_MOCK:
        return _mock_writing(req)

    try:
        client = get_llm_client()
        messages = build_writing_messages(
            req.topic, req.words, req.style, req.length,
            instruction=req.instruction, task_label=req.task_label,
        )
        chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]
        raw = await _to_thread(
            client.chat, chat_messages, ChatOptions(temperature=0.7, max_tokens=2000)
        )
        data = _clean_json(raw)
        return WritingResponse(
            topic=req.topic,
            title=data.get('title', ''),
            content=data.get('content', ''),
            used_words=data.get('used_words', []),
            is_mock=False,
        )
    except Exception as e:
        logger.warning(f"Writing LLM failed for '{req.topic}', fallback to mock: {e}")
        return _mock_writing(req)


async def _to_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))

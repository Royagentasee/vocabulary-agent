"""语法学习服务（带 mock fallback）"""
from __future__ import annotations

import asyncio
import functools
import json
import os

from loguru import logger
from vocab_agent_llm import ChatMessage, ChatOptions

from app.core.llm import get_llm_client
from app.prompts.grammar import build_grammar_messages
from app.schemas.grammar import (
    GrammarRequest,
    GrammarResponse,
    GrammarRule,
    GrammarExample,
    GrammarQuestion,
    GrammarChoice,
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


def _mock_grammar(req: GrammarRequest) -> GrammarResponse:
    """本地模板（AI 不可用时）"""
    topic = req.topic
    return GrammarResponse(
        topic=topic,
        title_en=req.title_en,
        explanation=f'「{topic}」是英语考试的高频考点，掌握其基本规则与典型易错点，能显著提升语法题正确率与写作准确性。',
        rules=[
            GrammarRule(
                rule=f'{topic}的核心规则一：先识别句子结构，再套用对应规则。',
                example='The book that you lent me is very helpful.',
                example_translation='你借给我的那本书很有帮助。',
            ),
            GrammarRule(
                rule=f'{topic}的核心规则二：注意特殊情况和固定搭配，避免机械套用。',
                example='It is important that he be on time.',
                example_translation='他准时到很重要。',
            ),
        ],
        examples=[
            GrammarExample(
                sentence='She has been studying English for three years.',
                translation='她已经学了三年英语。',
            ),
        ],
        questions=[
            GrammarQuestion(
                question='Which sentence is grammatically correct?',
                choices=[
                    GrammarChoice(label='A', text='He go to school every day.'),
                    GrammarChoice(label='B', text='He goes to school every day.'),
                    GrammarChoice(label='C', text='He going to school every day.'),
                    GrammarChoice(label='D', text='He gone to school every day.'),
                ],
                correct_label='B',
                explanation='第三人称单数作主语时，一般现在时谓语动词要加 -s。',
            ),
        ],
        is_mock=True,
    )


async def generate_grammar(req: GrammarRequest) -> GrammarResponse:
    """语法讲解 + 练习（带 mock fallback）"""
    if USE_MOCK:
        return _mock_grammar(req)

    try:
        client = get_llm_client()
        messages = build_grammar_messages(req.topic, req.title_en, req.num_questions)
        chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]
        raw = await _to_thread(
            client.chat, chat_messages, ChatOptions(temperature=0.4, max_tokens=2500)
        )
        data = _clean_json(raw)
        return GrammarResponse(
            topic=req.topic,
            title_en=req.title_en,
            explanation=data.get('explanation', ''),
            rules=[GrammarRule(**r) for r in data.get('rules', [])],
            examples=[GrammarExample(**e) for e in data.get('examples', [])],
            questions=[GrammarQuestion(**q) for q in data.get('questions', [])],
            is_mock=False,
        )
    except Exception as e:
        logger.warning(f"Grammar LLM failed for '{req.topic}', fallback to mock: {e}")
        return _mock_grammar(req)


async def _to_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))

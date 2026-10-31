"""语法学习服务（带 mock fallback）"""
from __future__ import annotations

import asyncio
import functools
import json
import os
import re

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

# 挖空题的空格标记（___ / ____ / ______ 都认）
_BLANK_RE = re.compile(r'_{2,}')
_WORD_RE = re.compile(r"[A-Za-z][A-Za-z']*")


def _repair_questions(raw_questions: list) -> list:
    """修正挖空题的答案键错误（AI 常见疏漏）

    典型问题：句子是「___ of tourists visit the museum」，
    空格后面已经有 of，AI 却把正确选项写成「Hundreds of」，
    代入后变成「Hundreds of of tourists」。

    策略：
    1. 选项结尾若与空格后第一个词重复，去掉这个重复词；
    2. 清理后若与其它选项文本重复，去掉重复项并同步修正 correct_label。
    这样「Hundreds of」会被修成「Hundreds」，答案键指向同义的「Hundreds」项。
    """
    out: list = []
    for q in raw_questions:
        if not isinstance(q, dict):
            continue
        question = str(q.get('question') or '')
        choices = q.get('choices')
        correct = q.get('correct_label')
        if not isinstance(choices, list) or not choices:
            out.append(q)
            continue

        m = _BLANK_RE.search(question)
        if m and correct:
            tail = question[m.end():].lstrip()
            nw = _WORD_RE.match(tail)
            next_word = nw.group(0).lower() if nw else ''
            if next_word:
                for c in choices:
                    if not isinstance(c, dict) or c.get('label') != correct:
                        continue
                    text = str(c.get('text') or '').strip()
                    original = text
                    # 反复去掉结尾与空格后第一个词相同的词（最多 3 次）
                    for _ in range(3):
                        words = _WORD_RE.findall(text)
                        if not words or words[-1].lower() != next_word:
                            break
                        text = re.sub(r"[A-Za-z][A-Za-z']*\s*$", '', text).strip()
                    if text:
                        c['text'] = text
                    elif original:
                        c['text'] = original

        # 去重选项，并同步修正答案键
        seen: dict[str, str] = {}
        kept: list = []
        new_correct = correct
        for c in choices:
            if not isinstance(c, dict):
                continue
            key = str(c.get('text') or '').strip().lower()
            if not key:
                continue
            if key in seen:
                if c.get('label') == correct:
                    new_correct = seen[key]
                continue
            seen[key] = c.get('label')
            kept.append(c)

        if kept:
            labels = {c.get('label') for c in kept}
            if new_correct not in labels:
                new_correct = kept[0].get('label')
            q['choices'] = kept
            q['correct_label'] = new_correct
        out.append(q)
    return out


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
        # 修 AI 出题的答案键错误（如选项与空格后的 of 重复）
        fixed_questions = _repair_questions(data.get('questions', []))
        return GrammarResponse(
            topic=req.topic,
            title_en=req.title_en,
            explanation=data.get('explanation', ''),
            rules=[GrammarRule(**r) for r in data.get('rules', [])],
            examples=[GrammarExample(**e) for e in data.get('examples', [])],
            questions=[GrammarQuestion(**q) for q in fixed_questions],
            is_mock=False,
        )
    except Exception as e:
        logger.warning(f"Grammar LLM failed for '{req.topic}', fallback to mock: {e}")
        return _mock_grammar(req)


async def _to_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))

"""错因分析服务"""
from __future__ import annotations

import json

from loguru import logger
from vocab_agent_llm import ChatMessage, ChatOptions

from app.core.llm import get_llm_client
from app.prompts.analyze import build_analyze_messages
from app.schemas.analyze import (
    AnalyzeRequest,
    AnalyzeResponse,
    MistakeCategory,
    MistakeRecord,
)


def _format_records(records: list[MistakeRecord], language: str) -> str:
    """把错题记录格式化成模型可读的文本"""
    lines = []
    for r in records:
        rating_text = {1: "忘记", 2: "困难", 3: "良好", 4: "简单"}.get(r.rating, str(r.rating))
        if language == "en-US":
            rating_text = {1: "Again", 2: "Hard", 3: "Good", 4: "Easy"}.get(r.rating, str(r.rating))
        lines.append(f"- {r.headword} (review #{r.review_count}, rated: {rating_text})")
    return "\n".join(lines)


async def analyze_mistakes(req: AnalyzeRequest) -> AnalyzeResponse:
    """调用 LLM 分析错题模式。"""
    client = get_llm_client()
    records_text = _format_records(req.records, req.language)
    messages = build_analyze_messages(records_text, req.language)
    chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]

    raw = await _to_thread(
        client.chat,
        chat_messages,
        ChatOptions(temperature=0.3, max_tokens=2000),
    )
    logger.debug(f"Analyze LLM raw: {raw[:200]}...")

    try:
        # 解析 JSON
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if "\n" in cleaned:
                cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Analyze JSON parse failed: {e}")
        # 返回降级响应
        return AnalyzeResponse(
            summary="暂时无法生成分析，请稍后重试。" if req.language == "zh-CN" else "Unable to generate analysis, please retry.",
            categories=[],
            suggestions=[],
            strengths=[],
        )

    return AnalyzeResponse(
        summary=data.get("summary", ""),
        categories=[MistakeCategory(**c) for c in data.get("categories", [])],
        suggestions=data.get("suggestions", []),
        strengths=data.get("strengths", []),
    )


# ---- 异步适配 ----
import asyncio
import functools


async def _to_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))
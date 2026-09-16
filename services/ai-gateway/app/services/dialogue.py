"""口语陪练服务

实现：
1. start: 开始对话，AI 开场
2. turn: 用户说一句，AI 回应（含纠错、追问）
3. score: 评估整场对话
"""
from __future__ import annotations

import json
import uuid
from typing import Dict

from loguru import logger
from vocab_agent_llm import ChatMessage, ChatOptions

from app.core.llm import get_llm_client
from app.prompts.dialogue import build_dialogue_messages, build_score_messages
from app.schemas.dialogue import (
    DialogueMessage,
    DialogueScoreRequest,
    DialogueScoreResponse,
    DialogueStartRequest,
    DialogueStartResponse,
    DialogueTurnRequest,
    DialogueTurnResponse,
)

# 内存会话存储（生产用 Redis）
_sessions: Dict[str, list] = {}

# 不同场景的开场白
OPENINGS = {
    "interview": "Hi! Thanks for joining me today. Could you start by briefly introducing yourself and why you're interested in this position?",
    "travel": "Hey there! So I hear you're planning a trip — where are you thinking of going, and what kind of experience are you hoping for?",
    "business": "Good morning. Let's discuss your quarterly report. Could you walk me through your key achievements this quarter?",
    "academic": "Welcome to today's tutorial. Let's start with a quick question — what research topic are you most interested in?",
    "daily": "Hey! How's it going today? What have you been up to?",
}


async def start_dialogue(req: DialogueStartRequest) -> DialogueStartResponse:
    session_id = str(uuid.uuid4())
    opening = OPENINGS.get(req.scenario, OPENINGS["daily"])
    _sessions[session_id] = [
        {"role": "assistant", "content": opening}
    ]
    return DialogueStartResponse(
        session_id=session_id,
        scenario=req.scenario,
        level=req.level,
        opening=opening,
    )


async def turn_dialogue(req: DialogueTurnRequest) -> DialogueTurnResponse:
    """用户说一句，AI 给出回应。"""
    history = _sessions.get(req.session_id)
    if not history:
        raise ValueError(f"Session not found: {req.session_id}")

    # 追加用户消息
    history.append({"role": "user", "content": req.user_text})

    client = get_llm_client()
    messages = build_dialogue_messages(scenario="auto", level="B2", history=history)
    chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]

    raw = await _to_thread(
        client.chat,
        chat_messages,
        ChatOptions(temperature=0.7, max_tokens=800),
    )
    logger.debug(f"Dialogue turn raw: {raw[:200]}...")

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if "\n" in cleaned:
                cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Dialogue turn JSON parse failed: {e}")
        # 兜底：用原始文本作为 assistant_text
        data = {
            "assistant_text": raw,
            "corrections": [],
            "vocabulary_used": [],
            "next_question": "Could you tell me more?",
        }

    # 追加 assistant 消息
    history.append({"role": "assistant", "content": data["assistant_text"]})

    return DialogueTurnResponse(
        assistant_text=data["assistant_text"],
        corrections=data.get("corrections", []),
        vocabulary_used=data.get("vocabulary_used", []),
        next_question=data.get("next_question", ""),
    )


async def score_dialogue(req: DialogueScoreRequest) -> DialogueScoreResponse:
    """评估整场对话。"""
    transcript_text = "\n".join(
        f"{m.role.upper()}: {m.content}" for m in req.transcript
    )
    client = get_llm_client()
    messages = build_score_messages(transcript_text)
    chat_messages = [ChatMessage(role=m["role"], content=m["content"]) for m in messages]

    raw = await _to_thread(
        client.chat,
        chat_messages,
        ChatOptions(temperature=0.3, max_tokens=1500),
    )
    logger.debug(f"Dialogue score raw: {raw[:200]}...")

    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if "\n" in cleaned:
                cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        return DialogueScoreResponse(
            overall_score=0,
            pronunciation=0,
            grammar=0,
            vocabulary=0,
            fluency=0,
            highlights=[],
            improvements=["解析失败，请稍后重试"],
        )

    return DialogueScoreResponse(
        overall_score=float(data.get("overall_score", 0)),
        pronunciation=float(data.get("pronunciation", 0)),
        grammar=float(data.get("grammar", 0)),
        vocabulary=float(data.get("vocabulary", 0)),
        fluency=float(data.get("fluency", 0)),
        highlights=data.get("highlights", []),
        improvements=data.get("improvements", []),
    )


# ---- 异步适配 ----
import asyncio
import functools


async def _to_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))
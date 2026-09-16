"""口语陪练 Schema"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class DialogueStartRequest(BaseModel):
    user_id: str
    scenario: Literal[
        "interview",      # 面试
        "travel",         # 旅行
        "business",       # 商务
        "academic",       # 学术
        "daily",          # 日常
    ] = "interview"
    level: Literal["A2", "B1", "B2", "C1", "C2"] = "B2"
    language: Literal["zh-CN", "en-US"] = "en-US"


class DialogueMessage(BaseModel):
    role: Literal["assistant", "user"]
    content: str
    pronunciation_score: float | None = None  # 0-100（仅 user 消息）
    corrections: list[str] = []  # 仅 user 消息，含纠错


class DialogueStartResponse(BaseModel):
    session_id: str
    scenario: str
    level: str
    opening: str  # AI 开场白


class DialogueTurnRequest(BaseModel):
    session_id: str
    user_text: str  # 用户说的文字（已 ASR 转换）
    audio_url: str | None = None


class DialogueTurnResponse(BaseModel):
    assistant_text: str
    corrections: list[str] = []
    vocabulary_used: list[str] = []  # 用户使用的新词
    next_question: str  # AI 给出的追问


class DialogueScoreRequest(BaseModel):
    session_id: str
    transcript: list[DialogueMessage]


class DialogueScoreResponse(BaseModel):
    overall_score: float = Field(..., ge=0, le=100)
    pronunciation: float
    grammar: float
    vocabulary: float
    fluency: float
    highlights: list[str] = []
    improvements: list[str] = []
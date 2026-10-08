"""AI 学习教练 Schema"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class CoachMessage(BaseModel):
    role: Literal['user', 'assistant']
    content: str = Field(..., max_length=4000)


class CoachChatRequest(BaseModel):
    messages: list[CoachMessage] = Field(..., min_length=1, max_length=20)
    context: dict[str, Any] = {}


class CoachAction(BaseModel):
    type: Literal['set_exam', 'set_daily_goal', 'goto']
    examType: str = ''
    date: str = ''
    target: str = ''
    value: int = 0
    route: str = ''
    label: str = ''


class CoachChatResponse(BaseModel):
    reply: str
    actions: list[CoachAction] = []

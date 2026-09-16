"""Pydantic schema for mistake analysis."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class MistakeRecord(BaseModel):
    headword: str
    rating: Literal[1, 2, 3, 4] = Field(..., description="1=Again, 2=Hard, 3=Good, 4=Easy")
    timestamp: str
    review_count: int = 0  # 已被复习次数


class AnalyzeRequest(BaseModel):
    user_id: str
    records: list[MistakeRecord] = Field(..., min_length=1, max_length=100)
    language: Literal["zh-CN", "en-US"] = "zh-CN"


class MistakeCategory(BaseModel):
    category: Literal[
        "拼写错误", "词义混淆", "用法错误", "发音相似", "长期遗忘", "其他",
        "Spelling", "Meaning", "Usage", "Phonetic", "Long-term Forgetting", "Other",
    ]
    count: int
    examples: list[str] = []


class AnalyzeResponse(BaseModel):
    summary: str
    categories: list[MistakeCategory]
    suggestions: list[str]
    strengths: list[str] = []
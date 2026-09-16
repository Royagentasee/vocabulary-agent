"""阅读理解 Schema"""
from __future__ import annotations

from pydantic import BaseModel, Field


class ReadingRequest(BaseModel):
    passage: str = Field(..., min_length=50, max_length=8000, description="英文文章")
    num_questions: int = Field(default=3, ge=1, le=8, description="题目数量")
    level: str = Field(default="medium", description="难度：easy/medium/hard")


class ReadingChoice(BaseModel):
    label: str  # A/B/C/D
    text: str


class ReadingQuestion(BaseModel):
    question: str
    choices: list[ReadingChoice]
    correct_label: str
    explanation: str


class ReadingResponse(BaseModel):
    summary: str = ""  # 文章摘要
    questions: list[ReadingQuestion] = []
    is_mock: bool = False


# ============ 真题库 ============

class BankItem(BaseModel):
    id: str
    exam: str = 'SAT'
    source: str = ''
    testNo: int | None = None
    module: int | None = None
    questionNo: int | None = None
    passage: str
    question: str
    choices: list[ReadingChoice]
    correctLabel: str
    explanation: str = ''


class BankResponse(BaseModel):
    items: list[BankItem]
    total: int
    exam: str = 'SAT'
    source: str = ''


class BankStatsResponse(BaseModel):
    total: int
    exam: str
    source: str
    byTest: dict[str, int] = {}

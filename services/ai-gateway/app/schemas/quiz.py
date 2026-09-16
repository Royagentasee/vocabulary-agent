"""AI Quiz Schema"""
from __future__ import annotations

from pydantic import BaseModel, Field


class QuizGenerateRequest(BaseModel):
    headword: str = Field(..., description="要出题的单词")
    difficulty: str = Field(default="medium", description="难度等级：easy/medium/hard")
    context: str | None = Field(default=None, description="上下文（如 IELTS/TOEFL）")


class QuizChoice(BaseModel):
    label: str  # A/B/C/D
    text: str


class QuizGenerateResponse(BaseModel):
    headword: str
    sentence: str  # 含 ____ 的句子
    choices: list[QuizChoice]  # 4 个选项
    correct_label: str  # 正确答案（A/B/C/D）
    explanation: str  # 为什么这是正确答案
    difficulty: str


class QuizAnswerRequest(BaseModel):
    headword: str
    selected_label: str  # 用户选择 A/B/C/D


class QuizAnswerResponse(BaseModel):
    correct: bool
    correct_label: str
    explanation: str
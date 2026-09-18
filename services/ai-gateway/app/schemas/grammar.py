"""语法学习 Schema"""
from __future__ import annotations

from pydantic import BaseModel, Field


class GrammarTopic(BaseModel):
    """语法知识点"""
    id: str
    title: str                    # 中文标题，如「定语从句」
    titleEn: str = ''             # 英文标题，如 Relative Clauses
    description: str = ''         # 一句话说明
    difficulty: str = 'medium'    # easy / medium / hard
    examTags: list[str] = []      # IELTS / TOEFL / GRE / SAT


class GrammarRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=80, description="语法点，如「定语从句」")
    title_en: str = Field(default='', max_length=80, description="英文标题（可选）")
    num_questions: int = Field(default=4, ge=1, le=8)


class GrammarChoice(BaseModel):
    label: str
    text: str


class GrammarRule(BaseModel):
    rule: str
    example: str = ''
    example_translation: str = ''


class GrammarExample(BaseModel):
    sentence: str
    translation: str = ''


class GrammarQuestion(BaseModel):
    question: str
    choices: list[GrammarChoice]
    correct_label: str
    explanation: str = ''


class GrammarResponse(BaseModel):
    topic: str
    title_en: str = ''
    explanation: str = ''                     # 整体讲解
    rules: list[GrammarRule] = []             # 核心规则（含例句）
    examples: list[GrammarExample] = []       # 额外例句
    questions: list[GrammarQuestion] = []
    is_mock: bool = False


class GrammarTopicsResponse(BaseModel):
    items: list[GrammarTopic]
    total: int

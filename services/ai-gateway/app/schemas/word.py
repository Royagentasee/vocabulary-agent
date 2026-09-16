"""词条查询 Schema"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.explain import RootAffix


class WordSense(BaseModel):
    pos: str
    definitionEn: str
    definitionCn: str


class WordExample(BaseModel):
    sentence: str
    translation: str
    source: str | None = None


class Word(BaseModel):
    id: str | int  # SQLite 返回 int，Postgres 返回 str
    headword: str
    pos: list[str] = []
    ipa: str = ''
    audioUrl: str = ''
    senses: list[WordSense] = []
    etymology: str = ''
    collocations: list[str] = []
    examTags: list[dict] = []
    examples: list[WordExample] = []
    frq: float | None = None
    translation: str = ''
    rootAffix: RootAffix | None = None


class WordSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=64)
    limit: int = Field(default=20, ge=1, le=100)
    exam_tag: Literal['GENERAL', 'GRE', 'IELTS', 'TOEFL', 'SAT'] | None = None


class WordSearchResponse(BaseModel):
    items: list[Word]
    total: int


class WordDetailResponse(BaseModel):
    word: Word
    similar: list[Word] = []  # 相似词（向量检索）


class WordEmbeddingRequest(BaseModel):
    word_id: str


class RootAffixResponse(BaseModel):
    """单词词根词缀拆解响应"""
    headword: str
    rootAffix: RootAffix | None = None


class WordEmbeddingResponse(BaseModel):
    word_id: str
    embedding: list[float]
    model: str


class MeaningChoice(BaseModel):
    label: str  # A/B/C/D
    text: str


class MeaningQuizResponse(BaseModel):
    headword: str
    ipa: str = ''
    pos: list[str] = []
    choices: list[MeaningChoice]
    correct_label: str
    definition_en: str = ''
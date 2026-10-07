"""拍照翻译 Schema"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class OcrResponse(BaseModel):
    ok: bool = False
    text: str = ''
    wordCount: int = 0
    lineCount: int = 0
    confidence: float = 0.0
    quality: Literal['good', 'fair', 'poor'] = 'poor'


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=6000)


class VocabItem(BaseModel):
    word: str
    meaning: str


class TranslateResponse(BaseModel):
    translation: str = ''
    summary: str = ''
    vocabulary: list[VocabItem] = []

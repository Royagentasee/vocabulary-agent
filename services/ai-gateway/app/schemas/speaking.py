"""口语朗读 Schema"""
from __future__ import annotations

from pydantic import BaseModel, Field


class SpeakingSentence(BaseModel):
    id: str
    text: str                   # 要朗读的英文句子
    translation: str = ''       # 中文意思
    focus: str = ''             # 发音重点，如「th 音」「r/l 区分」
    difficulty: str = 'easy'


class SpeakingAssessRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="目标英文句子")
    transcript: str = Field(..., min_length=1, max_length=1000, description="用户朗读的语音识别结果")


class Mispronounced(BaseModel):
    word: str
    tip: str = ''


class SpeakingAssessResponse(BaseModel):
    accuracy: int = 0           # 0-100 发音准确度
    feedback: str = ''          # 整体评价
    mispronounced: list[Mispronounced] = []
    is_mock: bool = False


class SpeakingSentencesResponse(BaseModel):
    items: list[SpeakingSentence]
    total: int


class TranscribeResponse(BaseModel):
    text: str = ''
    ok: bool = False

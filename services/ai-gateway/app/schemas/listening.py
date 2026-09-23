"""听力练习 Schema"""
from __future__ import annotations

from pydantic import BaseModel


class ListeningChoice(BaseModel):
    label: str
    text: str


class ListeningQuestion(BaseModel):
    question: str
    choices: list[ListeningChoice]
    correct_label: str
    explanation: str = ''


class ListeningPassage(BaseModel):
    id: str
    exam: str = 'TOEFL'            # TOEFL / IELTS
    type: str = ''                 # lecture / conversation / monologue / discussion
    title: str = ''
    passage: str = ''              # 听力文本（前端用 TTS 朗读）
    word_count: int = 0
    questions: list[ListeningQuestion] = []


class ListeningResponse(BaseModel):
    items: list[ListeningPassage]
    total: int


class ListeningStats(BaseModel):
    total: int
    byExam: dict[str, int] = {}

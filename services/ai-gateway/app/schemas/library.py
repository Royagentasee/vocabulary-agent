"""书库（原版阅读）Schema"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class VocabItem(BaseModel):
    word: str
    meaning: str


class StoryQuestion(BaseModel):
    question: str
    choices: list[str] = []
    answer: str = ''
    explanation: str = ''


class BookSummary(BaseModel):
    id: str
    kind: Literal['classic', 'story']
    title: str
    titleZh: str = ''
    author: str = ''
    level: str = ''            # A2 / B1 / B2
    category: str = ''         # 童话奇幻 / 冒险 / 科幻 ...
    blurb: str = ''            # 一句话推荐
    chapterCount: int = 1
    wordCount: int = 0
    letter: str = ''           # 仅 A-Z 小故事


class ChapterSummary(BaseModel):
    index: int
    title: str
    titleZh: str = ''
    wordCount: int = 0


class BookDetail(BookSummary):
    chapters: list[ChapterSummary] = []


class ChapterContent(BaseModel):
    bookId: str
    index: int
    title: str
    titleZh: str = ''
    text: str
    wordCount: int = 0
    prevIndex: Optional[int] = None
    nextIndex: Optional[int] = None
    # 仅 A-Z 小故事带这些
    translation: str = ''
    vocabulary: list[VocabItem] = []
    questions: list[StoryQuestion] = []


class BookListResponse(BaseModel):
    items: list[BookSummary]
    total: int
    categories: list[str] = []
    levels: list[str] = []


class LibraryStats(BaseModel):
    classicCount: int
    storyCount: int
    totalWords: int
    chapters: int
    source: str = 'Project Gutenberg（公共版权）+ AI 原创分级故事'

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


# ---------------- 阅读器点词查义 ----------------


class LookupSense(BaseModel):
    pos: str = ''
    definitionCn: str = ''
    definitionEn: str = ''


class LookupExample(BaseModel):
    sentence: str = ''
    translation: str = ''


class RootAffixInfo(BaseModel):
    prefix: str = ''
    prefixMeaning: str = ''
    root: str = ''
    rootMeaning: str = ''
    suffix: str = ''
    suffixMeaning: str = ''


class WordLookupResponse(BaseModel):
    """点词查义结果：本地词典优先，未收录则由 AI 解释。"""

    word: str
    found: bool = False
    source: Literal['dict', 'ai', 'none'] = 'none'
    headword: str = ''
    ipa: str = ''
    pos: list[str] = []
    translation: str = ''
    senses: list[LookupSense] = []
    examples: list[LookupExample] = []
    rootAffix: Optional[RootAffixInfo] = None
    memoryTip: str = ''

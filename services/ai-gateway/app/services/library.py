"""书库服务

数据来源：
- 世界名著：Project Gutenberg 公共版权作品（app/data/library_books.json）
- A-Z 分级小故事：AI 原创（app/data/story_bank.json）

书籍正文按需加载（章节级），列表只返回摘要，避免一次把 10MB 读进内存。
"""
from __future__ import annotations

import json
import threading
from pathlib import Path

from loguru import logger

from app.schemas.library import (
    BookDetail,
    BookListResponse,
    BookSummary,
    ChapterContent,
    ChapterSummary,
    LibraryStats,
)

_DATA = Path(__file__).resolve().parent.parent / 'data'
_CLASSIC_FILE = _DATA / 'library_books.json'
_STORY_FILE = _DATA / 'story_bank.json'

_lock = threading.Lock()
_classics: list[dict] = []
_stories: list[dict] = []
_loaded = False


def _load() -> None:
    global _classics, _stories, _loaded
    if _loaded:
        return
    with _lock:
        if _loaded:
            return
        if _CLASSIC_FILE.exists():
            try:
                _classics = json.loads(_CLASSIC_FILE.read_text(encoding='utf-8'))
                logger.info(f'名著库已加载：{len(_classics)} 本 ({_CLASSIC_FILE})')
            except Exception as e:
                logger.warning(f'名著库加载失败: {e}')
        if _STORY_FILE.exists():
            try:
                _stories = json.loads(_STORY_FILE.read_text(encoding='utf-8'))
                logger.info(f'分级故事库已加载：{len(_stories)} 篇 ({_STORY_FILE})')
            except Exception as e:
                logger.warning(f'故事库加载失败: {e}')
        _loaded = True


# ---------------- 内部：统一成 BookSummary ----------------


def _classic_summary(b: dict) -> BookSummary:
    return BookSummary(
        id=b['id'], kind='classic', title=b['title'], titleZh=b.get('titleZh', ''),
        author=b.get('author', ''), level=b.get('level', ''), category=b.get('category', ''),
        blurb=b.get('blurb', ''), chapterCount=b.get('chapterCount', 1),
        wordCount=b.get('wordCount', 0),
    )


def _story_summary(s: dict) -> BookSummary:
    return BookSummary(
        id=s['id'], kind='story', title=s['title'], titleZh=s.get('titleZh', ''),
        author='AI 原创', level=s.get('level', ''), category='分级小故事',
        blurb=f"{s.get('levelName', '')} · {s.get('wordCount', 0)} 词",
        chapterCount=1, wordCount=s.get('wordCount', 0), letter=s.get('letter', ''),
    )


def _find(book_id: str) -> tuple[dict, str] | None:
    _load()
    for b in _classics:
        if b['id'] == book_id:
            return b, 'classic'
    for s in _stories:
        if s['id'] == book_id:
            return s, 'story'
    return None


# ---------------- 对外接口 ----------------


def list_books(
    kind: str = '',
    level: str = '',
    category: str = '',
    letter: str = '',
    q: str = '',
    limit: int = 200,
) -> BookListResponse:
    _load()
    items: list[BookSummary] = []

    if kind in ('', 'classic'):
        items += [_classic_summary(b) for b in _classics]
    if kind in ('', 'story'):
        items += [_story_summary(s) for s in _stories]

    if level:
        items = [i for i in items if i.level == level]
    if category:
        items = [i for i in items if i.category == category]
    if letter:
        items = [i for i in items if i.letter.upper() == letter.upper()]
    if q:
        kw = q.lower()
        items = [i for i in items
                 if kw in i.title.lower() or kw in i.titleZh.lower() or kw in i.author.lower()]

    # 排序：小故事按字母+难度，名著按难度+书名
    items.sort(key=lambda x: (0 if x.kind == 'story' else 1, x.level, x.letter or x.title))
    total = len(items)
    cats = sorted({i.category for i in items if i.category})
    levels = sorted({i.level for i in items if i.level})
    return BookListResponse(items=items[:limit], total=total, categories=cats, levels=levels)


def get_book(book_id: str) -> BookDetail | None:
    found = _find(book_id)
    if not found:
        return None
    raw, kind = found

    if kind == 'classic':
        base = _classic_summary(raw)
        chaps = [
            ChapterSummary(index=i, title=c.get('title', f'Chapter {i+1}'),
                           titleZh=c.get('titleZh', ''), wordCount=len(c.get('text', '').split()))
            for i, c in enumerate(raw.get('chapters', []))
        ]
    else:
        base = _story_summary(raw)
        chaps = [ChapterSummary(index=0, title=raw.get('title', ''), titleZh=raw.get('titleZh', ''),
                                wordCount=raw.get('wordCount', 0))]
    return BookDetail(**base.model_dump(), chapters=chaps)


def get_chapter(book_id: str, index: int) -> ChapterContent | None:
    found = _find(book_id)
    if not found:
        return None
    raw, kind = found

    if kind == 'classic':
        chaps = raw.get('chapters', [])
        if index < 0 or index >= len(chaps):
            return None
        c = chaps[index]
        text = c.get('text', '')
        return ChapterContent(
            bookId=book_id, index=index, title=c.get('title', f'Chapter {index+1}'),
            titleZh=c.get('titleZh', ''), text=text, wordCount=len(text.split()),
            prevIndex=index - 1 if index > 0 else None,
            nextIndex=index + 1 if index + 1 < len(chaps) else None,
        )

    # 小故事：单章，附带翻译/生词/题目
    if index != 0:
        return None
    text = raw.get('text', '')
    return ChapterContent(
        bookId=book_id, index=0, title=raw.get('title', ''), titleZh=raw.get('titleZh', ''),
        text=text, wordCount=raw.get('wordCount', len(text.split())),
        prevIndex=None, nextIndex=None,
        translation=raw.get('translation', ''),
        vocabulary=raw.get('vocabulary', []),
        questions=raw.get('questions', []),
    )


def stats() -> LibraryStats:
    _load()
    cw = sum(b.get('wordCount', 0) for b in _classics)
    sw = sum(s.get('wordCount', 0) for s in _stories)
    cc = sum(b.get('chapterCount', 0) for b in _classics)
    return LibraryStats(
        classicCount=len(_classics), storyCount=len(_stories),
        totalWords=cw + sw, chapters=cc + len(_stories),
    )

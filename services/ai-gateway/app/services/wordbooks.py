"""词书

从 words.exam_tags 实时统计每个考试标签的词数，不依赖空的 wordbooks 表。
这样词库一扩充，词书数量自动跟着变。
"""
from __future__ import annotations

import json
from typing import Optional

from loguru import logger

# (id, 名称, 考试标签, 说明, 配色, 难度)
BOOKS = [
    ('zk', '中考核心词汇', '中考', '初中必备，打地基', '#22c55e', 'A2'),
    ('gk', '高考核心词汇', '高考', '高中三年必备', '#3b82f6', 'B1'),
    ('cet4', '四级词汇', '四级', '大学英语四级', '#6366f1', 'B1'),
    ('cet6', '六级词汇', '六级', '大学英语六级', '#8b5cf6', 'B2'),
    ('ky', '考研词汇', '考研', '考研英语核心', '#ec4899', 'B2'),
    ('ielts', '雅思词汇', 'IELTS', '雅思 6.5+ 必备', '#10b981', 'B2'),
    ('toefl', '托福词汇', 'TOEFL', '托福核心词汇', '#f59e0b', 'B2'),
    ('gre', 'GRE 词汇', 'GRE', 'GRE 高阶词汇', '#111827', 'C1'),
]

_cache: Optional[dict[str, int]] = None


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'wordbooks: 数据库不可用 {e}')
        return None


def _counts() -> dict[str, int]:
    """统计每个考试标签的词数（解析 JSON，比 LIKE 匹配可靠）"""
    global _cache
    if _cache is not None:
        return _cache

    db = _backend()
    if not db:
        _cache = {}
        return _cache

    counts: dict[str, int] = {}
    try:
        with db.conn() as conn:
            cur = conn.execute(
                "SELECT exam_tags FROM words WHERE exam_tags IS NOT NULL AND exam_tags != ''"
            )
            for (raw,) in cur.fetchall():
                try:
                    tags = json.loads(raw or '[]')
                except Exception:
                    continue
                if not isinstance(tags, list):
                    continue
                seen = set()
                for t in tags:
                    name = t.get('exam') if isinstance(t, dict) else t
                    if name and name not in seen:
                        seen.add(name)
                        counts[name] = counts.get(name, 0) + 1
    except Exception as e:
        logger.warning(f'词书统计失败: {e}')

    _cache = counts
    return counts


def list_books() -> list[dict]:
    counts = _counts()
    out = []
    for bid, name, tag, desc, color, level in BOOKS:
        out.append({
            'id': bid,
            'name': name,
            'examTag': tag,
            'description': desc,
            'coverColor': color,
            'level': level,
            'wordCount': counts.get(tag, 0),
        })
    return out


def get_book(book_id: str) -> Optional[dict]:
    for b in list_books():
        if b['id'] == book_id:
            return b
    return None


def exam_tag_of(book_id: str) -> str:
    for bid, _name, tag, *_ in BOOKS:
        if bid == book_id:
            return tag
    return ''

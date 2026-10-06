"""分级阅读题库：初中 / 高中 / 大学（AI 原创，对齐国内考试风格）

数据文件：app/data/reading_levels.json
结构与 SAT 真题不同：一篇「文章 + 4 题」为一条记录。
"""
from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Optional

from loguru import logger

_BANK_PATH = Path(__file__).resolve().parent.parent / 'data' / 'reading_levels.json'
_cache: Optional[list[dict]] = None

LEVEL_NAMES = {'junior': '初中', 'senior': '高中', 'college': '大学'}


def _load() -> list[dict]:
    global _cache
    if _cache is None:
        try:
            _cache = json.loads(_BANK_PATH.read_text(encoding='utf-8'))
            logger.info(f'分级阅读库已加载：{len(_cache)} 篇 ({_BANK_PATH})')
        except Exception as e:
            logger.warning(f'分级阅读库加载失败：{e}')
            _cache = []
    return _cache


def get_stats() -> dict:
    bank = _load()
    by_level: dict[str, int] = {}
    words: dict[str, int] = {}
    for it in bank:
        lv = it.get('level', '')
        by_level[lv] = by_level.get(lv, 0) + 1
        words[lv] = words.get(lv, 0) + int(it.get('wordCount') or 0)
    return {
        'total': len(bank),
        'questionCount': sum(len(it.get('questions') or []) for it in bank),
        'byLevel': [
            {
                'level': lv,
                'name': LEVEL_NAMES.get(lv, lv),
                'count': by_level.get(lv, 0),
                'words': words.get(lv, 0),
                'exam': next((i.get('exam', '') for i in bank if i.get('level') == lv), ''),
            }
            for lv in ('junior', 'senior', 'college')
            if by_level.get(lv)
        ],
        'source': 'AI 原创，难度对齐中考 / 高考 / 四六级·考研',
    }


def list_items(level: str = '', topic: str = '', limit: int = 20, offset: int = 0,
               shuffle: bool = False) -> tuple[list[dict], int]:
    bank = _load()
    items = bank
    if level:
        items = [it for it in items if it.get('level') == level]
    if topic:
        items = [it for it in items if it.get('topic') == topic]
    if shuffle:
        items = list(items)
        random.shuffle(items)
    total = len(items)
    page = items[offset:offset + limit]
    # 列表不返回完整正文与答案，只给摘要，减小体积
    out = []
    for it in page:
        d = {k: v for k, v in it.items() if k not in ('passage', 'questions')}
        passage = (it.get('passage') or '').replace('\n', ' ')
        d['excerpt'] = passage[:120] + ('…' if len(passage) > 120 else '')
        d['questionCount'] = len(it.get('questions') or [])
        out.append(d)
    return out, total


def get_item(item_id: str) -> Optional[dict]:
    for it in _load():
        if it.get('id') == item_id:
            return it
    return None


def list_topics(level: str = '') -> list[str]:
    bank = _load()
    if level:
        bank = [it for it in bank if it.get('level') == level]
    return sorted({it.get('topic', '') for it in bank if it.get('topic')})

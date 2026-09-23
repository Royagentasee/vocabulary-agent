"""听力题库服务

数据来源：AI 生成的原创托福/雅思风格听力材料（见 tools/seed-data/generate_listening.py）。
真题音频受版权保护，故使用原创文本 + 前端 TTS 朗读。
"""
from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Optional

from loguru import logger

_BANK_PATH = Path(__file__).resolve().parent.parent / 'data' / 'listening_bank.json'
_cache: Optional[list[dict]] = None


def _load() -> list[dict]:
    global _cache
    if _cache is None:
        try:
            _cache = json.loads(_BANK_PATH.read_text(encoding='utf-8'))
            logger.info(f'听力题库已加载：{len(_cache)} 篇 ({_BANK_PATH})')
        except Exception as e:
            logger.warning(f'听力题库加载失败：{e}')
            _cache = []
    return _cache


def _with_word_count(item: dict) -> dict:
    item = dict(item)
    item['word_count'] = len((item.get('passage') or '').split())
    return item


def get_stats() -> dict:
    bank = _load()
    by_exam: dict[str, int] = {}
    for it in bank:
        by_exam[it.get('exam', '')] = by_exam.get(it.get('exam', ''), 0) + 1
    return {'total': len(bank), 'byExam': by_exam}


def list_passages(exam: Optional[str] = None, limit: int = 50, shuffle: bool = False) -> tuple[list[dict], int]:
    bank = _load()
    items = [it for it in bank if exam is None or it.get('exam') == exam]
    total = len(items)
    if shuffle:
        picked = random.sample(items, min(limit, total)) if total else []
    else:
        picked = items[:limit]
    return [_with_word_count(it) for it in picked], total

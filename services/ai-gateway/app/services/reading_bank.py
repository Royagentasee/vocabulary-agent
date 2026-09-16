"""真题库服务：加载官方真题（College Board 官方 SAT 练习题为公开可下载材料）

数据文件：app/data/reading_bank.json
"""
from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Optional

from loguru import logger

_BANK_PATH = Path(__file__).resolve().parent.parent / 'data' / 'reading_bank.json'
_cache: Optional[list[dict]] = None


def _load() -> list[dict]:
    global _cache
    if _cache is None:
        try:
            _cache = json.loads(_BANK_PATH.read_text(encoding='utf-8'))
            logger.info(f'真题库已加载：{len(_cache)} 题 ({_BANK_PATH})')
        except Exception as e:
            logger.warning(f'真题库加载失败：{e}')
            _cache = []
    return _cache


def get_stats() -> dict:
    bank = _load()
    tests: dict[str, int] = {}
    for it in bank:
        key = str(it.get('testNo'))
        tests[key] = tests.get(key, 0) + 1
    return {
        'total': len(bank),
        'exam': 'SAT',
        'source': 'College Board 官方 SAT Practice Tests',
        'byTest': tests,
    }


def list_items(limit: int = 10, offset: int = 0, test_no: Optional[int] = None,
               shuffle: bool = False) -> tuple[list[dict], int]:
    bank = _load()
    items = [it for it in bank if test_no is None or it.get('testNo') == test_no]
    total = len(items)
    if shuffle:
        picked = random.sample(items, min(limit, total)) if total else []
    else:
        picked = items[offset:offset + limit]
    return picked, total

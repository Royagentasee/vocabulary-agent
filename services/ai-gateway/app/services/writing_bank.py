"""写作真题库服务

数据来源：ETS 官方公开的 GRE Analytical Writing 题库
  Issue:    https://www.ets.org/pdfs/gre/issue-pool.pdf
  Argument: https://www.ets.org/content/dam/ets-org/pdfs/gre/argument-pool.pdf
"""
from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Optional

from loguru import logger

_BANK_PATH = Path(__file__).resolve().parent.parent / 'data' / 'writing_prompt_bank.json'
_cache: Optional[list[dict]] = None


def _load() -> list[dict]:
    global _cache
    if _cache is None:
        try:
            _cache = json.loads(_BANK_PATH.read_text(encoding='utf-8'))
            logger.info(f'写作真题库已加载：{len(_cache)} 题 ({_BANK_PATH})')
        except Exception as e:
            logger.warning(f'写作真题库加载失败：{e}')
            _cache = []
    return _cache


def get_stats() -> dict:
    bank = _load()
    by_type: dict[str, int] = {}
    for it in bank:
        by_type[it.get('taskType', 'unknown')] = by_type.get(it.get('taskType', 'unknown'), 0) + 1
    return {
        'total': len(bank),
        'byType': by_type,
        'source': 'ETS 官方 GRE Analytical Writing 题库',
    }


def list_prompts(limit: int = 10, offset: int = 0, task_type: Optional[str] = None,
                 shuffle: bool = False) -> tuple[list[dict], int]:
    bank = _load()
    items = [it for it in bank if task_type is None or it.get('taskType') == task_type]
    total = len(items)
    if shuffle:
        picked = random.sample(items, min(limit, total)) if total else []
    else:
        picked = items[offset:offset + limit]
    return picked, total

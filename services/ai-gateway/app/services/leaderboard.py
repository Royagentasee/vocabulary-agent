"""周排行榜

数据来源：user_state 里同步上来的 points.dailyEarned
（形如 {'2026-10-08': {'learn': 20, 'checkin': 5}}），按最近 7 天求和。

隐私：不暴露 user id 与同步码，只给一个稳定的化名。
"""
from __future__ import annotations

import hashlib
import json
from datetime import date, timedelta
from typing import Optional

from loguru import logger

_ADJ = ['勤学的', '坚持的', '早起的', '夜读的', '专注的', '认真的', '踏实的', '飞快的']
_NOUN = ['同学', '少年', '学者', '旅人', '剑客', '小猫', '海豚', '星星']


def display_name(user_id: str) -> str:
    """由 user id 稳定生成化名（同一用户每次一样，但不暴露 id）"""
    h = int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16)
    return f'{_ADJ[h % 8]}{_NOUN[(h // 8) % 8]}'


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'leaderboard: 数据库不可用 {e}')
        return None


def _recent_days(n: int = 7) -> list[str]:
    today = date.today()
    return [(today - timedelta(days=i)).isoformat() for i in range(n)]


def weekly(limit: int = 50, me: str = '') -> dict:
    """返回最近 7 天的积分排行"""
    db = _backend()
    if not db:
        return {'items': [], 'total': 0, 'period': '最近 7 天', 'me': None}

    days = set(_recent_days(7))
    rows: list[tuple[str, int]] = []

    try:
        with db.conn() as conn:
            # 只取有数据的用户
            cur = conn.execute(
                "SELECT user_id, data FROM user_state WHERE data IS NOT NULL AND data != '{}'"
            )
            for user_id, raw in cur.fetchall():
                try:
                    data = json.loads(raw or '{}')
                except Exception:
                    continue
                de = ((data.get('points') or {}).get('dailyEarned') or {})
                total = 0
                for day, by_reason in de.items():
                    if day not in days or not isinstance(by_reason, dict):
                        continue
                    total += sum(v for v in by_reason.values() if isinstance(v, (int, float)))
                if total > 0:
                    rows.append((user_id, int(total)))
    except Exception as e:
        logger.warning(f'排行榜查询失败: {e}')
        return {'items': [], 'total': 0, 'period': '最近 7 天', 'me': None}

    rows.sort(key=lambda x: -x[1])
    items = []
    me_item: Optional[dict] = None
    for i, (uid, pts) in enumerate(rows):
        item = {
            'rank': i + 1,
            'name': display_name(uid),
            'points': pts,
            'isMe': bool(me and uid == me),
        }
        if i < limit:
            items.append(item)
        if item['isMe']:
            me_item = item

    return {
        'items': items,
        'total': len(rows),
        'period': '最近 7 天',
        'me': me_item,
    }

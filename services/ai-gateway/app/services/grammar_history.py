"""记录已经出过的语法题，让同一知识点每次生成的题目都不一样

问题：语法出题的提示词是固定的，温度又不高，导致每次点同一个知识点
都会生成高度相似甚至完全相同的 4 道题（用户「刷新后有一两题重复」）。

做法：把每个知识点出过的题干存下来，下次生成时把它们作为「必须回避」
的清单塞进提示词，并随机给一个语境提示（日常/职场/学术/新闻…），
强制换角度。

只保留每个知识点最近 60 条，避免库无限增长。
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

from loguru import logger

_ready = False
_KEEP_PER_TOPIC = 60

_SCHEMA = """
CREATE TABLE IF NOT EXISTS grammar_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    topic      TEXT NOT NULL,
    question   TEXT NOT NULL,
    q_norm     TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gh_topic ON grammar_history (topic, id DESC);
"""


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'grammar_history: 数据库不可用 {e}')
        return None


def _ensure_schema(db) -> None:
    global _ready
    if _ready:
        return
    with db.conn() as conn:
        conn.executescript(_SCHEMA)
        conn.commit()
    _ready = True


def _norm(s: str) -> str:
    return re.sub(r'[^a-z0-9\u4e00-\u9fff]+', '', str(s or '').lower())


def recent(topic: str, limit: int = 24) -> list[str]:
    """该知识点最近出过的题干（越近越靠前）"""
    db = _backend()
    if not db:
        return []
    try:
        _ensure_schema(db)
        with db.conn() as conn:
            rows = conn.execute(
                'SELECT question FROM grammar_history WHERE topic = ? ORDER BY id DESC LIMIT ?',
                (topic, max(1, min(int(limit), 60))),
            ).fetchall()
        return [r['question'] for r in rows if r['question']]
    except Exception as e:
        logger.warning(f'grammar_history.recent 失败: {e}')
        return []


def remember(topic: str, questions: list[str]) -> None:
    """记下本次出的题干，并裁剪到每个知识点最近 60 条"""
    db = _backend()
    if not db or not questions:
        return
    try:
        _ensure_schema(db)
        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        with db.conn() as conn:
            for q in questions:
                q = (q or '').strip()
                if not q:
                    continue
                conn.execute(
                    'INSERT INTO grammar_history (topic, question, q_norm, created_at) '
                    'VALUES (?,?,?,?)',
                    (topic, q[:500], _norm(q), now),
                )
            conn.execute(
                'DELETE FROM grammar_history WHERE topic = ? AND id NOT IN '
                '(SELECT id FROM grammar_history WHERE topic = ? ORDER BY id DESC LIMIT ?)',
                (topic, topic, _KEEP_PER_TOPIC),
            )
            conn.commit()
    except Exception as e:
        logger.warning(f'grammar_history.remember 失败: {e}')

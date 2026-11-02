"""题目报错

用户在 App 里发现某道题答案错了 / 解析有问题，点一下就能报上来，
作者在后台查看并修正。

设计：
- 只存最小信息：题面、选项、我们标定的答案、用户认为的答案、备注
- 不采集 IP、不采集设备指纹
- 同一题重复报错会累加次数，不会刷屏
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from loguru import logger

_ready = False

_SCHEMA = """
CREATE TABLE IF NOT EXISTS question_reports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT DEFAULT '',
    kind       TEXT NOT NULL,
    topic      TEXT DEFAULT '',
    question   TEXT NOT NULL,
    options    TEXT DEFAULT '[]',
    correct    TEXT DEFAULT '',
    chosen     TEXT DEFAULT '',
    note       TEXT DEFAULT '',
    times      INTEGER DEFAULT 1,
    status     TEXT DEFAULT 'open',
    created_at TEXT NOT NULL,
    handled_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON question_reports (status, id DESC);
"""

KIND_LABEL = {
    'grammar': '语法',
    'reading': '阅读',
    'listening': '听力',
    'quiz': '词汇测验',
}


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'feedback: 数据库不可用 {e}')
        return None


def _ensure_schema(db) -> None:
    global _ready
    if _ready:
        return
    with db.conn() as conn:
        conn.executescript(_SCHEMA)
        conn.commit()
    _ready = True


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def create_report(kind: str, question: str, options: list[str],
                  correct: str = '', chosen: str = '', note: str = '',
                  topic: str = '', user_id: str = '') -> dict:
    """记录一条报错；同一题重复报错只累加次数"""
    db = _backend()
    if not db:
        return {'ok': False, 'reason': 'db_unavailable'}

    _ensure_schema(db)
    q = (question or '').strip()[:2000]
    if not q:
        return {'ok': False, 'reason': 'empty_question'}

    kind = (kind or 'quiz').strip()[:20]
    opts_json = json.dumps(options or [], ensure_ascii=False)[:4000]

    with db.conn() as conn:
        row = conn.execute(
            'SELECT id, times FROM question_reports WHERE question = ? AND kind = ?',
            (q, kind),
        ).fetchone()
        if row:
            conn.execute(
                'UPDATE question_reports SET times = times + 1, chosen = ?, note = ? WHERE id = ?',
                ((chosen or '')[:500], (note or '')[:1000], row['id']),
            )
            conn.commit()
            return {'ok': True, 'id': row['id'], 'times': int(row['times']) + 1, 'merged': True}

        conn.execute(
            'INSERT INTO question_reports '
            '(user_id, kind, topic, question, options, correct, chosen, note, times, status, created_at) '
            'VALUES (?,?,?,?,?,?,?,?,1,?,?)',
            ((user_id or '')[:64], kind, (topic or '')[:200], q, opts_json,
             (correct or '')[:500], (chosen or '')[:500], (note or '')[:1000],
             'open', _now()),
        )
        conn.commit()
    return {'ok': True, 'merged': False}


def list_reports(status: str = 'open', limit: int = 100) -> dict:
    db = _backend()
    if not db:
        return {'items': [], 'total': 0}
    _ensure_schema(db)
    limit = max(1, min(int(limit or 100), 300))

    with db.conn() as conn:
        if status == 'all':
            rows = conn.execute(
                'SELECT * FROM question_reports ORDER BY id DESC LIMIT ?', (limit,)
            ).fetchall()
            total = conn.execute('SELECT COUNT(*) c FROM question_reports').fetchone()['c']
        else:
            rows = conn.execute(
                'SELECT * FROM question_reports WHERE status = ? ORDER BY id DESC LIMIT ?',
                (status, limit),
            ).fetchall()
            total = conn.execute(
                'SELECT COUNT(*) c FROM question_reports WHERE status = ?', (status,)
            ).fetchone()['c']

    items = []
    for r in rows:
        d = dict(r)
        try:
            d['options'] = json.loads(d.get('options') or '[]')
        except Exception:
            d['options'] = []
        d['kindLabel'] = KIND_LABEL.get(d.get('kind', ''), d.get('kind', ''))
        items.append(d)
    return {'items': items, 'total': int(total)}


def set_status(report_id: int, status: str) -> dict:
    db = _backend()
    if not db:
        return {'ok': False}
    _ensure_schema(db)
    st = status if status in ('open', 'fixed', 'ignored') else 'fixed'
    with db.conn() as conn:
        conn.execute(
            'UPDATE question_reports SET status = ?, handled_at = ? WHERE id = ?',
            (st, _now(), int(report_id)),
        )
        conn.commit()
    return {'ok': True, 'id': int(report_id), 'status': st}


def stats() -> dict:
    db = _backend()
    if not db:
        return {'open': 0, 'fixed': 0, 'ignored': 0}
    _ensure_schema(db)
    with db.conn() as conn:
        out = {}
        for st in ('open', 'fixed', 'ignored'):
            out[st] = int(conn.execute(
                'SELECT COUNT(*) c FROM question_reports WHERE status = ?', (st,)
            ).fetchone()['c'])
    return out

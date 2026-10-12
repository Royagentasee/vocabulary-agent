"""付款申报

为什么需要：个人收款码无法自动开通。但「用户付款 → 加微信 → 你回一个码」
这个流程用户很麻烦，你也容易漏。

改成：
  ① 用户付款后在 App 里点「我已付款」（带上自己的同步码，可选填备注）
  ② 你在后台看到申报列表
  ③ 你核对微信收款记录 → 点「确认开通」
  ④ 用户下次打开 App 自动变会员（不用发码、不用加微信）

激活码仍然保留，用于赠送、活动等场景。
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from loguru import logger

_SCHEMA = """
CREATE TABLE IF NOT EXISTS payment_claims (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    sync_code  TEXT DEFAULT '',
    amount     REAL DEFAULT 0,
    note       TEXT DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'pending',
    days       INTEGER DEFAULT 30,
    created_at TEXT NOT NULL,
    handled_at TEXT DEFAULT '',
    handled_by TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_claims_status ON payment_claims (status, created_at);
CREATE INDEX IF NOT EXISTS idx_claims_user ON payment_claims (user_id);
"""

_ready = False


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'claims: 数据库不可用 {e}')
        return None


def _ensure(db) -> None:
    global _ready
    if _ready:
        return
    try:
        with db.conn() as conn:
            conn.executescript(_SCHEMA)
            conn.commit()
        _ready = True
    except Exception as e:
        logger.warning(f'claims 建表失败: {e}')


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def create_claim(user_id: str, note: str = '', amount: float = 9.9) -> dict:
    """用户申报已付款"""
    db = _backend()
    if not db:
        return {'ok': False, 'reason': 'db'}
    _ensure(db)

    note = (note or '').strip()[:200]
    try:
        with db.conn() as conn:
            # 同一个用户已有待处理申报就别重复提交
            row = conn.execute(
                "SELECT id FROM payment_claims WHERE user_id=? AND status='pending'",
                (user_id,),
            ).fetchone()
            if row:
                return {'ok': True, 'duplicate': True, 'id': row['id']}

            sync_code = ''
            u = conn.execute(
                'SELECT sync_code FROM app_users WHERE id=?', (user_id,)
            ).fetchone()
            if u:
                sync_code = u['sync_code'] or ''

            cur = conn.execute(
                'INSERT INTO payment_claims (user_id, sync_code, amount, note, status,'
                ' created_at) VALUES (?,?,?,?,?,?)',
                (user_id, sync_code, float(amount or 0), note, 'pending', _now()),
            )
            conn.commit()
            return {'ok': True, 'id': cur.lastrowid}
    except Exception as e:
        logger.warning(f'申报失败 {user_id}: {e}')
        return {'ok': False, 'reason': 'error'}


def my_claim(user_id: str) -> Optional[dict]:
    """我最近一次申报的状态"""
    db = _backend()
    if not db:
        return None
    _ensure(db)
    try:
        with db.conn() as conn:
            row = conn.execute(
                'SELECT id, status, created_at, handled_at, days, note'
                ' FROM payment_claims WHERE user_id=? ORDER BY id DESC LIMIT 1',
                (user_id,),
            ).fetchone()
        return dict(row) if row else None
    except Exception:
        return None


def list_claims(status: str = 'pending', limit: int = 100) -> list[dict]:
    """后台：申报列表"""
    db = _backend()
    if not db:
        return []
    _ensure(db)
    try:
        with db.conn() as conn:
            if status and status != 'all':
                rows = conn.execute(
                    'SELECT * FROM payment_claims WHERE status=?'
                    ' ORDER BY created_at DESC LIMIT ?',
                    (status, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    'SELECT * FROM payment_claims ORDER BY created_at DESC LIMIT ?',
                    (limit,),
                ).fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.warning(f'读申报失败: {e}')
        return []


def approve(claim_id: int, days: int = 30, who: str = 'admin') -> dict:
    """确认开通：直接把会员期打到这个用户账上"""
    db = _backend()
    if not db:
        return {'ok': False, 'reason': 'db'}
    _ensure(db)

    days = max(1, min(3650, int(days)))
    now = datetime.now(timezone.utc)
    try:
        with db.conn() as conn:
            row = conn.execute(
                'SELECT user_id, status FROM payment_claims WHERE id=?', (claim_id,)
            ).fetchone()
            if not row:
                return {'ok': False, 'reason': 'not_found'}
            if row['status'] != 'pending':
                return {'ok': False, 'reason': 'handled'}

            uid = row['user_id']
            cur = conn.execute(
                'SELECT pro_until, member_until FROM app_users WHERE id=?', (uid,)
            ).fetchone()

            base = now
            if cur:
                for cand in (cur['pro_until'], cur['member_until']):
                    if not cand:
                        continue
                    try:
                        d = datetime.fromisoformat(str(cand).replace('Z', '+00:00'))
                        if d.tzinfo is None:
                            d = d.replace(tzinfo=timezone.utc)
                        if d > base:
                            base = d
                    except Exception:
                        continue

            until = (base + timedelta(days=days)).isoformat(timespec='seconds')
            conn.execute('UPDATE app_users SET pro_until=? WHERE id=?', (until, uid))
            conn.execute(
                "UPDATE payment_claims SET status='approved', days=?, handled_at=?,"
                " handled_by=? WHERE id=?",
                (days, _now(), who, claim_id),
            )
            conn.commit()
        logger.info(f'申报通过 #{claim_id} user={uid} 至 {until}')
        return {'ok': True, 'userId': uid, 'proUntil': until, 'days': days}
    except Exception as e:
        logger.warning(f'通过申报失败 #{claim_id}: {e}')
        return {'ok': False, 'reason': 'error'}


def reject(claim_id: int, who: str = 'admin') -> dict:
    db = _backend()
    if not db:
        return {'ok': False, 'reason': 'db'}
    _ensure(db)
    try:
        with db.conn() as conn:
            conn.execute(
                "UPDATE payment_claims SET status='rejected', handled_at=?, handled_by=?"
                " WHERE id=? AND status='pending'",
                (_now(), who, claim_id),
            )
            conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'reason': str(e)[:60]}


def stats() -> dict:
    db = _backend()
    if not db:
        return {'pending': 0, 'approved': 0, 'rejected': 0, 'revenue': 0.0}
    _ensure(db)
    try:
        with db.conn() as conn:
            def c(sql: str) -> int:
                return int(conn.execute(sql).fetchone()[0] or 0)
            pending = c("SELECT COUNT(*) FROM payment_claims WHERE status='pending'")
            approved = c("SELECT COUNT(*) FROM payment_claims WHERE status='approved'")
            rejected = c("SELECT COUNT(*) FROM payment_claims WHERE status='rejected'")
            rev = conn.execute(
                "SELECT COALESCE(SUM(amount),0) FROM payment_claims WHERE status='approved'"
            ).fetchone()[0]
        return {'pending': pending, 'approved': approved, 'rejected': rejected,
                'revenue': round(float(rev or 0), 2)}
    except Exception:
        return {'pending': 0, 'approved': 0, 'rejected': 0, 'revenue': 0.0}

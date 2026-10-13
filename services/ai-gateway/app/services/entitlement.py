"""会员权限与试用期

商业模式：
- 新用户 3 天全功能免费试用
- 试用结束后，只有「单词学习」和「书本阅读」永久免费
- 其余模块需要会员（¥9.9/月）

收款现实：个人收款码无法自动扣费，所以走「扫码付款 → 激活码」。
等拿到微信支付商户号后可平滑换成自动订阅（只需改兑换入口）。
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from loguru import logger

TRIAL_DAYS = 3
PRO_PRICE = 9.9          # 元/月

# 永久免费的路由（单词学习 + 书本阅读 + 基础功能）
FREE_ROUTES = {
    '/', '/path', '/plan', '/points', '/wordbooks', '/learn', '/review',
    '/wrongbook', '/library', '/account', '/support', '/guide', '/badges',
    '/stats', '/ui', '/admin',
}

# 需要会员的路由
PRO_ROUTES = {
    '/listening', '/news', '/speaking', '/dialogue', '/writing', '/reading',
    '/photo', '/grammar', '/coach',
}

_SCHEMA = """
CREATE TABLE IF NOT EXISTS redeem_codes (
    code       TEXT PRIMARY KEY,
    days       INTEGER NOT NULL DEFAULT 30,
    note       TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    used_by    TEXT DEFAULT '',
    used_at    TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_redeem_used ON redeem_codes (used_by);
"""

_MIGRATIONS = [
    "ALTER TABLE app_users ADD COLUMN trial_started_at TEXT DEFAULT ''",
    "ALTER TABLE app_users ADD COLUMN pro_until TEXT DEFAULT ''",
]

_ready = False


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'entitlement: 数据库不可用 {e}')
        return None


def _ensure(db) -> None:
    global _ready
    if _ready:
        return
    try:
        with db.conn() as conn:
            conn.executescript(_SCHEMA)
            for sql in _MIGRATIONS:
                try:
                    conn.execute(sql)
                except Exception:
                    pass          # 列已存在
            conn.commit()
        _ready = True
    except Exception as e:
        logger.warning(f'entitlement 建表失败: {e}')


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(ts: str) -> Optional[datetime]:
    if not ts:
        return None
    try:
        d = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def ensure_trial_started(user_id: str) -> str:
    """确保试用期已开始；老用户第一次调用时从此刻起算（相当于补发试用）"""
    db = _backend()
    if not db:
        return ''
    _ensure(db)
    try:
        with db.conn() as conn:
            row = conn.execute(
                'SELECT trial_started_at FROM app_users WHERE id = ?', (user_id,)
            ).fetchone()
            if not row:
                return ''
            cur = row['trial_started_at'] or ''
            if cur:
                return cur
            now = _now().isoformat(timespec='seconds')
            conn.execute(
                'UPDATE app_users SET trial_started_at = ? WHERE id = ?', (now, user_id)
            )
            conn.commit()
            return now
    except Exception as e:
        logger.warning(f'试用期初始化失败 {user_id}: {e}')
        return ''


def entitlement(user_id: str) -> dict:
    """返回该用户的权限状态"""
    base = {
        'isPro': False,
        'proUntil': '',
        'trialStartedAt': '',
        'trialDaysLeft': 0,
        'trialActive': False,
        'trialEnded': False,
        'price': PRO_PRICE,
        'trialDays': TRIAL_DAYS,
        'freeRoutes': sorted(FREE_ROUTES),
        'proRoutes': sorted(PRO_ROUTES),
    }
    db = _backend()
    if not db:
        # 数据库不可用时不要拦人，一律放行
        base.update({'isPro': True, 'trialActive': True, 'trialDaysLeft': TRIAL_DAYS})
        return base
    _ensure(db)

    started = ensure_trial_started(user_id)
    start_dt = _parse(started)
    now = _now()

    trial_left = 0
    trial_active = False
    if start_dt:
        elapsed_days = (now - start_dt).total_seconds() / 86400
        trial_left = max(0, TRIAL_DAYS - int(elapsed_days))
        trial_active = elapsed_days < TRIAL_DAYS

    pro_until = ''
    is_pro = False
    try:
        with db.conn() as conn:
            row = conn.execute(
                'SELECT pro_until, member_until FROM app_users WHERE id = ?', (user_id,)
            ).fetchone()
            if row:
                # member_until 是老的积分兑换字段，一并认账
                for cand in (row['pro_until'], row['member_until']):
                    d = _parse(cand or '')
                    if d and d > now and (not pro_until or cand > pro_until):
                        pro_until = cand
                        is_pro = True
    except Exception as e:
        logger.warning(f'读取会员状态失败 {user_id}: {e}')

    base.update({
        'isPro': is_pro,
        'proUntil': pro_until,
        'trialStartedAt': started,
        'trialDaysLeft': trial_left,
        'trialActive': trial_active,
        'trialEnded': bool(start_dt) and not trial_active,
    })
    return base


def has_access(user_id: str, path: str) -> bool:
    """某个路由当前是否可访问"""
    if path in FREE_ROUTES:
        return True
    if path not in PRO_ROUTES:
        return True          # 不认识的路径不拦
    ent = entitlement(user_id)
    # 试用期内视同会员
    return bool(ent['isPro'] or ent['trialActive'])


# ============ 激活码 ============

_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def gen_code(days: int = 30) -> str:
    """生成形如 VA-XXXX-XXXX 的激活码"""
    def blk(n: int) -> str:
        return ''.join(secrets.choice(_CODE_ALPHABET) for _ in range(n))
    return f'VA-{blk(4)}-{blk(4)}'


def create_codes(count: int, days: int = 30, note: str = '') -> list[str]:
    """批量生成激活码（作者用）"""
    db = _backend()
    if not db:
        return []
    _ensure(db)
    out: list[str] = []
    now = _now().isoformat(timespec='seconds')
    try:
        with db.conn() as conn:
            for _ in range(max(1, min(500, int(count)))):
                for _try in range(6):
                    code = gen_code()
                    try:
                        conn.execute(
                            'INSERT INTO redeem_codes (code, days, note, created_at)'
                            ' VALUES (?,?,?,?)',
                            (code, max(1, min(3650, int(days))), note[:60], now),
                        )
                        out.append(code)
                        break
                    except Exception:
                        continue
            conn.commit()
    except Exception as e:
        logger.warning(f'生成激活码失败: {e}')
    return out


def redeem(user_id: str, code: str) -> dict:
    """兑换激活码，延长会员期"""
    db = _backend()
    if not db:
        return {'ok': False, 'reason': 'db'}
    _ensure(db)

    code = (code or '').strip().upper().replace(' ', '')
    if not code:
        return {'ok': False, 'reason': 'empty'}
    # 容错：允许用户输 VAXXXXXXXX（漏了横杠）
    if not code.startswith('VA-') and len(code) == 10:
        code = f'VA-{code[2:6]}-{code[6:10]}'

    now = _now()
    try:
        with db.conn() as conn:
            row = conn.execute(
                'SELECT code, days, used_by FROM redeem_codes WHERE code = ?', (code,)
            ).fetchone()
            if not row:
                return {'ok': False, 'reason': 'not_found'}
            if row['used_by']:
                return {'ok': False, 'reason': 'used'}

            # 在现有到期时间上叠加
            cur = conn.execute(
                'SELECT pro_until, member_until FROM app_users WHERE id = ?', (user_id,)
            ).fetchone()
            base_dt = now
            if cur:
                for cand in (cur['pro_until'], cur['member_until']):
                    d = _parse(cand or '')
                    if d and d > base_dt:
                        base_dt = d
            new_until = (base_dt + timedelta(days=int(row['days']))).isoformat(timespec='seconds')

            conn.execute(
                'UPDATE redeem_codes SET used_by = ?, used_at = ? WHERE code = ?',
                (user_id, now.isoformat(timespec='seconds'), code),
            )
            conn.execute(
                'UPDATE app_users SET pro_until = ? WHERE id = ?', (new_until, user_id)
            )
            conn.commit()
        logger.info(f'激活码兑换成功 {code} -> {user_id} 至 {new_until}')
        return {'ok': True, 'days': int(row['days']), 'proUntil': new_until}
    except Exception as e:
        logger.warning(f'兑换失败 {code}: {e}')
        return {'ok': False, 'reason': 'error'}


def code_stats() -> dict:
    db = _backend()
    if not db:
        return {'total': 0, 'used': 0, 'unused': 0}
    _ensure(db)
    try:
        with db.conn() as conn:
            total = conn.execute('SELECT COUNT(*) FROM redeem_codes').fetchone()[0]
            used = conn.execute(
                "SELECT COUNT(*) FROM redeem_codes WHERE used_by != ''"
            ).fetchone()[0]
        return {'total': total, 'used': used, 'unused': total - used}
    except Exception:
        return {'total': 0, 'used': 0, 'unused': 0}

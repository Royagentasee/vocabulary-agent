"""自动开通（带防滥用）+ 预留支付网关回调

为什么不能纯自动：没有支付网关 API 时，服务端无从得知「是否真的付了钱」。
所以这里用「信任制 + 防滥用」：
- 立即开通，用户无感
- 但每台设备 30 天只能自动开通一次
- 同一 /24 IP 段 24 小时内最多 3 次，超过则转人工审核
- 全部记录在案，作者可随时撤销

另外提供 /notify 回调端点：等接入虎皮椒/易支付等聚合支付后，
用户付款 → 平台回调 → 真正自动开通，那时把 AUTO_ACTIVATE 关掉即可。
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from loguru import logger

# 开关：作者可在环境变量里设 AUTO_ACTIVATE=0 关掉自动开通
import os

AUTO_ACTIVATE = os.environ.get('AUTO_ACTIVATE', '1') != '0'

# 单个用户自动开通的冷却天数
COOLDOWN_DAYS = 30
# 同一 IP 段 24 小时内的自动开通上限
IP_DAILY_LIMIT = 3


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'auto: 数据库不可用 {e}')
        return None


def _ensure(db) -> None:
    from app.services import claims

    claims._ensure(db)


def _prefix(ip: str) -> str:
    parts = (ip or '').split('.')
    return '.'.join(parts[:3]) if len(parts) == 4 else (ip or '')


def can_auto_activate(user_id: str, ip: str = '') -> tuple[bool, str]:
    """判断能否自动开通。返回 (是否允许, 拒绝原因)"""
    db = _backend()
    if not db:
        return False, 'db'
    _ensure(db)

    now = datetime.now(timezone.utc)
    try:
        with db.conn() as conn:
            # 1) 该用户最近一次自动开通是否在冷却期内
            row = conn.execute(
                "SELECT handled_at FROM payment_claims"
                " WHERE user_id=? AND status='approved' AND handled_by='auto'"
                " ORDER BY id DESC LIMIT 1",
                (user_id,),
            ).fetchone()
            if row and row['handled_at']:
                try:
                    last = datetime.fromisoformat(str(row['handled_at']).replace('Z', '+00:00'))
                    if last.tzinfo is None:
                        last = last.replace(tzinfo=timezone.utc)
                    if (now - last).days < COOLDOWN_DAYS:
                        return False, 'cooldown'
                except Exception:
                    pass

            # 2) 同一 IP 段 24 小时内的自动开通次数
            if ip:
                pref = _prefix(ip)
                since = (now - timedelta(days=1)).isoformat(timespec='seconds')
                n = conn.execute(
                    "SELECT COUNT(*) FROM payment_claims"
                    " WHERE status='approved' AND handled_by='auto'"
                    " AND created_at >= ? AND (ip_prefix = ? OR ip_prefix = '')",
                    (since, pref),
                ).fetchone()[0]
                # 只统计同段的（ip_prefix 为空的旧数据不算）
                n2 = conn.execute(
                    "SELECT COUNT(*) FROM payment_claims"
                    " WHERE status='approved' AND handled_by='auto'"
                    " AND created_at >= ? AND ip_prefix = ?",
                    (since, pref),
                ).fetchone()[0]
                if n2 >= IP_DAILY_LIMIT:
                    return False, 'ip_limit'
    except Exception as e:
        logger.warning(f'自动开通检查失败: {e}')
        return False, 'error'

    return True, ''


def auto_activate(user_id: str, note: str = '', amount: float = 9.9,
                  ip: str = '', days: int = 30) -> dict:
    """自动开通会员（记一条 handled_by='auto' 的申报）"""
    from app.services import claims

    db = _backend()
    if not db:
        return {'ok': False, 'reason': 'db', 'auto': False}
    _ensure(db)

    ok, why = can_auto_activate(user_id, ip)
    if not ok:
        return {'ok': False, 'reason': why, 'auto': False}

    now = datetime.now(timezone.utc)
    try:
        with db.conn() as conn:
            sync_code = ''
            u = conn.execute('SELECT sync_code FROM app_users WHERE id=?', (user_id,)).fetchone()
            if u:
                sync_code = u['sync_code'] or ''

            cur = conn.execute(
                'INSERT INTO payment_claims (user_id, sync_code, amount, note, status,'
                ' created_at, ip_prefix) VALUES (?,?,?,?,?,?,?)',
                (user_id, sync_code, float(amount or 0),
                 (note or '')[:200] + ' [自动]', 'pending', now.isoformat(timespec='seconds'),
                 _prefix(ip)),
            )
            claim_id = cur.lastrowid
            conn.commit()

        # 直接走统一的 approve（会叠加到期时间）
        r = claims.approve(claim_id, days, who='auto')
        if r.get('ok'):
            logger.info(f'自动开通 user={user_id} ip={_prefix(ip)} 至 {r.get("proUntil")}')
            return {'ok': True, 'auto': True, 'days': days,
                    'proUntil': r.get('proUntil', ''), 'claimId': claim_id}
        return {'ok': False, 'reason': r.get('reason', 'error'), 'auto': False}
    except Exception as e:
        logger.warning(f'自动开通失败 {user_id}: {e}')
        return {'ok': False, 'reason': 'error', 'auto': False}


def record_gateway_payment(order_id: str, user_id: str, amount: float,
                           days: int = 30, raw: str = '') -> dict:
    """支付网关回调入口（虎皮椒/易支付等）。

    等接入真实网关后，把 /api/payment/notify 指向这里即可：
    平台回调 → 校验签名 → 调用本函数 → 真正自动开通。
    """
    from app.services import claims

    db = _backend()
    if not db:
        return {'ok': False, 'reason': 'db'}
    _ensure(db)

    now = datetime.now(timezone.utc)
    try:
        with db.conn() as conn:
            # 幂等：同一订单号只处理一次
            dup = conn.execute(
                "SELECT id FROM payment_claims WHERE note LIKE ? AND status='approved'",
                (f'%[网关:{order_id}]%',),
            ).fetchone()
            if dup:
                return {'ok': True, 'duplicate': True}

            sync_code = ''
            u = conn.execute('SELECT sync_code FROM app_users WHERE id=?', (user_id,)).fetchone()
            if u:
                sync_code = u['sync_code'] or ''

            cur = conn.execute(
                'INSERT INTO payment_claims (user_id, sync_code, amount, note, status, created_at)'
                ' VALUES (?,?,?,?,?,?)',
                (user_id, sync_code, float(amount or 0),
                 f'[网关:{order_id}] {raw[:80]}', 'pending', now.isoformat(timespec='seconds')),
            )
            cid = cur.lastrowid
            conn.commit()

        return claims.approve(cid, days, who='gateway')
    except Exception as e:
        logger.warning(f'网关回调失败 {order_id}: {e}')
        return {'ok': False, 'reason': 'error'}

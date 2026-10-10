"""推送提醒服务

- 订阅：浏览器 push subscription 存到 push_subs 表
- 定时：后台协程每 5 分钟扫一次，到点且用户「今天还没学」才推送
- 发送：pywebpush（VAPID）
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

from loguru import logger

_SCHEMA = """
CREATE TABLE IF NOT EXISTS push_subs (
    user_id    TEXT NOT NULL,
    endpoint   TEXT NOT NULL,
    p256dh     TEXT DEFAULT '',
    auth       TEXT DEFAULT '',
    enabled    INTEGER NOT NULL DEFAULT 1,
    remind_hour INTEGER NOT NULL DEFAULT 20,
    tz_offset  INTEGER NOT NULL DEFAULT 8,
    last_sent  TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_enabled ON push_subs (enabled, remind_hour);
"""

_ready = False


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'push: 数据库不可用 {e}')
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
        logger.warning(f'push 建表失败: {e}')


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


# ============ 配置 ============

def vapid_public() -> str:
    return os.environ.get('VAPID_PUBLIC_KEY', '').strip()


def vapid_private() -> str:
    return os.environ.get('VAPID_PRIVATE_KEY', '').strip()


def vapid_subject() -> str:
    return os.environ.get('VAPID_SUBJECT', 'mailto:admin@earthledger.com').strip()


def available() -> bool:
    return bool(vapid_public() and vapid_private())


# ============ 订阅管理 ============

def subscribe(user_id: str, endpoint: str, p256dh: str, auth: str,
              remind_hour: int = 20, tz_offset: int = 8) -> bool:
    db = _backend()
    if not db:
        return False
    _ensure(db)
    try:
        with db.conn() as conn:
            conn.execute(
                'INSERT INTO push_subs (user_id, endpoint, p256dh, auth, enabled,'
                ' remind_hour, tz_offset, created_at) VALUES (?,?,?,?,1,?,?,?)'
                ' ON CONFLICT(user_id, endpoint) DO UPDATE SET'
                ' p256dh=excluded.p256dh, auth=excluded.auth, enabled=1,'
                ' remind_hour=excluded.remind_hour, tz_offset=excluded.tz_offset',
                (user_id, endpoint, p256dh, auth,
                 max(0, min(23, int(remind_hour))), int(tz_offset), _now()),
            )
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f'订阅失败: {e}')
        return False


def unsubscribe(user_id: str, endpoint: str = '') -> bool:
    db = _backend()
    if not db:
        return False
    _ensure(db)
    try:
        with db.conn() as conn:
            if endpoint:
                conn.execute('DELETE FROM push_subs WHERE user_id=? AND endpoint=?',
                             (user_id, endpoint))
            else:
                conn.execute('DELETE FROM push_subs WHERE user_id=?', (user_id,))
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f'退订失败: {e}')
        return False


def set_enabled(user_id: str, enabled: bool) -> bool:
    db = _backend()
    if not db:
        return False
    _ensure(db)
    try:
        with db.conn() as conn:
            conn.execute('UPDATE push_subs SET enabled=? WHERE user_id=?',
                         (1 if enabled else 0, user_id))
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f'开关失败: {e}')
        return False


def settings_of(user_id: str) -> dict:
    db = _backend()
    default = {'subscribed': False, 'enabled': False, 'remindHour': 20, 'tzOffset': 8, 'devices': 0}
    if not db:
        return default
    _ensure(db)
    try:
        with db.conn() as conn:
            rows = conn.execute(
                'SELECT enabled, remind_hour, tz_offset FROM push_subs WHERE user_id=?',
                (user_id,),
            ).fetchall()
        if not rows:
            return default
        return {
            'subscribed': True,
            'enabled': any(r['enabled'] for r in rows),
            'remindHour': rows[0]['remind_hour'],
            'tzOffset': rows[0]['tz_offset'],
            'devices': len(rows),
        }
    except Exception as e:
        logger.warning(f'读设置失败: {e}')
        return default


def set_remind_hour(user_id: str, hour: int) -> bool:
    db = _backend()
    if not db:
        return False
    _ensure(db)
    try:
        with db.conn() as conn:
            conn.execute('UPDATE push_subs SET remind_hour=? WHERE user_id=?',
                         (max(0, min(23, int(hour))), user_id))
            conn.commit()
        return True
    except Exception:
        return False


# ============ 发送 ============

def _payload(title: str, body: str, url: str = '/') -> str:
    return json.dumps({
        'title': title,
        'body': body,
        'url': url,
        'icon': '/icons/icon-192.png',
    }, ensure_ascii=False)


def _send_one(sub: dict, payload: str) -> bool:
    """发一条推送；410/404 说明订阅失效，返回 False 让调用方清理"""
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning('pywebpush 未安装')
        return False

    try:
        webpush(
            subscription_info={
                'endpoint': sub['endpoint'],
                'keys': {'p256dh': sub['p256dh'], 'auth': sub['auth']},
            },
            data=payload,
            vapid_private_key=vapid_private(),
            vapid_claims={'sub': vapid_subject()},
            timeout=15,
        )
        return True
    except Exception as e:
        status = getattr(getattr(e, 'response', None), 'status_code', None)
        if status in (404, 410):
            return False          # 订阅已失效
        logger.warning(f'推送失败 ({status}): {str(e)[:120]}')
        return True               # 其它错误保留订阅，下次再试


def send_to_user(user_id: str, title: str, body: str, url: str = '/') -> int:
    """给某用户所有设备发推送，返回成功条数"""
    db = _backend()
    if not db or not available():
        return 0
    _ensure(db)
    payload = _payload(title, body, url)
    ok = 0
    try:
        with db.conn() as conn:
            rows = conn.execute(
                'SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id=?', (user_id,)
            ).fetchall()
        for r in rows:
            sub = {'endpoint': r['endpoint'], 'p256dh': r['p256dh'], 'auth': r['auth']}
            if _send_one(sub, payload):
                ok += 1
            else:
                unsubscribe(user_id, r['endpoint'])
    except Exception as e:
        logger.warning(f'发送失败 {user_id}: {e}')
    return ok


# ============ 定时扫描 ============

def _studied_today(data: dict, today: str) -> bool:
    """从同步数据判断用户今天有没有学"""
    try:
        learn = data.get('learn') or {}
        if (learn.get('lastActiveDate') or '') == today:
            return True
        pts = data.get('points') or {}
        if pts.get('dailyEarned', {}).get(today):
            return True
    except Exception:
        pass
    return False


def due_reminders() -> list[dict]:
    """找出这一小时内该提醒的用户（按各人时区算本地小时）"""
    db = _backend()
    if not db or not available():
        return []
    _ensure(db)

    out: list[dict] = []
    try:
        with db.conn() as conn:
            rows = conn.execute(
                'SELECT s.user_id, s.remind_hour, s.tz_offset, s.last_sent,'
                '       u.data, u.nickname'
                ' FROM push_subs s LEFT JOIN user_state u ON u.user_id = s.user_id'
                ' WHERE s.enabled = 1'
            ).fetchall()

        for r in rows:
            now_utc = datetime.now(timezone.utc)
            local = now_utc + timedelta(hours=int(r['tz_offset'] or 8))
            if local.hour != int(r['remind_hour'] or 20):
                continue
            today = local.date().isoformat()
            if (r['last_sent'] or '') == today:
                continue

            try:
                data = json.loads(r['data'] or '{}')
            except Exception:
                data = {}
            if _studied_today(data, today):
                # 今天已经学过，不打扰；也标记一下免得这一小时反复查
                continue

            out.append({'user_id': r['user_id'], 'date': today})
    except Exception as e:
        logger.warning(f'扫描提醒失败: {e}')
    return out


def mark_sent(user_id: str, date: str) -> None:
    db = _backend()
    if not db:
        return
    try:
        with db.conn() as conn:
            conn.execute('UPDATE push_subs SET last_sent=? WHERE user_id=?', (date, user_id))
            conn.commit()
    except Exception:
        pass


def stats() -> dict:
    db = _backend()
    if not db:
        return {'subs': 0, 'enabled': 0, 'users': 0}
    _ensure(db)
    try:
        with db.conn() as conn:
            subs = conn.execute('SELECT COUNT(*) FROM push_subs').fetchone()[0]
            en = conn.execute('SELECT COUNT(*) FROM push_subs WHERE enabled=1').fetchone()[0]
            us = conn.execute('SELECT COUNT(DISTINCT user_id) FROM push_subs').fetchone()[0]
        return {'subs': subs, 'enabled': en, 'users': us}
    except Exception:
        return {'subs': 0, 'enabled': 0, 'users': 0}

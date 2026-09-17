"""用户使用统计（匿名设备维度）

设计原则：
- **不采集任何个人身份信息**，只用前端生成并存在 localStorage 的随机 device_id 做去重
- 两张表：
    usage_devices  每个匿名设备一行（首次/最近出现时间、访问次数）
    usage_events   事件流水（visit / ai_explain / learn_rate / reading_practice ...）
- 表在首次使用时自动创建，无需手动迁移

生产环境走 SQLite；非 SQLite 时静默降级（返回空统计），不影响主流程。
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta
from typing import Optional

from loguru import logger

_SCHEMA = """
CREATE TABLE IF NOT EXISTS usage_devices (
    device_id   TEXT PRIMARY KEY,
    first_seen  TEXT NOT NULL,
    last_seen   TEXT NOT NULL,
    visit_count INTEGER NOT NULL DEFAULT 1,
    user_agent  TEXT DEFAULT '',
    platform    TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS usage_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id  TEXT NOT NULL,
    event      TEXT NOT NULL,
    detail     TEXT DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_events_created ON usage_events (created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_event   ON usage_events (event);
"""

_ready = False


def _backend():
    """返回 SQLite backend；非 SQLite 或不可用时返回 None"""
    from app.core.database import get_db, _is_sqlite

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'analytics: 数据库不可用 {e}')
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
    # 服务器在 +0800，用本地时间便于按「自然日」统计
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def _platform_of(ua: str) -> str:
    u = (ua or '').lower()
    if 'micromessenger' in u:
        return '微信'
    if 'iphone' in u or 'ipad' in u or 'ios' in u:
        return 'iOS'
    if 'android' in u:
        return 'Android'
    if 'windows' in u:
        return 'Windows'
    if 'mac os' in u or 'macintosh' in u:
        return 'macOS'
    if 'linux' in u:
        return 'Linux'
    return '其他'


def hash_device(raw: str) -> str:
    """设备标识只存哈希，避免明文 ID 落库"""
    return hashlib.sha256(raw.strip().encode('utf-8')).hexdigest()[:32]


def record_event(device_id: str, event: str, detail: str = '', user_agent: str = '') -> bool:
    """记录一次事件。首次出现该设备时同时登记设备。"""
    db = _backend()
    if db is None or not device_id:
        return False
    try:
        _ensure_schema(db)
        did = hash_device(device_id)
        now = _now()
        with db.conn() as conn:
            conn.execute(
                """
                INSERT INTO usage_devices (device_id, first_seen, last_seen, visit_count, user_agent, platform)
                VALUES (?, ?, ?, 1, ?, ?)
                ON CONFLICT(device_id) DO UPDATE SET
                    last_seen   = excluded.last_seen,
                    visit_count = usage_devices.visit_count + 1,
                    user_agent  = excluded.user_agent,
                    platform    = excluded.platform
                """,
                (did, now, now, (user_agent or '')[:300], _platform_of(user_agent)),
            )
            conn.execute(
                'INSERT INTO usage_events (device_id, event, detail, created_at) VALUES (?,?,?,?)',
                (did, (event or 'unknown')[:40], (detail or '')[:200], now),
            )
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f'analytics: 记录事件失败 {e}')
        return False


def _retention(conn, days: int) -> dict:
    """留存分析：按「首次出现日期」分组的次日留存 / 7 日留存。"""
    since = (datetime.now() - timedelta(days=days - 1)).strftime('%Y-%m-%d')
    rows = conn.execute(
        """
        SELECT date(first_seen) AS cohort,
               COUNT(*) AS new_users,
               SUM(CASE WHEN EXISTS (
                     SELECT 1 FROM usage_events e
                     WHERE e.device_id = usage_devices.device_id
                       AND date(e.created_at) = date(usage_devices.first_seen, '+1 day')
                   ) THEN 1 ELSE 0 END) AS d1,
               SUM(CASE WHEN EXISTS (
                     SELECT 1 FROM usage_events e
                     WHERE e.device_id = usage_devices.device_id
                       AND date(e.created_at) > date(usage_devices.first_seen)
                       AND date(e.created_at) <= date(usage_devices.first_seen, '+7 day')
                   ) THEN 1 ELSE 0 END) AS d7
        FROM usage_devices
        WHERE date(first_seen) >= ?
        GROUP BY cohort ORDER BY cohort
        """,
        (since,),
    ).fetchall()

    today = datetime.now().date()
    daily = []
    for r in rows:
        try:
            cohort_date = datetime.strptime(r['cohort'], '%Y-%m-%d').date()
        except Exception:
            continue
        age = (today - cohort_date).days
        new_users = int(r['new_users'] or 0)
        d1 = int(r['d1'] or 0)
        d7 = int(r['d7'] or 0)
        # 窗口还没走完就不给留存率，避免误导（早退/新用户当天算 0）
        daily.append({
            'date': r['cohort'],
            'newUsers': new_users,
            'd1Users': d1,
            'd1Rate': round(d1 / new_users * 100) if (age >= 1 and new_users) else None,
            'd7Users': d7,
            'd7Rate': round(d7 / new_users * 100) if (age >= 7 and new_users) else None,
        })

    # 整体留存（只统计窗口已走完的用户）
    tot = conn.execute(
        """SELECT COUNT(*) FROM usage_devices WHERE date(first_seen) <= date('now','localtime','-1 day')"""
    ).fetchone()[0] or 0
    d1_all = conn.execute(
        """SELECT COUNT(*) FROM usage_devices d
           WHERE date(d.first_seen) <= date('now','localtime','-1 day')
             AND EXISTS (SELECT 1 FROM usage_events e WHERE e.device_id=d.device_id
                         AND date(e.created_at) = date(d.first_seen,'+1 day'))"""
    ).fetchone()[0] or 0
    tot7 = conn.execute(
        """SELECT COUNT(*) FROM usage_devices WHERE date(first_seen) <= date('now','localtime','-7 day')"""
    ).fetchone()[0] or 0
    d7_all = conn.execute(
        """SELECT COUNT(*) FROM usage_devices d
           WHERE date(d.first_seen) <= date('now','localtime','-7 day')
             AND EXISTS (SELECT 1 FROM usage_events e WHERE e.device_id=d.device_id
                         AND date(e.created_at) > date(d.first_seen)
                         AND date(e.created_at) <= date(d.first_seen,'+7 day'))"""
    ).fetchone()[0] or 0

    return {
        'd1Rate': round(d1_all / tot * 100) if tot else 0,
        'd1Base': tot,
        'd7Rate': round(d7_all / tot7 * 100) if tot7 else 0,
        'd7Base': tot7,
        'daily': daily,
    }


def _recent_activity(conn, limit: int = 30) -> list[dict]:
    """最近访问明细（时间 / 平台 / 设备短号 / 事件 / 页面）"""
    rows = conn.execute(
        """
        SELECT e.created_at AS t, e.event AS ev, e.detail AS de, e.device_id AS did,
               COALESCE(NULLIF(d.platform,''),'其他') AS pf
        FROM usage_events e
        LEFT JOIN usage_devices d ON d.device_id = e.device_id
        ORDER BY e.id DESC LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [
        {
            'time': r['t'],
            'device': (r['did'] or '')[:6],
            'platform': r['pf'],
            'event': r['ev'],
            'detail': r['de'] or '',
        }
        for r in rows
    ]


def _scalar(conn, sql: str, args: tuple = ()) -> int:
    row = conn.execute(sql, args).fetchone()
    return int(row[0]) if row and row[0] is not None else 0


def get_overview(days: int = 14) -> dict:
    """总览统计"""
    db = _backend()
    if db is None:
        return _empty_overview(days)

    try:
        _ensure_schema(db)
        today = datetime.now().strftime('%Y-%m-%d')
        week_ago = (datetime.now() - timedelta(days=6)).strftime('%Y-%m-%d')
        month_ago = (datetime.now() - timedelta(days=29)).strftime('%Y-%m-%d')

        with db.conn() as conn:
            total_users = _scalar(conn, 'SELECT COUNT(*) FROM usage_devices')
            total_visits = _scalar(conn, "SELECT COUNT(*) FROM usage_events WHERE event='visit'")
            total_events = _scalar(conn, 'SELECT COUNT(*) FROM usage_events')
            today_users = _scalar(
                conn, 'SELECT COUNT(DISTINCT device_id) FROM usage_events WHERE date(created_at)=?', (today,))
            today_visits = _scalar(
                conn, "SELECT COUNT(*) FROM usage_events WHERE event='visit' AND date(created_at)=?", (today,))
            week_users = _scalar(
                conn, 'SELECT COUNT(DISTINCT device_id) FROM usage_events WHERE date(created_at)>=?', (week_ago,))
            month_users = _scalar(
                conn, 'SELECT COUNT(DISTINCT device_id) FROM usage_events WHERE date(created_at)>=?', (month_ago,))
            online_10min = _scalar(
                conn,
                "SELECT COUNT(DISTINCT device_id) FROM usage_events WHERE created_at >= datetime('now','localtime','-10 minutes')")

            # 近 N 天趋势
            since = (datetime.now() - timedelta(days=days - 1)).strftime('%Y-%m-%d')
            rows = conn.execute(
                """
                SELECT date(created_at) AS d,
                       COUNT(DISTINCT device_id) AS users,
                       COUNT(*) AS visits
                FROM usage_events
                WHERE date(created_at) >= ?
                GROUP BY d ORDER BY d
                """,
                (since,),
            ).fetchall()
            by_day = {r['d']: (int(r['users']), int(r['visits'])) for r in rows}

            daily = []
            for i in range(days - 1, -1, -1):
                d = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
                u, v = by_day.get(d, (0, 0))
                daily.append({'date': d, 'users': u, 'visits': v})

            # 事件分布（去掉 visit，看功能使用）
            top = conn.execute(
                """
                SELECT event, COUNT(*) AS c FROM usage_events
                WHERE event <> 'visit'
                GROUP BY event ORDER BY c DESC LIMIT 12
                """
            ).fetchall()
            top_events = [{'event': r['event'], 'count': int(r['c'])} for r in top]

            # 平台分布
            plat = conn.execute(
                """
                SELECT COALESCE(NULLIF(platform,''),'其他') AS p, COUNT(*) AS c
                FROM usage_devices GROUP BY p ORDER BY c DESC LIMIT 8
                """
            ).fetchall()
            platforms = [{'name': r['p'], 'count': int(r['c'])} for r in plat]

            retention = _retention(conn, days)
            recent = _recent_activity(conn, 30)

        return {
            'totalUsers': total_users,
            'todayUsers': today_users,
            'weekUsers': week_users,
            'monthUsers': month_users,
            'onlineNow': online_10min,
            'totalVisits': total_visits,
            'todayVisits': today_visits,
            'totalEvents': total_events,
            'daily': daily,
            'topEvents': top_events,
            'platforms': platforms,
            'retention': retention,
            'recent': recent,
        }
    except Exception as e:
        logger.warning(f'analytics: 统计查询失败 {e}')
        return _empty_overview(days)


def _empty_overview(days: int) -> dict:
    today = datetime.now()
    return {
        'totalUsers': 0, 'todayUsers': 0, 'weekUsers': 0, 'monthUsers': 0,
        'onlineNow': 0, 'totalVisits': 0, 'todayVisits': 0, 'totalEvents': 0,
        'daily': [
            {'date': (today - timedelta(days=i)).strftime('%Y-%m-%d'), 'users': 0, 'visits': 0}
            for i in range(days - 1, -1, -1)
        ],
        'topEvents': [],
        'platforms': [],
        'retention': {'d1Rate': 0, 'd1Base': 0, 'd7Rate': 0, 'd7Base': 0, 'daily': []},
        'recent': [],
    }

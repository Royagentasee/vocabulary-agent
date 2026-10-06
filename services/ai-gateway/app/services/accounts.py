"""用户账号 + 学习数据云同步

设计目标：**先解决「换设备数据就丢」**，不引入任何注册门槛。

两种身份：
- anon   ：访客账号，首次访问自动创建，配一个短「同步码」，在别的设备输入即可恢复
- wechat ：微信登录（需开放平台 AppID/Secret，未配置时该接口返回未启用）

数据存放：user_state 表整包存 JSON（学习数据体量小，几百 KB 以内）。
表在首次使用时自动创建，无需手动迁移。
"""
from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from typing import Optional

from loguru import logger

from app.schemas.account import UserProfile

_SCHEMA = """
CREATE TABLE IF NOT EXISTS app_users (
    id           TEXT PRIMARY KEY,
    sync_code    TEXT UNIQUE NOT NULL,
    provider     TEXT NOT NULL DEFAULT 'anon',
    openid       TEXT DEFAULT '',
    nickname     TEXT DEFAULT '',
    avatar       TEXT DEFAULT '',
    member_until TEXT DEFAULT '',
    created_at   TEXT NOT NULL,
    last_seen    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_state (
    user_id      TEXT PRIMARY KEY,
    data         TEXT NOT NULL DEFAULT '{}',
    data_version INTEGER NOT NULL DEFAULT 0,
    updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_users_code   ON app_users (sync_code);
CREATE INDEX IF NOT EXISTS idx_app_users_openid ON app_users (openid);
"""

# 老库缺列时补上（SQLite 的 ADD COLUMN 不支持 IF NOT EXISTS，失败就忽略）
_MIGRATIONS = [
    "ALTER TABLE app_users ADD COLUMN member_until TEXT DEFAULT ''",
]

# 同步码字符集：去掉容易看错的 O/0/I/1/L
_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

_ready = False


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'accounts: 数据库不可用 {e}')
        return None


def _ensure_schema(db) -> None:
    global _ready
    if _ready:
        return
    with db.conn() as conn:
        conn.executescript(_SCHEMA)
        for sql in _MIGRATIONS:
            try:
                conn.execute(sql)
            except Exception:
                pass          # 列已存在
        conn.commit()
    _ready = True


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _gen_sync_code() -> str:
    """形如 VA-7K3M-9PQ2，好念好抄"""
    def blk(n: int) -> str:
        return ''.join(secrets.choice(_ALPHABET) for _ in range(n))

    return f'VA-{blk(4)}-{blk(4)}'


def normalize_code(code: str) -> str:
    """用户可能输入小写/漏横线，统一成标准格式 VA-XXXX-XXXX"""
    raw = ''.join(c for c in (code or '').upper() if c.isalnum())
    if raw.startswith('VA'):
        raw = raw[2:]
    raw = raw[:8]
    if len(raw) == 8:
        return f'VA-{raw[:4]}-{raw[4:]}'
    return (code or '').upper().strip()


def _row_to_profile(row) -> UserProfile:
    return UserProfile(
        id=row['id'],
        syncCode=row['sync_code'],
        provider=row['provider'] or 'anon',
        nickname=row['nickname'] or '',
        avatar=row['avatar'] or '',
        createdAt=row['created_at'],
        lastSeen=row['last_seen'],
    )


# ---------------- 账号 ----------------


def create_user(provider: str = 'anon', openid: str = '', nickname: str = '',
                avatar: str = '') -> Optional[UserProfile]:
    db = _backend()
    if not db:
        return None
    _ensure_schema(db)

    uid = secrets.token_urlsafe(16)
    now = _now()
    with db.conn() as conn:
        # 同步码碰撞概率极低，仍做几次重试
        for _ in range(6):
            code = _gen_sync_code()
            try:
                conn.execute(
                    'INSERT INTO app_users (id, sync_code, provider, openid, nickname, avatar,'
                    ' created_at, last_seen) VALUES (?,?,?,?,?,?,?,?)',
                    (uid, code, provider, openid, nickname, avatar, now, now),
                )
                conn.execute(
                    'INSERT OR IGNORE INTO user_state (user_id, data, data_version, updated_at)'
                    ' VALUES (?,?,?,?)',
                    (uid, '{}', 0, now),
                )
                conn.commit()
                return UserProfile(id=uid, syncCode=code, provider=provider,
                                   nickname=nickname, avatar=avatar,
                                   createdAt=now, lastSeen=now)
            except Exception:
                continue
    return None


def get_user(user_id: str) -> Optional[UserProfile]:
    db = _backend()
    if not db:
        return None
    _ensure_schema(db)
    with db.conn() as conn:
        row = conn.execute('SELECT * FROM app_users WHERE id = ?', (user_id,)).fetchone()
        if not row:
            return None
        conn.execute('UPDATE app_users SET last_seen = ? WHERE id = ?', (_now(), user_id))
        conn.commit()
        return _row_to_profile(row)


def find_by_sync_code(code: str) -> Optional[UserProfile]:
    db = _backend()
    if not db:
        return None
    _ensure_schema(db)
    norm = normalize_code(code)
    with db.conn() as conn:
        row = conn.execute('SELECT * FROM app_users WHERE sync_code = ?', (norm,)).fetchone()
        if not row:
            return None
        conn.execute('UPDATE app_users SET last_seen = ? WHERE id = ?', (_now(), row['id']))
        conn.commit()
        return _row_to_profile(row)


def find_by_openid(provider: str, openid: str) -> Optional[UserProfile]:
    db = _backend()
    if not db or not openid:
        return None
    _ensure_schema(db)
    with db.conn() as conn:
        row = conn.execute(
            'SELECT * FROM app_users WHERE provider = ? AND openid = ?', (provider, openid)
        ).fetchone()
        return _row_to_profile(row) if row else None


def rebind_sync_code(user_id: str) -> Optional[str]:
    """换一个新的同步码（用户觉得旧码泄露了）"""
    db = _backend()
    if not db:
        return None
    _ensure_schema(db)
    with db.conn() as conn:
        for _ in range(6):
            code = _gen_sync_code()
            try:
                conn.execute('UPDATE app_users SET sync_code = ? WHERE id = ?', (code, user_id))
                conn.commit()
                return code
            except Exception:
                continue
    return None


# ---------------- 学习数据 ----------------


def get_state(user_id: str) -> tuple[dict, int]:
    db = _backend()
    if not db:
        return {}, 0
    _ensure_schema(db)
    with db.conn() as conn:
        row = conn.execute(
            'SELECT data, data_version FROM user_state WHERE user_id = ?', (user_id,)
        ).fetchone()
        if not row:
            return {}, 0
        try:
            data = json.loads(row['data'] or '{}')
        except Exception:
            data = {}
        return data, int(row['data_version'] or 0)


def put_state(user_id: str, data: dict, base_version: int = 0) -> tuple[int, str, bool]:
    """整包写入。返回 (新版本号, 更新时间, 是否发生版本冲突)"""
    db = _backend()
    if not db:
        return 0, '', False
    _ensure_schema(db)

    payload = json.dumps(data or {}, ensure_ascii=False, separators=(',', ':'))
    now = _now()
    with db.conn() as conn:
        row = conn.execute(
            'SELECT data_version FROM user_state WHERE user_id = ?', (user_id,)
        ).fetchone()
        cur_ver = int(row['data_version']) if row else 0
        conflict = bool(row) and base_version and cur_ver and base_version < cur_ver
        new_ver = cur_ver + 1

        if row:
            conn.execute(
                'UPDATE user_state SET data = ?, data_version = ?, updated_at = ? WHERE user_id = ?',
                (payload, new_ver, now, user_id),
            )
        else:
            conn.execute(
                'INSERT INTO user_state (user_id, data, data_version, updated_at) VALUES (?,?,?,?)',
                (user_id, payload, new_ver, now),
            )
        # 顺手把会员到期日同步到用户表，供 AI 额度校验快速读取
        try:
            until = str(((data or {}).get('points') or {}).get('memberUntil') or '')
            conn.execute('UPDATE app_users SET member_until = ? WHERE id = ?', (until, user_id))
        except Exception:
            pass
        conn.commit()
    return new_ver, now, conflict


def member_until(user_id: str) -> str:
    """会员到期日（YYYY-MM-DD），空字符串表示非会员"""
    db = _backend()
    if not db or not user_id:
        return ''
    _ensure_schema(db)
    with db.conn() as conn:
        row = conn.execute('SELECT member_until FROM app_users WHERE id = ?', (user_id,)).fetchone()
        return (row['member_until'] or '') if row else ''


def stats() -> dict:
    db = _backend()
    if not db:
        return {'users': 0, 'wechatUsers': 0, 'syncedStates': 0}
    _ensure_schema(db)
    with db.conn() as conn:
        users = conn.execute('SELECT COUNT(*) c FROM app_users').fetchone()['c']
        wx = conn.execute(
            "SELECT COUNT(*) c FROM app_users WHERE provider = 'wechat'"
        ).fetchone()['c']
        synced = conn.execute(
            "SELECT COUNT(*) c FROM user_state WHERE data != '{}'"
        ).fetchone()['c']
    return {'users': users, 'wechatUsers': wx, 'syncedStates': synced}

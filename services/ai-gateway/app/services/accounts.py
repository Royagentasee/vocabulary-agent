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
    member_until   TEXT DEFAULT '',
    pending_points INTEGER NOT NULL DEFAULT 0,
    invited_by     TEXT DEFAULT '',
    invited_count  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    last_seen    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS referrals (
    inviter_id TEXT NOT NULL,
    invitee_id TEXT NOT NULL,
    code       TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    PRIMARY KEY (inviter_id, invitee_id)
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
    "ALTER TABLE app_users ADD COLUMN pending_points INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE app_users ADD COLUMN invited_by TEXT DEFAULT ''",
    "ALTER TABLE app_users ADD COLUMN invited_count INTEGER NOT NULL DEFAULT 0",
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
                avatar: str = '', invite_code: str = '') -> Optional[UserProfile]:
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
                if invite_code:
                    # 邀请奖励：失败不影响注册主流程
                    try:
                        apply_referral(uid, invite_code)
                    except Exception as e:
                        logger.warning(f'邀请奖励失败 {invite_code}: {e}')
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


# ============ 邀请奖励 ============

INVITER_REWARD = 100      # 邀请人得
INVITEE_REWARD = 50       # 被邀请人得


def add_pending_points(user_id: str, amount: int) -> bool:
    """给用户挂上待领取积分（客户端下次同步时领取）"""
    db = _backend()
    if not db or amount <= 0:
        return False
    _ensure_schema(db)
    try:
        with db.conn() as conn:
            conn.execute(
                'UPDATE app_users SET pending_points = pending_points + ? WHERE id = ?',
                (int(amount), user_id),
            )
            conn.commit()
        return True
    except Exception as e:
        logger.warning(f'挂积分失败 {user_id}: {e}')
        return False


def take_pending_points(user_id: str) -> int:
    """领取并清零待发积分，返回领取到的数量"""
    db = _backend()
    if not db:
        return 0
    _ensure_schema(db)
    try:
        with db.conn() as conn:
            row = conn.execute(
                'SELECT pending_points FROM app_users WHERE id = ?', (user_id,)
            ).fetchone()
            if not row or not row['pending_points']:
                return 0
            n = int(row['pending_points'])
            conn.execute(
                'UPDATE app_users SET pending_points = 0 WHERE id = ?', (user_id,)
            )
            conn.commit()
            return n
    except Exception as e:
        logger.warning(f'领积分失败 {user_id}: {e}')
        return 0


def apply_referral(invitee_id: str, code: str) -> dict:
    """被邀请人注册时调用：绑定邀请关系并给双方发积分"""
    db = _backend()
    if not db:
        return {'ok': False, 'reason': 'db'}
    _ensure_schema(db)

    code = normalize_code(code)
    if not code:
        return {'ok': False, 'reason': 'empty'}

    inviter = find_by_sync_code(code)
    if not inviter:
        return {'ok': False, 'reason': 'not_found'}
    if inviter.id == invitee_id:
        return {'ok': False, 'reason': 'self'}

    now = _now()
    try:
        with db.conn() as conn:
            # 幂等：同一对关系只发一次
            exists = conn.execute(
                'SELECT 1 FROM referrals WHERE invitee_id = ?', (invitee_id,)
            ).fetchone()
            if exists:
                return {'ok': False, 'reason': 'already'}

            conn.execute(
                'INSERT OR IGNORE INTO referrals (inviter_id, invitee_id, code, created_at)'
                ' VALUES (?,?,?,?)',
                (inviter.id, invitee_id, code, now),
            )
            conn.execute(
                'UPDATE app_users SET invited_by = ? WHERE id = ?', (inviter.id, invitee_id)
            )
            conn.execute(
                'UPDATE app_users SET invited_count = invited_count + 1 WHERE id = ?',
                (inviter.id,),
            )
            # 双方积分挂账
            conn.execute(
                'UPDATE app_users SET pending_points = pending_points + ? WHERE id = ?',
                (INVITER_REWARD, inviter.id),
            )
            conn.execute(
                'UPDATE app_users SET pending_points = pending_points + ? WHERE id = ?',
                (INVITEE_REWARD, invitee_id),
            )
            conn.commit()
        logger.info(f'邀请成功: {inviter.id} ← {invitee_id}（{code}）')
        return {'ok': True, 'inviterReward': INVITER_REWARD, 'inviteeReward': INVITEE_REWARD}
    except Exception as e:
        logger.warning(f'邀请处理失败: {e}')
        return {'ok': False, 'reason': 'error'}


def referral_stats(user_id: str) -> dict:
    """邀请概览：我的邀请码、已邀请人数、累计获得积分"""
    db = _backend()
    base = {
        'inviteCode': '', 'invitedCount': 0, 'earned': 0,
        'inviterReward': INVITER_REWARD, 'inviteeReward': INVITEE_REWARD,
    }
    if not db:
        return base
    _ensure_schema(db)
    try:
        with db.conn() as conn:
            row = conn.execute(
                'SELECT sync_code, invited_count FROM app_users WHERE id = ?', (user_id,)
            ).fetchone()
            if not row:
                return base
            return {
                'inviteCode': row['sync_code'],
                'invitedCount': int(row['invited_count'] or 0),
                'earned': int(row['invited_count'] or 0) * INVITER_REWARD,
                'inviterReward': INVITER_REWARD,
                'inviteeReward': INVITEE_REWARD,
            }
    except Exception as e:
        logger.warning(f'邀请概览失败: {e}')
        return base


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

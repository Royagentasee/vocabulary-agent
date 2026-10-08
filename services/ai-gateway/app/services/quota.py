"""AI 功能每日额度

免费用户每日有次数上限，会员不限。
按 user_id 维度计数（前端在 X-User-Id 请求头里带账号 id）。

设计：
- 只对「真正产生 AI 费用」的接口计数
- 计数按自然日（本地时区）滚动，次日自动归零
- 未携带 user id 的请求放行（便于调试/直连），前端始终会带
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime
from typing import Optional

from loguru import logger

from app.services import accounts


def _admin_token() -> str:
    """作者密钥（服务端环境变量，不写进代码库）"""
    return os.getenv('ADMIN_TOKEN', '').strip()


def is_admin(token: str) -> bool:
    """校验请求头里带的作者密钥"""
    t = (token or '').strip()
    exp = _admin_token()
    if not exp or not t:
        return False
    try:
        return secrets.compare_digest(t, exp)
    except Exception:
        return False

# 免费用户每日上限（会员不限）
# 单词解释定得宽松（100/天），正常背单词+读原著基本碰不到；
# 真正花 AI 成本的写作/口语/对话收紧，作为会员的核心卖点。
FREE_QUOTAS: dict[str, int] = {
    'explain': 100,     # AI 单词解释
    'writing': 2,       # AI 写作批改
    'speaking': 5,      # AI 口语评测
    'dialogue': 10,     # AI 对话陪练（每轮算一次）
    'grammar': 10,      # AI 语法出题
    'photo': 10,        # 拍照翻译（OCR 免费，只有翻译那步用 AI）
    'coach': 10,        # AI 学习教练
}

FEATURE_LABEL: dict[str, str] = {
    'explain': 'AI 单词解释',
    'writing': 'AI 写作批改',
    'speaking': 'AI 口语评测',
    'dialogue': 'AI 对话陪练',
    'grammar': 'AI 语法出题',
    'photo': '拍照翻译',
    'coach': 'AI 学习教练',
}

_SCHEMA = """
CREATE TABLE IF NOT EXISTS ai_usage (
    user_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    day     TEXT NOT NULL,
    used    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, feature, day)
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_day ON ai_usage (day);
"""

_ready = False


def _backend():
    from app.core.database import _is_sqlite, get_db

    if not _is_sqlite():
        return None
    try:
        return get_db()
    except Exception as e:
        logger.warning(f'quota: 数据库不可用 {e}')
        return None


def _ensure_schema(db) -> None:
    global _ready
    if _ready:
        return
    with db.conn() as conn:
        conn.executescript(_SCHEMA)
        conn.commit()
    _ready = True


def today() -> str:
    return datetime.now().strftime('%Y-%m-%d')


def is_member(user_id: str) -> bool:
    """会员判定：到期日 >= 今天"""
    if not user_id:
        return False
    until = accounts.member_until(user_id)
    return bool(until and until >= today())


def get_used(user_id: str, feature: str) -> int:
    db = _backend()
    if not db or not user_id:
        return 0
    _ensure_schema(db)
    with db.conn() as conn:
        row = conn.execute(
            'SELECT used FROM ai_usage WHERE user_id = ? AND feature = ? AND day = ?',
            (user_id, feature, today()),
        ).fetchone()
        return int(row['used']) if row else 0


def check_and_consume(user_id: str, feature: str, admin_token: str = '') -> tuple[bool, int, int]:
    """校验并扣减一次额度。

    返回 (是否放行, 已用次数, 上限)。
    上限 -1 表示不限（作者 / 会员 / 未配置额度的功能 / 未登录）。
    """
    limit = FREE_QUOTAS.get(feature)
    if limit is None or not user_id:
        return True, 0, -1

    # 作者（用服务端密钥校验，前端无法伪造）
    if is_admin(admin_token):
        return True, 0, -1

    if is_member(user_id):
        return True, 0, -1

    db = _backend()
    if not db:
        return True, 0, -1          # 数据库不可用时放行，不影响主流程

    _ensure_schema(db)
    day = today()
    with db.conn() as conn:
        row = conn.execute(
            'SELECT used FROM ai_usage WHERE user_id = ? AND feature = ? AND day = ?',
            (user_id, feature, day),
        ).fetchone()
        used = int(row['used']) if row else 0

        if used >= limit:
            return False, used, limit

        if row:
            conn.execute(
                'UPDATE ai_usage SET used = used + 1 WHERE user_id = ? AND feature = ? AND day = ?',
                (user_id, feature, day),
            )
        else:
            conn.execute(
                'INSERT INTO ai_usage (user_id, feature, day, used) VALUES (?,?,?,1)',
                (user_id, feature, day),
            )
        conn.commit()
        return True, used + 1, limit


def snapshot(user_id: str, admin_token: str = '') -> dict:
    """返回该用户所有功能的额度情况，供前端展示"""
    admin = is_admin(admin_token)
    member = is_member(user_id)
    unlimited = admin or member
    items = []
    for feat, limit in FREE_QUOTAS.items():
        used = get_used(user_id, feat) if user_id else 0
        items.append({
            'feature': feat,
            'label': FEATURE_LABEL.get(feat, feat),
            'used': used,
            'limit': -1 if unlimited else limit,
            'unlimited': unlimited,
            'remaining': -1 if unlimited else max(0, limit - used),
        })
    return {
        'isMember': unlimited,
        'isAdmin': admin,
        'memberUntil': accounts.member_until(user_id) if user_id else '',
        'items': items,
    }


def quota_error_detail(feature: str, used: int, limit: int) -> dict:
    """额度用尽时返回给前端的信息（前端据此弹升级引导）"""
    return {
        'code': 'QUOTA_EXCEEDED',
        'feature': feature,
        'label': FEATURE_LABEL.get(feature, feature),
        'used': used,
        'limit': limit,
        'message': f"今日{FEATURE_LABEL.get(feature, feature)}次数已用完（{used}/{limit}）",
        'hint': '开通会员即可无限使用；也可以用积分兑换会员',
    }

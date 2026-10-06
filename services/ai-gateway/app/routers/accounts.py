"""用户账号 + 学习数据云同步 路由"""
import os

import httpx
from fastapi import APIRouter, Header, HTTPException
from loguru import logger

from app.schemas.account import (
    RegisterRequest,
    RegisterResponse,
    RestoreRequest,
    RestoreResponse,
    SyncCodeResponse,
    SyncPushRequest,
    SyncPushResponse,
    SyncState,
    UserProfile,
    WechatLoginRequest,
    WechatStatusResponse,
)
from app.services import accounts, quota

router = APIRouter(prefix="/api/user", tags=["user"])


@router.post("/register", response_model=RegisterResponse)
async def register(req: RegisterRequest) -> RegisterResponse:
    """匿名注册：无需任何个人信息，直接给一个访客账号 + 同步码。"""
    user = accounts.create_user(provider='anon')
    if not user:
        raise HTTPException(status_code=503, detail='账号服务暂不可用')
    return RegisterResponse(user=user, isNew=True)


@router.get("/{user_id}", response_model=UserProfile)
async def get_profile(user_id: str) -> UserProfile:
    user = accounts.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail='用户不存在')
    return user


@router.post("/restore", response_model=RestoreResponse)
async def restore(req: RestoreRequest) -> RestoreResponse:
    """用同步码在另一台设备恢复账号与学习数据。"""
    user = accounts.find_by_sync_code(req.syncCode)
    if not user:
        raise HTTPException(status_code=404, detail='同步码不存在，请检查是否输错')
    data, version = accounts.get_state(user.id)
    return RestoreResponse(user=user, data=data, version=version)


@router.get("/{user_id}/state", response_model=SyncState)
async def get_state(user_id: str) -> SyncState:
    if not accounts.get_user(user_id):
        raise HTTPException(status_code=404, detail='用户不存在')
    data, version = accounts.get_state(user_id)
    return SyncState(userId=user_id, data=data, version=version)


@router.put("/{user_id}/state", response_model=SyncPushResponse)
async def put_state(user_id: str, req: SyncPushRequest) -> SyncPushResponse:
    """上传学习数据整包（前端已做合并后再传）。"""
    if not accounts.get_user(user_id):
        raise HTTPException(status_code=404, detail='用户不存在')
    version, updated, conflict = accounts.put_state(user_id, req.data, req.baseVersion)
    return SyncPushResponse(version=version, updatedAt=updated, conflict=conflict)


@router.post("/{user_id}/new-sync-code", response_model=SyncCodeResponse)
async def new_sync_code(user_id: str) -> SyncCodeResponse:
    """换一个同步码（旧码作废）。"""
    if not accounts.get_user(user_id):
        raise HTTPException(status_code=404, detail='用户不存在')
    code = accounts.rebind_sync_code(user_id)
    if not code:
        raise HTTPException(status_code=503, detail='生成失败，请重试')
    return SyncCodeResponse(syncCode=code)


@router.get("/stats/overview")
async def user_stats() -> dict:
    return accounts.stats()


@router.get("/{user_id}/quota")
async def get_quota(
    user_id: str,
    x_admin_token: str = Header('', alias='X-Admin-Token'),
) -> dict:
    """AI 功能今日剩余额度（免费用户有上限，会员与作者不限）。"""
    if not accounts.get_user(user_id):
        raise HTTPException(status_code=404, detail='用户不存在')
    return quota.snapshot(user_id, x_admin_token)


# ---------------- 微信登录（预留） ----------------


def _wechat_configured() -> bool:
    return bool(os.getenv('WECHAT_APPID')) and bool(os.getenv('WECHAT_SECRET'))


@router.get("/wechat/status", response_model=WechatStatusResponse)
async def wechat_status() -> WechatStatusResponse:
    ok = _wechat_configured()
    return WechatStatusResponse(
        configured=ok,
        hint='' if ok else '需先在微信开放平台创建「网站应用」，配置 WECHAT_APPID / WECHAT_SECRET',
    )


@router.post("/wechat/login", response_model=RegisterResponse)
async def wechat_login(req: WechatLoginRequest) -> RegisterResponse:
    """微信扫码登录：用 code 换 openid，已存在则登录，不存在则创建。

    需要环境变量 WECHAT_APPID / WECHAT_SECRET（微信开放平台 → 网站应用）。
    """
    appid = os.getenv('WECHAT_APPID', '')
    secret = os.getenv('WECHAT_SECRET', '')
    if not appid or not secret:
        raise HTTPException(
            status_code=501,
            detail='微信登录未启用：需在微信开放平台创建网站应用并配置 AppID/Secret',
        )

    try:
        async with httpx.AsyncClient(timeout=15) as cli:
            r = await cli.get(
                'https://api.weixin.qq.com/sns/oauth2/access_token',
                params={
                    'appid': appid, 'secret': secret, 'code': req.code,
                    'grant_type': 'authorization_code',
                },
            )
            d = r.json()
    except Exception as e:
        logger.warning(f'微信换取 token 失败: {e}')
        raise HTTPException(status_code=502, detail='微信服务暂时不可用')

    if 'errcode' in d and d.get('errcode'):
        raise HTTPException(status_code=400, detail=f"微信登录失败：{d.get('errmsg', d['errcode'])}")

    openid = d.get('openid', '')
    if not openid:
        raise HTTPException(status_code=400, detail='微信未返回 openid')

    nickname, avatar = '', ''
    try:
        async with httpx.AsyncClient(timeout=15) as cli:
            r2 = await cli.get(
                'https://api.weixin.qq.com/sns/userinfo',
                params={'access_token': d.get('access_token'), 'openid': openid, 'lang': 'zh_CN'},
            )
            u = r2.json()
            nickname = u.get('nickname', '') or ''
            avatar = u.get('headimgurl', '') or ''
    except Exception:
        pass

    user = accounts.find_by_openid('wechat', openid)
    is_new = False
    if not user:
        user = accounts.create_user(provider='wechat', openid=openid,
                                    nickname=nickname, avatar=avatar)
        is_new = True
    if not user:
        raise HTTPException(status_code=503, detail='账号创建失败')
    return RegisterResponse(user=user, isNew=is_new)

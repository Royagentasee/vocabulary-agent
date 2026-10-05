"""用户账号与云同步 Schema"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    """匿名注册（无需任何个人信息）"""

    device_id: str = Field('', max_length=64, description='可选，用于合并已有匿名数据')


class UserProfile(BaseModel):
    id: str
    syncCode: str
    provider: Literal['anon', 'wechat'] = 'anon'
    nickname: str = ''
    avatar: str = ''
    createdAt: str = ''
    lastSeen: str = ''


class RegisterResponse(BaseModel):
    user: UserProfile
    isNew: bool = True


class RestoreRequest(BaseModel):
    """用同步码在另一台设备恢复"""

    syncCode: str = Field(..., min_length=4, max_length=32)


class RestoreResponse(BaseModel):
    user: UserProfile
    data: dict = {}
    version: int = 0


class SyncState(BaseModel):
    """学习数据整包（结构由前端定义，服务端只做透传存储）"""

    userId: str
    data: dict = {}
    version: int = 0


class SyncPushRequest(BaseModel):
    userId: str
    data: dict = {}
    baseVersion: int = 0


class SyncPushResponse(BaseModel):
    version: int
    updatedAt: str
    conflict: bool = False


class WechatLoginRequest(BaseModel):
    """微信登录（需先在开放平台配置 WECHAT_APPID / WECHAT_SECRET）"""

    code: str = Field(..., min_length=4)


class WechatStatusResponse(BaseModel):
    configured: bool
    hint: str = ''


class SyncCodeResponse(BaseModel):
    syncCode: str

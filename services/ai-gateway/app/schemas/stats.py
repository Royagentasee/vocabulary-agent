"""用户使用统计 Schema"""
from __future__ import annotations

from pydantic import BaseModel, Field


class TrackRequest(BaseModel):
    deviceId: str = Field(..., min_length=8, max_length=128, description="前端生成的匿名设备 ID")
    event: str = Field(default='visit', max_length=40, description="事件名，如 visit / ai_explain / learn_rate")
    detail: str = Field(default='', max_length=200, description="可选补充信息")


class TrackResponse(BaseModel):
    ok: bool = True


class DailyPoint(BaseModel):
    date: str
    users: int
    visits: int


class EventCount(BaseModel):
    event: str
    count: int


class PlatformCount(BaseModel):
    name: str
    count: int


class RetentionDay(BaseModel):
    date: str
    newUsers: int
    d1Users: int
    d1Rate: int | None = None   # 窗口未走完时为 null
    d7Users: int
    d7Rate: int | None = None


class RetentionStats(BaseModel):
    d1Rate: int = 0     # 次日留存率（%）
    d1Base: int = 0     # 参与计算的用户数
    d7Rate: int = 0     # 7 日留存率（%）
    d7Base: int = 0
    daily: list[RetentionDay] = []


class RecentActivity(BaseModel):
    time: str
    device: str
    platform: str
    event: str
    detail: str


class OverviewResponse(BaseModel):
    totalUsers: int = 0       # 累计用户（匿名设备数）
    todayUsers: int = 0       # 今日活跃
    weekUsers: int = 0        # 近 7 天活跃
    monthUsers: int = 0       # 近 30 天活跃
    onlineNow: int = 0        # 近 10 分钟在线
    totalVisits: int = 0
    todayVisits: int = 0
    totalEvents: int = 0
    daily: list[DailyPoint] = []
    topEvents: list[EventCount] = []
    platforms: list[PlatformCount] = []
    retention: RetentionStats = Field(default_factory=RetentionStats)
    recent: list[RecentActivity] = []

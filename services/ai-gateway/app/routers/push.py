"""推送提醒路由 + 后台定时任务"""
from __future__ import annotations

import asyncio
import contextlib

from fastapi import APIRouter, HTTPException, Query, Response
from loguru import logger
from pydantic import BaseModel, Field

from app.services import push

router = APIRouter(prefix="/api/push", tags=["push"])


class SubscribeRequest(BaseModel):
    user_id: str = Field(..., max_length=64)
    endpoint: str = Field(..., max_length=800)
    p256dh: str = Field('', max_length=200)
    auth: str = Field('', max_length=200)
    remind_hour: int = Field(20, ge=0, le=23)
    tz_offset: int = Field(8, ge=-12, le=14)


class UnsubscribeRequest(BaseModel):
    user_id: str = Field(..., max_length=64)
    endpoint: str = Field('', max_length=800)


class SettingsRequest(BaseModel):
    user_id: str = Field(..., max_length=64)
    enabled: bool | None = None
    remind_hour: int | None = Field(None, ge=0, le=23)


@router.get("/key")
async def get_key() -> dict:
    """前端订阅需要的 VAPID 公钥"""
    return {
        'publicKey': push.vapid_public(),
        'available': push.available(),
        'stats': push.stats(),
    }


@router.post("/subscribe")
async def post_subscribe(req: SubscribeRequest) -> dict:
    """保存推送订阅"""
    if not push.available():
        raise HTTPException(status_code=503, detail='推送服务未配置')
    ok = push.subscribe(req.user_id, req.endpoint, req.p256dh, req.auth,
                        req.remind_hour, req.tz_offset)
    if not ok:
        raise HTTPException(status_code=503, detail='订阅保存失败')
    return {'ok': True, **push.settings_of(req.user_id)}


@router.post("/unsubscribe")
async def post_unsubscribe(req: UnsubscribeRequest) -> dict:
    push.unsubscribe(req.user_id, req.endpoint)
    return {'ok': True}


@router.get("/settings")
async def get_settings(user_id: str) -> dict:
    return push.settings_of(user_id)


@router.post("/settings")
async def post_settings(req: SettingsRequest) -> dict:
    if req.enabled is not None:
        push.set_enabled(req.user_id, req.enabled)
    if req.remind_hour is not None:
        push.set_remind_hour(req.user_id, req.remind_hour)
    return {'ok': True, **push.settings_of(req.user_id)}


@router.post("/test")
async def post_test(user_id: str) -> dict:
    """发一条测试推送，让用户确认能收到"""
    if not push.available():
        raise HTTPException(status_code=503, detail='推送服务未配置')
    n = push.send_to_user(
        user_id, '🔔 提醒已开启',
        '以后每天这个点，如果你还没学，我会来提醒你。',
        '/path',
    )
    if not n:
        raise HTTPException(status_code=400, detail='没有可用的订阅，请先开启提醒')
    return {'ok': True, 'sent': n}


# ============ 日历提醒（安卓/华为/小米通用）============

@router.get("/calendar.ics")
async def get_calendar(
    h: int = Query(20, ge=0, le=23, description='提醒小时'),
    m: int = Query(0, ge=0, le=59, description='提醒分钟'),
    uid: str = Query('default', max_length=64),
) -> Response:
    """每日学习提醒日历。

    下载导入，或把本地址粘到「小米日历 / 华为日历 → 订阅日历」。
    不依赖推送服务，中国大陆全平台可用。
    """
    from app.services import calendar as cal

    body = cal.build_ics(hour=h, minute=m, uid=uid)
    return Response(
        content=body.encode('utf-8'),
        media_type='text/calendar; charset=utf-8',
        headers={
            'Content-Disposition': 'attachment; filename="vocab-agent-reminder.ics"',
            'Cache-Control': 'no-cache',
        },
    )


# ============ 后台定时任务 ============

_task: asyncio.Task | None = None
CHECK_INTERVAL = 300      # 每 5 分钟扫一次


async def _loop() -> None:
    # 启动后稍等一下，别和冷启动抢资源
    await asyncio.sleep(30)
    while True:
        try:
            if push.available():
                for item in push.due_reminders():
                    push.send_to_user(
                        item['user_id'],
                        '📖 今天还没学哦',
                        '连胜别断了 —— 5 分钟就能完成今天的目标。',
                        '/path',
                    )
                    push.mark_sent(item['user_id'], item['date'])
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning(f'推送定时任务异常: {e}')
        await asyncio.sleep(CHECK_INTERVAL)


def start_scheduler() -> None:
    global _task
    if _task and not _task.done():
        return
    if not push.available():
        logger.info('推送未配置 VAPID 密钥，定时提醒不启动')
        return
    _task = asyncio.create_task(_loop())
    logger.info('推送定时提醒已启动（每 5 分钟检查一次）')


async def stop_scheduler() -> None:
    global _task
    if _task and not _task.done():
        _task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _task
    _task = None

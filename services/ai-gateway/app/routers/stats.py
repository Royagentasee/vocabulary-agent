"""用户使用统计路由"""
from fastapi import APIRouter, Query, Request

from app.schemas.stats import OverviewResponse, TrackRequest, TrackResponse
from app.services.analytics import get_overview, record_event

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.post("/track", response_model=TrackResponse)
async def track(req: TrackRequest, request: Request) -> TrackResponse:
    """记录一次使用事件（匿名设备维度，不含任何身份信息）。"""
    ua = request.headers.get('user-agent', '')

    # 客户端 IP → 城市（只存城市，完整 IP 不落库）
    from app.services import geoip

    ip = geoip.client_ip(
        request.headers.get('x-real-ip', ''),
        request.headers.get('x-forwarded-for', ''),
        request.client.host if request.client else '',
    )
    geo = {}
    if ip:
        try:
            import asyncio

            geo = await asyncio.get_event_loop().run_in_executor(None, geoip.resolve, ip)
        except Exception:
            geo = {}
    ok = record_event(req.deviceId, req.event, req.detail, ua, geo=geo)
    return TrackResponse(ok=ok)


@router.get("/overview", response_model=OverviewResponse)
async def overview(days: int = Query(14, ge=1, le=90)) -> OverviewResponse:
    """使用统计总览。"""
    return OverviewResponse(**get_overview(days))

"""用户使用统计路由"""
from fastapi import APIRouter, Query, Request

from app.schemas.stats import OverviewResponse, TrackRequest, TrackResponse
from app.services.analytics import get_overview, record_event

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.post("/track", response_model=TrackResponse)
async def track(req: TrackRequest, request: Request) -> TrackResponse:
    """记录一次使用事件（匿名设备维度，不含任何身份信息）。"""
    ua = request.headers.get('user-agent', '')
    ok = record_event(req.deviceId, req.event, req.detail, ua)
    return TrackResponse(ok=ok)


@router.get("/overview", response_model=OverviewResponse)
async def overview(days: int = Query(14, ge=1, le=90)) -> OverviewResponse:
    """使用统计总览。"""
    return OverviewResponse(**get_overview(days))

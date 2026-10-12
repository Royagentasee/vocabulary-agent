"""付款申报路由"""
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import claims, entitlement as ent
from app.services.quota import is_admin

router = APIRouter(prefix="/api/payment", tags=["payment"])


class ClaimRequest(BaseModel):
    note: str = Field('', max_length=200)
    amount: float = Field(9.9, ge=0, le=10000)


class ApproveRequest(BaseModel):
    days: int = Field(30, ge=1, le=3650)


def _admin(token: str) -> None:
    if not is_admin(token):
        raise HTTPException(status_code=403, detail='需要作者权限')


def _full_stats() -> dict:
    """统一的概览结构，前端按 stats.claims.* / stats.codes.* 读"""
    return {
        'claims': claims.stats(),
        'codes': ent.code_stats(),
        'price': ent.PRO_PRICE,
    }


@router.post("/claim")
async def post_claim(req: ClaimRequest, user_id: str = Query(..., max_length=64)) -> dict:
    """用户申报已付款（我等作者核对后开通）"""
    r = claims.create_claim(user_id, req.note, req.amount)
    if not r.get('ok'):
        raise HTTPException(status_code=503, detail='提交失败，请稍后再试')
    return {**r, 'claim': claims.my_claim(user_id)}


@router.get("/claim")
async def get_my_claim(user_id: str = Query(..., max_length=64)) -> dict:
    """我的申报状态"""
    return {'claim': claims.my_claim(user_id)}


@router.get("/claims")
async def get_claims(status: str = Query('pending'), limit: int = Query(100, ge=1, le=500),
                     admin_token: str = Header('', alias='X-Admin-Token')) -> dict:
    """申报列表（作者）"""
    _admin(admin_token)
    return {'items': claims.list_claims(status, limit), 'stats': _full_stats()}


@router.post("/claims/{claim_id}/approve")
async def post_approve(claim_id: int, req: ApproveRequest,
                       admin_token: str = Header('', alias='X-Admin-Token')) -> dict:
    """确认开通（作者）"""
    _admin(admin_token)
    r = claims.approve(claim_id, req.days)
    if not r.get('ok'):
        msg = {'not_found': '申报不存在', 'handled': '这条已经处理过了'}.get(
            r.get('reason', ''), '开通失败')
        raise HTTPException(status_code=400, detail=msg)
    return {**r, 'stats': _full_stats()}


@router.post("/claims/{claim_id}/reject")
async def post_reject(claim_id: int,
                      admin_token: str = Header('', alias='X-Admin-Token')) -> dict:
    """驳回申报（作者）"""
    _admin(admin_token)
    claims.reject(claim_id)
    return {'ok': True, 'stats': _full_stats()}


@router.get("/stats")
async def get_stats(admin_token: str = Header('', alias='X-Admin-Token')) -> dict:
    """收款概览（作者）"""
    _admin(admin_token)
    return _full_stats()

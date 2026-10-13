"""付款申报路由"""
from fastapi import APIRouter, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.services import auto_activate, claims, entitlement as ent, geoip
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
async def post_claim(req: ClaimRequest, request: Request,
                     user_id: str = Query(..., max_length=64)) -> dict:
    """用户申报已付款 → 立即自动开通（带防滥用）

    没有支付网关时服务端无法验证是否真的付款，所以采用信任制：
    立即开通、用户无感，但同一用户 30 天只能自动开通一次、
    同一 IP 段 24 小时最多 3 次，超过则转人工审核。
    """
    ip = geoip.client_ip(
        request.headers.get('x-real-ip', ''),
        request.headers.get('x-forwarded-for', ''),
        request.client.host if request.client else '',
    )

    if auto_activate.AUTO_ACTIVATE:
        r = auto_activate.auto_activate(user_id, req.note, req.amount, ip)
        if r.get('ok'):
            return {**r, 'claim': claims.my_claim(user_id),
                    **ent.entitlement(user_id)}
        # 防滥用拦下 / 出错 → 退回到人工申报
        r2 = claims.create_claim(user_id, req.note, req.amount)
        return {**r2, 'auto': False, 'reason': r.get('reason', ''),
                'claim': claims.my_claim(user_id)}

    # 自动开通关掉时走人工
    r2 = claims.create_claim(user_id, req.note, req.amount)
    if not r2.get('ok'):
        raise HTTPException(status_code=503, detail='提交失败，请稍后再试')
    return {**r2, 'auto': False, 'claim': claims.my_claim(user_id)}


@router.post("/notify")
async def post_notify(request: Request) -> dict:
    """支付网关回调（虎皮椒 / 易支付等）

    接入真实网关后，把平台的回调地址指向这里。
    需要按各平台规则校验签名，这里只做最小可用的骨架。

    POST 参数（form 或 json）：
      order_id / orderId / trade_no   订单号
      user_id  / uid                  我们传过去的用户标识
      amount   / money                金额
      days                            开通天数（可选，默认 30）
    """
    try:
        payload = dict(request.query_params)
        try:
            body = await request.json()
            if isinstance(body, dict):
                payload.update(body)
        except Exception:
            try:
                form = await request.form()
                payload.update({k: str(v) for k, v in form.items()})
            except Exception:
                pass
    except Exception:
        payload = {}

    order_id = str(payload.get('order_id') or payload.get('orderId')
                   or payload.get('trade_no') or '')
    uid = str(payload.get('user_id') or payload.get('uid') or '')
    try:
        amount = float(payload.get('amount') or payload.get('money') or 0)
    except Exception:
        amount = 0.0
    try:
        days = int(payload.get('days') or 30)
    except Exception:
        days = 30

    if not order_id or not uid:
        raise HTTPException(status_code=400, detail='缺少订单号或用户标识')

    import json as _json

    r = auto_activate.record_gateway_payment(
        order_id, uid, amount, days, _json.dumps(payload, ensure_ascii=False)[:200]
    )
    # 网关一般要求返回纯文本 success
    return {'ok': bool(r.get('ok')), 'detail': r}


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

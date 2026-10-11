"""会员权限路由"""
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import entitlement as ent
from app.services.quota import is_admin

router = APIRouter(prefix="/api/entitlement", tags=["entitlement"])


class RedeemRequest(BaseModel):
    code: str = Field(..., min_length=4, max_length=32)


class CreateCodesRequest(BaseModel):
    count: int = Field(10, ge=1, le=200)
    days: int = Field(30, ge=1, le=3650)
    note: str = Field('', max_length=60)


@router.get("")
async def get_entitlement(user_id: str = Query(..., max_length=64),
                          admin_token: str = Header('', alias='X-Admin-Token')) -> dict:
    """当前用户的试用/会员状态"""
    data = ent.entitlement(user_id)
    # 作者永远有权限
    if is_admin(admin_token):
        data['isPro'] = True
        data['isAdmin'] = True
    return data


@router.post("/redeem")
async def post_redeem(req: RedeemRequest, user_id: str = Query(..., max_length=64)) -> dict:
    """兑换激活码"""
    r = ent.redeem(user_id, req.code)
    if not r.get('ok'):
        msg = {
            'not_found': '激活码不存在，请检查是否输错',
            'used': '这个激活码已经被用过了',
            'empty': '请输入激活码',
            'db': '服务暂不可用',
        }.get(r.get('reason', ''), '兑换失败')
        raise HTTPException(status_code=400, detail=msg)
    return {**r, **ent.entitlement(user_id)}


@router.post("/codes")
async def post_create_codes(req: CreateCodesRequest,
                            admin_token: str = Header('', alias='X-Admin-Token')) -> dict:
    """批量生成激活码（仅作者）"""
    if not is_admin(admin_token):
        raise HTTPException(status_code=403, detail='需要作者权限')
    codes = ent.create_codes(req.count, req.days, req.note)
    return {'codes': codes, 'count': len(codes), 'days': req.days, **ent.code_stats()}


@router.get("/codes/stats")
async def get_code_stats(admin_token: str = Header('', alias='X-Admin-Token')) -> dict:
    if not is_admin(admin_token):
        raise HTTPException(status_code=403, detail='需要作者权限')
    return ent.code_stats()

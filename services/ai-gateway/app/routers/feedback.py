"""题目报错路由"""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.services import feedback
from app.services.quota import is_admin

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class ReportRequest(BaseModel):
    kind: str = Field('quiz', max_length=20)
    question: str = Field(..., min_length=1, max_length=2000)
    options: list[str] = Field(default_factory=list)
    correct: str = Field('', max_length=500)
    chosen: str = Field('', max_length=500)
    note: str = Field('', max_length=1000)
    topic: str = Field('', max_length=200)


@router.post("/report")
async def post_report(req: ReportRequest,
                      x_user_id: str = Header('', alias='X-User-Id')) -> dict:
    """用户报错：题目答案错了 / 解析有问题"""
    r = feedback.create_report(
        kind=req.kind,
        question=req.question,
        options=req.options,
        correct=req.correct,
        chosen=req.chosen,
        note=req.note,
        topic=req.topic,
        user_id=x_user_id,
    )
    if not r.get('ok'):
        raise HTTPException(status_code=400, detail=r.get('reason') or '提交失败')
    return r


@router.get("/reports")
async def get_reports(status: str = 'open', limit: int = 100,
                      admin_token: str = Header('', alias='X-Admin-Token')) -> dict:
    if not is_admin(admin_token):
        raise HTTPException(status_code=403, detail='需要作者密钥')
    data = feedback.list_reports(status=status, limit=limit)
    data['stats'] = feedback.stats()
    return data


@router.post("/reports/{report_id}/status")
async def post_status(report_id: int, status: str = 'fixed',
                      admin_token: str = Header('', alias='X-Admin-Token')) -> dict:
    if not is_admin(admin_token):
        raise HTTPException(status_code=403, detail='需要作者密钥')
    return feedback.set_status(report_id, status)

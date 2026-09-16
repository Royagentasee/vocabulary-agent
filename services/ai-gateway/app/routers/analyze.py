"""错因分析路由"""
from fastapi import APIRouter, HTTPException

from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.services.analyze import analyze_mistakes

router = APIRouter(prefix="/api/ai/analyze-mistake", tags=["analyze"])


@router.post("", response_model=AnalyzeResponse)
async def post_analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return await analyze_mistakes(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"错因分析失败：{str(e)}")
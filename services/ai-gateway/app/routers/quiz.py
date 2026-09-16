"""Quiz 路由"""
from fastapi import APIRouter, HTTPException

from app.schemas.quiz import QuizGenerateRequest, QuizGenerateResponse
from app.services.quiz import generate_quiz

router = APIRouter(prefix="/api/ai/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizGenerateResponse)
async def post_generate(req: QuizGenerateRequest) -> QuizGenerateResponse:
    """生成针对单词的完形填空题。"""
    try:
        return await generate_quiz(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"出题失败：{str(e)}")